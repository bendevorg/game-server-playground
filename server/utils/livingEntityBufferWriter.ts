import { SnapshotLivingEntity } from '~/interfaces';
import NetworkMessage from '~/utils/networkMessage';

export default class LivingEntityBufferWriter {
  entity: SnapshotLivingEntity;
  message: NetworkMessage;

  constructor(entity: SnapshotLivingEntity, message: NetworkMessage) {
    this.entity = entity;
    this.message = message;
  }

  writeId() {
    this.message.writeUInt16(this.entity.id);
  }

  writePosition() {
    // We multiply this by a 100 because we store this in a short (int 16) to save space
    // But that doesn't have decimals, so we multiply it here and divide on the client
    this.message.writeInt16(this.entity.position.x * 100);
    // TODO: Add Y when it makes sense
    // We multiply this by a 100 because we store this in a short (int 16) to save space
    // But that doesn't have decimals, so we multiply it here and divide on the client
    this.message.writeInt16(this.entity.position.z * 100);
  }

  writeHealth() {
    this.message.writeInt16(this.entity.health);
  }

  writeMaxHealth() {
    this.message.writeInt16(this.entity.maxHealth);
  }

  writeSpeed() {
    this.message.writeUInt8(this.entity.speed);
  }

  writeAttackRange() {
    this.message.writeUInt8(this.entity.attackRange);
  }

  writePositionUpdateData() {
    this.writeId();
    this.writePosition();
  }
}
