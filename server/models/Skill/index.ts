import { SkillConstructor } from '~/interfaces';

export enum SkillType {
  PROJECTILE = 0,
  AOE = 1,
  TARGET = 2,
}

export default class Skill {
  id: number;
  type: SkillType;
  level: number;
  cooldownInMs: number;
  timeForNextCast: number;

  constructor({
    id,
    type,
    level,
    cooldownInMs,
    timeForNextCast,
  }: SkillConstructor) {
    this.id = id;
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

  cast(timestamp?: number) {
    const now = timestamp || new Date().getTime();
    this.timeForNextCast = now + this.cooldownInMs;
    console.log(`Skill ${this.id} casted`);
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
