import fs from 'fs';
import path from 'path';
import doIntersect from '~/utils/doIntersect';
import { map as constants, map } from '~/constants';
import { Node, Position, GridPosition, GridLine, Obstacle } from '~/interfaces';
import { maps } from '~/cache';

export default class Map {
  id: string;
  grid: Array<Array<Node>>;
  obstacles: Array<Obstacle>;
  position: Position;
  squareSize: number;
  // TODO: Update this once we have a proper enemy data format in the map file
  enemies: Array<{
    id: number;
    type: number;
    amount: number;
    spawnBounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  }>;

  constructor(mapName: string) {
    const mapFile = JSON.parse(
      fs.readFileSync(path.resolve(`maps/${mapName}.json`), {
        encoding: 'utf-8',
      }),
    );
    this.id = mapName;
    this.grid = mapFile.grid;
    this.obstacles = mapFile.obstacles;
    this.position = mapFile.position;
    this.squareSize = mapFile.squareSize;
    this.enemies = mapFile.enemies;
    this.setupNeighbors();
  }

  static get(name: string) {
    return maps.get<Map>(name);
  }

  setupNeighbors() {
    for (let i = 0; i < this.grid.length; i++) {
      for (let j = 0; j < this.grid[i].length; j++) {
        //  We don't need to get the neighbours for non walkable nodes
        if (this.grid[i][j].type == constants.OBSTACLE_TILE) {
          continue;
        }
        const neighbors: Array<Node> = [];
        //  TODO: Handle edge case where a block fully covers both up/down and left/right
        //  But the diagonal is free, we need at least a space of the size of the agent
        //  To be able to move.
        for (let z = 0; z < constants.POTENTIAL_NEIGHBORS.length; z++) {
          const row = i + constants.POTENTIAL_NEIGHBORS[z][0];
          const isValidRow = row >= 0 && row < this.grid.length;
          if (!isValidRow) {
            continue;
          }
          const column = j + constants.POTENTIAL_NEIGHBORS[z][1];
          const isValidColumn = column >= 0 && column < this.grid[row].length;
          if (!isValidColumn) {
            continue;
          }
          if (this.grid[row][column].type == constants.GROUND_TILE) {
            neighbors.push(this.grid[row][column]);
          }
        }
        this.grid[i][j].neighbors = neighbors;
      }
    }
  }

  worldPositionToGridPosition(targetPosition: Position): GridPosition {
    const distanceFromStartInX = targetPosition.x - this.position.x;
    const distanceFromStartInZ = targetPosition.z - this.position.z;
    const row = Math.floor(distanceFromStartInZ / this.squareSize);
    const column = Math.floor(distanceFromStartInX / this.squareSize);
    if (
      this.grid == null ||
      row < 0 ||
      row >= this.grid.length ||
      column < 0 ||
      column >= this.grid[row].length
    ) {
      throw 'World position is not inside the grid';
    }
    return { row, column };
  }

  gridPositionToNode(gridPosition: GridPosition): Node {
    return this.grid[gridPosition.row][gridPosition.column];
  }

  worldPositionToNode(targetPosition: Position): Node {
    const gridPosition = this.worldPositionToGridPosition(targetPosition);
    return this.gridPositionToNode(gridPosition);
  }

  // This will return float rows and column, should be used
  // When trying to check the closest grid position that is not its current position.
  // This might return an out of bounds grid position
  worldPositionToRawGridPosition(targetPosition: Position): GridPosition {
    const distanceFromStartInX = targetPosition.x - this.position.x;
    const distanceFromStartInZ = targetPosition.z - this.position.z;
    const row = distanceFromStartInZ / this.squareSize;
    const column = distanceFromStartInX / this.squareSize;
    return {
      row,
      column,
    };
  }

