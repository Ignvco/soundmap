// SoundMap Vitals — compute REAL system state for the AI Home dashboard.
// Turns the Zustand store state into chart-ready data structures.
//
// Includes:
// - eqCurveFromBands(): peak/shelf biquad sum → gain vs freq series
// - coverageByZone():   split SPL grid into Front/Center/Back/Left/Right averages
// - paSummary():        totals for tops/subs + max SPL + headroom vs target
// - roomSummary():      dims, capacity, RT60, echoRisk chip
import type { DSPBand } from "./dsp-engine.ts";
import type { GearItem } from "./pa-engine.ts";
import type { RoomScanInput, AcousticsResult } from "./acoustics.ts";
import { computeSplGrid, type Source, type SplGrid } from "./spl-grid.ts";
import { arrayGainDb, combinedSplMax } from "./array-gain.ts";

// ── EQ curve builder ────────────────────────────────────────────────────────
/** Log-spaced sample points across 20 Hz–20 kHz (default 48 points). */
export function logFreqPoints(count = 48, fMin = 20, fMax = 20000): number[] {
  const out: number[] = [];
  const ratio = Math.log(fMax / fMin) / (count - 1);
  for (let i = 0; i < count; i++) out.push(fMin * Math.exp(i * ratio));
  return out;
}

/** Response (dB) of a single parametric-EQ band at freq f (Hz). */
function bandResponseDb(b: DSPBand, f: number): number {
  const f0 = b.freq;
  const g = b.gain;
  const q = b.q || 1;
  if (b.type === "hp") {
    // 12 dB/oct high-pass — gentle approximation
    const r = f / f0;
    return -20 * Math.log10(Math.sqrt(1 + Math.pow(1 / r, 4)));
  }
  if (b.type === "lp") {
    const r = f / f0;
    return -20 * Math.log10(Math.sqrt(1 + Math.pow(r, 4)));
  }
  if (b.type === "shelf-lo") {
    // 6 dB/oct shelf ramp centred on f0
    const r = f / f0;
    return g / (1 + r * r);
  }
  if (b.type === "shelf-hi") {
    const r = f0 / f;
    return g / (1 + r * r);
  }
  // Default: peak/parametric
  const w = Math.log2(f / f0) * q * 2;
  return g / (1 + w * w);
}

/** Sum of all band responses across log-spaced points. */
export function eqCurveFromBands(bands: DSPBand[]): { hz: number; db: number }[] {
  const freqs = logFreqPoints(48);
  return freqs.map((f) => {
    const db = bands.reduce((s, b) => s + bandResponseDb(b, f), 0);
    return { hz: f, db: Math.round(db * 10) / 10 };
  });
}

/** Compact one EQ curve into ~10 zones so the chart isn't dense. */
export function eqBucketed(curve: { hz: number; db: number }[]): { label: string; value: number }[] {
  const labels = ["31", "63", "125", "250", "500", "1k", "2k", "4k", "8k", "16k"];
  const targets = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  return targets.map((tgt, i) => {
    // Nearest freq bucket
    let best = curve[0];
    let bestDist = Math.abs(Math.log2(best.hz / tgt));
    for (const p of curve) {
      const d = Math.abs(Math.log2(p.hz / tgt));
      if (d < bestDist) { best = p; bestDist = d; }
    }
    return { label: labels[i], value: best.db };
  });
}

// ── PA summary ──────────────────────────────────────────────────────────────
export interface PASummary {
  topsCount: number;
  subsCount: number;
  monitorsCount: number;
  maxSplTops: number;
  maxSplSubs: number;
  /**
   * SPL máximo combinado de los tops @1 m, en dB.
   * Usa suma incoherente (10·log10·N) — igual criterio que `pa-engine`, porque
   * un sistema L/D full-range NO acopla en fase a lo ancho del espectro.
   */
  arraySpl: number;
  /** Headroom vs a music-oriented target of 105 dB SPL @ FOH. */
  headroomDb: number;
}

/** Nivel de referencia en la posición de mezcla contra el que se mide el headroom. */
export const FOH_TARGET_SPL = 105;

export function paSummary(tops: GearItem[], subs: GearItem[], monitors: GearItem[]): PASummary {
  const sum = (arr: GearItem[]) => arr.reduce((s, g) => s + (g.quantity ?? 1), 0);
  const topsCount = sum(tops);
  const subsCount = sum(subs);
  const monitorsCount = sum(monitors);
  // El SPL de referencia de UNA caja: el peor modelo del grupo, porque es el que
  // limita el sistema. Mostrar el mejor sería engañoso en un rig mixto.
  const maxSplTops = tops.length > 0 ? Math.min(...tops.map((t) => t.splMax || Infinity)) : 0;
  const maxSplSubs = subs.length > 0 ? Math.min(...subs.map((s) => s.splMax || Infinity)) : 0;
  // Suma real de potencia entre modelos distintos (no asume rig homogéneo).
  const arraySpl = combinedSplMax(tops, "incoherent");
  const headroomDb = Math.round((arraySpl - FOH_TARGET_SPL) * 10) / 10;
  return {
    topsCount,
    subsCount,
    monitorsCount,
    maxSplTops: Number.isFinite(maxSplTops) ? maxSplTops : 0,
    maxSplSubs: Number.isFinite(maxSplSubs) ? maxSplSubs : 0,
    arraySpl: Math.round(arraySpl * 10) / 10,
    headroomDb,
  };
}

