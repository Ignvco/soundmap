// Modal EQ Engine — SoundMap
// Derives precise EQ notch filters from the REAL room modes (axial resonances)
// computed from the room dimensions, RT60, Schroeder frequency and wall hardness.
//
// Instead of generic "cut 250-500 Hz" bands, this places notches exactly on the
// calculated modal frequencies (343/2L and its harmonics on every axis), detects
// where modes from different axes pile up, and scales the cut depth/Q by how
// reverberant and hard the room is.

import { speedOfSoundFromTemp } from "./acoustics.ts";
import type { AcousticsResult, RoomMaterial, RoomScanInput } from "./acoustics.ts";

/**
 * Velocidad del sonido de referencia a 20 °C.
 * Los modos de sala son f = n·c/2L, así que dependen directamente de `c`: a
 * 35 °C todas las frecuencias modales suben ~2.6 %. Como sobre esos modos se
 * calculan los notches del EQ, un modo mal ubicado deja un notch que no corrige
 * el pico real. `calculateRoomModes` acepta la temperatura del recinto.
 */
const SPEED_OF_SOUND = 343; // m/s a ~20 °C

export type ModeAxis = "largo" | "ancho" | "alto";

export interface RoomMode {
  freq: number;          // Hz
  axes: ModeAxis[];      // which dimension(s) generate this resonance
  order: number;         // harmonic order of the dominant contributor (1 = fundamental)
  severity: number;      // 0..1 — how problematic this resonance is
  pileUp: boolean;       // true when modes from 2+ axes coincide (worst case)
}

export interface ModalEQBand {
  freq: number;
  gain: number;          // dB (always a cut for modal correction)
  q: number;
  type: "peak";
  reason: string;        // plain-language explanation
}

// How long a resonance "rings" depends on how reflective the boundaries are.
// Hard surfaces (concrete/brick/glass) sustain modes far longer than soft ones.
const WALL_HARDNESS: Record<RoomMaterial, number> = {
  concrete: 1.0,
  brick: 0.95,
  glass: 0.9,
  drywall: 0.65,
  wood: 0.55,
  carpet: 0.35,
  foam: 0.2,
};

// Raw modal strength falls off with harmonic order — the fundamental is the worst.
function orderStrength(order: number): number {
  if (order <= 1) return 1.0;
  if (order === 2) return 0.7;
  if (order === 3) return 0.5;
  if (order === 4) return 0.38;
  return 0.28;
}

interface RawMode {
  freq: number;
  axis: ModeAxis;
  order: number;
}

/**
 * Generate every axial mode (fundamental + harmonics) on all three axes up to a
 * sensible ceiling. Axial modes dominate small/medium room response, so we focus
 * there rather than tangential/oblique modes.
 */
function generateAxialModes(input: RoomScanInput, ceiling: number): RawMode[] {
  // Los modos escalan con la velocidad del sonido: usar la temperatura real del
  // recinto en vez de asumir 20 °C siempre.
  const c = input.temperature != null ? speedOfSoundFromTemp(input.temperature) : SPEED_OF_SOUND;
  const dims: { axis: ModeAxis; size: number }[] = [
    { axis: "largo", size: input.length },
    { axis: "ancho", size: input.width },
    { axis: "alto", size: input.height },
  ];

  const modes: RawMode[] = [];
  for (const { axis, size } of dims) {
    if (size <= 0) continue;
    const fundamental = c / (2 * size);
    for (let order = 1; order <= 8; order++) {
      const freq = fundamental * order;
      if (freq > ceiling) break;
      if (freq < 20) continue;
      modes.push({ freq, axis, order });
    }
  }
  return modes;
}

interface ModeCluster {
  freq: number;
  axes: ModeAxis[];
  order: number;
  rawStrength: number;
}

/**
 * Cluster modes that fall within ~1/12 octave of each other. When modes from
 * different axes coincide they reinforce ("modal pile-up") and create the worst
 * peaks in the room — these deserve the deepest cuts.
 */
