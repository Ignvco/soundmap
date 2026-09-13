// Public type shim for Stage3D — declared here so consumers can import it
// without pulling @react-three/fiber's ambient JSX augmentation into
// their compilation unit.
import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { StageConfig } from "@/lib/audio/stage-engine.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import type { SplGrid } from "@/lib/audio/spl-grid.ts";
import type { VenueSpeaker } from "@/lib/venue-visual.ts";
import type { ReactElement } from "react";

interface Stage3DProps {
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

export declare function Stage3D(props: Stage3DProps): ReactElement;
