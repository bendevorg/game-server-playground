import { SkillType } from '~/models/Skill';
import SkillTypeConstructor from './skillTypeConstructor';

export default interface SkillConstructor extends SkillTypeConstructor {
  type: SkillType;
}
