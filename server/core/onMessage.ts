import { RemoteInfo } from 'dgram';
import inputQueue from '../utils/inputQueue';

export default (buffer: Buffer, senderInfo: RemoteInfo) => {
  if (buffer.length === 0) {
    console.error('Invalid received buffer');
    return;
  }
  // TODO: Message should be encrypted at some extent
  // Using the user's private key received when they logged in
  // We should decrypt that here before adding to the queue
  // TODO: Should we validate messages before queueing them?
  if (buffer.length === 0) {
    return;
  }
  inputQueue.push(buffer);
};
