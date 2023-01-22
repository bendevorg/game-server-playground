import logger from 'log-champ';
import { Projectile } from '~/models';

export default () => {
  return new Promise<void>(async (resolve, reject) => {
    const projectiles = Projectile.getAllActiveIds();
    projectiles.forEach(async (projectileId) => {
      const projectile = Projectile.getActive(projectileId);
      if (!projectile) {
        logger.error('Projectile id found in key list but not in cache');
        return reject();
      }
      await projectile.update();
      projectile.save();
    });
    return resolve();
  });
};
