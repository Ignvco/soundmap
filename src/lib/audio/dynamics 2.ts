// Dynamics & Gain-Staging Engine — SoundMap
// Derives realistic limiter, compressor and gain-stage settings for each output
// from the speaker's power handling (RMS/peak), its max SPL, the driving amp's
// power, and the room's reverberation. These are estimated presets but follow
// standard live-sound protection practice.

import type { AcousticsResult } from "./acoustics.ts";
import type { GearItem } from "./pa-engine.ts";

export type SpeakerRole = "top" | "sub" | "monitor";

export interface CompressorSettings {
  enabled: boolean;
  thresholdDb: number; // dB below the limiter ceiling where compression starts
  ratio: number;       // e.g. 3 => 3:1
  attackMs: number;
  releaseMs: number;
  kneeDb: number;
}

export interface GainStage {
  outputGainDb: number;          // trim applied at the DSP output
  ampWatts: number | null;       // driving amp continuous power (null if active/unknown)
  speakerRmsWatts: number | null;
  speakerPeakWatts: number | null;
  powerRatio: number | null;     // amp / speaker RMS
  status: "ideal" | "underpowered" | "overpowered" | "active" | "unknown";
  note: string;
}

export interface DynamicsSettings {
  // El limitador en un DSP real se configura como headroom en dB por debajo del
  // SPL máximo del parlante — NO como un valor absoluto de dBSPL.
  // limiterDb: referencia de protección (SPL máx del parlante - headroom)
  // limiterHeadroomDb: cuántos dB de headroom se dejan (lo que el usuario configura)
  limiterDb: number;          // referencia: splMax - headroom (informativo)
  limiterHeadroomDb: number;  // headroom real a configurar en el DSP (accionable)
  limiterAttackMs: number;
  limiterReleaseMs: number;
  limiterType: "rms" | "peak";
  compressor: CompressorSettings;
  gainStage: GainStage;
}

// Headroom (dB below the speaker's max SPL) reserved before the limiter engages.
// Tops protect the fragile HF driver hardest; subs can run closer to max.
const LIMITER_HEADROOM: Record<SpeakerRole, number> = {
  top: 6,
  sub: 4,
  monitor: 9, // wedges run conservative to preserve gain-before-feedback
};

// Limiter timing follows the lowest frequency each box reproduces: low-frequency
// content needs slower attack/release or the limiter audibly pumps.
const LIMITER_TIMING: Record<SpeakerRole, { attackMs: number; releaseMs: number; type: "rms" | "peak" }> = {
  top: { attackMs: 2, releaseMs: 80, type: "peak" },
  sub: { attackMs: 10, releaseMs: 250, type: "rms" },
  monitor: { attackMs: 1.5, releaseMs: 60, type: "peak" },
};

/**
 * Pick the amplifier most likely to be driving a passive speaker. The app does
 * not route amps to specific boxes, so we choose the most powerful selected amp
 * as the representative driver. Active speakers ignore this (internal amp).
 */
function pickDrivingAmp(amps: GearItem[]): GearItem | null {
  if (amps.length === 0) return null;
  return amps.reduce((best, a) => ((a.rmsWatts ?? 0) > (best.rmsWatts ?? 0) ? a : best), amps[0]);
}

/**
 * Evaluate amp ↔ speaker power matching for a passive box.
 * Best practice: amp continuous power ≈ 1.5–2× the speaker's continuous (RMS)
 * rating, giving transient headroom without risking thermal/excursion damage.
 */
