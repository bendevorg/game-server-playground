import { GridPosition, GridLine } from '.';

export default interface Obstacle {
  topLeft: GridPosition;
  topRight: GridPosition;
  bottomLeft: GridPosition;
  bottomRight: GridPosition;
  topLine: GridLine;
  rightLine: GridLine;
  bottomLine: GridLine;
  leftLine: GridLine;
  upmost: number;
  bottommost: number;
  leftmost: number;
  rightmost: number;
}
