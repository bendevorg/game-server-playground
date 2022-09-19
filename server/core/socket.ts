import dgram, { Socket as SocketType, RemoteInfo } from 'dgram';
import { Server, Socket as TcpSocket, createServer } from 'net';
import { actions, network } from '~/constants';

class Socket {
  udpSocket: SocketType;
  tcpSocket: Server;
  tcpClientToSocket: { [key: number]: TcpSocket };
  tcpSocketToClient: { [key: string]: number };
  onMessageCallback: (buffer: Buffer, senderInfo?: RemoteInfo) => void;
  constructor() {
    this.udpSocket = dgram.createSocket('udp4');
    this.tcpSocket = createServer();
    this.tcpClientToSocket = {};
    this.tcpSocketToClient = {};
    this.onMessageCallback = () => {};
  }

  setMessageCallback(
    _onMessageCallback: (buffer: Buffer, senderInfo?: RemoteInfo) => void,
  ) {
    this.onMessageCallback = _onMessageCallback;
  }

  sendUdpMessage(buffer: Buffer, address: string, port: number) {
    this.udpSocket.send(buffer, port, address, (error: any) => {
      if (!error) {
        return;
      }
      console.error(error);
    });
  }

  sendTcpMessage(buffer: Buffer, clientId: number) {
    return new Promise<void>((resolve, reject) => {
      const socket = this.tcpClientToSocket[clientId];
      if (!socket) return;
      socket.write(buffer);
      return resolve();
    });
  }

  onUdpConnect() {
    console.log('New UDP connection');
  }

  onTcpConnect(socket: TcpSocket) {
    const socketStringfied = `${socket.remoteAddress}:${socket.remotePort}`;
    console.log(`${socketStringfied} Connected`);
    socket.on('data', (data: Buffer) => {
      if (data[0] === actions.AUTHENTICATE) {
        // TODO: This should be a token that the user got from login and not the player id
        const id = data.readUInt16LE(network.INT8_SIZE);
        this.tcpClientToSocket[id] = socket;
        this.tcpSocketToClient[socketStringfied] = id;
        return;
      }
      this.onMessageCallback(data);
    });
    socket.on('close', () => {
      const id = this.tcpSocketToClient[socketStringfied];
      if (!id) return;
      delete this.tcpClientToSocket[id];
      delete this.tcpSocketToClient[socketStringfied];
    });
  }

  onUdpMessage(buffer: Buffer, senderInfo: RemoteInfo) {
    this.onMessageCallback(buffer, senderInfo);
  }

  start(port: number) {
    // Setup UDP
    this.udpSocket.on('listening', () => {
      const { address, port } = this.udpSocket.address();
      console.log(`UDP server listening on ${address}:${port}`);
    });
    this.udpSocket.on('connect', this.onUdpConnect.bind(this));
    this.udpSocket.on('message', this.onUdpMessage.bind(this));
    this.udpSocket.bind(port);

    // Setup TCP
    this.tcpSocket.on('listening', () => {
      const info = this.tcpSocket.address();
      // @ts-ignore
      console.log(`TCP server listening on ${info.address} ${info.port}`);
    });
    this.tcpSocket.on('connection', this.onTcpConnect.bind(this));
    this.tcpSocket.listen(port);
  }
}

const socket = new Socket();

export default socket;
