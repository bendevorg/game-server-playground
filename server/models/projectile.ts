import uuid4 from 'uuid4';
import { Direction, ProjectileConstructor } from '~/interfaces';
import LivingEntity from './livingEntity';
import PhysicalEntity from './entity/physicalEntity';
import { projectiles } from '~/cache';
import lock from '~/utils/lock';
import { locks } from '~/constants';

export default class Projectile extends PhysicalEntity {
  id: string;
  caster: LivingEntity;
  speed: number;
  direction: Direction;
  timeToSelfDestroy: number;
  destroyed: boolean;
  lastUpdate: number;

  constructor({
    caster,
    speed,
    direction,
    timeToSelfDestroy,
    ...args
  }: ProjectileConstructor) {
    super(args);
    this.id = uuid4();
    this.caster = caster;
    this.speed = speed;
    this.direction = direction;
    console.log('Starting projectile at position', this.position);
    console.log('Starting projectile with direction', this.direction);
    this.timeToSelfDestroy = timeToSelfDestroy;
    this.lastUpdate = new Date().getTime();
    super.recalculateRotation(this.id, this.direction);
    super.recalculateBounds(this.id);
    this.destroyed = false;
  }

  static getAllActiveIds(): Array<string> {
    return projectiles.keys();
  }

  static getActive(id: string): Projectile | null {
    const projectile: Projectile | undefined = projectiles.get<Projectile>(id);
    return projectile || null;
  }

  setLastUpdate(timestamp?: number) {
    this.lastUpdate = timestamp || new Date().getTime();
  }

  async move(currentTimestamp?: number) {
    const now = currentTimestamp || new Date().getTime();
    const timeSinceLastUpdate = (now - this.lastUpdate) / 1000;
    const distanceToMoveInX =
      this.direction.x * this.speed * timeSinceLastUpdate;
    const distanceToMoveInZ =
      this.direction.z * this.speed * timeSinceLastUpdate;
    await lock.acquire(locks.PROJECTILE_POSITION + this.id, async (done) => {
      this.position = {
        ...this.position,
        x: this.position.x + distanceToMoveInX,
        z: this.position.z + distanceToMoveInZ,
      };
      done();
    });
  }

  async update() {
    if (this.destroyed) return;
    let now = new Date().getTime();
    if (now >= this.timeToSelfDestroy) {
      now = this.timeToSelfDestroy;
    }
    await this.move(now);
    await super.recalculateBounds(this.id);
    await super.checkForCollisions();
    if (now >= this.timeToSelfDestroy) {
      this.destroy();
    }
    this.setLastUpdate(now);
  }

  async save() {
    if (this.destroyed) return;
    projectiles.set(this.id, this);
  }

  async destroy() {
    console.log('Projectile life span ended');
    this.destroyed = true;
    projectiles.del(this.id);
  }
}