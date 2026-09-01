// Line Array Splay Solver — physics-based coverage optimiser.
//
// Given a hang of N boxes above the stage and an audience that extends from
// zNear to zFar in front of the stage, compute the splay angle between each
// pair of adjacent boxes so that:
//
//   1. Every audience row is covered by at least one box (no vertical gap).
//   2. The top boxes cover the far field; the bottom boxes cover the near field.
//   3. Adjacent boxes overlap slightly (~-6 dB crossover) so coverage is smooth.
//
// This is the classic "J-array" geometry used by every modern line-array
// manufacturer's software (L-Acoustics Soundvision, d&b ArrayCalc, etc.),
// implemented in a simplified form suitable for on-site quick planning.
//
// The output is:
//   - splayAngles[i] = angle (degrees) between box i and box i-1 (0 for i=0).
//   - aimAngles[i]  = absolute pitch angle (deg below horizon) of box i.
//   - Predicted SPL uniformity across the audience.

import type { GearItem } from "./pa-engine.ts";

export interface LineArrayInput {
  /** Number of boxes in the hang (2..24). */
  numBoxes: number;
  /** Vertical coverage of a SINGLE box in degrees. Typical: 5–15° for line arrays. */
  singleBoxCoverageV: number;
  /** Height above stage floor where the array is flown, in metres. */
  flownHeight: number;
  /** Front of audience distance from array, in metres. */
  zNear: number;
  /** Back of audience distance from array, in metres. */
  zFar: number;
  /** Ear height for the audience, in metres. Default 1.6. */
  earHeight?: number;
  /** SPL @ 1 m for a single box (dB). */
  spl1mPerBox?: number;
}

export interface LineArrayPlan {
  /** Absolute pitch angle (deg below horizon) of each box. */
  aimAngles: number[];
  /** Splay angle between box i and box i-1 (deg). splayAngles[0] = 0. */
  splayAngles: number[];
  /** Warnings/notes for the operator. */
  notes: string[];
  /** Estimated on-axis distance covered by each box (metres). */
  targetDistances: number[];
  /** Predicted uniformity: max-min SPL across audience (dB). Lower is better. */
  predictedSpread: number;
  /** Whether the plan hits the target uniformity (< 6 dB spread). */
  isUniform: boolean;
}

/**
 * Compute the J-array angles for a line-array hang.
 *
 * Algorithm:
 *   1. Segment the audience depth into N equal-power segments where each box
 *      covers a slice such that far-field slices are LONGER (smaller angles)
 *      and near-field slices are SHORTER (larger angles) — this compensates
 *      for the 1/r attenuation and produces uniform SPL.
 *
 *      The segment boundaries follow a geometric progression:
 *        z_k = zNear * (zFar/zNear)^(k/N)
 *      so each box radiates to a segment whose midpoint is on-axis.
 *
 *   2. For each box, aim at the midpoint of its segment. Its pitch angle is
 *        atan((flownHeight - earHeight) / z_mid_k)
 *
 *   3. Splay angles are the differences between consecutive absolute pitches.
 *
 *   4. Sanity checks: splay must lie in [0.5, singleBoxCoverageV * 1.3].
 *
 *   5. Predicted SPL uniformity: for each audience distance, sum contributions
 *      from all boxes (each box's on-axis SPL falls off with 1/r, plus a
 *      simple directivity factor based on the box's coverage vs. angle to point).
 */
