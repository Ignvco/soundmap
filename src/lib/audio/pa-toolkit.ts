// PA Toolkit — pure math functions for pro-audio calculators.
// No UI, no state, just clear formulas with sensible defaults.

// ── Cardioid Sub Calculator ─────────────────────────────────────────────────
//
// Given a sub tuning frequency and a target null direction (typically rear),
// compute:
//  - the spacing (front-to-rear) between the front and reversed sub
//  - the delay to apply to the reversed sub
//  - a coverage prediction (front SPL boost, rear cancellation depth)
//
// Physics:
//  - Wavelength λ = 343 / f  (speed of sound / freq, meters)
//  - Front-back cardioid: rear sub goes BEHIND the front sub with:
//      spacing = λ/4  (typical) or 0.5–1 m for tuning around 60–80 Hz
//      delay   = spacing/343 seconds  (in ms)
//      polarity of rear = INVERTED
//    Combined with the acoustic path difference, this creates ~15–25 dB
//    of cancellation directly behind (at the tuning frequency).
//  - End-fire: both subs in-phase but with different delays; broader
//    forward lobe but less rear cancellation.

export type CardioidConfig = "front-rear" | "end-fire" | "gradient";

export interface CardioidResult {
  spacingMeters: number;
  delayMs: number;
  polarityRear: "inverted" | "normal";
  polarityFront: "normal";
  frontBoostDb: number;    // approx SPL gain at target front direction (dB)
  rearNullDb: number;      // approx cancellation depth (dB)
  wavelength: number;
  notes: string[];
}

import { speedOfSoundFromTemp } from "./acoustics.ts";

export function calculateCardioid(
  tuningHz: number,
  config: CardioidConfig = "front-rear",
  /**
   * Temperatura ambiente en °C. Séptima copia de la velocidad del sonido que
   * había en el proyecto: acá estaba fija en 343 m/s. Un array cardioide se
   * arma con separación λ/4 y delay = tiempo de vuelo, así que la temperatura
   * mueve tanto la separación física como el delay. En un show al aire libre a
   * 35 °C, contra los 20 °C asumidos, el error de separación ronda el 2.6 %.
   */
  tempC = 20,
): CardioidResult {
  const c = speedOfSoundFromTemp(tempC);
  const wavelength = c / tuningHz;
  const notes: string[] = [];

  if (config === "front-rear") {
    // Reversed sub behind front sub, λ/4 spacing, delay = time-of-flight, polarity inverted
    const spacing = wavelength / 4;
    const delayMs = (spacing / c) * 1000;
    notes.push("Front sub polaridad normal, sub trasero invertido.");
    notes.push(`Delay al sub trasero = ${delayMs.toFixed(2)} ms (compensa el tiempo de vuelo).`);
    notes.push("Cancelación óptima directamente detrás (180°); ~6 dB extra al frente.");
    return {
      spacingMeters: Math.round(spacing * 100) / 100,
      delayMs: Math.round(delayMs * 100) / 100,
      polarityRear: "inverted",
      polarityFront: "normal",
      frontBoostDb: 6,
      rearNullDb: -18,
      wavelength: Math.round(wavelength * 100) / 100,
      notes,
    };
  }

  if (config === "end-fire") {
    // In-phase array with progressive delay = spacing/c
    const spacing = wavelength / 3;
    const delayMs = (spacing / c) * 1000;
    notes.push("Ambos subs en fase (polaridad normal).");
    notes.push(`Delay al sub trasero = ${delayMs.toFixed(2)} ms.`);
    notes.push("Lóbulo frontal más angosto y ganancia frontal alta (~6 dB); menor cancelación trasera (~-10 dB).");
    return {
      spacingMeters: Math.round(spacing * 100) / 100,
      delayMs: Math.round(delayMs * 100) / 100,
      polarityRear: "normal",
      polarityFront: "normal",
      frontBoostDb: 6,
      rearNullDb: -10,
      wavelength: Math.round(wavelength * 100) / 100,
      notes,
    };
  }

  // gradient (dual reversed, tighter spacing)
  const spacing = wavelength / 6;
  const delayMs = (spacing / c) * 1000;
  notes.push("Gradient — spacing muy corto, sub trasero invertido.");
  notes.push(`Delay al sub trasero = ${delayMs.toFixed(2)} ms.`);
  notes.push("Cancelación trasera profunda (~-20 dB) pero pérdida frontal 3 dB.");
  return {
    spacingMeters: Math.round(spacing * 100) / 100,
    delayMs: Math.round(delayMs * 100) / 100,
    polarityRear: "inverted",
    polarityFront: "normal",
    frontBoostDb: 3,
    rearNullDb: -20,
    wavelength: Math.round(wavelength * 100) / 100,
    notes,
  };
}

// ── Line Array Angle Helper ────────────────────────────────────────────────
//
// Given the desired vertical coverage range (top of audience to bottom of
// audience at the FOH position), the array flying height, and the target
// distance, compute suggested inter-cabinet angles.
//
// Rules of thumb used in Meyer/L-Acoustics/JBL calibration:
//  - Top box: aim at the furthest / highest audience row → small splay (2–5°)
//  - Middle boxes: increase splay progressively
//  - Bottom box: cover the front rows / floor → largest splay (5–10°)
//
// We estimate a piecewise geometric distribution across the number of boxes.

