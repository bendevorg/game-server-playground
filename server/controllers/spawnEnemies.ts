import { Enemy, Map } from '~/models';
import randomFromInterval from '~/utils/randomFromInterval';
import {
  enemies as enemiesData,
  livingEntity as entityConstants,
} from '~/constants';

// TODO: Thil will be overwritten
// Starting at 100 so enemy ids doesn't conflict with player ids
// For now
let enemyCounter = 100;

export default async (map: Map) => {
  for (let i = 0; i < map.enemies.length; i++) {
    const enemyType = map.enemies[i].type;
    const amountOfEnemies = Enemy.getAmountOfActivesByType(enemyType);
    for (let j = 0; j < map.enemies[i].amount - amountOfEnemies; j++) {
      const enemy = new Enemy({
        id: enemyCounter++,
        type: map.enemies[i].type,
        position: {
          x: randomFromInterval(
            map.enemies[i].spawnBounds.minX,
            map.enemies[i].spawnBounds.maxX,
          ),
          y: 0.5,
          z: randomFromInterval(
            map.enemies[i].spawnBounds.minZ,
            map.enemies[i].spawnBounds.maxZ,
          ),
        },
        dimension: entityConstants.DEFAULT_DIMENSION,
        ...enemiesData[map.enemies[i].type],
        mapId: map.id,
      });
      enemy.setMap(map);
      enemy.save();
    }
  }
  return;
};
