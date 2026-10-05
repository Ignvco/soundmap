import { SPLMeter } from "@/components/soundmap/spl-meter.tsx";
import {
  ChartCardBar,
  ChartCardLine,
} from "@/components/soundmap/vitals/charts.tsx";
import { auditFrequencyResponse } from "@/lib/audio/audit-evaluator";
import { paSummary } from "@/lib/audio/system-vitals.ts";
import { feedback } from "@/lib/feedback.ts";
import { useAppStore } from "@/store/app.ts";
import {
  Activity,
  ArrowRight,
  FileDown,
  Maximize2,
  Radio,
  Sliders,
} from "lucide-react";
import { useMemo } from "react";
import { Link } from "react-router-dom";

export default function PerformHub() {
  const { room, tops, subs, monitors, stageLayout, audit } = useAppStore();
  const hasSystem = tops.length > 0 || subs.length > 0;
  const { pa, response, sessions } = useMemo(() => {
    return {
      pa: hasSystem
        ? paSummary(
            tops,
            subs,
            monitors,
            room ?? undefined,
            stageLayout,
            audit.dsp,
          )
        : null,
      response:
        room && hasSystem
          ? auditFrequencyResponse({
              room,
              tops,
              subs,
              stageLayout,
              dsp: audit.dsp,
            })
          : null,
      sessions: audit.measurements
        .filter(
          (m) =>
            m.kind === "level" &&
            m.profile &&
            typeof m.summary.maxRms === "number",
        )
        .slice(-7)
        .map((m, i) => ({
          id: m.id,
          label: String(i + 1),
          value: Number(m.summary.maxRms),
          highlight: false,
        })),
    };
  }, [hasSystem, tops, subs, monitors, room, stageLayout, audit]);
  return (
    <div className="v6-workspace perform-workspace">
      <header className="perform-heading">
        <div>
          <h1 className="v6-heading">Medición</h1>
          <p data-testid="perform-hub-title">
            {room?.name || "Medición en vivo"}
          </p>
        </div>
        <Link
          to="/kiosk"
          className="v6-button"
          data-testid="perform-goto-kiosk"
          onClick={() => feedback("select")}
        >
          <Maximize2 size={15} />
          FOH Kiosk
        </Link>
      </header>
      <div className="perform-layout">
        <div data-testid="perform-spl-meter-wrap">
          <SPLMeter variant="instrument" headroomDb={pa?.headroomDb} />
        </div>
        <div className="perform-response">
          {response ? (
            <ChartCardLine
              title="Respuesta estimada del PA"
              value={pa?.arraySpl ?? "—"}
              unit="dB máx."
              extra="Campo directo en receptor · 31,5 Hz–16 kHz · relativo al máximo"
              data={response}
              yTicks={[-40, -20, 0]}
              testId="perform-response-chart"
            />
          ) : (
            <div className="v6-panel p-5 text-sm text-muted-foreground">
              Configurá el PA para ver su respuesta en frecuencia.
              <Link
                to="/design"
                className="v6-button mt-4"
                data-testid="perform-goto-design"
              >
                Diseñar sistema <ArrowRight size={14} />
              </Link>
            </div>
          )}
        </div>
      </div>
      <div className="perform-actions" data-testid="perform-quick-actions">
        {[
          { to: "/live", label: "Operación en vivo", icon: Radio, id: "live" },
          {
            to: "/design?step=dsp",
            label: "Ajustar DSP",
            icon: Sliders,
            id: "dsp",
          },
          {
            to: "/pa",
            label: "Respuesta del sistema",
            icon: Activity,
            id: "pa",
          },
          {
            to: "/export",
            label: "Exportar reporte",
            icon: FileDown,
            id: "export",
          },
        ].map(({ to, label, icon: Icon, id }) => (
          <Link
            to={to}
            key={id}
            data-testid={`perform-goto-${id}`}
            onClick={() => feedback("tap")}
          >
            <Icon size={17} strokeWidth={1.6} />
            <span>{label}</span>
            <ArrowRight size={13} />
          </Link>
        ))}
      </div>
      {sessions.length > 0 && (
        <details className="performance-history">
          <summary>
            Sesiones capturadas con perfil{" "}
            <span>{sessions.length} sesiones</span>
          </summary>
          <ChartCardBar
            title="Máximo RMS registrado"
            value={sessions[sessions.length - 1].value}
            unit="dB(A) estimado"
            extra="Capturas con referencia declarada; comprobar perfil y posición"
            data={sessions}
            yTicks={[100, 120, 145]}
            testId="perform-sessions-bar"
          />
        </details>
      )}
    </div>
  );
}
