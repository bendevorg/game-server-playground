import { events } from '~/constants';
import { Position, SnapshotLivingEntity } from '~/interfaces';
import { LivingEntity } from '~/models';
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

  writeLevel() {
    this.message.writeUInt8(this.entity.level);
  }

  writeExperience() {
    this.message.writeUInt16(this.entity.experience);
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
    this.message.writeUInt16(this.entity.attackRange * 100);
  }

  writePathEvent(waypoints: Array<Position>) {
    this.message.writeUInt8(events.NEW_PATH_EVENT);
    this.message.writeUInt8(waypoints.length);
    waypoints.forEach((waypoint) => {
      this.message.writeInt16(waypoint.x * 100);
      this.message.writeInt16(waypoint.z * 100);
    });
  }

  writeAttackEvent(target: LivingEntity) {
    this.message.writeUInt8(events.ATTACK_EVENT);
    this.message.writeUInt16(target.id);
  }

  writeHitEvent(value: number) {
    this.message.writeUInt8(events.HIT_EVENT);
    this.message.writeInt16(value);
    this.message.writeInt16(this.entity.health);
  }

  writeExperienceEvent(value: number) {
    this.message.writeUInt8(events.EXPERIENCE_EVENT);
    this.message.writeInt16(value);
    this.message.writeInt16(this.entity.experience);
  }

  writeDeathEvent() {
    this.message.writeUInt8(events.DEATH_EVENT);
  }

  writeFullData() {
    this.writePositionUpdateData();
    this.writeLevel();
    this.writeExperience();
    this.writeHealth();
    this.writeMaxHealth();
    this.writeSpeed();
    this.writeAttackRange();
  }

  writePositionUpdateData() {
    this.writeId();
    this.writePosition();
  }

  writeEvents(eventsData: Buffer, amountOfEvents: number) {
    this.writeId();
    this.message.writeUInt8(amountOfEvents);
    this.message.appendBuffer(eventsData);
  }
}
