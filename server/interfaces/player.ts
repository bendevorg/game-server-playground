import { Position, Move } from '.';

export default interface Player {
  id: string;
  ip: string;
  position: Position;
  movingTo?: Move;
  speed: number;
  lastUpdate: Date;
}
