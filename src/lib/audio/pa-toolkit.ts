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
  delayTarget: "front" | "rear";
  polar: { angleDeg: number; db: number }[];
  notes: string[];
}

import { speedOfSoundFromTemp } from "./acoustics.ts";

/** Far-field pressure sum of two identical omnidirectional point sources.
 * Angle 0 is forward (+z); the rear source is at z=-spacing.
 * Levels are relative to ONE source. No ground, enclosure or mismatch model.
 */
export function cardioidResponseDb(frequency: number, angleDeg: number, spacing: number,
  frontDelayMs: number, rearDelayMs: number, rearPolarity: 1 | -1, c = 343): number {
  const omega = 2 * Math.PI * frequency;
  const frontPhase = omega * frontDelayMs / 1000;
  const rearPhase = omega * (rearDelayMs / 1000 + spacing * Math.cos(angleDeg * Math.PI / 180) / c);
  const re = Math.cos(frontPhase) + rearPolarity * Math.cos(rearPhase);
  const im = Math.sin(frontPhase) + rearPolarity * Math.sin(rearPhase);
  return 20 * Math.log10(Math.max(0.001, Math.hypot(re, im)));
}

export function calculateCardioid(tuningHz: number, config: CardioidConfig = "front-rear", tempC = 20): CardioidResult {
  if (!Number.isFinite(tuningHz) || tuningHz <= 0) throw new RangeError("Frecuencia no válida");
  const c = speedOfSoundFromTemp(tempC);
  const wavelength = c / tuningHz;
  const spacing = wavelength / (config === "end-fire" ? 3 : config === "gradient" ? 6 : 4);
  const delayMs = spacing / c * 1000;
  const endFire = config === "end-fire";
  const polar = Array.from({ length: 73 }, (_, i) => ({ angleDeg: i * 5,
    db: cardioidResponseDb(tuningHz, i * 5, spacing, endFire ? delayMs : 0, endFire ? 0 : delayMs, endFire ? 1 : -1, c) }));
  const frontBoostDb = polar[0].db;
  return {
    spacingMeters: Math.round(spacing * 100) / 100,
    delayMs: Math.round(delayMs * 100) / 100,
    delayTarget: endFire ? "front" : "rear",
    polarityRear: endFire ? "normal" : "inverted", polarityFront: "normal",
    frontBoostDb: Math.round(frontBoostDb * 10) / 10,
    rearNullDb: Math.round((polar[36].db - frontBoostDb) * 10) / 10,
    wavelength: Math.round(wavelength * 100) / 100, polar,
    notes: [
      `Eje +z hacia el público; separación ${spacing.toFixed(2)} m.`,
      `Delay al sub ${endFire ? "delantero" : "trasero"}: ${delayMs.toFixed(2)} ms. El otro queda a 0 ms.`,
      `Polaridad trasera ${endFire ? "normal" : "invertida"}; delantera normal.`,
      "Modelo ideal a la frecuencia indicada, con dos fuentes idénticas. Rechazo referido al frente; un nulo ideal se limita a -60 dB en el dibujo. No predice el rechazo de cajas reales.",
      "Verificar polaridad, latencia, nivel y respuesta con medición antes de aplicar al sistema.",
    ],
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
