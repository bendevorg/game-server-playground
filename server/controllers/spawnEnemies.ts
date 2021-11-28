import uuid4 from 'uuid4';
import { Enemy } from '../interfaces';
import { Map } from '../classes';
import { enemies as enemiesCache } from '../cache';

export default (map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const enemies = enemiesCache.keys();
    // TODO: Support multiple enemies
    for (let i = 0; i < map.enemies.length - enemies.length; i++) {
      const id = uuid4();
      const now = new Date().getTime();
      const enemy: Enemy = {
        id,
        // TODO: Pick a random spot in the map
        position: { x: -3, y: 0.5, z: -3 },
        // TODO: Get this from the enemy's database using the enemy id from the map
        speed: 3,
        lastUpdate: now,
        lastMovement: now,
      };
      enemiesCache.set(id, enemy);
    }
    return resolve();
  });
};
