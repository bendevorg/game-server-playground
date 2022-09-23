import { SnapshotLivingEntity } from '.';

export default interface Snapshot {
  players: Array<SnapshotLivingEntity>;
  enemies: Array<SnapshotLivingEntity>;
  timestamp: number;
}