function clusterModes(modes: RawMode[]): ModeCluster[] {
  const sorted = [...modes].sort((a, b) => a.freq - b.freq);
  const clusters: ModeCluster[] = [];

  for (const m of sorted) {
    const last = clusters[clusters.length - 1];
    // 1/12 octave tolerance ≈ ratio 1.059
    if (last && m.freq / last.freq < 1.06) {
      // Merge into existing cluster (geometric mean keeps it centered)
      const count = last.axes.length;
      last.freq = Math.pow(Math.pow(last.freq, count) * m.freq, 1 / (count + 1));
      if (!last.axes.includes(m.axis)) last.axes.push(m.axis);
      last.order = Math.min(last.order, m.order);
      last.rawStrength += orderStrength(m.order) * 0.5; // coincidence boost
    } else {
      clusters.push({
        freq: m.freq,
        axes: [m.axis],
        order: m.order,
        rawStrength: orderStrength(m.order),
      });
    }
  }
  return clusters;
}

/**
 * Compute the room's problematic resonances from its dimensions and acoustics.
 * Returns the modes sorted by severity (worst first).
 */
export function calculateRoomModes(
  room: RoomScanInput,
  acoustics: AcousticsResult
): RoomMode[] {
  // The modal region lives below the Schroeder frequency; above it the room
  // behaves diffusely and EQ notches stop being meaningful. Clamp to a musical
  // window so we always catch the lowest few modes even in large rooms.
  const ceiling = Math.min(Math.max(acoustics.schroederFreq * 1.2, 120), 320);

  const rawModes = generateAxialModes(room, ceiling);
  const clusters = clusterModes(rawModes);

  // Global severity multiplier: longer RT60 and harder walls = stronger ringing.
  const hardness = WALL_HARDNESS[room.wallMaterial] ?? 0.6;
  const rt60Factor = Math.max(0.5, Math.min(1.8, acoustics.rt60Audience / 1.0));
  const globalMult = hardness * rt60Factor;

  const modes: RoomMode[] = clusters.map((c) => {
    const pileUp = c.axes.length >= 2;
    let severity = c.rawStrength * globalMult;
    if (pileUp) severity += 0.25 * (c.axes.length - 1);
    severity = Math.max(0, Math.min(1, severity));
    return {
      freq: Math.round(c.freq),
      axes: c.axes,
      order: c.order,
      severity: Math.round(severity * 100) / 100,
      pileUp,
    };
  });

  return modes.sort((a, b) => b.severity - a.severity);
}

function axisLabel(axes: ModeAxis[]): string {
  if (axes.length === 1) return `modo ${axes[0]}`;
  return `coincidencia ${axes.join("+")}`;
}

/**
 * Convert the worst room modes into EQ notch bands.
 *
 * @param modes   modes from calculateRoomModes (sorted worst-first)
 * @param rt60    audience RT60 — sets how narrow (high-Q) the notches are
 * @param range   only return bands whose frequency sits inside [min, max]
 * @param maxBands cap to avoid cluttering an output with too many notches
 */
export function modalEQBands(
  modes: RoomMode[],
  rt60: number,
  range: { min: number; max: number },
  maxBands: number
): ModalEQBand[] {
  // Longer reverberation = narrower, higher-Q resonance → narrower correction.
  const baseQ = Math.max(2.5, Math.min(8, 2.5 + rt60 * 2.5));

  const bands: ModalEQBand[] = [];
  for (const mode of modes) {
    if (bands.length >= maxBands) break;
    if (mode.freq < range.min || mode.freq > range.max) continue;
    if (mode.severity < 0.35) continue; // ignore benign modes

    // Cut depth: -2 dB (mild) to -6 dB (severe pile-up in a live room).
    const gain = -Math.round((2 + mode.severity * 4) * 2) / 2;
    // Pile-ups are slightly broader (multiple axes), single modes are tighter.
    const q = Math.round((mode.pileUp ? baseQ * 0.8 : baseQ) * 10) / 10;

    bands.push({
      freq: mode.freq,
      gain,
      q,
      type: "peak",
      reason: mode.pileUp
        ? `Notch en ${mode.freq} Hz: ${axisLabel(mode.axes)} de la sala se refuerzan (pile-up modal) — el peor pico de la respuesta.`
        : `Notch en ${mode.freq} Hz: ${axisLabel(mode.axes)} (orden ${mode.order}) resuena con el RT60 de la sala.`,
    });
  }
  return bands;
}
