import { PhysicalEntityConstructor } from '.';
import { Skill } from '~/models';

export default interface LivingEntityConstructor
  extends PhysicalEntityConstructor {
  id: number;
  type: number;
  halfColliderExtent: number;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  speed: number;
  attackRange: number;
  attackSpeed: number;
  availableSkills: { [key: number]: Skill };
  experienceReward: number;
  mapId: string;
}
