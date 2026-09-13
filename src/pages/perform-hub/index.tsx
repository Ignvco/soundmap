import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Maximize2,
  ArrowRight,
  FileDown,
  Sliders,
  Activity,
  Radio,
} from "lucide-react";
import { SPLMeter } from "@/components/soundmap/spl-meter.tsx";
import { useAppStore } from "@/store/app.ts";
import {
  ChartCardBar,
  ChartCardLine,
} from "@/components/soundmap/vitals/charts.tsx";
import { calculateCrossover } from "@/lib/audio/pa-engine.ts";
import {
  paSummary,
  paFrequencyResponse,
  sessionsPeakSeries,
} from "@/lib/audio/system-vitals.ts";
import { feedback } from "@/lib/feedback.ts";

export default function PerformHub() {
  const { room, tops, subs, monitors, scenes } = useAppStore();
  const hasSystem = tops.length > 0 || subs.length > 0;
  const { pa, response, sessions } = useMemo(() => {
    const x = calculateCrossover(tops, subs);
    return {
      pa: hasSystem ? paSummary(tops, subs, monitors) : null,
      response: hasSystem
        ? paFrequencyResponse(
            tops,
            subs,
            x.crossoverFreq,
            x.topHpf,
            x.topLpf,
            x.subLpf,
            x.subHpf,
          )
        : null,
      sessions: sessionsPeakSeries(scenes, 7),
    };
  }, [hasSystem, tops, subs, monitors, scenes]);
  return (
    <div className="v6-workspace perform-workspace">
      <header className="perform-heading">
        <div>
          <h1 className="v6-heading">Perform</h1>
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
              extra="Predicción del sistema · 20 Hz–20 kHz"
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
            Comparar capacidad de escenas guardadas{" "}
            <span>{sessions.length} escenas</span>
          </summary>
          <ChartCardBar
            title="SPL máximo estimado por escena"
            value={sessions[sessions.length - 1].value}
            unit="dB"
            extra="Capacidad calculada de cada PA"
            data={sessions}
            yTicks={[100, 120, 145]}
            testId="perform-sessions-bar"
          />
        </details>
      )}
    </div>
  );
}
