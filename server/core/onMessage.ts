import { RemoteInfo } from 'dgram';
import inputQueue from '../utils/inputQueue';

export default (buffer: Buffer, senderInfo: RemoteInfo) => {
  console.log(senderInfo.address);
  if (buffer.length === 0) {
    console.error('Invalid received buffer');
    return;
  }
  // TODO: Should we validate messages before queueing them?
  if (buffer.length === 0) {
    return;
  }
  inputQueue.push(buffer);
};
