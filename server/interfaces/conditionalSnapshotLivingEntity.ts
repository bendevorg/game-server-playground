import { SnapshotLivingEntity, ReducedSnapshotLivingEntity } from '.';

type ConditionalSnapshotLivingEntity<T extends boolean> = T extends true
  ? ReducedSnapshotLivingEntity
  : SnapshotLivingEntity;

export type { ConditionalSnapshotLivingEntity };
