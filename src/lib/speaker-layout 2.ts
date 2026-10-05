import type { RoomScanInput } from "./audio/acoustics.ts";
import type { GearItem } from "./audio/pa-engine.ts";
import type { Source } from "./audio/spl-grid.ts";

export type SpeakerKind = "tops" | "subs" | "monitors";
export type CabinetType = "point-source" | "line-array";
export interface SpeakerPlacement {
  normX?: number;
  normY?: number;
  /** Acoustic centre above the room floor, metres. */
  heightM?: number;
  cabinetType?: CabinetType;
}
export type SpeakerLayout = Record<string, SpeakerPlacement>;
export const SPEAKER_COLORS = {
  tops: "#C9F03E",
  subs: "#F5B62E",
  monitors: "#67C5F5",
  delay: "#C4A1FF",
};
export const EMPTY_LAYOUT: SpeakerLayout = {};
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));
export const maxSpeakerHeight = (room: RoomScanInput) =>
  Math.max(0.1, room.height - 0.4);
export function sanitizeLayout(value: unknown): SpeakerLayout {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: SpeakerLayout = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!raw || typeof raw !== "object" || !/^(tops|subs|monitors):/.test(id))
      continue;
    const p = raw as SpeakerPlacement,
      clean: SpeakerPlacement = {};
    for (const key of ["normX", "normY", "heightM"] as const) {
      const n = p[key];
      if (typeof n === "number" && Number.isFinite(n))
        clean[key] = clamp(n, key === "heightM" ? 0.1 : 0, 100);
    }
    if (p.cabinetType === "point-source" || p.cabinetType === "line-array")
      clean.cabinetType = p.cabinetType;
    result[id] = clean;
  }
  return result;
}
export function suggestedSpeakerHeight(
  room: RoomScanInput,
  kind: SpeakerKind,
  cabinetType: CabinetType,
) {
  // Planning starting points, not a rigging specification. Centre, not cabinet base.
  const desired =
    kind === "subs"
      ? 0.4
      : kind === "monitors"
        ? 0.85
        : cabinetType === "line-array"
          ? Math.max(2.5, Math.min(6, room.height * 0.72))
          : 2.2;
  return Math.round(clamp(desired, 0.1, maxSpeakerHeight(room)) * 100) / 100;
}
export interface LayoutSpeaker {
  id: string;
  label: string;
  kind: SpeakerKind;
  count: number;
  x: number;
  y: number;
  z: number;
  normX: number;
  normY: number;
  gear: GearItem;
  cabinetType: CabinetType;
  suggestedHeightM: number;
}
export function layoutSpeakers(
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  monitors: GearItem[] = [],
  layout: SpeakerLayout = EMPTY_LAYOUT,
): LayoutSpeaker[] {
  return (
    [
      ["tops", tops],
      ["subs", subs],
      ["monitors", monitors],
    ] as const
  ).flatMap(([kind, gear]) => {
    const units = gear.flatMap((g) =>
      Array.from({ length: Math.max(0, g.quantity ?? 1) }, (_, unit) => ({
        g,
        unit,
      })),
    );
    return units.map(({ g, unit }, index) => {
      const id = `${kind}:${encodeURIComponent(g.id)}:${unit}`;
      const p = layout[id] ?? {};
      // Narrow vertical coverage is a suggestion; the editor lets the user correct it.
      const cabinetType =
        p.cabinetType ??
        (kind === "tops" && (g.coverageV ?? 90) <= 20
          ? "line-array"
          : "point-source");
      const normX = clamp(
        p.normX ??
          (units.length === 1
            ? 50
            : (kind === "monitors" ? 30 : 10) +
              ((kind === "monitors" ? 40 : 80) * index) / (units.length - 1)),
        0,
        100,
      );
      const normY = clamp(
        p.normY ?? (kind === "tops" ? 6 : kind === "subs" ? 14 : 9),
        0,
        100,
      );
      const suggestedHeightM = suggestedSpeakerHeight(room, kind, cabinetType);
      const heightM = clamp(
        p.heightM ?? suggestedHeightM,
        0.1,
        maxSpeakerHeight(room),
      );
      return {
        id,
        label: `${kind === "tops" ? (cabinetType === "line-array" ? "ARRAY" : "TOP") : kind === "subs" ? "SUB" : "MON"} ${index + 1}`,
        kind,
        count: 1,
        normX,
        normY,
        x: (normX / 100 - 0.5) * room.width,
        y: heightM,
        z: (normY / 100 - 0.5) * room.length,
        gear: g,
        cabinetType,
        suggestedHeightM,
      };
    });
  });
}
/** One source per physical unit. Independent-source power sum, including separated subs. */
export function layoutSources(speakers: LayoutSpeaker[]): Source[] {
  return speakers
    .filter((s) => s.kind !== "monitors")
    .map((s) => ({
      x: s.x,
      y: s.y,
      z: s.z,
      spl1m: s.gear.splMax,
      aimDx: 0,
      aimDy: s.kind === "subs" ? 0 : -0.35,
      aimDz: 1,
      coverageH: s.kind === "subs" ? 180 : (s.gear.coverageH ?? 90),
      coverageV: s.kind === "subs" ? 180 : (s.gear.coverageV ?? 40),
      label: s.label,
    }));
}
