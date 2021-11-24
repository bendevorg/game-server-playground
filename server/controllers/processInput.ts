import calculatePath from './entity/calculatePath';
import { Map } from '../classes';
import { actions, network } from '../constants';
import { Position, Player } from '../interfaces';
import cache from '../utils/cache';

export default (input: Buffer, map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const timestamp = input.readDoubleLE();
    let offset = network.DOUBLE_SIZE;
    const id = String.fromCharCode(
      ...input.slice(offset, network.BUFFER_ID_SIZE + offset),
    );
    offset += network.BUFFER_ID_SIZE;
    const player = cache.get<Player>(id);
    if (!player) {
      return reject('Player does not exist');
    }
    const action = input[offset];
    offset += network.INT8_SIZE;
    switch (action) {
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
        // TODO: Maybe we shouldn't wait but put a lock on the player instead
        // So we can't do any updates until we finish this process
        // And lift that lock later
        try {
          await calculatePath(player, position, map);
        } catch (err) {
          console.error(err);
        }
        break;
      default:
        return reject('Invalid action');
    }
    player.lastUpdate = timestamp;
    cache.set(id, player);
    return resolve();
  });
};