export function solveLineArray(input: LineArrayInput): LineArrayPlan {
  const {
    numBoxes,
    singleBoxCoverageV,
    flownHeight,
    zNear,
    zFar,
    earHeight = 1.6,
  } = input;
  const spl1m = input.spl1mPerBox ?? 135;
  const notes: string[] = [];

  if (numBoxes < 2) {
    notes.push("Con menos de 2 cajas no hay splay útil; usá el ángulo de tilt total del clúster.");
    const targetZ = (zNear + zFar) / 2;
    const aim = (Math.atan2(flownHeight - earHeight, targetZ) * 180) / Math.PI;
    return {
      aimAngles: numBoxes === 1 ? [aim] : [],
      splayAngles: numBoxes === 1 ? [0] : [],
      notes,
      targetDistances: numBoxes === 1 ? [targetZ] : [],
      predictedSpread: 0,
      isUniform: true,
    };
  }
  if (zNear <= 0.5 || zFar <= zNear) {
    throw new Error("solveLineArray: zNear must be > 0.5 and zFar > zNear");
  }
  if (singleBoxCoverageV <= 0 || singleBoxCoverageV > 30) {
    throw new Error("solveLineArray: singleBoxCoverageV must be in (0, 30]");
  }

  const dy = flownHeight - earHeight;
  if (dy <= 0.5) {
    notes.push("El array está a la altura de la audiencia — considerá subirlo al menos 3 m sobre la cabeza.");
  }

  // Geometric segment boundaries (audience depth split so each box gets equal SPL responsibility).
  const ratio = zFar / zNear;
  const targetDistances: number[] = [];
  for (let k = 0; k < numBoxes; k++) {
    // Box 0 = TOP of the hang → aims at the FAR field (last segment).
    // Box N-1 = BOTTOM → aims at the NEAR field (first segment).
    const idxFromBottom = numBoxes - 1 - k;
    const tMid = (idxFromBottom + 0.5) / numBoxes;
    const zMid = zNear * Math.pow(ratio, tMid);
    targetDistances.push(zMid);
  }

  // Absolute pitch angles (deg below horizon)
  const aimAngles = targetDistances.map((z) => (Math.atan2(dy, z) * 180) / Math.PI);

  // Splay = difference between consecutive absolute pitches
  const splayAngles: number[] = [0];
  for (let i = 1; i < numBoxes; i++) {
    const splay = aimAngles[i] - aimAngles[i - 1];
    splayAngles.push(splay);
  }

  // Sanity checks + clamp
  const maxSplay = singleBoxCoverageV * 1.3;
  for (let i = 1; i < numBoxes; i++) {
    if (splayAngles[i] < 0.4) {
      notes.push(`Splay muy pequeño entre cajas ${i} y ${i + 1} (${splayAngles[i].toFixed(1)}°) — el array está sobre-cerrado, considerá menos boxes.`);
    } else if (splayAngles[i] > maxSplay) {
      notes.push(
        `Splay entre cajas ${i} y ${i + 1} = ${splayAngles[i].toFixed(1)}° excede la cobertura vertical de la caja (${singleBoxCoverageV}°). Habrá gap acústico. Reducí el número de cajas o el zFar.`
      );
    }
  }

  // Predicted SPL along the audience floor
  const numSamples = 40;
  const splSamples: number[] = [];
  for (let s = 0; s < numSamples; s++) {
    const t = s / (numSamples - 1);
    const z = zNear + t * (zFar - zNear);
    // Sum incoherent contributions from all boxes
    let power = 0;
    for (let b = 0; b < numBoxes; b++) {
      const r = Math.hypot(z - 0, dy);
      const invSquare = -20 * Math.log10(Math.max(0.5, r));
      const pitchToPoint = (Math.atan2(dy, z) * 180) / Math.PI;
      const offAxis = Math.abs(pitchToPoint - aimAngles[b]);
      // Simple cone attenuation: 0 dB within half-coverage, then -6 dB at edge
      const halfCov = singleBoxCoverageV / 2;
      let directivity = 0;
      if (offAxis > halfCov * 0.5) {
        const norm = (offAxis - halfCov * 0.5) / (halfCov * 0.5);
        directivity = -6 * Math.min(1, norm);
        if (norm > 1) directivity -= 8 * (norm - 1);
      }
      const boxSpl = spl1m + invSquare + directivity;
      power += Math.pow(10, boxSpl / 10);
    }
    splSamples.push(10 * Math.log10(Math.max(power, 1e-12)));
  }
  const splMin = Math.min(...splSamples);
  const splMax = Math.max(...splSamples);
  const predictedSpread = Math.round((splMax - splMin) * 10) / 10;
  const isUniform = predictedSpread < 6;

  if (isUniform) {
    notes.push(`Cobertura uniforme: ±${(predictedSpread / 2).toFixed(1)} dB en toda la audiencia.`);
  } else {
    notes.push(`Uniformidad marginal: ±${(predictedSpread / 2).toFixed(1)} dB — ajustá los ángulos manualmente o mové el punto de fly.`);
  }

  return {
    aimAngles: aimAngles.map((a) => Math.round(a * 10) / 10),
    splayAngles: splayAngles.map((a) => Math.round(a * 10) / 10),
    notes,
    targetDistances: targetDistances.map((d) => Math.round(d * 10) / 10),
    predictedSpread,
    isUniform,
  };
}

/**
 * Convenience: build a LineArrayInput from a GearItem (top box) and simple room
 * geometry. Uses reasonable defaults for what the box doesn't specify.
 */
export function buildLineArrayInput(
  topBox: GearItem,
  numBoxes: number,
  audienceDepth: number,
  flownHeight = 6
): LineArrayInput {
  return {
    numBoxes,
    // If the box's coverageV is very wide (>25°) it's not a line-array box,
    // but we clamp so the solver still produces something sensible.
    singleBoxCoverageV: Math.min(20, Math.max(4, topBox.coverageV ?? 10)),
    flownHeight,
    zNear: 3,
    zFar: Math.max(6, audienceDepth),
    spl1mPerBox: topBox.splMax,
  };
}
