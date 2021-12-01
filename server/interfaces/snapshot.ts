import { PublicLivingEntity } from '.';

export default interface Snapshot {
  players: Array<PublicLivingEntity>;
  enemies: Array<PublicLivingEntity>;
  timestamp: number;
}
