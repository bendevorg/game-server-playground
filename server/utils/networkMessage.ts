import { network } from '~/constants';

export default class NetworkMessage {
  buffer: Buffer;
  offset: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  writeUInt8(value: number) {
    this.buffer.writeUInt8(value, this.offset);
    this.offset += network.INT8_SIZE;
  }

  writeUInt16(value: number) {
    this.buffer.writeUInt16LE(value, this.offset);
    this.offset += network.INT16_SIZE;
  }

  writeInt16(value: number) {
    this.buffer.writeInt16LE(value, this.offset);
    this.offset += network.INT16_SIZE;
  }

  writeUInt32(value: number) {
    this.buffer.writeUInt32LE(value, this.offset);
    this.offset += network.INT32_SIZE;
  }

  writeInt32(value: number) {
    this.buffer.writeInt32LE(value, this.offset);
    this.offset += network.INT32_SIZE;
  }

  writeULong(value: bigint) {
    this.buffer.writeBigUInt64LE(value, this.offset);
    this.offset += network.INT64_SIZE;
  }

  writeLong(value: bigint) {
    this.buffer.writeBigInt64LE(value, this.offset);
    this.offset += network.INT64_SIZE;
  }

  writeFloat(value: number) {
    this.buffer.writeFloatLE(value, this.offset);
    this.offset += network.FLOAT_SIZE;
  }

  writeDouble(value: number) {
    this.buffer.writeDoubleLE(value, this.offset);
    this.offset += network.DOUBLE_SIZE;
  }

  popUInt8() {
    const value = this.buffer[this.offset];
    this.offset += network.INT8_SIZE;
    return value;
  }

  popUInt16() {
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += network.INT16_SIZE;
    return value;
  }

  popInt16() {
    const value = this.buffer.readInt16LE(this.offset);
    this.offset += network.INT16_SIZE;
    return value;
  }

  popUInt32() {
    const value = this.buffer.readUInt32LE(this.offset);
    this.offset += network.INT32_SIZE;
    return value;
  }

  popInt32() {
    const value = this.buffer.readInt32LE(this.offset);
    this.offset += network.INT32_SIZE;
    return value;
  }

  popULong() {
    const value = this.buffer.readBigUInt64LE(this.offset);
    this.offset += network.INT64_SIZE;
    return value;
  }

  popLong() {
    const value = this.buffer.readBigInt64LE(this.offset);
    this.offset += network.INT64_SIZE;
    return value;
  }

  popFloat() {
    const value = this.buffer.readFloatLE(this.offset);
    this.offset += network.FLOAT_SIZE;
    return value;
  }

  popDouble() {
    const value = this.buffer.readDoubleLE(this.offset);
    this.offset += network.DOUBLE_SIZE;
    return value;
  }

  appendBuffer(anotherBuffer: Buffer) {
    this.buffer = Buffer.concat([this.buffer, anotherBuffer]);
    this.offset += anotherBuffer.length;
  }

  resetOffset() {
    this.offset = 0;
  }
}
