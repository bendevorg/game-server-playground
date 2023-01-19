import { Position } from '.';
import { Skill } from '~/models';

export default interface LivingEntityConstructor {
  id: number;
  type: number;
  position: Position;
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
