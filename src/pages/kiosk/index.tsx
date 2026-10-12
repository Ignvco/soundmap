import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Flag,
  Maximize2,
  Mic,
  Minimize2,
  RotateCcw,
  SlidersHorizontal,
  Square,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAppStore } from "@/store/app";
import { useSPLMeter } from "@/hooks/use-spl-meter";
import { generateDSPConfig, type DSPOutput } from "@/lib/audio/dsp-engine";
import { Capacitor } from "@capacitor/core";

const PAGE_SIZE = 8;
function Fader({
  output,
  value,
  muted,
  onChange,
  onMute,
}: {
  output: DSPOutput;
  value: number;
  muted: boolean;
  onChange: (value: number) => void;
  onMute: () => void;
}) {
  const testId = `kiosk-fader-${output.id.toLowerCase()}`;
  return (
    <section
      className="foh-fader"
      data-role={output.role}
      data-muted={muted}
      data-testid={testId}
    >
      <p className="foh-fader-id">{output.id}</p>
      <h3>{output.label}</h3>
      <p className="foh-fader-destination">{output.destination}</p>
      <output>
        {value > 0 ? "+" : ""}
        {value.toFixed(1)} <small>dB</small>
      </output>
      <div className="foh-fader-travel">
        <span aria-hidden="true">+12</span>
        <input
          type="range"
          min={-60}
          max={12}
          step={0.5}
          value={value}
          aria-label={`Ganancia visual de ${output.label}`}
          onChange={(e) => onChange(Number(e.target.value))}
        />
        <span aria-hidden="true">−60</span>
      </div>
      <button
        type="button"
        className="audit-button"
        aria-pressed={muted}
        aria-label={`Silencio visual de ${output.label}`}
        onClick={onMute}
        data-testid={`${testId}-mute`}
      >
        {muted ? "Silencio" : "Activo"}
      </button>
    </section>
  );
}

function useElapsedTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const accumulatedRef = useRef(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    // Antes se reseteaba a 0 al parar el micrófono: pausabas el medidor y
    // perdías el tiempo de sesión, que es justo el dato con el que se estima
    // exposición acumulada. Ahora se acumula entre pausas.
    if (!active) {
      startRef.current = null;
      return;
    }
    const startedAt = Date.now();
    startRef.current = startedAt;
    const id = setInterval(() => {
      setElapsed(
        accumulatedRef.current + Math.floor((Date.now() - startedAt) / 1000),
      );
    }, 500);
    return () => {
      clearInterval(id);
      accumulatedRef.current += Math.floor((Date.now() - startedAt) / 1000);
    };
  }, [active]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Screen Wake Lock ────────────────────────────────────────────────────────
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lock: WakeLockSentinel | null = null;
    let cancelled = false;
    const request = async () => {
      try {
        if ("wakeLock" in navigator) {
          const acquired = await (
            navigator as Navigator & { wakeLock: WakeLock }
          ).wakeLock.request("screen");
          if (cancelled) await acquired.release();
          else lock = acquired;
        }
      } catch {
        /* not supported / user hasn't gestured yet */
      }
    };
    request();
    const onVis = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      cancelled = true;
      document.removeEventListener("visibilitychange", onVis);
      if (lock) {
        try {
          lock.release();
        } catch {
          /* ignore */
        }
      }
    };
  }, [enabled]);
}

