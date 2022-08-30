import logger from 'log-champ';
import { Enemy } from '~/models';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    const enemies = Enemy.getAllActiveIds();
    enemies.forEach((enemyId) => {
      const enemy = Enemy.get(enemyId);
      if (!enemy) {
        logger.error('Enemy id found in key list but not in cache');
        return;
      }
      enemy.update();
      Enemy.set(enemyId, enemy);
    });
    return resolve();
  });
};
