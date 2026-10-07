import { VenuePreview } from "@/components/soundmap/venue-preview";
import { ProjectPlanPreview } from "@/components/soundmap/project-plan-preview";
import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import {
  calculatePARecommendation,
  type GearItem,
} from "@/lib/audio/pa-engine";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import { catalogStatus } from "@/lib/audio/catalog";
import { useAppStore } from "@/store/app";
import {
  ArrowUpRight,
  AudioWaveform,
  Speaker,
  SlidersHorizontal,
  Map,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

const units = (items: GearItem[]) =>
  items.reduce((sum, item) => sum + (item.quantity ?? 1), 0);

export default function PA() {
  const {
    room,
    acoustics,
    tops,
    subs,
    monitors,
    amps,
    dspUnits,
    mixers,
    mics,
    stageLayout,
    audit,
  } = useAppStore();
  const pa = useMemo(
    () =>
      room && acoustics
        ? calculatePARecommendation(
            room,
            acoustics,
            tops,
            subs,
            monitors,
            amps,
            stageLayout,
            audit.dsp,
          )
        : null,
    [room, acoustics, tops, subs, monitors, amps, stageLayout, audit.dsp],
  );
  const evaluation = useMemo(
    () =>
      room
        ? evaluateAudit({ room, tops, subs, stageLayout, dsp: audit.dsp })
        : null,
    [room, tops, subs, stageLayout, audit.dsp],
  );
  const groups = [
    { title: "Tops / Line arrays", items: tops, desc: pa?.topsConfig },
    { title: "Subwoofers", items: subs, desc: pa?.subsConfig },
    { title: "Monitores", items: monitors, desc: pa?.monitorsConfig },
    { title: "Amplificadores", items: amps },
    { title: "Procesadores DSP", items: dspUnits },
    { title: "Consolas", items: mixers },
    { title: "Micrófonos", items: mics },
  ];
  const totalUnits = groups.reduce((sum, group) => sum + units(group.items), 0);
  const acousticGear = [...tops, ...subs, ...monitors];
  return (
    <div className="glow-workspace glow-pa">
      <WorkspaceHeading
        eyebrow="SISTEMA / RESUMEN PA"
        title="Tu sistema, en contexto."
        description="Revisá el inventario, el despliegue y las estimaciones antes de seguir con la configuración."
      >
        <Link to="/design?step=pa" className="audit-button workspace-primary">
          <Speaker size={15} /> Editar equipo
        </Link>
        <Link to="/design?step=dsp" className="audit-button">
          <SlidersHorizontal size={15} /> Abrir DSP
        </Link>
      </WorkspaceHeading>
      {room && acoustics && pa ? (
        <>
          <div className="pa-status">
            <AudioWaveform size={25} />
            <div>
              <p>
                {pa.systemReady
                  ? "Inventario PA registrado"
                  : "Agregá tops para completar el PA"}
              </p>
              <span>
                {totalUnits} unidades en el proyecto · {room.name}
              </span>
            </div>
            <span className="workspace-tag">Planificación</span>
          </div>
          <dl
            className="workspace-metrics analysis-metrics"
            data-testid="pa-metrics"
          >
            <div>
              <dt>SPL objetivo</dt>
              <dd>
                {pa.splTarget} <small>dB</small>
              </dd>
            </div>
            <div>
              <dt>SPL estimado en FOH</dt>
              <dd>
                {evaluation?.fohSpl?.toFixed(1) ?? "—"} <small>dB</small>
              </dd>
            </div>
            <div>
              <dt>Margen estimado en FOH</dt>
              <dd>
                {evaluation?.headroomDb == null
                  ? "—"
                  : `${evaluation.headroomDb > 0 ? "+" : ""}${evaluation.headroomDb.toFixed(1)}`}{" "}
                <small>dB</small>
              </dd>
            </div>
            <div>
              <dt>Cobertura H de referencia</dt>
              <dd>
                {tops.length ? pa.coverageAngle : "—"} <small>°</small>
              </dd>
            </div>
          </dl>
          <p className="workspace-note">
            Estimación de campo directo a 1 kHz con el plano y DSP actuales.
            Registrar equipos no verifica su rendimiento ni confirma un
            despliegue.
          </p>
          <div className="pa-overview">
            <section className="workspace-card analysis-preview">
              <div className="workspace-section-heading">
                <div>
                  <p className="project-eyebrow">DISPOSICIÓN ACTUAL</p>
                  <h2>El sistema en la sala</h2>
                </div>
                <Link
                  to="/stage-map"
                  className="audit-button"
                  aria-label="Editar disposición en el plano"
                >
                  <Map size={15} />
                  <span>Editar plano</span>
                </Link>
              </div>
              <VenuePreview
                room={room}
                tops={tops}
                subs={subs}
                monitors={monitors}
                layout={stageLayout}
                grid={evaluation?.grid ?? undefined}
                plan={
                  <ProjectPlanPreview
                    room={room}
                    tops={tops}
                    subs={subs}
                    monitors={monitors}
                    layout={stageLayout}
                  />
                }
              />
              <Link to="/spl-analysis" className="audit-button">
                Abrir análisis SPL <ArrowUpRight size={15} />
              </Link>
            </section>
            <section className="workspace-card analysis-reading pa-strategy">
              <p className="project-eyebrow">PUNTO DE PARTIDA</p>
              <h2>Graves y cruce</h2>
              <div className="pa-crossover">
                <span>Cruce sugerido</span>
                <p>
                  {subs.length && tops.length && pa.crossoverFreq > 0
                    ? pa.crossoverFreq
                    : "—"}{" "}
                  <small>Hz</small>
                </p>
              </div>
              <dl className="analysis-facts">
                <div>
                  <dt>Unidades de sub</dt>
                  <dd>{units(subs)}</dd>
                </div>
                <div>
                  <dt>Estrategia sugerida</dt>
                  <dd>{subs.length ? pa.subStrategy : "Sin subs"}</dd>
                </div>
              </dl>
              <p className="workspace-note">
                La sugerencia parte del inventario. Revisá ubicación,
                orientación, filtros, delay y polaridad en el DSP antes de
                aplicarla.
              </p>
              <Link className="audit-button" to="/design?step=dsp">
                Revisar configuración DSP <ArrowUpRight size={15} />
              </Link>
            </section>
          </div>
          <section aria-label="Equipo del proyecto" className="pa-equipment">
            <div className="workspace-section-heading">
              <div>
                <p className="project-eyebrow">INVENTARIO</p>
                <h2>Todo el equipo del proyecto</h2>
              </div>
              <span className="workspace-tag">{totalUnits} unidades</span>
            </div>
            <div className="pa-equipment-grid">
              {groups.map(({ title, items, desc }) => (
                <section
                  key={title}
                  className="workspace-card pa-equipment-group"
                >
                  <div className="workspace-section-heading">
                    <h3>{title}</h3>
                    <span className="workspace-tag">{units(items)} u.</span>
                  </div>
                  {items.length ? (
                    <>
                      <ul>
                        {items.map((item) => (
                          <li key={item.id}>
                            <span className="gear-inventory-qty">
                              {item.quantity ?? 1}×
                            </span>
                            <div>
                              <small>{item.brand}</small>
                              <p>{item.model}</p>
                              <small>{catalogStatus(item)}</small>
                            </div>
                          </li>
                        ))}
                      </ul>
                      {desc && <p className="workspace-note">{desc}</p>}
                    </>
                  ) : (
                    <Link className="pa-empty-category" to="/design?step=pa">
                      Agregar equipo <ArrowUpRight size={14} />
                    </Link>
                  )}
                </section>
              ))}
            </div>
          </section>
          {acousticGear.length > 0 && (
            <details className="workspace-disclosure">
              <summary>
                Bandas declaradas del equipo{" "}
                <span>{acousticGear.length} modelos</span>
              </summary>
              <div className="pa-band-list">
                {acousticGear.map((item) => (
                  <div key={item.id}>
                    <span>
                      {item.brand} {item.model}
                    </span>
                    <strong>
                      {item.freqLow != null && item.freqHigh != null
                        ? `${item.freqLow}–${item.freqHigh} Hz`
                        : "Sin dato"}
                    </strong>
                  </div>
                ))}
                <p className="workspace-note">
                  Límites de la ficha de catálogo. No representan una curva de
                  respuesta medida ni la respuesta del sistema completo.
                </p>
              </div>
            </details>
          )}
          <div className="pa-guidance">
            {pa.eqHints.length > 0 && (
              <details className="workspace-disclosure">
                <summary>
                  Sugerencias DSP / EQ <span>{pa.eqHints.length} notas</span>
                </summary>
                <div>
                  <ul className="analysis-notes">
                    {pa.eqHints.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
            {pa.ampSuggestions.length > 0 && (
              <details className="workspace-disclosure">
                <summary>
                  Notas de amplificación{" "}
                  <span>{pa.ampSuggestions.length} notas</span>
                </summary>
                <div>
                  <ul className="analysis-notes">
                    {pa.ampSuggestions.map((hint, i) => (
                      <li key={i}>{hint}</li>
                    ))}
                  </ul>
                </div>
              </details>
            )}
          </div>
          {pa.warnings.length > 0 && (
            <details className="workspace-disclosure pa-assumptions" open>
              <summary>
                Supuestos y puntos a revisar{" "}
                <span>{pa.warnings.length} notas del sistema</span>
              </summary>
              <div>
                <ul className="analysis-notes">
                  {pa.warnings.map((warning, i) => (
                    <li key={i}>{warning}</li>
                  ))}
                </ul>
              </div>
            </details>
          )}
        </>
      ) : (
        <div className="workspace-empty">
          <AudioWaveform size={30} />
          <h2>Primero, tu recinto</h2>
          <p>
            Completá las dimensiones y los materiales para contextualizar el
            sistema PA.
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
