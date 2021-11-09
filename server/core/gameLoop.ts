import inputQueue from '../utils/inputQueue';
import sendSnapshots from '../controllers/sendSnapshots';
import processInput from '../controllers/processInput';
import { engine } from '../constants';

const gameLoop = async () => {
  // We store the queue length so we don't
  // Process inputs that are arriving in the middle of this game loop
  // TODO: Should we order these inputs by timestamp?
  const amountOfInputs = inputQueue.length;
  for (let i = 0; i < amountOfInputs; i++) {
    const input = inputQueue.shift();
    if (!input) {
      continue;
    }
    // We should process one input at a time
    // Otherwise we might have collisions between different player inputs
    await processInput(input);
  }
  sendSnapshots();
  setTimeout(gameLoop, engine.INTERVAL_BETWEEN_TICKS);
};

export default gameLoop;
