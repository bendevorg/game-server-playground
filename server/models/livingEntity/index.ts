import { Map, Player, Enemy } from '../';
import {
  Path,
  Position,
  Node,
  LivingEntityConstructor,
  GridLine,
  GridPosition,
  SnapshotLivingEntity,
  Skill,
} from '~/interfaces';
import {
  map as constants,
  game,
  locks,
  network,
  livingEntity as entityConstants,
} from '~/constants';
import lock from '~/utils/lock';
import isInRange from '~/utils/isInRange';
import randomIntFromInterval from '~/utils/randomIntFromInterval';
import NetworkMessage from '~/utils/networkMessage';
import LivingEntityBufferWriter from '~/utils/livingEntityBufferWriter';
import PhysicalEntity from '~/models/entity/physicalEntity';

export enum State {
  STAND_BY = 0,
  MOVING = 1,
  PREPARING_ATTACK = 2,
  WAITING_FOR_NEXT_ATTACK = 3,
  DEAD = 4,
}

export default class LivingEntity extends PhysicalEntity {
  previousState: State = State.STAND_BY;
  state: State = State.STAND_BY;
  id: number;
  type: number;
  path?: Path;
  halfColliderExtent: number;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  speed: number;
  attackMinDamage: number;
  attackMaxDamage: number;
  attackRange: number;
  attackSpeed: number;
  availableSkills: { [key: number]: Skill };
  experienceReward: number;
  attackTarget?: LivingEntity;
  lastUpdate: number;
  lastMovement: number;
  lastAttack: number;
  timeForAttackToHit: number;
  timeForNextAttack: number;
  timeForNextGlobalSkillCooldown: number;
  mapId: string;
  map?: Map;
  events: Array<Buffer>;

  constructor({
    id,
    type,
    level,
    experience,
    health,
    maxHealth,
    speed,
    attackRange,
    attackSpeed,
    availableSkills = {},
    experienceReward,
    mapId,
    ...args
  }: LivingEntityConstructor) {
    super(args);
    this.id = id;
    this.type = type;
    // TODO: This will be individual per entity at some point
    this.halfColliderExtent = 0.5;
    this.level = level;
    this.experience = experience;
    this.health = health;
    this.maxHealth = maxHealth;
    this.speed = speed;
    this.attackMinDamage = 0;
    this.attackMaxDamage = 0;
    this.attackRange = attackRange;
    this.attackSpeed = attackSpeed;
    this.availableSkills = availableSkills;
    this.experienceReward = experienceReward;
    this.mapId = mapId;
    this.attackTarget = undefined;
    const now = new Date().getTime();
    this.lastUpdate = now;
    this.lastMovement = now;
    // This time holds the time when the user finished the attack, right after dealing damage
    // It does not start when the user started the attack or after the cooldown ended
    this.lastAttack = now;
    this.timeForAttackToHit = now;
    this.timeForNextAttack = now;
    this.timeForNextGlobalSkillCooldown = now;
    this.events = [];
    this.updateValues();
  }

