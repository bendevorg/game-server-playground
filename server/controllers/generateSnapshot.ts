import logger from 'log-champ';
import { Player, Enemy } from '../models';
import { Snapshot, PublicPlayer, PublicEnemy } from '../interfaces';
import { players as playersCache, enemies as enemiesCache } from '../cache';

export default (): Promise<Snapshot> => {
  return new Promise<Snapshot>((resolve, reject) => {
    // TODO: This should get things from cache -> redis -> database
    const playerIds: Array<string> | undefined = playersCache.keys();
    const enemyIds: Array<string> | undefined = enemiesCache.keys();
    if (!playerIds || !enemyIds) {
      return reject();
    }
    const players: Array<PublicPlayer> = [];
    playerIds.forEach((playerId) => {
      const player: Player | undefined = playersCache.get(playerId);
      if (!player) {
        logger.error('Player id in online list but not in cache');
        return;
      }
      players.push(player.retrievePublicData());
    });
    const enemies: Array<PublicEnemy> = [];
    enemyIds.forEach((enemyId) => {
      const enemy: Enemy | undefined = enemiesCache.get(enemyId);
      if (!enemy) {
        logger.error('Player id in online list but not in cache');
        return;
      }
      enemies.push(enemy.retrievePublicData());
    });
    return resolve({
      players,
      enemies,
      timestamp: Date.now(),
    });
  });
};
