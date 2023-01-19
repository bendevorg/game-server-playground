import { Attributes } from 'sequelize';
import { LivingEntity } from '../';
import { Character, Skill } from '~/models';
import { SkillType } from '~/models/Skill';
import {
  SnapshotLivingEntity,
  Snapshot,
  PlayerConstructor,
  Position,
  SkillConstructor,
} from '~/interfaces';
import {
  game,
  network,
  locks,
  redis as redisConstants,
  engine,
  networkMessage,
} from '~/constants';
import socket from '~/core/socket';
import lock from '~/utils/lock';
import redis from '~/utils/redis';
import isInRange from '~/utils/isInRange';
import LivingEntityBufferWriter from '~/utils/livingEntityBufferWriter';
import NetworkMessage from '~/utils/networkMessage';
import simulateLatency from '~/utils/simulateLatency';
import { players } from '~/cache';

export default class Player extends LivingEntity {
  ip: string;
  port: number;
  tcpOnly: boolean;
  lastGeneratedSnapshot?: Snapshot;

  constructor({
    id,
    type,
    position,
    level,
    experience,
    health,
    maxHealth,
    speed,
    attackRange,
    attackSpeed,
    availableSkills,
    mapId,
    ip,
    port,
    tcpOnly = false,
  }: PlayerConstructor) {
    super({
      id,
      type,
      position,
      halfColliderExtent: 0.5,
      level,
      experience,
      health,
      maxHealth,
      speed,
      attackRange,
      attackSpeed,
      availableSkills,
      experienceReward: 0,
      mapId,
    });
    this.ip = ip;
    this.port = port;
    this.tcpOnly = tcpOnly;
    this.lastGeneratedSnapshot = undefined;
  }

  static async generate(
    character: Attributes<Character>,
  ): Promise<Player | null> {
    // We first check if a player already exists for this character
    let player = await Player.get(character.id);
    if (!player) {
      player = new Player({
        ...character,
        // TODO: This should come from the database
        availableSkills: {
          0: new Skill({
            id: 0,
            type: SkillType.PROJECTILE,
            level: 1,
            cooldownInMs: 5000,
          }),
        },
      });
    }
    return player;
  }

  // TODO: Id will be a string eventually
  static async get(id: number): Promise<Player | null> {
    let player: Player | undefined = players.get<Player>(id);
    if (!player) {
      const key = redisConstants.PLAYERS_KEY_PREFIX + id;
      await lock.acquire(locks.REDIS_PLAYER + id, async (done) => {
        const jsonPlayerData = await redis.get(key);
        if (jsonPlayerData) {
          const playerData = JSON.parse(jsonPlayerData);
          const { availableSkillsData } = playerData;
          const availableSkills: { [key: number]: Skill } = {};
          availableSkillsData.forEach((availableSkill: SkillConstructor) => {
            availableSkills[availableSkill.id] = new Skill(availableSkill);
          });
          player = new Player({ ...playerData, availableSkills });
        }
        done();
      });
    }
    return player || null;
  }

  static getActive(id: number | string): Player | null {
    return players.get<Player>(id) || null;
  }

  static getAllActiveIds(): Array<string> {
    return players.keys();
  }

  async save(cacheOnly: boolean = false, ignoreCache: boolean = false) {
    if (!ignoreCache) players.set(this.id, this);
    if (cacheOnly) return;
    const key = redisConstants.PLAYERS_KEY_PREFIX + this.id;
    await redis.set(key, JSON.stringify(this.getData()), {
      EX: redisConstants.PLAYERS_TTL,
    });
  }

  getData() {
    const {
      id,
      position,
      health,
      maxHealth,
      speed,
      attackRange,
      attackSpeed,
      mapId,
    } = this;
    const availableSkillsData = Object.keys(this.availableSkills).map(
      (skillId) => this.availableSkills[parseInt(skillId)].getData(),
    );
    return {
      id,
      position,
      health,
      maxHealth,
      speed,
      attackRange,
      attackSpeed,
      availableSkillsData,
      mapId,
    };
  }

