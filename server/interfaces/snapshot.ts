import PublicPlayer from './publicPlayer';

export default interface Snapshot {
  players: Array<PublicPlayer>;
  timestamp: number;
}
