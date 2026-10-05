// Stage Optimizer — brute-force search over a bounded parameter space to find
// the deployment that maximises SPL uniformity across the audience.
//
// Approach: for a given room + gear (tops + subs), enumerate a small grid of
// candidate configurations (top elevation, top splay/aim, sub cluster mode)
// and for each one compute the physics-based SPL grid, then rank by a scalar
// score: 0.7·uniformityPct − 0.3·spread + 0.02·meanSpl (bonus for louder).
//
// The output is the top-N candidates with actionable parameters that the UI
// can apply to the current pin layout. This runs entirely on the client and
// takes ~200 ms for 50-100 candidates on a mid-range phone.

import type { RoomScanInput } from "./acoustics.ts";
import type { GearItem } from "./pa-engine.ts";
import { computeSplGrid, type Source, type SplGrid } from "./spl-grid.ts";
import { arrayGainDb } from "./array-gain.ts";

export type SubMode = "center-cluster" | "distributed" | "cardioid";

export interface StageCandidate {
  /** Human-friendly label like "Tops @ 6m · Splay 30° · Subs distributed" */
  label: string;
  /** Where the tops are hung (metres above stage floor). */
  topsElevation: number;
  /** Toe-in / splay angle of the two top clusters (degrees, per side). Positive angles turn tops inward. */
  topsSplayDeg: number;
  /** Down-tilt of the tops (positive → tops aim towards floor). */
  topsTiltDeg: number;
  /** Sub deployment. */
  subMode: SubMode;
  /** Resulting physics grid. */
  grid: SplGrid;
  /** Composite score (higher is better). */
  score: number;
}

export interface OptimizerOptions {
  /** Grid resolution. Coarser is faster; 12×16 is a good default. */
  cols?: number;
  rows?: number;
  /** Frequency at which the score is evaluated. */
  freqHz?: number;
  /** Number of best candidates to return. */
  topN?: number;
  /** Progress callback fired between candidates (0..1). */
  onProgress?: (frac: number) => void;
}

/** Deg → rad */
const rad = (deg: number) => (deg * Math.PI) / 180;

/**
 * Build the list of Sources for a given candidate.
 * All positions are in world metres, matching the Stage3D coordinate frame.
 */
function buildSources(
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  cand: Pick<StageCandidate, "topsElevation" | "topsSplayDeg" | "topsTiltDeg" | "subMode">
): Source[] {
  const stageDepth = room.length * 0.12;
  const stageZ = -room.length / 2 + stageDepth;
  const totalTops = tops.reduce((s, g) => s + (g.quantity ?? 1), 0);
  const totalSubs = subs.reduce((s, g) => s + (g.quantity ?? 1), 0);

  const topBox = tops[0];
  const subBox = subs[0];

  const sources: Source[] = [];

  // ── Tops: two clusters L/R, toed inward by splay ─────────────────────────
  if (totalTops > 0 && topBox) {
    const perSideCount = Math.ceil(totalTops / 2);
    const sideX = room.width * 0.32;
    // Aim: forward (+z), with tilt down, plus horizontal toe-in
    const splayRad = rad(cand.topsSplayDeg);
    const tiltRad = rad(cand.topsTiltDeg);
    const aimDzBase = Math.cos(splayRad) * Math.cos(tiltRad);
    const aimDxSide = Math.sin(splayRad) * Math.cos(tiltRad);
    const aimDy = -Math.sin(tiltRad);
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const x = sign * sideX;
      const clusterCount = side === 0 ? perSideCount : totalTops - perSideCount;
      if (clusterCount <= 0) continue;
      // Cada cluster se colapsa a una fuente puntual en su centro. Los tops se
      // suman de forma incoherente (10·log10·n) — mismo criterio que pa-engine
      // y system-vitals, para que el optimizador no prometa SPL que el resto de
      // la app no confirma.
      const clusterSpl1m = topBox.splMax + arrayGainDb(clusterCount, "incoherent");
      sources.push({
        x,
        y: cand.topsElevation,
        z: stageZ + 0.6,
        spl1m: clusterSpl1m,
        aimDx: -sign * aimDxSide, // toe INWARD
        aimDy,
        aimDz: aimDzBase,
        coverageH: topBox.coverageH ?? 90,
        coverageV: topBox.coverageV ?? 40,
      });
    }
  }

  // ── Subs ─────────────────────────────────────────────────────────────────
  if (totalSubs > 0 && subBox) {
    const subSpl = subBox.splMax;
    switch (cand.subMode) {
      case "center-cluster": {
        sources.push({
          x: 0,
          y: 0.5,
          z: stageZ + 1.2,
          spl1m: subSpl + arrayGainDb(totalSubs, "coupled"),
          aimDx: 0, aimDy: 0, aimDz: 1,
          coverageH: 180, coverageV: 180,
        });
        break;
      }
      case "distributed": {
        // Split L/R and slightly offset from centre
        const half = Math.ceil(totalSubs / 2);
        const xoff = room.width * 0.24;
        sources.push({
          x: -xoff, y: 0.5, z: stageZ + 1.2,
          spl1m: subSpl + arrayGainDb(half, "coupled"),
          aimDx: 0, aimDy: 0, aimDz: 1,
          coverageH: 180, coverageV: 180,
        });
        sources.push({
          x: xoff, y: 0.5, z: stageZ + 1.2,
          spl1m: subSpl + arrayGainDb(totalSubs - half, "coupled"),
          aimDx: 0, aimDy: 0, aimDz: 1,
          coverageH: 180, coverageV: 180,
        });
        break;
      }
      case "cardioid": {
        // Simple 3-cardioid approximation: front-facing subs plus a rear-facing
        // sub with inverted polarity (modeled as -12 dB back-radiation).
        const front = Math.max(1, totalSubs - Math.floor(totalSubs / 3));
        const rear = totalSubs - front;
        sources.push({
          x: 0, y: 0.5, z: stageZ + 1.2,
          spl1m: subSpl + arrayGainDb(front, "coupled"),
          aimDx: 0, aimDy: 0, aimDz: 1,
          coverageH: 180, coverageV: 180,
        });
        if (rear > 0) {
          sources.push({
            x: 0, y: 0.5, z: stageZ + 0.4,
            spl1m: subSpl + arrayGainDb(rear, "coupled") - 12, // rear rejection
            aimDx: 0, aimDy: 0, aimDz: -1,
            coverageH: 120, coverageV: 120,
          });
        }
        break;
      }
    }
  }

  return sources;
}

