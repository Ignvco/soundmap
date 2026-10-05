import { useAppStore } from "@/store/app";
import { newId } from "../audit/document";
import { defaultReceiver } from "./audit-evaluator";
// Broadband interrupted-noise estimate. Fits the measured envelope directly.
// Background is sampled separately; T20, optional T30 and EDT are not blended.
// This portable capture is not an ISO 3382 measurement or calibrated room test.

import { claimAudioSession } from "./audio-session";

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
export function schroederReverseIntegrate(
  decayCurve: EnvelopePoint[],
): EnvelopePoint[] {
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
export function findDbCrossing(
  curve: EnvelopePoint[],
  targetDb: number,
): number | null {
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

export interface DecayFit {
  rt60: number;
  rSquared: number;
  fromDb: number;
  toDb: number;
  points: number;
}
export function fitDecay(
  curve: EnvelopePoint[],
  fromDb: number,
  toDb: number,
): DecayFit | null {
  const points = curve.filter(
    (p) =>
      Number.isFinite(p.t) &&
      Number.isFinite(p.db) &&
      p.db <= fromDb &&
      p.db >= toDb,
  );
  if (
    points.length < 5 ||
    points[0].db < fromDb - 2 ||
    points.at(-1)!.db > toDb + 2
  )
    return null;
  const n = points.length,
    origin = points[0].t;
  const mx = points.reduce((s, p) => s + p.t - origin, 0) / n,
    my = points.reduce((s, p) => s + p.db, 0) / n;
  let xx = 0,
    xy = 0,
    yy = 0;
  for (const p of points) {
    const x = p.t - origin - mx,
      y = p.db - my;
    xx += x * x;
    xy += x * y;
    yy += y * y;
  }
  if (xx <= 0 || yy <= 0) return null;
  const slope = xy / xx,
    rSquared = (xy * xy) / (xx * yy);
  if (slope >= 0 || rSquared < 0.8) return null;
  return { rt60: -60 / slope, rSquared, fromDb, toDb, points: n };
}
/** Separate T20/T30/EDT extrapolations, never a blend. Noise must be measured
 * independently; the tail of an integrated curve is NOT a noise estimator. */
export function estimateRt60FromDecay(
  curve: EnvelopePoint[],
  noiseFloorDb?: number,
) {
  if (
    curve.length < 5 ||
    curve.some(
      (p, i) =>
        !Number.isFinite(p.t) ||
        !Number.isFinite(p.db) ||
        (i > 0 && p.t <= curve[i - 1].t),
    )
  )
    return null;
  const t20 = fitDecay(curve, -5, -25),
    edt = fitDecay(curve, 0, -10),
    t30 = fitDecay(curve, -5, -35);
  if (!t20 || t20.rt60 > 30) return null;
  const noiseKnown =
    noiseFloorDb !== undefined && Number.isFinite(noiseFloorDb);
  if (noiseKnown && noiseFloorDb > -35) return null; // 10 dB clearance below the fit endpoint
  const confidence: "low" | "medium" | "high" = !noiseKnown
    ? "low"
    : t20.rSquared >= 0.99 && noiseFloorDb <= -45 && t30
      ? "high"
      : t20.rSquared >= 0.95
        ? "medium"
        : "low";
  return {
    rt60: Math.round(t20.rt60 * 100) / 100,
    edt: edt ? Math.round(edt.rt60 * 100) / 100 : null,
    t20: t20.rt60,
    t30: t30?.rt60 ?? null,
    rSquared: t20.rSquared,
    fitRange: [-5, -25],
    snr: noiseKnown ? -noiseFloorDb : 0,
    noiseFloor: noiseFloorDb ?? 0,
    noiseKnown,
    confidence,
  };
}

export type RT60Progress =
  | { phase: "idle" }
  | { phase: "requesting-mic" }
  | { phase: "warming-up"; secondsLeft: number }
  | { phase: "capturing-decay"; secondsLeft: number }
  | { phase: "computing" }
  | {
      phase: "done";
      rt60: number;
      confidence: "low" | "medium" | "high";
      edt: number | null;
      noiseFloor: number;
      snr: number;
    }
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
  const warmup = Math.max(1.5, Math.min(10, opts.warmupSeconds ?? 1.5));
  const decay = Math.max(1, Math.min(20, opts.decaySeconds ?? 4));
  const startedAt = new Date().toISOString();
  const initial = useAppStore.getState();
  const envelope: EnvelopePoint[] = [];
  let cancelled = false,
    cleaned = false,
    saved = false,
    clipped = false;
  let stream: MediaStream | null = null,
    ctx: AudioContext | null = null;
  let meter: AudioWorkletNode | undefined,
    source: MediaStreamAudioSourceNode | undefined;
  let noise: AudioBufferSourceNode | undefined, gain: GainNode | undefined;
  let unlock: (() => void) | undefined, finish: (() => void) | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let sampleRate = 0,
    device = "Micrófono",
    cutoff = 0;
  let background = 0,
    backgroundDuration = 0,
    steady = 0,
    steadyDuration = 0;
  const persist = (
    summary: Record<string, number | string | null>,
    interruptions: string[] = [],
  ) => {
    if (saved || !envelope.length || !initial.room || !sampleRate) return;
    saved = true;
    const app = useAppStore.getState();
    if (app.audit.id !== initial.audit.id) return;
    app.addMeasurement({
      id: newId("decay"),
      kind: "decay",
      startedAt,
      endedAt: new Date().toISOString(),
      label: "Decaimiento de banda ancha",
      receiver: defaultReceiver(initial.room),
      method:
        "Ruido rosa interrumpido; RMS Z en AudioWorklet (20 ms), reloj de audio; ajuste T20 -5 a -25 dB; sin integración inversa de envolvente",
      unit: "dBFS en muestras; segundos en T20/T30/EDT",
      device,
      sampleRate,
      samples: envelope.map((p) => ({ t: p.t, value: p.db })),
      summary,
      interruptions,
    });
  };
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    clearTimeout(timer);
    unlock?.();
    window.removeEventListener("pagehide", hidden);
    document.removeEventListener("visibilitychange", visibility);
    if (meter) {
      meter.port.onmessage = null;
      meter.disconnect();
    }
    source?.disconnect();
    try {
      noise?.stop();
      noise?.disconnect();
      gain?.disconnect();
    } catch {
      /* Already stopped. */
    }
    stream?.getTracks().forEach((t) => t.stop());
    if (ctx) {
      ctx.onstatechange = null;
      void ctx.close().catch(() => {});
    }
    finish?.();
  };
  const abort = (reason: string, manual = false) => {
    if (cleaned || cancelled) return;
    cancelled = true;
    persist({ status: "interrupted" }, [reason]);
    cleanup();
    onProgress(
      manual ? { phase: "idle" } : { phase: "error", message: reason },
    );
  };
  function hidden() {
    abort("Medición interrumpida al salir de la aplicación.");
  }
  function visibility() {
    if (document.hidden) hidden();
  }
  const run = async () => {
    unlock = claimAudioSession();
    window.addEventListener("pagehide", hidden);
    document.addEventListener("visibilitychange", visibility);
    onProgress({ phase: "requesting-mic" });
    const incoming = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        noiseSuppression: false,
        autoGainControl: false,
        channelCount: 1,
      },
    });
    if (cancelled) {
      incoming.getTracks().forEach((t) => t.stop());
      return;
    }
    stream = incoming;
    const track = stream.getAudioTracks()[0],
      settings = track.getSettings();
    device = track.label || device;
    if (
      settings.autoGainControl ||
      settings.echoCancellation ||
      settings.noiseSuppression
    )
      throw new Error(
        "El micrófono conserva procesamiento automático; desactívalo antes de medir decaimiento.",
      );
    ctx = new AudioContext();
    sampleRate = ctx.sampleRate;
    await ctx.audioWorklet.addModule(
      new URL("./level-worklet.js", import.meta.url),
    );
    if (cancelled) return;
    await ctx.resume();
    if (cancelled) return;
    source = ctx.createMediaStreamSource(stream);
    meter = new AudioWorkletNode(ctx, "soundmap-level", {
      numberOfInputs: 2,
      numberOfOutputs: 1,
      outputChannelCount: [1],
      processorOptions: { interval: 0.02 },
    });
    source.connect(meter, 0, 0);
    source.connect(meter, 0, 1);
    meter.connect(ctx.destination);
    // Excitation and measurement use the same audio clock; no timer controls the cut.
    const buffer = ctx.createBuffer(1, Math.floor(sampleRate * 2), sampleRate),
      data = buffer.getChannelData(0);
    let b0 = 0,
      b1 = 0,
      b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + w * 0.099046;
      b1 = 0.963 * b1 + w * 0.2965164;
      b2 = 0.57 * b2 + w * 1.0526913;
      data[i] = 0.1 * (b0 + b1 + b2 + w * 0.1848);
    }
    const start = ctx.currentTime + 0.03,
      warmStart = start + 1;
    cutoff = warmStart + warmup;
    gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.setValueAtTime(
      10 ** (Math.max(-60, Math.min(-6, opts.signalLevelDb ?? -18)) / 20),
      warmStart,
    );
    gain.gain.setValueAtTime(0, cutoff);
    gain.connect(ctx.destination);
    noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    noise.connect(gain);
    noise.start(warmStart);
    noise.stop(cutoff);
    track.onended = () =>
      abort("Micrófono desconectado durante el decaimiento.");
    ctx.onstatechange = () => {
      if (ctx?.state === "suspended")
        abort("Audio suspendido durante el decaimiento.");
    };
    await new Promise<void>((resolve) => {
      finish = resolve;
      timer = setTimeout(
        () => abort("El reloj de audio dejó de entregar muestras."),
        (warmup + decay + 12) * 1000,
      );
      meter!.port.onmessage = ({ data: p }) => {
        if (
          cancelled ||
          cleaned ||
          ![p.meanSquare, p.duration, p.audioTime, p.peakDigital].every(
            Number.isFinite,
          ) ||
          p.duration <= 0
        )
          return;
        const t = p.audioTime;
        if (t < start) return;
        clipped ||= p.peakDigital >= 0.999;
        const db = 10 * Math.log10(Math.max(p.meanSquare, 1e-20));
        envelope.push({ t: t - start, db });
        if (t < warmStart) {
          background += p.meanSquare * p.duration;
          backgroundDuration += p.duration;
        } else if (t < cutoff) {
          if (t > warmStart + 0.3) {
            steady += p.meanSquare * p.duration;
            steadyDuration += p.duration;
          }
          onProgress({
            phase: "warming-up",
            secondsLeft: Math.max(0, cutoff - t),
          });
        } else
          onProgress({
            phase: "capturing-decay",
            secondsLeft: Math.max(0, cutoff + decay - t),
          });
        if (t >= cutoff + decay) resolve();
      };
    });
    if (cancelled) return;
    onProgress({ phase: "computing" });
    const steadyDb =
      10 *
      Math.log10(Math.max(steady / Math.max(steadyDuration, 0.001), 1e-20));
    const noiseDb =
      10 *
        Math.log10(
          Math.max(background / Math.max(backgroundDuration, 0.001), 1e-20),
        ) -
      steadyDb;
    const curve = envelope
      .filter((p) => p.t > cutoff - start + 0.02)
      .map((p) => ({ t: p.t - (cutoff - start), db: p.db - steadyDb }));
    const est = clipped ? null : estimateRt60FromDecay(curve, noiseDb);
    if (!est) {
      persist(
        {
          status: "rejected",
          snr: -noiseDb,
          cutoffSec: cutoff - start,
          steadyDbfs: steadyDb,
        },
        [
          clipped
            ? "Saturación digital"
            : "Curva sin rango, linealidad o SNR suficiente",
        ],
      );
      throw new Error(
        clipped
          ? "Captura saturada: reduce el nivel y repite."
          : "Decaimiento sin calidad suficiente. La captura rechazada queda en el expediente.",
      );
    }
    persist({
      T20: est.t20,
      T30: est.t30,
      EDT: est.edt,
      rSquared: est.rSquared,
      snr: est.snr,
      confidence: est.confidence,
      cutoffSec: cutoff - start,
      steadyDbfs: steadyDb,
    });
    cleanup();
    onProgress({
      phase: "done",
      rt60: est.rt60,
      confidence: est.confidence,
      edt: est.edt,
      noiseFloor: est.noiseFloor,
      snr: est.snr,
    });
  };
  void run().catch((e) => {
    if (!cancelled) {
      persist({ status: "error" }, [(e as Error).message]);
      onProgress({ phase: "error", message: (e as Error).message });
    }
    cleanup();
  });
  return { cancel: () => abort("Cancelada por el técnico", true) };
}
