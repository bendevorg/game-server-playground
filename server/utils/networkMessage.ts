import { network } from '~/constants';

export default class NetworkMessage {
  buffer: Buffer;
  offset: number;

  constructor(buffer: Buffer) {
    this.buffer = buffer;
    this.offset = 0;
  }

  writeFloat(value: number) {
    this.buffer.writeFloatLE(value, this.offset);
    this.offset += network.FLOAT_SIZE;
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

  readDouble() {
    const value = this.buffer.readDoubleLE(this.offset);
    this.offset += network.DOUBLE_SIZE;
    return value;
  }

  readInt16() {
    const value = this.buffer.readInt16LE(this.offset);
    this.offset += network.INT16_SIZE;
    return value;
  }

  readUInt16() {
    const value = this.buffer.readUInt16LE(this.offset);
    this.offset += network.INT16_SIZE;
    return value;
  }

  readUInt8() {
    const value = this.buffer[this.offset];
    this.offset += network.INT8_SIZE;
    return value;
  }
}
