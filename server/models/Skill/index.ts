import { SkillConstructor, Position } from '~/interfaces';
import LivingEntity from '~/models/livingEntity';

export enum SkillType {
  PROJECTILE = 0,
  AOE = 1,
  TARGET = 2,
}

export default class Skill {
  id: number;
  caster: LivingEntity;
  type: SkillType;
  level: number;
  cooldownInMs: number;
  timeForNextCast: number;

  constructor({
    id,
    caster,
    type,
    level,
    cooldownInMs,
    timeForNextCast,
  }: SkillConstructor) {
    this.id = id;
    this.caster = caster;
    this.type = type;
    this.level = level;
    this.cooldownInMs = cooldownInMs;
    const now = new Date().getTime();
    this.timeForNextCast = timeForNextCast || now;
  }

  isReadyToCast(timestamp?: number) {
    const now = timestamp || new Date().getTime();
    return now >= this.timeForNextCast;
  }

  async cast(
    skillPosition: Position,
    skillTarget: LivingEntity,
    timestamp?: number,
  ) {
    const now = timestamp || new Date().getTime();
    this.timeForNextCast = now + this.cooldownInMs;
    console.log(`Skill ${this.id} casted by ${this.caster.id}`);
  }

  getData() {
    const { id, type, level, cooldownInMs, timeForNextCast } = this;
    return {
      id,
      type,
      level,
      cooldownInMs,
      timeForNextCast,
    };
  }
}
