import { LivingEntity, Player } from '../';
import { State } from '../livingEntity';
import lock from '~/utils/lock';
import { game, locks } from '~/constants';
import { enemies } from '~/cache';

export default class Enemy extends LivingEntity {
  calculatingNextPath = false;
  nextTimeToMove = 0;

  // TODO: Id will be a string eventually
  static get(id: number | string): Enemy | null {
    let enemy: Enemy | undefined = enemies.get<Enemy>(id);
    return enemy || null;
  }

  static getAllActiveIds(): Array<string> {
    return enemies.keys();
  }

  // TODO: Id will be a string eventually
  static set(id: number | string, enemy: Enemy) {
    enemies.set(id, enemy);
  }

  update() {
    this.ai();
    super.update();
  }

  ai() {
    this.updateState();
    if (this.target) {
      return;
    }
    // TODO: Actual AI
    const players = Player.getAllActiveIds();
    if (!this.target && players.length > 0) {
      const player = Player.get(players[0]);
      if (player) {
        this.setupAttack(player);
        return;
      }
    }
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
    await this.setupMovement(nodeToWalkTo.position);
    this.calculatingNextPath = false;
  }
}