/**
 * Score a grid: higher is better. Blends uniformity, spread, and mean SPL.
 * uniformityPct is 0..100, spread is dB (want low), mean is dB (want moderate).
 */
function scoreGrid(grid: SplGrid): number {
  if (!isFinite(grid.mean) || !isFinite(grid.max)) return -Infinity;
  // Penalise clipping (>110 dB average is over-driven)
  const clipPenalty = grid.mean > 108 ? (grid.mean - 108) * 3 : 0;
  return 0.7 * grid.uniformityPct - 0.3 * grid.spread + 0.02 * grid.mean - clipPenalty;
}

/** Enumerate the search grid — kept small enough to run in ~200 ms on mobile. */
function generateCandidates(room: RoomScanInput): Array<Omit<StageCandidate, "grid" | "score" | "label">> {
  const elevations = [
    Math.max(3, room.height * 0.55),
    Math.max(4, room.height * 0.7),
    Math.max(5, room.height * 0.85),
  ];
  const splays = [0, 15, 25, 35]; // toe-in per side
  const tilts = [0, 5, 10, 15];
  const subModes: SubMode[] = ["center-cluster", "distributed", "cardioid"];

  const out: Array<Omit<StageCandidate, "grid" | "score" | "label">> = [];
  for (const e of elevations) {
    for (const s of splays) {
      for (const t of tilts) {
        for (const m of subModes) {
          out.push({ topsElevation: e, topsSplayDeg: s, topsTiltDeg: t, subMode: m });
        }
      }
    }
  }
  return out; // = 3·4·4·3 = 144 candidates
}

function labelFor(c: Pick<StageCandidate, "topsElevation" | "topsSplayDeg" | "topsTiltDeg" | "subMode">): string {
  const modeES = c.subMode === "center-cluster" ? "Subs centrales"
              : c.subMode === "distributed" ? "Subs distribuidos"
              : "Cardioide";
  return `Tops @ ${c.topsElevation.toFixed(1)}m · Splay ${c.topsSplayDeg}° · Tilt ${c.topsTiltDeg}° · ${modeES}`;
}

/**
 * Run the optimizer. Returns the top-N candidates sorted by score.
 *
 * The function yields control between candidates via setTimeout so that the UI
 * stays responsive on low-end phones. For up to 150 candidates on a modern
 * device this completes in ~200-400 ms; on older phones ~600-900 ms.
 */
export async function optimizeStage(
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  opts: OptimizerOptions = {}
): Promise<StageCandidate[]> {
  const cols = opts.cols ?? 12;
  const rows = opts.rows ?? 16;
  const freqHz = opts.freqHz ?? 1000;
  const topN = opts.topN ?? 3;

  const candidates = generateCandidates(room);
  const scored: StageCandidate[] = [];

  for (let i = 0; i < candidates.length; i++) {
    const c = candidates[i];
    const sources = buildSources(room, tops, subs, c);
    if (sources.length === 0) continue;
    const grid = computeSplGrid(room, sources, { cols, rows, freqHz });
    const score = scoreGrid(grid);
    scored.push({
      ...c,
      grid,
      score,
      label: labelFor(c),
    });
    // Yield periodically so the main thread stays responsive.
    if (i % 12 === 0) {
      opts.onProgress?.(i / candidates.length);
      await new Promise<void>((resolve) => setTimeout(resolve, 0));
    }
  }
  opts.onProgress?.(1);
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topN);
}
