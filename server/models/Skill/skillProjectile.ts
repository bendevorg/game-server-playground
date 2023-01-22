import Skill, { SkillType } from '~/models/Skill';
import LivingEntity from '~/models/livingEntity';
import { SkillProjectileConstructor, Position, Dimension } from '~/interfaces';
import Projectile from '~/models/projectile';

export default class SkillProjectile extends Skill {
  speed: number;
  dimension: Dimension;
  lifeSpanInMs: number;

  constructor({
    speed,
    dimension,
    lifeSpanInMs,
    ...args
  }: SkillProjectileConstructor) {
    super({ ...args, type: SkillType.PROJECTILE });
    this.speed = speed;
    this.dimension = dimension;
    this.lifeSpanInMs = lifeSpanInMs;
  }

  async cast(
    caster: LivingEntity,
    skillPosition: Position,
    skillTarget: LivingEntity,
    timestamp?: number,
  ) {
    const now = timestamp || new Date().getTime();
    await super.cast(caster, skillPosition, skillTarget, now);
    const unormalizedDirection = {
      x: skillPosition.x - caster.position.x,
      z: skillPosition.z - caster.position.z,
    };
    const magnitude = Math.sqrt(
      unormalizedDirection.x * unormalizedDirection.x +
        unormalizedDirection.z * unormalizedDirection.z,
    );
    const direction = {
      x: unormalizedDirection.x / magnitude,
      z: unormalizedDirection.z / magnitude,
    };
    // Spawn projectile
    const projectile = new Projectile({
      caster,
      speed: this.speed,
      position: caster.position,
      direction,
      dimension: this.dimension,
      timeToSelfDestroy: now + this.lifeSpanInMs,
    });
    projectile.save();
    console.log(`Projectile ${this.id} casted by ${caster.id}`);
  }
}
