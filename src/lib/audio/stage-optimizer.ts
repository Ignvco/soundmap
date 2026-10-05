import { clone } from "../audit/document";
import { layoutSpeakers, type SpeakerLayout } from "../speaker-layout";
import type { RoomScanInput } from "./acoustics";
import { evaluateAudit } from "./audit-evaluator";
import type { DSPConfig } from "./dsp-engine";
import { pointInPolygon } from "./geometry";
import type { GearItem } from "./pa-engine";
import type { SplGrid } from "./spl-grid";
export type SubMode = "center-cluster" | "distributed";
export interface StageCandidate {
  label: string;
  topsElevation: number;
  topsSplayDeg: number;
  topsTiltDeg: number;
  subMode: SubMode;
  grid: SplGrid;
  score: number;
  layout: SpeakerLayout;
  assumptions: string[];
}
export interface OptimizerOptions {
  cols?: number;
  rows?: number;
  freqHz?: number;
  topN?: number;
  onProgress?: (frac: number) => void;
  signal?: AbortSignal;
  layout?: SpeakerLayout;
  dsp?: DSPConfig;
  excludedZones?: { xMin: number; xMax: number; zMin: number; zMax: number }[];
}
/** Bounded, cancellable search over existing units. Groups retain their relative
 * positions. No implicit extra boxes, invented cardioid rejection or rigging. */
export async function optimizeStage(
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  opts: OptimizerOptions = {},
): Promise<StageCandidate[]> {
  const units = layoutSpeakers(room, tops, subs, [], opts.layout);
  if (!units.length) return [];
  const choices: StageCandidate[] = [];
  let done = 0;
  for (const height of [0.45, 0.65, 0.8])
    for (const angle of [0, 15, 30])
      for (const tilt of [0, 7, 14])
        for (const mode of ["center-cluster", "distributed"] as const) {
          if (opts.signal?.aborted) return [];
          const layout = clone(opts.layout ?? {}),
            elevation = Math.max(
              0.5,
              Math.min(room.height - 0.5, room.height * height),
            );
          let valid = true;
          for (const s of units) {
            if (s.groupId) continue; // Group geometry belongs to its explicit hang design.
            const half = (s.gear.dimensionsM?.height ?? 0.8) / 2;
            const top = s.kind === "tops",
              x = top
                ? s.normX
                : mode === "center-cluster"
                  ? 50 +
                    (units
                      .filter((u) => u.kind === "subs")
                      .findIndex((u) => u.id === s.id) -
                      (subs.reduce((n, g) => n + (g.quantity ?? 1), 0) - 1) /
                        2) *
                      Math.min(5, 70 / units.length)
                  : s.normX;
            layout[s.id] = {
              ...layout[s.id],
              normX: Math.max(5, Math.min(95, x)),
              normY: s.normY,
              heightM: Math.max(
                half,
                Math.min(room.height - half, top ? elevation : half),
              ),
              yawDeg: top ? (s.x < 0 ? angle : -angle) : s.yawDeg,
              tiltDeg: top ? -tilt : s.tiltDeg,
            };
          }
          const actual = layoutSpeakers(room, tops, subs, [], layout);
          for (const s of actual) {
            const half = (s.gear.dimensionsM?.height ?? 0.8) / 2;
            if (
              (room.geometry &&
                !pointInPolygon({ x: s.x, z: s.z }, room.geometry.outline)) ||
              s.y - half < 0 ||
              s.y + half > room.height + 0.001 ||
              (opts.excludedZones ?? room.geometry?.exclusions)?.some(
                (z) =>
                  s.x >= z.xMin &&
                  s.x <= z.xMax &&
                  s.z >= z.zMin &&
                  s.z <= z.zMax,
              )
            )
              valid = false;
          }
          if (valid) {
            const e = evaluateAudit(
              { room, tops, subs, stageLayout: layout, dsp: opts.dsp },
              opts.freqHz ?? 1000,
            );
            if (e.grid) {
              const score =
                0.7 * e.grid.uniformityPct -
                0.3 * e.grid.spread +
                0.2 * (e.coveragePct ?? 0);
              choices.push({
                label: `Altura ${elevation.toFixed(1)} m · Orientación ${angle}° · Inclinación ${tilt}° · Subs ${mode === "center-cluster" ? "centrales" : "distribuidos"}`,
                topsElevation: elevation,
                topsSplayDeg: angle,
                topsTiltDeg: tilt,
                subMode: mode,
                layout,
                grid: e.grid,
                score,
                assumptions: e.assumptions,
              });
            }
          }
          opts.onProgress?.(++done / 54);
          if (done % 3 === 0)
            await new Promise<void>((resolve) => setTimeout(resolve, 0));
        }
  return choices
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(1, Math.min(10, opts.topN ?? 5)));
}
