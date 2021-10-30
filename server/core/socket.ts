import dgram, { Socket as SocketType, RemoteInfo } from 'dgram';

class Socket {
  socket: SocketType;
  constructor() {
    this.socket = dgram.createSocket('udp4');
  }

  onMessage(buffer: Buffer, senderInfo: RemoteInfo) {
    const message = buffer.toString();
    console.log(`${message} by ${senderInfo}`);
  }

  start(port: number) {
    this.socket.on('listening', () => {
      const { address, port } = this.socket.address();
      console.log(`Server listening on ${address}:${port}`);
    });
    this.socket.on('message', this.onMessage);
    this.socket.bind(port);
  }
}

const socket = new Socket();

export default socket;
