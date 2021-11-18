import { Position } from '.';

export default interface Move {
  position: Position;
  lastUpdate: Date;
}
