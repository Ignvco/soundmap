import { EarlyReflectionsPanel } from "@/components/soundmap/early-reflections-panel.tsx";
import { GlassCard, ProButton } from "@/components/soundmap/ui.tsx";
import {
  type AcousticsResult,
  type CeilingType,
  type FloorType,
  type RoomMaterial,
  type RoomScanInput,
} from "@/lib/audio/acoustics.ts";
import { cn } from "@/lib/utils.ts";
import { ArrowRight, CheckCircle, Waves } from "lucide-react";
import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
export const GOLD = "var(--accent)";

export const GREEN = "var(--info)";

export const RED = "var(--destructive)";

export const PURPLE = "#9A9A9A";

export const AMBER = "#00D95A";

export type Step = 1 | 2 | 3 | 4;

export const CEILING_OPTIONS: {
  value: CeilingType;
  label: string;
  icon: string;
}[] = [
  { value: "flat", label: "Plano", icon: "▬" },
  { value: "vaulted", label: "Abovedado", icon: "⌒" },
  { value: "domed", label: "Cúpula", icon: "◡" },
  { value: "industrial", label: "Industrial", icon: "⋀" },
  { value: "acoustic-tile", label: "Placa acústica", icon: "▦" },
];

export const WALL_OPTIONS: { value: RoomMaterial; label: string }[] = [
  { value: "concrete", label: "Hormigón" },
  { value: "drywall", label: "Yeso" },
  { value: "brick", label: "Ladrillo" },
  { value: "wood", label: "Madera" },
  { value: "glass", label: "Vidrio" },
  { value: "carpet", label: "Alfombra" },
  { value: "foam", label: "Espuma" },
];

export const FLOOR_OPTIONS: { value: FloorType; label: string }[] = [
  { value: "concrete", label: "Hormigón" },
  { value: "tile", label: "Baldosa" },
  { value: "wood", label: "Madera" },
  { value: "carpet", label: "Alfombra" },
];

export function WaveformViz({
  active,
  progress,
}: {
  active: boolean;
  progress: number;
}) {
  const BAR_COUNT = 32;
  return (
    <div className="flex items-center justify-center gap-[2px] h-12">
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const baseH = Math.abs(Math.sin(phase)) * 60 + 10;
        const scanInfluence = active
          ? Math.abs(Math.sin(phase + progress * 0.2)) * 80 + 10
          : baseH * 0.3;
        const height = active ? scanInfluence : baseH * 0.3;
        const color = active
          ? i / BAR_COUNT < progress / 100
            ? GOLD
            : "rgba(0,255,102,0.25)"
          : "rgba(255,255,255,0.10)";
        return (
          <motion.div
            key={i}
            className="rounded-full w-[3px]"
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.15, delay: i * 0.01 }}
            style={{ backgroundColor: color, minHeight: 3 }}
          />
        );
      })}
    </div>
  );
}

