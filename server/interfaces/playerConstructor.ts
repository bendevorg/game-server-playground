import { LivingEntityConstructor } from '.';

export default interface PlayerConstructor extends LivingEntityConstructor {
  ip: string;
  port: number;
  tcpOnly: boolean;
}
