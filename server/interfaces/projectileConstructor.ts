import { LivingEntity } from '~/models';
import Direction from './direction';
import PhysicalEntityConstructor from './physicalEntityConstructor';

export default interface ProjectileConstructor
  extends PhysicalEntityConstructor {
  caster: LivingEntity;
  speed: number;
  direction: Direction;
  timeToSelfDestroy: number;
}
