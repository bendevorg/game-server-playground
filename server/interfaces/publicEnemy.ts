import Enemy from './enemy';

export default interface PublicEnemy
  extends Omit<Enemy, 'lastUpdate' | 'lastMovement' | 'path'> {}
