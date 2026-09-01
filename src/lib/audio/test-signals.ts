// Test Signals Engine — Pink noise, sine sweep, reference tones
// Uses Web Audio API to synthesize reference signals for PA calibration.
// Volumes are RMS-normalized and gained so pink noise ≈ sine wave loudness.

let audioCtx: AudioContext | null = null;
function ctx(): AudioContext {
  if (audioCtx) return audioCtx;
  const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  audioCtx = new AC();
  return audioCtx;
}

// ── Pink Noise generator (Paul Kellett's economy filter) ────────────────────
// White noise → filter → pink noise (~-3 dB/octave)
function makePinkNoiseBuffer(sampleRate: number, seconds = 2): AudioBuffer {
  const length = sampleRate * seconds;
  const buffer = ctx().createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    b0 = 0.99886 * b0 + white * 0.0555179;
    b1 = 0.99332 * b1 + white * 0.0750759;
    b2 = 0.96900 * b2 + white * 0.1538520;
    b3 = 0.86650 * b3 + white * 0.3104856;
    b4 = 0.55000 * b4 + white * 0.5329522;
    b5 = -0.7616 * b5 - white * 0.0168980;
    data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
    b6 = white * 0.115926;
  }
  return buffer;
}

// ── White Noise buffer ─────────────────────────────────────────────────────
function makeWhiteNoiseBuffer(sampleRate: number, seconds = 2): AudioBuffer {
  const buffer = ctx().createBuffer(1, sampleRate * seconds, sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

// ── Exponential Sine Sweep buffer (for impulse response deconvolution) ─────
export function makeSineSweepBuffer(
  sampleRate: number,
  seconds = 3,
  fStart = 20,
  fEnd = 20000,
): AudioBuffer {
  const length = Math.floor(sampleRate * seconds);
  const buffer = ctx().createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);
  const K = (seconds * 2 * Math.PI * fStart) / Math.log(fEnd / fStart);
  const L = seconds / Math.log(fEnd / fStart);
  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Farina exponential sweep
    data[i] = 0.6 * Math.sin(K * (Math.exp(t / L) - 1));
    // Fade in/out (5 ms) to avoid clicks
    const fadeSamp = Math.floor(sampleRate * 0.005);
    if (i < fadeSamp) data[i] *= i / fadeSamp;
    if (i > length - fadeSamp) data[i] *= (length - i) / fadeSamp;
  }
  return buffer;
}

// ── Signal Type ────────────────────────────────────────────────────────────
export type SignalKind =
  | "pink-noise"
  | "white-noise"
  | "sine-1k"
  | "sine-100"
  | "sine-sweep";

interface ActiveSignal {
  kind: SignalKind;
  source: AudioBufferSourceNode | OscillatorNode;
  gain: GainNode;
  onEnded?: () => void;
}

let active: ActiveSignal | null = null;

// ── Public API ─────────────────────────────────────────────────────────────
export function playSignal(
  kind: SignalKind,
  levelDb: number = -18, // conservative default so no one blows a driver
  onEnded?: () => void,
): void {
  stopSignal();
  const c = ctx();
  const linear = Math.pow(10, levelDb / 20);

  const gain = c.createGain();
  gain.gain.setValueAtTime(0, c.currentTime);
  gain.gain.linearRampToValueAtTime(linear, c.currentTime + 0.05);
  gain.connect(c.destination);

  let source: AudioBufferSourceNode | OscillatorNode;
  if (kind === "sine-1k" || kind === "sine-100") {
    const osc = c.createOscillator();
    osc.type = "sine";
    osc.frequency.value = kind === "sine-1k" ? 1000 : 100;
    osc.connect(gain);
    osc.start();
    source = osc;
  } else if (kind === "pink-noise") {
    const buf = makePinkNoiseBuffer(c.sampleRate, 4);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start();
    source = src;
  } else if (kind === "white-noise") {
    const buf = makeWhiteNoiseBuffer(c.sampleRate, 4);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    src.connect(gain);
    src.start();
    source = src;
  } else {
    // sweep — plays once
    const buf = makeSineSweepBuffer(c.sampleRate, 3, 20, 20000);
    const src = c.createBufferSource();
    src.buffer = buf;
    src.connect(gain);
    src.start();
    src.onended = () => { if (active?.source === src) stopSignal(); };
    source = src;
  }

  active = { kind, source, gain, onEnded };
}

export function stopSignal(): void {
  if (!active) return;
  const c = ctx();
  try {
    active.gain.gain.cancelScheduledValues(c.currentTime);
    active.gain.gain.linearRampToValueAtTime(0.0001, c.currentTime + 0.05);
    setTimeout(() => {
      try { active?.source.stop(); } catch { /* ignore */ }
      try { active?.gain.disconnect(); } catch { /* ignore */ }
      active?.onEnded?.();
      active = null;
    }, 80);
  } catch {
    active = null;
  }
}

export function isPlaying(): boolean {
  return active !== null;
}

export function currentSignal(): SignalKind | null {
  return active?.kind ?? null;
}
