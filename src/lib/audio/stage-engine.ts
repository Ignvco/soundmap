import type { DSPConfig } from "./dsp-engine";
// Stage Engine — SoundMap
// Calculates stage deployment strategy based on room + gear

import type { SpeakerLayout } from "../speaker-layout";
import type { AcousticsResult, RoomScanInput } from "./acoustics.ts";
import { evaluateAudit } from "./audit-evaluator";
import type { GearItem } from "./pa-engine.ts";
import {
  calculateDelayTowerTiming,
  calculateSubAlignment,
} from "./time-align.ts";

export type DeploymentMode =
  | "simple-stereo"
  | "wide-stereo"
  | "line-array"
  | "center-cluster"
  | "distributed"
  | "delay-tower"
  | "mono";

export interface StageZone {
  id: string;
  label: string;
  type: "hot" | "optimal" | "weak" | "dead";
  x: number; // 0-100 percentage
  y: number;
  radius: number;
}

export interface StageConfig {
  deploymentMode: DeploymentMode;
  available: boolean;
  coveragePercent: number | null;
  splFront: number | null;
  splRear: number | null;
  needsDelayTowers: boolean;
  delayTowerDistance: number;
  /** Delay to dial into the delay towers (ms) — propagation + Haas. 0 if none. */
  delayTowerMs: number;
  /** Sub↔top time-alignment delay (ms) and which source is delayed. */
  subAlignMs: number;
  alignedSource: "sub" | "top" | "none";
  topsPosition: { label: string; x: number; y: number }[];
  subsPosition: { label: string; x: number; y: number }[];
  zones: StageZone[];
  notes: string[];
}

/** Deployment advice and drawing derived from the SAME edited layout as evaluation. */
export function calculateStageConfig(
  room: RoomScanInput,
  acoustics: AcousticsResult,
  tops: GearItem[],
  subs: GearItem[],
  stageLayout?: SpeakerLayout,
  dsp?: DSPConfig,
): StageConfig {
  const e = evaluateAudit({ room, tops, subs, stageLayout, dsp });
  const totalTops = e.speakers.filter((s) => s.kind === "tops").length;
  const deploymentMode: DeploymentMode =
    totalTops <= 1
      ? "mono"
      : acoustics.rt60Occupied > 2.5
        ? "distributed"
        : room.width > 30
          ? "wide-stereo"
          : "simple-stereo";
  const alignment = calculateSubAlignment(room, tops, subs, stageLayout);
  const needsDelayTowers =
    totalTops > 0 && room.length > 25 && (e.zones.back ?? Infinity) < e.target;
  const delayTowerDistance = needsDelayTowers
    ? Math.round(room.length * 0.6)
    : 0;
  const tower = calculateDelayTowerTiming(delayTowerDistance, room.temperature);
  const round = (v: number | null) =>
    v === null ? null : Math.round(v * 10) / 10;
  const positions = (kind: "tops" | "subs") =>
    e.speakers
      .filter((s) => s.kind === kind)
      .map((s) => ({ label: s.label, x: s.normX, y: s.normY }));
  const zones: StageZone[] = e.available
    ? Object.entries(e.zones).map(([id, value], i) => ({
        id,
        label: ["Frente", "Centro", "Fondo"][i],
        x: 50,
        y: [30, 55, 80][i],
        radius: 15,
        type:
          value === null
            ? "dead"
            : value < e.target
              ? "weak"
              : value > e.target + 6
                ? "hot"
                : "optimal",
      }))
    : [];
  return {
    deploymentMode,
    available: e.available,
    coveragePercent: round(e.coveragePct),
    splFront: round(e.zones.front),
    splRear: round(e.zones.back),
    needsDelayTowers,
    delayTowerDistance,
    delayTowerMs: needsDelayTowers ? tower.totalDelayMs : 0,
    subAlignMs: Math.max(alignment.topDelayMs, alignment.subDelayMs),
    alignedSource: alignment.delayedSource,
    topsPosition: positions("tops"),
    subsPosition: positions("subs"),
    zones,
    notes: [
      ...e.assumptions,
      ...alignment.reasons,
      ...(needsDelayTowers
        ? [
            "Evaluar refuerzos para el fondo; cantidad, ubicación y delay requieren revisión del técnico.",
          ]
        : []),
    ],
  };
}
