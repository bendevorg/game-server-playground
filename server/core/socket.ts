import dgram, { Socket as SocketType, RemoteInfo } from 'dgram';

class Socket {
  socket: SocketType;
  onMessageCallback: (buffer: Buffer, senderInfo: RemoteInfo) => void;
  constructor() {
    this.socket = dgram.createSocket('udp4');
    this.onMessageCallback = () => {};
  }

  setMessageCallback(
    _onMessageCallback: (buffer: Buffer, senderInfo: RemoteInfo) => void,
  ) {
    this.onMessageCallback = _onMessageCallback;
  }

  sendMessage(message: string, remoteInfo: RemoteInfo) {
    this.socket.send(
      message,
      remoteInfo.port,
      remoteInfo.address,
      (error: any) => {
        if (!error) {
          return;
        }
        console.error(error);
      },
    );
  }

  onConnect() {
    console.log('New connection');
  }

  onMessage(buffer: Buffer, senderInfo: RemoteInfo) {
    this.onMessageCallback(buffer, senderInfo);
  }

  start(port: number) {
    this.socket.on('listening', () => {
      const { address, port } = this.socket.address();
      console.log(`UDP server listening on ${address}:${port}`);
    });
    this.socket.on('connect', this.onConnect.bind(this));
    this.socket.on('message', this.onMessage.bind(this));
    this.socket.bind(port);
  }
}

const socket = new Socket();

export default socket;
