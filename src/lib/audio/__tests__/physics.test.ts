// Physics engine tests — SPL grid + line-array solver + air absorption.
// These tests validate the acoustic laws (inverse-square, ISO 9613, directivity)
// without needing hardware, so they run in vitest headless.

import { describe, it, expect } from "vitest";
import {
  computeSplGrid,
  sourceSplAtPoint,
  sumSplDb,
  airAbsorptionDbPerMeter,
  offAxisAttenuationDb,
  sampleGrid,
  type Source,
} from "../spl-grid.ts";
import { solveLineArray, buildLineArrayInput } from "../line-array-solver.ts";
import type { RoomScanInput } from "../acoustics.ts";
import type { GearItem } from "../pa-engine.ts";

const room: RoomScanInput = {
  name: "Test Hall",
  length: 30,
  width: 20,
  height: 10,
  capacity: 800,
  ceilingType: "flat",
  wallMaterial: "drywall",
  floorType: "wood",
  windowCount: 0,
};

// ── Air absorption ────────────────────────────────────────────────────────────
// NOTA: estos valores se verificaron a mano contra ISO 9613-1:1993 ec. 3-6 a
// 20 °C / 50 % HR. Los tests anteriores esperaban 0.0055 y 0.00035 dB/m, que
// eran los valores de una implementación vieja basada en tabla de octavas con
// clamp. La implementación actual resuelve la ecuación completa, así que los
// valores correctos son ~0.00466 dB/m @1 kHz (4.7 dB/km) y ~0.00011 dB/m @60 Hz.
describe("airAbsorptionDbPerMeter (ISO 9613)", () => {
  it("returns ~0.0047 dB/m at 1 kHz (20 °C, 50 % RH)", () => {
    expect(airAbsorptionDbPerMeter(1000)).toBeCloseTo(0.00466, 4);
  });
  it("is negligible at low frequencies (< 0.001 dB/m below 125 Hz)", () => {
    expect(airAbsorptionDbPerMeter(60)).toBeLessThan(0.001);
    expect(airAbsorptionDbPerMeter(60)).toBeGreaterThan(0);
  });
  it("increases with humidity at 8 kHz", () => {
    const dry = airAbsorptionDbPerMeter(8000, 20, 20);
    const humid = airAbsorptionDbPerMeter(8000, 20, 80);
    expect(dry).not.toBeCloseTo(humid, 4);
  });
  it("returns higher attenuation at 8 kHz than at 1 kHz", () => {
    expect(airAbsorptionDbPerMeter(8000)).toBeGreaterThan(airAbsorptionDbPerMeter(1000));
  });
  it("interpolates between octave bands monotonically", () => {
    const a = airAbsorptionDbPerMeter(1500);
    const b = airAbsorptionDbPerMeter(2000);
    const c = airAbsorptionDbPerMeter(3000);
    expect(a).toBeLessThan(b);
    expect(b).toBeLessThan(c);
  });
  it("never returns a negative coefficient", () => {
    for (const f of [20, 100, 1000, 10000, 20000]) {
      expect(airAbsorptionDbPerMeter(f)).toBeGreaterThanOrEqual(0);
    }
  });
});

// ── Off-axis attenuation ──────────────────────────────────────────────────────
describe("offAxisAttenuationDb", () => {
  it("returns 0 dB on-axis", () => {
    expect(offAxisAttenuationDb(0, 90)).toBe(0);
  });
  it("returns approximately -6 dB at coverage edge", () => {
    expect(offAxisAttenuationDb(45, 90)).toBeCloseTo(-6, 0);
  });
  it("returns more attenuation outside coverage", () => {
    const inside = offAxisAttenuationDb(30, 90);
    const outside = offAxisAttenuationDb(80, 90);
    expect(outside).toBeLessThan(inside);
    expect(outside).toBeLessThan(-10);
  });
});

// ── sumSplDb — incoherent power summation ────────────────────────────────────
describe("sumSplDb", () => {
  it("returns ~103 dB when two 100 dB sources are added (10log10(2)=3)", () => {
    expect(sumSplDb([100, 100])).toBeCloseTo(103.01, 1);
  });
  it("adds a much weaker source with negligible effect", () => {
    // 100 + 70 dB → ~100.004 dB
    expect(sumSplDb([100, 70])).toBeCloseTo(100.004, 2);
  });
  it("returns the single value for a single-source array", () => {
    expect(sumSplDb([98])).toBeCloseTo(98, 5);
  });
});

