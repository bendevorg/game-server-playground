import { LivingEntity, Player } from '../';
import { State } from '../livingEntity';
import lock from '~/utils/lock';
import randomIntFromInterval from '~/utils/randomIntFromInterval';
import { game, locks, behaviours } from '~/constants';
import { Position, EnemyConstructor } from '~/interfaces';
import isInRange from '~/utils/isInRange';
import { enemies } from '~/cache';
import { enemyCounterByType } from '~/cache/enemies';

export default class Enemy extends LivingEntity {
  behaviour: number;
  triggerAgressiveRange: number;
  inCombat: boolean;

  timeToDespawn: number = 0;
  lastPathAttackUpdate = 0;
  calculatingNextPath = false;
  nextTimeToMove = 0;
  // TODO: This should be a per enemy configuration
  minTimeBetweenRandomMovements = 2000;
  maxTimeBetweenRandomMovements = 4000;

  lastTargetCalculatedPosition: Position = {
    x: -9999,
    y: -9999,
    z: -9999,
  };
  minimumDistanceForRepath = 0.5;

  // Attack variables
  entityToAttack?: LivingEntity;

  // TODO: Id will be a string eventually
  static getActive(id: number | string): Enemy | null {
    const enemy: Enemy | undefined = enemies.get<Enemy>(id);
    return enemy || null;
  }

  static getAllActiveIds(): Array<string> {
    return enemies.keys();
  }

  static getAllActive(): Array<Enemy> {
    const ids = Enemy.getAllActiveIds();
    const activeEnemies: Array<Enemy> = [];
    ids.forEach((id) => {
      const activeEnemy = Enemy.getActive(id);
      if (!activeEnemy) return;
      activeEnemies.push(activeEnemy);
    });
    return activeEnemies;
  }

  static getAmountOfActivesByType(type: number): number {
    return enemyCounterByType[type] || 0;
  }

  constructor({ behaviour, triggerAgressiveRange, ...args }: EnemyConstructor) {
    super(args);
    this.behaviour = behaviour;
    this.triggerAgressiveRange = triggerAgressiveRange;
    this.inCombat = false;
    if (!enemyCounterByType[args.type]) {
      enemyCounterByType[args.type] = 0;
    }
    enemyCounterByType[args.type]++;
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

  setTimeToDespawn() {
    this.timeToDespawn = new Date().getTime() + game.TIME_TO_DESPAWN;
  }

  async setEntityToAttack(entityToAttack?: LivingEntity) {
    await lock.acquire(locks.ENEMY_ENTITY_TO_ATTACK + this.id, (done) => {
      this.entityToAttack = entityToAttack;
      this.inCombat = Boolean(entityToAttack);
      done();
    });
  }

  async update() {
    if (this.state === State.DEAD) {
      if (this.timeToDespawn < new Date().getTime()) {
        this.despawn();
      }
      return;
    }
    await this.ai();
    await super.update();
  }

  async ai() {
    const now = new Date().getTime();
    if (this.inBeforeHitAnimation(now)) return;
    await this.decideOnEntityToAttack();
    if (this.entityToAttack) {
      await this.decideAttackBehaviour();
      return;
    }
    if (this.state === State.MOVING) {
      return;
    }
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
    this.moveToRandom();
  }

  async decideOnEntityToAttack() {
    // TODO: Add reactive support
    if (this.behaviour !== behaviours.AGGRESSIVE) return;
    // If we have a target and it is active + within vision range we continue to try to attack it
    // TODO: We should have a behaviour to change targets based on things like.
    // Another target is closer/doing more damage/doing more healing
    if (this.entityToAttack) {
      if (
        Player.getActive(this.entityToAttack.id) &&
        isInRange(
          this.position,
          this.entityToAttack.position,
          game.VISION_DISTANCE,
        ) &&
        this.entityToAttack.health > 0
      ) {
        return;
      }
      await this.setAttackTarget(undefined);
    }
    const players = Player.getAllActiveIds();
    if (players.length > 0) {
      const player = Player.getActive(players[0]);
      // TODO: Targeting a new player should be smarter than this
      if (
        player &&
        player.health > 0 &&
        isInRange(
          this.position,
          player.position,
          this.inCombat ? game.VISION_DISTANCE : this.triggerAgressiveRange,
        ) &&
        (this.inCombat || super.isLineOfSightToTargetClear(player))
      ) {
        await this.setEntityToAttack(player);
        return;
      }
    }
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

  async decideAttackBehaviour() {
    await lock.acquire(locks.ENEMY_ENTITY_TO_ATTACK + this.id, async (done) => {
      if (!this.entityToAttack) {
        done();
        return;
      }
      const now = new Date().getTime();
      // In the middle of the attack, nothing to do
      if (this.inBeforeHitAnimation(now)) {
        done();
        return;
      }
      if (
        isInRange(
          this.position,
          this.entityToAttack.position,
          this.attackRange +
            this.halfColliderExtent +
            this.entityToAttack.halfColliderExtent,
        ) &&
        super.isLineOfSightToTargetClear(this.entityToAttack)
      ) {
        // If we are in place to attack but still waiting for the cooldown
        // We don't do anything
        if (this.awaitingForAttackCooldown(now)) {
          done();
          return;
        }
        // Setup attack
        this.setupAttack(this.entityToAttack);
        done();
        return;
      }
      // If target not in range we calculate the path
      if (
        !this.path ||
        this.path.waypoints.length < 0 ||
        (this.path.target.x !== this.entityToAttack.position.x &&
          this.path.target.z !== this.entityToAttack.position.z)
      ) {
        const now = new Date().getTime();
        if (
          now > this.lastPathAttackUpdate &&
          this.targetMovedSinceLastPathCalculation()
        ) {
          this.calculatePath(this.entityToAttack.position);
          this.setLastPathUpdate();
          this.setLastMovement(now);
          this.lastTargetCalculatedPosition = {
            ...this.entityToAttack.position,
          };
        }
        done();
        return;
      }
      done();
    });
  }

  targetMovedSinceLastPathCalculation() {
    if (!this.entityToAttack) return false;
    const distanceX = this.position.x - this.entityToAttack.position.x;
    const distanceZ = this.position.z - this.entityToAttack.position.z;
    const distance = distanceX * distanceX + distanceZ * distanceZ;
    return distance >= this.minimumDistanceForRepath;
  }

  async takeHit(damage: number, attacker: LivingEntity) {
    await super.takeHit(damage, attacker);
    if (this.behaviour === behaviours.PASSIVE) return;
    // TODO: Has logic to change targets
    if (this.entityToAttack) return;
    await this.setEntityToAttack(attacker);
  }

  async die(attacker: LivingEntity) {
    await super.die(attacker);
    this.setTimeToDespawn();
  }

  async despawn() {
    enemies.del(this.id);
  }
}
