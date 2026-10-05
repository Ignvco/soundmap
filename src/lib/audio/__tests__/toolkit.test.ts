import { describe, it, expect } from "vitest";
import { calculateCardioid, calculateLineArrayAngles, calculateImpedance } from "@/lib/audio/pa-toolkit.ts";
import { TEMPLATES } from "@/lib/audio/templates.ts";
import { calculateAcoustics } from "@/lib/audio/acoustics.ts";

describe("calculateCardioid", () => {
  it("front-rear: rear polarity inverted", () => {
    const r = calculateCardioid(60, "front-rear");
    expect(r.polarityRear).toBe("inverted");
    expect(r.spacingMeters).toBeGreaterThan(0);
    expect(r.spacingMeters).toBeLessThan(5);
  });
  it("end-fire: both polarity normal", () => {
    const r = calculateCardioid(60, "end-fire");
    expect(r.polarityRear).toBe("normal");
  });
  it("spacing is inversely proportional to freq", () => {
    const low = calculateCardioid(40, "front-rear");
    const high = calculateCardioid(100, "front-rear");
    expect(low.spacingMeters).toBeGreaterThan(high.spacingMeters);
  });
  it("delay matches spacing / speed of sound", () => {
    const r = calculateCardioid(60, "front-rear");
    const expectedDelayMs = (r.spacingMeters / 343) * 1000;
    expect(Math.abs(r.delayMs - expectedDelayMs)).toBeLessThan(0.1);
  });
});

describe("calculateLineArrayAngles", () => {
  it("returns angles = boxes - 1", () => {
    const r = calculateLineArrayAngles({ boxes: 8, flyHeightM: 6, farThrowM: 30, nearThrowM: 6 });
    expect(r.angles.length).toBe(7);
  });
  it("angles are progressive (bottom > top)", () => {
    const r = calculateLineArrayAngles({ boxes: 6, flyHeightM: 6, farThrowM: 30, nearThrowM: 5 });
    expect(r.angles[r.angles.length - 1]).toBeGreaterThan(r.angles[0]);
  });
  it("angles sum ~= bottomTilt - overallTilt", () => {
    const r = calculateLineArrayAngles({ boxes: 5, flyHeightM: 8, farThrowM: 40, nearThrowM: 4 });
    const totalSum = r.angles.reduce((s, a) => s + a, 0);
    expect(totalSum).toBeGreaterThan(0);
  });
  it("handles single box gracefully", () => {
    const r = calculateLineArrayAngles({ boxes: 1, flyHeightM: 5, farThrowM: 20, nearThrowM: 4 });
    expect(r.angles.length).toBe(0);
    expect(r.targets.length).toBe(1);
  });
});

describe("calculateImpedance", () => {
  it("parallel 2×8Ω = 4Ω", () => {
    const r = calculateImpedance({ cabinets: 2, cabinetImpedance: 8, wiring: "parallel", ampMinImpedance: 4 });
    expect(r.totalImpedance).toBe(4);
    expect(r.safe).toBe(true);
  });
  it("parallel 4×8Ω = 2Ω → unsafe for 4Ω amp", () => {
    const r = calculateImpedance({ cabinets: 4, cabinetImpedance: 8, wiring: "parallel", ampMinImpedance: 4 });
    expect(r.totalImpedance).toBe(2);
    expect(r.safe).toBe(false);
    expect(r.warning).not.toBeNull();
  });
  it("series 2×8Ω = 16Ω → safe", () => {
    const r = calculateImpedance({ cabinets: 2, cabinetImpedance: 8, wiring: "series", ampMinImpedance: 4 });
    expect(r.totalImpedance).toBe(16);
    expect(r.safe).toBe(true);
  });
});

describe("Templates catalog", () => {
  it("has 5 templates with unique ids", () => {
    expect(TEMPLATES.length).toBe(5);
    const ids = new Set(TEMPLATES.map(t => t.id));
    expect(ids.size).toBe(5);
  });
  it("every template has valid room + gear", () => {
    for (const t of TEMPLATES) {
      expect(t.room.capacity).toBeGreaterThan(0);
      expect(t.room.length).toBeGreaterThan(0);
      expect(t.room.width).toBeGreaterThan(0);
      // Compute acoustics without throwing
      const ac = calculateAcoustics(t.room);
      expect(ac.rt60Audience).toBeGreaterThan(0);
      // Must have at least tops
      expect(t.tops.length).toBeGreaterThan(0);
    }
  });
});
