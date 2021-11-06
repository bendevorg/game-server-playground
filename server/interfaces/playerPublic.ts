import Player from './player';

export default interface PlayerPublic
  extends Omit<Player, 'ip' | 'lastUpdate'> {}
