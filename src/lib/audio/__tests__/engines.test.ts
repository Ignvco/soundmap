import { describe, it, expect } from "vitest";
import { calculateAcoustics, type RoomScanInput } from "@/lib/audio/acoustics.ts";
import { calculateCrossover, calculatePARecommendation, gearMatchScore, type GearItem } from "@/lib/audio/pa-engine.ts";
import { computeCoveragePercent } from "@/lib/audio/coverage.ts";

const CLUB_ROOM: RoomScanInput = {
  name: "Test Club",
  length: 25,
  width: 15,
  height: 5,
  capacity: 300,
  ceilingType: "flat",
  wallMaterial: "concrete",
  floorType: "concrete",
  windowCount: 0,
};

const DRY_ROOM: RoomScanInput = {
  ...CLUB_ROOM,
  wallMaterial: "carpet",
  floorType: "carpet",
  ceilingType: "acoustic-tile",
};

const TOP_ITEM: GearItem = {
  id: "test-top", brand: "T", model: "M1", category: "tops", active: true,
  splMax: 138, freqLow: 55, freqHigh: 20000, coverageH: 90, quantity: 2,
};
const SUB_ITEM: GearItem = {
  id: "test-sub", brand: "T", model: "S1", category: "subs", active: true,
  splMax: 142, freqLow: 32, freqHigh: 120, quantity: 2,
};

describe("acoustics engine", () => {
  it("calculates volume correctly", () => {
    const r = calculateAcoustics(CLUB_ROOM);
    expect(r.volume).toBe(25 * 15 * 5);
  });

  it("has lower RT60 in dry rooms", () => {
    const wet = calculateAcoustics(CLUB_ROOM);
    const dry = calculateAcoustics(DRY_ROOM);
    expect(dry.rt60Audience).toBeLessThan(wet.rt60Audience);
  });

  it("flags flutter echo on concrete", () => {
    const r = calculateAcoustics(CLUB_ROOM);
    expect(r.flutterEchoRisk).toBe(true);
  });

  it("produces speech + music scores in [0,100]", () => {
    const r = calculateAcoustics(CLUB_ROOM);
    expect(r.speechScore).toBeGreaterThanOrEqual(0);
    expect(r.speechScore).toBeLessThanOrEqual(100);
    expect(r.musicScore).toBeGreaterThanOrEqual(0);
    expect(r.musicScore).toBeLessThanOrEqual(100);
  });
});

describe("calculateCrossover", () => {
  it("returns 0 crossover when no subs are provided", () => {
    const plan = calculateCrossover([TOP_ITEM], []);
    expect(plan.crossoverFreq).toBe(0);
    expect(plan.topHpf).toBeGreaterThan(0);
  });

  it("derives crossover from top freq low", () => {
    const plan = calculateCrossover([TOP_ITEM], [SUB_ITEM]);
    expect(plan.crossoverFreq).toBeGreaterThanOrEqual(60);
    expect(plan.crossoverFreq).toBeLessThanOrEqual(130);
    expect(plan.topHpf).toBe(plan.crossoverFreq);
    expect(plan.subLpf).toBe(plan.crossoverFreq);
    expect(plan.subHpf).toBeGreaterThanOrEqual(25);
  });

  it("uses worst-case (highest topLow) when mixing multiple top models", () => {
    const top1 = { ...TOP_ITEM, id: "t1", freqLow: 55 };
    const top2 = { ...TOP_ITEM, id: "t2", freqLow: 90 };
    const plan = calculateCrossover([top1, top2], [SUB_ITEM]);
    // Should crossover based on the worst top (90 Hz), not the best (55 Hz)
    expect(plan.crossoverFreq).toBeGreaterThanOrEqual(90);
  });
});

