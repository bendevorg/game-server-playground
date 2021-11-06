import { Snapshot, Player } from '../interfaces';
import cache from '../utils/cache';
import omit from '../utils/omit';

export default (id: string): Snapshot | null => {
  // TODO: This should get things from cache -> redis -> database
  const player: Player | undefined = cache.get<Player>(id);
  if (!player) {
    return null;
  }
  const publicPlayer = omit(player, ['ip', 'lastUpdate']);
  return {
    id,
    player: publicPlayer,
    timestamp: new Date().toTimeString(),
  };
};
