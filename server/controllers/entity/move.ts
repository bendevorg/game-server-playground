import { Player } from '../../interfaces';
import { game } from '../../constants';

export default (player: Player) => {
  if (!player.movingTo) {
    return;
  }
  const distanceX = player.movingTo.position.x - player.position.x;
  const distanceZ = player.movingTo.position.z - player.position.z;
  const magnitude = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);
  if (magnitude <= game.MIN_DISTANCE_FOR_NEXT_WAYPOINT) {
    player.position = {
      ...player.position,
      x: player.movingTo.position.x,
      y: player.movingTo.position.y,
    }
    player.movingTo = undefined;
    return;
  }
  const directionX = distanceX / magnitude;
  const directionZ = distanceZ / magnitude;
  const timeSinceLastUpdate = ((new Date()).getTime() - player.lastUpdate.getTime()) / 1000;
  const distanceToMoveInX = directionX * player.speed * timeSinceLastUpdate;
  const distanceToMoveInZ = directionZ * player.speed * timeSinceLastUpdate;
  player.position = {
    ...player.position,
    x: player.position.x + distanceToMoveInX,
    z: player.position.z + distanceToMoveInZ,
  };
};
