import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import { type SplGrid } from "@/lib/audio/spl-grid.ts";
import type { SpeakerLayout } from "@/lib/speaker-layout.ts";
import { venueSpeakers } from "@/lib/venue-visual.ts";
import {
  Component,
  lazy,
  Suspense,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const Stage3D = lazy(() =>
  import("@/_r3f_isolated/stage-3d").then((m) => ({ default: m.Stage3D })),
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
  layout,
  className,
  geometryOnly = false,
  compact = true,
  interactive = true,
  plan,
}: {
  room: RoomScanInput;
  tops?: GearItem[];
  subs?: GearItem[];
  monitors?: GearItem[];
  grid?: SplGrid;
  layout?: SpeakerLayout;
  className?: string;
  geometryOnly?: boolean;
  compact?: boolean;
  interactive?: boolean;
  plan?: ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  const coverage = useMemo(() => {
    if (geometryOnly) return undefined;
    if (grid) return grid;
    return (
      evaluateAudit({ room, tops, subs, stageLayout: layout }).grid ?? undefined
    );
  }, [room, tops, subs, grid, geometryOnly, layout]);
  if (!opened)
    return (
      <div
        className={`venue-view ${compact ? "venue-view-compact" : ""} ${className ?? ""} flex flex-col items-center justify-center p-6 gap-3`}
      >
        {plan ?? (
          <svg
            viewBox={`0 0 ${room.width} ${room.length}`}
            role="img"
            aria-label="Plano simplificado del recinto"
            style={{ height: 160, maxWidth: "100%" }}
          >
            <rect
              x="0"
              y="0"
              width={room.width}
              height={room.length}
              fill="#111917"
              stroke="#678b55"
              strokeWidth=".2"
            />
            {venueSpeakers(room, tops, subs, monitors, layout).map((s) => (
              <circle
                key={s.id}
                cx={s.x + room.width / 2}
                cy={s.z + room.length / 2}
                r={Math.max(0.2, room.width / 70)}
                fill={s.kind === "subs" ? "#f5b62e" : "#c9f03e"}
              />
            ))}
          </svg>
        )}
        <p className="text-xs text-muted-foreground">
          {room.width} × {room.length} m · Plano del inventario actual
        </p>
        {interactive && (
          <button className="audit-button" onClick={() => setOpened(true)}>
            Abrir vista 3D
          </button>
        )}
      </div>
    );
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
          speakers={
            geometryOnly
              ? []
              : venueSpeakers(room, tops, subs, monitors, layout)
          }
          className={className}
          compact={compact}
          interactive={interactive}
        />
      </Suspense>
    </VenueBoundary>
  );
}
