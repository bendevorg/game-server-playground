import logger from 'log-champ';
import { Player } from '~/models';
import { Snapshot } from '~/interfaces';
import generateSnapshot from '~/controllers/generateSnapshot';
import { players as playersCache } from '~/cache';

export default <T extends boolean>(reduced?: T) => {
  return new Promise<void>(async (resolve, reject) => {
    let snapshot: Snapshot;
    try {
      snapshot = await generateSnapshot(reduced);
    } catch (error) {
      logger.error(error as object);
      return reject();
    }
    const players = playersCache.keys();
    players.forEach((playerId) => {
      const player = playersCache.get<Player>(playerId);
      if (!player) {
        logger.error('Player id found in key list but not in cache');
        return;
      }
      player.sendSnapshot(snapshot);
    });
    return resolve();
  });
};
