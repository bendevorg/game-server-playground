import { Position } from '.';

export default interface Path {
  startNodePosition: Position;
  target: Position;
  waypoints: Array<Position>;
}
