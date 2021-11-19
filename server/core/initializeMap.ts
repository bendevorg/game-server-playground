import fs from 'fs';
import path from 'path';
import { map as constants } from '../constants';
import { Map, Node } from '../interfaces';

const { MAP_NAME } = process.env;

export default (): Map | undefined => {
  let map: Map;
  try {
    map = JSON.parse(
      fs.readFileSync(path.resolve(`maps/${MAP_NAME}.json`), {
        encoding: 'utf-8',
      }),
    );
  } catch (err) {
    console.error(err);
    return undefined;
  }

  for (let i = 0; i < map.grid.length; i++) {
    for (let j = 0; j < map.grid[i].length; j++) {
      //  We don't need to get the neighbours for non walkable nodes
      if (map.grid[i][j].type == constants.OBSTACLE_TILE) {
        continue;
      }
      const neighbors: Array<Node> = [];
      //  TODO: Handle edge case where a block fully covers both up/down and left/right
      //  But the diagonal is free, we need at least a space of the size of the agent
      //  To be able to move.
      for (let z = 0; z < constants.POTENTIAL_NEIGHBORS.length; z++) {
        const row = i + constants.POTENTIAL_NEIGHBORS[z][0];
        const isValidRow = row >= 0 && row < map.grid.length;
        if (!isValidRow) {
          continue;
        }
        const column = j + constants.POTENTIAL_NEIGHBORS[z][1];
        const isValidColumn = column >= 0 && column < map.grid[row].length;
        if (!isValidColumn) {
          continue;
        }
        if (map.grid[row][column].type == constants.GROUND_TILE) {
          neighbors.push(map.grid[row][column]);
        }
      }
      map.grid[i][j].neighbors = neighbors;
    }
  }

  return map;
};
