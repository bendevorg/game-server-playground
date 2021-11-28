import logger from 'log-champ';
import {
  Snapshot,
  Player,
  PublicPlayer,
  Enemy,
  PublicEnemy,
} from '../interfaces';
import { players as playersCache, enemies as enemiesCache } from '../cache';
import omit from '../utils/omit';

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
      const publicPlayer = omit(player, [
        'ip',
        'lastUpdate',
        'lastMovement',
        'path',
      ]);
      players.push(publicPlayer);
    });
    const enemies: Array<PublicEnemy> = [];
    enemyIds.forEach((enemyId) => {
      const enemy: Enemy | undefined = enemiesCache.get(enemyId);
      if (!enemy) {
        logger.error('Player id in online list but not in cache');
        return;
      }
      const publicEnemy = omit(enemy, ['lastUpdate', 'lastMovement', 'path']);
      enemies.push(publicEnemy);
    });
    return resolve({
      players,
      enemies,
      timestamp: Date.now(),
    });
  });
};
