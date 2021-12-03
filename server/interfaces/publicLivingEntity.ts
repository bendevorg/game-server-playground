import { Position } from '.';

export default interface PublicLivingEntity {
  id: number;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number;
}
