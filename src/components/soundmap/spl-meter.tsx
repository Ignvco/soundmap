// SPL Meter — Cinematic ring + LED bar + calibration + session recording
// Uses `useSPLMeter` for real-time microphone SPL estimation.
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, MicOff, RotateCcw, Sliders, Info, X, Play, Pause, Circle, Square, Download, FileText } from "lucide-react";
import { useSPLMeter } from "@/hooks/use-spl-meter.ts";
import { SessionRecorder, euComplianceLabel } from "@/lib/audio/session-recorder.ts";
import { feedback } from "@/lib/feedback.ts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

interface Props {
  className?: string;
  target?: number; // target SPL (dB) — usually PA engine's splTarget
}

const BAND_COLOR: Record<string, string> = {
  quiet:    "var(--info)",
  moderate: "var(--accent)",
  loud:     "var(--warning)",
  hot:      "var(--destructive)",
  clip:     "var(--destructive)",
};

const BAND_LABEL: Record<string, string> = {
  quiet:    "SILENCIO",
  moderate: "OK",
  loud:     "FUERTE",
  hot:      "MUY FUERTE",
  clip:     "PICO",
};

export function SPLMeter({ className, target }: Props) {
  const { state, error, reading, calibrationOffset, isCalibrated, start, stop, calibrate, setCalibrationOffset, resetLeq } = useSPLMeter();
  const [showCalib, setShowCalib] = useState(false);

  // ── Session recording ───────────────────────────────────────────────────
  const recorderRef = useRef(new SessionRecorder());
  const [recording, setRecording] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [recTick, setRecTick] = useState(0);

  // Push each SPL reading into the recorder while recording is active.
  // We keep recTick updates throttled to ~1 Hz (whenever the integer second
  // changes) so long sessions don't trigger thousands of React re-renders.
  useEffect(() => {
    if (recording && state === "running") {
      recorderRef.current.push(reading.spl, reading.peak);
      const nowSec = Math.floor(recorderRef.current.summary().durationSec);
      setRecTick((prev) => (prev === nowSec ? prev : nowSec));
    }
  }, [reading.spl, reading.peak, recording, state]);

  const toggleRecording = () => {
    if (recording) {
      recorderRef.current.stop();
      setRecording(false);
      feedback("select");
      // Show summary if we captured anything
      if (recorderRef.current.sampleCount > 0) setSummaryOpen(true);
    } else {
      if (state !== "running") {
        toast.info("Activá el micrófono antes de grabar la sesión.");
        return;
      }
      recorderRef.current.start();
      setRecording(true);
      feedback("success");
      toast.success("Grabando sesión…");
    }
  };

  /** Cabecera de procedencia. Un archivo sin ella parece una medición trazable. */
  const provenanceHeader = () =>
    [
      `# SoundMap — sesión de nivel sonoro`,
      `# Exportado: ${new Date().toISOString()}`,
      `# Offset de calibración: ${calibrationOffset.toFixed(1)} dB`,
      isCalibrated
        ? `# Micrófono calibrado por el usuario contra una referencia.`
        : `# ADVERTENCIA: micrófono SIN CALIBRAR. Los niveles absolutos no son`,
      isCalibrated
        ? `# Aun así, un teléfono no es un sonómetro Clase 1 ni 2.`
        : `# trazables y NO sirven como documentación de cumplimiento normativo.`,
      ``,
    ].join("\n");

  const exportCsv = () => {
    const csv = provenanceHeader() + recorderRef.current.toCSV();
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundmap-session-${new Date().toISOString().replace(/[:.]/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    feedback("select");
  };

  const exportJson = () => {
    const parsed = JSON.parse(recorderRef.current.toJSON());
    const json = JSON.stringify(
      {
        _meta: {
          exportedAt: new Date().toISOString(),
          calibrationOffsetDb: Math.round(calibrationOffset * 10) / 10,
          calibrated: isCalibrated,
          disclaimer: isCalibrated
            ? "Calibrado por el usuario. Un teléfono no es un sonómetro Clase 1 ni 2."
            : "Micrófono SIN CALIBRAR: los niveles absolutos no son trazables y no sirven como documentación de cumplimiento normativo.",
        },
        ...parsed,
      },
      null,
      2,
    );
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundmap-session-${new Date().toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    feedback("select");
  };

  // Live-updated summary while recording — recTick ensures re-render
  const liveSummary = recording ? recorderRef.current.summary() : null;
  void recTick; // eslint pacifier

  const isRunning = state === "running";
  const bandColor = BAND_COLOR[reading.band] ?? "var(--info)";
  const bandLabel = BAND_LABEL[reading.band] ?? "—";

  // Ring maths: 40–120 dB range → 0..1 progress
  const minDb = 40;
  const maxDb = 120;
  const ringProgress = Math.max(0, Math.min(1, (reading.spl - minDb) / (maxDb - minDb)));
  const peakProgress = Math.max(0, Math.min(1, (reading.peak - minDb) / (maxDb - minDb)));

  // Ring geometry
  const size = 220;
  const stroke = 14;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - c * ringProgress;
  const peakAngle = 360 * peakProgress - 90;
  const peakRad = (peakAngle * Math.PI) / 180;
  const peakX = size / 2 + r * Math.cos(peakRad);
  const peakY = size / 2 + r * Math.sin(peakRad);

  return (
    <div className={cn("relative", className)}>
      <div className="rounded-3xl border border-border bg-card p-5 pt-6 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">
              SPL Meter · Micrófono
            </p>
            <p className="text-[10px] text-muted-foreground/60 mt-0.5 font-mono">
              A-weighted · calib {calibrationOffset.toFixed(1)} dB
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => { feedback("tap"); setShowCalib(true); }}
              disabled={!isRunning}
              data-testid="spl-calibrate-btn"
              className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center hover:border-info/40 hover:text-info disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            >
              <Sliders size={13} />
            </button>
            <button
              onClick={() => {
                feedback(isRunning ? "warning" : "success");
                if (isRunning) stop();
                else start();
              }}
              data-testid="spl-toggle-btn"
              className={cn(
                "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11px] font-medium uppercase tracking-[0.2em] cursor-pointer transition-all",
                isRunning
                  ? "bg-destructive/12 border border-destructive/30 text-destructive hover:bg-destructive/20"
                  : "bg-accent text-accent-foreground shadow-[0_4px_18px_rgba(0,255,158,0.35)] hover:brightness-110"
              )}
            >
              {isRunning ? <><Pause size={11} /> Stop</> : <><Play size={11} /> Iniciar</>}
            </button>
          </div>
        </div>

        {/* Ring + Center readout */}
        <div className="flex flex-col items-center">
          <div className="relative" style={{ width: size, height: size }}>
            {/* Glow behind ring when hot */}
            {isRunning && (reading.band === "hot" || reading.band === "clip") && (
              <motion.div
                className="absolute inset-0 rounded-full"
                initial={{ opacity: 0 }}
                animate={{ opacity: [0.25, 0.55, 0.25] }}
                transition={{ duration: 1, repeat: Infinity }}
                style={{ boxShadow: `0 0 60px ${bandColor}` }}
              />
            )}
            <svg width={size} height={size} className="relative z-10">
              <defs>
                <linearGradient id="spl-ring-grad" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="var(--info)" />
                  <stop offset="45%" stopColor="var(--accent)" />
                  <stop offset="72%" stopColor="var(--warning)" />
                  <stop offset="90%" stopColor="var(--destructive)" />
                  <stop offset="100%" stopColor="var(--destructive)" />
                </linearGradient>
              </defs>
              {/* Track */}
              <circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth={stroke}
              />
              {/* Progress */}
              <motion.circle
                cx={size / 2} cy={size / 2} r={r}
                fill="none"
                stroke="url(#spl-ring-grad)"
                strokeWidth={stroke}
                strokeLinecap="round"
                strokeDasharray={c}
                strokeDashoffset={dashOffset}
                transform={`rotate(-90 ${size / 2} ${size / 2})`}
                animate={{ strokeDashoffset: dashOffset }}
                transition={{ duration: 0.08 }}
                style={{ filter: isRunning ? `drop-shadow(0 0 6px ${bandColor}aa)` : "none" }}
              />
              {/* Peak marker */}
              {isRunning && reading.peak > 0 && (
                <circle
                  cx={peakX}
                  cy={peakY}
                  r={5}
                  fill={bandColor}
                  stroke="var(--background)"
                  strokeWidth={2}
                />
              )}
              {/* Target marker (if provided) */}
              {typeof target === "number" && target >= minDb && target <= maxDb && (
                <g>
                  {(() => {
                    const tp = (target - minDb) / (maxDb - minDb);
                    const angle = (360 * tp - 90) * Math.PI / 180;
                    const x1 = size / 2 + (r - stroke / 2) * Math.cos(angle);
                    const y1 = size / 2 + (r - stroke / 2) * Math.sin(angle);
                    const x2 = size / 2 + (r + stroke / 2) * Math.cos(angle);
                    const y2 = size / 2 + (r + stroke / 2) * Math.sin(angle);
                    return <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(255,255,255,0.85)" strokeWidth={2} strokeLinecap="round" />;
                  })()}
                </g>
              )}
            </svg>
            {/* Center readout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              {!isRunning && state !== "starting" && (
                <>
                  <MicOff size={30} className="text-muted-foreground mb-2" />
                  <span
                    className="text-4xl font-medium tabular-nums font-mono leading-none text-muted-foreground/50"
                    data-testid="spl-value"
                  >
                    —
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mt-1">
                    {state === "denied" ? "Permiso denegado" : "Micrófono apagado"}
                  </span>
                </>
              )}
              {state === "starting" && (
                <>
                  <Mic size={28} className="text-info animate-pulse mb-2" />
                  <span
                    className="text-4xl font-medium tabular-nums font-mono leading-none text-info/60"
                    data-testid="spl-value"
                  >
                    …
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-info mt-1">Iniciando…</span>
                </>
              )}
              {isRunning && (
                <>
                  <span
                    className="text-6xl font-medium tabular-nums font-mono leading-none"
                    style={{ color: bandColor, textShadow: `0 0 24px ${bandColor}55` }}
                    data-testid="spl-value"
                  >
                    {reading.spl.toFixed(0)}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground mt-1">dB(A)</span>
                  <div
                    className="mt-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em] border"
                    style={{ background: `${bandColor}18`, borderColor: `${bandColor}40`, color: bandColor }}
                  >
                    {bandLabel}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-2 w-full mt-4 pt-4 border-t border-border">
            <Stat label="Peak" value={isRunning ? reading.peak.toFixed(1) : "—"} unit="dB" color="var(--warning)" />
            <Stat label="Leq" value={isRunning ? reading.leq.toFixed(1) : "—"} unit="dB" color="var(--info)" />
            <Stat
              label="Target"
              value={typeof target === "number" ? target.toString() : "—"}
              unit="dB"
              color="var(--foreground)"
              extra={
                isRunning && typeof target === "number" ? (
                  <span
                    className="text-[9px] font-medium mt-0.5 font-mono"
                    style={{ color: reading.spl > target ? "var(--destructive)" : "var(--accent)" }}
                  >
                    {reading.spl > target ? "+" : ""}{(reading.spl - target).toFixed(1)}
                  </span>
                ) : null
              }
            />
          </div>

          {isRunning && (
            <div className="mt-3 flex items-center justify-center gap-3">
              <button
                onClick={() => { feedback("tap"); resetLeq(); }}
                data-testid="spl-reset-leq"
                className="inline-flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-info transition-colors cursor-pointer uppercase tracking-[0.2em]"
              >
                <RotateCcw size={10} /> Reset Leq
              </button>
              <button
                onClick={toggleRecording}
                data-testid="session-rec-btn"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 border text-[10px] font-medium uppercase tracking-[0.28em] cursor-pointer active:scale-95 transition-all",
                  recording
                    ? "bg-destructive/15 border-destructive/50 text-destructive shadow-[0_0_12px_rgba(255,77,109,0.35)]"
                    : "bg-secondary/60 border-border text-muted-foreground hover:text-destructive hover:border-destructive/40"
                )}
              >
                {recording ? <><Square size={9} className="fill-current" /> STOP</> : <><Circle size={9} className="fill-current" /> REC</>}
              </button>
            </div>
          )}

          {/* Live recording indicator */}
          {recording && liveSummary && (
            <div
              className="mt-2 rounded-xl border border-destructive/30 bg-destructive/8 px-3 py-1.5 flex items-center justify-between gap-3"
              data-testid="session-live-indicator"
            >
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" />
                <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-destructive">REC</span>
                <span className="text-[10px] font-mono tabular-nums text-foreground" data-testid="session-duration">
                  {formatDuration(liveSummary.durationSec)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[9px] font-mono tabular-nums">
                <span className="text-muted-foreground">Leq <span className="font-medium text-foreground">{liveSummary.leq}</span></span>
                <span className="text-muted-foreground">n <span className="font-medium text-foreground">{liveSummary.samples}</span></span>
              </div>
            </div>
          )}

          {error && (
            <p className="text-[11px] text-destructive mt-3 text-center leading-snug" data-testid="spl-error">
              {error}
              {state === "denied" && " Aceptá el permiso desde ajustes del navegador/sistema."}
            </p>
          )}
        </div>
      </div>

      {/* Calibration modal */}
      <AnimatePresence>
        {showCalib && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-4"
            onClick={() => setShowCalib(false)}
            data-testid="spl-calib-overlay"
          >
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", damping: 24, stiffness: 260 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-3xl bg-card border border-border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-2xl bg-info/12 flex items-center justify-center">
                    <Sliders size={14} className="text-info" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">Calibración</p>
                    <p className="text-[10px] text-muted-foreground">Ajustá el offset con una fuente conocida</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowCalib(false)}
                  data-testid="spl-calib-close"
                  className="h-8 w-8 rounded-full bg-secondary border border-border flex items-center justify-center cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>

              <div className="rounded-2xl bg-secondary/50 border border-border p-3 mb-4">
                <div className="flex items-start gap-2">
                  <Info size={12} className="text-info mt-0.5 shrink-0" />
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Con una fuente de referencia estable (por ej. un pistonfono de <span className="text-info font-bold">94 dB</span> o un SPL meter Class-2), presioná el botón cuando el valor mostrado sea estable.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mb-3">
                {[80, 94, 100].map(v => (
                  <button
                    key={v}
                    onClick={() => { feedback("select"); calibrate(v); }}
                    data-testid={`spl-calib-preset-${v}`}
                    className="rounded-2xl border border-border bg-secondary hover:border-info/40 hover:text-info py-3 text-sm font-medium text-foreground cursor-pointer transition-all"
                  >
                    {v} <span className="text-[10px] text-muted-foreground">dB</span>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl bg-secondary/40 border border-border p-3">
                <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-2">Offset manual</p>
                <input
                  type="range"
                  min={70}
                  max={130}
                  step={0.5}
                  value={calibrationOffset}
                  onChange={(e) => setCalibrationOffset(parseFloat(e.target.value))}
                  data-testid="spl-calib-slider"
                  className="w-full accent-info"
                />
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mt-1">
                  <span>70</span>
                  <span className="text-info font-medium">{calibrationOffset.toFixed(1)} dB</span>
                  <span>130</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session summary modal */}
      <SessionSummaryModal
        open={summaryOpen}
        recorder={recorderRef.current}
        isCalibrated={isCalibrated}
        onClose={() => setSummaryOpen(false)}
        onExportCsv={exportCsv}
        onExportJson={exportJson}
        onClear={() => { recorderRef.current.clear(); setSummaryOpen(false); }}
      />
    </div>
  );
}

function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function SessionSummaryModal({
  open, recorder, isCalibrated, onClose, onExportCsv, onExportJson, onClear,
}: {
  open: boolean;
  recorder: SessionRecorder;
  isCalibrated: boolean;
  onClose: () => void;
  onExportCsv: () => void;
  onExportJson: () => void;
  onClear: () => void;
}) {
  if (!open) return null;
  const s = recorder.summary();
  const compliance = euComplianceLabel(s.euCompliance);
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end md:items-center justify-center p-4"
        onClick={onClose}
        data-testid="session-summary-overlay"
      >
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 240 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md rounded-3xl bg-card border border-border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)] max-h-[85vh] overflow-y-auto"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-2xl bg-destructive/12 border border-destructive/25 flex items-center justify-center">
                <FileText size={16} className="text-destructive" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">Sesión finalizada</p>
                <p className="text-[10px] text-muted-foreground">{s.samples} muestras · {formatDuration(s.durationSec)}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="session-summary-close"
              className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center cursor-pointer active:scale-90"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-3">
            <SumStat label="Leq" value={`${s.leq}`} unit="dB" color="var(--info)" testId="summary-leq" />
            <SumStat label="Peak" value={`${s.peak}`} unit="dB" color="var(--warning)" testId="summary-peak" />
            <SumStat label="LEX,8h" value={`${s.lex8h}`} unit="dB" color={compliance.color} testId="summary-lex8h" />
          </div>

          <div
            className="rounded-2xl border p-3 mb-3"
            style={{ borderColor: `${compliance.color}55`, background: `${compliance.color}12` }}
            data-testid="summary-compliance"
          >
            <p className="text-[10px] font-medium uppercase tracking-[0.28em]" style={{ color: compliance.color }}>
              EU 2003/10/EC
            </p>
            <p className="text-sm font-bold text-foreground mt-0.5">{compliance.label}</p>
            {/* El cálculo de LEX,8h es correcto, pero parte del SPL que mide el
                micrófono del teléfono. Sin calibrar contra una fuente conocida,
                el valor absoluto puede estar varios dB corrido — suficiente para
                cruzar un umbral de la directiva en cualquier dirección. Decirlo
                es obligatorio: si no, esto parece un documento de cumplimiento. */}
            {!isCalibrated && (
              <p className="text-[10px] leading-snug mt-2" style={{ color: "var(--sm-amber)" }}>
                ⚠ Micrófono sin calibrar. El nivel absoluto no es trazable: usalo
                como referencia, no como documentación. Calibrá contra una fuente
                conocida (94 dB) desde los ajustes del medidor.
              </p>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2 mb-4">
            <SumStat label=">85 dB" value={`${s.timeAbove85.toFixed(0)}`} unit="s" color="var(--warning)" testId="summary-t85" />
            <SumStat label=">90 dB" value={`${s.timeAbove90.toFixed(0)}`} unit="s" color="var(--sm-warm)" testId="summary-t90" />
            <SumStat label=">95 dB" value={`${s.timeAbove95.toFixed(0)}`} unit="s" color="var(--destructive)" testId="summary-t95" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={onExportCsv}
              data-testid="session-export-csv"
              className="flex items-center justify-center gap-1.5 rounded-full bg-accent/12 border border-accent/30 py-2.5 text-xs font-medium text-accent hover:bg-accent/20 cursor-pointer active:scale-[0.98] uppercase tracking-[0.2em]"
            >
              <Download size={12} /> CSV
            </button>
            <button
              onClick={onExportJson}
              data-testid="session-export-json"
              className="flex items-center justify-center gap-1.5 rounded-full bg-info/12 border border-info/30 py-2.5 text-xs font-medium text-info hover:bg-info/20 cursor-pointer active:scale-[0.98] uppercase tracking-[0.2em]"
            >
              <Download size={12} /> JSON
            </button>
          </div>
          <button
            onClick={onClear}
            data-testid="session-clear"
            className="w-full mt-2 py-2 text-[10px] font-bold text-muted-foreground hover:text-destructive uppercase tracking-[0.28em] cursor-pointer"
          >
            Descartar sesión
          </button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function SumStat({ label, value, unit, color, testId }: { label: string; value: string; unit: string; color: string; testId?: string }) {
  return (
    <div className="rounded-xl bg-secondary/50 border border-border p-2 text-center" data-testid={testId}>
      <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="text-base font-medium font-mono tabular-nums leading-none mt-1" style={{ color }}>
        {value}<span className="text-[9px] text-muted-foreground ml-0.5">{unit}</span>
      </p>
    </div>
  );
}

function Stat({ label, value, unit, color, extra }: { label: string; value: string; unit: string; color: string; extra?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-0.5">{label}</p>
      <div className="flex items-baseline gap-0.5">
        <span className="text-lg font-medium font-mono tabular-nums" style={{ color }}>{value}</span>
        <span className="text-[9px] text-muted-foreground">{unit}</span>
      </div>
      {extra}
    </div>
  );
}
