import { engine } from '~/constants';

const latency = () => new Promise((resolve) => setTimeout(resolve, 300));

export default async function simulateLatency() {
  if (engine.DEV_MODE && engine.LATENCY > 0) {
    await latency();
  }
}
