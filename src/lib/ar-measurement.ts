/** Rear-camera direction projected onto world up, per W3C Device Orientation:
 * https://www.w3.org/TR/orientation-event/#worked-example (v = [0, 0, -1]). */
export function cameraPitch(
  beta: number | null,
  gamma: number | null,
): number | null {
  if (
    beta == null ||
    gamma == null ||
    !Number.isFinite(beta) ||
    !Number.isFinite(gamma)
  )
    return null;
  const rad = Math.PI / 180;
  return (
    Math.asin(
      Math.max(-1, Math.min(1, -Math.cos(beta * rad) * Math.cos(gamma * rad))),
    ) / rad
  );
}
export function floorDistance(
  phoneHeight: number,
  pitch: number | null,
): number | null {
  if (
    !Number.isFinite(phoneHeight) ||
    phoneHeight < 0.5 ||
    phoneHeight > 2.5 ||
    pitch == null ||
    !Number.isFinite(pitch) ||
    pitch > -5 ||
    pitch < -80
  )
    return null;
  return phoneHeight / Math.tan((-pitch * Math.PI) / 180);
}
export function ceilingHeight(
  phoneHeight: number,
  distanceToWall: number,
  pitch: number | null,
): number | null {
  if (
    !Number.isFinite(phoneHeight) ||
    phoneHeight < 0.5 ||
    phoneHeight > 2.5 ||
    !Number.isFinite(distanceToWall) ||
    distanceToWall < 0.3 ||
    distanceToWall > 200 ||
    pitch == null ||
    !Number.isFinite(pitch) ||
    pitch < 5 ||
    pitch > 80
  )
    return null;
  return phoneHeight + distanceToWall * Math.tan((pitch * Math.PI) / 180);
}
export const DIMENSION_LIMITS = {
  length: [1, 200],
  width: [1, 200],
  height: [2, 50],
} as const;
export function validDimension(
  axis: keyof typeof DIMENSION_LIMITS,
  value: number | null | undefined,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= DIMENSION_LIMITS[axis][0] &&
    value <= DIMENSION_LIMITS[axis][1]
  );
}