// ── Coverage by zone ────────────────────────────────────────────────────────
export interface CoverageZones {
  /** Front-of-house (near stage), Center (mid), Back, Left flank, Right flank. */
  front: number;
  center: number;
  back: number;
  leftSide: number;
  rightSide: number;
  /** Uniformity computed from min/max across zones (higher = more uniform). */
  uniformityPct: number;
}

/**
 * Construye la lista de fuentes SPL de una escena.
 * Exportada porque la pantalla de comparación tenía su PROPIA copia con
 * `20·log10` — la fórmula vieja — así que los deltas entre escenas salían de
 * un modelo distinto al de la home y del optimizador.
 */
export function sceneToSources(room: RoomScanInput, tops: GearItem[], subs: GearItem[]): Source[] {
  const stageDepth = room.length * 0.12;
  const stageZ = -room.length / 2 + stageDepth;
  const sources: Source[] = [];
  const totalTops = tops.reduce((s, g) => s + (g.quantity ?? 1), 0);
  const topBox = tops[0];
  if (totalTops > 0 && topBox) {
    const perSide = Math.ceil(totalTops / 2);
    for (let side = 0; side < 2; side++) {
      const sign = side === 0 ? -1 : 1;
      const count = side === 0 ? perSide : totalTops - perSide;
      if (count <= 0) continue;
      sources.push({
        x: sign * room.width * 0.32,
        y: room.height * 0.75,
        z: stageZ + 0.6,
        spl1m: topBox.splMax + arrayGainDb(count, "incoherent"),
        aimDx: 0, aimDy: -0.35, aimDz: 1,
        coverageH: topBox.coverageH ?? 90,
        coverageV: topBox.coverageV ?? 40,
      });
    }
  }
  const totalSubs = subs.reduce((s, g) => s + (g.quantity ?? 1), 0);
  const subBox = subs[0];
  if (totalSubs > 0 && subBox) {
    sources.push({
      x: 0, y: 0.5, z: stageZ + 1.2,
      // Los subs sí acoplan: a 40 Hz λ ≈ 8.6 m, un stack de 4 es un punto único.
      spl1m: subBox.splMax + arrayGainDb(totalSubs, "coupled"),
      aimDx: 0, aimDy: 0, aimDz: 1,
      coverageH: 180, coverageV: 180,
    });
  }
  return sources;
}

/** Average SPL across a rectangular slice of the grid (row range, col range). */
function avgSpl(grid: SplGrid, r0: number, r1: number, c0: number, c1: number): number {
  let sum = 0;
  let n = 0;
  for (let r = r0; r < r1; r++) {
    for (let c = c0; c < c1; c++) {
      sum += grid.cells[r * grid.cols + c];
      n++;
    }
  }
  return n > 0 ? Math.round((sum / n) * 10) / 10 : 0;
}

