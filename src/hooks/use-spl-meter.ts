// SPL Meter Hook — Web Audio API based
//
// Reads the device microphone and estimates loudness as a calibrated
// dB(SPL) value using A-weighting emulation via a biquad chain.
//
// Method:
//  - getUserMedia({ audio: constraints }) with echoCancellation/noiseSuppression
//    explicitly OFF so we get the raw environmental level.
//  - The signal is A-weighted (approx: HPF 20 Hz + LPF 20 kHz + tilt via peaking).
//  - RMS is computed on a small ScriptProcessor-free chain using AnalyserNode's
//    time-domain buffer for wide browser compat (works inside Capacitor WebView).
//  - `refOffset` is a user-calibratable dB offset — mic capsules differ, so a
//    known 94 dB source (SPL calibrator or another meter) is used to align.
//
// The reported dB is: 20 * log10(rms) + refOffset (default 100).
// This is a reasonable SPL estimate; not a legal replacement for a Class-2 meter.

import { useCallback, useEffect, useRef, useState } from "react";

export type SPLState = "idle" | "starting" | "running" | "denied" | "error";

interface SPLReading {
  spl: number;        // instantaneous dB SPL (A-weighted approx)
  peak: number;       // peak hold (2s decay)
  leq: number;        // running Leq (equivalent continuous level) since start
  band: "quiet" | "moderate" | "loud" | "hot" | "clip";
}

export interface UseSPLMeterOptions {
  refOffset?: number;     // calibration offset in dB (default 100)
  peakDecayDbPerSec?: number; // how fast the peak-hold falls (default 6)
}

export function useSPLMeter(opts: UseSPLMeterOptions = {}) {
  const refOffset = opts.refOffset ?? 100;
  const peakDecay = opts.peakDecayDbPerSec ?? 6;

  const [state, setState] = useState<SPLState>("idle");
  const [reading, setReading] = useState<SPLReading>({
    spl: 0, peak: 0, leq: 0, band: "quiet",
  });
  const [error, setError] = useState<string | null>(null);
  const [calibrationOffset, setCalibrationOffset] = useState(refOffset);
  // `refOffset` (100 dB) es un valor por defecto arbitrario, no una medición.
  // Sin este flag no había forma de distinguir "sin calibrar" de "calibrado y
  // dio justo 100", y el panel de exposición mostraba LEX,8h y un veredicto de
  // la directiva 2003/10/EC como si el número fuese trazable.
  const [isCalibrated, setIsCalibrated] = useState(false);

  const streamRef = useRef<MediaStream | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const rafRef = useRef<number | null>(null);
  const timeBufRef = useRef<Float32Array | null>(null);

  const peakRef = useRef(0);
  const leqEnergyRef = useRef(0);
  const leqSamplesRef = useRef(0);
  const lastTsRef = useRef<number>(0);

  const stop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (ctxRef.current) {
      ctxRef.current.close().catch(() => { /* ignore */ });
      ctxRef.current = null;
    }
    analyserRef.current = null;
    timeBufRef.current = null;
    setState("idle");
    peakRef.current = 0;
    leqEnergyRef.current = 0;
    leqSamplesRef.current = 0;
  }, []);

  const bandOf = (dB: number): SPLReading["band"] => {
    if (dB >= 120) return "clip";
    if (dB >= 105) return "hot";
    if (dB >= 92) return "loud";
    if (dB >= 70) return "moderate";
    return "quiet";
  };

  const start = useCallback(async () => {
    if (state === "running" || state === "starting") return;
    setState("starting");
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      streamRef.current = stream;

      const AC = window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AC();
      ctxRef.current = ctx;

      const source = ctx.createMediaStreamSource(stream);

      // Approximate A-weighting via biquad chain:
      // 1) HPF at ~20 Hz (removes DC and infrasound rumble)
      // 2) HPF at ~150 Hz shelving (attenuates low freq like A-curve)
      // 3) Peaking around 2.5 kHz (bumps ear-sensitivity band)
      // 4) LPF at ~20 kHz (safety anti-aliasing)
      const hpf1 = ctx.createBiquadFilter(); hpf1.type = "highpass"; hpf1.frequency.value = 20;
      const hpf2 = ctx.createBiquadFilter(); hpf2.type = "highshelf"; hpf2.frequency.value = 150; hpf2.gain.value = -3;
      const peak = ctx.createBiquadFilter(); peak.type = "peaking"; peak.frequency.value = 2500; peak.Q.value = 1.4; peak.gain.value = 2;
      const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 20000;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyser.smoothingTimeConstant = 0.05;

      source.connect(hpf1);
      hpf1.connect(hpf2);
      hpf2.connect(peak);
      peak.connect(lpf);
      lpf.connect(analyser);

      analyserRef.current = analyser;
      timeBufRef.current = new Float32Array(new ArrayBuffer(analyser.fftSize * 4));

      lastTsRef.current = performance.now();
      setState("running");

      const loop = () => {
        const analyser = analyserRef.current;
        const buf = timeBufRef.current;
        if (!analyser || !buf) return;

        analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
        // RMS of the windowed samples
        let sumSquares = 0;
        for (let i = 0; i < buf.length; i++) sumSquares += buf[i] * buf[i];
        const rms = Math.sqrt(sumSquares / buf.length);
        // Avoid -Infinity
        const dbfs = 20 * Math.log10(Math.max(rms, 1e-10));
        // Map dBFS to a positive SPL-like number via calibration offset
        const spl = Math.max(0, dbfs + calibrationOffset);

        const now = performance.now();
        const dt = (now - lastTsRef.current) / 1000;
        lastTsRef.current = now;

        // Peak-hold with slow decay
        const decayed = Math.max(0, peakRef.current - peakDecay * dt);
        peakRef.current = Math.max(decayed, spl);

        // Running Leq (integrate energy since start)
        leqEnergyRef.current += Math.pow(10, spl / 10);
        leqSamplesRef.current += 1;
        const leq = 10 * Math.log10(leqEnergyRef.current / leqSamplesRef.current);

        setReading({
          spl: Math.round(spl * 10) / 10,
          peak: Math.round(peakRef.current * 10) / 10,
          leq: Math.round(leq * 10) / 10,
          band: bandOf(spl),
        });

        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } catch (err) {
      const e = err as { name?: string; message?: string };
      if (e?.name === "NotAllowedError" || e?.name === "PermissionDeniedError") {
        setState("denied");
        setError("Permiso de micrófono denegado.");
      } else {
        setState("error");
        setError(e?.message ?? "No se pudo iniciar el micrófono.");
      }
    }
  }, [calibrationOffset, peakDecay, state]);

  // Cleanup on unmount
  useEffect(() => () => stop(), [stop]);

  const calibrate = useCallback((targetDb: number) => {
    // Ajusta el offset para que la lectura instantánea sea `targetDb`.
    setCalibrationOffset((prev) => prev + (targetDb - reading.spl));
    setIsCalibrated(true);
  }, [reading.spl]);

  const resetLeq = useCallback(() => {
    leqEnergyRef.current = 0;
    leqSamplesRef.current = 0;
  }, []);

  const setOffsetManually = useCallback((db: number) => {
    setCalibrationOffset(db);
    setIsCalibrated(true);
  }, []);

  return {
    isCalibrated,
    state,
    error,
    reading,
    calibrationOffset,
    start,
    stop,
    calibrate,
    setCalibrationOffset: setOffsetManually,
    resetLeq,
  };
}
