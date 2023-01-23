import Skill, { SkillType } from '~/models/Skill';
import LivingEntity from '~/models/livingEntity';
import { SkillProjectileConstructor, Position, Dimension } from '~/interfaces';
import Projectile from '~/models/projectile';

export default class SkillProjectile extends Skill {
  speed: number;
  dimension: Dimension;
  lifeSpanInMs: number;
  collisionMask: number;

  constructor({
    speed,
    dimension,
    lifeSpanInMs,
    collisionMask,
    ...args
  }: SkillProjectileConstructor) {
    super({ ...args, type: SkillType.PROJECTILE });
    this.speed = speed;
    this.dimension = dimension;
    this.lifeSpanInMs = lifeSpanInMs;
    this.collisionMask = collisionMask;
  }

  async onHit(entity: LivingEntity) {
    // TODO: This should call the skill's callback
    entity.takeHit(5, this.caster);
  }

  async cast(
    skillPosition: Position,
    skillTarget: LivingEntity,
    timestamp?: number,
  ) {
    const now = timestamp || new Date().getTime();
    await super.cast(skillPosition, skillTarget, now);
    const unormalizedDirection = {
      x: skillPosition.x - this.caster.position.x,
      z: skillPosition.z - this.caster.position.z,
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
      caster: this.caster,
      speed: this.speed,
      // TODO: Get a better position
      position: this.caster.position,
      direction,
      dimension: this.dimension,
      collisionMask: this.collisionMask,
      timeToSelfDestroy: now + this.lifeSpanInMs,
      onHit: this.onHit,
    });
    projectile.save();
    console.log(`Projectile ${this.id} casted by ${this.caster.id}`);
  }
}
