import { SkillType } from '~/models/Skill';

export default interface SkillConstructor {
  id: number;
  type: SkillType;
  level: number;
  cooldownInMs: number;
  timeForNextCast?: number;
}
