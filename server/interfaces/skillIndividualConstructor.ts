import { LivingEntity } from '~/models';

export default interface SkillIndividualConstructor {
  caster: LivingEntity;
  level: number;
  timeForNextCast?: number;
}
