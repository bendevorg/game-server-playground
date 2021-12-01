import { LivingEntity } from '../';
import lock from '../../utils/lock';
import { game, locks } from '../../constants';

enum State {
  STAND_BY = 0,
  MOVING = 1,
}

export default class Enemy extends LivingEntity {
  previousState: State = State.STAND_BY;
  state: State = State.STAND_BY;
  calculatingNextPath = false;
  nextTimeToMove = 0;

  update() {
    this.ai();
    super.update();
  }

  ai() {
    this.updateState();
    if (this.state === State.MOVING) {
      return;
    }
    const now = new Date().getTime();
    if (this.state === State.STAND_BY) {
      if (this.previousState === State.MOVING) {
        this.nextTimeToMove = now + 3000;
        return;
      }
      if (now <= this.nextTimeToMove) {
        return;
      }
    }
    // We don't wait for this because this calculates a new path
    // And that takes a while, we handle things with locks and once that is done
    // We will start moving
    this.moveToRandom();
  }

  updateState() {
    this.previousState = this.state;
    if (this.path && this.path.waypoints.length > 0) {
      this.state = State.MOVING;
      return;
    }
    this.state = State.STAND_BY;
  }

  async moveToRandom() {
    if (!this.map) {
      return;
    }
    this.calculatingNextPath = true;
    this.health--;
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
    await this.calculatePath(nodeToWalkTo.position);
    this.setLastMovement();
    this.calculatingNextPath = false;
  }
}
