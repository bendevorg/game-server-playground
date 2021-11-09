import socket from '../core/socket';
import { Player, Snapshot } from '../interfaces';
import { game, network } from '../constants';

export default (player: Player, mainSnapshot: Snapshot) => {
  return new Promise<void>((resolve, reject) => {
    // Filter only visible players and monsters
    const visiblePlayers = mainSnapshot.players.filter((otherPlayer) => {
      return (
        Math.abs(player.positionX - otherPlayer.positionX) <=
          game.VISION_DISTANCE &&
        Math.abs(player.positionZ - otherPlayer.positionZ) <=
          game.VISION_DISTANCE
      );
    });
    const playerSnapshot = {
      players: visiblePlayers,
      timestamp: mainSnapshot.timestamp,
    };
    // TODO: Can we improve the size of this buffer even further?
    // Players length + Players
    const buffer = Buffer.alloc(
      network.INT8_SIZE +
        network.BUFFER_PLAYER_SIZE * playerSnapshot.players.length,
    );
    // This might need to change into a Uint16 since the length can be bigger than 255
    // In some extreme scenarios
    buffer.writeUInt8(playerSnapshot.players.length);
    let offset = 1;
    playerSnapshot.players.forEach((player, index) => {
      offset += network.BUFFER_PLAYER_SIZE * index;
      let playerOffset = 0;
      buffer.write(player.id, offset);
      playerOffset += network.BUFFER_ID_SIZE;
      buffer.writeInt16LE(player.positionX, offset + playerOffset);
      playerOffset += network.INT16_SIZE;
      // TODO: Add Y when it makes sense
      buffer.writeInt16LE(player.positionZ, offset + playerOffset);
      playerOffset += network.INT16_SIZE;
      buffer.writeUInt8(player.speed, offset + playerOffset);
    });
    socket.sendMessage(buffer, player.ip);
  });
};
