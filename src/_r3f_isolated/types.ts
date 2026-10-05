import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import type { SplGrid } from "@/lib/audio/spl-grid.ts";
import type { StageConfig } from "@/lib/audio/stage-engine.ts";
import type { VenueSpeaker } from "@/lib/venue-visual.ts";

export interface Stage3DProps {
  room: RoomScanInput;
  config?: StageConfig;
  tops?: GearItem[];
  subs?: GearItem[];
  monitors?: GearItem[];
  /** No grid means geometry only; never fabricate coverage. */
  splGrid?: SplGrid;
  speakers?: VenueSpeaker[];
  className?: string;
  compact?: boolean;
  interactive?: boolean;
  selectedId?: string | null;
  onSelect?: (id: string) => void;
}
