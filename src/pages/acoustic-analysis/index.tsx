import { AnalysisNav } from "@/components/soundmap/analysis-nav";
import { VenuePreview } from "@/components/soundmap/venue-preview";
import { ProjectPlanPreview } from "@/components/soundmap/project-plan-preview";
import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import { useAppStore } from "@/store/app";
import { ArrowUpRight, Ruler } from "lucide-react";
import { Link } from "react-router-dom";

export default function AcousticAnalysis() {
  const { room, acoustics, stageLayout } = useAppStore();
  return (
    <div className="glow-workspace glow-analysis">
      <AnalysisNav />
      <WorkspaceHeading
        eyebrow="ANÁLISIS / ACÚSTICA DEL RECINTO"
        title="Entendé la sala."
        description="Reverberación, volumen y modos estimados a partir de las dimensiones, los materiales y la ocupación."
      >
        <Link className="audit-button" to="/design?step=room">
          <Ruler size={15} /> Editar recinto
        </Link>
      </WorkspaceHeading>
      {room && acoustics ? (
        <>
          <dl
            className="workspace-metrics analysis-metrics"
            data-testid="acoustic-metrics"
          >
            <div>
              <dt>RT60 · ocupación actual</dt>
              <dd className="text-accent">
                {acoustics.rt60Occupied.toFixed(2)} <small>s</small>
              </dd>
            </div>
            <div>
              <dt>Volumen</dt>
              <dd>
                {Math.round(acoustics.volume).toLocaleString()}{" "}
                <small>m³</small>
              </dd>
            </div>
            <div>
              <dt>Frecuencia de Schroeder</dt>
              <dd>
                {Math.round(acoustics.schroederFreq)} <small>Hz</small>
              </dd>
            </div>
            <div>
              <dt>Distancia crítica</dt>
              <dd>
                {acoustics.criticalDistance.toFixed(1)} <small>m</small>
              </dd>
            </div>
          </dl>
          <div className="acoustic-layout">
            <section className="workspace-card acoustic-reverb">
              <div className="workspace-section-heading">
                <div>
                  <p className="project-eyebrow">TIEMPO DE REVERBERACIÓN</p>
                  <h2>La ocupación cambia la sala</h2>
                </div>
                <span className="workspace-tag">Estimado</span>
              </div>
              <div className="acoustic-bars">
                {[
                  {
                    label: "Sala vacía",
                    value: acoustics.rt60Empty,
                    current: false,
                  },
                  {
                    label: "Aforo completo",
                    value: acoustics.rt60Audience,
                    current: false,
                  },
                  {
                    label: "Ocupación actual",
                    value: acoustics.rt60Occupied,
                    current: true,
                  },
                ].map((x) => (
                  <div
                    className="acoustic-bar"
                    key={x.label}
                    data-current={x.current}
                  >
                    <div>
                      <span>{x.label}</span>
                      <strong>
                        {x.value.toFixed(2)} <small>s</small>
                      </strong>
                    </div>
                    <div className="acoustic-bar-track" aria-hidden="true">
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, (x.value / Math.max(acoustics.rt60Empty, acoustics.rt60Audience, acoustics.rt60Occupied, 0.1)) * 100))}%`,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <p className="workspace-note">
                Valores calculados con los materiales declarados. Contrastalos
                con una medición RT60 del recinto.
              </p>
              <Link className="audit-button" to="/design?step=room">
                Recinto y medición RT60 <ArrowUpRight size={15} />
              </Link>
            </section>
            <section className="workspace-card analysis-preview">
              <div className="workspace-section-heading">
                <div>
                  <p className="project-eyebrow">GEOMETRÍA</p>
                  <h2>{room.name}</h2>
                </div>
              </div>
              <VenuePreview
                room={room}
                geometryOnly
                caption={`${room.width} × ${room.length} × ${room.height} m · Geometría del recinto`}
                plan={
                  <ProjectPlanPreview
                    room={room}
                    tops={[]}
                    subs={[]}
                    monitors={[]}
                    layout={stageLayout}
                  />
                }
              />
            </section>
            <section className="workspace-card analysis-reading">
              <p className="project-eyebrow">BAJAS FRECUENCIAS</p>
              <h2>Modos axiales fundamentales</h2>
              <dl className="acoustic-modes">
                {[
                  {
                    label: "Largo",
                    size: room.length,
                    value: acoustics.axialModes.x,
                  },
                  {
                    label: "Ancho",
                    size: room.width,
                    value: acoustics.axialModes.y,
                  },
                  {
                    label: "Alto",
                    size: room.height,
                    value: acoustics.axialModes.z,
                  },
                ].map((axis) => (
                  <div key={axis.label}>
                    <dt>
                      {axis.label}
                      <small>{axis.size} m</small>
                    </dt>
                    <dd>
                      {axis.value.toFixed(1)} <small>Hz</small>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="workspace-note">
                Referencia a partir de las tres dimensiones. La geometría
                irregular requiere un análisis específico.
              </p>
            </section>
            <section className="workspace-card analysis-reading">
              <p className="project-eyebrow">LECTURA DEL RECINTO</p>
              <h2>Recomendaciones</h2>
              {acoustics.recommendations.length ? (
                <ul className="analysis-notes">
                  {acoustics.recommendations.map((r, i) => (
                    <li key={i}>{r}</li>
                  ))}
                </ul>
              ) : (
                <p className="workspace-note">
                  Sin recomendaciones adicionales para los datos actuales.
                </p>
              )}
              <Link className="audit-button" to="/spl-analysis">
                Explorar cobertura SPL <ArrowUpRight size={15} />
              </Link>
            </section>
          </div>
        </>
      ) : (
        <div className="workspace-empty">
          <Ruler size={30} />
          <h2>Primero, tu recinto</h2>
          <p>
            Completá las dimensiones y los materiales para analizar su acústica.
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
