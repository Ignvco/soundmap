// Early Reflections Engine — SoundMap
// Mirror-image model for the 6 most important first-order reflections.
// No ray tracing — purely geometric from room dimensions.
//
// Physics:
//   Mirror source: reflect the real source position across each boundary.
//   Path length: Euclidean distance from mirror source to receiver.
//   SPL: SPL_1m − 20·log10(r) − absorption_loss_at_boundary
//   Δt vs direct: (r_reflection − r_direct) / v
//
// Comb filtering: Δt < 30 ms → destructive/constructive interference.
//   Nulls:  f_null = 1/(2·Δt), 3/(2·Δt), …
//   Peaks:  f_peak = 1/Δt, 2/Δt, …
//
// Reference: Everest "Master Handbook of Acoustics" 5th ed., ch. 14
//            Kuttruff "Room Acoustics" 5th ed., ch. 4

import type { RoomScanInput } from "./acoustics.ts";

export interface EarlyReflection {
  label: string;
  boundary: "ceiling" | "floor" | "rear-wall" | "side-left" | "side-right" | "front-wall";
  pathM: number;           // total reflected path length (m)
  directPathM: number;     // direct path for reference (m)
  deltaM: number;          // path-length difference (m)
  deltaMs: number;         // time delay vs direct (ms)
  splAtReceiver: number;   // estimated SPL contribution at receiver (dB)
  combRisk: "none" | "low" | "medium" | "high";
  firstNullHz: number;     // frequency of first destructive null (Hz)
  firstPeakHz: number;     // frequency of first constructive peak (Hz)
  echoRisk: boolean;       // Δt > 30 ms → discrete echo risk
}

export interface EarlyReflectionsResult {
  reflections: EarlyReflection[];
  /** Frequency of the worst comb-filtering null in the audible range. */
  worstCombFreqHz: number;
  /** Longest reflection delay found (ms). */
  maxDeltaMs: number;
  recommendation: string;
}

// Single-surface energy loss for first-order reflections.
// These are mid-frequency absorption values typical for each boundary type.
const BOUNDARY_ABSORPTION: Record<string, number> = {
  ceiling:     0.12, // gypsum/industrial avg
  floor:       0.04, // hard floor (concrete/tile) — very reflective
  "rear-wall": 0.08,
  "side-left": 0.08,
  "side-right":0.08,
  "front-wall":0.06, // stage front (often wood/painted)
};

/**
 * Calculate the 6 first-order mirror-image reflections for a point source
 * (e.g. a top speaker) and a receiver (audience ear position).
 *
 * Coordinate system (right-hand):
 *   x = lateral (left–right), y = vertical, z = depth (stage→audience positive)
 *
 * Source assumed at:  (0, srcHeightM, −srcDepthFromCentreM)
 * Receiver assumed at: (0, receiverHeightM, +receiverDistM/2)   [mid-audience]
 */