export interface LineArrayInput {
  boxes: number;              // number of top boxes in the array
  flyHeightM: number;         // height of the top box above the audience plane
  farThrowM: number;          // farthest audience distance from the stage
  nearThrowM: number;         // nearest audience distance from the array base
}

export interface LineArrayResult {
  angles: number[];           // splay angle per gap (deg), size = boxes - 1
  targets: { boxIndex: number; distance: number; aimAngle: number }[];
  overallTilt: number;        // top box aim angle from horizontal (deg)
  notes: string[];
}

export function calculateLineArrayAngles(input: LineArrayInput): LineArrayResult {
  const { boxes, flyHeightM: h, farThrowM: far, nearThrowM: near } = input;
  const notes: string[] = [];

  // Overall tilt: top box aims at the far seat
  const topTilt = Math.atan2(h, far) * (180 / Math.PI);
  // The array must fan out to cover from `far` to `near`
  const bottomTilt = Math.atan2(h, near) * (180 / Math.PI);
  const totalSplay = bottomTilt - topTilt;

  if (boxes < 2) {
    notes.push("Con 1 caja no hay splay; apuntar directamente a la audiencia.");
    return {
      angles: [],
      targets: [{ boxIndex: 0, distance: (far + near) / 2, aimAngle: topTilt }],
      overallTilt: Math.round(topTilt * 10) / 10,
      notes,
    };
  }

  const gaps = boxes - 1;

  // Piecewise progressive splay: top small, middle medium, bottom large
  // Weights: top 40%, mid 100%, bottom 200% — normalized so sum = totalSplay
  const weights = Array.from({ length: gaps }, (_, i) => {
    const t = i / Math.max(1, gaps - 1);
    return 0.4 + 1.8 * Math.pow(t, 1.3);
  });
  const wSum = weights.reduce((s, w) => s + w, 0);
  const angles = weights.map(w => Math.round((w / wSum) * totalSplay * 10) / 10);

  // Compute per-box aim angles cumulatively
  const targets: { boxIndex: number; distance: number; aimAngle: number }[] = [];
  let currentAim = topTilt;
  for (let i = 0; i < boxes; i++) {
    const distance = h / Math.tan((currentAim * Math.PI) / 180);
    targets.push({
      boxIndex: i,
      distance: Math.round(distance * 10) / 10,
      aimAngle: Math.round(currentAim * 10) / 10,
    });
    if (i < gaps) currentAim += angles[i];
  }

  notes.push(`Splay total: ${totalSplay.toFixed(1)}° distribuido en ${gaps} juntas.`);
  notes.push(`Caja superior apunta a ${far} m (${topTilt.toFixed(1)}° hacia abajo).`);
  notes.push(`Caja inferior apunta a ${near} m (${bottomTilt.toFixed(1)}° hacia abajo).`);
  if (totalSplay < 1) notes.push("⚠️ Splay muy chico — probablemente sobra un box para este throw.");
  if (totalSplay > 45) notes.push("⚠️ Splay muy grande — considerar delay towers o más boxes.");

  return {
    angles,
    targets,
    overallTilt: Math.round(topTilt * 10) / 10,
    notes,
  };
}

// ── Impedance Calculator ────────────────────────────────────────────────────
//
// Compute the combined impedance for cabinets in series, parallel, or mixed.
// Amps have a MINIMUM rated impedance below which they are unsafe.

export type Wiring = "series" | "parallel";
export interface ImpedanceInput {
  cabinets: number;
  cabinetImpedance: number;
  wiring: Wiring;
  ampMinImpedance?: number; // e.g. 4 (ohms)
}

export interface ImpedanceResult {
  totalImpedance: number;
  safe: boolean;
  warning: string | null;
  formula: string;
}

export function calculateImpedance(input: ImpedanceInput): ImpedanceResult {
  const { cabinets, cabinetImpedance, wiring, ampMinImpedance = 4 } = input;
  let total = 0;
  let formula = "";
  if (wiring === "series") {
    total = cabinets * cabinetImpedance;
    formula = `${cabinets} × ${cabinetImpedance}Ω = ${total}Ω`;
  } else {
    // parallel: 1/Z_total = Σ 1/Z_i
    total = cabinetImpedance / cabinets;
    formula = `${cabinetImpedance}Ω / ${cabinets} = ${Math.round(total * 100) / 100}Ω`;
  }
  const rounded = Math.round(total * 100) / 100;
  const safe = rounded >= ampMinImpedance;
  let warning: string | null = null;
  if (!safe) {
    warning = `Carga por debajo de ${ampMinImpedance}Ω — el amplificador puede sobrecalentar o dispararse. Cambiá la conexión o reducí gabinetes.`;
  } else if (rounded < ampMinImpedance * 1.5) {
    warning = `Cerca del límite (${ampMinImpedance}Ω). Aceptable pero sin margen — evitar sub-cargas puntuales.`;
  }
  return {
    totalImpedance: rounded,
    safe,
    warning,
    formula,
  };
}
