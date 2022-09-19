import { SnapshotLivingEntity, ReducedSnapshotLivingEntity } from '.';

export default interface Snapshot {
  players: Array<SnapshotLivingEntity | ReducedSnapshotLivingEntity>;
  enemies: Array<SnapshotLivingEntity | ReducedSnapshotLivingEntity>;
  timestamp: number;
}
