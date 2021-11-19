import { Position, TwoDPosition } from '.';

export default interface Node {
  // TODO: Can we use our constants here?
  type: 0 | 1 | 2;
  visited: boolean;
  cost: number;
  size: number;
  costSoFar: number;
  diagonalCost: number;
  estimatedCostToTarget: number;
  gridPosition: TwoDPosition;
  position: Position;
}
