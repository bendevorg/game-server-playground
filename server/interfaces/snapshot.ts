import PlayerPublic from './playerPublic';

export default interface Snapshot {
  id: string;
  player: PlayerPublic;
  timestamp: string;
}
