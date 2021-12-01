import uuid4 from 'uuid4';
import { Enemy, Map } from '../models';
import { enemies as enemiesCache } from '../cache';

export default (map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const enemies = enemiesCache.keys();
    // TODO: Support multiple types of enemies
    for (let i = 0; i < map.enemies.length - enemies.length; i++) {
      const id = uuid4();
      const enemy = new Enemy({
        id,
        position: { x: -3, y: 0.5, z: -3 },
        speed: 3,
      });
      enemiesCache.set(id, enemy);
    }
    return resolve();
  });
};
