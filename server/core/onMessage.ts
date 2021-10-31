import { RemoteInfo } from 'dgram';

export default (message: string, senderInfo: RemoteInfo) => {
  console.log(message);
}