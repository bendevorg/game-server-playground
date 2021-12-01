import logger from 'log-champ';
import { Player } from '../models';
import { network } from '../constants';
import { players as playersCache } from '../cache';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    const players = playersCache.keys();
    players.forEach((playerId) => {
      const player = playersCache.get<Player>(playerId);
      if (!player) {
        logger.error('Player id found in key list but not in cache');
        return;
      }
      if (new Date().getTime() - player.lastUpdate >= network.TIME_TO_TIMEOUT) {
        playersCache.del(playerId);
        return;
      }
      player.move();
      playersCache.set(playerId, player);
    });
    return resolve();
  });
};
