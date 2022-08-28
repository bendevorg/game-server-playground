import logger from 'log-champ';
import { Enemy } from '~/models';
import { enemies as enemiesCache } from '~/cache';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    const enemies = enemiesCache.keys();
    enemies.forEach((enemyId) => {
      const enemy = enemiesCache.get<Enemy>(enemyId);
      if (!enemy) {
        logger.error('Enemy id found in key list but not in cache');
        return;
      }
      enemy.update();
      enemiesCache.set(enemyId, enemy);
    });
    return resolve();
  });
};
