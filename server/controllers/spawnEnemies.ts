import uuid4 from 'uuid4';
import { Enemy, Map } from '../models';
import { enemies as enemiesCache } from '../cache';

// TODO: Thil will be overwritten
let enemyCounter = 0;

export default (map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const enemies = enemiesCache.keys();
    // TODO: Support multiple types of enemies
    for (let i = 0; i < map.enemies.length - enemies.length; i++) {
      for (let j = 0; j < map.enemies[i].amount; j++) {
        const id = uuid4();
        const enemy = new Enemy({
          id: enemyCounter++,
          position: { x: -3, y: 0.5, z: -3 },
          health: 10,
          maxHealth: 10,
          speed: 1.5,
        });
        enemy.setMap(map);
        enemiesCache.set(id, enemy);
      }
    }
    return resolve();
  });
};
