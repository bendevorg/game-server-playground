import fs from 'fs';
import path from 'path';
import { map as constants, map } from '~/constants';
import { Node, Position } from '~/interfaces';
import { maps } from '~/cache';

export default class Map {
  grid: Array<Array<Node>>;
  position: Position;
  squareSize: number;
  // TODO: Update this once we have a proper enemy data format in the map file
  enemies: Array<{ id: number; amount: number }>;

  constructor(mapName: string) {
    const mapFile = JSON.parse(
      fs.readFileSync(path.resolve(`maps/${mapName}.json`), {
        encoding: 'utf-8',
      }),
    );
    this.grid = mapFile.grid;
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

  worldPositionToGridPosition(targetPosition: Position): {
    row: number;
    column: number;
  } {
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

  worldPositionToNode(targetPosition: Position): Node {
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
    return this.grid[row][column];
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
            clone[neighbor.gridPosition.x][neighbor.gridPosition.y],
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
      const minRow = Math.max(0, center.gridPosition.y - cellsRange);
      const maxRow = Math.min(
        this.grid.length - 1,
        center.gridPosition.y + cellsRange,
      );
      const minColumn = Math.max(0, center.gridPosition.x - cellsRange);
      const maxColumn = Math.min(
        this.grid[0].length - 1,
        center.gridPosition.x + cellsRange,
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
