import calculatePath from './entity/calculatePath';
import { Map } from '../classes';
import { actions, network } from '../constants';
import { Position, Player } from '../interfaces';
import cache from '../utils/cache';

export default (input: Buffer, map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const id = String.fromCharCode(...input.slice(0, network.BUFFER_ID_SIZE));
    const player = cache.get<Player>(id);
    if (!player) {
      return reject('Player does not exist');
    }
    const action = input[network.BUFFER_ID_SIZE];
    switch (action) {
      case actions.MOVEMENT:
        const x = input.readInt16LE(network.BUFFER_ID_SIZE + 1);
        const z = input.readInt16LE(network.BUFFER_ID_SIZE + 3);
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
        } catch(err) {
          console.error(err);
        }
        break;
      default:
        return reject('Invalid action');
    }
    player.lastUpdate = new Date();
    cache.set(id, player);
    return resolve();
  });
};
