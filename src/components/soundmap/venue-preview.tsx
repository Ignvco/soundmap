import { Component, lazy, Suspense, useMemo, type ReactNode } from "react";
import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import { computeSplGrid, type SplGrid } from "@/lib/audio/spl-grid.ts";
import { sceneToSources } from "@/lib/audio/system-vitals.ts";

const Stage3D = lazy(() =>
  import("@/_r3f_isolated/stage-3d.jsx").then((m) => ({ default: m.Stage3D })),
);
const EMPTY: GearItem[] = [];

export class VenueBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? (
      <div className="venue-view flex items-center justify-center p-8 text-center text-sm text-muted-foreground">
        No se pudo iniciar el visor 3D. Tus datos siguen disponibles; recargá la
        página para reintentarlo.
      </div>
    ) : (
      this.props.children
    );
  }
}

export function VenuePreview({
  room,
  tops = EMPTY,
  subs = EMPTY,
  monitors = EMPTY,
  grid,
  className,
  geometryOnly = false,
  compact = true,
}: {
  room: RoomScanInput;
  tops?: GearItem[];
  subs?: GearItem[];
  monitors?: GearItem[];
  grid?: SplGrid;
  className?: string;
  geometryOnly?: boolean;
  compact?: boolean;
}) {
  const coverage = useMemo(() => {
    if (geometryOnly) return undefined;
    if (grid) return grid;
    const sources = sceneToSources(room, tops, subs);
    return sources.length
      ? computeSplGrid(room, sources, {
          cols: 28,
          rows: 36,
          tempC: room.temperature,
          humidity: room.humidity,
        })
      : undefined;
  }, [room, tops, subs, grid, geometryOnly]);
  return (
    <VenueBoundary>
      <Suspense
        fallback={
          <div
            className={`venue-view ${compact ? "venue-view-compact" : ""} ${className ?? ""} flex items-center justify-center text-sm text-muted-foreground`}
            role="status"
          >
            Cargando escenario 3D…
          </div>
        }
      >
        <Stage3D
          room={room}
          tops={tops}
          subs={subs}
          monitors={monitors}
          splGrid={coverage}
          className={className}
          compact={compact}
        />
      </Suspense>
    </VenueBoundary>
  );
}
