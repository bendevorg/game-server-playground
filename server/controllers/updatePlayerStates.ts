import logger from 'log-champ';
import { Player } from '~/models';
import { network } from '~/constants';
import { players as playersCache } from '~/cache';

export default async () => {
  const players = playersCache.keys();
  players.forEach(async (playerId) => {
    const player = playersCache.get<Player>(playerId);
    if (!player) {
      logger.error('Player id found in key list but not in cache');
      return;
    }
    // Check if we haven't received any action (including pings) from a player in a while
    // If so we disconnect the player, which right now means removing it from the online players cache.
    if (new Date().getTime() - player.lastUpdate >= network.TIME_TO_TIMEOUT) {
      player.disconnect();
      return;
    }
    await player.update();
    // TODO: We need to every once in a while save this to the database
    player.save(true, false);
  });
  return;
};
