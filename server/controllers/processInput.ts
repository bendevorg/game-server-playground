import { actions, network } from '../constants';
import { Position, Player } from '../interfaces';
import cache from '../utils/cache';

export default (input: Buffer) => {
  return new Promise<void>((resolve, reject) => {
    const id = String.fromCharCode(...input.slice(0, network.BUFFER_ID_SIZE));
    const player = cache.get<Player>(id);
    if (!player) {
      return reject('Player does not exist');
    }
    const action = input[network.BUFFER_ID_SIZE];
    switch (action) {
      case actions.MOVEMENT:
        const x = input.readInt16LE(network.BUFFER_ID_SIZE + 1);
        const y = input.readInt16LE(network.BUFFER_ID_SIZE + 3);
        // The position is a short where the last 2 numbers are decimals
        // Multiplying by 1.0 so it turns into a float
        const position: Position = {
          x: (x * 1.0) / 100,
          y: 0,
          z: (y * 1.0) / 100,
        };
        player.movingTo = {
          position,
          lastUpdate: new Date(),
        };
        break;
      default:
        return reject('Invalid action');
    }
    player.lastUpdate = new Date();
    cache.set(id, player);
    return resolve();
  });
};
