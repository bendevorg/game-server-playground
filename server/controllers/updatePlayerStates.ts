import moveEntity from './entity/move';
import { Player } from '../interfaces';
import cache from '../utils/cache';
import logger from 'log-champ';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    const players = cache.keys();
    players.forEach((playerId) => {
      const player = cache.get<Player>(playerId);
      if (!player) {
        logger.error('Player id found in key list but not in cache');
        return;
      }
      moveEntity(player);
      player.lastUpdate = new Date().getTime();
      cache.set(playerId, player);
    });
    return resolve();
  });
};