describe("calculatePARecommendation", () => {
  it("marks systemReady = false without tops", () => {
    const acoustics = calculateAcoustics(CLUB_ROOM);
    const rec = calculatePARecommendation(CLUB_ROOM, acoustics, [], [], [], []);
    expect(rec.systemReady).toBe(false);
  });

  it("marks systemReady = true with tops", () => {
    const acoustics = calculateAcoustics(CLUB_ROOM);
    const rec = calculatePARecommendation(CLUB_ROOM, acoustics, [TOP_ITEM], [SUB_ITEM], [], []);
    expect(rec.systemReady).toBe(true);
    expect(rec.crossoverFreq).toBeGreaterThan(0);
  });
});

describe("gearMatchScore", () => {
  it("returns score in [50,99]", () => {
    const s = gearMatchScore(TOP_ITEM, 300, 1.2);
    expect(s).toBeGreaterThanOrEqual(50);
    expect(s).toBeLessThanOrEqual(99);
  });

  it("penalizes overkill in small rooms", () => {
    const monsterTop = { ...TOP_ITEM, splMax: 145 };
    const smallScore = gearMatchScore(monsterTop, 80, 1.0);
    const properScore = gearMatchScore({ ...TOP_ITEM, splMax: 128 }, 80, 1.0);
    expect(properScore).toBeGreaterThan(smallScore);
  });
});

describe("computeCoveragePercent", () => {
  it("returns 0 with no room or no tops", () => {
    expect(computeCoveragePercent(null, [TOP_ITEM])).toBe(0);
    expect(computeCoveragePercent(CLUB_ROOM, [])).toBe(0);
  });

  it("returns 0-100 range and increases with count", () => {
    const one = computeCoveragePercent(CLUB_ROOM, [{ ...TOP_ITEM, quantity: 1 }]);
    const four = computeCoveragePercent(CLUB_ROOM, [{ ...TOP_ITEM, quantity: 4 }]);
    expect(one).toBeGreaterThanOrEqual(0);
    expect(one).toBeLessThanOrEqual(100);
    expect(four).toBeGreaterThanOrEqual(one);
  });
});

describe("calculateCrossover — rigs mixtos", () => {
  it("protects the top that goes lowest-least in a mixed rig", () => {
    const t1 = { ...TOP_ITEM, id: "t1", freqLow: 55 };
    const t2 = { ...TOP_ITEM, id: "t2", freqLow: 90 };
    const plan = calculateCrossover([t1, t2], [SUB_ITEM]);
    // El cruce nunca puede quedar por debajo del límite del top más restrictivo.
    expect(plan.crossoverFreq).toBeGreaterThanOrEqual(90);
  });

  it("takes the most conservative LPF across mixed tops", () => {
    const t1 = { ...TOP_ITEM, id: "t1", freqHigh: 20000 };
    const t2 = { ...TOP_ITEM, id: "t2", freqHigh: 16000 };
    expect(calculateCrossover([t1, t2], [SUB_ITEM]).topLpf).toBe(16000);
  });

  it("sets the subsonic HPF from the sub that goes lowest-least", () => {
    const s1 = { ...SUB_ITEM, id: "s1", freqLow: 30 };
    const s2 = { ...SUB_ITEM, id: "s2", freqLow: 45 };
    const plan = calculateCrossover([TOP_ITEM], [s1, s2]);
    expect(plan.subHpf).toBeGreaterThanOrEqual(40);
  });

  it("flags it when the sub ceiling forces a crossover below the top's limit", () => {
    const highTop = { ...TOP_ITEM, id: "ht", freqLow: 130 };
    const lowSub = { ...SUB_ITEM, id: "ls", freqHigh: 80 };
    const plan = calculateCrossover([highTop], [lowSub]);
    expect(plan.crossoverFreq).toBeLessThan(130);
    expect(plan.reasons.some((r) => r.includes("⚠"))).toBe(true);
  });

  it("explains the mixed-rig decision to the user", () => {
    const t1 = { ...TOP_ITEM, id: "t1", freqLow: 55 };
    const t2 = { ...TOP_ITEM, id: "t2", freqLow: 90 };
    const plan = calculateCrossover([t1, t2], [SUB_ITEM]);
    expect(plan.reasons.some((r) => r.toLowerCase().includes("mixto"))).toBe(true);
  });
});
