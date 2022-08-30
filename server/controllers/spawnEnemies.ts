import { Enemy, Map } from '~/models';
import { game } from '~/constants';

// TODO: Thil will be overwritten
let enemyCounter = 0;

export default (map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const enemies = Enemy.getAllActiveIds();
    // TODO: Support multiple types of enemies
    for (let i = 0; i < map.enemies.length - enemies.length; i++) {
      for (let j = 0; j < map.enemies[i].amount; j++) {
        const enemy = new Enemy({
          id: enemyCounter++,
          position: { x: -3, y: 0.5, z: -3 },
          health: 10,
          maxHealth: 10,
          speed: 1.5,
          attackRange: 1,
          attackSpeed: 1,
          visionRange: game.VISION_DISTANCE,
          mapId: map.id,
        });
        enemy.setMap(map);
        enemy.save();
      }
    }
    return resolve();
  });
};
