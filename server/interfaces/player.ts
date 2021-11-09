export default interface Player {
  id: string;
  ip: string;
  positionX: number;
  positionY: number;
  positionZ: number;
  speed: number;
  lastUpdate: Date;
}