import {
  PhysicalEntityConstructor,
  Position,
  Dimension,
  Bounds,
  Direction,
} from '~/interfaces';
import lock from '~/utils/lock';
import { locks } from '~/constants';

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
      this.bounds = {
        topLeft: {
          x:
            this.position.x +
            (left * Math.cos(this.rotation) - top * Math.sin(this.rotation)),
          z:
            this.position.z +
            (left * Math.sin(this.rotation) + top * Math.cos(this.rotation)),
        },
        topRight: {
          x:
            this.position.x +
            (right * Math.cos(this.rotation) - top * Math.sin(this.rotation)),
          z:
            this.position.z +
            (right * Math.sin(this.rotation) + top * Math.cos(this.rotation)),
        },
        bottomLeft: {
          x:
            this.position.x +
            (left * Math.cos(this.rotation) - bottom * Math.sin(this.rotation)),
          z:
            this.position.z +
            (left * Math.sin(this.rotation) + bottom * Math.cos(this.rotation)),
        },
        bottomRight: {
          x:
            this.position.x +
            (right * Math.cos(this.rotation) -
              bottom * Math.sin(this.rotation)),
          z:
            this.position.z +
            (right * Math.sin(this.rotation) +
              bottom * Math.cos(this.rotation)),
        },
      };
      done();
    });
  }

  async checkForCollisions() {}
}
