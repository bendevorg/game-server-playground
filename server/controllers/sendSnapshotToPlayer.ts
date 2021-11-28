import socket from '../core/socket';
import { Player, Snapshot } from '../interfaces';
import { game, network } from '../constants';

export default (player: Player, mainSnapshot: Snapshot) => {
  return new Promise<void>((resolve, reject) => {
    // Filter only visible players and monsters
    const visiblePlayers = mainSnapshot.players.filter((otherPlayer) => {
      return (
        Math.abs(player.position.x - otherPlayer.position.x) <=
          game.VISION_DISTANCE &&
        Math.abs(player.position.z - otherPlayer.position.z) <=
          game.VISION_DISTANCE
      );
    });
    const visibleEnemies = mainSnapshot.enemies.filter((enemy) => {
      return (
        Math.abs(player.position.x - enemy.position.x) <=
          game.VISION_DISTANCE &&
        Math.abs(player.position.z - enemy.position.z) <= game.VISION_DISTANCE
      );
    });
    const playerSnapshot = {
      players: visiblePlayers,
      enemies: visibleEnemies,
      timestamp: mainSnapshot.timestamp,
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
    buffer.writeFloatLE(mainSnapshot.timestamp);
    let offset = network.FLOAT_SIZE;
    // This might need to change into a Uint16 since the length can be bigger than 255
    // In some extreme scenarios
    buffer.writeUInt8(playerSnapshot.players.length, offset);
    offset += network.INT8_SIZE;
    playerSnapshot.players.forEach((player) => {
      let playerOffset = 0;
      buffer.write(player.id, offset);
      playerOffset += network.BUFFER_ID_SIZE;
      // We multiply this by a 100 because we store this in a short (int 16) to save space
      // But that doesn't have decimals, so we multiply it here and divide on the client
      buffer.writeInt16LE(player.position.x * 100, offset + playerOffset);
      playerOffset += network.INT16_SIZE;
      // TODO: Add Y when it makes sense
      // We multiply this by a 100 because we store this in a short (int 16) to save space
      // But that doesn't have decimals, so we multiply it here and divide on the client
      buffer.writeInt16LE(player.position.z * 100, offset + playerOffset);
      playerOffset += network.INT16_SIZE;
      buffer.writeUInt8(player.speed, offset + playerOffset);
      offset += network.BUFFER_PLAYER_SIZE;
    });
    buffer.writeUInt8(playerSnapshot.enemies.length, offset);
    offset += network.INT8_SIZE;
    playerSnapshot.enemies.forEach((enemy) => {
      let enemyOffset = 0;
      buffer.write(enemy.id, offset);
      enemyOffset += network.BUFFER_ID_SIZE;
      // We multiply this by a 100 because we store this in a short (int 16) to save space
      // But that doesn't have decimals, so we multiply it here and divide on the client
      buffer.writeInt16LE(enemy.position.x * 100, offset + enemyOffset);
      enemyOffset += network.INT16_SIZE;
      // TODO: Add Y when it makes sense
      // We multiply this by a 100 because we store this in a short (int 16) to save space
      // But that doesn't have decimals, so we multiply it here and divide on the client
      buffer.writeInt16LE(enemy.position.z * 100, offset + enemyOffset);
      enemyOffset += network.INT16_SIZE;
      buffer.writeUInt8(enemy.speed, offset + enemyOffset);
      offset += network.BUFFER_ENEMY_SIZE;
    });
    socket.sendMessage(buffer, player.ip, player.port);
  });
};
