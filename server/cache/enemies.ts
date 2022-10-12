import NodeCache from 'node-cache';

const cache = new NodeCache({ useClones: false });

export const enemyCounterByType: { [key: number]: number } = {};

cache.on('del', (key, value) => {
  if (enemyCounterByType[value.type]) {
    enemyCounterByType[value.type]--;
  }
});

export default cache;
