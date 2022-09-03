import { Position, GridPosition } from '.';

export default interface Node {
  // TODO: Can we use our constants here?
  type: 0 | 1 | 2;
  visited: boolean;
  neighbors: Array<Node>;
  parent: Node;
  cost: number;
  size: number;
  costSoFar: number;
  diagonalCost: number;
  estimatedCostToTarget: number;
  gridPosition: GridPosition;
  position: Position;
}
