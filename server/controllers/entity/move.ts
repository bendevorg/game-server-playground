import { Player } from '../../interfaces';
import { game } from '../../constants';

export default (player: Player) => {
  if (!player.path) {
    return;
  }
  const distanceX = player.path.waypoints[player.path.waypoints.length - 1].x - player.position.x;
  const distanceZ = player.path.waypoints[player.path.waypoints.length - 1].z - player.position.z;
  const magnitude = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);
  if (magnitude <= game.MIN_DISTANCE_FOR_NEXT_WAYPOINT) {
    player.position = {
      ...player.position,
      x: player.path.waypoints[player.path.waypoints.length - 1].x,
      z: player.path.waypoints[player.path.waypoints.length - 1].z,
    }
    player.path.waypoints.pop();
    if (player.path.waypoints.length === 0) {
      player.path = undefined;
    }
    return;
  }
  const directionX = distanceX / magnitude;
  const directionZ = distanceZ / magnitude;
  const timeSinceLastUpdate = ((new Date()).getTime() - player.lastUpdate) / 1000;
  const distanceToMoveInX = directionX * player.speed * timeSinceLastUpdate;
  const distanceToMoveInZ = directionZ * player.speed * timeSinceLastUpdate;
  player.position = {
    ...player.position,
    x: player.position.x + distanceToMoveInX,
    z: player.position.z + distanceToMoveInZ,
  };
};
