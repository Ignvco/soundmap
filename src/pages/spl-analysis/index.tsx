import { AnalysisNav } from "@/components/soundmap/analysis-nav";
import { VenuePreview } from "@/components/soundmap/venue-preview";
import { ProjectPlanPreview } from "@/components/soundmap/project-plan-preview";
import { SplPlanPreview } from "@/components/soundmap/spl-plan-preview";
import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import { calculateAcoustics } from "@/lib/audio/acoustics";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import { useAppStore } from "@/store/app";
import { ArrowUpRight, AudioLines, Map, SlidersHorizontal } from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

export default function SPLAnalysis() {
  const { stageLayout, room, tops, subs, monitors, audit, applyRoomScan } =
    useAppStore();
  const [frequency, setFrequency] = useState(1000);
  const evaluation = useMemo(
    () =>
      room
        ? evaluateAudit(
            { room, tops, subs, stageLayout, dsp: audit.dsp },
            frequency,
          )
        : null,
    [stageLayout, room, tops, subs, frequency, audit.dsp],
  );
  const grid = evaluation?.grid ?? undefined;
  return (
    <div className="glow-workspace glow-analysis">
      <AnalysisNav />
      <WorkspaceHeading
        eyebrow="ANÁLISIS / CAMPO DIRECTO"
        title="Leé la cobertura."
        description="Explorá cómo se distribuye el SPL estimado en el público, con el plano y el DSP de tu proyecto."
      >
        <Link className="audit-button" to="/stage-map">
          <Map size={15} /> Editar plano
        </Link>
        <Link className="audit-button" to="/design?step=dsp">
          <SlidersHorizontal size={15} /> Ajustar DSP
        </Link>
      </WorkspaceHeading>
      {room ? (
        <>
          <section
            className="workspace-card analysis-controls"
            aria-label="Opciones del análisis SPL"
          >
            <label>
              Frecuencia
              <select
                aria-label="Frecuencia de análisis"
                className="audit-input"
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
            <label>
              Modelo de suma
              <select
                aria-label="Modelo de suma"
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
                <option value="energy">
                  Energética · fuentes independientes
                </option>
                <option value="coherent">
                  Coherente ideal · delay y polaridad
                </option>
              </select>
            </label>
            <p className="workspace-note">
              {room.simulationMode === "coherent"
                ? "Incluye delay, polaridad y filtros ideales. La fase real de las cajas no está medida."
                : "Suma energía de fuentes independientes. El delay y la polaridad no cambian el nivel en este modo."}
            </p>
          </section>
          <dl
            className="workspace-metrics analysis-metrics"
            data-testid="spl-metrics"
          >
            <div>
              <dt>SPL medio</dt>
              <dd>
                {grid?.mean.toFixed(1) ?? "—"} <small>dB</small>
              </dd>
            </div>
            <div>
              <dt>SPL máximo</dt>
              <dd>
                {grid?.max.toFixed(1) ?? "—"} <small>dB</small>
              </dd>
            </div>
            <div>
              <dt>Uniformidad ±3 dB</dt>
              <dd className="text-accent">
                {grid?.uniformityPct ?? "—"} <small>%</small>
              </dd>
            </div>
            <div>
              <dt>Diferencia máx. / mín.</dt>
              <dd>
                {grid?.spread.toFixed(1) ?? "—"} <small>dB</small>
              </dd>
            </div>
          </dl>
          <div className="analysis-layout">
            <section className="workspace-card analysis-preview">
              <div className="workspace-section-heading">
                <div>
                  <p className="project-eyebrow">VISTA SUPERIOR</p>
                  <h2>Campo sobre el público</h2>
                </div>
                <span className="workspace-tag">Estimación</span>
              </div>
              <VenuePreview
                layout={stageLayout}
                room={room}
                tops={tops}
                subs={subs}
                monitors={monitors}
                grid={grid}
                compact={false}
                className="analysis-venue"
                caption={
                  grid
                    ? `Plano de evaluación a ${grid.yPlane.toFixed(2)} m de altura`
                    : "Plano del inventario · sin cobertura calculada"
                }
                plan={
                  grid ? (
                    <SplPlanPreview
                      room={room}
                      grid={grid}
                      frequency={frequency}
                    />
                  ) : (
                    <ProjectPlanPreview
                      room={room}
                      tops={tops}
                      subs={subs}
                      monitors={monitors}
                      layout={stageLayout}
                    />
                  )
                }
              />
              {!grid && (
                <p className="workspace-note">
                  {tops.length + subs.length === 0
                    ? "Agregá tops o subs para calcular la cobertura."
                    : "No hay muestras válidas. Revisá la geometría y la disposición del sistema."}{" "}
                  <Link
                    className="text-accent"
                    to={
                      tops.length + subs.length === 0
                        ? "/design?step=pa"
                        : "/stage-map"
                    }
                  >
                    Revisar <ArrowUpRight size={12} className="inline" />
                  </Link>
                </p>
              )}
            </section>
            <aside className="analysis-side">
              <section className="workspace-card analysis-reading">
                <p className="project-eyebrow">PUNTO DE REFERENCIA</p>
                <h2>En FOH</h2>
                <p className="analysis-big-value" data-testid="spl-foh">
                  {evaluation?.fohSpl?.toFixed(1) ?? "—"} <small>dB</small>
                </p>
                <dl className="analysis-facts">
                  <div>
                    <dt>Objetivo del proyecto</dt>
                    <dd>{evaluation?.target} dB</dd>
                  </div>
                  <div>
                    <dt>Margen estimado</dt>
                    <dd>
                      {evaluation?.headroomDb == null
                        ? "—"
                        : `${evaluation.headroomDb > 0 ? "+" : ""}${evaluation.headroomDb.toFixed(1)} dB`}
                    </dd>
                  </div>
                </dl>
                <p className="workspace-note">
                  El mapa muestra variación espacial. La uniformidad indica qué
                  parte del público queda a ±3 dB del promedio.
                </p>
              </section>
              <section className="workspace-card analysis-reading">
                <p className="project-eyebrow">ALCANCE DEL MODELO</p>
                <h2>Antes de interpretar</h2>
                <p className="workspace-note">
                  Fuentes puntuales, sin ponderación A/C. Incluye distancia,
                  directividad aproximada y absorción del aire; excluye
                  reflexiones, difracción y polares medidas.
                </p>
                <Link className="audit-button" to="/perform">
                  Ir a medición <ArrowUpRight size={15} />
                </Link>
              </section>
            </aside>
          </div>
          {evaluation && (
            <details className="workspace-disclosure">
              <summary>
                Supuestos del cálculo{" "}
                <span>{evaluation.assumptions.length} notas</span>
              </summary>
              <div>
                <ul className="analysis-notes">
                  {evaluation.assumptions.map((note, i) => (
                    <li key={i}>{note}</li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </>
      ) : (
        <div className="workspace-empty">
          <AudioLines size={30} />
          <h2>Primero, tu recinto</h2>
          <p>
            Definí las dimensiones y agregá el sistema para explorar su
            cobertura.
          </p>
          <Link
            className="audit-button workspace-primary"
            to="/design?step=room"
          >
            Definir recinto <ArrowUpRight size={15} />
          </Link>
        </div>
      )}
    </div>
  );
}
