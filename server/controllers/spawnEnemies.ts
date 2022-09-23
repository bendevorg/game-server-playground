import { Enemy, Map } from '~/models';

// TODO: Thil will be overwritten
// Starting at 100 so enemy ids doesn't conflict with player ids
// For now
let enemyCounter = 100;

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
          mapId: map.id,
        });
        enemy.setMap(map);
        enemy.save();
      }
    }
    return resolve();
  });
};
