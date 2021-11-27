import { Position, Path } from '.';

export default interface Player {
  id: string;
  ip: string;
  // TODO: Remove this
  port: number;
  position: Position;
  path?: Path;
  speed: number;
  lastUpdate: number;
  lastMovement: number;
}
