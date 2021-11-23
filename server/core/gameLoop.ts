import inputQueue from '../utils/inputQueue';
import sendSnapshots from '../controllers/sendSnapshots';
import processInput from '../controllers/processInput';
import updatePlayerStates from '../controllers/updatePlayerStates';
import { engine } from '../constants';
import { Map } from '../classes';

// I don't like passing the map as a parameter
const gameLoop = async (map: Map) => {
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
    await processInput(input, map);
  }
  // TODO: Maybe we shouldn't wait for this
  await updatePlayerStates();
  sendSnapshots();
  setTimeout(() => gameLoop(map), engine.INTERVAL_BETWEEN_TICKS);
};

export default gameLoop;
