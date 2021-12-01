import { Map, Player } from '../models';
import { actions, network } from '../constants';
import { Position } from '../interfaces';
import { players } from '../cache';

export default (input: Buffer, map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const timestamp = input.readDoubleLE();
    let offset = network.DOUBLE_SIZE;
    const id = String.fromCharCode(
      ...input.slice(offset, network.BUFFER_ID_SIZE + offset),
    );
    offset += network.BUFFER_ID_SIZE;
    const player = players.get<Player>(id);
    if (!player) {
      return reject('Player does not exist');
    }
    const action = input[offset];
    offset += network.INT8_SIZE;
    switch (action) {
      case actions.PING:
        break;
      case actions.MOVEMENT:
        const x = input.readInt16LE(offset);
        offset += network.INT16_SIZE;
        const z = input.readInt16LE(offset);
        // The position is a short where the last 2 numbers are decimals
        // Multiplying by 1.0 so it turns into a float
        const position: Position = {
          x: (x * 1.0) / 100,
          y: 0,
          z: (z * 1.0) / 100,
        };
        // We should apply the movement between last and this tick before changing paths
        player.move(timestamp);

        // TODO: Maybe we shouldn't wait but put a lock on the player instead
        // And do this in another thread.
        await player.calculatePath(position);
        player.lastMovement = timestamp;
        break;
      default:
        return reject('Invalid action');
    }
    player.lastUpdate = timestamp;
    players.set(id, player);
    return resolve();
  });
};
