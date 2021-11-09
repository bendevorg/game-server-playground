import { Position } from '../interfaces';

export default (id: string, buffer?: Buffer, position?: Position) => {
  if (buffer && !position) {
    const x = buffer.readInt16LE(1);
    const y = buffer.readInt16LE(3);
    // The position is a short where the last 2 numbers are decimals
    // Multiplying by 1.0 so it turns into a float
    position = {
      x: (x * 1.0) / 100,
      y: (y * 1.0) / 100,
    };
  }
};
