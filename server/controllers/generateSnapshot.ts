import logger from 'log-champ';
import { Player, Enemy } from '~/models';
import { Snapshot, ConditionalSnapshotLivingEntity } from '~/interfaces';
import { players as playersCache, enemies as enemiesCache } from '~/cache';

export default <T extends boolean>(reduced?: T): Promise<Snapshot> => {
  return new Promise<Snapshot>(async (resolve, reject) => {
    const playerIds: Array<string> | undefined = playersCache.keys();
    const enemyIds: Array<string> | undefined = enemiesCache.keys();
    if (!playerIds || !enemyIds) {
      return reject();
    }
    const players: Array<ConditionalSnapshotLivingEntity<T>> = [];
    // TODO: Add concurrency for asking all snapshots at once and wait for all of them to finish
    // Instead of asking and waiting for each one sequentially
    for (let i = 0; i < playerIds.length; i++) {
      const player: Player | undefined = playersCache.get(playerIds[i]);
      if (!player) {
        logger.error('Player id in online list but not in cache');
        return;
      }
      const data: ConditionalSnapshotLivingEntity<T> =
        await player.retrieveSnapshotData(reduced);
      players.push(data);
    }
    const enemies: Array<ConditionalSnapshotLivingEntity<T>> = [];
    // TODO: Add concurrency for asking all snapshots at once and wait for all of them to finish
    // Instead of asking and waiting for each one sequentially
    for (let i = 0; i < enemyIds.length; i++) {
      const enemy: Enemy | undefined = enemiesCache.get(enemyIds[i]);
      if (!enemy) {
        logger.error('Player id in online list but not in cache');
        return;
      }
      const data: ConditionalSnapshotLivingEntity<T> =
        await enemy.retrieveSnapshotData(reduced);
      enemies.push(data);
    }
    return resolve({
      players,
      enemies,
      timestamp: Date.now(),
    });
  });
};
