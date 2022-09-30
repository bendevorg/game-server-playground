import { LivingEntity, Player } from '../';
import { State } from '../livingEntity';
import lock from '~/utils/lock';
import randomIntFromInterval from '~/utils/randomIntFromInterval';
import { game, locks } from '~/constants';
import { Position } from '~/interfaces';
import isInRange from '~/utils/isInRange';
import { enemies } from '~/cache';

export default class Enemy extends LivingEntity {
  lastPathAttackUpdate = 0;
  calculatingNextPath = false;
  nextTimeToMove = 0;
  // TODO: This should be a per enemy configuration
  minTimeBetweenRandomMovements = 1500;
  maxTimeBetweenRandomMovements = 3000;

  lastTargetCalculatedPosition: Position = {
    x: -9999,
    y: -9999,
    z: -9999,
  };
  minimumDistanceForRepath = 0.5;

  // TODO: Id will be a string eventually
  static getActive(id: number | string): Enemy | null {
    let enemy: Enemy | undefined = enemies.get<Enemy>(id);
    return enemy || null;
  }

  static getAllActiveIds(): Array<string> {
    return enemies.keys();
  }

  save() {
    if (this.state === State.DEAD) return;
    enemies.set(this.id, this);
  }

  setLastPathUpdate() {
    this.lastPathAttackUpdate =
      new Date().getTime() +
      game.TIME_BETWEEN_PATH_ATTACK_UPDATES +
      // Adding some randomization so we avoid calculating a lot of paths at the same time
      randomIntFromInterval(-150, 150);
  }

  async update() {
    await this.ai();
    await super.update();
  }

  async ai() {
    this.updateState();
    if (this.target) {
      return;
    }
    // TODO: Actual AI
    // const players = Player.getAllActiveIds();
    // if (!this.target && players.length > 0) {
    //   const player = Player.getActive(players[0]);
    //   if (player) {
    //     await this.setTarget(player);
    //     return;
    //   }
    // }
    if (this.state === State.MOVING) {
      return;
    }
    const now = new Date().getTime();
    if (this.state === State.STAND_BY) {
      if (this.previousState === State.MOVING) {
        this.nextTimeToMove =
          now +
          randomIntFromInterval(
            this.minTimeBetweenRandomMovements,
            this.maxTimeBetweenRandomMovements,
          );
        return;
      }
      if (now <= this.nextTimeToMove) {
        return;
      }
    }
    // We don't wait for this because this calculates a new path
    // And that takes a while, we handle things with locks and once that is done
    // We will start moving
    // this.moveToRandom();
  }

  async moveToRandom() {
    if (!this.map) {
      return;
    }
    this.calculatingNextPath = true;
    let startNode;
    await lock.acquire(locks.ENTITY_POSITION + this.id, (done) => {
      if (this.map) {
        startNode = this.map.worldPositionToNode(this.position);
      }
      done();
    });
    if (!startNode) {
      return;
    }
    const nodeToWalkTo = this.map.getRandomWalkableNode(
      startNode,
      game.MAX_AI_WALK_DISTANCE,
    );
    if (!nodeToWalkTo) {
      this.calculatingNextPath = false;
      return;
    }
    await this.setupMovement(nodeToWalkTo.position);
    this.calculatingNextPath = false;
  }

  async attack() {
    await super.attack();
    await lock.acquire(locks.ENTITY_TARGET + this.id, async (done) => {
      if (!this.target) {
        done();
        return;
      }
      if (
        isInRange(this.position, this.target.position, this.attackRange) &&
        super.isLineOfSightToTargetClear()
      ) {
        done();
        return;
      }
      if (
        !this.path ||
        this.path.waypoints.length < 0 ||
        (this.path.target.x !== this.target.position.x &&
          this.path.target.z !== this.target.position.z)
      ) {
        const now = new Date().getTime();
        if (
          now > this.lastPathAttackUpdate &&
          this.targetMovedSinceLastPathCalculation()
        ) {
          this.calculatePath(this.target.position);
          this.setLastPathUpdate();
          this.setLastMovement(now);
          this.lastTargetCalculatedPosition = { ...this.target.position };
        }
        done();
        return;
      }
      done();
    });
  }

  targetMovedSinceLastPathCalculation() {
    if (!this.target) return false;
    const distanceX = this.position.x - this.target.position.x;
    const distanceZ = this.position.z - this.target.position.z;
    const distance = distanceX * distanceX + distanceZ * distanceZ;
    return distance >= this.minimumDistanceForRepath;
  }

  async die(attacker: LivingEntity) {
    await super.die(attacker);
    enemies.del(this.id);
  }
}
