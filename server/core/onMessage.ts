import { RemoteInfo } from 'dgram';
import { network } from '~/constants';
import inputQueue from '~/utils/inputQueue';

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
  // Uncomment this to simulate latency
  // const a = () => new Promise((resolve) => setTimeout(resolve, 300));
  // await a();
  // We add the timestamp as soon as we receive the input and not from the client
  // Since they can manipulate the timestamp to seem like they did something in a different time
  const timestamp = new Date().getTime();
  const timestampedBuffer = Buffer.alloc(network.DOUBLE_SIZE + buffer.length);
  timestampedBuffer.writeDoubleLE(timestamp);
  buffer.copy(timestampedBuffer, network.DOUBLE_SIZE);
  inputQueue.push(timestampedBuffer);
};
