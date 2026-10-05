// SPL Grid — physics-based audience coverage predictor.
//
// Given a room and a rig (tops + subs), computes an SPL(x, z) grid over the
// audience plane using:
//   1. Inverse-square law: SPL(r) = SPL_1m − 20·log₁₀(r)          (spherical)
//   2. Directivity: attenuation off-axis based on coverage cone   (soft cosine)
//   3. Air absorption (ISO 9613-1 simplified, 1 kHz / 8 kHz)      (dB/m)
//   4. Multi-source incoherent power sum:                          (SPL_i → 10^(SPL_i/10) → sum → 10·log₁₀)
//
// Units:
//   distances in metres; SPL_1m expected @ 1 m on-axis; angles in degrees.
//
// The result is a rows×cols grid of SPL values (dBSPL) that can be sampled to
// visualize coverage uniformity or check the audience is above target SPL.
//
// This is NOT a full acoustic ray-tracer — no early reflections, no diffraction
// around obstacles, no floor/ceiling image sources. It IS a good first-order
// direct-field predictor, which is what matters for line-array coverage and
// front-of-house SPL uniformity.

import type { RoomScanInput } from "./acoustics.ts";

/** A single acoustic point source. */
export interface Source {
  /** World-space position in metres. x = width (left−/right+), y = height, z = depth (stage−/audience+). */
  x: number;
  y: number;
  z: number;
  /** SPL @ 1 m on-axis, in dB. */
  spl1m: number;
  /** Direction the source is pointing to (unit vector). */
  aimDx: number;
  aimDy: number;
  aimDz: number;
  /** Horizontal coverage angle in degrees (full width, e.g. 90 = ±45°). */
  coverageH: number;
  /** Vertical coverage angle in degrees. */
  coverageV: number;
  /** Debug label. */
  label?: string;
}

/** Grid of SPL samples over the audience plane. */
export interface SplGrid {
  /** Grid resolution — cols across the width, rows across the length. */
  cols: number;
  rows: number;
  /** Row-major array: cells[r*cols + c] = SPL at that cell (dB). */
  cells: number[];
  /** World-space extents used to produce the grid. */
  bounds: { xMin: number; xMax: number; zMin: number; zMax: number };
  /** Height of the sampling plane (metres). Usually ear height ≈ 1.6 m. */
  yPlane: number;
  /** Stats. */
  min: number;
  max: number;
  mean: number;
  /** Max − min. Lower is more uniform. */
  spread: number;
  /** % of audience cells within ±3 dB of the mean. */
  uniformityPct: number;
}

/**
 * Air absorption coefficient α in dB/m using the ISO 9613-1 relaxation-frequency
 * model, corrected for temperature and relative humidity.
 *
 * Inputs:
 *   freqHz       — frequency (Hz)
 *   tempC        — ambient temperature (°C). Default 20 °C.
 *   relHumidity  — relative humidity (%). Default 50 %.
 *
 * Key practical effects:
 *   • Humidity matters most at high frequencies (8 kHz absorption can vary 3× between
 *     20 % and 80 % RH). At 1 kHz the effect is < 20 %.
 *   • Temperature shifts the absorption slightly: warmer air is marginally less absorptive
 *     at HF. Effect is small compared to humidity.
 *
 * Reference: ISO 9613-1:1993, equations 3–6.
 */
export function airAbsorptionDbPerMeter(freqHz: number, tempC = 20, relHumidity = 50): number {
  const T = tempC + 273.15;       // Kelvin
  const T_ref = 293.15;           // 20 °C reference
  // pa/p_r = 1 (standard atmosphere assumed; good for any altitude < 500 m)

  // Molar concentration of water vapour h (%) — ISO 9613-1 eq. 4
  // Uses Magnus formula for saturation vapour pressure.
  const psat = 6.1078 * Math.pow(10, 7.5 * tempC / (237.3 + tempC)); // hPa
  const h = Math.max(0.01, (relHumidity / 100) * (psat / 1013.25) * 100); // %

  // Oxygen relaxation frequency (Hz) — ISO 9613-1 eq. 3
  const f_rO = 24 + 4.04e4 * h * (0.02 + h) / (0.391 + h);

  // Nitrogen relaxation frequency (Hz) — ISO 9613-1 eq. 3
  const f_rN = Math.pow(T / T_ref, -0.5) *
    (9 + 280 * h * Math.exp(-4.170 * (Math.pow(T / T_ref, -1 / 3) - 1)));

  const f2 = freqHz * freqHz;

  // Attenuation coefficient (dB/m) — ISO 9613-1 eq. 5
  const alpha = 8.686 * f2 * (
    1.84e-11 * Math.pow(T / T_ref, 0.5) +          // classical + vibrational
    Math.pow(T / T_ref, -2.5) * (
      0.01275 * Math.exp(-2239.1 / T) / (f_rO + f2 / f_rO) +   // O₂ relaxation
      0.1068  * Math.exp(-3352.0 / T) / (f_rN + f2 / f_rN)      // N₂ relaxation
    )
  );

  return Math.max(0, alpha);
}

