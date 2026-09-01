// RT60 Measurement via microphone
//
// Method: "interrupted noise" (Schroeder-style reverse integration).
// 1. Play pink noise at full-band from the device speaker (or PA if connected).
// 2. Record ambient level into a ring buffer via the mic.
// 3. After ~1.5s of stable playback, cut the noise.
// 4. Record 4s of decay tail.
// 5. Compute reverse-time integration on the squared envelope.
// 6. Fit a line in log-domain to the −5..−25 dB portion → RT20, then RT60 = 3·RT20.
//
// This is a simplified single-band (broadband) measurement, adequate for a
// mobile PA-assistant. For per-octave results we'd repeat with band-pass
// filters (future enhancement).

import { playSignal, stopSignal } from "./test-signals.ts";

/** Point on an envelope curve: `t` in seconds, `db` in decibels. */
export interface EnvelopePoint {
  t: number;
  db: number;
}

/**
 * Schroeder reverse integration on a squared-envelope curve. Given a list of
 * (time, dB) samples, returns the (time, dB) of the reverse-integrated energy
 * curve, normalised so the first sample is 0 dB.
 *
 * This is the standardised way ISO 3382 measures RT60: instead of averaging
 * a noisy decay slope directly, you integrate the tail backwards, which gives
 * a much smoother monotonic curve to fit a line to.
 */
export function schroederReverseIntegrate(decayCurve: EnvelopePoint[]): EnvelopePoint[] {
  if (decayCurve.length === 0) return [];
  const energies = decayCurve.map((p) => Math.pow(10, p.db / 10));
  const rev: number[] = new Array(energies.length).fill(0);
  for (let i = energies.length - 1; i >= 0; i--) {
    rev[i] = (i === energies.length - 1 ? 0 : rev[i + 1]) + energies[i];
  }
  const revDb = rev.map((v) => 10 * Math.log10(Math.max(v, 1e-12)));
  const norm = revDb[0];
  return decayCurve.map((p, i) => ({ t: p.t, db: revDb[i] - norm }));
}

/**
 * Find the first time at which a monotonic decay curve crosses a target dB value.
 * Uses linear interpolation between adjacent samples. Returns null if the curve
 * never reaches the target.
 */
export function findDbCrossing(curve: EnvelopePoint[], targetDb: number): number | null {
  for (let i = 1; i < curve.length; i++) {
    if (curve[i].db <= targetDb) {
      const prev = curve[i - 1];
      const cur = curve[i];
      const dt = cur.t - prev.t;
      const dd = cur.db - prev.db;
      if (dd === 0) return cur.t;
      return prev.t + ((targetDb - prev.db) / dd) * dt;
    }
  }
  return null;
}

/**
 * Compute RT60 from an already-reverse-integrated decay curve. Uses the T20
 * method (fits a line between −5 dB and −25 dB, then RT60 = 3·T20) blended
 * lightly with EDT for smoothing. Returns the RT60 estimate in seconds plus
 * confidence signals.
 */
export function estimateRt60FromDecay(
  reversedCurve: EnvelopePoint[]
): { rt60: number; edt: number; snr: number; noiseFloor: number; confidence: "low" | "medium" | "high" } | null {
  if (reversedCurve.length < 5) return null;
  const tailStart = Math.floor(reversedCurve.length * 0.8);
  const noiseFloor =
    reversedCurve.slice(tailStart).reduce((s, p) => s + p.db, 0) /
    Math.max(1, reversedCurve.length - tailStart);
  const snr = -noiseFloor;

  const t5 = findDbCrossing(reversedCurve, -5);
  const t25 = findDbCrossing(reversedCurve, -25);
  const t35 = findDbCrossing(reversedCurve, -35);
  if (t5 === null || t25 === null) return null;

  const t20 = t25 - t5;
  const rt60_from_t20 = 3 * t20;
  const edt = t5;
  const rt60_edt = 12 * edt;
  const rt60 = Math.max(0.1, Math.min(6, rt60_from_t20 * 0.7 + rt60_edt * 0.3));

  let confidence: "low" | "medium" | "high" = "medium";
  if (snr > 30 && t35 !== null) confidence = "high";
  else if (snr < 15) confidence = "low";

  return {
    rt60: Math.round(rt60 * 100) / 100,
    edt: Math.round(edt * 100) / 100,
    snr: Math.round(snr * 10) / 10,
    noiseFloor: Math.round(noiseFloor * 10) / 10,
    confidence,
  };
}

export type RT60Progress =
  | { phase: "idle" }
  | { phase: "requesting-mic" }
  | { phase: "warming-up"; secondsLeft: number }
  | { phase: "capturing-decay"; secondsLeft: number }
  | { phase: "computing" }
  | { phase: "done"; rt60: number; confidence: "low" | "medium" | "high"; edt: number; noiseFloor: number; snr: number }
  | { phase: "error"; message: string };

