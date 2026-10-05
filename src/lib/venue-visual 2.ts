import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import type { SplGrid } from "@/lib/audio/spl-grid.ts";
import { layoutSpeakers, type SpeakerLayout, type CabinetType } from "./speaker-layout.ts";

/** Metres, matching the SPL engine: stage −Z, audience +Z. */
export interface VenueSpeaker {
  id: string;
  x: number;
  y: number;
  z: number;
  kind: "tops" | "subs" | "monitors" | "delay";
  label: string;
  count: number;
  cabinetType?: CabinetType;
}

export function venueSpeakers(
  room: RoomScanInput,
  tops: GearItem[],
  subs: GearItem[],
  monitors: GearItem[],
  layout?: SpeakerLayout,
): VenueSpeaker[] {
  return layoutSpeakers(room, tops, subs, monitors, layout);
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
