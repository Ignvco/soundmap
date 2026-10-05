import { canonical } from "../audit/document";
import {
  layoutSources,
  layoutSpeakers,
  type SpeakerLayout,
} from "../speaker-layout";
import type { RoomScanInput } from "./acoustics";
import type { DSPConfig } from "./dsp-engine";
import type { GearItem } from "./pa-engine";
import {
  coherentSplAtPoint,
  computeSplGrid,
  sourceSplAtPoint,
  sumSplDb,
} from "./spl-grid";

export const ENGINE_VERSION = "6.1.0";
export interface Receiver {
  x: number;
  y: number;
  z: number;
}
export function defaultReceiver(room: RoomScanInput): Receiver {
  return (
    room.receiver ?? {
      x: 0,
      y: Math.min(1.6, room.height * 0.8),
      z: room.length * 0.15,
    }
  );
}
export interface EvaluationInput {
  room: RoomScanInput;
  tops: GearItem[];
  subs: GearItem[];
  stageLayout?: SpeakerLayout;
  dsp?: DSPConfig;
}

/** The single direct-field contract used by summary, PA, stage and report.
 * Arithmetic grid average and ±3 dB uniformity are spatial descriptors.
 * Catalog maximum SPL is a broadband rating: this band-limited point-source
 * approximation is NOT a manufacturer's measured polar or a line-array solver.
 */
const cache = new Map<string, ReturnType<typeof computeAudit>>();
export function evaluateAudit(input: EvaluationInput, frequency = 1000) {
  const key = canonical({ ...input, frequency });
  const hit = cache.get(key);
  if (hit) return hit;
  const result = computeAudit(input, frequency);
  if (cache.size >= 8) cache.delete(cache.keys().next().value!);
  cache.set(key, result);
  return result;
}
function computeAudit(input: EvaluationInput, frequency: number) {
  const { room, tops, subs, stageLayout } = input;
  const speakers = layoutSpeakers(room, tops, subs, [], stageLayout);
  const sources = layoutSources(speakers).map((source) => {
    const out = input.dsp?.outputs.find((o) => o.speakerId === source.id);
    return out
      ? {
          ...source,
          gainDb: (source.gainDb ?? 0) + out.gain,
          delayMs: (source.delayMs ?? 0) + out.delayMs,
          inverted: !!source.inverted !== !out.polarity,
          processing: { hpfHz: out.hpfHz, lpfHz: out.lpfHz, eq: out.eq },
        }
      : source;
  });
  const receiver = defaultReceiver(room),
    target = room.targetSpl ?? 100;
  let grid = sources.length
    ? computeSplGrid(room, sources, {
        freqHz: frequency,
        cols: 24,
        rows: 32,
        yPlane: receiver.y,
        tempC: room.temperature,
        humidity: room.humidity,
      })
    : null;
  if (grid?.validCells && !grid.validCells.some(Boolean)) grid = null;
  const available = !!grid;
  const at = (p: Receiver) =>
    sources.length
      ? room.simulationMode === "coherent"
        ? coherentSplAtPoint(
            sources,
            p.x,
            p.y,
            p.z,
            frequency,
            room.temperature,
            room.humidity,
          )
        : sumSplDb(
            sources.map((s) =>
              sourceSplAtPoint(
                s,
                p.x,
                p.y,
                p.z,
                frequency,
                room.temperature,
                room.humidity,
              ),
            ),
          )
      : null;
  const foh = at(receiver);
  const zoneMean = (start: number, end: number) => {
    if (!grid) return null;
    const begin = Math.floor(start * grid.rows) * grid.cols,
      endIndex = Math.floor(end * grid.rows) * grid.cols;
    const values = grid.cells.filter(
      (_, i) => i >= begin && i < endIndex && grid.validCells?.[i] !== false,
    );
    return values.length
      ? values.reduce((sum, v) => sum + v, 0) / values.length
      : null;
  };
  return {
    engineVersion: ENGINE_VERSION,
    available,
    receiver,
    frequency,
    target,
    speakers,
    sources,
    grid,
    fohSpl: foh,
    headroomDb: foh === null ? null : foh - target,
    coveragePct: grid
      ? (100 *
          grid.cells.filter(
            (v, i) => v >= target && grid.validCells?.[i] !== false,
          ).length) /
        Math.max(
          1,
          grid.validCells?.filter(Boolean).length ?? grid.cells.length,
        )
      : null,
    uniformityPct: grid?.uniformityPct ?? null,
    zones: {
      front: zoneMean(0, 1 / 3),
      center: zoneMean(1 / 3, 2 / 3),
      back: zoneMean(2 / 3, 1),
    },
    assumptions: [
      ...([...tops, ...subs].some(
        (g) => g.catalog?.status !== "reviewed-fields",
      )
        ? [
            "Hay fichas sin contraste documental: confirma SPL, banda y directividad de los modelos usados antes de tomar decisiones.",
          ]
        : []),
      room.simulationMode === "coherent"
        ? "Suma coherente ideal: señales correlacionadas, fase de filtros ideales, delay y polaridad declarados; sin fase medida de cajas."
        : "Suma energética de fuentes independientes; delay y polaridad no modifican el nivel de este modo.",
      ...(room.geometry
        ? [
            "Geometría importada: plano de audiencia recortado al polígono. Sin oclusión ni difracción de balcones; RT aproximado si no se declaran todas las superficies.",
          ]
        : []),
      input.dsp
        ? "Incluye ganancia, HPF/LPF y EQ del plan DSP aceptado."
        : "Sin plan DSP aceptado: no se aplican propuestas automáticamente.",
      "Campo directo; sin reflexiones ni acoplamiento de arrays.",
      "Banda útil aproximada con LR24; SPL máximo de catálogo, no SPL medido ni nivel de operación.",
      `Receptor (${receiver.x.toFixed(2)}, ${receiver.y.toFixed(2)}, ${receiver.z.toFixed(2)}) m; ${frequency} Hz; objetivo ${target} dB.`,
      ...(!sources.length
        ? ["Sin sistema: niveles y cobertura no calculables."]
        : []),
    ],
  };
}

/** Relative response at the same receiver, using the accepted processing. */
export function auditFrequencyResponse(input: EvaluationInput) {
  const { sources, receiver: p } = evaluateAudit(input);
  if (!sources.length) return [];
  const frequencies = [31.5, 63, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
  const values = frequencies.map((f) =>
    input.room.simulationMode === "coherent"
      ? coherentSplAtPoint(
          sources,
          p.x,
          p.y,
          p.z,
          f,
          input.room.temperature,
          input.room.humidity,
        )
      : sumSplDb(
          sources.map((s) =>
            sourceSplAtPoint(
              s,
              p.x,
              p.y,
              p.z,
              f,
              input.room.temperature,
              input.room.humidity,
            ),
          ),
        ),
  );
  const maximum = Math.max(...values);
  return values.map((value, i) => ({
    label:
      frequencies[i] >= 1000
        ? `${frequencies[i] / 1000}k`
        : String(frequencies[i]),
    value: Math.round((value - maximum) * 10) / 10,
  }));
}
