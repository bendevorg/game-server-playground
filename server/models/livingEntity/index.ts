import { Map } from '../';
import {
  Path,
  Position,
  Node,
  LivingEntityConstructor,
  GridLine,
  GridPosition,
  SnapshotLivingEntity,
} from '~/interfaces';
import { map as constants, game, locks } from '~/constants';
import lock from '~/utils/lock';
import isInRange from '~/utils/isInRange';

export enum State {
  STAND_BY = 0,
  MOVING = 1,
  MOVING_TO_ATTACK = 2,
  ATTACKING = 3,
}

export default class LivingEntity {
  previousState: State = State.STAND_BY;
  state: State = State.STAND_BY;
  id: number;
  position: Position;
  path?: Path;
  health: number;
  maxHealth: number;
  speed: number;
  attackRange: number;
  attackSpeed: number;
  visionRange: number;
  target?: LivingEntity;
  lastUpdate: number;
  lastMovement: number;
  lastPathAttackUpdate: number;
  timeForNextAttack: number;
  mapId: string;
  map?: Map;

  constructor({
    id,
    position,
    health,
    maxHealth,
    speed,
    attackRange,
    attackSpeed,
    visionRange,
    mapId,
  }: LivingEntityConstructor) {
    this.id = id;
    this.position = position;
    this.health = health;
    this.maxHealth = maxHealth;
    this.speed = speed;
    this.attackRange = attackRange;
    this.attackSpeed = attackSpeed;
    this.visionRange = visionRange;
    this.mapId = mapId;
    this.target = undefined;
    const now = new Date().getTime();
    this.lastUpdate = now;
    this.lastMovement = now;
    this.lastPathAttackUpdate = now;
    this.timeForNextAttack = now;
  }

  setMap(map: Map) {
    this.map = map;
  }

  setLastUpdate(timestamp?: number) {
    this.lastUpdate = timestamp || new Date().getTime();
  }

  setLastMovement(timestamp?: number) {
    this.lastMovement = timestamp || new Date().getTime();
  }

  setLastPathUpdate() {
    this.lastPathAttackUpdate =
      new Date().getTime() + game.TIME_BETWEEN_PATH_UPDATES;
  }

  update() {
    this.updateState();
    this.move();
    this.attack();
  }