  updateValues() {
    // Use formula based of entity attributes
    this.attackMinDamage = 1;
    this.attackMaxDamage = 3;
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

  setLastAttack(timestamp?: number) {
    this.lastAttack = timestamp || new Date().getTime();
  }

  setTimeForAttackToHit(timestamp?: number) {
    // TODO: Change 0.25 to be a constant from somewhere
    this.timeForAttackToHit =
      (timestamp || new Date().getTime()) + (0.25 / this.attackSpeed) * 1000;
  }

  setTimeForNextAttack(timestamp?: number) {
    // TODO: Change 1 to be a constant from somewhere
    this.timeForNextAttack =
      (timestamp || new Date().getTime()) + (1 / this.attackSpeed) * 1000;
  }

  setTimeForNextGlobalSkillCooldown(timestamp?: number) {
    // TODO: Change 1 to be a constant from somewhere
    this.timeForNextGlobalSkillCooldown =
      (timestamp || new Date().getTime()) +
      entityConstants.SKILL_GLOBAL_COOLDOWN * 1000;
  }

  setAvailableSkills(availableSkills: { [key: number]: Skill }) {
    this.availableSkills = availableSkills;
  }

  async addHealth(health: number) {
    await lock.acquire(locks.ENTITY_HEALTH + this.id, (done) => {
      // We can't add health to a dead entity
      if (this.health <= 0) {
        done();
        return;
      }
      this.health += health;
      this.health = Math.min(Math.max(0, this.health), this.maxHealth);
      done();
    });
  }

  async addExperience(experience: number) {
    await lock.acquire(locks.ENTITY_EXPERIENCE + this.id, (done) => {
      this.experience += experience;
      done();
    });
  }

  async setAttackTarget(attackTarget?: LivingEntity) {
    await lock.acquire(locks.ENTITY_ATTACK_TARGET + this.id, (done) => {
      this.attackTarget = attackTarget;
      done();
    });
  }

  async update() {
    this.updateState();
    await this.attack();
    await this.move();
    await super.recalculateBounds(this.id);
  }

  retrieveSnapshotData() {
    return new Promise<SnapshotLivingEntity>(async (resolve) => {
      lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
        lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
          resolve({
            id: this.id,
            type: this.type,
            position: this.position,
            level: this.level,
            experience: this.experience,
            health: this.health,
            maxHealth: this.maxHealth,
            speed: this.speed,
            attackRange: this.attackRange,
            attackSpeed: this.attackSpeed,
            events: this.events,
          });
          done();
        });
        this.clearEvents();
        done();
      });
    });
  }

  async updateState() {
    await lock.acquire(locks.ENTITY_STATE + this.id, async (done) => {
      if (this.health <= 0) {
        // Dead state is set elsewhere
        done();
        return;
      }
      await lock.acquire(locks.ENTITY_ATTACK_TARGET + this.id, (done) => {
        this.previousState = this.state;
        const now = new Date().getTime();
        // Attacking
        if (this.awaitingForAttackCooldown(now)) {
          // We are in the attack animation
          if (this.inBeforeHitAnimation(now)) {
            this.state = State.PREPARING_ATTACK;
            done();
            return;
          }
          this.state = State.WAITING_FOR_NEXT_ATTACK;
          done();
          return;
        }
        if (this.path && this.path.waypoints.length > 0) {
          this.state = State.MOVING;
          done();
          return;
        }
        this.state = State.STAND_BY;
        done();
      });
      done();
    });
  }

  isLineOfSightClear(line: GridLine) {
    if (!this.map) return false;
    return !this.map.isLineCrossingAnObject(line);
  }

  // If there is no objects between the two points
  // then a straight path is available
  isStraightPathAvailable(start: Node, end: Node) {
    if (!this.map) return false;
    const line: GridLine = {
      pointA: start.gridPosition,
      pointB: end.gridPosition,
    };
    return this.isLineOfSightClear(line);
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

  calculatePath(targetPosition: Position, range: number = 0) {
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
      const targetGridPosition =
        this.map.worldPositionToGridPosition(targetPosition);
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
              x: targetPosition.x,
              y: currentNode.position.y,
              z: targetPosition.z,
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
      nodes = this.adjustPathForRange(nodes, range);
      nodes = this.simplifyPath(nodes);
      const waypoints = this.calculateWaypoints(nodes);
      const path: Path = {
        startNodePosition: start.position,
        target: targetPosition,
        waypoints,
      };
      await lock.acquire(locks.ENTITY_PATH + this.id, (done) => {
        this.path = path;
        done();
      });
      this.addPathEvent([...waypoints]);
      return resolve();
    });
  }

  // If we receive a range we should try to find the first path that lands
  // Within the range with line of sight to the goal
  adjustPathForRange(nodes: Array<Node>, range: number): Array<Node> {
    if (range <= 0 || !this.map) return nodes;
    // For straight paths we just need to change the end to be the first point in the range
    if (nodes.length === 2) {
      const distanceX = nodes[0].position.x - nodes[1].position.x;
      const distanceZ = nodes[0].position.z - nodes[1].position.z;
      const magnitude = Math.sqrt(
        distanceX * distanceX + distanceZ * distanceZ,
      );
      const directionX = distanceX / magnitude;
      const directionZ = distanceZ / magnitude;
      const newTargetPosition = {
        x: nodes[0].position.x - directionX * range,
        y: nodes[0].position.y,
        z: nodes[0].position.z - directionZ * range,
      };
      const newTargetNode = this.map.worldPositionToNode(newTargetPosition);
      // This should never happen
      if (newTargetNode.type !== constants.GROUND_TILE) {
        return nodes;
      }
      nodes[0] = newTargetNode;
      return nodes;
    }
    const target = nodes[0];
    // Let's remove all nodes until we are within range and with line of sight
    let newTargetIndex = 0;
    while (newTargetIndex < nodes.length - 2) {
      const index = newTargetIndex + 1;
      // If next node is not within range we stop searching
      if (
        Math.abs(target.position.x - nodes[index].position.x) > range ||
        Math.abs(target.position.z - nodes[index].position.z) > range
      ) {
        break;
      }
      // If next node does not have line of sight we stop search
      const line: GridLine = {
        pointA: target.gridPosition,
        pointB: nodes[index].gridPosition,
      };
      if (this.map.isLineCrossingAnObject(line)) {
        break;
      }
      // If not we can remove the previous node
      newTargetIndex = index;
    }
    if (newTargetIndex === 0) return nodes;
    const reducedNodesForRange: Node[] = [];
    for (let i = newTargetIndex; i < nodes.length; i++) {
      reducedNodesForRange.push(nodes[i]);
    }
    return reducedNodesForRange;
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
      await lock.acquire(locks.ENTITY_POSITION + this.id, async (done) => {
        if (
          !this.path ||
          this.path.waypoints.length === 0 ||
          this.state === State.PREPARING_ATTACK
        ) {
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
        this.setLastMovement(now);
        done();
      });
      done();
    });
  }

  async setupMovement(position: Position, timestamp?: number) {
    await this.setAttackTarget(undefined);
    await this.calculatePath(position);
    // This last movement is assigned here so in the next server tick
    // After the path is calculated we will move taking into account the time
    // Between this timestamp and the future tick timestamp
    this.setLastMovement(timestamp);
  }

  async addPathEvent(waypoints: Array<Position>) {
    const event = new LivingEntityBufferWriter(
      this,
      // Amount of waypoints
      new NetworkMessage(
        Buffer.alloc(
          network.INT8_SIZE +
            network.INT8_SIZE +
            waypoints.length * network.WAYPOINT_SIZE,
        ),
      ),
    );
    event.writePathEvent(waypoints);
    await lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
      this.events.push(event.message.buffer);
      done();
    });
  }

  awaitingForAttackCooldown(timestamp?: number) {
    const now = timestamp || new Date().getTime();
    return this.timeForNextAttack > now;
  }

  attackedButWaitingForAttackCooldown() {
    return this.timeForAttackToHit <= this.lastAttack;
  }

  inBeforeHitAnimation(timestamp?: number) {
    const now = timestamp || new Date().getTime();
    return this.timeForAttackToHit > now;
  }

  awaitingForGlobalSkillCooldown(timestamp?: number) {
    const now = timestamp || new Date().getTime();
    return this.timeForNextGlobalSkillCooldown > now;
  }

  hasSkill(skillId: number) {
    return Boolean(this.availableSkills[skillId]);
  }

  canCastSkill(skillId: number, timestamp?: number) {
    // TODO: Check if the entity is in a state where it can cast
    // TODO: Check if the global cooldown for skills
    const now = timestamp || new Date().getTime();
    return (
      this.hasSkill(skillId) &&
      !this.inBeforeHitAnimation(now) &&
      !this.awaitingForGlobalSkillCooldown(now) &&
      this.availableSkills[skillId].isReadyToCast(timestamp)
    );
  }

  async attack() {
    await lock.acquire(locks.ENTITY_ATTACK_TARGET + this.id, async (done) => {
      if (!this.attackTarget) {
        done();
        return;
      }
      if (this.attackTarget.state === State.DEAD) {
        this.attackTarget = undefined;
        done();
        return;
      }
      if (
        !Enemy.getActive(this.attackTarget.id) &&
        !Player.getActive(this.attackTarget.id)
      ) {
        this.attackTarget = undefined;
        done();
        return;
      }
      const now = new Date().getTime();
      // If we are not in the middle of an attack there is nothing to do
      if (!this.awaitingForAttackCooldown(now)) {
        done();
        return;
      }
      // If we have attacked but we are waiting for the hitting time
      if (this.inBeforeHitAnimation(now)) {
        done();
        return;
      }
      // If we are withing the hitting time but we have attacked already
      if (this.attackedButWaitingForAttackCooldown()) {
        done();
        return;
      }
      // If we reach this point it means that we are ready to hit the target
      // And wait for the rest of the animation
      // From now on the character can move
      const damage = await this.calculateDamage();
      this.setLastAttack();
      await this.attackTarget.takeHit(damage, this);
      done();
      return;
    });
  }

  async setupAttack(attackTarget: LivingEntity, timestamp?: number) {
    // If we are attacking we can't have a path
    await lock.acquire(locks.ENTITY_PATH + this.id, (done) => {
      this.path = undefined;
      done();
    });
    await lock.acquire(locks.ENTITY_ATTACK_TARGET + this.id, async (done) => {
      if (!attackTarget) {
        done();
        return;
      }
      if (attackTarget.state === State.DEAD) {
        done();
        return;
      }
      if (
        !Enemy.getActive(attackTarget.id) &&
        !Player.getActive(attackTarget.id)
      ) {
        done();
        return;
      }
      // Check if we are not in the middle of an attack already
      // Note I've added this after a few months of not touching the code
      // So if something breaks this might be the culprit
      if (this.awaitingForAttackCooldown(timestamp)) {
        done();
        return;
      }
      // Starting a new attack
      // We are ready to start attacking, let's check if we can
      // We check the vision range
      if (
        !isInRange(this.position, attackTarget.position, game.VISION_DISTANCE)
      ) {
        done();
        return;
      }
      // Then we check the attack range
      if (
        !isInRange(
          this.position,
          attackTarget.position,
          this.attackRange +
            this.halfColliderExtent +
            attackTarget.halfColliderExtent,
        )
      ) {
        console.log('Not in range');
        done();
        return;
      }
      // Then we check the line of sight
      if (!this.isLineOfSightToTargetClear(attackTarget)) {
        console.log('Line of sight not clear');
        done();
        return;
      }
      console.log('Attack');
      this.attackTarget = attackTarget;
      this.setTimeForNextAttack(timestamp);
      this.setTimeForAttackToHit(timestamp);
      const event = new LivingEntityBufferWriter(
        this,
        new NetworkMessage(Buffer.alloc(network.BUFFER_ATTACK_EVENT_SIZE)),
      );
      event.writeAttackEvent(this.attackTarget);
      // We don't need to wait to write the event
      lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
        this.events.push(event.message.buffer);
        done();
      });
      done();
    });
  }

  async setupSkillCast(
    skillId: number,
    skillPosition: Position,
    skillTarget?: LivingEntity,
    timestamp?: number,
  ) {
    if (!this.canCastSkill(skillId, timestamp)) {
      return;
    }
    // If we are casting we can't have a path
    await lock.acquire(locks.ENTITY_PATH + this.id, (done) => {
      this.path = undefined;
      done();
    });
    const skill = this.availableSkills[skillId];
    skill.cast(skillPosition, skillTarget, timestamp);
    // const event = new LivingEntityBufferWriter(
    //   this,
    //   new NetworkMessage(Buffer.alloc(network.BUFFER_SKILL_EVENT_SIZE)),
    // );
    // event.writeSkillEvent(this.attackTarget);
    // // We don't need to wait to write the event
    // lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
    //   this.events.push(event.message.buffer);
    //   done();
    // });
  }

  isLineOfSightToTargetClear(target: LivingEntity) {
    if (!this.map || !target) return false;
    const pointA = this.map.worldPositionToGridPosition(this.position);
    const pointB = this.map.worldPositionToGridPosition(target.position);
    const line: GridLine = {
      pointA,
      pointB,
    };
    return this.isLineOfSightClear(line);
  }

  async calculateDamage() {
    return randomIntFromInterval(this.attackMinDamage, this.attackMaxDamage);
  }

  async takeHit(damage: number, attacker: LivingEntity) {
    if (this.health <= 0) return;
    await this.addHealth(-damage);
    if (this.health <= 0) {
      this.die(attacker);
    }
    const event = new LivingEntityBufferWriter(
      this,
      new NetworkMessage(Buffer.alloc(network.BUFFER_HIT_EVENT_SIZE)),
    );
    event.writeHitEvent(damage);
    // We don't need to wait to write the event
    lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
      this.events.push(event.message.buffer);
      done();
    });
  }

  async die(attacker: LivingEntity) {
    if (this.state === State.DEAD) return;
    attacker.addExperience(this.experienceReward);
    lock.acquire(locks.ENTITY_STATE + this.id, (done) => {
      this.state = State.DEAD;
      done();
    });
    const event = new LivingEntityBufferWriter(
      this,
      new NetworkMessage(Buffer.alloc(network.BUFFER_DEATH_EVENT_SIZE)),
    );
    event.writeDeathEvent();
    lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
      this.events.push(event.message.buffer);
      done();
    });
  }

  async clearEvents() {
    await lock.acquire(locks.ENTITY_EVENTS + this.id, (done) => {
      this.events = [];
      done();
    });
  }
}
