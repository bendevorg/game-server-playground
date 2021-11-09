import { Snapshot, Player } from '../interfaces';
import generateSnapshot from './generateSnapshot';
import sendSnapshotToPlayer from './sendSnapshotToPlayer';
import cache from '../utils/cache';
import logger from 'log-champ';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    let mainSnapshot: Snapshot;
    try {
      mainSnapshot = await generateSnapshot();
    } catch (error) {
      logger.error(error as object);
      return reject();
    }
    const players = cache.keys();
    players.forEach((playerId) => {
      const player = cache.get<Player>(playerId);
      if (!player) {
        logger.error('Player id found in key list but not in cache');
        return;
      }
      sendSnapshotToPlayer(player, mainSnapshot);
    });
    return resolve();
  });
};
