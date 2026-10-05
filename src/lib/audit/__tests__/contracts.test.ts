import { calculateAcoustics, type RoomScanInput } from "@/lib/audio/acoustics";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import { generateDSPConfig } from "@/lib/audio/dsp-engine";
import { bandReverberation, geometrySchema } from "@/lib/audio/geometry";
import type { GearItem } from "@/lib/audio/pa-engine";
import { optimizeStage } from "@/lib/audio/stage-optimizer";
import { applyBackup, parseBackup } from "@/lib/backup";
import {
  flushPersistence,
  localDatabase,
  undoLastImport,
} from "@/lib/persistence";
import { hasUnsavedRevision, useAppStore } from "@/store/app";
import { describe, expect, it } from "vitest";
import { invalidateReviews, newAudit } from "../document";
import { createReport } from "../report";
const room: RoomScanInput = {
  name: "QA sala",
  width: 10,
  length: 15,
  height: 3,
  capacity: 100,
  ceilingType: "flat",
  wallMaterial: "brick",
  floorType: "wood",
  windowCount: 0,
};
const top: GearItem = {
  id: "qa",
  brand: "Test",
  model: "A",
  category: "tops",
  active: true,
  splMax: 130,
  quantity: 2,
};
describe("revision and persistence contracts", () => {
  it("reopens reviews after input changes without destroying their evidence", () => {
    const a = newAudit();
    a.reviews.dsp = { state: "verified", note: "Measured on device" };
    expect(invalidateReviews(a, ["dsp"]).reviews.dsp).toEqual({
      state: "pending",
      note: "Measured on device",
      reviewedAt: undefined,
    });
  });
  it("freezes report source values, saved revision and common evaluator", async () => {
    const s = useAppStore.getState();
    s.resetSystem();
    s.applyRoomScan(room, calculateAcoustics(room));
    s.setGear("tops", [top]);
    s.saveRevision();
    const state = useAppStore.getState();
    expect(hasUnsavedRevision(state)).toBe(false);
    const report = await createReport(state);
    s.updateSpeakerPlacement("tops:qa:0", { normX: 90 });
    s.updateAudit({ conclusion: "Changed later" });
    expect(report.source.audit.conclusion).toBe("");
    expect(report.evaluation.fohSpl).toBe(
      evaluateAudit({ room, tops: [top], subs: [] }).fohSpl,
    );
    expect(report.fingerprint).toHaveLength(64);
    expect(report.draft).toBe(false);
  });
  it("rejects invalid nested room data and future formats before a write", async () => {
    await flushPersistence();
    const before = await localDatabase.getItem("soundmap-store");
    const invalid = {
      _kind: "soundmap.backup",
      _version: 2,
      exportedAt: "now",
      data: {
        "soundmap-store": {
          version: 4,
          state: { room: { ...room, length: -5 } },
        },
      },
    };
    expect(() => parseBackup(invalid)).toThrow();
    await expect(
      applyBackup(invalid as Parameters<typeof applyBackup>[0]),
    ).rejects.toThrow();
    expect(await localDatabase.getItem("soundmap-store")).toBe(before);
    expect(() => parseBackup({ ...invalid, _version: 99 })).toThrow();
  });
  it("restores the complete state from before the last import", async () => {
    const before = JSON.stringify({
      version: 2,
      state: {
        units: "metric",
        theme: "dark",
        defaultVenueType: "club",
        soundEnabled: true,
        hapticsEnabled: true,
      },
    });
    await localDatabase.setItem("soundmap-settings", before);
    const after = JSON.parse(before);
    after.state.soundEnabled = false;
    await applyBackup({
      _kind: "soundmap.backup",
      _version: 2,
      exportedAt: "now",
      data: { "soundmap-settings": after },
    });
    expect(
      JSON.parse((await localDatabase.getItem("soundmap-settings")) as string)
        .state.soundEnabled,
    ).toBe(false);
    await undoLastImport();
    expect(await localDatabase.getItem("soundmap-settings")).toBe(before);
  });
});
describe("shared physics and geometry", () => {
  it("uses edited DSP gain equally at FOH and across the grid", () => {
    const a = calculateAcoustics(room),
      dsp = generateDSPConfig(room, a, [top], [], [], null);
    for (const out of dsp.outputs) {
      out.gain = -6;
      out.hpfHz = 0;
      out.lpfHz = 0;
    }
    const x = evaluateAudit({ room, tops: [top], subs: [] }),
      y = evaluateAudit({ room, tops: [top], subs: [], dsp });
    expect(x.fohSpl! - y.fohSpl!).toBeCloseTo(6, 8);
    expect(x.grid!.mean - y.grid!.mean).toBeCloseTo(6, 1);
  });
  it("coherent polarity cancellation only occurs in the explicit coherent mode", () => {
    const layout = {
      "tops:qa:0": { normX: 50, normY: 20, heightM: 2 },
      "tops:qa:1": { normX: 50, normY: 20, heightM: 2, inverted: true },
    };
    const e = evaluateAudit({
        room,
        tops: [top],
        subs: [],
        stageLayout: layout,
      }),
      c = evaluateAudit({
        room: { ...room, simulationMode: "coherent" },
        tops: [top],
        subs: [],
        stageLayout: layout,
      });
    expect(e.fohSpl! - c.fohSpl!).toBeGreaterThan(100);
  });
  it("optimizer preserves exact unit IDs and fits low ceilings, and can cancel", async () => {
    const results = await optimizeStage({ ...room, height: 2.2 }, [top], [], {
      topN: 1,
    });
    expect(Object.keys(results[0].layout).sort()).toEqual([
      "tops:qa:0",
      "tops:qa:1",
    ]);
    for (const p of Object.values(results[0].layout))
      expect(p.heightM!).toBeLessThanOrEqual(1.8);
    expect(
      evaluateAudit({
        room: { ...room, height: 2.2 },
        tops: [top],
        subs: [],
        stageLayout: results[0].layout,
      }).grid?.mean,
    ).toBe(results[0].grid.mean);
    const abort = new AbortController();
    abort.abort();
    expect(
      await optimizeStage(room, [top], [], { signal: abort.signal }),
    ).toEqual([]);
  });
  it("rejects intersecting polygons and evaluates Sabine versus Eyring independently", () => {
    expect(
      geometrySchema.safeParse({
        outline: [
          { x: 0, z: 0 },
          { x: 4, z: 4 },
          { x: 0, z: 4 },
          { x: 4, z: 0 },
        ],
        source: "test",
      }).success,
    ).toBe(false);
    const surfaces = [
      {
        id: "s",
        label: "s",
        areaM2: 100,
        alpha: [0.5, 0.5, 0.5, 0.5, 0.5, 0.5] as [
          number,
          number,
          number,
          number,
          number,
          number,
        ],
        source: "reference",
      },
    ];
    expect(bandReverberation(100, surfaces, 0, "sabine")[0].rt60).toBeCloseTo(
      0.322,
    );
    expect(bandReverberation(100, surfaces, 0, "eyring")[0].rt60).toBeCloseTo(
      0.161 / Math.log(2),
    );
  });
});
