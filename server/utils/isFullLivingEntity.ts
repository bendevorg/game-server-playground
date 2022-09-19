import {
  SnapshotLivingEntity,
  ReducedSnapshotLivingEntity,
} from '~/interfaces';

export default function isFullLivingEntity(
  livingEntity: SnapshotLivingEntity | ReducedSnapshotLivingEntity,
): livingEntity is SnapshotLivingEntity {
  return (livingEntity as SnapshotLivingEntity).maxHealth !== undefined;
}
