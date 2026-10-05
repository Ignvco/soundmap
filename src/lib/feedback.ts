// UI Sensory Engine — Haptics + Sound feedback for SoundMap.
// Designed for a pro-audio app: subtle, musical, never annoying.
// User can disable via useSettingsStore.hapticsEnabled / soundEnabled.

import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { Capacitor } from "@capacitor/core";

// ── Sound Engine ─────────────────────────────────────────────────────────────
let audioCtx: AudioContext | null = null;

function ctx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (audioCtx) return audioCtx;
  try {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AC();
    return audioCtx;
  } catch {
    return null;
  }
}

type Tone = { freq: number; duration: number; type?: OscillatorType; gain?: number };

function playTones(tones: Tone[]) {
  const c = ctx();
  if (!c) return;
  const now = c.currentTime;
  let t = now;
  for (const tone of tones) {
    const osc = c.createOscillator();
    const gain = c.createGain();
    osc.type = tone.type ?? "sine";
    osc.frequency.setValueAtTime(tone.freq, t);
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(tone.gain ?? 0.06, t + 0.005);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + tone.duration);
    osc.connect(gain).connect(c.destination);
    osc.start(t);
    osc.stop(t + tone.duration);
    t += tone.duration * 0.9;
  }
}

// Sound palette — musical intervals, no cheap beeps
const SOUNDS = {
  tap:     [{ freq: 880, duration: 0.04, gain: 0.03 }] as Tone[],
  select:  [{ freq: 660, duration: 0.05, gain: 0.04 }] as Tone[],
  success: [
    { freq: 523.25, duration: 0.08, gain: 0.05 }, // C5
    { freq: 659.25, duration: 0.08, gain: 0.05 }, // E5
    { freq: 783.99, duration: 0.14, gain: 0.05 }, // G5
  ] as Tone[],
  warning: [
    { freq: 466.16, duration: 0.08, gain: 0.06, type: "triangle" as OscillatorType }, // Bb4
    { freq: 466.16, duration: 0.08, gain: 0.06, type: "triangle" as OscillatorType },
  ] as Tone[],
  error: [
    { freq: 220, duration: 0.10, gain: 0.06, type: "sawtooth" as OscillatorType },
    { freq: 165, duration: 0.14, gain: 0.06, type: "sawtooth" as OscillatorType },
  ] as Tone[],
  scan:    [
    { freq: 440, duration: 0.06, gain: 0.04 },
    { freq: 554.37, duration: 0.06, gain: 0.04 }, // C#5
    { freq: 659.25, duration: 0.10, gain: 0.04 }, // E5
  ] as Tone[],
};

// ── Haptics ──────────────────────────────────────────────────────────────────
async function safeHaptic(fn: () => Promise<unknown>) {
  if (!Capacitor.isNativePlatform()) {
    // Web fallback: vibration API where available (best-effort, silent fail).
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { navigator.vibrate(10); } catch { /* ignore */ }
    }
    return;
  }
  try { await fn(); } catch { /* ignore */ }
}

// ── Public feedback API ──────────────────────────────────────────────────────
export type FeedbackKind = "tap" | "select" | "success" | "warning" | "error" | "scan";

interface FeedbackOptions {
  sound?: boolean;
  haptic?: boolean;
}

let globalEnabled = { sound: true, haptic: true };

export function setFeedbackEnabled(opts: Partial<typeof globalEnabled>) {
  globalEnabled = { ...globalEnabled, ...opts };
}

export function feedback(kind: FeedbackKind, opts: FeedbackOptions = {}) {
  const useSound = (opts.sound ?? true) && globalEnabled.sound;
  const useHaptic = (opts.haptic ?? true) && globalEnabled.haptic;

  if (useSound) playTones(SOUNDS[kind]);

  if (useHaptic) {
    switch (kind) {
      case "tap":
      case "select":
        safeHaptic(() => Haptics.impact({ style: ImpactStyle.Light }));
        break;
      case "success":
        safeHaptic(() => Haptics.notification({ type: NotificationType.Success }));
        break;
      case "warning":
        safeHaptic(() => Haptics.notification({ type: NotificationType.Warning }));
        break;
      case "error":
        safeHaptic(() => Haptics.notification({ type: NotificationType.Error }));
        break;
      case "scan":
        safeHaptic(() => Haptics.impact({ style: ImpactStyle.Medium }));
        break;
    }
  }
}

// Prime the AudioContext on first user interaction (browsers require gesture).
export function primeAudio() {
  const c = ctx();
  if (c && c.state === "suspended") c.resume().catch(() => { /* ignore */ });
}
