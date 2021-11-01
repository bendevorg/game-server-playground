import { Snapshot, Player } from '../interfaces';
import cache from '../utils/cache';

export default (id: string): Snapshot | null => {
  // TODO: This should get things from cache -> redis -> database
  const player: Player | undefined = cache.get<Player>(id);
  if (!player) {
    return null;
  }
  const { ['ip']: omitted, ...rest } = player;
  return {
    id,
    player: rest,
    timestamp: new Date().toTimeString(),
  };
};
