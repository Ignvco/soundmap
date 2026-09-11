import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/app.ts";
import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { AnalysisNav } from "@/components/soundmap/analysis-nav.tsx";
import { Metric, MetricRow } from "@/components/soundmap/vitals/metric.tsx";
import { computeSplGrid } from "@/lib/audio/spl-grid.ts";
import { sceneToSources } from "@/lib/audio/system-vitals.ts";

export default function SPLAnalysis() {
  const { room, tops, subs, monitors } = useAppStore();
  const [frequency, setFrequency] = useState(1000);
  const grid = useMemo(() => {
    if (!room) return undefined;
    const sources = sceneToSources(room, tops, subs);
    return sources.length
      ? computeSplGrid(room, sources, {
          cols: 32,
          rows: 44,
          freqHz: frequency,
          tempC: room.temperature,
          humidity: room.humidity,
        })
      : undefined;
  }, [room, tops, subs, frequency]);
  return (
    <div className="v6-workspace">
      <AnalysisNav />
      <header className="flex justify-between items-center flex-wrap gap-4 mb-6">
        <div>
          <h1 className="v6-heading">SPL Analysis</h1>
          <p className="text-xs text-muted-foreground mt-2">
            {room?.name ?? "Sin recinto"} · Predicción de campo directo
          </p>
        </div>
        <label className="v6-toolbar text-xs text-muted-foreground">
          Frecuencia
          <select
            aria-label="Frecuencia de análisis"
            className="v6-button"
            value={frequency}
            onChange={(e) => setFrequency(Number(e.target.value))}
          >
            {[63, 125, 250, 500, 1000, 2000, 4000, 8000].map((f) => (
              <option key={f} value={f}>
                {f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`}
              </option>
            ))}
          </select>
        </label>
      </header>
      {room ? (
        <VenuePreview
          room={room}
          tops={tops}
          subs={subs}
          monitors={monitors}
          grid={grid}
          compact={false}
        />
      ) : (
        <div className="v6-panel p-8 text-sm">
          Definí el recinto para calcular la cobertura.{" "}
          <Link className="text-accent" to="/design?step=room">
            Ir a Design
          </Link>
        </div>
      )}
      <MetricRow className="py-6 border-b border-border">
        <Metric
          label="SPL medio"
          value={grid?.mean.toFixed(1) ?? "—"}
          unit="dB"
        />
        <Metric
          label="SPL máximo"
          value={grid?.max.toFixed(1) ?? "—"}
          unit="dB"
        />
        <Metric
          label="Uniformidad ±3 dB"
          value={grid ? `${grid.uniformityPct}` : "—"}
          unit="%"
          tone="accent"
        />
        <Metric
          label="Diferencia máx / mín"
          value={grid?.spread.toFixed(1) ?? "—"}
          unit="dB"
        />
      </MetricRow>
      {!grid && room && (
        <p className="text-sm text-muted-foreground mt-4">
          Agregá tops o subs para visualizar la cobertura SPL.
        </p>
      )}
      <p className="text-xs text-muted-foreground mt-5 max-w-3xl leading-relaxed">
        Estimación sin ponderación A/C, a 1,6 m de altura. Incluye distancia,
        directividad y absorción del aire. La geometría visible no agrega
        reflexiones ni difracción al cálculo. Para medir con el micrófono, abrí{" "}
        <Link className="text-accent" to="/perform">
          Perform
        </Link>
        .
      </p>
    </div>
  );
}
