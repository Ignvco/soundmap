import { Link } from "react-router-dom";
import { useAppStore } from "@/store/app.ts";
import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { AnalysisNav } from "@/components/soundmap/analysis-nav.tsx";
import { Metric, MetricRow } from "@/components/soundmap/vitals/metric.tsx";

export default function AcousticAnalysis() {
  const { room, acoustics } = useAppStore();
  return (
    <div className="v6-workspace">
      <AnalysisNav />
      <header className="mb-6">
        <h1 className="v6-heading">Acoustic Analysis</h1>
        <p className="text-xs text-muted-foreground mt-2">
          {room?.name ?? "Sin recinto"} · Acústica estimada
        </p>
      </header>
      {room && acoustics ? (
        <>
          <div className="v6-split">
            <VenuePreview room={room} geometryOnly compact={false} />
            <aside className="v6-panel p-5 space-y-6">
              <h2 className="text-sm font-medium">Reverberación</h2>
              {[
                { label: "Sala vacía", value: acoustics.rt60Empty },
                { label: "Con audiencia", value: acoustics.rt60Audience },
                { label: "Ocupación actual", value: acoustics.rt60Occupied },
              ].map((x) => (
                <div key={x.label}>
                  <div className="flex justify-between text-xs mb-2">
                    <span className="text-muted-foreground">{x.label}</span>
                    <span className="font-mono">{x.value.toFixed(2)} s</span>
                  </div>
                  <div className="h-1 bg-secondary">
                    <div
                      className="h-full bg-accent"
                      style={{
                        width: `${Math.min(100, Math.max(0, (x.value / Math.max(acoustics.rt60Empty, acoustics.rt60Audience, 0.1)) * 100))}%`,
                      }}
                    />
                  </div>
                </div>
              ))}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Estimación a partir del volumen, materiales y ocupación. Para
                contrastarla con una medición, usá la herramienta RT60 del
                recinto.
              </p>
              <Link className="v6-button w-full" to="/design?step=room">
                Recinto y medición RT60
              </Link>
            </aside>
          </div>
          <MetricRow className="py-6 border-b border-border">
            <Metric
              label="RT60 con audiencia"
              value={acoustics.rt60Audience.toFixed(2)}
              unit="s"
            />
            <Metric
              label="Volumen"
              value={Math.round(acoustics.volume).toLocaleString()}
              unit="m³"
            />
            <Metric
              label="Schroeder"
              value={Math.round(acoustics.schroederFreq).toString()}
              unit="Hz"
            />
            <Metric
              label="Distancia crítica"
              value={acoustics.criticalDistance.toFixed(1)}
              unit="m"
            />
          </MetricRow>
          <div className="grid md:grid-cols-2 gap-6 mt-6">
            <section className="v6-panel p-5">
              <h2 className="text-sm font-medium mb-4">
                Modos axiales fundamentales
              </h2>
              {Object.entries(acoustics.axialModes).map(([axis, f]) => (
                <div
                  key={axis}
                  className="flex justify-between py-3 border-b border-border text-sm"
                >
                  <span className="text-muted-foreground">
                    Eje {axis.toUpperCase()}
                  </span>
                  <span className="font-mono">{f.toFixed(1)} Hz</span>
                </div>
              ))}
            </section>
            <section className="v6-panel p-5">
              <h2 className="text-sm font-medium mb-4">
                Recomendaciones del recinto
              </h2>
              <ul className="space-y-3 text-sm text-muted-foreground">
                {acoustics.recommendations.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </section>
          </div>
        </>
      ) : (
        <div className="v6-panel p-8 text-sm">
          Completá el recinto para analizar su acústica.{" "}
          <Link className="text-accent" to="/design?step=room">
            Ir a Design
          </Link>
        </div>
      )}
    </div>
  );
}
