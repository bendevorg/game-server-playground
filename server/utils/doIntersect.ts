import { GridLine, GridPosition } from '~/interfaces';

enum Orientation {
  Collinear = 0,
  ClockWise = 1,
  CounterClockWise = 2,
}

function getOrientation(
  pointA: GridPosition,
  pointB: GridPosition,
  pointC: GridPosition,
): Orientation {
  // See https://www.geeksforgeeks.org/orientation-3-ordered-points/
  // for details of below formula.
  const val =
    (pointB.row - pointA.row) * (pointC.column - pointB.column) -
    (pointB.column - pointA.column) * (pointC.row - pointB.row);
  if (val == 0) return Orientation.Collinear;
  return val > 0 ? Orientation.ClockWise : Orientation.CounterClockWise;
}
// Given three collinear points p, q, r, the function checks if
// point q lies on line segment 'pr'
function onSegment(
  pointA: GridPosition,
  pointB: GridPosition,
  pointC: GridPosition,
): boolean {
  if (
    pointB.column <= Math.max(pointA.column, pointC.column) &&
    pointB.column >= Math.min(pointA.column, pointC.column) &&
    pointB.row <= Math.max(pointA.row, pointC.row) &&
    pointB.row >= Math.min(pointA.row, pointC.row)
  )
    return true;

  return false;
}

export default function doIntersect(line: GridLine, otherLine: GridLine) {
  // Find the four orientations needed for general and special cases
  const orientationA: Orientation = getOrientation(
    line.pointA,
    line.pointB,
    otherLine.pointA,
  );
  const orientationB: Orientation = getOrientation(
    line.pointA,
    line.pointB,
    otherLine.pointB,
  );
  const orientationC: Orientation = getOrientation(
    otherLine.pointA,
    otherLine.pointB,
    line.pointA,
  );
  const orientationD: Orientation = getOrientation(
    otherLine.pointA,
    otherLine.pointB,
    line.pointB,
  );

  // General case
  if (orientationA != orientationB && orientationC != orientationD) return true;

  // Special Cases
  // pointA, pointB and otherLine.pointA are collinear and otherLine.pointA lies on segment pointApointB
  if (
    orientationA == 0 &&
    onSegment(line.pointA, otherLine.pointA, line.pointB)
  )
    return true;
  // pointA, pointB and otherLine.pointB are collinear and otherLine.pointB lies on segment pointApointB
  if (
    orientationB == 0 &&
    onSegment(line.pointA, otherLine.pointB, line.pointB)
  )
    return true;
  // otherLine.pointA, otherLine.pointB and pointA are collinear and pointA lies on segment otherLine.pointA-otherLine.pointB
  if (
    orientationC == 0 &&
    onSegment(otherLine.pointA, line.pointA, otherLine.pointB)
  )
    return true;
  // otherLine.pointA, otherLine.pointB and pointB are collinear and pointB lies on segment otherLine.pointA-otherLine.pointB
  if (
    orientationD == 0 &&
    onSegment(otherLine.pointA, line.pointB, otherLine.pointB)
  )
    return true;
  return false;
}