// ── sourceSplAtPoint — inverse-square + directivity ──────────────────────────
describe("sourceSplAtPoint", () => {
  const src: Source = {
    x: 0, y: 6, z: -12,
    spl1m: 135,
    aimDx: 0, aimDy: -0.3, aimDz: 1, // aimed forward and slightly down
    coverageH: 90,
    coverageV: 20,
  };
  it("obeys inverse-square: doubling distance costs 6 dB", () => {
    // Directly on-axis (approximately), 10 m and 20 m away in the aim direction
    // Point 1: 10 m along the aim direction from src position.
    const aimLen = Math.hypot(src.aimDx, src.aimDy, src.aimDz);
    const ux = src.aimDx / aimLen;
    const uy = src.aimDy / aimLen;
    const uz = src.aimDz / aimLen;
    const p1 = { x: src.x + 10 * ux, y: src.y + 10 * uy, z: src.z + 10 * uz };
    const p2 = { x: src.x + 20 * ux, y: src.y + 20 * uy, z: src.z + 20 * uz };
    const spl1 = sourceSplAtPoint(src, p1.x, p1.y, p1.z, 1000);
    const spl2 = sourceSplAtPoint(src, p2.x, p2.y, p2.z, 1000);
    // The diff must be approximately -6 dB (plus a tiny air absorption over
    // an extra 10 m ≈ 0.055 dB at 1 kHz).
    expect(spl1 - spl2).toBeCloseTo(6.05, 1);
  });
  it("attenuates further at 8 kHz vs. 1 kHz for the same distance (air absorption)", () => {
    const spl1k = sourceSplAtPoint(src, 0, 1.6, 15, 1000);
    const spl8k = sourceSplAtPoint(src, 0, 1.6, 15, 8000);
    expect(spl1k).toBeGreaterThan(spl8k);
  });
});

// ── computeSplGrid ────────────────────────────────────────────────────────────
describe("computeSplGrid", () => {
  const sources: Source[] = [
    { x: -3, y: 8, z: -14, spl1m: 135, aimDx: 0.1, aimDy: -0.4, aimDz: 1, coverageH: 90, coverageV: 20 },
    { x:  3, y: 8, z: -14, spl1m: 135, aimDx: -0.1, aimDy: -0.4, aimDz: 1, coverageH: 90, coverageV: 20 },
  ];

  it("produces a grid of the requested shape", () => {
    const grid = computeSplGrid(room, sources, { cols: 12, rows: 16 });
    expect(grid.cols).toBe(12);
    expect(grid.rows).toBe(16);
    expect(grid.cells.length).toBe(12 * 16);
  });

  it("SPL varies significantly across the audience depth (physical decay + directivity)", () => {
    const grid = computeSplGrid(room, sources, { cols: 8, rows: 12 });
    const frontRowMean = mean(grid.cells.slice(0, grid.cols));
    const backRowMean = mean(grid.cells.slice(-grid.cols));
    // Whichever end is closer to the aim axis wins; either direction the
    // spread must be significant (line array physics), and both rows must
    // still be reasonable audible SPL, not silence.
    const spread = Math.abs(frontRowMean - backRowMean);
    expect(spread).toBeGreaterThan(3);
    expect(spread).toBeLessThan(40);
    expect(frontRowMean).toBeGreaterThan(60);
    expect(backRowMean).toBeGreaterThan(60);
  });

  it("center column has HIGHER SPL than the outer columns (on-axis physics)", () => {
    // Use nadir-pointing sources so directivity effects flip the front/back
    // relationship less; here we test lateral coverage.
    const centreAimed: Source[] = [
      { x: 0, y: 8, z: -14, spl1m: 135, aimDx: 0, aimDy: -0.3, aimDz: 1, coverageH: 60, coverageV: 40 },
    ];
    const grid = computeSplGrid(room, centreAimed, { cols: 11, rows: 5 });
    // For each row, compare centre column to leftmost column
    let centreHigherCount = 0;
    for (let r = 0; r < grid.rows; r++) {
      const centreIdx = r * grid.cols + Math.floor(grid.cols / 2);
      const leftIdx = r * grid.cols + 0;
      if (grid.cells[centreIdx] > grid.cells[leftIdx]) centreHigherCount++;
    }
    expect(centreHigherCount).toBeGreaterThanOrEqual(grid.rows - 1);
  });

  it("reports non-Infinite stats", () => {
    const grid = computeSplGrid(room, sources);
    expect(Number.isFinite(grid.min)).toBe(true);
    expect(Number.isFinite(grid.max)).toBe(true);
    expect(Number.isFinite(grid.mean)).toBe(true);
    expect(grid.spread).toBe(Math.round((grid.max - grid.min) * 10) / 10);
    expect(grid.uniformityPct).toBeGreaterThanOrEqual(0);
    expect(grid.uniformityPct).toBeLessThanOrEqual(100);
  });

  it("empty source list produces -Infinity SPL everywhere", () => {
    const grid = computeSplGrid(room, [], { cols: 4, rows: 4 });
    expect(grid.cells.every((c) => c === -Infinity)).toBe(true);
  });
});

