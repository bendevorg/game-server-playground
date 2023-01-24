export default interface Bounds {
  topLeft: { x: number; z: number };
  // topRight: { x: number; z: number };
  // bottomLeft: { x: number; z: number };
  bottomRight: { x: number; z: number };
  topmost: number;
  bottommost: number;
  leftmost: number;
  rightmost: number;
}
