import { Map, Player, Enemy } from '~/models';
import { actions, network } from '~/constants';
import { Position } from '~/interfaces';

export default (input: Buffer, map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const timestamp = input.readDoubleLE();
    let offset = network.DOUBLE_SIZE;
    const id = input.readUInt16LE(offset);
    offset += network.INT16_SIZE;
    const player = Player.getActive(id);
    if (!player) {
      return reject('Player does not exist');
    }
    const action = input[offset];
    offset += network.INT8_SIZE;
    switch (action) {
      case actions.PING:
        break;
      case actions.MOVEMENT:
        const x = input.readInt16LE(offset);
        offset += network.INT16_SIZE;
        const z = input.readInt16LE(offset);
        // The position is a short where the last 2 numbers are decimals
        // Multiplying by 1.0 so it turns into a float
        const position: Position = {
          x: (x * 1.0) / 100,
          y: 0,
          z: (z * 1.0) / 100,
        };
        // We should apply the movement between last and this tick before changing paths
        await player.move(timestamp);

        // We don't wait for this but living entity internally uses locks to
        // guarantee that we won't have collisions when accessing things
        player.calculatePath(position);
        // This last movement is assigned here so in the next server tick
        // After the path is calculated we will move taking into account the time
        // Between this timestamp and the future tick timestamp
        // TODO: player.move already sets last movement, do we really need this here?
        player.setLastMovement(timestamp);
        break;
      case actions.ATTACK:
        const targetId = input.readUInt16LE(offset);
        const target = Enemy.getActive(targetId);
        if (!target) {
          return reject('Invalid target');
        }
        // We should apply the movement between last and this tick before changing paths
        await player.move(timestamp);
        player.setupAttack(target);
        // This last movement is assigned here so in the next server tick
        // After the path is calculated we will move taking into account the time
        // Between this timestamp and the future tick timestamp
        // TODO: player.move already sets last movement, do we really need this here?
        player.setLastMovement(timestamp);
        break;
      default:
        return reject('Invalid action');
    }
    player.lastUpdate = timestamp;
    player.save(true);
    return resolve();
  });
};
