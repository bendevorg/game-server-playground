import { LivingEntityConstructor } from '.';

export default interface EnemyConstructor extends LivingEntityConstructor {
  behaviour: number;
  triggerAgressiveRange: number;
}