function evaluateGainStage(speaker: GearItem, amp: GearItem | null): GainStage {
  const speakerRms = speaker.rmsWatts ?? null;
  const speakerPeak = speaker.peakWatts ?? null;

  // Active / self-powered boxes manage their own gain stage internally.
  if (speaker.active) {
    return {
      outputGainDb: 0,
      ampWatts: null,
      speakerRmsWatts: speakerRms,
      speakerPeakWatts: speakerPeak,
      powerRatio: null,
      status: "active",
      note: `${speaker.model} es activo — el gain staging lo gestiona su amplificador interno. Salida a línea (0 dB).`,
    };
  }

  if (!amp || !amp.rmsWatts || !speakerRms) {
    return {
      outputGainDb: 0,
      ampWatts: amp?.rmsWatts ?? null,
      speakerRmsWatts: speakerRms,
      speakerPeakWatts: speakerPeak,
      powerRatio: null,
      status: amp ? "unknown" : "unknown",
      note: amp
        ? "Faltan datos de potencia para calcular el gain staging con precisión."
        : "Altavoz pasivo sin amplificador seleccionado — agregá un amplificador para calcular el gain staging.",
    };
  }

  // ── Potencia real del amp a la impedancia del parlante ──────────────────────
  // Los amplificadores se venden con potencia a 8 Ω como referencia.
  // A menor impedancia entregan más potencia (hasta sus límites térmicos/de corriente).
  // Modelo conservador basado en comportamiento real de amps de clase D/AB:
  //   4 Ω: ~1.6× la potencia a 8 Ω (no 2× — hay pérdidas internas)
  //   2 Ω: ~2.2× la potencia a 8 Ω (solo si el amp soporta 2 Ω)
  //   16 Ω: ~0.6× la potencia a 8 Ω
  // Si el parlante tiene impedanceOhms definido, ajustamos la potencia real del amp.
  const speakerImpedance = speaker.impedanceOhms;
  let ampEffectiveWatts = amp.rmsWatts;
  let impedanceNote = "";
  if (speakerImpedance != null && speakerImpedance > 0) {
    const refImpedance = 8; // los datasheets de amp usan 8 Ω como referencia
    // Factor de escala sublineal: potencia ∝ (8/Z)^0.8 (conservador)
    const impedanceFactor = Math.pow(refImpedance / speakerImpedance, 0.8);
    ampEffectiveWatts = Math.round(amp.rmsWatts * impedanceFactor);
    if (speakerImpedance !== refImpedance) {
      impedanceNote = ` A ${speakerImpedance} Ω, el ${amp.model} entrega ~${ampEffectiveWatts} W (vs. ${amp.rmsWatts} W nominales a 8 Ω).`;
    }
  }

  const ratio = ampEffectiveWatts / speakerRms;

  if (ratio < 1) {
    return {
      outputGainDb: 0,
      ampWatts: ampEffectiveWatts,
      speakerRmsWatts: speakerRms,
      speakerPeakWatts: speakerPeak,
      powerRatio: Math.round(ratio * 100) / 100,
      status: "underpowered",
      note: `${amp.model} entrega ~${ampEffectiveWatts} W a la carga del ${speaker.model} (${speakerRms} W RMS necesarios).${impedanceNote} Riesgo de recorte — limitador conservador y evitar forzar la ganancia.`,
    };
  }

  if (ratio > 2.5) {
    return {
      outputGainDb: -2,
      ampWatts: ampEffectiveWatts,
      speakerRmsWatts: speakerRms,
      speakerPeakWatts: speakerPeak,
      powerRatio: Math.round(ratio * 100) / 100,
      status: "overpowered",
      note: `${amp.model} supera 2,5× la RMS del ${speaker.model} a esta carga.${impedanceNote} Bajar salida −2 dB y confiar en el limitador.`,
    };
  }

  return {
    outputGainDb: 0,
    ampWatts: ampEffectiveWatts,
    speakerRmsWatts: speakerRms,
    speakerPeakWatts: speakerPeak,
    powerRatio: Math.round(ratio * 100) / 100,
    status: "ideal",
    note: `${amp.model} en ventana ideal (~${Math.round(ratio * 10) / 10}× RMS).${impedanceNote} Buen headroom de transitorios.`,
  };
}

/**
 * Compressor tuning. Reverberant rooms get gentler ratios and longer releases so
 * compression doesn't pump against the room's reverb tail; dry rooms can be
 * tighter. Subs use slow timing, monitors stay gentle to protect feedback margin.
 */
function buildCompressor(role: SpeakerRole, acoustics: AcousticsResult): CompressorSettings {
  const reverberant = acoustics.rt60Audience > 1.6;
  const dry = acoustics.rt60Audience < 0.8;

  if (role === "sub") {
    return {
      enabled: true,
      thresholdDb: 4,
      ratio: reverberant ? 2.5 : 3,
      attackMs: 30,
      releaseMs: reverberant ? 320 : 250,
      kneeDb: 6,
    };
  }

  if (role === "monitor") {
    // Wedges: gentle, mainly transient control without choking the mix.
    return {
      enabled: true,
      thresholdDb: 6,
      ratio: 2,
      attackMs: 12,
      releaseMs: 120,
      kneeDb: 8,
    };
  }

  // Tops (FOH): the main musical bus compressor.
  return {
    enabled: true,
    thresholdDb: 5,
    ratio: reverberant ? 2 : dry ? 3 : 2.5,
    attackMs: 15,
    releaseMs: reverberant ? 220 : 140,
    kneeDb: 6,
  };
}

/**
 * Build the full dynamics + gain-stage settings for one output.
 */
export function calculateDynamics(
  speaker: GearItem,
  role: SpeakerRole,
  amps: GearItem[],
  acoustics: AcousticsResult
): DynamicsSettings {
  const headroom = LIMITER_HEADROOM[role];
  const timing = LIMITER_TIMING[role];
  const gainStage = evaluateGainStage(speaker, pickDrivingAmp(amps));

  // El limitador se expresa como headroom en dB por debajo del SPL máximo del parlante.
  // Esto es lo que el técnico configura en el DSP: "threshold = splMax - X dB".
  let limiterHeadroomDb = headroom;
  if (gainStage.status === "overpowered") limiterHeadroomDb += 1; // 1 dB extra de protección

  const limiterDb = Math.round(((speaker.splMax || 120) - limiterHeadroomDb) * 10) / 10;

  return {
    limiterDb,
    limiterHeadroomDb,
    limiterAttackMs: timing.attackMs,
    limiterReleaseMs: timing.releaseMs,
    limiterType: timing.type,
    compressor: buildCompressor(role, acoustics),
    gainStage,
  };
}
