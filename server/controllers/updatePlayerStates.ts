import logger from 'log-champ';
import { Player } from '~/models';
import { network } from '~/constants';
import { players as playersCache } from '~/cache';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    const players = playersCache.keys();
    players.forEach((playerId) => {
      const player = playersCache.get<Player>(playerId);
      if (!player) {
        logger.error('Player id found in key list but not in cache');
        return;
      }
      // Check if we haven't received any action (including pings) from a player in a while
      // If so we disconnect the player, which right now means removing it from the online players cache.
      if (new Date().getTime() - player.lastUpdate >= network.TIME_TO_TIMEOUT) {
        playersCache.del(playerId);
        return;
      }
      player.update();
      playersCache.set(playerId, player);
    });
    return resolve();
  });
};
