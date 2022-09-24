import { Enemy, Map } from '~/models';
import randomFromInterval from '~/utils/randomFromInterval';

// TODO: Thil will be overwritten
// Starting at 100 so enemy ids doesn't conflict with player ids
// For now
let enemyCounter = 100;

export default async (map: Map) => {
  const enemies = Enemy.getAllActiveIds();
  // TODO: Support multiple types of enemies
  for (let i = 0; i < map.enemies[0].amount - enemies.length; i++) {
    // for (let j = 0; j < map.enemies[i].amount; j++) {
    const enemy = new Enemy({
      id: enemyCounter++,
      position: {
        x: randomFromInterval(
          map.enemies[0].spawnBounds.minX,
          map.enemies[0].spawnBounds.maxX,
        ),
        y: 0.5,
        z: randomFromInterval(
          map.enemies[0].spawnBounds.minZ,
          map.enemies[0].spawnBounds.maxZ,
        ),
      },
      level: 1,
      experience: 0,
      health: 10,
      maxHealth: 10,
      speed: 1.5,
      attackRange: 1,
      attackSpeed: 1,
      experienceReward: 1,
      mapId: map.id,
    });
    enemy.setMap(map);
    enemy.save();
    // }
  }
  return;
};
