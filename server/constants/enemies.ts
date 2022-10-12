import { EnemyConstructor } from '~/interfaces';
import { behaviours } from '~/constants';

const enemies: {
  [key: number]: Omit<EnemyConstructor, 'id' | 'type' | 'position' | 'mapId'>;
} = {
  0: {
    level: 1,
    experience: 0,
    health: 10,
    maxHealth: 10,
    speed: 1.5,
    attackRange: 0.25,
    attackSpeed: 0.25,
    experienceReward: 1,
    halfColliderExtent: 0.5,
    behaviour: behaviours.PASSIVE,
    triggerAgressiveRange: 0,
  },
  1: {
    halfColliderExtent: 0.5,
    level: 1,
    experience: 0,
    health: 10,
    maxHealth: 10,
    speed: 1.5,
    attackRange: 0.25,
    attackSpeed: 0.25,
    experienceReward: 1,
    behaviour: behaviours.REACTIVE,
    triggerAgressiveRange: 0,
  },
  2: {
    behaviour: behaviours.AGGRESSIVE,
    halfColliderExtent: 0.5,
    level: 1,
    experience: 0,
    health: 10,
    maxHealth: 10,
    speed: 1.5,
    attackRange: 0.25,
    attackSpeed: 0.25,
    experienceReward: 1,
    triggerAgressiveRange: 5,
  },
};

export default enemies;
