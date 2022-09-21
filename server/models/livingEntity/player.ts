import { Attributes } from 'sequelize';
import { LivingEntity } from '../';
import { Character } from '~/models';
import {
  SnapshotLivingEntity,
  Snapshot,
  PlayerConstructor,
  Position,
  ReducedSnapshotLivingEntity,
} from '~/interfaces';
import {
  game,
  network,
  locks,
  redis as redisConstants,
  engine,
} from '~/constants';
import socket from '~/core/socket';
import lock from '~/utils/lock';
import redis from '~/utils/redis';
import isInRange from '~/utils/isInRange';
import isFullLivingEntity from '~/utils/isFullLivingEntity';
import NetworkMessage from '~/utils/networkMessage';
import { players } from '~/cache';

export default class Player extends LivingEntity {
  ip: string;
  port: number;

  constructor({
    id,
    position,
    health,
    maxHealth,
    speed,
    attackRange,
    attackSpeed,
    visionRange,
    mapId,
    ip,
    port,
  }: PlayerConstructor) {
    super({
      id,
      position,
      health,
      maxHealth,
      speed,
      attackRange,
      attackSpeed,
      visionRange,
      mapId,
    });
    this.ip = ip;
    this.port = port;
  }

  static async generate(
    character: Attributes<Character>,
  ): Promise<Player | null> {
    // We first check if a player already exists for this character
    // I need to check which type we should use for raw
    let player = await Player.get(character.id);
    if (!player) {
      player = new Player({
        ...character,
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
          player = new Player(playerData);
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
      visionRange,
      mapId,
    } = this;
    return {
      id,
      position,
      health,
      maxHealth,
      speed,
      attackRange,
      attackSpeed,
      visionRange,
      mapId,
    };
  }

  update() {
    super.update();
  }

  updateNetworkData(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
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
    return new Promise<Snapshot>(async (resolve, reject) => {
      let visiblePlayers: Array<
        SnapshotLivingEntity | ReducedSnapshotLivingEntity
      > = [];
      let visibleEnemies: Array<
        SnapshotLivingEntity | ReducedSnapshotLivingEntity
      > = [];
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
      return resolve({
        players: visiblePlayers,
        enemies: visibleEnemies,
        timestamp: snapshot.timestamp,
      });
    });
  }

  async sendSnapshot(snapshot: Snapshot, reduced?: boolean) {
    return new Promise<void>(async (resolve, reject) => {
      const playerSnapshot = await this.generateSnapshotForPlayer(snapshot);
      // TODO: Can we improve the size of this buffer even further?
      // Timestamp + Players length + Players + Enemies length + Enemies
      const bufferSize =
        network.INT64_SIZE +
        network.INT8_SIZE +
        (reduced
          ? network.BUFFER_REDUCED_PLAYER_SIZE
          : network.BUFFER_PLAYER_SIZE) *
          playerSnapshot.players.length +
        network.INT8_SIZE +
        (reduced
          ? network.BUFFER_REDUCED_ENEMY_SIZE
          : network.BUFFER_ENEMY_SIZE) *
          playerSnapshot.enemies.length;
      const buffer = Buffer.alloc(bufferSize);
      const message = new NetworkMessage(buffer);
      // TODO: Can we improve this? Timestamp doesn't fit in an int 32
      message.writeLong(BigInt(snapshot.timestamp));
      // This might need to change into a Uint16 since the length can be bigger than 255
      // In some extreme scenarios
      message.writeUInt8(playerSnapshot.players.length);
      // TODO: We are creating these buffers every time we need to send it to a player
      // We could cache them
      // Also we should improve this code, it has a lot of repetition
      playerSnapshot.players.forEach(async (player) => {
        message.writeUInt16(player.id);
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        message.writeInt16(player.position.x * 100);
        // TODO: Add Y when it makes sense
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        message.writeInt16(player.position.z * 100);
        if (!isFullLivingEntity(player)) {
          return;
        }
        message.writeInt16(player.health);
        message.writeInt16(player.maxHealth);
        message.writeUInt8(player.speed);
        message.writeUInt8(player.attackRange);
      });
      message.writeUInt8(playerSnapshot.enemies.length);
      playerSnapshot.enemies.forEach(async (enemy) => {
        message.writeUInt16(enemy.id);
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        message.writeInt16(enemy.position.x * 100);
        // TODO: Add Y when it makes sense
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        message.writeInt16(enemy.position.z * 100);
        if (!isFullLivingEntity(enemy)) {
          return;
        }
        message.writeInt16(enemy.health);
        message.writeInt16(enemy.maxHealth);
        message.writeUInt8(enemy.speed);
        message.writeUInt8(enemy.attackRange);
      });
      if (engine.DEV_MODE && engine.LATENCY > 0) {
        const latency = () =>
          new Promise((resolve) => setTimeout(resolve, 300));
        await latency();
      }
      // socket.sendUdpMessage(message.buffer, this.ip, this.port);
      socket.sendTcpMessage(message.buffer, this.id);
      return resolve();
    });
  }

  async disconnect() {
    await this.save(false, true);
    players.del(this.id);
  }
}
