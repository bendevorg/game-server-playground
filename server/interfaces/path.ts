import { Position } from '.';

export default interface Path {
  target: Position;
  waypoints: Array<Position>;
}
