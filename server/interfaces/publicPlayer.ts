import Player from './player';

export default interface PublicPlayer
  extends Omit<Player, 'ip' | 'port' | 'lastUpdate' | 'lastMovement' | 'movingTo'> {}
