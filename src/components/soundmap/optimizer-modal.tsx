// Stage Optimizer Modal — runs a brute-force search over stage configurations
// and shows the top candidates ranked by uniformity score.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Sparkles, Loader2, TrendingUp, Check } from "lucide-react";
import { optimizeStage, type StageCandidate } from "@/lib/audio/stage-optimizer.ts";
import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import { feedback } from "@/lib/feedback.ts";
import { cn } from "@/lib/utils.ts";

interface Props {
  open: boolean;
  room: RoomScanInput;
  tops: GearItem[];
  subs: GearItem[];
  onClose: () => void;
  onApply?: (best: StageCandidate) => void;
}

export function OptimizerModal({ open, room, tops, subs, onClose, onApply }: Props) {
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [candidates, setCandidates] = useState<StageCandidate[]>([]);
  const [selected, setSelected] = useState(0);

  // Snapshot inputs when the modal opens so an ongoing optimization is not
  // restarted by upstream store churn (e.g. Convex sync tick that recreates
  // the tops/subs array identities).
  const [snapshot, setSnapshot] = useState<{ room: RoomScanInput; tops: GearItem[]; subs: GearItem[] } | null>(null);
  useEffect(() => {
    if (open && !snapshot) {
      setSnapshot({ room, tops: tops.slice(), subs: subs.slice() });
    } else if (!open && snapshot) {
      setSnapshot(null);
    }
    // Intentionally NOT depending on room/tops/subs — we only snapshot on open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open || !snapshot) {
      setRunning(false);
      setProgress(0);
      setCandidates([]);
      setSelected(0);
      return;
    }
    setRunning(true);
    setProgress(0);
    setCandidates([]);
    let cancelled = false;
    (async () => {
      const started = performance.now();
      const result = await optimizeStage(snapshot.room, snapshot.tops, snapshot.subs, {
        topN: 5,
        cols: 12,
        rows: 16,
        onProgress: (f) => {
          if (!cancelled) setProgress(f);
        },
      });
      if (cancelled) return;
      console.info(`[SoundMap Optimizer] ${result.length} candidates ranked in ${(performance.now() - started).toFixed(0)} ms`);
      setCandidates(result);
      setRunning(false);
      feedback("success");
    })();
    return () => { cancelled = true; };
  }, [open, snapshot]);

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-end md:items-center justify-center p-4"
        onClick={onClose}
        data-testid="optimizer-overlay"
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
              <div className="h-10 w-10 rounded-2xl bg-accent/12 border border-accent/25 flex items-center justify-center">
                <Sparkles size={16} className="text-accent" />
              </div>
              <div>
                <p className="text-base font-medium text-foreground">Optimizer</p>
                <p className="text-[10px] text-muted-foreground">Buscando el mejor rig · física ISO 9613</p>
              </div>
            </div>
            <button
              onClick={onClose}
              data-testid="optimizer-close"
              className="h-9 w-9 rounded-full bg-secondary border border-border flex items-center justify-center cursor-pointer active:scale-90"
            >
              <X size={14} />
            </button>
          </div>

          {running && (
            <div className="rounded-2xl border border-border bg-secondary/30 p-6 flex flex-col items-center gap-3" data-testid="optimizer-running">
              <Loader2 size={22} className="text-accent animate-spin" />
              <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-foreground">
                Probando 144 configuraciones…
              </p>
              <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                <motion.div
                  className="h-full bg-accent"
                  animate={{ width: `${Math.round(progress * 100)}%` }}
                  transition={{ duration: 0.1 }}
                />
              </div>
              <p className="text-[10px] font-mono tabular-nums text-muted-foreground">{Math.round(progress * 100)}%</p>
            </div>
          )}

          {!running && candidates.length === 0 && (
            <div className="rounded-2xl border border-warning/25 bg-warning/8 p-4" data-testid="optimizer-empty">
              <p className="text-[11px] text-warning leading-relaxed">
                Sin equipamiento suficiente para optimizar. Cargá al menos un top o un sub para poder ejecutar el análisis.
              </p>
            </div>
          )}

          {!running && candidates.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-2xl border border-accent/25 bg-accent/6 p-3" data-testid="optimizer-summary">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp size={12} className="text-accent" />
                  <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-accent">
                    Mejor Configuración
                  </p>
                </div>
                <p className="text-sm font-bold text-foreground leading-snug">{candidates[0].label}</p>
                <div className="flex items-center gap-4 mt-2">
                  <Stat label="Uniform" value={`${candidates[0].grid.uniformityPct}%`} color="var(--accent)" />
                  <Stat label="Spread" value={`${candidates[0].grid.spread.toFixed(1)} dB`} color="var(--info)" />
                  <Stat label="SPL Media" value={`${Math.round(candidates[0].grid.mean)} dB`} color="var(--warning)" />
                </div>
              </div>

              <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mt-3 mb-1">
                Top {candidates.length} candidatos
              </p>
              {candidates.map((c, i) => (
                <button
                  key={i}
                  onClick={() => { feedback("tap"); setSelected(i); }}
                  data-testid={`optimizer-candidate-${i}`}
                  className={cn(
                    "w-full text-left rounded-2xl border p-3 cursor-pointer transition-all active:scale-[0.99]",
                    i === selected
                      ? "border-accent/50 bg-accent/8"
                      : "border-border bg-secondary/40 hover:border-accent/25"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[10px] font-medium uppercase tracking-[0.28em]" style={{ color: i === 0 ? "var(--accent)" : "var(--info)" }}>
                      #{i + 1} · Score {c.score.toFixed(1)}
                    </p>
                    {i === selected && <Check size={11} className="text-accent" />}
                  </div>
                  <p className="text-xs font-semibold text-foreground leading-snug">{c.label}</p>
                  <div className="flex items-center gap-3 mt-2 text-[10px] font-mono tabular-nums">
                    <span className="text-muted-foreground">U <span className="text-accent font-medium">{c.grid.uniformityPct}%</span></span>
                    <span className="text-muted-foreground">Δ <span className="text-foreground font-medium">{c.grid.spread.toFixed(1)}</span></span>
                    <span className="text-muted-foreground">SPL <span className="text-foreground font-medium">{Math.round(c.grid.mean)}</span></span>
                  </div>
                </button>
              ))}

              {onApply && (
                <button
                  onClick={() => {
                    feedback("success");
                    onApply(candidates[selected]);
                    onClose();
                  }}
                  data-testid="optimizer-apply"
                  className="w-full mt-2 h-11 rounded-full bg-accent text-[#06080A] font-medium text-xs uppercase tracking-[0.28em] cursor-pointer active:scale-[0.98] hover:brightness-110 transition-all"
                >
                  Aplicar candidato #{selected + 1}
                </button>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div>
      <p className="text-[9px] uppercase tracking-[0.28em] text-muted-foreground font-medium">{label}</p>
      <p className="text-sm font-medium font-mono tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
