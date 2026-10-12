import { captureService } from "@/lib/audio/capture-service";
import { useSPLMeter } from "@/hooks/use-spl-meter";
import { SessionRecorder } from "@/lib/audio/session-recorder";
import { useAppStore } from "@/store/app";
import { feedback } from "@/lib/feedback";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Circle,
  Download,
  FileText,
  Mic,
  RotateCcw,
  SlidersHorizontal,
  Square,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

type SessionContext = {
  offset: number;
  calibrated: boolean;
  device: string;
  sampleRate: number;
  reference?: number;
  attachedToRoom: boolean;
};

function durationLabel(seconds: number) {
  return [
    Math.floor(seconds / 3600),
    Math.floor(seconds / 60) % 60,
    Math.floor(seconds) % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
}

/** Presentation and session controls. Acquisition and acoustic calculations stay in the existing services. */
export function SPLMeter({
  className,
  target,
  variant = "instrument",
  headroomDb,
}: {
  className?: string;
  variant?: "ring" | "instrument";
  target?: number;
  headroomDb?: number;
}) {
  const mic = useSPLMeter();
  const hasRoom = useAppStore((s) => !!s.room);
  const [showCalib, setShowCalib] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [recorder] = useState(() => new SessionRecorder());
  const [recording, setRecording] = useState(false);
  const [recTick, setRecTick] = useState(0);
  const [sessionContext, setSessionContext] = useState<SessionContext | null>(
    null,
  );
  const [reference, setReference] = useState("94");
  const running = mic.state === "running";
  const hasReading = running && mic.reading.timestamp > 0;
  const calibrated = mic.isCalibrated;
  const unit = calibrated ? "dB(A) estimado" : "dBFS · A digital";
  const value = calibrated ? mic.reading.spl : mic.reading.dbfs;
  const offset = calibrated ? 0 : mic.calibrationOffset;
  const tone = hasReading && mic.reading.band === "clip" ? "clip" : "normal";
  const progress = Math.max(
    0,
    Math.min(
      100,
      calibrated ? ((value - 40) / 80) * 100 : ((value + 80) / 80) * 100,
    ),
  );
  const status = {
    idle: "Micrófono detenido",
    starting: "Solicitando micrófono",
    running: "Captura activa",
    denied: "Permiso bloqueado",
    error: "Captura no disponible",
  }[mic.state];

  useEffect(
    () =>
      captureService.subscribeSamples((sample, duration) => {
        if (!recorder.isRecording()) return;
        recorder.push(sample.rms, sample.rms, duration);
        setRecTick(Math.floor(recorder.summary().durationSec));
      }),
    [recorder],
  );
  useEffect(() => {
    if (
      recording &&
      (!running ||
        mic.calibrationOffset !== sessionContext?.offset ||
        calibrated !== sessionContext?.calibrated)
    ) {
      recorder.stop();
      captureService.finishMeasurement();
      setRecording(false);
      if (recorder.sampleCount) setSummaryOpen(!showCalib);
    }
  }, [
    running,
    recording,
    mic.calibrationOffset,
    calibrated,
    sessionContext,
    recorder,
    showCalib,
  ]);
  // Navigation closes the local recording; the shared microphone remains available in the next view.
  useEffect(
    () => () => {
      if (recorder.isRecording()) {
        recorder.stop();
        captureService.finishMeasurement();
      }
    },
    [recorder],
  );

  const toggleRecording = () => {
    feedback("select", { sound: false });
    if (recording) {
      recorder.stop();
      captureService.finishMeasurement();
      setRecording(false);
      if (recorder.sampleCount) setSummaryOpen(true);
    } else if (hasReading) {
      setSessionContext({
        offset: mic.calibrationOffset,
        calibrated,
        device: mic.device,
        sampleRate: mic.sampleRate,
        reference: mic.profile?.referenceDb,
        attachedToRoom: hasRoom,
      });
      recorder.start();
      captureService.startMeasurement();
      setRecTick(0);
      setRecording(true);
    }
  };
  const closeRecordForReference = () => {
    if (!recorder.isRecording()) return;
    recorder.stop();
    captureService.finishMeasurement();
    setRecording(false);
  };
  const summary = recorder.summary();
  const hasSession = !!sessionContext && recorder.sampleCount > 0;
  const sessionOffset = sessionContext?.calibrated
    ? 0
    : (sessionContext?.offset ?? 0);
  const sessionUnit = sessionContext?.calibrated
    ? "dB(A) estimado"
    : "dBFS · A digital";
  void recTick;

  const exportSession = (kind: "csv" | "json") => {
    if (!sessionContext || !hasSession) return;
    // Preserve the recorder format, with the provenance captured at record start.
    const meta = {
      exportedAt: new Date().toISOString(),
      calibrationOffsetDb: sessionContext.offset,
      calibrated: sessionContext.calibrated,
      device: sessionContext.device,
      sampleRate: sessionContext.sampleRate,
      referenceDb: sessionContext.reference,
      unit: sessionContext.calibrated
        ? "dB(A) estimado"
        : "dBFS ponderado + offset orientativo",
      disclaimer:
        "Registro orientativo. No certifica exposición ni cumplimiento normativo. Peak en el formato del registrador representa máximo RMS, no pico acústico.",
    };
    const data =
      kind === "json"
        ? JSON.stringify(
            { _meta: meta, ...JSON.parse(recorder.toJSON()) },
            null,
            2,
          )
        : [
            "# SoundMap — registro de nivel",
            `# Exportado: ${meta.exportedAt}`,
            `# Unidad: ${meta.unit}`,
            `# Offset: ${meta.calibrationOffsetDb} dB`,
            `# Referencia declarada: ${meta.calibrated ? meta.referenceDb + " dB" : "sin referencia válida"}`,
            `# ${meta.disclaimer}`,
            recorder.toCSV(),
          ].join("\n");
    const url = URL.createObjectURL(
      new Blob([data], {
        type: kind === "csv" ? "text/csv;charset=utf-8" : "application/json",
      }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundmap-session-${summary.startedAt.replace(/[:.]/g, "-")}.${kind}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section
      className={cn(
        "workspace-card glow-meter",
        variant === "instrument" && "glow-meter-instrument",
        className,
      )}
      data-testid="spl-meter"
      data-tone={tone}
    >
      <div className="workspace-section-heading meter-heading">
        <div>
          <p className="project-eyebrow">ENTRADA DE MICRÓFONO</p>
          <h2>Nivel en vivo</h2>
        </div>
        <span className="workspace-tag">
          {calibrated ? "Con referencia" : "Sin referencia"}
        </span>
      </div>
      <div className="meter-status" role="status" data-state={mic.state}>
        <span />
        {status}
      </div>
      <div className="meter-main-actions">
        <button
          className={cn(
            "audit-button",
            running || mic.state === "starting"
              ? "meter-stop"
              : "workspace-primary",
          )}
          data-testid="spl-toggle-btn"
          aria-label={
            running
              ? "Detener micrófono"
              : mic.state === "starting"
                ? "Cancelar inicio del micrófono"
                : "Iniciar micrófono"
          }
          onClick={() =>
            running || mic.state === "starting" ? mic.stop() : void mic.start()
          }
        >
          {running || mic.state === "starting" ? (
            <Square size={15} />
          ) : (
            <Mic size={15} />
          )}
          {running
            ? "Detener"
            : mic.state === "starting"
              ? "Cancelar"
              : "Iniciar"}
        </button>
        <Dialog open={showCalib} onOpenChange={setShowCalib}>
          <DialogTrigger asChild>
            <button
              className="audit-button"
              disabled={!hasReading}
              data-testid="spl-calibrate-btn"
              aria-label="Calibrar micrófono"
            >
              <SlidersHorizontal size={15} />
              <span>Referencia</span>
            </button>
          </DialogTrigger>
          <DialogContent
            className="glow-capture-dialog"
            showCloseButton={false}
            data-testid="spl-calib-overlay"
          >
            <div className="capture-dialog-heading">
              <div>
                <p className="project-eyebrow">ENTRADA / REFERENCIA</p>
                <DialogTitle>Calibrar micrófono</DialogTitle>
              </div>
              <button
                className="app-icon-button"
                aria-label="Cerrar calibración"
                data-testid="spl-calib-close"
                onClick={() => setShowCalib(false)}
              >
                <X size={18} />
              </button>
            </div>
            <DialogDescription>
              Usá una fuente o un instrumento de referencia estable. El valor
              debe corresponder al nivel externo conocido.
            </DialogDescription>
            <div className="meter-reference-state">
              <span>
                {calibrated ? "Referencia aplicada" : "Sin referencia válida"}
              </span>
              <strong>
                {calibrated ? `${mic.profile?.referenceDb} dB` : "—"}
              </strong>
              <small>
                {mic.device || "Micrófono"} ·{" "}
                {mic.sampleRate
                  ? `${mic.sampleRate / 1000} kHz`
                  : "Sin captura"}
              </small>
            </div>
            <label className="capture-field">
              Nivel de referencia externo (dB)
              <input
                className="audit-input"
                aria-label="Nivel de referencia externo"
                type="number"
                min={40}
                max={140}
                step={0.1}
                value={reference}
                onChange={(e) => setReference(e.target.value)}
              />
            </label>
            <div className="capture-presets" aria-label="Valores de referencia">
              {[80, 94, 100].map((n) => (
                <button
                  className="audit-button"
                  key={n}
                  aria-pressed={reference === String(n)}
                  data-testid={`spl-calib-preset-${n}`}
                  onClick={() => setReference(String(n))}
                >
                  {n} dB
                </button>
              ))}
            </div>
            <button
              className="audit-button workspace-primary"
              data-testid="spl-calib-apply"
              disabled={
                !hasReading ||
                mic.reading.band === "clip" ||
                !reference.trim() ||
                !Number.isFinite(Number(reference)) ||
                Number(reference) < 40 ||
                Number(reference) > 140
              }
              onClick={() => {
                closeRecordForReference();
                mic.calibrate(Number(reference));
              }}
            >
              Aplicar referencia
            </button>
            <p className="workspace-note">
              Mantener la ganancia y el dispositivo. Aplicar una referencia
              cierra el registro activo y reinicia el promedio.
            </p>
            {mic.error && <p className="meter-error">{mic.error}</p>}
            <details className="meter-manual-offset">
              <summary>Ajuste manual del offset</summary>
              <label className="capture-field">
                Offset (dB)
                <input
                  className="audit-input"
                  type="number"
                  aria-label="Offset manual"
                  min={0}
                  max={200}
                  step={0.5}
                  value={Number(mic.calibrationOffset.toFixed(1))}
                  onChange={(e) => {
                    if (e.target.value.trim()) {
                      closeRecordForReference();
                      mic.setCalibrationOffset(Number(e.target.value));
                    }
                  }}
                  data-testid="spl-calib-slider"
                />
              </label>
              <p className="workspace-note">
                El ajuste manual deja la captura sin referencia válida.
              </p>
            </details>
          </DialogContent>
        </Dialog>
      </div>
      <div className="meter-readout" data-testid="perform-live-spl">
        <p data-testid="spl-value">{hasReading ? value.toFixed(1) : "—"}</p>
        <span data-testid="spl-unit">{unit}</span>
      </div>
      <div className="meter-level-track" aria-hidden="true">
        <span style={{ width: hasReading ? `${progress}%` : "0%" }} />
      </div>
      <div className="meter-level-scale" aria-hidden="true">
        {(calibrated ? [40, 60, 80, 100, 120] : [-80, -60, -40, -20, 0]).map(
          (n) => (
            <span key={n}>{n}</span>
          ),
        )}
      </div>
      <p className="workspace-note meter-reading-note">
        {calibrated
          ? "FAST · ponderación A digital · referencia declarada por el técnico"
          : "RMS digital. Para estimar SPL, registrá una referencia externa."}
      </p>
      {tone === "clip" && (
        <p className="meter-error" role="status">
          Saturación de entrada detectada.
        </p>
      )}
      <dl className="meter-stats">
        <div>
          <dt>Máximo RMS</dt>
          <dd data-testid="spl-max-rms">
            {hasReading ? (mic.reading.peak - offset).toFixed(1) : "—"}
          </dd>
        </div>
        <div>
          <dt>{calibrated ? "Leq de captura" : "Promedio energético"}</dt>
          <dd data-testid="spl-leq">
            {hasReading ? (mic.reading.leq - offset).toFixed(1) : "—"}
          </dd>
        </div>
        <div>
          <dt>
            {headroomDb != null
              ? "Margen PA estimado"
              : "Objetivo del proyecto"}
          </dt>
          <dd>
            {headroomDb != null
              ? `${headroomDb > 0 ? "+" : ""}${headroomDb.toFixed(1)}`
              : (target ?? "—")}
            <small> dB</small>
          </dd>
        </div>
      </dl>

      {mic.error && (
        <p className="meter-error" role="status" data-testid="spl-error">
          {mic.state === "denied"
            ? "Permiso de micrófono bloqueado. Habilitalo en los ajustes del navegador o del sistema y volvé a iniciar."
            : mic.error}
        </p>
      )}
      <div className="meter-record-section">
        <div className="meter-record-heading">
          <span>Registro de sesión</span>
          {recording && (
            <span
              className="meter-recording"
              data-testid="session-live-indicator"
            >
              REC{" "}
              <span data-testid="session-duration">
                {durationLabel(summary.durationSec)}
              </span>
            </span>
          )}
        </div>
        <div className="meter-record-actions">
          <button
            className="audit-button"
            data-testid="session-rec-btn"
            disabled={!hasReading && !recording}
            aria-pressed={recording}
            onClick={toggleRecording}
          >
            {recording ? <Square size={14} /> : <Circle size={14} />}
            {recording ? "Finalizar registro" : "Grabar sesión"}
          </button>
          <button
            className="audit-button"
            data-testid="spl-reset-leq"
            disabled={!hasReading || recording}
            onClick={mic.resetLeq}
          >
            <RotateCcw size={14} /> Reiniciar promedio
          </button>
          {hasSession && !recording && (
            <button
              className="audit-button"
              data-testid="session-open-summary"
              onClick={() => setSummaryOpen(true)}
            >
              <FileText size={14} /> Ver resumen
            </button>
          )}
        </div>
        <p className="workspace-note">
          {hasRoom
            ? "El registro se agrega al expediente al finalizar. Al cambiar de vista se cierra el registro; el micrófono sigue activo."
            : "Sin recinto, el registro queda disponible para exportar mientras permanezcas en esta vista."}
        </p>
      </div>
      <details className="meter-source-details">
        <summary>Entrada y perfil</summary>
        <dl>
          <div>
            <dt>Dispositivo</dt>
            <dd>{mic.device || "Pendiente de iniciar"}</dd>
          </div>
          <div>
            <dt>Frecuencia de muestreo</dt>
            <dd>{mic.sampleRate ? `${mic.sampleRate / 1000} kHz` : "—"}</dd>
          </div>
          <div>
            <dt>Referencia</dt>
            <dd>
              {calibrated && mic.profile
                ? `${mic.profile.referenceDb} dB`
                : "Sin referencia válida"}
            </dd>
          </div>
        </dl>
      </details>
      <Dialog open={summaryOpen && hasSession} onOpenChange={setSummaryOpen}>
        <DialogContent
          className="glow-capture-dialog"
          showCloseButton={false}
          data-testid="session-summary-overlay"
        >
          <div className="capture-dialog-heading">
            <div>
              <p className="project-eyebrow">REGISTRO FINALIZADO</p>
              <DialogTitle>Resumen de sesión</DialogTitle>
            </div>
            <button
              className="app-icon-button"
              aria-label="Cerrar resumen de sesión"
              data-testid="session-summary-close"
              onClick={() => setSummaryOpen(false)}
            >
              <X size={18} />
            </button>
          </div>
          <DialogDescription>
            {durationLabel(summary.durationSec)} · {summary.samples} muestras ·{" "}
            {sessionUnit}
          </DialogDescription>
          <dl className="capture-summary-metrics">
            <div>
              <dt>
                {sessionContext?.calibrated ? "Leq" : "Promedio energético"}
              </dt>
              <dd data-testid="summary-leq">
                {(summary.leq - sessionOffset).toFixed(1)}
              </dd>
            </div>
            <div>
              <dt>Máximo RMS</dt>
              <dd data-testid="summary-peak">
                {(summary.peak - sessionOffset).toFixed(1)}
              </dd>
            </div>
            <div>
              <dt>Mínimo RMS</dt>
              <dd>{(summary.min - sessionOffset).toFixed(1)}</dd>
            </div>
          </dl>
          <p className="workspace-note">
            {sessionContext?.calibrated
              ? "Estimación con referencia declarada. El registro no certifica exposición ni cumplimiento normativo."
              : "Sin referencia externa: los valores de pantalla son digitales. Los archivos conservan el offset orientativo y su procedencia."}
          </p>
          <p className="workspace-note">
            {sessionContext?.attachedToRoom
              ? "Registro agregado al expediente del proyecto."
              : "Registro local de esta vista. Exportalo antes de salir."}
          </p>
          {sessionContext?.calibrated && (
            <details className="workspace-disclosure">
              <summary>Estadísticas orientativas</summary>
              <div>
                <dl className="analysis-facts">
                  <div>
                    <dt>LEX,8h calculado</dt>
                    <dd data-testid="summary-lex8h">{summary.lex8h} dB</dd>
                  </div>
                  {([85, 90, 95] as const).map((n) => (
                    <div key={n}>
                      <dt>Tiempo sobre {n} dB</dt>
                      <dd data-testid={`summary-t${n}`}>
                        {summary[`timeAbove${n}`].toFixed(1)} s
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </details>
          )}
          <div className="capture-export-actions">
            <button
              className="audit-button workspace-primary"
              data-testid="session-export-csv"
              onClick={() => exportSession("csv")}
            >
              <Download size={15} /> CSV
            </button>
            <button
              className="audit-button"
              data-testid="session-export-json"
              onClick={() => exportSession("json")}
            >
              <Download size={15} /> JSON
            </button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}
