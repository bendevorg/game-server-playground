import { Position } from '.';

export default interface SnapshotLivingEntity {
  id: number;
  type: number;
  position: Position;
  level: number;
  experience: number;
  health: number;
  maxHealth: number;
  speed: number;
  attackRange: number;
  attackSpeed: number;
  events: Array<Buffer>;
}
