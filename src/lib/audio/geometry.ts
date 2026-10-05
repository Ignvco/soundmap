import { z } from "zod";
export const OCTAVES = [125, 250, 500, 1000, 2000, 4000] as const;
const n = z.number().finite();
const point = z.object({ x: n.min(-250).max(250), z: n.min(-250).max(250) });
export type Point2 = { x: number; z: number };
export function polygonArea(points: Point2[]) {
  return (
    Math.abs(
      points.reduce((sum, a, i) => {
        const b = points[(i + 1) % points.length];
        return sum + a.x * b.z - b.x * a.z;
      }, 0),
    ) / 2
  );
}
function cross(a: Point2, b: Point2, c: Point2) {
  return (b.x - a.x) * (c.z - a.z) - (b.z - a.z) * (c.x - a.x);
}
export function simplePolygon(p: Point2[]) {
  if (polygonArea(p) < 1) return false;
  for (let i = 0; i < p.length; i++)
    for (let j = i + 1; j < p.length; j++) {
      if (j === i + 1 || (i === 0 && j === p.length - 1)) continue;
      const a = p[i],
        b = p[(i + 1) % p.length],
        c = p[j],
        d = p[(j + 1) % p.length];
      if (
        Math.max(a.x, b.x) >= Math.min(c.x, d.x) &&
        Math.max(c.x, d.x) >= Math.min(a.x, b.x) &&
        Math.max(a.z, b.z) >= Math.min(c.z, d.z) &&
        Math.max(c.z, d.z) >= Math.min(a.z, b.z) &&
        cross(a, b, c) * cross(a, b, d) <= 0 &&
        cross(c, d, a) * cross(c, d, b) <= 0
      )
        return false;
    }
  return true;
}
const polygon = z
  .array(point)
  .min(3)
  .max(128)
  .refine(simplePolygon, "Polígono degenerado o con cruces");
export const geometrySchema = z.object({
  outline: polygon,
  balconies: z
    .array(
      z.object({
        id: z.string().min(1).max(100),
        outline: polygon,
        heightM: n.min(0.5).max(50),
        thicknessM: n.min(0.05).max(1),
      }),
    )
    .max(16)
    .default([]),
  exclusions: z
    .array(
      z
        .object({ xMin: n, xMax: n, zMin: n, zMax: n })
        .refine((b) => b.xMin < b.xMax && b.zMin < b.zMax),
    )
    .max(32)
    .default([]),
  source: z.string().max(2000),
});
export type RoomGeometry = z.infer<typeof geometrySchema>;
export const surfacesSchema = z
  .array(
    z.object({
      id: z.string().max(100),
      label: z.string().max(200),
      areaM2: n.min(0.01).max(100000),
      alpha: z.tuple([
        n.min(0).max(0.999),
        n.min(0).max(0.999),
        n.min(0).max(0.999),
        n.min(0).max(0.999),
        n.min(0).max(0.999),
        n.min(0).max(0.999),
      ]),
      source: z.string().min(1).max(2000),
    }),
  )
  .max(128);
export type AcousticSurface = z.infer<typeof surfacesSchema>[number];
export function pointInPolygon(point: Point2, poly: Point2[]) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i],
      b = poly[j];
    if (
      a.z > point.z !== b.z > point.z &&
      point.x < ((b.x - a.x) * (point.z - a.z)) / (b.z - a.z) + a.x
    )
      inside = !inside;
  }
  return inside;
}
export function geometryWithinRoom(
  g: RoomGeometry,
  width: number,
  length: number,
  height: number,
) {
  return (
    [...g.outline, ...g.balconies.flatMap((b) => b.outline)].every(
      (p) => Math.abs(p.x) <= width / 2 && Math.abs(p.z) <= length / 2,
    ) &&
    g.balconies.every(
      (b) =>
        b.heightM + b.thicknessM < height &&
        b.outline.every((p) => pointInPolygon(p, g.outline)),
    )
  );
}
export function bandReverberation(
  volume: number,
  surfaces: AcousticSurface[],
  people: number,
  method: "sabine" | "eyring",
) {
  const area = surfaces.reduce((s, v) => s + v.areaM2, 0);
  return OCTAVES.map((frequency, i) => {
    const a = surfaces.reduce((s, v) => s + v.areaM2 * v.alpha[i], 0),
      denominator =
        method === "eyring"
          ? -area * Math.log(Math.max(0.001, 1 - a / Math.max(area, 0.001)))
          : a;
    return {
      frequency,
      rt60:
        (0.161 * volume) /
        Math.max(0.01, denominator + Math.max(0, people) * 0.4),
      absorption: a,
    };
  });
}