// ── sampleGrid — bilinear sampling ────────────────────────────────────────────
describe("sampleGrid", () => {
  it("returns a finite value for a coordinate inside the grid bounds", () => {
    const grid = computeSplGrid(room, [
      { x: 0, y: 8, z: -14, spl1m: 135, aimDx: 0, aimDy: -0.3, aimDz: 1, coverageH: 90, coverageV: 20 },
    ]);
    const v = sampleGrid(grid, 0, 5);
    expect(Number.isFinite(v)).toBe(true);
  });
  it("returns NaN for coordinates outside bounds", () => {
    const grid = computeSplGrid(room, [
      { x: 0, y: 8, z: -14, spl1m: 135, aimDx: 0, aimDy: -0.3, aimDz: 1, coverageH: 90, coverageV: 20 },
    ]);
    expect(Number.isNaN(sampleGrid(grid, 999, 0))).toBe(true);
  });
});

// ── solveLineArray ────────────────────────────────────────────────────────────
describe("solveLineArray", () => {
  it("produces N absolute + N splay angles for N boxes", () => {
    const plan = solveLineArray({
      numBoxes: 8,
      singleBoxCoverageV: 10,
      flownHeight: 7,
      zNear: 3,
      zFar: 25,
    });
    expect(plan.aimAngles.length).toBe(8);
    expect(plan.splayAngles.length).toBe(8);
    expect(plan.splayAngles[0]).toBe(0);
  });

  it("top boxes aim shallower than bottom boxes (J-array)", () => {
    const plan = solveLineArray({
      numBoxes: 6,
      singleBoxCoverageV: 10,
      flownHeight: 7,
      zNear: 3,
      zFar: 25,
    });
    // First box aims at far field → shallow angle; last box aims near → steep angle
    expect(plan.aimAngles[0]).toBeLessThan(plan.aimAngles[plan.aimAngles.length - 1]);
  });

  it("splay angles are all non-negative", () => {
    const plan = solveLineArray({
      numBoxes: 10,
      singleBoxCoverageV: 8,
      flownHeight: 8,
      zNear: 4,
      zFar: 30,
    });
    expect(plan.splayAngles.every((s) => s >= 0)).toBe(true);
  });

  it("throws on invalid input", () => {
    expect(() => solveLineArray({ numBoxes: 4, singleBoxCoverageV: 10, flownHeight: 6, zNear: 0, zFar: 20 })).toThrow();
    expect(() => solveLineArray({ numBoxes: 4, singleBoxCoverageV: 10, flownHeight: 6, zNear: 5, zFar: 3 })).toThrow();
    expect(() => solveLineArray({ numBoxes: 4, singleBoxCoverageV: 40, flownHeight: 6, zNear: 3, zFar: 20 })).toThrow();
  });

  it("degrades gracefully for single-box array (no splay computable)", () => {
    const plan = solveLineArray({
      numBoxes: 1,
      singleBoxCoverageV: 10,
      flownHeight: 7,
      zNear: 3,
      zFar: 25,
    });
    expect(plan.aimAngles.length).toBe(1);
    expect(plan.splayAngles.length).toBe(1);
    expect(plan.notes.length).toBeGreaterThan(0);
  });

  it("predicts SPL uniformity (spread should be reasonable for a well-tuned array)", () => {
    const plan = solveLineArray({
      numBoxes: 10,
      singleBoxCoverageV: 8,
      flownHeight: 8,
      zNear: 4,
      zFar: 30,
      spl1mPerBox: 138,
    });
    // For a 10-box array over 4-30 m, the ideal J-array gets < 10 dB spread
    // (before any EQ/gain shading is applied).
    expect(plan.predictedSpread).toBeGreaterThan(0);
    expect(plan.predictedSpread).toBeLessThan(15);
  });
});

describe("buildLineArrayInput", () => {
  const box: GearItem = {
    id: "test-box",
    brand: "Test",
    model: "LR-8",
    category: "tops",
    active: true,
    splMax: 138,
    coverageH: 90,
    coverageV: 8,
    freqLow: 60,
    freqHigh: 20000,
  };
  it("produces a valid input from a real GearItem", () => {
    const input = buildLineArrayInput(box, 8, 25);
    expect(input.numBoxes).toBe(8);
    expect(input.singleBoxCoverageV).toBe(8);
    expect(input.spl1mPerBox).toBe(138);
    expect(input.zFar).toBeGreaterThan(input.zNear);
  });
  it("clamps unrealistic single-box coverage to 4-20 range", () => {
    const wideBox: GearItem = { ...box, coverageV: 60 };
    const input = buildLineArrayInput(wideBox, 4, 15);
    expect(input.singleBoxCoverageV).toBeLessThanOrEqual(20);
    expect(input.singleBoxCoverageV).toBeGreaterThanOrEqual(4);
  });
});

// helper
function mean(arr: number[]) {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}
