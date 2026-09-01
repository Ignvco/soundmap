// RT60 Measurement modal — one-tap real-world reverberation capture
import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Mic, X, Waves, Info, Check, AlertTriangle, RotateCcw } from "lucide-react";
import { measureRT60, type RT60Progress, type RT60MeasurementHandle } from "@/lib/audio/rt60-measure.ts";
import { feedback } from "@/lib/feedback.ts";
import { cn } from "@/lib/utils.ts";

interface Props {
  open: boolean;
  onClose: () => void;
  onApply: (rt60: number) => void;
}

export function RT60Modal({ open, onClose, onApply }: Props) {
  const [progress, setProgress] = useState<RT60Progress>({ phase: "idle" });
  const handleRef = useRef<RT60MeasurementHandle | null>(null);

  useEffect(() => {
    if (!open) {
      handleRef.current?.cancel();
      handleRef.current = null;
      setProgress({ phase: "idle" });
    }
  }, [open]);

  const start = () => {
    feedback("scan");
    handleRef.current = measureRT60((p) => {
      setProgress(p);
      if (p.phase === "done") feedback("success");
      if (p.phase === "error") feedback("error");
    });
  };

  const stop = () => {
    handleRef.current?.cancel();
    handleRef.current = null;
    setProgress({ phase: "idle" });
  };

  const phase = progress.phase;
  const isRunning = phase === "warming-up" || phase === "capturing-decay" || phase === "computing" || phase === "requesting-mic";

  const phaseInfo = (() => {
    switch (phase) {
      case "idle": return { label: "Listo", color: "var(--info)" };
      case "requesting-mic": return { label: "Pidiendo micrófono…", color: "var(--info)" };
      case "warming-up": return { label: `Emitiendo ruido rosa…`, color: "var(--warning)" };
      case "capturing-decay": return { label: `Capturando cola de reverberación…`, color: "var(--destructive)" };
      case "computing": return { label: "Analizando decaimiento…", color: "var(--warning)" };
      case "done": return { label: "Medición completa", color: "var(--accent)" };
      case "error": return { label: "Error", color: "var(--destructive)" };
    }
  })();

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end md:items-center justify-center p-4"
          onClick={() => { if (!isRunning) onClose(); }}
          data-testid="rt60-modal-overlay"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ type: "spring", damping: 24, stiffness: 240 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-card border border-border p-5 shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="h-10 w-10 rounded-2xl bg-info/12 border border-info/25 flex items-center justify-center">
                  <Waves size={16} className="text-info" />
                </div>
                <div>
                  <p className="text-base font-medium text-foreground">Medición de RT60</p>
                  <p className="text-[10px] text-muted-foreground">Con el micrófono del dispositivo</p>
                </div>
              </div>
              <button
                onClick={() => { if (!isRunning) onClose(); }}
                disabled={isRunning}
                data-testid="rt60-modal-close"
                className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center cursor-pointer active:scale-90 disabled:opacity-40"
              >
                <X size={14} />
              </button>
            </div>

            {phase === "idle" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-info/20 bg-info/5 p-3 flex gap-2">
                  <Info size={13} className="text-info shrink-0 mt-0.5" />
                  <div className="text-[11px] text-muted-foreground leading-relaxed">
                    <p className="text-info font-medium uppercase text-[10px] tracking-[0.28em] mb-1">Cómo funciona</p>
                    <ol className="list-decimal list-inside space-y-0.5">
                      <li>Emitimos <b>ruido rosa</b> por 1.5s.</li>
                      <li>Cortamos y grabamos la <b>cola de reverberación</b> por 4s.</li>
                      <li>Calculamos <b>RT60</b> con integración Schroeder + fit T20.</li>
                    </ol>
                    <p className="mt-2 text-muted-foreground/80">
                      Tip: subí el volumen del dispositivo al máximo y posicionalo lejos de superficies duras.
                    </p>
                  </div>
                </div>
                <button
                  onClick={start}
                  data-testid="rt60-start-btn"
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-info text-[#06080A] py-3 text-sm font-medium hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_6px_22px_rgba(94,234,212,0.4)] uppercase tracking-[0.2em]"
                >
                  <Mic size={14} /> Iniciar medición
                </button>
              </div>
            )}

            {isRunning && (
              <div className="text-center py-2">
                <div className="relative mx-auto h-24 w-24 mb-3">
                  <div
                    className="absolute inset-0 rounded-full animate-ping"
                    style={{ background: `${phaseInfo.color}30` }}
                  />
                  <div
                    className="absolute inset-3 rounded-full flex items-center justify-center"
                    style={{ background: `${phaseInfo.color}22`, border: `2px solid ${phaseInfo.color}` }}
                  >
                    <Mic size={26} style={{ color: phaseInfo.color }} />
                  </div>
                </div>
                <p className="text-sm font-medium text-foreground" data-testid="rt60-phase-label" style={{ color: phaseInfo.color }}>
                  {phaseInfo.label}
                </p>
                {(phase === "warming-up" || phase === "capturing-decay") && (
                  <p className="text-[11px] text-muted-foreground mt-1 font-mono">
                    {progress.secondsLeft.toFixed(1)}s restantes
                  </p>
                )}
                <button
                  onClick={stop}
                  data-testid="rt60-cancel-btn"
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-secondary border border-border px-4 py-1.5 text-[11px] font-medium text-muted-foreground hover:text-destructive hover:border-destructive/40 transition-all cursor-pointer uppercase tracking-[0.2em]"
                >
                  Cancelar
                </button>
              </div>
            )}

            {phase === "done" && (
              <div className="space-y-3">
                <div className="rounded-2xl border p-4"
                  style={{ borderColor: `${phaseInfo.color}40`, background: `${phaseInfo.color}10` }}>
                  <div className="flex items-baseline justify-between mb-2">
                    <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">RT60 medido</span>
                    <ConfidencePill c={progress.confidence} />
                  </div>
                  <p className="text-5xl font-medium font-mono tabular-nums" style={{ color: phaseInfo.color, textShadow: `0 0 24px ${phaseInfo.color}44` }} data-testid="rt60-result-value">
                    {progress.rt60.toFixed(2)}<span className="text-lg text-muted-foreground ml-1">s</span>
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="EDT" value={`${progress.edt.toFixed(2)}s`} />
                  <MiniStat label="SNR" value={`${progress.snr.toFixed(0)} dB`} />
                  <MiniStat label="Piso" value={`${progress.noiseFloor.toFixed(0)} dB`} />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => { feedback("select"); setProgress({ phase: "idle" }); }}
                    data-testid="rt60-retry-btn"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-secondary border border-border py-2.5 text-[11px] font-medium text-foreground hover:border-info/40 hover:text-info transition-all cursor-pointer uppercase tracking-[0.2em]"
                  >
                    <RotateCcw size={12} /> Repetir
                  </button>
                  <button
                    onClick={() => { feedback("success"); onApply(progress.rt60); onClose(); }}
                    data-testid="rt60-apply-btn"
                    className="flex-1 flex items-center justify-center gap-1.5 rounded-full bg-accent text-accent-foreground py-2.5 text-[11px] font-medium hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer shadow-[0_4px_18px_rgba(0,255,158,0.35)] uppercase tracking-[0.2em]"
                  >
                    <Check size={12} /> Aplicar
                  </button>
                </div>
              </div>
            )}

            {phase === "error" && (
              <div className="space-y-3">
                <div className="rounded-2xl border border-destructive/25 bg-destructive/8 p-3 flex gap-2">
                  <AlertTriangle size={14} className="text-destructive shrink-0 mt-0.5" />
                  <p className="text-[11px] text-destructive leading-relaxed" data-testid="rt60-error-msg">
                    {progress.message}
                  </p>
                </div>
                <button
                  onClick={start}
                  data-testid="rt60-retry-err-btn"
                  className="w-full flex items-center justify-center gap-2 rounded-full bg-info text-[#06080A] py-2.5 text-sm font-medium hover:brightness-110 cursor-pointer uppercase tracking-[0.2em]"
                >
                  <RotateCcw size={13} /> Reintentar
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ConfidencePill({ c }: { c: "low" | "medium" | "high" }) {
  const cfg = { low: { color: "var(--destructive)", label: "BAJA" }, medium: { color: "var(--warning)", label: "MEDIA" }, high: { color: "var(--accent)", label: "ALTA" } }[c];
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.2em]"
      style={{ borderColor: `${cfg.color}40`, background: `${cfg.color}15`, color: cfg.color }}>
      Confianza {cfg.label}
    </span>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 py-2 text-center">
      <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">{label}</p>
      <p className="text-sm font-medium font-mono text-foreground mt-0.5">{value}</p>
    </div>
  );
}

function _unused(_x: unknown) { return cn(""); }
export const __unused = _unused;
