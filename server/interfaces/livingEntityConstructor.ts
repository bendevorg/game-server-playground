import { Position } from '.';

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
  experienceReward: number;
  mapId: string;
}
