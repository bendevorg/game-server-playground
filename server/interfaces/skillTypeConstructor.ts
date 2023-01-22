import SkillIndividualConstructor from './skillIndividualConstructor';

export default interface SkillTypeConstructor
  extends SkillIndividualConstructor {
  id: number;
  cooldownInMs: number;
}
