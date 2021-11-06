import inputQueue from '../utils/inputQueue';
import { engine, actions } from '../constants';
import { Position } from '../interfaces';

const gameLoop = () => {
  // We store the queue length so we don't
  // Process inputs that are arriving in the middle of this game loop
  const amountOfInputs = inputQueue.length;
  for (let i = 0; i < amountOfInputs; i++) {
    const input = inputQueue.shift();
    if (!input) {
      continue;
    }
    const action = input[0];
    switch (action) {
      case actions.MOVEMENT:
        const x = input.readInt16LE(1);
        const y = input.readInt16LE(3);
        // The position is a short where the last 2 numbers are decimals
        // Multiplying by 1.0 so it turns into a float
        const position: Position = {
          x: (x * 1.0) / 100,
          y: (y * 1.0) / 100,
        };
        console.log(position);
        break;
      default:
        break;
    }
  }
  setTimeout(gameLoop, engine.INTERVAL_BETWEEN_TICKS);
};

export default gameLoop;
