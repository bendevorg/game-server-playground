import { Player } from '../../interfaces';
import { game } from '../../constants';

// The optional currentTimestamp parameter may be sent
// to be used to check how much the player should move
// If the parameter is not send Date.now() will be used
export default (player: Player, currentTimestamp?: number) => {
  if (!player.path || player.path.waypoints.length === 0) {
    return;
  }
  let distanceX =
    player.path.waypoints[player.path.waypoints.length - 1].x -
    player.position.x;
  let distanceZ =
    player.path.waypoints[player.path.waypoints.length - 1].z -
    player.position.z;
  let magnitude = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);

  // TODO: We should also check if we passed the waypoint
  while (
    magnitude <= game.MIN_DISTANCE_FOR_NEXT_WAYPOINT &&
    player.path.waypoints.length > 1
  ) {
    player.path.waypoints.pop();
    distanceX =
      player.path.waypoints[player.path.waypoints.length - 1].x -
      player.position.x;
    distanceZ =
      player.path.waypoints[player.path.waypoints.length - 1].z -
      player.position.z;
    magnitude = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);
  }

  if (magnitude <= game.MIN_DISTANCE_FOR_NEXT_WAYPOINT && player.path.waypoints.length === 1) {
    player.position = {
      ...player.position,
      x: player.path.waypoints[0].x,
      z: player.path.waypoints[0].z,
    };
    player.path.waypoints.pop();
    return;
  }
  const directionX = distanceX / magnitude;
  const directionZ = distanceZ / magnitude;
  const timeSinceLastUpdate = ((currentTimestamp || new Date().getTime()) - player.lastUpdate) / 1000;
  const distanceToMoveInX = directionX * player.speed * timeSinceLastUpdate;
  const distanceToMoveInZ = directionZ * player.speed * timeSinceLastUpdate;
  player.position = {
    ...player.position,
    x: player.position.x + distanceToMoveInX,
    z: player.position.z + distanceToMoveInZ,
  };
};
