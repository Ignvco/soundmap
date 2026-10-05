// Optimizer + Session Recorder tests.
import { describe, it, expect, beforeEach } from "vitest";
import { optimizeStage } from "../stage-optimizer.ts";
import { SessionRecorder, euComplianceLabel } from "../session-recorder.ts";
import type { RoomScanInput } from "../acoustics.ts";
import type { GearItem } from "../pa-engine.ts";

const room: RoomScanInput = {
  name: "Optimizer Test",
  length: 25,
  width: 18,
  height: 8,
  capacity: 400,
  ceilingType: "flat",
  wallMaterial: "concrete",
  floorType: "concrete",
  windowCount: 0,
};

const top: GearItem = {
  id: "top-1", brand: "Test", model: "Line-8", category: "tops", active: true,
  splMax: 135, coverageH: 90, coverageV: 15, freqLow: 60, freqHigh: 20000, quantity: 4,
};
const sub: GearItem = {
  id: "sub-1", brand: "Test", model: "Sub-18", category: "subs", active: true,
  splMax: 138, coverageH: 180, coverageV: 180, freqLow: 30, freqHigh: 120, quantity: 4,
};

// ── Optimizer ────────────────────────────────────────────────────────────────
describe("optimizeStage", () => {
  it("returns the requested number of top candidates, best first", async () => {
    const result = await optimizeStage(room, [top], [sub], { topN: 3, cols: 8, rows: 10 });
    expect(result).toHaveLength(3);
    // Best first
    expect(result[0].score).toBeGreaterThanOrEqual(result[1].score);
    expect(result[1].score).toBeGreaterThanOrEqual(result[2].score);
  }, 15000);

  it("fills the label and grid for each candidate", async () => {
    const result = await optimizeStage(room, [top], [sub], { topN: 1, cols: 6, rows: 8 });
    const first = result[0];
    expect(first.label).toContain("Tops @");
    expect(first.label).toContain("Splay");
    expect(first.grid.uniformityPct).toBeGreaterThanOrEqual(0);
    expect(first.grid.uniformityPct).toBeLessThanOrEqual(100);
    expect(Number.isFinite(first.grid.mean)).toBe(true);
  }, 10000);

  it("returns empty when there is no gear (no sources)", async () => {
    const result = await optimizeStage(room, [], [], { topN: 3, cols: 6, rows: 8 });
    expect(result).toHaveLength(0);
  });

  it("emits progress callbacks between 0 and 1", async () => {
    const seen: number[] = [];
    await optimizeStage(room, [top], [sub], {
      topN: 1,
      cols: 6, rows: 8,
      onProgress: (f) => seen.push(f),
    });
    expect(seen.length).toBeGreaterThan(0);
    expect(seen[seen.length - 1]).toBe(1);
    for (const v of seen) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThanOrEqual(1);
    }
  }, 15000);

  it("best candidate has uniformityPct at least as good as any single candidate", async () => {
    const result = await optimizeStage(room, [top], [sub], { topN: 5, cols: 8, rows: 10 });
    const bestUniformity = result[0].grid.uniformityPct;
    for (const c of result.slice(1)) {
      // Not strictly ≥ because score also punishes spread and rewards mean SPL,
      // but the top candidate should be at least within 15 percentage points
      // of the highest raw uniformity in the top-N.
      expect(bestUniformity + 15).toBeGreaterThanOrEqual(c.grid.uniformityPct);
    }
  }, 15000);
});

