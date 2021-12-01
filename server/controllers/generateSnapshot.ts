import logger from 'log-champ';
import { Player, Enemy } from '../models';
import { Snapshot, PublicLivingEntity } from '../interfaces';
import { players as playersCache, enemies as enemiesCache } from '../cache';

export default (): Promise<Snapshot> => {
  return new Promise<Snapshot>(async (resolve, reject) => {
    // TODO: This should get things from cache -> redis -> database
    const playerIds: Array<string> | undefined = playersCache.keys();
    const enemyIds: Array<string> | undefined = enemiesCache.keys();
    if (!playerIds || !enemyIds) {
      return reject();
    }
    const players: Array<PublicLivingEntity> = [];
    playerIds.forEach(async (playerId) => {
      const player: Player | undefined = playersCache.get(playerId);
      if (!player) {
        logger.error('Player id in online list but not in cache');
        return;
      }
      const data = await player.retrievePublicData();
      players.push(data);
    });
    const enemies: Array<PublicLivingEntity> = [];
    enemyIds.forEach(async (enemyId) => {
      const enemy: Enemy | undefined = enemiesCache.get(enemyId);
      if (!enemy) {
        logger.error('Player id in online list but not in cache');
        return;
      }
      const data = await enemy.retrievePublicData();
      enemies.push(data);
    });
    return resolve({
      players,
      enemies,
      timestamp: Date.now(),
    });
  });
};
