import Projectile from '~/models/Skill/skillProjectile';
import { SkillIndividualConstructor } from '~/interfaces';
import { skills as skillsConstants } from '~/constants';

export default class Fireball extends Projectile {
  constructor({ ...args }: SkillIndividualConstructor) {
    super({
      ...args,
      id: skillsConstants.FIREBALL_ID,
      cooldownInMs: skillsConstants.FIREBALL_COOLDOWN,
      speed: skillsConstants.FIREBALL_SPEED,
      dimension: skillsConstants.FIREBALL_DIMENSION,
      lifeSpanInMs: skillsConstants.FIREBALL_LIFE_SPAN_IN_MS,
    });
  }
}
