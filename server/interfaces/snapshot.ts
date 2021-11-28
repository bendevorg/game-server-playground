import PublicPlayer from './publicPlayer';
import PublicEnemy from './publicEnemy';

export default interface Snapshot {
  players: Array<PublicPlayer>;
  enemies: Array<PublicEnemy>;
  timestamp: number;
}
