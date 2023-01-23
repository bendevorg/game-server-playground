import Dimension from './dimension';
import SkillTypeConstructor from './skillTypeConstructor';

export default interface SkillProjectileConstructor
  extends SkillTypeConstructor {
  speed: number;
  dimension: Dimension;
  lifeSpanInMs: number;
  collisionMask: number;
}
