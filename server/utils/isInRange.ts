import { Position } from '~/interfaces';

export default (
  positionA: Position,
  positionB: Position,
  range: number,
): boolean => {
  return (
    Math.abs(positionA.x - positionB.x) <= range &&
    Math.abs(positionA.z - positionB.z) <= range
  );
};
