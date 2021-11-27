import logger from 'log-champ';
import moveEntity from './entity/move';
import { Player } from '../interfaces';
import { network } from '../constants';
import cache from '../utils/cache';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    const players = cache.keys();
    players.forEach((playerId) => {
      const player = cache.get<Player>(playerId);
      if (!player) {
        logger.error('Player id found in key list but not in cache');
        return;
      }
      if (new Date().getTime() - player.lastUpdate >= network.TIME_TO_TIMEOUT) {
        cache.del(playerId);
        return;
      }
      moveEntity(player);
      cache.set(playerId, player);
    });
    return resolve();
  });
};