export default function KioskPage() {
  const {
    room,
    acoustics,
    tops,
    subs,
    monitors,
    dspUnits,
    amps,
    stageLayout,
    audit,
  } = useAppStore();
  const proposal = useMemo(
    () =>
      room && acoustics && !audit.dsp
        ? generateDSPConfig(
            room,
            acoustics,
            tops,
            subs,
            monitors,
            dspUnits[0] ?? null,
            amps,
            stageLayout,
            audit.protection,
          )
        : null,
    [
      room,
      acoustics,
      tops,
      subs,
      monitors,
      dspUnits,
      amps,
      stageLayout,
      audit.dsp,
      audit.protection,
    ],
  );
  const outputs = audit.dsp?.outputs ?? proposal?.outputs ?? [];
  const [faders, setFaders] = useState<Record<string, number>>({});
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [page, setPage] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const [marks, setMarks] = useState<
    { id: string; time: string; value: number; unit: string }[]
  >([]);
  const spl = useSPLMeter();
  const running = spl.state === "running";
  const hasReading = running && spl.reading.timestamp > 0;
  const displayValue = spl.isCalibrated ? spl.reading.spl : spl.reading.dbfs;
  const unit = spl.isCalibrated ? "dB(A) estimado" : "dBFS · A digital";
  const offset = spl.isCalibrated ? 0 : spl.calibrationOffset;
  const pages = Math.max(1, Math.ceil(outputs.length / PAGE_SIZE));
  const currentPage = Math.min(page, pages - 1);
  useWakeLock(running);
  const timer = useElapsedTimer(running);
  const canFullscreen =
    typeof document !== "undefined" &&
    typeof document.documentElement.requestFullscreen === "function" &&
    !Capacitor.isNativePlatform();
  const [fullscreenError, setFullscreenError] = useState("");
  const toggleFullscreen = async () => {
    try {
      setFullscreenError("");
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setFullscreenError("El navegador no habilitó la pantalla completa.");
    }
  };
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => {});
    };
  }, []);
  return (
    <div className="glow-foh" data-testid="kiosk-root">
      <header className="foh-header">
        <Link
          to="/perform"
          className="app-icon-button"
          data-testid="kiosk-exit"
          aria-label="Salir de Kiosk"
        >
          <ArrowLeft size={19} />
        </Link>
        <div>
          <p className="project-eyebrow">SOUNDMAP / FOH</p>
          <h1>{room?.name || "Medición sin recinto"}</h1>
        </div>
        <span className="foh-timer" data-testid="kiosk-timer">
          {timer}
        </span>
        {canFullscreen && (
          <button
            className="app-icon-button"
            aria-label={
              fullscreen ? "Salir de pantalla completa" : "Pantalla completa"
            }
            data-testid="kiosk-fullscreen"
            onClick={() => void toggleFullscreen()}
          >
            {fullscreen ? <Minimize2 size={19} /> : <Maximize2 size={19} />}
          </button>
        )}
      </header>
      <main className="foh-main">
        <section className="foh-meter" aria-label="Nivel de micrófono">
          <div className="workspace-section-heading">
            <p className="project-eyebrow">ENTRADA EN VIVO</p>
            <span className="workspace-tag">
              {spl.isCalibrated ? "Con referencia" : "Sin referencia"}
            </span>
          </div>
          <div className="meter-status" data-state={spl.state} role="status">
            <span />
            {running
              ? "Captura activa"
              : spl.state === "starting"
                ? "Solicitando micrófono"
                : spl.state === "denied"
                  ? "Permiso bloqueado"
                  : "Micrófono detenido"}
          </div>
          <p className="foh-value" data-testid="kiosk-spl-value">
            {hasReading ? displayValue.toFixed(1) : "—"}
          </p>
          <span className="foh-unit" data-testid="kiosk-unit">
            {unit}
          </span>
          <dl className="foh-meter-stats">
            <div>
              <dt>Máximo RMS</dt>
              <dd data-testid="kiosk-peak">
                {hasReading ? (spl.reading.peak - offset).toFixed(1) : "—"}
              </dd>
            </div>
            <div>
              <dt>
                {spl.isCalibrated ? "Leq de captura" : "Promedio energético"}
              </dt>
              <dd data-testid="kiosk-leq">
                {hasReading ? (spl.reading.leq - offset).toFixed(1) : "—"}
              </dd>
            </div>
          </dl>
          <div className="foh-meter-actions">
            <button
              className={`audit-button ${running || spl.state === "starting" ? "meter-stop" : "workspace-primary"}`}
              data-testid="kiosk-spl-toggle"
              onClick={() =>
                running || spl.state === "starting"
                  ? spl.stop()
                  : void spl.start()
              }
            >
              {running || spl.state === "starting" ? (
                <Square size={16} />
              ) : (
                <Mic size={16} />
              )}
              {running
                ? "Detener micrófono"
                : spl.state === "starting"
                  ? "Cancelar"
                  : "Iniciar micrófono"}
            </button>
            <button
              className="audit-button"
              disabled={!hasReading}
              data-testid="kiosk-mark-btn"
              onClick={() =>
                setMarks((old) =>
                  [
                    {
                      id: crypto.randomUUID(),
                      time: timer,
                      value: displayValue,
                      unit,
                    },
                    ...old,
                  ].slice(0, 12),
                )
              }
            >
              <Flag size={16} /> Marcar nivel
            </button>
          </div>
          {spl.error && (
            <p className="meter-error" role="status">
              {spl.state === "denied"
                ? "Habilitá el permiso de micrófono en el navegador o sistema y volvé a iniciar."
                : spl.error}
            </p>
          )}
          <Link className="foh-back-link" to="/perform">
            Referencia y registro de sesiones <ArrowRight size={14} />
          </Link>
        </section>
        <section
          className="foh-console"
          aria-label="Referencias de salidas DSP"
        >
          <div className="workspace-section-heading">
            <div>
              <p className="project-eyebrow">
                {audit.dsp ? "PLAN DSP DEL PROYECTO" : "PROPUESTA SIN ACEPTAR"}
              </p>
              <h2>Referencia de salidas</h2>
            </div>
            <button
              className="app-icon-button"
              aria-label="Restablecer referencias de faders"
              disabled={
                !Object.keys(faders).length && !Object.keys(mutes).length
              }
              onClick={() => {
                setFaders({});
                setMutes({});
              }}
            >
              <RotateCcw size={17} />
            </button>
          </div>
          <p
            className="foh-reference-note"
            data-testid="kiosk-reference-notice"
          >
            Los faders son referencias visuales. No controlan el DSP físico ni
            cambian el plan guardado.
          </p>
          {outputs.length ? (
            <>
              <div className="foh-pagination">
                <span>
                  {currentPage * PAGE_SIZE + 1}–
                  {Math.min(outputs.length, (currentPage + 1) * PAGE_SIZE)} de{" "}
                  {outputs.length} salidas
                </span>
                <div>
                  <button
                    className="app-icon-button"
                    aria-label="Salidas anteriores"
                    disabled={currentPage === 0}
                    onClick={() => setPage(currentPage - 1)}
                  >
                    <ArrowLeft size={17} />
                  </button>
                  <button
                    className="app-icon-button"
                    aria-label="Salidas siguientes"
                    disabled={currentPage === pages - 1}
                    onClick={() => setPage(currentPage + 1)}
                  >
                    <ArrowRight size={17} />
                  </button>
                </div>
              </div>
              <div className="foh-faders" data-testid="kiosk-faders">
                {outputs
                  .slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE)
                  .map((output) => (
                    <Fader
                      key={output.id}
                      output={output}
                      value={faders[output.id] ?? output.gain}
                      muted={!!mutes[output.id]}
                      onChange={(value) =>
                        setFaders((old) => ({ ...old, [output.id]: value }))
                      }
                      onMute={() =>
                        setMutes((old) => ({
                          ...old,
                          [output.id]: !old[output.id],
                        }))
                      }
                    />
                  ))}
              </div>
              <Link className="foh-back-link" to="/design?step=dsp">
                <SlidersHorizontal size={14} /> Abrir plan DSP{" "}
                <ArrowRight size={14} />
              </Link>
            </>
          ) : (
            <div className="workspace-empty">
              <SlidersHorizontal size={28} />
              <h2>Sin salidas de referencia</h2>
              <p>
                Podés usar el medidor. Agregá el recinto y el equipo para
                disponer de un plan DSP.
              </p>
              <Link
                className="audit-button"
                to="/design?step=room"
                data-testid="kiosk-empty-cta"
              >
                Ir a diseño
              </Link>
            </div>
          )}
        </section>
        <section className="foh-marks" aria-label="Marcas de esta vista">
          <div className="workspace-section-heading">
            <div>
              <p className="project-eyebrow">NOTAS RÁPIDAS</p>
              <h2>Marcas de esta vista</h2>
            </div>
            <span className="workspace-tag">{marks.length} / 12</span>
          </div>
          {marks.length ? (
            <ul data-testid="kiosk-marks">
              {marks.map((mark) => (
                <li key={mark.id}>
                  <Flag size={14} />
                  <time>{mark.time}</time>
                  <strong>{mark.value.toFixed(1)}</strong>
                  <span>{mark.unit}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="workspace-note">
              Iniciá el micrófono y marcá un nivel para consultarlo durante esta
              visita.
            </p>
          )}
          <p className="workspace-note">
            Las marcas son temporales. Para conservar una sesión usá el registro
            de Medición.
          </p>
        </section>
      </main>
      {fullscreenError && (
        <p className="meter-error foh-fullscreen-error" role="status">
          {fullscreenError}
        </p>
      )}
    </div>
  );
}
