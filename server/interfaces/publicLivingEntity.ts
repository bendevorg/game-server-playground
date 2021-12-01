import { Position } from '.';

export default interface PublicLivingEntity {
  id: string;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number;
}
