// SoundMap — DSP Screen (Dark Premium Processor)
import { useState, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Cpu, RotateCcw, Info, Share2 } from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import { generateDSPConfig } from "@/lib/audio/dsp-engine.ts";
import { calculateCrossover } from "@/lib/audio/pa-engine.ts";
import { speedOfSoundFromTemp } from "@/lib/audio/time-align.ts";
import type { DSPBand, DSPOutput } from "@/lib/audio/dsp-engine.ts";
import { GlassCard, Badge, ScreenShell, WarningBanner } from "@/components/soundmap/ui.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import { useInWizard } from "@/lib/wizard-context.ts";
import { EmptyRoomState } from "@/components/soundmap/empty-state.tsx";
import { ShareDspModal } from "@/components/soundmap/share-dsp-modal.tsx";
import { feedback } from "@/lib/feedback.ts";

type DSPTab = "main" | "xover" | "eq" | "dynamics" | "delay";

const TABS: { id: DSPTab; label: string }[] = [
  { id: "main",     label: "Principal" },
  { id: "xover",    label: "Cruce" },
  { id: "eq",       label: "EQ" },
  { id: "dynamics", label: "Dinámica" },
  { id: "delay",    label: "Delay" },
];

// ── Vitals palette — single lime accent + neutral grayscale + semantic amber/warm ─
const T = {
  gold:  "var(--sm-accent)",             // primary accent (lime)
  amber: "var(--sm-amber)",             // warnings
  green: "var(--sm-muted)",             // neutral secondary
  blue:  "var(--sm-muted)",             // neutral secondary
  red:   "var(--sm-warm)",             // limit / critical
  ink:   "#F4F4F5",
  grid:  "rgba(255,255,255,0.05)",
  zero:  "rgba(255,255,255,0.16)",
  axis:  "rgba(255,255,255,0.35)",
};

// Frequency labels for EQ graph
const FREQ_LABELS = ["20", "50", "100", "200", "500", "1k", "2k", "5k", "10k", "20k"];
const FREQ_HZ     = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];

// Map a frequency on log scale to 0–1
function freqToX(f: number): number {
  return (Math.log10(f) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20));
}

// Simple peaking EQ response at frequency f
function peakResponse(fc: number, gain: number, q: number, f: number): number {
  const dist = Math.abs(Math.log10(f) - Math.log10(fc));
  const response = gain * Math.exp(-(dist * dist) / (0.15 / (q * 0.5)));
  return response;
}

// Build the SVG path for EQ curve from bands
function buildEQCurve(bands: DSPBand[], width: number, height: number): { line: string; fill: string } {
  const midY = height / 2;
  const gainScale = height / 32; // ±16 dB = full height
  const steps = 200;

  const points: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const f = 20 * Math.pow(20000 / 20, t);
    let totalGain = 0;
    for (const band of bands) {
      if (band.type === "peak") {
        totalGain += peakResponse(band.freq, band.gain, band.q, f);
      } else if (band.type === "shelf-hi" && f > band.freq) {
        totalGain += band.gain * Math.min(1, (f - band.freq) / band.freq);
      } else if (band.type === "shelf-lo" && f < band.freq) {
        totalGain += band.gain * Math.min(1, (band.freq - f) / band.freq);
      } else if (band.type === "hp" && f < band.freq) {
        totalGain += -12 * Math.max(0, 1 - f / band.freq);
      } else if (band.type === "lp" && f > band.freq) {
        totalGain += -12 * Math.max(0, 1 - band.freq / f);
      }
    }
    const x = t * width;
    const y = midY - totalGain * gainScale;
    points.push([x, y]);
  }

  const line = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const fill = line + ` L ${width} ${midY} L 0 ${midY} Z`;
  return { line, fill };
}

