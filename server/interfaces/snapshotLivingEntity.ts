import { ReducedSnapshotLivingEntity } from '.';

export default interface SnapshotLivingEntity
  extends ReducedSnapshotLivingEntity {
  health: number;
  maxHealth: number;
  speed: number;
  attackRange: number;
}
