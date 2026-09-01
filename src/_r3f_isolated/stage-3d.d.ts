// Public type shim for Stage3D — declared here so consumers can import it
// without pulling @react-three/fiber's ambient JSX augmentation into
// their compilation unit.
import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { StageConfig } from "@/lib/audio/stage-engine.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import type { SplGrid } from "@/lib/audio/spl-grid.ts";

interface Stage3DProps {
  room: RoomScanInput;
  config: StageConfig;
  tops: GearItem[];
  subs: GearItem[];
  monitors: GearItem[];
  /** Optional physics-based SPL grid (H×L). If omitted, falls back to linear front→rear gradient. */
  splGrid?: SplGrid;
}

export declare function Stage3D(props: Stage3DProps): JSX.Element;
