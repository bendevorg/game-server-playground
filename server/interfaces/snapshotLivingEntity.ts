import { Position } from '.';

export default interface SnapshotLivingEntity {
  id: number;
  position: Position;
  health: number;
  maxHealth: number;
  speed: number;
  attackRange: number;
}
