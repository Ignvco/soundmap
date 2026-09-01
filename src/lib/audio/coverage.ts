// Coverage Utility — derived from real geometry, not arbitrary.
// Gives the % of audience area estimated to be within the horizontal
// coverage angle of the tops, accounting for room width and unit count.
//
// Model:
//   effective_angle = coverageH * min(count, 3) / count  (diminishing return)
//   width_covered   = 2 * throw * tan(effective_angle/2)
//   coverage_pct    = min(100, width_covered / room.width * 100)
// Throw is taken as the room length (worst case: last row).

import type { GearItem } from "./pa-engine.ts";
import type { RoomScanInput } from "./acoustics.ts";

export function computeCoveragePercent(
  room: RoomScanInput | null,
  tops: GearItem[]
): number {
  if (!room || tops.length === 0) return 0;
  const totalTops = tops.reduce((s, t) => s + (t.quantity ?? 1), 0);
  if (totalTops === 0) return 0;

  const coverageH = tops[0].coverageH ?? 90;
  const throwDist = room.length; // worst case: last row

  // Physical model: L/R stereo tops are physically separated across the stage width.
  // Each top covers its own cone — coverage does NOT add by multiplying the angle.
  // Instead: each deployment position covers a cone, and the cones tile the room.
  //
  // Standard deployment: for n total units, we assume ceil(n/2) positions per side
  // spread symmetrically. Each position covers:
  //   width = 2 * throw * tan(coverageH/2)
  // The total covered width is the sum of all positions, clamped to room width.
  //
  // For a single mono top or 2-unit L/R pair: just the cone of one unit (they aim the same area).
  // For 4 units (2L+2R stacked): same coverage as 2 units — stacking increases SPL not angle.
  // For delay fills / front-fills in separate positions: each adds a new zone.
  //
  // Simplified: positions = min(totalTops, 4) / 2 per side for typical PA rigs.
  // Beyond 4 units, extra units are usually stacked (gain, not angle).
  const deploymentPositions = Math.min(Math.ceil(totalTops / 2), 2); // L+R, max 2 positions/side
  const coneWidthPerPosition = 2 * throwDist * Math.tan(((coverageH / 2) * Math.PI) / 180);
  const totalWidthCovered = coneWidthPerPosition * deploymentPositions;

  const pct = Math.min(100, Math.round((totalWidthCovered / room.width) * 100));
  return Math.max(0, pct);
}
