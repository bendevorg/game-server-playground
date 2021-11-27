import { Snapshot, Player, PublicPlayer } from '../interfaces';
import cache from '../utils/cache';
import omit from '../utils/omit';

export default (): Promise<Snapshot> => {
  return new Promise<Snapshot>((resolve, reject) => {
    // TODO: This should get things from cache -> redis -> database
    const playerIds: Array<string> | undefined = cache.keys();
    if (!playerIds) {
      return reject();
    }
    const players: Array<PublicPlayer> = [];
    playerIds.forEach((playerId) => {
      const player: Player | undefined = cache.get(playerId);
      if (!player) {
        console.error('Player id in online list but not in cache');
        return;
      }
      const publicPlayer = omit(player, ['ip', 'lastUpdate', 'lastMovement', 'path']);
      players.push(publicPlayer);
    });
    return resolve({
      players,
      timestamp: Date.now(),
    });
  });
};
