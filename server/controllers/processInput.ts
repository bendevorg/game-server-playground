import { Map, Player, Enemy } from '~/models';
import NetworkMessage from '~/utils/networkMessage';
import { actions } from '~/constants';
import { Position } from '~/interfaces';
import { State } from '~/models/livingEntity';
import transformShortToFloat from '~/utils/transformShortToFloat';

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
        const targetPosition: Position = {
          x: transformShortToFloat(targetX),
          y: 0,
          z: transformShortToFloat(targetZ),
        };
        const currentPosition: Position = {
          x: transformShortToFloat(currentX),
          y: 0,
          z: transformShortToFloat(currentZ),
        };
        const range = transformShortToFloat(message.popInt16());
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
        player.calculatePath(targetPosition, range);
        // This last movement is assigned here so in the next server tick
        // After the path is calculated we will move taking into account the time
        // Between this timestamp and the future tick timestamp
        // TODO: player.move already sets last movement, do we really need this here?
        player.setLastMovement(timestamp);
        player.setAttackTarget(undefined);
        break;
      case actions.ATTACK:
        console.log('Attack action');
        const attackTargetId = message.popUInt16();
        const attackTarget = Enemy.getActive(attackTargetId);
        if (!attackTarget) {
          return reject('Invalid target');
        }
        const attackOriginX = message.popInt16();
        const attackOriginZ = message.popInt16();
        const attackOriginPosition: Position = {
          x: transformShortToFloat(attackOriginX),
          y: 0,
          z: transformShortToFloat(attackOriginZ),
        };
        // TODO: This should not happen if the player is not ready to attack
        const acceptedSync = await player.attemptToSyncPosition(
          attackOriginPosition,
          timestamp,
        );
        if (!acceptedSync) {
          // We should apply the movement between last and this tick before changing to attack
          await player.move(timestamp);
        }
        player.setupAttack(attackTarget, timestamp);
        break;
      case actions.SKILL:
        console.log('Casted skill');
        const skillId = message.popUInt16();
        const casterX = message.popInt16();
        const casterZ = message.popInt16();
        const casterPosition: Position = {
          x: transformShortToFloat(casterX),
          y: 0,
          z: transformShortToFloat(casterZ),
        };
        // TODO: This should not happen if the player is not ready to cast a skill
        const acceptedCasterSync = await player.attemptToSyncPosition(
          casterPosition,
          timestamp,
        );
        if (!acceptedCasterSync) {
          // We should apply the movement between last and this tick before changing to skill cast
          await player.move(timestamp);
        }
        const skillTargetPositionX = message.popInt16();
        const skillTargetPositionZ = message.popInt16();
        const skillTargetPosition: Position = {
          x: transformShortToFloat(skillTargetPositionX),
          y: 0,
          z: transformShortToFloat(skillTargetPositionZ),
        };
        let skillTarget;
        if (!message.isFinished()) {
          const skillTargetId = message.popUInt16();
          skillTarget = Enemy.getActive(skillTargetId) ?? undefined;
        }
        player.setupSkillCast(
          skillId,
          skillTargetPosition,
          skillTarget,
          timestamp,
        );
        break;
      default:
        return reject('Invalid action');
    }
    player.lastUpdate = timestamp;
    player.save(true);
    return resolve();
  });
};
