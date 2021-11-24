import { Position, Path } from '.';

export default interface Player {
  id: string;
  ip: string;
  position: Position;
  path?: Path;
  speed: number;
  lastUpdate: number;
}
