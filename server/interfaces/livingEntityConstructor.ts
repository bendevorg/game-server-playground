import { Position } from '.';

export default interface LivingEntityConstructor {
  id: string | undefined;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number;
}
