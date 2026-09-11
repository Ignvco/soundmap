import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import type { SplGrid } from "@/lib/audio/spl-grid.ts";
import { sceneToSources } from "@/lib/audio/system-vitals.ts";

/** Metres, matching the SPL engine: stage −Z, audience +Z. */
export interface VenueSpeaker {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: "tops" | "subs" | "monitors" | "delay";
  label: string;
  count: number;
}

export function venueSpeakers(
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  monitors: GearItem[],
): VenueSpeaker[] {
  const sources = sceneToSources(room, tops, subs);
  const topCount = tops.reduce((n, g) => n + (g.quantity ?? 1), 0);
  const subCount = subs.reduce((n, g) => n + (g.quantity ?? 1), 0);
  const topGroups = topCount > 1 ? 2 : topCount;
  const result: VenueSpeaker[] = sources.map((s, i) => ({
    id: `source-${i}`,
    x: s.x,
    y: s.y,
    z: s.z,
    kind: i < topGroups ? "tops" : "subs",
    label:
      i < topGroups
        ? `${i === 0 ? "L" : "R"} · ${tops[0]?.model}`
        : (subs[0]?.model ?? "Sub"),
    count:
      i < topGroups
        ? i === 0
          ? Math.ceil(topCount / 2)
          : Math.floor(topCount / 2)
        : subCount,
  }));
  const monitorUnits = monitors.flatMap((g) =>
    Array.from({ length: g.quantity ?? 1 }, () => g),
  );
  monitorUnits.slice(0, 6).forEach((g, i, arr) =>
    result.push({
      id: `monitor-${i}`,
      kind: "monitors",
      label: g.model,
      count: 1,
      x: arr.length > 1 ? (i / (arr.length - 1) - 0.5) * room.width * 0.5 : 0,
      y: 0.75,
      z: -room.length * 0.4,
    }),
  );
  return result;
}

/** Fixed scale across scenes: a colour always means the same SPL. */
export const SPL_STOPS = [
  { db: 70, color: "#343b21" },
  { db: 105, color: "#688b35" },
  { db: 125, color: "#C9F03E" },
  { db: 140, color: "#F5B62E" },
  { db: 150, color: "#FF6B4A" },
] as const;

export function coverageVertices(grid: SplGrid) {
  const { xMin, xMax, zMin, zMax } = grid.bounds;
  return grid.cells.map((db, i) => ({
    x: xMin + ((i % grid.cols) / (grid.cols - 1)) * (xMax - xMin),
    z: zMin + (Math.floor(i / grid.cols) / (grid.rows - 1)) * (zMax - zMin),
    db,
  }));
}
