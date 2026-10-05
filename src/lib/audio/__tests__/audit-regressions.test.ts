import { evaluateAudit } from "../audit-evaluator";
import { lr24, lr24Db, magnitudeDb } from "../filters";
import { layoutSources, layoutSpeakers } from "@/lib/speaker-layout";
import { computeSplGrid } from "../spl-grid";
import type { GearItem } from "../pa-engine";
import { describe, expect, it } from "vitest";
import { calculateAcoustics, type RoomScanInput } from "../acoustics";
import { calculateCardioid, cardioidResponseDb } from "../pa-toolkit";
import { useAppStore } from "@/store/app";

const room: RoomScanInput = { name: "Sala", length: 15, width: 10, height: 3,
  capacity: 100, ceilingType: "flat", wallMaterial: "concrete", floorType: "concrete",
  windowCount: 0, occupancyPct: 50 };

describe("audit regressions: absorption and complete saved scenes", () => {
  it("QA-01 interpolates occupied absorption before applying Sabine", () => {
    const result = calculateAcoustics(room);
    expect(result.rt60Occupied).toBeCloseTo(0.161 * 450 / (10.5 + 50 * 0.4), 2);
    expect(calculateAcoustics({ ...room, occupancyPct: 0 }).rt60Occupied).toBe(result.rt60Empty);
    expect(calculateAcoustics({ ...room, occupancyPct: 100 }).rt60Occupied).toBe(result.rt60Audience);
  });
  it("limits glass area to the room walls", () => {
    expect(calculateAcoustics({ ...room, windowCount: 100000 }).rt60Empty).toBeGreaterThan(0);
  });
  it("QA-09 editing a draft never rewrites only the layout of a saved scene", () => {
    const app = useAppStore.getState();
    app.resetSystem();
    app.applyRoomScan(room, calculateAcoustics(room));
    app.saveScene("A");
    const id = useAppStore.getState().activeSceneId!;
    app.applyRoomScan({ ...room, length: 25 }, calculateAcoustics({ ...room, length: 25 }));
    app.updateSpeakerPlacement("tops:fixture:0", { normX: 40, normY: 20, heightM: 2 });
    app.loadScene(id);
    expect(useAppStore.getState().room?.length).toBe(15);
    expect(useAppStore.getState().stageLayout).toEqual({});
    app.deleteScene(id);
    app.resetSystem();
  });
});

it("end-fire delays the front cabinet and sums in the forward direction", () => {
  const c = 343, f = 80, spacing = c / f / 3, delay = spacing / c * 1000;
  expect(cardioidResponseDb(f, 0, spacing, delay, 0, 1, c)).toBeCloseTo(6.0206, 3);
  expect(cardioidResponseDb(f, 180, spacing, delay, 0, 1, c)).toBeCloseTo(0, 4);
  expect(calculateCardioid(f, "end-fire").delayTarget).toBe("front");
});

const top: GearItem = { id: "top", brand: "Test", model: "Reference", active: true, category: "tops", splMax: 130, quantity: 2, coverageH: 90, coverageV: 90 };
it("QA-03 attenuates a sub outside its declared useful band", () => {
  const sub: GearItem = { ...top, category: "subs", freqLow: 35, freqHigh: 100, quantity: 1 };
  const low = evaluateAudit({ room, tops: [], subs: [sub] }, 63);
  const high = evaluateAudit({ room, tops: [], subs: [sub] }, 1000);
  expect(low.grid!.mean - high.grid!.mean).toBeGreaterThan(65);
});
it("QA-04 has no level or coverage when there is no source", () => {
  const e = evaluateAudit({ room, tops: [], subs: [] });
  expect(e.fohSpl).toBeNull(); expect(e.grid).toBeNull(); expect(e.coveragePct).toBeNull();
});
it("QA-06 relative uniformity is invariant under common gain", () => {
  const sources = layoutSources(layoutSpeakers(room, [top], []));
  const a = computeSplGrid(room, sources), b = computeSplGrid(room, sources.map(s => ({ ...s, spl1m: s.spl1m - 30 })));
  expect(a.uniformityPct).toBe(b.uniformityPct);
  expect(a.mean - b.mean).toBeCloseTo(30, 8);
});
it("QA-07 LR24 is -24.61 dB at twice cutoff and aligned branches sum flat", () => {
  expect(lr24Db(250, 125, "lp")).toBeCloseTo(-24.609, 2);
  for (const f of [31, 63, 125, 250, 1000]) {
    const h = lr24(f, 125, "hp"), l = lr24(f, 125, "lp");
    expect(magnitudeDb({ re: h.re + l.re, im: h.im + l.im })).toBeCloseTo(0, 8);
  }
});