export interface RT60MeasurementHandle {
  cancel: () => void;
}

export function measureRT60(
  onProgress: (p: RT60Progress) => void,
  opts: {
    warmupSeconds?: number;
    decaySeconds?: number;
    signalLevelDb?: number;
  } = {},
): RT60MeasurementHandle {
  const warmup = opts.warmupSeconds ?? 1.5;
  const decay = opts.decaySeconds ?? 4;
  const signalLevel = opts.signalLevelDb ?? -14;

  let cancelled = false;
  let stream: MediaStream | null = null;
  let ctx: AudioContext | null = null;
  let analyser: AnalyserNode | null = null;
  let source: MediaStreamAudioSourceNode | null = null;

  const cleanup = () => {
    try { stopSignal(); } catch { /* ignore */ }
    try { analyser?.disconnect(); } catch { /* ignore */ }
    try { source?.disconnect(); } catch { /* ignore */ }
    try { stream?.getTracks().forEach(t => t.stop()); } catch { /* ignore */ }
    try { ctx?.close(); } catch { /* ignore */ }
  };

  const run = async () => {
    onProgress({ phase: "requesting-mic" });
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
    } catch {
      onProgress({ phase: "error", message: "Permiso de micrófono denegado." });
      return;
    }
    if (cancelled) { cleanup(); return; }

    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC();
    if (ctx.state === "suspended") await ctx.resume().catch(() => { /* ignore */ });

    source = ctx.createMediaStreamSource(stream);
    analyser = ctx.createAnalyser();
    analyser.fftSize = 1024;
    analyser.smoothingTimeConstant = 0.0;
    source.connect(analyser);

    const buf = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

    // Envelope samples over time (t_ms, dB level relative to initial 0 dB)
    const envelope: { t: number; db: number }[] = [];
    const sampleIntervalMs = 20; // 50 Hz envelope sample rate
    const t0 = performance.now();

    // Start pink noise
    playSignal("pink-noise", signalLevel);

    // Warm-up phase (~1.5s) — settle the level
    let warmupSum = 0;
    let warmupCount = 0;

    // Poll the analyser envelope
    let stopped = false;
    const poll = async (durationSec: number, phase: "warmup" | "decay") => {
      const start = performance.now();
      const end = start + durationSec * 1000;
      while (!stopped && !cancelled && performance.now() < end) {
        analyser!.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
        let ss = 0;
        for (let i = 0; i < buf.length; i++) ss += buf[i] * buf[i];
        const rms = Math.sqrt(ss / buf.length);
        const dbfs = 20 * Math.log10(Math.max(rms, 1e-9));
        const t = performance.now() - t0;

        if (phase === "warmup") {
          warmupSum += dbfs;
          warmupCount++;
        }
        envelope.push({ t, db: dbfs });

        // Progress
        if (phase === "warmup") {
          onProgress({ phase: "warming-up", secondsLeft: Math.max(0, (end - performance.now()) / 1000) });
        } else {
          onProgress({ phase: "capturing-decay", secondsLeft: Math.max(0, (end - performance.now()) / 1000) });
        }
        await new Promise(r => setTimeout(r, sampleIntervalMs));
      }
    };

    // 1) Warmup — noise on
    await poll(warmup, "warmup");
    if (cancelled) { cleanup(); return; }

    const steadyLevelDb = warmupCount > 0 ? warmupSum / warmupCount : -Infinity;
    const cutoffTime = performance.now() - t0;

    // 2) Cut the signal, capture decay
    stopSignal();
    await new Promise(r => setTimeout(r, 30));
    await poll(decay, "decay");
    if (cancelled) { cleanup(); return; }

    stopped = true;
    cleanup();

    onProgress({ phase: "computing" });

    // Reverse-integrate the decay portion
    const decayCurve = envelope
      .filter(p => p.t > cutoffTime + 60) // skip a small guard time after cut
      .map(p => ({ t: (p.t - cutoffTime) / 1000, db: p.db - steadyLevelDb })); // normalize to 0 dB at cut

    if (decayCurve.length < 30) {
      onProgress({ phase: "error", message: "Curva de decaimiento insuficiente. Intenta con menos ruido de fondo." });
      return;
    }

    const reversed = schroederReverseIntegrate(decayCurve);
    const est = estimateRt60FromDecay(reversed);
    if (!est) {
      onProgress({ phase: "error", message: "No se pudo detectar decaimiento válido (SNR insuficiente)." });
      return;
    }

    onProgress({
      phase: "done",
      rt60: est.rt60,
      confidence: est.confidence,
      edt: est.edt,
      noiseFloor: est.noiseFloor,
      snr: est.snr,
    });
  };

  run().catch((err) => {
    if (!cancelled) onProgress({ phase: "error", message: err?.message ?? "Error en la medición" });
    cleanup();
  });

  return {
    cancel: () => {
      cancelled = true;
      cleanup();
      onProgress({ phase: "idle" });
    },
  };
}