  async addExperience(experience: number) {
    await super.addExperience(experience);
    const event = new LivingEntityBufferWriter(
      this,
      new NetworkMessage(Buffer.alloc(network.BUFFER_HIT_EVENT_SIZE)),
    );
    event.writeExperienceEvent(experience);
    // We don't need to wait to write the event
    lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
      this.events.push(event.message.buffer);
      done();
    });
  }

  async update() {
    await super.update();
  }

  updateNetworkData(ip: string, port: number, tcpOnly: boolean = false) {
    this.ip = ip;
    this.port = port;
    this.tcpOnly = tcpOnly;
  }

  // Some times the client will sent some information about the current state
  // In order to try to be as in sync as possible this function will verify if that information is valid
  // And if so will accept it.
  // For this we will get the sent position and check if this is a position that we will be in the near future.
  // TODO: We should limit the amount of times that a player can use this in a amount of time
  // So they cannot exploit this somehow to make the character move faster than it should.
  async attemptToSyncPosition(
    position: Position,
    timestamp: number,
  ): Promise<boolean> {
    return new Promise<boolean>(async (resolve, reject) => {
      let synced = false;
      await lock.acquire(locks.ENTITY_PATH + this.id, async (done) => {
        await lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
          if (!this.path || this.path.waypoints.length === 0) {
            done();
            // The player is not moving, so there isn't any sync to do.
            return resolve(false);
          }
          // We calculate the newest state of the server movement for the player
          // And then we check how distance it is from the position that was sent
          // If it is close enough we accept it.
          const distanceX =
            this.path.waypoints[this.path.waypoints.length - 1].x -
            this.position.x;
          const distanceZ =
            this.path.waypoints[this.path.waypoints.length - 1].z -
            this.position.z;
          const magnitude = Math.sqrt(
            distanceX * distanceX + distanceZ * distanceZ,
          );
          const directionX = distanceX / magnitude;
          const directionZ = distanceZ / magnitude;
          const timeSinceLastUpdate = (timestamp - this.lastMovement) / 1000;
          const distanceToMoveInX =
            directionX * this.speed * timeSinceLastUpdate;
          const distanceToMoveInZ =
            directionZ * this.speed * timeSinceLastUpdate;
          const futurePosition = {
            ...this.position,
            x: this.position.x + distanceToMoveInX,
            z: this.position.z + distanceToMoveInZ,
          };
          const futureDistanceX = futurePosition.x - position.x;
          const futureDistanceZ = futurePosition.z - position.z;
          const futureMagnitude = Math.sqrt(
            futureDistanceX * futureDistanceX +
              futureDistanceZ * futureDistanceZ,
          );
          // MAX_DISTANCE_TO_ACCEPT_SYNC needs to be small as possible
          // because in theory player's could use this sync to make it's player move
          // a little in the future. Right now this value is 0.02 which apparently is enough
          // to help with the path desync issue and is a value that is small enough that in practice
          // You can't use to cheat. We should increase this value if the desync keeps happening
          // Or decrease this value or remove this function if players uses this to cheat.
          if (futureMagnitude > engine.MAX_DISTANCE_TO_ACCEPT_SYNC) {
            return done();
          }
          synced = true;
          this.position = {
            ...this.position,
            x: position.x,
            z: position.z,
          };
          this.setLastMovement(timestamp);
          return done();
        });
        return done();
      });
      return resolve(synced);
    });
  }

  async generateSnapshotForPlayer(snapshot: Snapshot) {
    let visiblePlayers: Array<SnapshotLivingEntity> = [];
    let visibleEnemies: Array<SnapshotLivingEntity> = [];
    // We lock the position here because we could be using it for the pathfinding
    // In another async task, this avoid concurrency errors
    await lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
      // Filter only visible players and monsters
      visiblePlayers = snapshot.players.filter(({ position }) =>
        isInRange(this.position, position, game.VISION_DISTANCE),
      );
      visibleEnemies = snapshot.enemies.filter(({ position }) =>
        isInRange(this.position, position, game.VISION_DISTANCE),
      );
      done();
    });
    return {
      players: visiblePlayers,
      enemies: visibleEnemies,
      timestamp: snapshot.timestamp,
    };
  }

  async visibleEntitiesChanged(playerSnapshot: Snapshot) {
    let changed = false;
    const lastSnapshotIds: Set<number> = new Set<number>();
    await lock.acquire(locks.ENTITY_LAST_SNAPSHOT, (done) => {
      if (!this.lastGeneratedSnapshot) {
        changed = true;
        done();
        return;
      }
      if (
        this.lastGeneratedSnapshot.players.length !==
          playerSnapshot.players.length ||
        this.lastGeneratedSnapshot.enemies.length !==
          playerSnapshot.enemies.length
      ) {
        changed = true;
        done();
        return;
      }
      this.lastGeneratedSnapshot.players.forEach((player) =>
        lastSnapshotIds.add(player.id),
      );
      this.lastGeneratedSnapshot.enemies.forEach((enemy) =>
        lastSnapshotIds.add(enemy.id),
      );
      done();
    });
    if (changed) return changed;
    for (let i = 0; i < playerSnapshot.players.length; i++) {
      if (!lastSnapshotIds.has(playerSnapshot.players[i].id)) {
        return true;
      }
      lastSnapshotIds.delete(playerSnapshot.players[i].id);
    }
    for (let i = 0; i < playerSnapshot.enemies.length; i++) {
      if (!lastSnapshotIds.has(playerSnapshot.enemies[i].id)) {
        return true;
      }
      lastSnapshotIds.delete(playerSnapshot.enemies[i].id);
    }
    // If there is still something inside the set it means that we have an entity
    // before that doesn't exist anymore
    return lastSnapshotIds.entries.length > 0;
  }

  async sendUpdates(snapshot: Snapshot) {
    const playerSnapshot = await this.generateSnapshotForPlayer(snapshot);
    this.sendPositionSnapshot(playerSnapshot);
    this.sendEvents(playerSnapshot);
    // TODO: Only send the full snapshot if new entities spawned.
    if (await this.visibleEntitiesChanged(playerSnapshot)) {
      this.sendFullSnapshot(playerSnapshot);
    }
    lock.acquire(locks.ENTITY_LAST_SNAPSHOT, (done) => {
      this.lastGeneratedSnapshot = playerSnapshot;
      done();
    });
  }

  async sendFullSnapshot(playerSnapshot: Snapshot) {
    const bufferSize =
      network.INT8_SIZE +
      network.DOUBLE_SIZE +
      network.INT8_SIZE +
      network.BUFFER_PLAYER_SIZE * playerSnapshot.players.length +
      network.INT8_SIZE +
      network.BUFFER_ENEMY_SIZE * playerSnapshot.enemies.length;
    const buffer = Buffer.alloc(bufferSize);
    const message = new NetworkMessage(buffer);
    message.writeUInt8(networkMessage.FULL_SNAPSHOT);
    // TODO: We could be more efficient and send only the last 5 or 6 digits of the timestamp
    message.writeDouble(playerSnapshot.timestamp);
    // This might need to change into a Uint16 since the length can be bigger than 255
    // In some extreme scenarios
    message.writeUInt8(playerSnapshot.players.length);
    playerSnapshot.players.forEach(async (player) => {
      const entityBufferWriter = new LivingEntityBufferWriter(player, message);
      entityBufferWriter.writeFullData();
    });
    message.writeUInt8(playerSnapshot.enemies.length);
    playerSnapshot.enemies.forEach(async (enemy) => {
      const entityBufferWriter = new LivingEntityBufferWriter(enemy, message);
      entityBufferWriter.writeFullData();
    });
    await simulateLatency();
    socket.sendTcpMessage(message.buffer, this.id);
  }

  async sendPositionSnapshot(playerSnapshot: Snapshot) {
    const bufferSize =
      network.INT8_SIZE +
      network.DOUBLE_SIZE +
      network.INT8_SIZE +
      network.BUFFER_POSITION_SIZE * playerSnapshot.players.length +
      network.INT8_SIZE +
      network.BUFFER_POSITION_SIZE * playerSnapshot.enemies.length;
    const buffer = Buffer.alloc(bufferSize);
    const message = new NetworkMessage(buffer);
    message.writeUInt8(networkMessage.POSITION_SNAPSHOT);
    // TODO: We could be more efficient and send only the last 5 or 6 digits of the timestamp
    message.writeDouble(playerSnapshot.timestamp);
    // This might need to change into a Uint16 since the length can be bigger than 255
    // In some extreme scenarios
    message.writeUInt8(playerSnapshot.players.length);
    playerSnapshot.players.forEach((player) => {
      const entityBufferWriter = new LivingEntityBufferWriter(player, message);
      entityBufferWriter.writePositionUpdateData();
    });
    message.writeUInt8(playerSnapshot.enemies.length);
    playerSnapshot.enemies.forEach((enemy) => {
      const entityBufferWriter = new LivingEntityBufferWriter(enemy, message);
      entityBufferWriter.writePositionUpdateData();
    });
    await simulateLatency();
    if (this.tcpOnly) {
      socket.sendTcpMessage(message.buffer, this.id);
    } else {
      socket.sendUdpMessage(message.buffer, this.ip, this.port);
    }
  }

  async sendEvents(playerSnapshot: Snapshot) {
    const events: Array<Buffer> = [];
    playerSnapshot.players.forEach((player) => {
      if (player.events.length === 0) return;
      const eventsData = Buffer.concat(player.events);
      // Id + events length + events data
      const bufferSize = network.INT16_SIZE + network.INT8_SIZE;
      const livingEntityBuffer = new LivingEntityBufferWriter(
        player,
        new NetworkMessage(Buffer.alloc(bufferSize)),
      );
      livingEntityBuffer.writeEvents(eventsData, player.events.length);
      events.push(livingEntityBuffer.message.buffer);
    });
    playerSnapshot.enemies.forEach((enemy) => {
      if (enemy.events.length === 0) return;
      const eventsData = Buffer.concat(enemy.events);
      // Id + events length + events data
      const bufferSize = network.INT16_SIZE + network.INT8_SIZE;
      const livingEntityBuffer = new LivingEntityBufferWriter(
        enemy,
        new NetworkMessage(Buffer.alloc(bufferSize)),
      );
      livingEntityBuffer.writeEvents(eventsData, enemy.events.length);
      events.push(livingEntityBuffer.message.buffer);
      livingEntityBuffer.message.resetOffset();
    });
    if (events.length === 0) return;
    const eventsData = Buffer.concat(events);
    // We don't need to add the eventsData's length.
    // That will be added when we concat.
    const bufferSize =
      network.INT8_SIZE + network.DOUBLE_SIZE + network.INT16_SIZE;
    const message = new NetworkMessage(Buffer.alloc(bufferSize));
    message.writeUInt8(networkMessage.EVENTS);
    // TODO: We could be more efficient and send only the last 5 or 6 digits of the timestamp
    message.writeDouble(playerSnapshot.timestamp);
    message.writeUInt16(events.length);
    message.appendBuffer(eventsData);
    await simulateLatency();
    socket.sendTcpMessage(message.buffer, this.id);
  }

  async disconnect() {
    await this.save(false, true);
    players.del(this.id);
  }
}