/**
 * Directivity factor: attenuation (in dB, negative) as a function of off-axis
 * angle vs. the coverage angle. Uses a soft cosine roll-off calibrated so that
 * SPL is −6 dB at the coverage edge (half-angle) and drops off gradually
 * beyond.
 */
export function offAxisAttenuationDb(angleDeg: number, coverageDeg: number): number {
  if (coverageDeg <= 0) return -60;
  const halfCov = coverageDeg / 2;
  const abs = Math.abs(angleDeg);
  if (abs <= halfCov * 0.3) return 0; // on-axis flat region
  // Normalised angle: 0 at flat region → 1 at coverage edge → >1 outside
  const norm = (abs - halfCov * 0.3) / (halfCov * 0.7);
  if (norm <= 1) {
    // Cosine roll-off to -6 dB at edge
    return -6 * Math.pow(Math.min(1, norm), 1.6);
  }
  // Beyond the coverage edge: additional 12 dB per additional half-angle
  const over = norm - 1;
  return -6 - 12 * Math.min(over, 2);
}

/**
 * Compute the direct-field SPL contribution of a single source at a given
 * audience point (x, y, z), including inverse-square, directivity and air
 * absorption at `freqHz`.
 */
export function sourceSplAtPoint(
  src: Source,
  x: number,
  y: number,
  z: number,
  freqHz: number,
  tempC = 20,
  humidity = 50,
): number {
  const dx = x - src.x;
  const dy = y - src.y;
  const dz = z - src.z;
  const r = Math.max(0.5, Math.hypot(dx, dy, dz));

  // Inverse-square (spherical spreading)
  const invSquare = -20 * Math.log10(r);

  // Air absorption — uses real T and RH from room conditions
  const airDb = -airAbsorptionDbPerMeter(freqHz, tempC, humidity) * r;

  // Off-axis attenuation (horizontal + vertical, combined as worst-of-the-two)
  const nx = dx / r;
  const ny = dy / r;
  const nz = dz / r;

  // Horizontal angle: angle between (nx, nz) and aim projected onto XZ plane
  const aimXZ = Math.hypot(src.aimDx, src.aimDz);
  const dirXZ = Math.hypot(nx, nz);
  let hAngleDeg = 0;
  if (aimXZ > 1e-6 && dirXZ > 1e-6) {
    const cosH = (src.aimDx * nx + src.aimDz * nz) / (aimXZ * dirXZ);
    hAngleDeg = (Math.acos(Math.max(-1, Math.min(1, cosH))) * 180) / Math.PI;
  }

  // Vertical angle: angle between aim and direction in YZ plane
  // (approximate using arcsin(dy/r) vs. arcsin(aimDy/|aim|))
  const aimLen = Math.hypot(src.aimDx, src.aimDy, src.aimDz);
  let vAngleDeg = 0;
  if (aimLen > 1e-6) {
    const aimPitch = Math.asin(src.aimDy / aimLen);
    const dirPitch = Math.asin(ny);
    vAngleDeg = Math.abs(dirPitch - aimPitch) * (180 / Math.PI);
  }

  const hAtt = offAxisAttenuationDb(hAngleDeg, src.coverageH);
  const vAtt = offAxisAttenuationDb(vAngleDeg, src.coverageV);
  // Combined: worst of the two, but each contributes at least 40 % of its value
  const directivity = Math.min(hAtt, vAtt) + Math.max(hAtt, vAtt) * 0.4;

  return src.spl1m + invSquare + airDb + directivity;
}

/**
 * Incoherent power sum of multiple SPL values (in dB). Correct for uncorrelated
 * sources; approximate for correlated but ~within 1–2 dB in typical PA rigs.
 */