  retrieveSnapshotData() {
    return new Promise<SnapshotLivingEntity>((resolve) => {
      lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
        resolve({
          id: this.id,
          position: this.position,
          health: this.health,
          maxHealth: this.maxHealth,
          speed: this.speed,
          attackRange: this.attackRange,
        });
        done();
      });
    });
  }

  updateState() {
    this.previousState = this.state;
    if (this.target) {
      if (!isInRange(this.position, this.target.position, this.visionRange)) {
        this.state = State.STAND_BY;
        this.target = undefined;
        return;
      }
      if (!isInRange(this.position, this.target.position, this.attackRange)) {
        this.state = State.MOVING_TO_ATTACK;
        return;
      }
      this.state = State.ATTACKING;
    }
    if (this.path && this.path.waypoints.length > 0) {
      this.state = State.MOVING;
      return;
    }
    this.state = State.STAND_BY;
  }

  // If there is no objects between the two points
  // then a straight path is available
  isStraightPathAvailable(start: Node, end: Node) {
    if (!this.map) return false;
    const line: GridLine = {
      pointA: start.gridPosition,
      pointB: end.gridPosition,
    };
    return !this.map.isLineCrossingAnObject(line);
  }

  async attemptToFindNewStart(start: Node, end: Node, grid: Node[][]) {
    if (!this.map) return start;
    // We first try to check if the next cell in the target direction is free
    // Since that's the one that would reproduce the smoothest path
    let directionRow = end.gridPosition.row - start.gridPosition.row;
    let directionColumn = end.gridPosition.column - start.gridPosition.column;
    directionRow = Math.min(Math.max(directionRow, -1), 1);
    directionColumn = Math.min(Math.max(directionColumn, -1), 1);
    const candidateRow = start.gridPosition.row + directionRow;
    const candidateColumn = start.gridPosition.column + directionColumn;
    const rowAndColumnWithinBounds =
      candidateRow >= 0 &&
      candidateRow < grid.length &&
      candidateColumn >= 0 &&
      candidateColumn < grid[candidateRow].length;
    if (
      rowAndColumnWithinBounds &&
      grid[candidateRow][candidateColumn].type == constants.GROUND_TILE
    ) {
      return grid[candidateRow][candidateColumn];
    }
    // If that one doesn't work we try to be the closest in at least one of the axis
    if (
      grid[candidateRow][start.gridPosition.column].type ==
      constants.GROUND_TILE
    ) {
      return grid[candidateRow][candidateColumn];
    }
    if (
      grid[start.gridPosition.row][candidateColumn].type ==
      constants.GROUND_TILE
    ) {
      return grid[candidateRow][candidateColumn];
    }

    // If that still doesn't work we get the next closes row and column to the player
    // And try to mix that with the closest row and column of the target
    let rawGridPosition: GridPosition | undefined;
    await lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
      if (!this.map) return done();
      rawGridPosition = this.map.worldPositionToRawGridPosition(this.position);
      done();
    });
    if (!rawGridPosition) return start;
    let rawGridRowDecimals =
      rawGridPosition.row - Math.floor(rawGridPosition.row);
    let rawGridColumnDecimals =
      rawGridPosition.column - Math.floor(rawGridPosition.column);
    let closestRow =
      start.gridPosition.row + (rawGridRowDecimals >= 0.5 ? 1 : -1);
    let validClosestRow = closestRow > 0 && closestRow < grid.length;
    if (
      validClosestRow &&
      grid[closestRow][candidateColumn].type == constants.GROUND_TILE
    ) {
      return grid[closestRow][candidateColumn];
    }
    let closestColumn =
      start.gridPosition.column + (rawGridColumnDecimals >= 0.5 ? 1 : -1);
    let validClosestColumn =
      closestColumn > 0 && closestColumn < grid[candidateRow].length;
    if (
      validClosestColumn &&
      grid[candidateRow][closestColumn].type == constants.GROUND_TILE
    ) {
      return grid[candidateRow][closestColumn];
    }
    validClosestColumn =
      closestColumn > 0 && closestColumn < grid[closestRow].length;
    if (
      validClosestRow &&
      validClosestRow &&
      grid[closestRow][closestColumn].type == constants.GROUND_TILE
    ) {
      return grid[closestRow][closestColumn];
    }

    // Farthest points
    closestRow = start.gridPosition.row + (rawGridRowDecimals >= 0.5 ? -1 : 1);
    validClosestRow = closestRow > 0 && closestRow < grid.length;
    if (
      validClosestRow &&
      grid[closestRow][candidateColumn].type == constants.GROUND_TILE
    ) {
      return grid[closestRow][candidateColumn];
    }
    closestColumn =
      start.gridPosition.column + (rawGridColumnDecimals >= 0.5 ? -1 : 1);
    validClosestColumn =
      closestColumn > 0 && closestColumn < grid[candidateRow].length;
    if (
      closestColumn > 0 &&
      closestColumn < grid[candidateRow].length &&
      grid[candidateRow][closestColumn].type == constants.GROUND_TILE
    ) {
      return grid[candidateRow][closestColumn];
    }
    validClosestColumn =
      closestColumn > 0 && closestColumn < grid[closestRow].length;
    if (
      validClosestRow &&
      validClosestRow &&
      grid[closestRow][closestColumn].type == constants.GROUND_TILE
    ) {
      return grid[closestRow][closestColumn];
    }
    return start;
  }

  calculatePath(target: Position) {
    return new Promise<void>(async (resolve, reject) => {
      if (!this.map) {
        return reject('Map not set for entity');
      }
      let startGridPosition = { row: 0, column: 0 };
      await lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
        if (this.map) {
          startGridPosition = this.map.worldPositionToGridPosition(
            this.position,
          );
        }
        done();
      });
      const targetGridPosition = this.map.worldPositionToGridPosition(target);
      const grid = this.map.cloneGrid();
      let start = grid[startGridPosition.row][startGridPosition.column];
      const end = grid[targetGridPosition.row][targetGridPosition.column];
      if (end.type !== constants.GROUND_TILE) {
        return resolve();
      }
      if (start.type !== constants.GROUND_TILE) {
        // There are scenarios where a path can make the user walk slightly over an obstacle
        // In those cases we should try to start our path on the closest non obstacle point.
        start = await this.attemptToFindNewStart(start, end, grid);
        if (start.type !== constants.GROUND_TILE) {
          return resolve();
        }
      }
      let nodes: Array<Node> = [];

      // If is not within vision range we don't calculate anything
      if (!isInRange(start.position, end.position, game.VISION_DISTANCE)) {
        return resolve();
      }

      //  Calculating path
      // If a straight path is valid we don't need to run a*
      // The path will be those 2 nodes.
      if (this.isStraightPathAvailable(start, end)) {
        nodes.push(end);
        nodes.push(start);
      } else {
        // A*
        //  This list holds the Nodes that are candidates to be expanded
        const candidatesList: Array<Node> = [];
        const candidatesListHash: { [key: string]: boolean } = {};
        //  Holds the Nodes that we expanded already so we don't need to expand them again
        const exploredListHash: { [key: string]: boolean } = {};
        //  Start with only the starting point
        candidatesList.push(start);
        candidatesListHash[
          `${start.gridPosition.row}-${start.gridPosition.column}`
        ] = true;
        while (candidatesList.length > 0) {
          let lowestCostIndex = 0;
          //  Get the next cheapest node
          for (let i = 0; i < candidatesList.length; i++) {
            const candidateCost =
              candidatesList[i].costSoFar +
              candidatesList[i].estimatedCostToTarget;
            const currentCost =
              candidatesList[lowestCostIndex].costSoFar +
              candidatesList[lowestCostIndex].estimatedCostToTarget;
            if (candidateCost < currentCost) {
              lowestCostIndex = i;
            }
          }
          let currentNode: Node = candidatesList[lowestCostIndex];
          if (currentNode === end) {
            // Last waypoint's position should be the target
            currentNode.position = {
              x: target.x,
              y: currentNode.position.y,
              z: target.z,
            };
            // Found it, let's create the path
            while (currentNode.parent) {
              nodes.push(currentNode);
              currentNode = currentNode.parent;
            }
            break;
          }
          //  We are going to expand this node, so let's remove it from the candidates list
          //  And add it to the explored list
          candidatesList.splice(lowestCostIndex, 1);
          delete candidatesListHash[
            `${currentNode.gridPosition.row}-${currentNode.gridPosition.column}`
          ];
          exploredListHash[
            `${currentNode.gridPosition.row}-${currentNode.gridPosition.column}`
          ] = true;

          //  Let's look for each neighbour of this expanded node
          for (let i = 0; i < currentNode.neighbors.length; i++) {
            //  If this neighbour was explored already we skip it
            if (
              `${currentNode.neighbors[i].gridPosition.row}-${currentNode.neighbors[i].gridPosition.column}` in
                exploredListHash ||
              !isInRange(
                currentNode.neighbors[i].position,
                start.position,
                game.VISION_DISTANCE,
              )
            ) {
              continue;
            }
            //  If this neighbour is in the candidate list let's see if we can update the total cost for it
            //  If we can we also set the current node as it's parent so we can know the path later
            const isDiagonal =
              currentNode.gridPosition.row -
                currentNode.neighbors[i].gridPosition.row !==
                0 &&
              currentNode.gridPosition.column -
                currentNode.neighbors[i].gridPosition.column !==
                0;
            if (
              `${currentNode.neighbors[i].gridPosition.row}-${currentNode.neighbors[i].gridPosition.column}` in
              candidatesListHash
            ) {
              if (
                currentNode.costSoFar + currentNode.neighbors[i].cost <
                currentNode.neighbors[i].costSoFar
              ) {
                currentNode.neighbors[i].costSoFar =
                  currentNode.costSoFar +
                  currentNode.neighbors[i].cost +
                  (isDiagonal
                    ? currentNode.diagonalCost +
                      currentNode.neighbors[i].diagonalCost
                    : 0);
                currentNode.neighbors[i].parent = currentNode;
              }
              continue;
            }
            //  If this neighbour was not explored and was not ready to be explored
            //  It means that we should add this to the candidates list so we can explore
            //  It later
            currentNode.neighbors[i].costSoFar =
              currentNode.costSoFar +
              currentNode.neighbors[i].cost +
              (isDiagonal
                ? currentNode.diagonalCost +
                  currentNode.neighbors[i].diagonalCost
                : 0);
            currentNode.neighbors[i].estimatedCostToTarget = Math.ceil(
              Math.sqrt(
                Math.pow(
                  start.position.x - currentNode.neighbors[i].position.x,
                  2,
                ) +
                  Math.pow(
                    start.position.y - currentNode.neighbors[i].position.y,
                    2,
                  ),
              ),
            );
            currentNode.neighbors[i].parent = currentNode;
            candidatesList.push(currentNode.neighbors[i]);
            candidatesListHash[
              `${currentNode.neighbors[i].gridPosition.row}-${currentNode.neighbors[i].gridPosition.column}`
            ] = true;
          }
        }
      }
      // We change the nodes array that we pass as a parameter which is a reference
      nodes = this.simplifyPath(nodes);
      const waypoints = this.calculateWaypoints(nodes);
      const path: Path = {
        startNodePosition: start.position,
        target,
        waypoints,
      };
      await lock.acquire(locks.ENTITY_PATH + this.id, (done) => {
        this.path = path;
        done();
      });
      return resolve();
    });
  }

  simplifyPath(nodes: Array<Node>): Array<Node> {
    // If there is 2 or less points there's no simplification to be done.
    if (nodes.length <= 2 || !this.map) return nodes;
    // The strategy to simplify the path is the following:
    // We will always have 2 nodes, one is our start node and the other one is our target node
    // We will always start with the start position being the first grid position, which is where the entity starts (this.nodes[this.nodes.Count - 1])
    // And the target being the end position, where the entity wanna go (this.nodes[0])
    // We will do a raycast (a custom one, not the one built-in Unity) between those two nodes
    // If there is any obstacle between these two nodes then we will move
    // Our start node into the target node direction until we can find a raycast that succeeds
    // Once that happens we will start the cycle again, with the starget being the start node
    // And the target node now being the last node that we were able to find a raycast
    const simplifiedNodes: Node[] = [];
    // Remember that the path is in reverse (last point is first)
    let startIndex = nodes.length - 1;
    let targetIndex = 0;
    // We can start by adding the last point
    simplifiedNodes.push(nodes[targetIndex]);
    // If the start reaches the end it means that there isn't any more simplifications to be done.
    while (startIndex > 0) {
      // If the line intersects with an object we try the next one.
      const line: GridLine = {
        pointA: nodes[startIndex].gridPosition,
        pointB: nodes[targetIndex].gridPosition,
      };
      if (this.map.isLineCrossingAnObject(line)) {
        // If the next start will become the target it means that we have tried every possibility
        // If so we should add this node to the path (which the code out of the if does).
        if (startIndex - 1 != targetIndex) {
          startIndex--;
          continue;
        }
      }
      // Add this point to the path list
      simplifiedNodes.push(nodes[startIndex]);
      // Found a direct path to the start, we can stop optimizing
      if (startIndex == nodes.length - 1) break;
      targetIndex = startIndex;
      startIndex = nodes.length - 1;
    }
    return simplifiedNodes;
  }

  calculateWaypoints(nodes: Array<Node>) {
    const waypoints: Array<Position> = [];
    let previousDirection = { x: 0, y: 0 };
    for (let i = 1; i < nodes.length; i++) {
      const direction = {
        x: nodes[i - 1].gridPosition.row - nodes[i].gridPosition.row,
        y: nodes[i - 1].gridPosition.column - nodes[i].gridPosition.column,
      };
      if (
        direction.x !== previousDirection.x ||
        direction.y !== previousDirection.y
      ) {
        waypoints.push(nodes[i - 1].position);
      }
      previousDirection = direction;
    }
    return waypoints;
  }

  // The optional currentTimestamp parameter may be sent
  // to be used to check how much the player should move
  // If the parameter is not send Date.now() will be used
  async move(currentTimestamp?: number) {
    await lock.acquire(locks.ENTITY_PATH + this.id, async (done) => {
      await lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
        if (!this.path || this.path.waypoints.length === 0) {
          return done();
        }
        let distanceX =
          this.path.waypoints[this.path.waypoints.length - 1].x -
          this.position.x;
        let distanceZ =
          this.path.waypoints[this.path.waypoints.length - 1].z -
          this.position.z;
        let magnitude = Math.sqrt(
          distanceX * distanceX + distanceZ * distanceZ,
        );

        // TODO: We should also check if we passed the waypoint
        while (
          magnitude <= game.MIN_DISTANCE_FOR_NEXT_WAYPOINT &&
          this.path.waypoints.length > 1
        ) {
          this.path.waypoints.pop();
          distanceX =
            this.path.waypoints[this.path.waypoints.length - 1].x -
            this.position.x;
          distanceZ =
            this.path.waypoints[this.path.waypoints.length - 1].z -
            this.position.z;
          magnitude = Math.sqrt(distanceX * distanceX + distanceZ * distanceZ);
        }

        const now = new Date().getTime();
        // If we are attacking let's see if we are in range
        if (
          this.target &&
          this.path.waypoints.length === 1 &&
          magnitude <= this.attackRange
        ) {
          this.path = undefined;
        } else {
          if (
            magnitude <= game.MIN_DISTANCE_FOR_NEXT_WAYPOINT &&
            this.path.waypoints.length === 1
          ) {
            this.position = {
              ...this.position,
              x: this.path.waypoints[0].x,
              z: this.path.waypoints[0].z,
            };
            this.path.waypoints.pop();
          } else {
            const directionX = distanceX / magnitude;
            const directionZ = distanceZ / magnitude;
            const timeSinceLastUpdate =
              ((currentTimestamp || now) - this.lastMovement) / 1000;
            const distanceToMoveInX =
              directionX * this.speed * timeSinceLastUpdate;
            const distanceToMoveInZ =
              directionZ * this.speed * timeSinceLastUpdate;
            this.position = {
              ...this.position,
              x: this.position.x + distanceToMoveInX,
              z: this.position.z + distanceToMoveInZ,
            };
          }
        }
        this.setLastMovement(now);
        done();
      });
      done();
    });
  }

  async setupMovement(position: Position, timestamp?: number) {
    this.target = undefined;
    await this.calculatePath(position);
    // This last movement is assigned here so in the next server tick
    // After the path is calculated we will move taking into account the time
    // Between this timestamp and the future tick timestamp
    this.setLastMovement(timestamp);
  }

  async attack() {
    if (!this.target) {
      return;
    }
    if (!isInRange(this.position, this.target.position, this.visionRange)) {
      this.target = undefined;
      return;
    }
    if (!isInRange(this.position, this.target.position, this.attackRange)) {
      if (
        !this.path ||
        this.path.waypoints.length < 0 ||
        (this.path.target.x !== this.target.position.x &&
          this.path.target.z !== this.target.position.z)
      ) {
        const now = new Date().getTime();
        if (now > this.lastPathAttackUpdate) {
          this.calculatePath(this.target.position);
          this.setLastPathUpdate();
          this.setLastMovement(now);
        }
        return;
      }
    }
  }

  async setupAttack(target: LivingEntity, timestamp?: number) {
    if (!isInRange(this.position, target.position, this.visionRange)) {
      return;
    }
    if (!isInRange(this.position, target.position, this.attackRange)) {
      await this.calculatePath(target.position);
      this.setLastMovement(timestamp);
    }
    this.target = target;
  }
}