export function coverageByZone(
  room: RoomScanInput, tops: GearItem[], subs: GearItem[],
): CoverageZones | null {
  const sources = sceneToSources(room, tops, subs);
  if (sources.length === 0) return null;
  const grid = computeSplGrid(room, sources, { cols: 12, rows: 18 });
  const rows = grid.rows;
  const cols = grid.cols;
  // Rows go from stage (r=0) to back (r=rows-1)
  const front = avgSpl(grid, 0, Math.floor(rows / 3), Math.floor(cols / 3), Math.ceil((cols * 2) / 3));
  const center = avgSpl(grid, Math.floor(rows / 3), Math.floor((rows * 2) / 3), Math.floor(cols / 3), Math.ceil((cols * 2) / 3));
  const back = avgSpl(grid, Math.floor((rows * 2) / 3), rows, Math.floor(cols / 3), Math.ceil((cols * 2) / 3));
  const leftSide = avgSpl(grid, 0, rows, 0, Math.floor(cols / 3));
  const rightSide = avgSpl(grid, 0, rows, Math.ceil((cols * 2) / 3), cols);
  const vals = [front, center, back, leftSide, rightSide].filter((v) => v > 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const uniformityPct = vals.length > 0 && max > 0
    ? Math.round(((1 - (max - min) / max) * 100))
    : 0;
  return { front, center, back, leftSide, rightSide, uniformityPct };
}

// ── Room summary ────────────────────────────────────────────────────────────
export interface RoomSummary {
  name: string;
  dims: string;
  capacity: number;
  rt60Audience: number;
  echoRiskLabel: string;
  echoRiskHue: string;
}
const RISK_META: Record<string, { label: string; hue: string }> = {
  low:    { label: "Bajo",   hue: "#C9F03E" },
  medium: { label: "Medio",  hue: "#F5B62E" },
  high:   { label: "Alto",   hue: "#FF6B4A" },
};
export function roomSummary(room: RoomScanInput, acoustics: AcousticsResult): RoomSummary {
  const risk = RISK_META[acoustics.echoRisk] ?? RISK_META.low;
  return {
    name: room.name,
    dims: `${room.length} × ${room.width} × ${room.height} m`,
    capacity: room.capacity,
    rt60Audience: acoustics.rt60Audience,
    echoRiskLabel: risk.label,
    echoRiskHue: risk.hue,
  };
}

// ── PA frequency response ────────────────────────────────────────────────────
/**
 * Bucketed frequency response for the full PA (subs + tops with crossover).
 * Uses a raised-cosine slope around the crossover to visualise how the sub
 * hands off to the top. Levels are relative dB (0 = pass, negative = cut).
 */
export function paFrequencyResponse(
  tops: GearItem[],
  subs: GearItem[],
  crossoverFreq: number,
  topHpf: number,
  topLpf: number,
  subLpf: number,
  subHpf: number,
): { label: string; value: number }[] {
  const buckets = [
    { label: "31", hz: 31 }, { label: "63", hz: 63 }, { label: "125", hz: 125 },
    { label: "250", hz: 250 }, { label: "500", hz: 500 }, { label: "1k", hz: 1000 },
    { label: "2k", hz: 2000 }, { label: "4k", hz: 4000 }, { label: "8k", hz: 8000 },
    { label: "16k", hz: 16000 },
  ];
  const hasTops = tops.length > 0;
  const hasSubs = subs.length > 0;
  /**
   * Caída Linkwitz-Riley de 24 dB/oct, que es la pendiente que especifica
   * `calculateCrossover` (`slope: "LR24"`).
   *
   * El comentario anterior decía "Butterworth-ish ... (LR24)" y la fórmula era
   * la de un Butterworth de 4.º orden: −3 dB en la frecuencia de corte. Un LR24
   * cae −6 dB ahí. La diferencia importa justo en el cruce, que es donde se mira
   * esta curva. Un LR de orden 2N son dos Butterworth de orden N en cascada, o
   * sea la magnitud del BW al cuadrado → el doble de dB.
   */
  const slope = (f: number, corner: number, order = 2, kind: "hp" | "lp") => {
    if (corner <= 0) return 0;
    const r = kind === "hp" ? corner / f : f / corner;
    // −20·log10(1 + r^(2·order)) = BW de orden `order`, al cuadrado = LR.
    return -20 * Math.log10(1 + Math.pow(r, 2 * order));
  };
  return buckets.map((b) => {
    let topDb = -Infinity;
    let subDb = -Infinity;
    if (hasTops) {
      topDb = 0 + slope(b.hz, topHpf, 4, "hp") + slope(b.hz, topLpf, 4, "lp");
    }
    if (hasSubs) {
      subDb = 0 + slope(b.hz, subHpf, 4, "hp") + slope(b.hz, crossoverFreq || subLpf, 4, "lp");
    }
    // Sum on a power basis for the octave summation illusion.
    const linSum = (hasTops ? Math.pow(10, topDb / 10) : 0) + (hasSubs ? Math.pow(10, subDb / 10) : 0);
    const db = linSum > 0 ? 10 * Math.log10(linSum) : -60;
    return { label: b.label, value: Math.round(db * 10) / 10 };
  });
}

// ── Session Peak SPL trend ──────────────────────────────────────────────────
export interface SessionPoint { label: string; value: number; highlight: boolean; id: string }
/**
 * Produces bar-chart-ready data from the last N saved scenes ordered
 * chronologically. Each point is the array Peak SPL of that scene. The most
 * recent one is highlighted.
 */
export function sessionsPeakSeries(
  scenes: Array<{ id?: string; clientId?: string; name: string; createdAt: string; updatedAt?: number; tops: GearItem[] }>,
  limit = 7,
): SessionPoint[] {
  const sorted = [...scenes].sort((a, b) => {
    const ta = a.updatedAt ?? new Date(a.createdAt).getTime();
    const tb = b.updatedAt ?? new Date(b.createdAt).getTime();
    return ta - tb; // oldest → newest so the chart reads left-to-right
  });
  const tail = sorted.slice(-limit);
  const lastIdx = tail.length - 1;
  return tail.map((s, i) => {
    // Mismo criterio que paSummary — si acá se usara otra fórmula, el gráfico
    // de sesiones contradiría el KPI de la home para la misma escena.
    const arraySpl = Math.round(combinedSplMax(s.tops, "incoherent"));
    // Shortened label — first 3 chars of the scene name, uppercase.
    const label = s.name.slice(0, 3).toUpperCase();
    return {
      id: s.clientId ?? s.id ?? String(i),
      label,
      value: arraySpl,
      highlight: i === lastIdx,
    };
  });
}
