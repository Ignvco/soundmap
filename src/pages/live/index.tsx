import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
import { SPLMeter } from "@/components/soundmap/spl-meter";
import { TestSignalsPlayer } from "@/components/soundmap/test-signals-player";
import {
  generateLineCheckProcedure,
  generateStartupProcedure,
} from "@/lib/audio/live-engine";
import { feedback } from "@/lib/feedback";
import { useAppStore } from "@/store/app";
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  Check,
  ClipboardCheck,
  Maximize2,
  Radio,
  RotateCcw,
  ShieldAlert,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type LiveTab = "startup" | "linecheck" | "backup" | "emergency";
const TABS = [
  { id: "startup", label: "Arranque", Icon: Zap },
  { id: "linecheck", label: "Prueba de línea", Icon: Activity },
  { id: "backup", label: "Respaldo", Icon: Radio },
  { id: "emergency", label: "Emergencia", Icon: ShieldAlert },
] as const;

function EmergencyProtocol() {
  const steps = [
    { order: 1, text: "MUTEAR el fader maestro inmediatamente", urgent: true },
    { order: 2, text: "Mutear todos los envíos a monitor", urgent: true },
    {
      order: 3,
      text: "Notificar al personal del recinto e ingeniero de FOH",
      urgent: false,
    },
    {
      order: 4,
      text: "Evaluar causa: feedback / sobrecarga / falla de equipo",
      urgent: false,
    },
    {
      order: 5,
      text: "Si es seguro continuar: restablecer faders gradualmente en orden",
      urgent: false,
    },
    {
      order: 6,
      text: "Si no es seguro: iniciar secuencia de apagado completo",
      urgent: true,
    },
  ];

  return (
    <div className="workspace-card live-protocol">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-xl bg-destructive/12 border border-destructive/25 flex items-center justify-center">
          <AlertTriangle size={16} className="text-destructive" />
        </div>
        <div>
          <p className="text-xs font-bold text-destructive">
            Protocolo de Emergencia
          </p>
          <p className="text-[10px] text-muted-foreground">
            Seguir en orden — no saltear pasos
          </p>
        </div>
      </div>
      <div className="space-y-2.5">
        {steps.map((s) => (
          <div key={s.order} className="flex items-start gap-3">
            <div
              className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-medium ${
                s.urgent
                  ? "bg-destructive/15 text-destructive border border-destructive/30"
                  : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {s.order}
            </div>
            <p
              className={`text-xs pt-0.5 leading-snug ${s.urgent ? "text-destructive font-semibold" : "text-foreground/70"}`}
            >
              {s.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Backup protocol card ──────────────────────────────────────────────────────
function BackupProtocol() {
  const items = [
    {
      title: "Consola de repuesto",
      desc: "Mantener una consola secundaria pre-patcheada lista para cambio inmediato",
    },
    {
      title: "Fuentes de audio de respaldo",
      desc: "Reproducción USB / SD en caso de falla del laptop",
    },
    {
      title: "Frecuencias inalámbricas",
      desc: "Escanear canales de respaldo en todos los sistemas inalámbricos antes del show",
    },
    {
      title: "Cajas DI",
      desc: "Llevar cajas DI pasivas de repuesto para cada instrumento",
    },
    {
      title: "Cables",
      desc: "Cables XLR, de altavoz y de alimentación de respaldo probados en el escenario",
    },
  ];

  return (
    <div className="workspace-card live-protocol">
      <div className="flex items-center gap-2.5 mb-4">
        <div
          className="h-9 w-9 rounded-xl bg-chart-3/12 border border-chart-3/25 flex items-center justify-center"
          style={{
            background: "rgba(154,154,154,0.12)",
            borderColor: "rgba(154,154,154,0.25)",
          }}
        >
          <Radio size={16} style={{ color: "#9A9A9A" }} />
        </div>
        <div>
          <p className="text-xs font-bold" style={{ color: "#9A9A9A" }}>
            Lista de Respaldo
          </p>
          <p className="text-[10px] text-muted-foreground">
            Ítems de preparación pre-show
          </p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.title} className="flex items-start gap-2.5">
            <div
              className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
              style={{ background: "#9A9A9A" }}
            />
            <div>
              <p className="text-xs font-bold text-foreground">{item.title}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                {item.desc}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Live() {
  const { room, acoustics, tops, subs, dspUnits, amps } = useAppStore();
  const [activeTab, setActiveTab] = useState<LiveTab>("startup");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());
  const startup = useMemo(
    () =>
      room && acoustics
        ? generateStartupProcedure(tops, subs, dspUnits, amps, acoustics)
        : null,
    [room, acoustics, tops, subs, dspUnits, amps],
  );
  const linecheck = useMemo(() => generateLineCheckProcedure(), []);
  const procedure =
    activeTab === "startup"
      ? startup
      : activeTab === "linecheck"
        ? linecheck
        : null;
  const steps = procedure?.steps ?? [];
  const completedCount = steps.filter((step) =>
    completedSteps.has(step.id),
  ).length;
  const complete = steps.length > 0 && completedCount === steps.length;
  const toggleStep = (id: string) => {
    feedback("select", { sound: false });
    setCompletedSteps((old) => {
      const next = new Set(old);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const resetCurrent = () =>
    setCompletedSteps((old) => {
      const next = new Set(old);
      steps.forEach((step) => next.delete(step.id));
      return next;
    });
  return (
    <div className="glow-workspace glow-live">
      <WorkspaceHeading
        eyebrow="OPERACIÓN / EN TERRENO"
        title="Prepará cada paso."
        description="Listas operativas y señales de prueba, con el medidor siempre a mano."
      >
        <Link className="audit-button" to="/kiosk" data-testid="open-kiosk-btn">
          <Maximize2 size={15} /> Modo FOH
        </Link>
      </WorkspaceHeading>
      <div className="glow-live-layout">
        <section className="live-procedures">
          <nav className="live-tabs" aria-label="Procedimientos operativos">
            {TABS.map(({ id, label, Icon }) => (
              <button
                key={id}
                type="button"
                aria-pressed={activeTab === id}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={16} />
                <span>{label}</span>
              </button>
            ))}
          </nav>
          {procedure && steps.length > 0 && (
            <section
              className="workspace-card live-progress"
              aria-label="Progreso del procedimiento"
            >
              <div className="workspace-section-heading">
                <div>
                  <p className="project-eyebrow">
                    {complete ? "LISTA COMPLETADA" : "REVISIÓN MANUAL"}
                  </p>
                  <h2>{procedure.title}</h2>
                </div>
                <button
                  className="app-icon-button"
                  aria-label="Reiniciar lista actual"
                  onClick={resetCurrent}
                  disabled={!completedCount}
                >
                  <RotateCcw size={17} />
                </button>
              </div>
              <div className="live-progress-caption">
                <span data-testid="live-progress-count">
                  {completedCount} de {steps.length} pasos
                </span>
                <span>
                  {Math.round((completedCount / steps.length) * 100)}%
                </span>
              </div>
              <progress
                max={steps.length}
                value={completedCount}
                aria-label="Pasos completados"
              />
            </section>
          )}
          {activeTab === "emergency" ? (
            <EmergencyProtocol />
          ) : activeTab === "backup" ? (
            <BackupProtocol />
          ) : (
            <>
              {steps.length ? (
                <div className="live-step-list">
                  {steps.map((step, index) => (
                    <label
                      key={step.id}
                      className="live-step"
                      data-done={completedSteps.has(step.id)}
                    >
                      <input
                        type="checkbox"
                        checked={completedSteps.has(step.id)}
                        onChange={() => toggleStep(step.id)}
                        aria-label={step.title}
                      />
                      <span className="live-step-number" aria-hidden="true">
                        {completedSteps.has(step.id) ? (
                          <Check size={14} />
                        ) : (
                          String(index + 1).padStart(2, "0")
                        )}
                      </span>
                      <span className="live-step-copy">
                        <span className="live-step-title">
                          {step.title}
                          {step.critical && <small>Crítico</small>}
                        </span>
                        <span>{step.description}</span>
                      </span>
                    </label>
                  ))}
                </div>
              ) : (
                <div className="workspace-empty">
                  <ClipboardCheck size={28} />
                  <h2>Prepará el proyecto</h2>
                  <p>
                    Definí un recinto y agregá el equipo para generar la lista
                    de arranque.
                  </p>
                  <Link className="audit-button" to="/design?step=room">
                    Ir a diseño <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
              {complete && (
                <p className="live-complete" role="status">
                  <Check size={18} />
                  Lista marcada como completada. Confirmá el resultado en el
                  sistema físico.
                </p>
              )}
            </>
          )}
          <p className="workspace-note">
            Las marcas se conservan al cambiar de lista durante esta visita. Son
            un apoyo operativo y no modifican las revisiones del expediente.
          </p>
        </section>
        <aside className="live-instruments">
          <details className="workspace-disclosure live-meter-disclosure">
            <summary>
              Medidor de nivel <span>Captura de micrófono</span>
            </summary>
            <div>
              <SPLMeter target={room?.targetSpl} variant="instrument" />
            </div>
          </details>
          <TestSignalsPlayer />
          <Link className="audit-button" to="/perform">
            Abrir medición y sesiones <ArrowUpRight size={15} />
          </Link>
        </aside>
      </div>
    </div>
  );
}
