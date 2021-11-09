import { actions, network } from '../constants';
import { Position } from '../interfaces';

export default (input: Buffer) => {
  return new Promise<void>((resolve, reject) => {
    // TODO: 36 is the size of uuid4, send that to a constants file
    const id = String.fromCharCode(
      ...input.slice(0, network.BUFFER_ID_SIZE),
    );
    const action = input[network.BUFFER_ID_SIZE];
    console.log(id);
    console.log(action);
    switch (action) {
      case actions.MOVEMENT:
        const x = input.readInt16LE(network.BUFFER_ID_SIZE + 1);
        const y = input.readInt16LE(network.BUFFER_ID_SIZE + 3);
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
    return resolve();
  });
};
