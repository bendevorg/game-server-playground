import { Snapshot, Player } from '../interfaces';
import generateSnapshot from './generateSnapshot';
import sendSnapshotToPlayer from './sendSnapshotToPlayer';
import { players as playersCache } from '../cache';
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
    const players = playersCache.keys();
    players.forEach((playerId) => {
      const player = playersCache.get<Player>(playerId);
      if (!player) {
        logger.error('Player id found in key list but not in cache');
        return;
      }
      sendSnapshotToPlayer(player, mainSnapshot);
    });
    return resolve();
  });
};
