import { SPLMeter } from "@/components/soundmap/spl-meter";
import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import { ChartCardLine } from "@/components/soundmap/vitals/charts";
import {
  auditFrequencyResponse,
  evaluateAudit,
} from "@/lib/audio/audit-evaluator";
import { useInWizard } from "@/lib/wizard-context";
import { useAppStore } from "@/store/app";
import {
  ArrowUpRight,
  ClipboardCheck,
  FileText,
  Maximize2,
  SlidersHorizontal,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function PerformHub() {
  const { room, tops, subs, stageLayout, audit } = useAppStore();
  const inWizard = useInWizard();
  const { evaluation, response } = useMemo(() => {
    if (!room || (!tops.length && !subs.length))
      return { evaluation: null, response: null };
    const input = { room, tops, subs, stageLayout, dsp: audit.dsp };
    return {
      evaluation: evaluateAudit(input),
      response: auditFrequencyResponse(input),
    };
  }, [room, tops, subs, stageLayout, audit.dsp]);
  const sessions = audit.measurements
    .filter((m) => m.kind === "level")
    .slice(-7)
    .reverse();
  return (
    <div className="glow-workspace glow-perform">
      <WorkspaceHeading
        eyebrow={inWizard ? "DISEÑO / 05 · MEDICIÓN" : "MEDICIÓN / CAPTURA"}
        title="Medí con contexto."
        description="Registrá el nivel de entrada y guardá sesiones como evidencia del proyecto."
      >
        <Link
          className="audit-button"
          to="/kiosk"
          data-testid="perform-goto-kiosk"
        >
          <Maximize2 size={15} /> Modo FOH
        </Link>
      </WorkspaceHeading>
      <span className="sr-only" data-testid="perform-hub-title">
        {room?.name || "Medición en vivo"}
      </span>
      <div className="glow-perform-layout">
        <div data-testid="perform-spl-meter-wrap">
          <SPLMeter
            variant="instrument"
            headroomDb={evaluation?.headroomDb ?? undefined}
            target={room?.targetSpl}
          />
        </div>
        <aside className="perform-sidebar">
          <section className="workspace-card perform-next">
            <div className="workspace-section-heading">
              <div>
                <p className="project-eyebrow">EN TERRENO</p>
                <h2>Tu próxima acción</h2>
              </div>
            </div>
            <nav
              aria-label="Acciones de medición"
              data-testid="perform-quick-actions"
            >
              <Link to="/live" data-testid="perform-goto-live">
                <ClipboardCheck size={19} />
                <div>
                  Operación en vivo
                  <small>Arranque, prueba de línea y señales</small>
                </div>
                <ArrowUpRight size={15} />
              </Link>
              <Link to="/design?step=dsp" data-testid="perform-goto-dsp">
                <SlidersHorizontal size={19} />
                <div>
                  Ajustar DSP<small>Revisar el plan de procesamiento</small>
                </div>
                <ArrowUpRight size={15} />
              </Link>
              <Link to="/audit" data-testid="perform-goto-audit">
                <FileText size={19} />
                <div>
                  Ver expediente<small>Sesiones, revisión y evidencia</small>
                </div>
                <ArrowUpRight size={15} />
              </Link>
            </nav>
          </section>
          <details className="workspace-disclosure perform-prediction">
            <summary>
              Respuesta estimada del PA <span>Modelo del proyecto</span>
            </summary>
            <div>
              {response ? (
                <>
                  <ChartCardLine
                    title="Campo directo en FOH"
                    value={evaluation?.fohSpl?.toFixed(1) ?? "—"}
                    unit="dB · 1 kHz"
                    extra="Curva relativa al máximo · 31,5 Hz–16 kHz"
                    data={response}
                    yTicks={[-40, -20, 0]}
                    testId="perform-response-chart"
                  />
                  <p className="workspace-note">
                    Predicción con el plano y DSP actuales. Esta curva no
                    procede del micrófono.
                  </p>
                  <Link
                    className="audit-button"
                    to="/spl-analysis"
                    data-testid="perform-goto-pa"
                  >
                    Analizar cobertura <ArrowUpRight size={14} />
                  </Link>
                </>
              ) : (
                <>
                  <p className="workspace-note">
                    Definí el recinto y agregá tops o subs para calcular la
                    respuesta.
                  </p>
                  <Link
                    className="audit-button"
                    to="/design?step=room"
                    data-testid="perform-goto-design"
                  >
                    Diseñar sistema <ArrowUpRight size={14} />
                  </Link>
                </>
              )}
            </div>
          </details>
          <p className="workspace-note">
            La captura usa la entrada habilitada por tu dispositivo. Podés pasar
            al modo FOH conservando el micrófono activo.
          </p>
        </aside>
      </div>
      <section
        className="workspace-card perform-history"
        aria-label="Sesiones del proyecto"
      >
        <div className="workspace-section-heading">
          <div>
            <p className="project-eyebrow">EVIDENCIA RECIENTE</p>
            <h2>Sesiones del proyecto</h2>
          </div>
          <span className="workspace-tag">Últimas {sessions.length}</span>
        </div>
        {sessions.length ? (
          <div className="perform-session-list">
            {sessions.map((session) => (
              <article key={session.id} data-testid="perform-session-row">
                <div>
                  <h3>{session.label}</h3>
                  <p>
                    {new Date(session.startedAt).toLocaleString("es-CL", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}{" "}
                    · {session.device || "Micrófono"}
                  </p>
                  <span className="workspace-tag">
                    {session.profile
                      ? "Con referencia declarada"
                      : "Sin referencia válida"}
                  </span>
                </div>
                <dl>
                  <div>
                    <dt>Duración</dt>
                    <dd>
                      {typeof session.summary.duration === "number"
                        ? session.summary.duration.toFixed(1)
                        : "—"}{" "}
                      s
                    </dd>
                  </div>
                  <div>
                    <dt>Máximo RMS</dt>
                    <dd>
                      {typeof session.summary.maxRms === "number"
                        ? session.summary.maxRms.toFixed(1)
                        : "—"}
                      <small>{session.unit}</small>
                    </dd>
                  </div>
                </dl>
                {!!session.interruptions.length && (
                  <p className="perform-session-interruption">
                    {session.interruptions.join(" · ")}
                  </p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="workspace-note">
            {room
              ? "Todavía no hay registros de nivel. Iniciá el micrófono y grabá una sesión para verla aquí."
              : "Definí un recinto para asociar los registros al expediente. Podés usar y exportar el medidor mientras tanto."}
          </p>
        )}
        <Link
          className="audit-button"
          to="/export"
          data-testid="perform-goto-export"
        >
          Abrir exportación <ArrowUpRight size={15} />
        </Link>
      </section>
    </div>
  );
}