// ── Visual EQ Graph (smooth premium curve) ───────────────────────────────────
function VisualEQ({ bands, color = T.gold }: { bands: DSPBand[]; color?: string }) {
  const W = 320;
  const H = 100;
  const { line, fill } = useMemo(() => buildEQCurve(bands, W, H), [bands]);
  const fillId = `eq-fill-${color.replace("#", "")}`;

  return (
    <div className="relative">
      <svg
        width="100%"
        viewBox={`0 0 ${W} ${H + 24}`}
        className="overflow-visible"
      >
        <defs>
          <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {[0, 25, 50, 75, 100].map(y => (
          <line
            key={y}
            x1={0} y1={y} x2={W} y2={y}
            stroke={T.grid}
            strokeWidth="1"
          />
        ))}
        {FREQ_HZ.map(f => {
          const x = freqToX(f) * W;
          return (
            <line
              key={f}
              x1={x} y1={0} x2={x} y2={H}
              stroke={T.grid}
              strokeWidth="1"
            />
          );
        })}

        {/* 0 dB line */}
        <line
          x1={0} y1={H / 2} x2={W} y2={H / 2}
          stroke={T.zero}
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* EQ fill */}
        <path d={fill} fill={`url(#${fillId})`} />

        {/* Main line */}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Band dots */}
        {bands.map((band, i) => {
          const x = freqToX(band.freq) * W;
          const gainScale = H / 32;
          const y = H / 2 - band.gain * gainScale;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={6} fill={color} opacity="0.18" />
              <circle cx={x} cy={y} r={3.5} fill={color} stroke="#111312" strokeWidth="1.5" />
            </g>
          );
        })}

        {/* Freq labels */}
        {FREQ_LABELS.map((label, i) => {
          const x = freqToX(FREQ_HZ[i]) * W;
          return (
            <text
              key={label}
              x={x}
              y={H + 16}
              textAnchor="middle"
              fill={T.axis}
              fontSize="8"
              fontFamily="monospace"
            >
              {label}
            </text>
          );
        })}
      </svg>

      {/* Flat label if no bands */}
      {bands.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[11px] text-muted-foreground font-mono">— RESPUESTA PLANA —</span>
        </div>
      )}
    </div>
  );
}

