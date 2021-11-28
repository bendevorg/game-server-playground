import { Position, Path } from '.';

export default interface Enemy {
  id: string;
  position: Position;
  path?: Path;
  speed: number;
  lastUpdate: number;
  lastMovement: number;
}
