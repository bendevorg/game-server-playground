import AsyncLock from 'async-lock';
import inputQueue from '../utils/inputQueue';
import sendSnapshots from '../controllers/sendSnapshots';
import processInput from '../controllers/processInput';
import updatePlayerStates from '../controllers/updatePlayerStates';
import { engine } from '../constants';
import { Map } from '../classes';

const lock = new AsyncLock();

// I don't like passing the map as a parameter
const gameLoop = async (map: Map) => {
  // We can fire the start the next tick rate countdown immediately since we have locks
  // To prevent concurrency errors
  setTimeout(() => gameLoop(map), 1000 / engine.TICK_RATE);
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
    // TODO: Keep an eye on these locks, first time using they might cause problems
    await lock.acquire('queue', async (done) => {
      try {
        await processInput(input, map);
      } catch(err) {
        console.error(err);
      }
      done();
    });
  }
  // TODO: Keep an eye on these locks, first time using they might cause problems
  await lock.acquire('update', async (done) => {
    try {
      await updatePlayerStates();
    } catch(err) {
      console.error(err);
    }
    done();
  });
  sendSnapshots();
};

export default gameLoop;
