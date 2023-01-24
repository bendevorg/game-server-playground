import {
  PhysicalEntityConstructor,
  Position,
  Dimension,
  Bounds,
  Direction,
} from '~/interfaces';
import lock from '~/utils/lock';
import { locks, collisionMask as collisionMaskConstants } from '~/constants';
import { players, enemies } from '~/cache';
import LivingEntity from '../livingEntity';

// Used for all entities that can are affected by physics (like collisions)
export default class PhysicalEntity {
  position: Position;
  dimension: Dimension;
  bounds: Bounds;
  // Will be used for continuously one day
  oldBounds: Bounds;
  // Rotation always in radians
  rotation: number;

  constructor({ position, dimension }: PhysicalEntityConstructor) {
    this.position = position;
    this.dimension = dimension;
    this.bounds = {
      topLeft: {
        x: 0,
        z: 0,
      },
      // topRight: {
      //   x: 0,
      //   z: 0,
      // },
      // bottomLeft: {
      //   x: 0,
      //   z: 0,
      // },
      bottomRight: {
        x: 0,
        z: 0,
      },
      topmost: 0,
      bottommost: 0,
      leftmost: 0,
      rightmost: 0,
    };
    this.oldBounds = { ...this.bounds };
    this.rotation = 0;
  }

  //
  async move(currentTimestamp?: number) {}

  // Making the id a parameter for now, but once the id is also a string for living entities
  // We can make all physical entities have the id at this class level
  async recalculateRotation(id: number | string, direction: Direction) {
    // For now locking the rotation before recalculating is useless because the rotation
    // is only calculate when instantiating the projectile. This will be useful when projectiles
    // can change it's direction (which we would need a function to recalculate) and rotation
    await lock.acquire(locks.PROJECTILE_ROTATION + id, async (done) => {
      // An angle between two points can be calculate with the formula
      // Math.atan2(y2 - y1, x2 - x1) This will return the angle in radians (we can do * ( 180 / Math.PI ) to transform into degrees)
      // Here (x2, y2) will be our target, the point that we want to look to. In our case we just want to look in the direction that we are going
      // So we can just use our direction. You could create an arbritary point in your direction like x2 = this.direction.x + this.position.x
      // But since (x1, y1) is our position we would eventually just remove this.position from that value again, so we can just use the direction
      // Directly
      let angle = Math.atan2(direction.z, direction.x) * (180 / Math.PI);
      // Angle is calculated on the x axis, so we reduce 90 for the Z axis
      // I am sure that there is a way to initially calculate the angle on the Z axis so we don't need to do this
      // But I don't know how
      angle -= 90;
      this.rotation = angle * (Math.PI / 180);
      done();
    });
  }

  // Making the id a parameter for now, but once the id is also a string for living entities
  // We can make all physical entities have the id at this class level
  async recalculateBounds(id: number | string) {
    await lock.acquire(locks.PROJECTILE_BOUNDS + id, async (done) => {
      // The projectile's position acts as the pivot that we use to apply the dimensions and rotate the projectile around
      const right = this.dimension.x / 2;
      const left = -right;
      const top = this.dimension.z / 2;
      const bottom = -top;
      this.oldBounds = { ...this.bounds };
      // Rotating points: https://en.wikipedia.org/wiki/Rotation_matrix
      // Each point is calculate as pivot (position) + rotated point
      const topLeft = {
        x:
          this.position.x +
          (left * Math.cos(this.rotation) - top * Math.sin(this.rotation)),
        z:
          this.position.z +
          (left * Math.sin(this.rotation) + top * Math.cos(this.rotation)),
      };
      const bottomRight = {
        x:
          this.position.x +
          (right * Math.cos(this.rotation) - bottom * Math.sin(this.rotation)),
        z:
          this.position.z +
          (right * Math.sin(this.rotation) + bottom * Math.cos(this.rotation)),
      };
      const topmost = topLeft.z > bottomRight.z ? topLeft.z : bottomRight.z;
      const bottommost = topLeft.z < bottomRight.z ? topLeft.z : bottomRight.z;
      const rightmost = topLeft.x > bottomRight.x ? topLeft.x : bottomRight.x;
      const leftmost = topLeft.x < bottomRight.x ? topLeft.x : bottomRight.x;
      this.bounds = {
        topLeft,
        // topRight: {
        //   x:
        //     this.position.x +
        //     (right * Math.cos(this.rotation) - top * Math.sin(this.rotation)),
        //   z:
        //     this.position.z +
        //     (right * Math.sin(this.rotation) + top * Math.cos(this.rotation)),
        // },
        // bottomLeft: {
        //   x:
        //     this.position.x +
        //     (left * Math.cos(this.rotation) - bottom * Math.sin(this.rotation)),
        //   z:
        //     this.position.z +
        //     (left * Math.sin(this.rotation) + bottom * Math.cos(this.rotation)),
        // },
        bottomRight,
        topmost,
        bottommost,
        leftmost,
        rightmost,
      };
      done();
    });
  }

  distanceAgainstOtherPosition(position: Position) {
    const distanceX = this.position.x - position.x;
    const distanceZ = this.position.z - position.z;
    return distanceX * distanceX + distanceZ * distanceZ;
  }

  // TODO: Check obstacles
  async checkForFirstCollision(
    collisionMask: number,
  ): Promise<[boolean, LivingEntity | undefined]> {
    return new Promise<[boolean, LivingEntity | undefined]>(
      (resolve, reject) => {
        let collided = false;
        // TODO: We need to use the distance between the rectangles and not the center point
        // I don't know how to do this yet so I am using the center point
        let closestDistance = Infinity;
        let collidedWith: LivingEntity | undefined = undefined;
        // Can't use the Player/Enemy classes here for the `getAllActive` function
        // Because that creates a circular dependency
        if (collisionMask & collisionMaskConstants.ENEMIES) {
          console.log('Check collision against enemies');
          const ids = enemies.keys();
          ids.forEach((id) => {
            const activeEntity = enemies.get<LivingEntity>(id);
            if (!activeEntity) return;
            if (!this.collidesWithBounds(activeEntity.bounds)) return;
            collided = true;
            const distance = this.distanceAgainstOtherPosition(
              activeEntity.position,
            );
            if (distance >= closestDistance) return;
            collidedWith = activeEntity;
            closestDistance = distance;
          });
        }
        // TODO: Remove duplicated code
        if (collisionMask & collisionMaskConstants.PLAYERS) {
          const ids = players.keys();
          ids.forEach((id) => {
            const activeEntity = players.get<LivingEntity>(id);
            if (!activeEntity) return;
            if (!this.collidesWithBounds(activeEntity.bounds)) return;
            collided = true;
            const distance = this.distanceAgainstOtherPosition(
              activeEntity.position,
            );
            if (distance >= closestDistance) return;
            collidedWith = activeEntity;
            closestDistance = distance;
          });
        }
        if (collisionMask & collisionMaskConstants.OBSTACLES) {
        }
        return resolve([collided, collidedWith]);
      },
    );
  }

  collidesWithBounds(otherBounds: Bounds) {
    // If one rectangle is on right side of other
    if (
      this.bounds.leftmost > otherBounds.rightmost ||
      otherBounds.leftmost > this.bounds.rightmost
    ) {
      return false;
    }

    // If one rectangle is above other
    if (
      this.bounds.bottommost > otherBounds.topmost ||
      otherBounds.bottommost > this.bounds.topmost
    ) {
      return false;
    }
    return true;
  }
}
