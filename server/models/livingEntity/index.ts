import { Map } from '../';
import {
  Path,
  Position,
  Node,
  PublicLivingEntity,
  LivingEntityConstructor,
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

  retrievePublicData() {
    return new Promise<PublicLivingEntity>((resolve) => {
      lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
        resolve({
          id: this.id,
          position: this.position,
          health: this.health,
          maxHealth: this.maxHealth,
          speed: this.speed,
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
      const start = grid[startGridPosition.row][startGridPosition.column];
      const end = grid[targetGridPosition.row][targetGridPosition.column];
      if (
        start.type !== constants.GROUND_TILE ||
        end.type !== constants.GROUND_TILE
      ) {
        return resolve();
      }
      const nodes: Array<Node> = [];
      const waypoints: Array<Position> = [];

      //  Calculating path
      //  This list holds the Nodes that are candidates to be expanded
      const candidatesList: Array<Node> = [];
      const candidatesListHash: { [key: string]: boolean } = {};
      //  Holds the Nodes that we expanded already so we don't need to expand them again
      const exploredListHash: { [key: string]: boolean } = {};
      //  Start with only the starting point
      candidatesList.push(start);
      candidatesListHash[`${start.gridPosition.x}-${start.gridPosition.y}`] =
        true;
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
          `${currentNode.gridPosition.x}-${currentNode.gridPosition.y}`
        ];
        exploredListHash[
          `${currentNode.gridPosition.x}-${currentNode.gridPosition.y}`
        ] = true;

        //  Let's look for each neighbour of this expanded node
        for (let i = 0; i < currentNode.neighbors.length; i++) {
          //  If this neighbour was explored already we skip it
          if (
            `${currentNode.neighbors[i].gridPosition.x}-${currentNode.neighbors[i].gridPosition.y}` in
            exploredListHash
          ) {
            continue;
          }
          //  If this neighbour is in the candidate list let's see if we can update the total cost for it
          //  If we can we also set the current node as it's parent so we can know the path later
          const isDiagonal =
            currentNode.gridPosition.x -
              currentNode.neighbors[i].gridPosition.x !==
              0 &&
            currentNode.gridPosition.y -
              currentNode.neighbors[i].gridPosition.y !==
              0;
          if (
            `${currentNode.neighbors[i].gridPosition.x}-${currentNode.neighbors[i].gridPosition.y}` in
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
              ? currentNode.diagonalCost + currentNode.neighbors[i].diagonalCost
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
            `${currentNode.neighbors[i].gridPosition.x}-${currentNode.neighbors[i].gridPosition.y}`
          ] = true;
        }
      }
      // Calculate Waypoints
      let previousDirection = { x: 0, y: 0 };
      for (let i = 1; i < nodes.length; i++) {
        const direction = {
          x: nodes[i - 1].gridPosition.x - nodes[i].gridPosition.x,
          y: nodes[i - 1].gridPosition.y - nodes[i].gridPosition.y,
        };
        if (
          direction.x !== previousDirection.x ||
          direction.y !== previousDirection.y
        ) {
          waypoints.push(nodes[i - 1].position);
        }
        previousDirection = direction;
      }
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
