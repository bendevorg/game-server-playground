import uuid4 from 'uuid4';
import {
  Direction,
  ProjectileConstructor,
  Bounds,
  Dimension,
  Position,
} from '~/interfaces';
import LivingEntity from './livingEntity';
import { projectiles } from '~/cache';
import lock from '~/utils/lock';
import { locks } from '~/constants';

export default class Projectile {
  id: string;
  caster: LivingEntity;
  position: Position;
  speed: number;
  dimension: Dimension;
  direction: Direction;
  timeToSelfDestroy: number;
  bounds: Bounds;
  rotationInRadians: number;
  destroyed: boolean;
  lastUpdate: number;

  constructor({
    caster,
    position,
    speed,
    dimension,
    direction,
    timeToSelfDestroy,
  }: ProjectileConstructor) {
    this.id = uuid4();
    this.caster = caster;
    this.position = position;
    this.speed = speed;
    this.dimension = dimension;
    this.direction = direction;
    console.log('Starting projectile at position', this.position);
    console.log('Starting projectile with direction', this.direction);
    this.timeToSelfDestroy = timeToSelfDestroy;
    this.bounds = {
      topLeft: {
        x: 0,
        z: 0,
      },
      topRight: {
        x: 0,
        z: 0,
      },
      bottomLeft: {
        x: 0,
        z: 0,
      },
      bottomRight: {
        x: 0,
        z: 0,
      },
    };
    this.rotationInRadians = 0;
    this.lastUpdate = new Date().getTime();
    this.recalculateRotation();
    this.recalculateBounds();
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

  async recalculateRotation() {
    // For now locking the rotation before recalculating is useless because the rotation
    // is only calculate when instantiating the projectile. This will be useful when projectiles
    // can change it's direction (which we would need a function to recalculate) and rotation
    await lock.acquire(locks.PROJECTILE_ROTATION + this.id, async (done) => {
      // An angle between two points can be calculate with the formula
      // Math.atan2(y2 - y1, x2 - x1) This will return the angle in radians (we can do * ( 180 / Math.PI ) to transform into degrees)
      // Here (x2, y2) will be our target, the point that we want to look to. In our case we just want to look in the direction that we are going
      // So we can just use our direction. You could create an arbritary point in your direction like x2 = this.direction.x + this.position.x
      // But since (x1, y1) is our position we would eventually just remove this.position from that value again, so we can just use the direction
      // Directly
      let angle =
        Math.atan2(this.direction.z, this.direction.x) * (180 / Math.PI);
      // Angle is calculated on the x axis, so we reduce 90 for the Z axis
      // I am sure that there is a way to initially calculate the angle on the Z axis so we don't need to do this
      // But I don't know how
      angle -= 90;
      this.rotationInRadians = angle * (Math.PI / 180);
    });
  }

  async recalculateBounds() {
    await lock.acquire(locks.PROJECTILE_BOUNDS + this.id, async (done) => {
      // The projectile's position acts as the pivot that we use to apply the dimensions and rotate the projectile around
      const right = this.dimension.x / 2;
      const left = -right;
      const top = this.dimension.z / 2;
      const bottom = -top;
      // Rotating points: https://en.wikipedia.org/wiki/Rotation_matrix
      // Each point is calculate as pivot (position) + rotated point
      this.bounds = {
        topLeft: {
          x:
            this.position.x +
            (left * Math.cos(this.rotationInRadians) -
              top * Math.sin(this.rotationInRadians)),
          z:
            this.position.z +
            (left * Math.sin(this.rotationInRadians) +
              top * Math.cos(this.rotationInRadians)),
        },
        topRight: {
          x:
            this.position.x +
            (right * Math.cos(this.rotationInRadians) -
              top * Math.sin(this.rotationInRadians)),
          z:
            this.position.z +
            (right * Math.sin(this.rotationInRadians) +
              top * Math.cos(this.rotationInRadians)),
        },
        bottomLeft: {
          x:
            this.position.x +
            (left * Math.cos(this.rotationInRadians) -
              bottom * Math.sin(this.rotationInRadians)),
          z:
            this.position.z +
            (left * Math.sin(this.rotationInRadians) +
              bottom * Math.cos(this.rotationInRadians)),
        },
        bottomRight: {
          x:
            this.position.x +
            (right * Math.cos(this.rotationInRadians) -
              bottom * Math.sin(this.rotationInRadians)),
          z:
            this.position.z +
            (right * Math.sin(this.rotationInRadians) +
              bottom * Math.cos(this.rotationInRadians)),
        },
      };
      done();
    });
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

  async checkForCollisions(oldBounds: Bounds) {}

  async update() {
    if (this.destroyed) return;
    const oldBounds = { ...this.bounds };
    let now = new Date().getTime();
    if (now >= this.timeToSelfDestroy) {
      now = this.timeToSelfDestroy;
    }
    await this.move(now);
    await this.recalculateBounds();
    await this.checkForCollisions(oldBounds);
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
