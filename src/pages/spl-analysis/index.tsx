import { AnalysisNav } from "@/components/soundmap/analysis-nav.tsx";
import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import { Metric, MetricRow } from "@/components/soundmap/vitals/metric.tsx";
import { calculateAcoustics } from "@/lib/audio/acoustics";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import { useAppStore } from "@/store/app.ts";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function SPLAnalysis() {
  const { stageLayout, room, tops, subs, monitors, audit, applyRoomScan } =
    useAppStore();
  const [frequency, setFrequency] = useState(1000);
  const grid = useMemo(() => {
    if (!room) return undefined;
    return (
      evaluateAudit(
        { room, tops, subs, stageLayout, dsp: audit.dsp },
        frequency,
      ).grid ?? undefined
    );
  }, [stageLayout, room, tops, subs, frequency, audit.dsp]);
  return (
    <div className="v6-workspace spl-analysis-workspace">
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
      {room && (
        <label className="block mb-4 text-sm">
          Modelo de suma
          <select
            className="audit-input"
            value={room.simulationMode ?? "energy"}
            onChange={(e) => {
              const next = {
                ...room,
                simulationMode: e.target.value as "energy" | "coherent",
              };
              applyRoomScan(next, calculateAcoustics(next));
            }}
          >
            <option value="energy">Energética (fuentes independientes)</option>
            <option value="coherent">
              Coherente ideal (delay y polaridad)
            </option>
          </select>
          <span className="text-xs text-muted-foreground">
            Polares y fase de cajas no medidas; estimación de fuentes puntuales.
          </span>
        </label>
      )}
      {room ? (
        <VenuePreview
          layout={stageLayout}
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
