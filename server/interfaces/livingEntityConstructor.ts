import { Position } from '.';

export default interface LivingEntityConstructor {
  id: number;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number;
  attackRange: number;
  attackSpeed: number;
  mapId: string;
}
