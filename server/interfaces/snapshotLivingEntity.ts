import { Position } from '.';

export default interface SnapshotLivingEntity {
  id: number;
  position: Position;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  speed: number;
  attackRange: number;
  events: Array<Buffer>;
}
