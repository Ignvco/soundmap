// Test Signal Player — pink noise / white noise / sines / sweep
// Compact card to add to Live / DSP pages.
import { useEffect, useState } from "react";
import { motion } from "motion/react";
import { Play, Square, Volume2, AlertTriangle } from "lucide-react";
import { playSignal, stopSignal, type SignalKind } from "@/lib/audio/test-signals.ts";
import { feedback } from "@/lib/feedback.ts";
import { cn } from "@/lib/utils.ts";

interface Preset {
  kind: SignalKind;
  label: string;
  sub: string;
  color: string;
}

const PRESETS: Preset[] = [
  { kind: "pink-noise",  label: "Pink",   sub: "Test tone",   color: "var(--accent)" },
  { kind: "white-noise", label: "White",  sub: "Full spectrum", color: "var(--info)" },
  { kind: "sine-1k",     label: "1 kHz",  sub: "Reference",   color: "var(--warning)" },
  { kind: "sine-100",    label: "100 Hz", sub: "Sub check",   color: "var(--warning)" },
  { kind: "sine-sweep",  label: "Sweep",  sub: "20 Hz → 20 kHz", color: "var(--destructive)" },
];

export function TestSignalsPlayer({ className }: { className?: string }) {
  const [active, setActive] = useState<SignalKind | null>(null);
  const [levelDb, setLevelDb] = useState(-18);

  useEffect(() => () => { stopSignal(); }, []);

  const handleToggle = (kind: SignalKind) => {
    if (active === kind) {
      feedback("warning");
      stopSignal();
      setActive(null);
    } else {
      feedback("tap");
      playSignal(kind, levelDb, () => setActive(null));
      setActive(kind);
    }
  };

  return (
    <div className={cn("rounded-3xl border border-border bg-card p-4", className)} data-testid="test-signals-player">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Test Signals</p>
          <p className="text-[10px] text-muted-foreground/60 mt-0.5">Calibración y verificación</p>
        </div>
        <div className="flex items-center gap-2 rounded-full bg-secondary border border-border px-3 py-1">
          <Volume2 size={11} className="text-muted-foreground" />
          <span className="text-[11px] font-mono text-foreground tabular-nums">{levelDb} dB</span>
        </div>
      </div>

      {/* Safety warning */}
      {levelDb > -6 && (
        <div className="rounded-2xl border border-warning/25 bg-warning/8 p-2.5 mb-3 flex items-start gap-2">
          <AlertTriangle size={12} className="text-warning shrink-0 mt-0.5" />
          <p className="text-[10px] text-warning leading-relaxed">
            Nivel alto. Bajá el volumen del sistema antes de reproducir para proteger tus drivers.
          </p>
        </div>
      )}

      {/* Level slider */}
      <div className="mb-3">
        <input
          type="range"
          min={-40}
          max={0}
          step={1}
          value={levelDb}
          onChange={(e) => setLevelDb(parseInt(e.target.value, 10))}
          data-testid="test-signal-level"
          className="w-full accent-info"
        />
        <div className="flex justify-between text-[9px] font-mono text-muted-foreground/60">
          <span>−40 dB</span>
          <span>−20</span>
          <span>0 dB</span>
        </div>
      </div>

      {/* Signal grid */}
      <div className="grid grid-cols-5 gap-1.5">
        {PRESETS.map(p => {
          const isActive = active === p.kind;
          return (
            <motion.button
              key={p.kind}
              onClick={() => handleToggle(p.kind)}
              data-testid={`test-signal-${p.kind}`}
              whileTap={{ scale: 0.94 }}
              className={cn(
                "relative flex flex-col items-center gap-1 rounded-2xl border py-2.5 px-1 transition-all cursor-pointer",
                isActive ? "border-transparent" : "border-border bg-secondary/40 hover:border-white/20"
              )}
              style={isActive ? {
                background: p.color,
                boxShadow: `0 4px 18px ${p.color}55`,
                color: "var(--background)",
              } : {}}
            >
              <div className="h-6 w-6 flex items-center justify-center">
                {isActive ? <Square size={12} strokeWidth={2.8} fill="var(--background)" /> : <Play size={12} strokeWidth={2.4} style={{ color: p.color }} />}
              </div>
              <span className={cn("text-[10px] font-medium uppercase tracking-tight", isActive ? "text-[#06080A]" : "text-foreground")}>
                {p.label}
              </span>
              <span className={cn("text-[8px] leading-tight text-center", isActive ? "text-[#06080A]/70" : "text-muted-foreground")}>
                {p.sub}
              </span>
              {isActive && (
                <motion.span
                  className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-[#06080A]"
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              )}
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
