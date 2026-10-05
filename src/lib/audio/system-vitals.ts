import {
  layoutSources,
  layoutSpeakers,
  type SpeakerLayout,
} from "../speaker-layout.ts";
import { evaluateAudit } from "./audit-evaluator";
import type { DSPConfig } from "./dsp-engine";
import { eqResponseDb, lr24, magnitudeDb } from "./filters";
// SoundMap Vitals — compute REAL system state for the AI Home dashboard.
// Turns the Zustand store state into chart-ready data structures.
//
// Includes:
// - eqCurveFromBands(): peak/shelf biquad sum → gain vs freq series
// - coverageByZone():   split SPL grid into Front/Center/Back/Left/Right averages
// - paSummary():        totals for tops/subs + max SPL + headroom vs target
// - roomSummary():      dims, capacity, RT60, echoRisk chip
import type { AcousticsResult, RoomScanInput } from "./acoustics.ts";
import { combinedSplMax } from "./array-gain.ts";
import type { DSPBand } from "./dsp-engine.ts";
import type { GearItem } from "./pa-engine.ts";
import { type Source, type SplGrid } from "./spl-grid.ts";

// ── EQ curve builder ────────────────────────────────────────────────────────
/** Log-spaced sample points across 20 Hz–20 kHz (default 48 points). */
export function logFreqPoints(count = 48, fMin = 20, fMax = 20000): number[] {
  const out: number[] = [];
  const ratio = Math.log(fMax / fMin) / (count - 1);
  for (let i = 0; i < count; i++) out.push(fMin * Math.exp(i * ratio));
  return out;
}

/** Sum of all band responses across log-spaced points. */
export function eqCurveFromBands(
  bands: DSPBand[],
): { hz: number; db: number }[] {
  const freqs = logFreqPoints(48);
  return freqs.map((f) => {
    const db = eqResponseDb(bands, f);
    return { hz: f, db: Math.round(db * 10) / 10 };
  });
}

/** Compact one EQ curve into ~10 zones so the chart isn't dense. */
export function eqBucketed(
  curve: { hz: number; db: number }[],
): { label: string; value: number }[] {
  const labels = [
    "31",
    "63",
    "125",
    "250",
    "500",
    "1k",
    "2k",
    "4k",
    "8k",
    "16k",
  ];
  const targets = [31, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  return targets.map((tgt, i) => {
    // Nearest freq bucket
    let best = curve[0];
    let bestDist = Math.abs(Math.log2(best.hz / tgt));
    for (const p of curve) {
      const d = Math.abs(Math.log2(p.hz / tgt));
      if (d < bestDist) {
        best = p;
        bestDist = d;
      }
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

export function paSummary(
  tops: GearItem[],
  subs: GearItem[],
  monitors: GearItem[],
  room?: RoomScanInput,
  layout?: SpeakerLayout,
  dsp?: DSPConfig,
): PASummary {
  const sum = (arr: GearItem[]) =>
    arr.reduce((s, g) => s + (g.quantity ?? 1), 0);
  const topsCount = sum(tops);
  const subsCount = sum(subs);
  const monitorsCount = sum(monitors);
  // El SPL de referencia de UNA caja: el peor modelo del grupo, porque es el que
  // limita el sistema. Mostrar el mejor sería engañoso en un rig mixto.
  const maxSplTops =
    tops.length > 0 ? Math.min(...tops.map((t) => t.splMax || Infinity)) : 0;
  const maxSplSubs =
    subs.length > 0 ? Math.min(...subs.map((s) => s.splMax || Infinity)) : 0;
  // Suma real de potencia entre modelos distintos (no asume rig homogéneo).
  const arraySpl = combinedSplMax(tops, "incoherent");
  const headroomDb = room
    ? Math.round(
        (evaluateAudit({ room, tops, subs, stageLayout: layout, dsp })
          .headroomDb ?? 0) * 10,
      ) / 10
    : 0;
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
export function sceneToSources(
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  layout?: SpeakerLayout,
): Source[] {
  return layoutSources(layoutSpeakers(room, tops, subs, [], layout));
}

/** Average SPL across a rectangular slice of the grid (row range, col range). */
function avgSpl(
  grid: SplGrid,
  r0: number,
  r1: number,
  c0: number,
  c1: number,
): number {
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
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  layout?: SpeakerLayout,
  dsp?: DSPConfig,
): CoverageZones | null {
  const evaluation = evaluateAudit({
    room,
    tops,
    subs,
    stageLayout: layout,
    dsp,
  });
  const grid = evaluation.grid;
  if (!grid) return null;
  const rows = grid.rows;
  const cols = grid.cols;
  // Rows go from stage (r=0) to back (r=rows-1)
  const front = evaluation.zones.front!;
  const center = evaluation.zones.center!;
  const back = evaluation.zones.back!;
  const leftSide = avgSpl(grid, 0, rows, 0, Math.floor(cols / 3));
  const rightSide = avgSpl(grid, 0, rows, Math.ceil((cols * 2) / 3), cols);
  const vals = [front, center, back, leftSide, rightSide].filter((v) => v > 0);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const uniformityPct = vals.length > 0 && max > 0 ? grid.uniformityPct : 0;
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
  low: { label: "Bajo", hue: "#C9F03E" },
  medium: { label: "Medio", hue: "#F5B62E" },
  high: { label: "Alto", hue: "#FF6B4A" },
};
export function roomSummary(
  room: RoomScanInput,
  acoustics: AcousticsResult,
): RoomSummary {
  const risk = RISK_META[acoustics.echoRisk] ?? RISK_META.low;
  return {
    name: room.name,
    dims: `${room.length} × ${room.width} × ${room.height} m`,
    capacity: room.capacity,
    rt60Audience: acoustics.rt60Occupied,
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
    { label: "31", hz: 31 },
    { label: "63", hz: 63 },
    { label: "125", hz: 125 },
    { label: "250", hz: 250 },
    { label: "500", hz: 500 },
    { label: "1k", hz: 1000 },
    { label: "2k", hz: 2000 },
    { label: "4k", hz: 4000 },
    { label: "8k", hz: 8000 },
    { label: "16k", hz: 16000 },
  ];
  const hasTops = tops.length > 0;
  const hasSubs = subs.length > 0;
  return buckets.map((b) => {
    const transfer = (hp: number, lp: number) => {
      const h = lr24(b.hz, hp, "hp"),
        l = lr24(b.hz, lp, "lp");
      return { re: h.re * l.re - h.im * l.im, im: h.re * l.im + h.im * l.re };
    };
    const t = hasTops ? transfer(topHpf, topLpf) : { re: 0, im: 0 };
    const s = hasSubs
      ? transfer(subHpf, crossoverFreq || subLpf)
      : { re: 0, im: 0 };
    const db = magnitudeDb({ re: t.re + s.re, im: t.im + s.im });
    return { label: b.label, value: Math.round(Math.max(-60, db) * 10) / 10 };
  });
}

// ── Session Peak SPL trend ──────────────────────────────────────────────────
export interface SessionPoint {
  label: string;
  value: number;
  highlight: boolean;
  id: string;
}
/**
 * Produces bar-chart-ready data from the last N saved scenes ordered
 * chronologically. Each point is the array Peak SPL of that scene. The most
 * recent one is highlighted.
 */
export function sessionsPeakSeries(
  scenes: Array<{
    id?: string;
    clientId?: string;
    name: string;
    createdAt: string;
    updatedAt?: number;
    tops: GearItem[];
  }>,
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