export function calculateEarlyReflections(
  room: RoomScanInput,
  srcHeightM: number,            // speaker acoustic centre height (m)
  srcDepthM: number,             // speaker depth from room centre (m, toward stage)
  receiverDistM: number,         // horizontal throw to receiver (m)
  receiverHeightM: number,       // ear height at receiver (m) — typical 1.5 m
  spl1m: number,                 // source SPL @ 1 m on-axis (dB)
  speedOfSound: number,          // m/s — temperature-corrected
): EarlyReflectionsResult {
  const { length, width, height } = room;

  // Source and receiver in 3-D coordinates
  // Origin = centre of room at floor level
  const sx = 0;
  const sy = srcHeightM;
  const sz = -srcDepthM; // stage side = negative z

  const rx = 0;
  const ry = receiverHeightM;
  const rz = +receiverDistM; // audience side = positive z

  const directPathM = Math.hypot(rx - sx, ry - sy, rz - sz);

  // Mirror source positions for each boundary:
  //   Ceiling  (y = height):        mirror_y = 2*height − sy
  //   Floor    (y = 0):             mirror_y = −sy
  //   Rear wall (z = +length/2):    mirror_z = 2*(length/2) − sz = length − sz
  //   Front wall (z = −length/2):   mirror_z = −length − sz
  //   Left side (x = −width/2):     mirror_x = −width − sx
  //   Right side (x = +width/2):    mirror_x =  width − sx
  const boundaries: Array<{
    label: string;
    boundary: EarlyReflection["boundary"];
    mx: number; my: number; mz: number;
  }> = [
    { label: "Techo",                  boundary: "ceiling",    mx: sx,         my: 2 * height - sy, mz: sz },
    { label: "Piso",                   boundary: "floor",      mx: sx,         my: -sy,             mz: sz },
    { label: "Pared trasera",          boundary: "rear-wall",  mx: sx,         my: sy,              mz: length - sz },
    { label: "Pared delantera",        boundary: "front-wall", mx: sx,         my: sy,              mz: -length - sz },
    { label: "Pared lateral izquierda",boundary: "side-left",  mx: -width - sx,my: sy,              mz: sz },
    { label: "Pared lateral derecha",  boundary: "side-right", mx:  width - sx,my: sy,              mz: sz },
  ];

  const reflections: EarlyReflection[] = boundaries.map(({ label, boundary, mx, my, mz }) => {
    // Distance from mirror source to receiver
    const pathM = Math.max(directPathM + 0.01, Math.hypot(rx - mx, ry - my, rz - mz));
    const deltaM = pathM - directPathM;
    const deltaMs = (deltaM / speedOfSound) * 1000;

    // Absorption loss at the boundary (energy fraction absorbed → dB loss)
    const alpha = BOUNDARY_ABSORPTION[boundary] ?? 0.08;
    const reflectionLossDb = -10 * Math.log10(1 - alpha);

    // SPL of reflection at receiver
    const splAtReceiver = spl1m - 20 * Math.log10(Math.max(1, pathM)) - reflectionLossDb;

    // Comb filtering
    let combRisk: EarlyReflection["combRisk"] = "none";
    let firstNullHz = 0;
    let firstPeakHz = 0;

    if (deltaMs > 0.05) {
      const deltaSec = deltaMs / 1000;
      firstNullHz = Math.round(1 / (2 * deltaSec));
      firstPeakHz = Math.round(1 / deltaSec);

      if      (deltaMs < 5)  combRisk = "high";   // <5 ms: severe HF comb
      else if (deltaMs < 15) combRisk = "medium";  // 5–15 ms: audible coloration
      else if (deltaMs < 30) combRisk = "low";     // 15–30 ms: mild
      else                   combRisk = "none";    // >30 ms: discrete echo, not comb
    }

    return {
      label,
      boundary,
      pathM: Math.round(pathM * 100) / 100,
      directPathM: Math.round(directPathM * 100) / 100,
      deltaM: Math.round(deltaM * 100) / 100,
      deltaMs: Math.round(deltaMs * 10) / 10,
      splAtReceiver: Math.round(splAtReceiver * 10) / 10,
      combRisk,
      firstNullHz,
      firstPeakHz,
      echoRisk: deltaMs > 30,
    };
  });

  // Sort worst-first
  const riskOrder = { high: 0, medium: 1, low: 2, none: 3 };
  reflections.sort((a, b) => riskOrder[a.combRisk] - riskOrder[b.combRisk]);

  const worst = reflections.find(r => r.combRisk !== "none");
  const worstCombFreqHz = worst?.firstNullHz ?? 0;
  const maxDeltaMs = Math.max(...reflections.map(r => r.deltaMs));

  const highRisk  = reflections.filter(r => r.combRisk === "high");
  const medRisk   = reflections.filter(r => r.combRisk === "medium");
  const echoRisk  = reflections.some(r => r.echoRisk);

  let recommendation: string;
  if (highRisk.length > 0) {
    const surfaces = highRisk.map(r => r.label.toLowerCase()).join(", ");
    recommendation = `Comb filtering severo (< 5 ms): ${surfaces}. Primera nula en ~${highRisk[0].firstNullHz} Hz. Tratamiento difusor/absorbente en esas superficies.`;
  } else if (medRisk.length > 0) {
    const surfaces = medRisk.map(r => r.label.toLowerCase()).join(", ");
    recommendation = `Coloración moderada (5–15 ms): ${surfaces}. Primera nula en ~${medRisk[0].firstNullHz} Hz. Considerar difusión.`;
  } else if (echoRisk) {
    recommendation = `Reflexiones tardías (> 30 ms) detectadas — riesgo de eco perceptible. El sistema de delay puede enmascararlo.`;
  } else {
    recommendation = "Reflexiones dentro de rangos normales. Buen control de directividad del sistema PA.";
  }

  return { reflections, worstCombFreqHz, maxDeltaMs: Math.round(maxDeltaMs * 10) / 10, recommendation };
}
