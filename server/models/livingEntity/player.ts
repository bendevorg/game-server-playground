import { LivingEntity } from '../';
import {
  PublicLivingEntity,
  Snapshot,
  PlayerConstructor,
} from '../../interfaces';
import { game, network, locks } from '../../constants';
import socket from '../../core/socket';
import lock from '../../utils/lock';
import isInRange from '../../utils/isInRange';

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
    });
    this.ip = ip;
    this.port = port;
  }

  update() {
    super.update();
  }

  updateNetworkData(ip: string, port: number) {
    this.ip = ip;
    this.port = port;
  }

  sendSnapshot(snapshot: Snapshot) {
    return new Promise<void>(async (resolve, reject) => {
      let visiblePlayers: Array<PublicLivingEntity> = [];
      let visibleEnemies: Array<PublicLivingEntity> = [];
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
      const playerSnapshot = {
        players: visiblePlayers,
        enemies: visibleEnemies,
        timestamp: snapshot.timestamp,
      };
      // TODO: Can we improve the size of this buffer even further?
      // Players length + Players + Enemies length + Enemies
      const buffer = Buffer.alloc(
        network.FLOAT_SIZE +
          network.INT8_SIZE +
          network.BUFFER_PLAYER_SIZE * playerSnapshot.players.length +
          network.INT8_SIZE +
          network.BUFFER_ENEMY_SIZE * playerSnapshot.enemies.length,
      );
      // TODO: Can we improve this? Timestamp doesn't fit in an int 32
      buffer.writeFloatLE(snapshot.timestamp);
      let offset = network.FLOAT_SIZE;
      // This might need to change into a Uint16 since the length can be bigger than 255
      // In some extreme scenarios
      buffer.writeUInt8(playerSnapshot.players.length, offset);
      offset += network.INT8_SIZE;
      // TODO: We are creating these buffers every time we need to send it to a player
      // We could cache them
      // Also we should improve this code, it has a lot of repetition
      playerSnapshot.players.forEach(async (player) => {
        let playerOffset = 0;
        buffer.writeUInt16LE(player.id, offset);
        playerOffset += network.INT16_SIZE;
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        buffer.writeInt16LE(player.position.x * 100, offset + playerOffset);
        playerOffset += network.INT16_SIZE;
        // TODO: Add Y when it makes sense
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        buffer.writeInt16LE(player.position.z * 100, offset + playerOffset);
        playerOffset += network.INT16_SIZE;

        buffer.writeInt16LE(player.health, offset + playerOffset);
        playerOffset += network.INT16_SIZE;

        buffer.writeInt16LE(player.maxHealth, offset + playerOffset);
        playerOffset += network.INT16_SIZE;

        buffer.writeUInt8(player.speed, offset + playerOffset);
        offset += network.BUFFER_PLAYER_SIZE;
      });
      buffer.writeUInt8(playerSnapshot.enemies.length, offset);
      offset += network.INT8_SIZE;
      playerSnapshot.enemies.forEach(async (enemy) => {
        let enemyOffset = 0;
        buffer.writeUInt16LE(enemy.id, offset);
        enemyOffset += network.INT16_SIZE;
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        buffer.writeInt16LE(enemy.position.x * 100, offset + enemyOffset);
        enemyOffset += network.INT16_SIZE;
        // TODO: Add Y when it makes sense
        // We multiply this by a 100 because we store this in a short (int 16) to save space
        // But that doesn't have decimals, so we multiply it here and divide on the client
        buffer.writeInt16LE(enemy.position.z * 100, offset + enemyOffset);
        enemyOffset += network.INT16_SIZE;

        buffer.writeInt16LE(enemy.health, offset + enemyOffset);
        enemyOffset += network.INT16_SIZE;

        buffer.writeInt16LE(enemy.maxHealth, offset + enemyOffset);
        enemyOffset += network.INT16_SIZE;

        buffer.writeUInt8(enemy.speed, offset + enemyOffset);
        offset += network.BUFFER_ENEMY_SIZE;
      });
      socket.sendMessage(buffer, this.ip, this.port);
    });
  }
}