  // This will be called a lot, so let's try to be as efficient as possible
  // Before we do any fancy math to check if the line actually cross the bounds
  // We can check if it definitely doesn't in a very cheap way. For that we can
  // check if both points are above, below, to the left or to the right of the obstacle.
  // If so we can confidently say that it doesn't intersect.
  isLineCrossingAnObject(line: GridLine) {
    // TODO: There might be a mathematical way to check this
    for (let i = 0; i < this.obstacles.length; i++) {
      const bothPointsAbove =
        line.pointA.row > this.obstacles[i].upmost &&
        line.pointB.row > this.obstacles[i].upmost;
      if (bothPointsAbove) continue;
      const bothPointsBelow =
        line.pointA.row < this.obstacles[i].bottommost &&
        line.pointB.row < this.obstacles[i].bottommost;
      if (bothPointsBelow) continue;
      const bothPointsMoreToTheLeft =
        line.pointA.column < this.obstacles[i].leftmost &&
        line.pointB.column < this.obstacles[i].leftmost;
      if (bothPointsMoreToTheLeft) continue;
      const bothPointsMoreToTheRight =
        line.pointA.column > this.obstacles[i].rightmost &&
        line.pointB.column > this.obstacles[i].rightmost;
      if (bothPointsMoreToTheRight) continue;
      // More expensive check
      // If none of the above worked we will need to check if any of the 4 lines in the rectangle
      // Intersects with the point. To understand better how this is done you can check the explanation here
      // https://www.geeksforgeeks.org/check-if-two-given-line-segments-intersect/
      // TODO: There might be a clever way to skip some of these
      if (doIntersect(line, this.obstacles[i].topLine)) return true;
      if (doIntersect(line, this.obstacles[i].rightLine)) return true;
      if (doIntersect(line, this.obstacles[i].bottomLine)) return true;
      if (doIntersect(line, this.obstacles[i].leftLine)) return true;
    }
    return false;
  }

  cloneGrid(): Array<Array<Node>> {
    if (!this.grid) {
      return [];
    }
    //  We need a deep clone
    const clone: Array<Array<Node>> = [];
    for (let i = 0; i < this.grid.length; i++) {
      clone[i] = [];
      for (let j = 0; j < this.grid[i].length; j++) {
        // TODO: There's probably faster ways to do this
        const node = { ...this.grid[i][j], neighbors: [] };
        clone[i][j] = JSON.parse(JSON.stringify(node));
      }
    }
    for (let i = 0; i < clone.length; i++) {
      for (let j = 0; j < clone[i].length; j++) {
        if (this.grid[i][j].neighbors == null) {
          continue;
        }
        const neighbors: Array<Node> = [];
        this.grid[i][j].neighbors.forEach((neighbor) => {
          neighbors.push(
            clone[neighbor.gridPosition.row][neighbor.gridPosition.column],
          );
        });

        clone[i][j].neighbors = neighbors;
      }
    }
    return clone;
  }

  getRandomWalkableNode(center: Node, range: number): Node | null {
    // TODO: Improve this, we should be able to do this in O(1) without
    // having to rely on "luck". Right now we try 5 times (each being O(1))
    // But there is a chance that all tries ends up hiting an obstacle.
    // In the best scenario we would do the same but only try to fetch from the walkable tiles
    let tentatives = 0;
    while (tentatives < 5) {
      const cellsRange = Math.ceil(range / this.squareSize);
      const minRow = Math.max(0, center.gridPosition.row - cellsRange);
      const maxRow = Math.min(
        this.grid.length - 1,
        center.gridPosition.row + cellsRange,
      );
      const minColumn = Math.max(0, center.gridPosition.column - cellsRange);
      const maxColumn = Math.min(
        this.grid[0].length - 1,
        center.gridPosition.column + cellsRange,
      );
      const row = Math.floor(Math.random() * (maxRow - minRow + 1) + minRow);
      const column = Math.floor(
        Math.random() * (maxColumn - minColumn + 1) + minColumn,
      );
      if (this.grid[row][column].type === map.GROUND_TILE) {
        return this.grid[row][column];
      }
      tentatives++;
    }
    return null;
  }
}
