import { Map, Player, Enemy } from '~/models';
import NetworkMessage from '~/utils/networkMessage';
import { actions } from '~/constants';
import { Position } from '~/interfaces';
import { State } from '~/models/livingEntity';

export default (input: Buffer, map: Map) => {
  return new Promise<void>(async (resolve, reject) => {
    const message = new NetworkMessage(input);
    const timestamp = message.popDouble();
    const id = message.popUInt16();
    const player = Player.getActive(id);
    if (!player) {
      return reject('Player does not exist');
    }
    const action = message.popUInt8();
    switch (action) {
      case actions.PING:
        break;
      case actions.NEW_TARGET_POSITION:
        console.log('New target position');
        // We don't allow the player to move if they are in the before hit animation
        if (player.state === State.PREPARING_ATTACK) break;
        const targetX = message.popInt16();
        const targetZ = message.popInt16();
        const currentX = message.popInt16();
        const currentZ = message.popInt16();
        // The position is a short where the last 2 numbers are decimals
        // Multiplying by 1.0 so it turns into a float
        const targetPosition: Position = {
          x: (targetX * 1.0) / 100,
          y: 0,
          z: (targetZ * 1.0) / 100,
        };
        const currentPosition: Position = {
          x: (currentX * 1.0) / 100,
          y: 0,
          z: (currentZ * 1.0) / 100,
        };
        // TODO: We should check if the movement is within the vision range
        const accepted = await player.attemptToSyncPosition(
          currentPosition,
          timestamp,
        );
        // If the sync was not accepted we move the player here instead to apply remaining movement.
        if (!accepted) {
          // We should apply the movement between last and this tick before changing paths
          await player.move(timestamp);
        }

        // We don't wait for this but living entity internally uses locks to
        // guarantee that we won't have collisions when accessing things
        player.calculatePath(targetPosition);
        // This last movement is assigned here so in the next server tick
        // After the path is calculated we will move taking into account the time
        // Between this timestamp and the future tick timestamp
        // TODO: player.move already sets last movement, do we really need this here?
        player.setLastMovement(timestamp);
        player.setTarget(undefined);
        break;
      case actions.ATTACK:
        console.log('Attack');
        const targetId = message.popUInt16();
        const target = Enemy.getActive(targetId);
        if (!target) {
          return reject('Invalid target');
        }
        // We should apply the movement between last and this tick before changing to attack
        await player.move(timestamp);
        player.setTarget(target);
        player.attack(timestamp);
        break;
      default:
        return reject('Invalid action');
    }
    player.lastUpdate = timestamp;
    player.save(true);
    return resolve();
  });
};
