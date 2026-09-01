// RT60 pure-function tests. These test the DSP core (Schroeder reverse
// integration + T20 crossing) without needing a real microphone.

import { describe, it, expect } from "vitest";
import {
  schroederReverseIntegrate,
  findDbCrossing,
  estimateRt60FromDecay,
  type EnvelopePoint,
} from "../rt60-measure.ts";

/** Synthesise an exponential decay: db(t) = -60/T * t (perfectly linear in dB). */
function syntheticDecay(rt60Sec: number, durationSec = 3, sampleRateHz = 50): EnvelopePoint[] {
  const dtSec = 1 / sampleRateHz;
  const slope = -60 / rt60Sec; // dB per second
  const out: EnvelopePoint[] = [];
  for (let t = 0; t <= durationSec; t += dtSec) {
    out.push({ t, db: slope * t });
  }
  return out;
}

/** Same as above but with pseudo-Gaussian noise added to the raw dB values. */
function noisyDecay(rt60Sec: number, noiseAmpDb: number, seed = 1): EnvelopePoint[] {
  const clean = syntheticDecay(rt60Sec);
  // Deterministic mulberry-ish PRNG for reproducibility
  let s = seed >>> 0;
  const rand = () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return clean.map((p) => ({ t: p.t, db: p.db + (rand() - 0.5) * 2 * noiseAmpDb }));
}

describe("findDbCrossing", () => {
  it("returns the exact time when the curve passes the target", () => {
    const curve: EnvelopePoint[] = [
      { t: 0, db: 0 },
      { t: 1, db: -20 },
      { t: 2, db: -40 },
    ];
    // −10 dB should be at t=0.5, −30 dB at t=1.5
    expect(findDbCrossing(curve, -10)).toBeCloseTo(0.5, 5);
    expect(findDbCrossing(curve, -30)).toBeCloseTo(1.5, 5);
  });
  it("returns null if the target is never reached", () => {
    const curve: EnvelopePoint[] = [
      { t: 0, db: 0 },
      { t: 1, db: -10 },
    ];
    expect(findDbCrossing(curve, -30)).toBeNull();
  });
});

describe("schroederReverseIntegrate", () => {
  it("normalises so the first sample is 0 dB", () => {
    const curve = syntheticDecay(1.0);
    const rev = schroederReverseIntegrate(curve);
    expect(rev[0].db).toBeCloseTo(0, 5);
  });
  it("produces a monotonically decreasing curve", () => {
    const curve = syntheticDecay(1.5);
    const rev = schroederReverseIntegrate(curve);
    for (let i = 1; i < rev.length; i++) {
      // Small floating-point slop is OK
      expect(rev[i].db).toBeLessThanOrEqual(rev[i - 1].db + 1e-6);
    }
  });
  it("handles empty input", () => {
    expect(schroederReverseIntegrate([])).toEqual([]);
  });
});

describe("estimateRt60FromDecay", () => {
  it("recovers RT60 = 1.0 s from a clean synthetic linear-dB decay (±10%)", () => {
    const rev = schroederReverseIntegrate(syntheticDecay(1.0));
    const est = estimateRt60FromDecay(rev);
    expect(est).not.toBeNull();
    expect(est!.rt60).toBeGreaterThan(0.85);
    expect(est!.rt60).toBeLessThan(1.15);
  });
  it("recovers RT60 = 2.5 s from a clean synthetic decay (±15% since curve is longer)", () => {
    const rev = schroederReverseIntegrate(syntheticDecay(2.5, 6));
    const est = estimateRt60FromDecay(rev);
    expect(est).not.toBeNull();
    expect(est!.rt60).toBeGreaterThan(2.1);
    expect(est!.rt60).toBeLessThan(2.9);
  });
  it("reports HIGH confidence when SNR is large and curve reaches −35 dB", () => {
    const rev = schroederReverseIntegrate(syntheticDecay(1.0, 4));
    const est = estimateRt60FromDecay(rev);
    expect(est!.confidence).toBe("high");
  });
  it("still gives a reasonable RT60 estimate with mild noise (±3 dB) added to raw envelope", () => {
    const rev = schroederReverseIntegrate(noisyDecay(1.2, 3, 42));
    const est = estimateRt60FromDecay(rev);
    expect(est).not.toBeNull();
    // With Schroeder integration, ±3 dB noise usually smooths to within ~20%.
    expect(est!.rt60).toBeGreaterThan(0.9);
    expect(est!.rt60).toBeLessThan(1.6);
  });
  it("returns null for a curve that never reaches −25 dB", () => {
    // Curve that decays only to −20 dB
    const curve: EnvelopePoint[] = [
      { t: 0, db: 0 },
      { t: 1, db: -10 },
      { t: 2, db: -20 },
    ];
    const rev = schroederReverseIntegrate(curve);
    const est = estimateRt60FromDecay(rev);
    expect(est).toBeNull();
  });
});