export function ScannerRing({
  progress,
  scanning,
}: {
  progress: number;
  scanning: boolean;
}) {
  const size = 200;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  const { t } = useTranslation();
  // Phase label sequence
  const phases = [
    t("room_scan.phase0"),
    t("room_scan.phase1"),
    t("room_scan.phase2"),
    t("room_scan.phase3"),
    t("room_scan.phase4"),
  ];
  const phaseIdx = Math.min(Math.floor(progress / 20), phases.length - 1);

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      {scanning && (
        <>
          <motion.div
            className="absolute rounded-full border border-accent/15"
            style={{ width: size + 40, height: size + 40 }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.15, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute rounded-full border border-accent/10"
            style={{ width: size + 70, height: size + 70 }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.08, 0.25] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          />
        </>
      )}

      {/* SVG rings */}
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={stroke}
        />
        {/* Inner decorative ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r - 18}
          fill="none"
          stroke="rgba(0,255,102,0.18)"
          strokeWidth={1}
          strokeDasharray="4 6"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={scanning ? GOLD : "rgba(0,255,102,0.45)"}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{
            filter: scanning
              ? "drop-shadow(0 0 6px rgba(0,255,102,0.45))"
              : "none",
            transition: "stroke-dashoffset 0.3s ease",
          }}
        />
        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i / 36) * 360;
          const rad = (angle * Math.PI) / 180;
          const x1 = size / 2 + (r + 4) * Math.cos(rad);
          const y1 = size / 2 + (r + 4) * Math.sin(rad);
          const x2 = size / 2 + (r + 8) * Math.cos(rad);
          const y2 = size / 2 + (r + 8) * Math.sin(rad);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke={
                i % 3 === 0 ? "rgba(0,255,102,0.4)" : "rgba(255,255,255,0.08)"
              }
              strokeWidth={i % 3 === 0 ? 2 : 1}
            />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute flex flex-col items-center gap-1">
        {scanning ? (
          <>
            <motion.span
              className="text-3xl font-bold text-foreground"
              key={Math.floor(progress)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.1 }}
            >
              {Math.round(progress)}
              <span className="text-sm text-muted-foreground">%</span>
            </motion.span>
            <span className="text-[10px] text-accent font-semibold uppercase tracking-[0.2em] text-center px-4">
              {phases[phaseIdx]}
            </span>
          </>
        ) : (
          <>
            <Waves size={28} className="text-accent" />
            <span className="text-xs text-muted-foreground font-semibold mt-1">
              {t("room_scan.ready")}
            </span>
          </>
        )}
      </div>
    </div>
  );
}

export function AcousticBar({
  label,
  value,
  max,
  color,
  unit,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  unit?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">
          {value}
          {unit ?? ""}
        </span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

export function ScoreRing({
  value,
  label,
  color,
}: {
  value: number;
  label: string;
  color: string;
}) {
  const size = 72;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="rgba(255,255,255,0.07)"
            strokeWidth={stroke}
          />
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">
        {label}
      </span>
    </div>
  );
}

export function MaterialChip({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <motion.button
      onClick={onClick}
      whileTap={{ scale: 0.95 }}
      className={cn(
        "rounded-xl px-3 py-2.5 text-xs font-medium transition-all cursor-pointer",
        selected
          ? "bg-accent/12 text-accent"
          : "bg-white/[0.02] text-muted-foreground hover:text-foreground",
      )}
      style={{
        boxShadow: selected
          ? "0 0 0 1px rgba(201,240,62,0.35)"
          : "0 0 0 1px rgba(255,255,255,0.05)",
      }}
    >
      {label}
    </motion.button>
  );
}

export function NumInput({
  label,
  value,
  onChange,
  suffix,
  step = 1,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: number;
}) {
  return (
    <div className="rounded-2xl bg-secondary/50 border border-border p-3 flex flex-col gap-1">
      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
        {label}
      </span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - step))}
          className="h-8 w-8 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-accent/15 hover:text-accent active:scale-90 transition-all shrink-0"
        >
          −
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="flex-1 bg-transparent text-center text-sm font-bold text-foreground focus:outline-none min-w-0"
        />
        <button
          onClick={() => onChange(value + step)}
          className="h-8 w-8 rounded-lg bg-secondary text-secondary-foreground font-bold text-sm flex items-center justify-center cursor-pointer hover:bg-accent/15 hover:text-accent active:scale-90 transition-all shrink-0"
        >
          +
        </button>
        {suffix && (
          <span className="text-[11px] text-muted-foreground w-4 shrink-0">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

export function ResultsPanel({
  result,
  room,
  venueName,
  onContinue,
}: {
  result: AcousticsResult;
  /** Necesario para las reflexiones tempranas: dependen de la geometría, no del RT60. */
  room: RoomScanInput;
  venueName: string;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const rt60Color =
    result.rt60Audience < 0.8
      ? GREEN
      : result.rt60Audience < 1.5
        ? GREEN
        : result.rt60Audience < 2.5
          ? AMBER
          : RED;
  const echoColor =
    result.echoRisk === "low"
      ? GREEN
      : result.echoRisk === "medium"
        ? AMBER
        : RED;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Success header */}
      <div className="flex items-center gap-3 px-1">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="h-8 w-8 rounded-full bg-chart-2/15 flex items-center justify-center"
        >
          <CheckCircle size={18} className="text-chart-2" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-chart-2">
            {t("room_scan.scan_complete")}
          </p>
          <p className="text-[11px] text-muted-foreground">{venueName}</p>
        </div>
      </div>

      {/* Primary metrics — big display */}
      <div className="grid grid-cols-2 gap-3">
        {[
          {
            label: "RT60 Empty",
            value: result.rt60Empty,
            unit: "s",
            color: GREEN,
          },
          {
            label: "RT60 + Audience",
            value: result.rt60Audience,
            unit: "s",
            color: GOLD,
          },
          { label: "Volume", value: result.volume, unit: "m³", color: PURPLE },
          {
            label: "Critical Distance",
            value: result.criticalDistance,
            unit: "m",
            color: AMBER,
          },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <GlassCard className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1">
                {m.label}
              </p>
              <div className="flex items-end gap-1">
                <span
                  className="text-2xl font-bold leading-none"
                  style={{ color: m.color }}
                >
                  {m.value}
                </span>
                <span className="text-xs text-muted-foreground mb-0.5">
                  {m.unit}
                </span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Scores */}
      <GlassCard className="p-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-4">
          {t("room_scan.acoustic_scores")}
        </p>
        <div className="flex justify-around">
          <ScoreRing
            value={result.speechScore}
            label={t("room_scan.speech")}
            color={GREEN}
          />
          <ScoreRing
            value={result.musicScore}
            label={t("room_scan.music")}
            color={PURPLE}
          />
          <ScoreRing
            value={Math.round(100 - (result.rt60Audience / 4) * 100)}
            label={t("room_scan.clarity")}
            color={AMBER}
          />
        </div>
      </GlassCard>

      {/* Frequency & modal analysis */}
      <GlassCard className="p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1">
          {t("room_scan.freq_analysis")}
        </p>
        <AcousticBar
          label="Schroeder Frequency"
          value={result.schroederFreq}
          max={500}
          color={PURPLE}
          unit=" Hz"
        />
        <AcousticBar
          label="Axial Mode X"
          value={result.axialModes.x}
          max={200}
          color={GOLD}
          unit=" Hz"
        />
        <AcousticBar
          label="Axial Mode Y"
          value={result.axialModes.y}
          max={200}
          color={GREEN}
          unit=" Hz"
        />
        <AcousticBar
          label="Axial Mode Z"
          value={result.axialModes.z}
          max={200}
          color={AMBER}
          unit=" Hz"
        />
      </GlassCard>

      {/* Reflexiones tempranas — conecta calculateEarlyReflections, que estaba
          implementado y correcto pero sin ninguna pantalla que lo llamara. */}
      <EarlyReflectionsPanel room={room} />

      {/* Risk indicators */}
      <GlassCard className="p-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">
          {t("room_scan.risk_assessment")}
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Echo Risk", value: result.echoRisk, color: echoColor },
            {
              label: "RT60",
              value: `${result.rt60Audience}s`,
              color: rt60Color,
            },
            {
              label: "Flutter Echo",
              value: result.flutterEchoRisk ? "Risk" : "Clear",
              color: result.flutterEchoRisk ? AMBER : GREEN,
            },
            {
              label: "SBIR",
              value: result.sbirRisk ? "Risk" : "Clear",
              color: result.sbirRisk ? AMBER : GREEN,
            },
            {
              label: "Low-Mid Buildup",
              value: result.lowMidBuildupRisk ? "Likely" : "Clear",
              color: result.lowMidBuildupRisk ? RED : GREEN,
            },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-xl bg-secondary/50 border border-border p-2.5"
            >
              <p className="text-[10px] text-muted-foreground mb-0.5">
                {item.label}
              </p>
              <p
                className="text-xs font-bold capitalize"
                style={{ color: item.color }}
              >
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recommendations */}
      <GlassCard className="p-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">
          {t("room_scan.engineer_notes")}
        </p>
        <div className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              className="flex items-start gap-2.5"
            >
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              <p className="text-xs text-secondary-foreground leading-relaxed">
                {rec}
              </p>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* CTA */}
      <ProButton fullWidth size="lg" onClick={onContinue}>
        {t("room_scan.continue_gear")} <ArrowRight size={16} />
      </ProButton>
    </motion.div>
  );
}