// ── SessionRecorder ──────────────────────────────────────────────────────────
describe("SessionRecorder", () => {
  let rec: SessionRecorder;
  beforeEach(() => {
    rec = new SessionRecorder();
  });

  it("starts empty", () => {
    expect(rec.isRecording()).toBe(false);
    expect(rec.sampleCount).toBe(0);
    const s = rec.summary();
    expect(s.durationSec).toBe(0);
    expect(s.samples).toBe(0);
  });

  it("captures samples between start() and stop()", async () => {
    rec.start();
    expect(rec.isRecording()).toBe(true);
    rec.push(80);
    await new Promise((r) => setTimeout(r, 50));
    rec.push(85);
    await new Promise((r) => setTimeout(r, 50));
    rec.push(90);
    rec.stop();
    expect(rec.isRecording()).toBe(false);
    expect(rec.sampleCount).toBe(3);
    const s = rec.summary();
    expect(s.samples).toBe(3);
    expect(s.peak).toBe(90);
    expect(s.min).toBe(80);
    expect(s.mean).toBeCloseTo(85, 0);
  });

  it("computes Leq near the arithmetic mean for a constant signal", async () => {
    rec.start();
    for (let i = 0; i < 10; i++) {
      rec.push(90);
      await new Promise((r) => setTimeout(r, 10));
    }
    const s = rec.summary();
    expect(s.leq).toBeGreaterThan(85);
    expect(s.leq).toBeLessThan(95);
  });

  it("Leq of 90 dB steady is HIGHER than Leq of alternating 80/90", async () => {
    // Two 100-sample recordings, one constant 90, one 80/90
    const a = new SessionRecorder();
    const b = new SessionRecorder();
    a.start();
    b.start();
    for (let i = 0; i < 20; i++) {
      a.push(90);
      b.push(i % 2 === 0 ? 80 : 90);
      await new Promise((r) => setTimeout(r, 8));
    }
    const sa = a.summary();
    const sb = b.summary();
    expect(sa.leq).toBeGreaterThan(sb.leq);
  });

  it("counts time above 85 / 90 / 95 dB correctly", async () => {
    rec.start();
    for (let i = 0; i < 5; i++) {
      rec.push(96);
      await new Promise((r) => setTimeout(r, 20));
    }
    const s = rec.summary();
    // The first push has dt=0 → does not accumulate. Subsequent 4 pushes each
    // contribute ~20 ms above all three thresholds.
    expect(s.timeAbove85).toBeGreaterThan(0);
    expect(s.timeAbove90).toBeGreaterThan(0);
    expect(s.timeAbove95).toBeGreaterThan(0);
    expect(s.timeAbove85).toBeCloseTo(s.timeAbove90, 2);
    expect(s.timeAbove90).toBeCloseTo(s.timeAbove95, 2);
  });

  it("classifies EU compliance according to LEX,8h", async () => {
    // A short burst of 120 dB should NOT trigger an EU action level because
    // LEX,8h is normalised to a full working day: only 400ms of 120 dB
    // scales to a very low daily exposure equivalent.
    rec.start();
    for (let i = 0; i < 20; i++) {
      rec.push(120);
      await new Promise((r) => setTimeout(r, 20));
    }
    const short = rec.summary();
    expect(short.euCompliance).toBe("safe");
    // But by design when integrated over a long enough session, the same
    // 120 dB level DOES trigger the exposure limit. We simulate this by
    // resetting and running a longer session.
    rec.clear();
    rec.start();
    // 60 samples × ~70 ms = ~4 s of 120 dB — LEX,8h ≈ 81 dB (lower-action)
    for (let i = 0; i < 60; i++) {
      rec.push(120);
      await new Promise((r) => setTimeout(r, 70));
    }
    const long = rec.summary();
    expect(["lower-action", "upper-action", "exposure-limit"]).toContain(long.euCompliance);
    expect(long.exceedsAction).toBe(true);
  }, 15000);

  it("exports CSV with header + one row per sample", () => {
    rec.start();
    rec.push(80);
    rec.push(85);
    const csv = rec.toCSV();
    expect(csv).toContain("SoundMap session log");
    expect(csv).toContain("t_ms;spl_db;peak_db");
    // Should include the sample values
    expect(csv).toMatch(/;80\.0;/);
    expect(csv).toMatch(/;85\.0;/);
  });

  it("push() is a no-op when not recording", () => {
    rec.push(90);
    expect(rec.sampleCount).toBe(0);
  });

  it("clear() empties buffer", () => {
    rec.start();
    rec.push(80);
    rec.clear();
    expect(rec.sampleCount).toBe(0);
    expect(rec.isRecording()).toBe(false);
  });

  it("provides EU compliance labels with color for all levels", () => {
    for (const c of ["safe", "lower-action", "upper-action", "exposure-limit"] as const) {
      const label = euComplianceLabel(c);
      expect(label.label).toBeTruthy();
      expect(label.color).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
