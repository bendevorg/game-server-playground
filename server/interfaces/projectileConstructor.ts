import { LivingEntity } from '~/models';
import Dimension from './dimension';
import Direction from './direction';
import Position from './position';

export default interface ProjectileConstructor {
  caster: LivingEntity;
  position: Position;
  speed: number;
  dimension: Dimension;
  direction: Direction;
  timeToSelfDestroy: number;
}