// ── Mini EQ Sparkline (for output selector buttons) ──────────────────────────
function MiniEQSparkline({ bands, color }: { bands: DSPBand[]; color: string }) {
  const W = 60;
  const H = 20;
  const steps = 60;

  const path = useMemo(() => {
    const pts: string[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const f = 20 * Math.pow(20000 / 20, t);
      let totalGain = 0;
      for (const band of bands) {
        if (band.type === "peak") {
          const dist = Math.abs(Math.log10(f) - Math.log10(band.freq));
          totalGain += band.gain * Math.exp(-(dist * dist) / (0.15 / (band.q * 0.5)));
        } else if (band.type === "shelf-hi" && f > band.freq) {
          totalGain += band.gain * Math.min(1, (f - band.freq) / band.freq);
        } else if (band.type === "shelf-lo" && f < band.freq) {
          totalGain += band.gain * Math.min(1, (band.freq - f) / band.freq);
        }
      }
      const x = (t * W).toFixed(1);
      const gainScale = H / 24;
      const y = Math.max(1, Math.min(H - 1, H / 2 - totalGain * gainScale)).toFixed(1);
      pts.push(`${i === 0 ? "M" : "L"} ${x} ${y}`);
    }
    return pts.join(" ");
  }, [bands]);

  if (bands.length === 0) {
    // Flat line
    return (
      <svg width={W} height={H}>
        <line x1={0} y1={H / 2} x2={W} y2={H / 2} stroke={color} strokeWidth="1" strokeOpacity="0.4" />
      </svg>
    );
  }

  const fillPath = path + ` L ${W} ${H / 2} L 0 ${H / 2} Z`;

  return (
    <svg width={W} height={H} className="overflow-visible">
      <defs>
        <linearGradient id={`mini-fill-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={fillPath} fill={`url(#mini-fill-${color.replace("#", "")})`} />
      <path d={path} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Output Selector ──────────────────────────────────────────────────────────
const OUTPUT_COLORS: Record<string, string> = {
  "OUT-A": "var(--accent)",
  "OUT-B": "#00D95A",
  "OUT-C": "#F4F4F4",
  "OUT-D": "var(--info)",
  "OUT-E": "#FBBF24",
  "OUT-F": "var(--destructive)",
  "OUT-G": "var(--info)",
};

function getOutputColor(id: string): string {
  return OUTPUT_COLORS[id] ?? T.gold;
}

// ── Knob ────────────────────────────────────────────────────────────────────
function Knob({ value, min, max, label, unit, color }: {
  value: number; min: number; max: number; label: string; unit: string; color: string;
}) {
  const pct = (value - min) / (max - min);
  const angle = -135 + pct * 270;
  const r = 22;
  const cx = 28;
  const cy = 28;
  const circum = 2 * Math.PI * r;
  const arc = (270 / 360) * circum;
  const offset = arc - pct * arc;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={56} height={56}>
          <defs>
            <linearGradient id={`knob-${label}`} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity="1" />
              <stop offset="100%" stopColor={color} stopOpacity="0.6" />
            </linearGradient>
          </defs>
          {/* Track */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke="rgba(255,255,255,0.10)"
            strokeWidth="3"
            strokeDasharray={`${arc} 999`}
            strokeDashoffset={-((360 - 270) / 2 / 360) * circum}
            strokeLinecap="round"
            transform={`rotate(-225 ${cx} ${cy})`}
          />
          {/* Value arc */}
          <circle
            cx={cx} cy={cy} r={r}
            fill="none"
            stroke={`url(#knob-${label})`}
            strokeWidth="3"
            strokeDasharray={`${arc} 999`}
            strokeDashoffset={offset + ((360 - 270) / 2 / 360) * circum}
            strokeLinecap="round"
            transform={`rotate(-225 ${cx} ${cy})`}
          />
          {/* Center body */}
          <circle cx={cx} cy={cy} r={14} fill="#151716" stroke="rgba(255,255,255,0.10)" strokeWidth="1" />
          {/* Pointer */}
          <line
            x1={cx}
            y1={cy}
            x2={cx + 10 * Math.cos((angle - 90) * Math.PI / 180)}
            y2={cy + 10 * Math.sin((angle - 90) * Math.PI / 180)}
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </div>
      <p className="text-[8px] text-muted-foreground font-semibold uppercase tracking-[0.2em]">{label}</p>
      <p className="text-[10px] font-bold text-foreground leading-none">{value >= 0 && label === "Gain" ? "+" : ""}{value}<span className="text-[8px] text-muted-foreground ml-0.5">{unit}</span></p>
    </div>
  );
}

// ── Main / Routing card ──────────────────────────────────────────────────────
/** Traduce el código de pendiente del motor ("LR24") a algo legible. */
function slopeToLabel(slope: string | undefined): string {
  const m = /(\d+)/.exec(slope ?? "");
  return m ? `${m[1]} dB/oct` : "24 dB/oct";
}

function MainTab({ output, slope }: { output: DSPOutput; slope?: string }) {
  const slopeLabel = slopeToLabel(slope);
  const color = getOutputColor(output.id);
  return (
    <div className="space-y-3">
      {/* Routing header */}
      <GlassCard className="p-4">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0"
            style={{ background: `${color}1F`, border: `1px solid ${color}38` }}
          >
            <span className="text-sm font-medium" style={{ color }}>{output.label}</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold uppercase tracking-[0.28em]">Destino</p>
            <p className="text-base font-bold text-foreground">{output.destination}</p>
          </div>
          <div className="ml-auto">
            <Badge color={output.polarity ? "green" : "red"}>
              {output.polarity ? "Ø Normal" : "Ø Invertida"}
            </Badge>
          </div>
        </div>

        {/* Knobs row */}
        <div className="grid grid-cols-4 gap-3 justify-items-center pt-2 border-t border-border">
          <Knob value={output.gain} min={-20} max={6} label="Gain" unit="dB" color={color} />
          <Knob value={output.hpfHz} min={20} max={500} label="HPF" unit="Hz" color={T.blue} />
          <Knob value={Math.min(output.lpfHz, 20000)} min={500} max={20000} label="LPF" unit="Hz" color={T.green} />
          <Knob value={output.limiterDb} min={80} max={150} label="Limit" unit="dB" color={T.amber} />
        </div>
      </GlassCard>

      {/* Spec grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {[
          { label: "Filtro Paso Alto", value: `${output.hpfHz} Hz`, sub: `${slopeLabel} · Linkwitz-Riley`, color: T.blue },
          { label: "Filtro Paso Bajo", value: output.lpfHz >= 20000 ? "Rango Completo" : `${output.lpfHz} Hz`, sub: `${slopeLabel} · Linkwitz-Riley`, color: T.green },
          { label: "Ganancia de Salida", value: `${output.gain >= 0 ? "+" : ""}${output.gain} dB`, sub: "Pre-limitador", color: color },
          { label: "Limitador", value: `${output.limiterDb.toFixed(1)} dB`, sub: "Umbral de clip duro", color: T.amber },
        ].map(item => (
          <GlassCard key={item.label} className="p-3">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1">{item.label}</p>
            <p className="text-lg font-medium leading-none" style={{ color: item.color }}>{item.value}</p>
            <p className="text-[9px] text-muted-foreground mt-1">{item.sub}</p>
          </GlassCard>
        ))}
      </div>
    </div>
  );
}

// ── Xover Tab ────────────────────────────────────────────────────────────────
function XoverTab({ outputs }: { outputs: DSPOutput[] }) {
  return (
    <div className="space-y-2.5">
      {outputs.map(out => {
        const color = getOutputColor(out.id);
        const xoverActive = out.lpfHz < 20000;
        return (
          <GlassCard key={out.id} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div
                className="h-8 w-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${color}1A`, border: `1px solid ${color}33` }}
              >
                <span className="text-[11px] font-medium" style={{ color }}>{out.label.replace("OUT ", "")}</span>
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">{out.destination}</p>
                {xoverActive && (
                  <p className="text-[10px] font-semibold" style={{ color }}>
                    Banda de paso: {out.hpfHz}–{out.lpfHz} Hz
                  </p>
                )}
              </div>
              <Badge color={xoverActive ? "orange" : "gray"} className="ml-auto">
                {xoverActive ? "Cruce" : "Rango Completo"}
              </Badge>
            </div>
            {/* Mini frequency bar */}
            <div className="relative h-2 bg-secondary rounded-full overflow-hidden">
              <div
                className="absolute top-0 bottom-0 rounded-full"
                style={{
                  left: `${(Math.log10(out.hpfHz) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * 100}%`,
                  right: `${(1 - (Math.log10(Math.min(out.lpfHz, 20000)) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20))) * 100}%`,
                  background: `linear-gradient(90deg, ${color}99, ${color})`,
                }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
              <span>20 Hz</span>
              <span>1k</span>
              <span>20k Hz</span>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── EQ Tab ───────────────────────────────────────────────────────────────────
function EQTab({ output }: { output: DSPOutput }) {
  const color = getOutputColor(output.id);
  return (
    <div className="space-y-3">
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-bold text-foreground">{output.destination} EQ</p>
          <Badge color="gray">{output.eq.length} band{output.eq.length !== 1 ? "s" : ""}</Badge>
        </div>
        <div className="bg-secondary/50 rounded-xl p-3 border border-border">
          <VisualEQ bands={output.eq} color={color} />
        </div>
      </GlassCard>

      {/* Band list */}
      <GlassCard className="p-4">
        <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">Bandas de EQ</p>
        {output.eq.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">Plano — sin EQ aplicado</p>
        ) : (
          <div className="space-y-0">
            {output.eq.map((band, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 border-b border-border last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="h-7 w-7 rounded-lg flex items-center justify-center"
                    style={{ background: `${color}18`, border: `1px solid ${color}28` }}
                  >
                    <span className="text-[9px] font-bold" style={{ color }}>
                      {band.freq >= 1000 ? `${(band.freq / 1000).toFixed(0)}k` : band.freq}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{band.freq >= 1000 ? `${(band.freq / 1000).toFixed(1)}k` : band.freq} Hz</p>
                    <p className="text-[9px] text-muted-foreground capitalize">{band.type} · Q {band.q}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-sm font-medium"
                    style={{ color: band.gain > 0 ? T.gold : band.gain < 0 ? T.blue : "rgba(255,255,255,0.30)" }}
                  >
                    {band.gain >= 0 ? "+" : ""}{band.gain} dB
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}

// ── Animated GR Meter ────────────────────────────────────────────────────────
// Simulates a bouncing gain-reduction LED meter for each output
function GRMeter({ limiterDb }: { limiterDb: number }) {
  const SEGMENTS = 12;
  const activeSegments = Math.round(((limiterDb - 80) / 70) * SEGMENTS);

  return (
    <div className="flex gap-0.5 items-end" style={{ height: 48 }}>
      {Array.from({ length: SEGMENTS }).map((_, i) => {
        const segIndex = SEGMENTS - 1 - i; // top = high, bottom = low
        const isActive = segIndex < activeSegments;
        const isTop = segIndex >= SEGMENTS - 2;
        const isMid = segIndex >= SEGMENTS - 5 && segIndex < SEGMENTS - 2;

        let segColor = "rgba(94,234,212,0.18)"; // inactive: dim green
        if (isActive) {
          if (isTop) segColor = T.red;          // red – limit zone
          else if (isMid) segColor = T.amber;   // amber – warning zone
          else segColor = T.green;              // green – safe zone
        }

        return (
          <motion.div
            key={i}
            className="flex-1 rounded-[2px]"
            style={{
              height: `${((i + 1) / SEGMENTS) * 100}%`,
              background: segColor,
              boxShadow: isActive && isTop ? `0 0 6px ${segColor}` : undefined,
            }}
            animate={isActive ? {
              opacity: isTop ? [1, 0.6, 1] : 1,
            } : { opacity: 1 }}
            transition={isTop ? {
              duration: 0.4 + (limiterDb % 10) * 0.02,
              repeat: Infinity,
              ease: "easeInOut",
            } : undefined}
          />
        );
      })}
    </div>
  );
}

// ── Dynamics Tab ─────────────────────────────────────────────────────────────
const GAIN_STATUS: Record<string, { label: string; color: string }> = {
  ideal: { label: "Ideal", color: "var(--info)" },
  underpowered: { label: "Subpotenciado", color: "var(--destructive)" },
  overpowered: { label: "Sobrepotenciado", color: "#00D95A" },
  active: { label: "Activo", color: "#F4F4F4" },
  unknown: { label: "Sin datos", color: "rgba(244,244,244,0.5)" },
};

function DynamicsTab({ outputs }: { outputs: DSPOutput[] }) {
  return (
    <div className="space-y-2.5">
      {outputs.map(out => {
        const color = getOutputColor(out.id);
        const pct = Math.max(0, Math.min(100, (out.limiterDb - 80) / 70 * 100));
        const headroomAboveLimiter = Math.max(0, 150 - out.limiterDb);
        const dyn = out.dynamics;
        const comp = dyn.compressor;
        const gs = dyn.gainStage;
        const gsStatus = GAIN_STATUS[gs.status] ?? GAIN_STATUS.unknown;

        return (
          <GlassCard key={out.id} className="p-4">
            <div className="flex items-center gap-3 mb-4">
              {/* GR Meter */}
              <div className="shrink-0">
                <GRMeter limiterDb={out.limiterDb} />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-7 w-7 rounded-lg flex items-center justify-center"
                      style={{ background: `${color}1A`, border: `1px solid ${color}33` }}
                    >
                      <span className="text-[9px] font-medium" style={{ color }}>{out.label.replace("OUT ", "")}</span>
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground leading-none">{out.destination}</p>
                      <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                        Limitador {dyn.limiterType.toUpperCase()} · {dyn.limiterAttackMs}/{dyn.limiterReleaseMs} ms
                      </p>
                    </div>
                  </div>
                  <p className="text-xl font-medium leading-none" style={{ color: T.amber }}>
                    {out.limiterDb.toFixed(0)}
                    <span className="text-[10px] text-muted-foreground ml-0.5">dB</span>
                  </p>
                </div>

                {/* Threshold bar */}
                <div className="relative h-2 bg-secondary rounded-full overflow-hidden mb-1.5">
                  <motion.div
                    className="h-full rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{
                      background: `linear-gradient(90deg, ${T.green}, ${T.amber} ${Math.min(80, pct)}%, ${T.red})`,
                    }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-0.5"
                    style={{ left: `${pct}%`, background: `${T.amber}cc` }}
                  />
                </div>
                <div className="flex justify-between text-[9px] text-muted-foreground">
                  <span>80 dB</span>
                  <span style={{ color: `${T.amber}` }}>← Umbral limitador</span>
                  <span>150 dB</span>
                </div>
              </div>
            </div>

            {/* Limiter stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg bg-secondary px-2.5 py-2">
                <p className="text-[9px] text-muted-foreground leading-none mb-0.5">Techo limitador</p>
                <p className="text-xs font-medium" style={{ color }}>{out.limiterDb.toFixed(1)} dB</p>
              </div>
              <div className="rounded-lg bg-secondary px-2.5 py-2">
                <p className="text-[9px] text-muted-foreground leading-none mb-0.5">Ataque/Release</p>
                <p className="text-xs font-medium" style={{ color: T.blue }}>{dyn.limiterAttackMs}/{dyn.limiterReleaseMs} ms</p>
              </div>
              <div className="rounded-lg bg-secondary px-2.5 py-2">
                <p className="text-[9px] text-muted-foreground leading-none mb-0.5">Margen</p>
                <p className="text-xs font-medium" style={{ color: T.green }}>{headroomAboveLimiter} dB</p>
              </div>
            </div>

            {/* Compressor */}
            <div className="mt-3 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">Compresor</p>
                <Badge color="gray">{comp.ratio}:1</Badge>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Ratio", value: `${comp.ratio}:1`, color: color },
                  { label: "Ataque", value: `${comp.attackMs} ms`, color: T.blue },
                  { label: "Release", value: `${comp.releaseMs} ms`, color: T.green },
                  { label: "Knee", value: `${comp.kneeDb} dB`, color: T.amber },
                ].map(s => (
                  <div key={s.label}>
                    <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">{s.label}</p>
                    <p className="text-[11px] font-medium leading-none" style={{ color: s.color }}>{s.value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[9px] text-muted-foreground mt-2">
                Umbral {comp.thresholdDb} dB bajo el limitador — ajustado al RT60 de la sala.
              </p>
            </div>

            {/* Gain staging */}
            <div className="mt-2.5 rounded-xl border border-border p-3">
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">Gain Staging</p>
                <Badge color={gs.status === "ideal" ? "green" : gs.status === "underpowered" ? "red" : gs.status === "overpowered" ? "orange" : gs.status === "active" ? "blue" : "gray"}>
                  {gsStatus.label}
                </Badge>
              </div>
              <div className="grid grid-cols-3 gap-2 mb-2">
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Salida</p>
                  <p className="text-[11px] font-medium leading-none" style={{ color }}>{gs.outputGainDb >= 0 ? "+" : ""}{gs.outputGainDb} dB</p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Amp / Parlante</p>
                  <p className="text-[11px] font-medium leading-none" style={{ color: gsStatus.color }}>
                    {gs.powerRatio !== null ? `${gs.powerRatio}×` : "—"}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-muted-foreground uppercase tracking-[0.2em] mb-0.5">Potencias</p>
                  <p className="text-[11px] font-medium leading-none text-foreground">
                    {gs.ampWatts !== null ? `${gs.ampWatts}W` : "Act"}{gs.speakerRmsWatts !== null ? ` / ${gs.speakerRmsWatts}W` : ""}
                  </p>
                </div>
              </div>
              <p className="text-[9px] text-muted-foreground leading-relaxed">{gs.note}</p>
            </div>
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── Delay Tab ────────────────────────────────────────────────────────────────
function DelayTab({ outputs, tempC = 20 }: { outputs: DSPOutput[]; tempC?: number }) {
  // La distancia equivalente tiene que usar la MISMA velocidad del sonido con
  // la que el motor calculó el delay. Antes acá había un 0.343 fijo: a 35 °C la
  // distancia mostrada no coincidía con el delay que estaba al lado.
  const metersPerMs = speedOfSoundFromTemp(tempC) / 1000;
  return (
    <div className="space-y-2.5">
      {outputs.map(out => {
        const color = getOutputColor(out.id);
        const distM = (out.delayMs * metersPerMs).toFixed(2);
        return (
          <GlassCard key={out.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className="h-10 w-10 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}1A`, border: `1px solid ${color}33` }}
                >
                  <span className="text-[10px] font-medium" style={{ color }}>{out.label.replace("OUT ", "")}</span>
                </div>
                <div>
                  <p className="text-xs font-bold text-foreground">{out.destination}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {out.delayMs > 0 ? `${distM} m equivalente · alineación de fase` : "referencia (sin atraso)"}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-2xl font-medium" style={{ color }}>{out.delayMs}</p>
                <p className="text-[10px] text-muted-foreground">ms</p>
              </div>
            </div>
            {/* Delay timeline visualization */}
            {out.delayMs > 0 && (
              <div className="mt-3 flex items-center gap-2">
                <div className="h-0.5 flex-1 bg-secondary rounded-full relative overflow-hidden">
                  <motion.div
                    className="absolute top-0 bottom-0 w-2 rounded-full"
                    style={{ background: color }}
                    animate={{ left: ["0%", "90%", "0%"] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </div>
                <span className="text-[9px] text-muted-foreground font-mono shrink-0">{out.delayMs}ms</span>
              </div>
            )}
          </GlassCard>
        );
      })}
    </div>
  );
}

// ── Main DSP Screen ──────────────────────────────────────────────────────────
export default function DSP() {
  const { room, acoustics, tops, subs, monitors, dspUnits, amps } = useAppStore();
  const inWizard = useInWizard();
  const [activeTab, setActiveTab] = useState<DSPTab>("main");
  const [selectedOutput, setSelectedOutput] = useState(0);

  const xover = useMemo(() => calculateCrossover(tops, subs), [tops, subs]);
  const dsp = useMemo(() =>
    room && acoustics
      ? generateDSPConfig(room, acoustics, tops, subs, monitors, dspUnits[0] ?? null, amps)
      : null,
    [room, acoustics, tops, subs, monitors, dspUnits, amps]
  );

  const [shareOpen, setShareOpen] = useState(false);

  const handleTabChange = useCallback((tab: DSPTab) => {
    setActiveTab(tab);
  }, []);

  if (!room || !acoustics) {
    return (
      <EmptyRoomState
        title="DSP"
        icon={Cpu}
        iconColor={T.gold}
        description="Completá un Escaneo de Sala para generar salidas DSP, cruces de frecuencia, curvas EQ y parámetros de delay."
      />
    );
  }

  const output = dsp?.outputs[selectedOutput] ?? null;
  const outputsExist = (dsp?.outputs.length ?? 0) > 0;

  return (
    <ScreenShell compact={inWizard}>
      {!inWizard && (
        <PageHeader
          title="DSP"
          subtitle={dsp?.dspModel ?? "Sin DSP"}
          right={
            <div className="flex items-center gap-2">
              {dsp && dsp.outputs.length > 0 && (
                <button
                  onClick={() => { feedback("select"); setShareOpen(true); }}
                  data-testid="dsp-share-btn"
                  className="h-8 flex items-center gap-1.5 rounded-xl px-2.5 bg-dsp/12 border border-dsp/25 text-[10px] font-medium text-dsp hover:bg-dsp/20 active:scale-90 cursor-pointer uppercase tracking-[0.2em]"
                >
                  <Share2 size={11} />
                  Preset
                </button>
              )}
              <div className="rounded-xl px-3 py-1.5 text-[10px] font-bold bg-accent/12 border border-accent/25 text-accent">
                {dsp?.outputs.length ?? 0} salidas
              </div>
            </div>
          }
        />
      )}

      {/* DSP unit warning */}
      {dspUnits.length === 0 && (
        <div className="px-4 mb-4">
          <WarningBanner message="Sin unidad DSP seleccionada — mostrando configuración genérica" type="info" />
        </div>
      )}

      {/* No outputs */}
      {!outputsExist && (
        <div className="px-4 mb-4">
          <WarningBanner message="Sin equipo seleccionado — agregá tops, subs o monitores en el Armador de Equipo" type="warning" />
        </div>
      )}

      {/* Tab navigation */}
      <div className="px-4 mb-4">
        <div className="flex gap-1 bg-secondary border border-border rounded-2xl p-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className="flex-1 rounded-xl py-2 text-[11px] font-bold transition-all cursor-pointer"
              style={activeTab === tab.id ? {
                background: T.gold,
                color: "#FFFFFF",
                boxShadow: "0 4px 14px rgba(0,255,102,0.35)",
              } : {
                color: "rgba(244,244,244,0.5)",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Output selector (shown for main/eq/delay tabs) */}
      {outputsExist && ["main", "eq", "delay"].includes(activeTab) && (
        <div className="px-4 mb-4">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {dsp!.outputs.map((out, i) => {
              const color = getOutputColor(out.id);
              const active = selectedOutput === i;
              return (
                <button
                  key={out.id}
                  onClick={() => setSelectedOutput(i)}
                  className="shrink-0 rounded-xl border px-3 pt-2 pb-1.5 text-left transition-all cursor-pointer min-w-[80px]"
                  style={active ? {
                    background: `${color}1A`,
                    borderColor: `${color}44`,
                    boxShadow: `0 2px 12px ${color}22`,
                  } : {
                    background: "var(--card)",
                    borderColor: "rgba(255,255,255,0.08)",
                  }}
                >
                  <p className="text-xs font-medium leading-none mb-0.5" style={{ color: active ? color : "rgba(244,244,244,0.5)" }}>
                    {out.label}
                  </p>
                  <p className="text-[9px] text-muted-foreground truncate mb-1.5">{out.destination}</p>
                  {/* Mini EQ sparkline */}
                  <div className="opacity-80">
                    <MiniEQSparkline bands={out.eq} color={active ? color : "rgba(244,244,244,0.3)"} />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.15 }}
          className="px-4"
        >
          {activeTab === "main" && output && <MainTab output={output} slope={xover.slope} />}
          {activeTab === "main" && !output && (
            <p className="text-xs text-muted-foreground text-center py-8">Sin salidas configuradas</p>
          )}

          {activeTab === "xover" && dsp && <XoverTab outputs={dsp.outputs} />}

          {activeTab === "eq" && output && <EQTab output={output} />}
          {activeTab === "eq" && !output && (
            <p className="text-xs text-muted-foreground text-center py-8">Sin salida seleccionada</p>
          )}

          {activeTab === "dynamics" && dsp && <DynamicsTab outputs={dsp.outputs} />}

          {activeTab === "delay" && dsp && <DelayTab outputs={dsp.outputs} tempC={room?.temperature ?? 20} />}
        </motion.div>
      </AnimatePresence>

      {/* System notes */}
      {dsp && dsp.notes.length > 0 && (
        <div className="px-4 pt-4 pb-4">
          <GlassCard className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info size={13} className="text-muted-foreground" />
              <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">Notas del Sistema</p>
            </div>
            <div className="space-y-2">
              {dsp.notes.map((note, i) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <p className="text-xs text-foreground/70 leading-relaxed">{note}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Reset hint */}
      {outputsExist && (
        <div className="px-4 pb-6">
          <button className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs text-muted-foreground hover:text-foreground hover:border-accent/40 transition-all cursor-pointer">
            <RotateCcw size={12} />
            Regenerar DSP desde Escaneo de Sala
          </button>
        </div>
      )}

      <ShareDspModal
        open={shareOpen}
        outputs={dsp?.outputs ?? []}
        dspModel={dsp?.dspModel ?? "Genérico"}
        onClose={() => setShareOpen(false)}
      />
    </ScreenShell>
  );
}