export function sumSplDb(splValues: number[]): number {
  if (splValues.length === 0) return -Infinity;
  const power = splValues.reduce((sum, s) => sum + Math.pow(10, s / 10), 0);
  return 10 * Math.log10(Math.max(power, 1e-12));
}

/**
 * Compute the SPL grid over the audience plane.
 *
 * @param room Room dimensions (defines the sampling bounds).
 * @param sources All active sources (tops, subs, front-fills, etc).
 * @param opts   Grid resolution + evaluation frequency.
 */
export function computeSplGrid(
  room: RoomScanInput,
  sources: Source[],
  opts: {
    cols?: number;
    rows?: number;
    /** Frequency at which to evaluate (Hz). Defaults to 1 kHz (speech midband). */
    freqHz?: number;
    /** Height of the sampling plane (m). Defaults to seated-ear ~1.6 m. */
    yPlane?: number;
    /** Front of audience in metres from centre of room (usually 0). */
    audienceZStart?: number;
    /** Depth of audience along z (0..room.length by default). */
    audienceZEnd?: number;
    /** Ambient temperature (°C) for air absorption calculation. Default 20 °C. */
    tempC?: number;
    /** Relative humidity (%) for air absorption calculation. Default 50 %. */
    humidity?: number;
  } = {}
): SplGrid {
  const cols = Math.max(4, opts.cols ?? 24);
  const rows = Math.max(4, opts.rows ?? 32);
  const freqHz = opts.freqHz ?? 1000;
  const yPlane = opts.yPlane ?? 1.6;
  const tempC = opts.tempC ?? 20;
  const humidity = opts.humidity ?? 50;

  // Audience footprint: front row starts a bit past the stage, ends at back wall.
  const stageDepth = room.length * 0.12;
  const zMin = opts.audienceZStart ?? -room.length / 2 + stageDepth + 0.5;
  const zMax = opts.audienceZEnd ?? room.length / 2 - 0.5;
  const xMin = -room.width / 2 + 0.3;
  const xMax = room.width / 2 - 0.3;

  const cells: number[] = [];
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const u = cols === 1 ? 0.5 : c / (cols - 1);
      const v = rows === 1 ? 0.5 : r / (rows - 1);
      const x = xMin + u * (xMax - xMin);
      const z = zMin + v * (zMax - zMin);

      const contributions = sources.map((s) => sourceSplAtPoint(s, x, yPlane, z, freqHz, tempC, humidity));
      const spl = sumSplDb(contributions);
      cells.push(spl);
      if (spl < min) min = spl;
      if (spl > max) max = spl;
      sum += spl;
    }
  }

  const mean = sum / cells.length;
  const withinBand = cells.filter((s) => Math.abs(s - mean) <= 3).length;
  const uniformityPct = Math.round((withinBand / cells.length) * 100);

  return {
    cols,
    rows,
    cells,
    bounds: { xMin, xMax, zMin, zMax },
    yPlane,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    mean: Math.round(mean * 10) / 10,
    spread: Math.round((max - min) * 10) / 10,
    uniformityPct,
  };
}

/**
 * Sample the SPL at an arbitrary (x, z) coordinate in the world, using
 * bilinear interpolation on the grid. Returns NaN if outside bounds.
 */
export function sampleGrid(grid: SplGrid, x: number, z: number): number {
  const { xMin, xMax, zMin, zMax } = grid.bounds;
  if (x < xMin || x > xMax || z < zMin || z > zMax) return NaN;
  const u = (x - xMin) / (xMax - xMin);
  const v = (z - zMin) / (zMax - zMin);
  const cu = u * (grid.cols - 1);
  const cv = v * (grid.rows - 1);
  const c0 = Math.floor(cu);
  const c1 = Math.min(grid.cols - 1, c0 + 1);
  const r0 = Math.floor(cv);
  const r1 = Math.min(grid.rows - 1, r0 + 1);
  const fx = cu - c0;
  const fy = cv - r0;
  const a = grid.cells[r0 * grid.cols + c0];
  const b = grid.cells[r0 * grid.cols + c1];
  const d = grid.cells[r1 * grid.cols + c0];
  const e = grid.cells[r1 * grid.cols + c1];
  return a * (1 - fx) * (1 - fy) + b * fx * (1 - fy) + d * (1 - fx) * fy + e * fx * fy;
}
