// SoundMap Vitals — data-viz primitives inspired by Kalo + fitness dashboards.
// All components render on the pure-dark base and use the lime accent
// (`--sm-accent = var(--sm-accent)`) with warm/blue secondaries for delta signal.
import { type ReactNode } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, Flame, Plus } from "lucide-react";
import { cn } from "@/lib/utils.ts";

// ── Design tokens (mirror CSS vars for TS access) ──────────────────────────
export const V = {
  accent: "var(--sm-accent)",
  accentDim: "rgba(201,240,62,0.15)",
  accentRing: "rgba(201,240,62,0.45)",
  amber: "var(--sm-amber)",
  warm: "var(--sm-warm)",
  blue: "var(--sm-blue)",
  card: "#131316",
  cardAlt: "#1B1B1F",
  hairline: "#1E1E22",
  muted: "var(--sm-muted)",
} as const;

// ── DeltaChip — up/down comparison indicator ───────────────────────────────
export function DeltaChip({
  value, unit, label = "vs last week", tone,
}: {
  /** Signed number; positive means up. */
  value: number;
  unit?: string;
  label?: string;
  /** "auto" flips down=warm, up=accent. "good"/"bad" force. */
  tone?: "auto" | "good" | "bad";
}) {
  const isDown = value < 0;
  const abs = Math.abs(value);
  const resolvedTone = tone ?? "auto";
  const hue = resolvedTone === "bad" ? V.warm
    : resolvedTone === "good" ? V.accent
    : isDown ? V.warm : V.accent;
  const Arrow = isDown ? ArrowDown : ArrowUp;
  return (
    <div className="flex flex-col items-end gap-1" data-testid="delta-chip">
      <span
        className="inline-flex items-center gap-1 text-[13px] font-medium tabular-nums"
        style={{ color: hue }}
      >
        <Arrow size={12} strokeWidth={2.5} />
        {abs}{unit && <span className="ml-0.5">{unit}</span>}
      </span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

// ── StatCard — big number + optional delta + optional inline visual ────────
export function StatCard({
  label, value, unit, delta, extra, children, className, testId,
}: {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: number; unit?: string; label?: string; tone?: "auto" | "good" | "bad" };
  /** Bottom-left small block (e.g. "kcal avg" text). */
  extra?: ReactNode;
  /** Chart/visual rendered below the number row. */
  children?: ReactNode;
  className?: string;
  testId?: string;
}) {
  return (
    <div
      data-testid={testId}
      className={cn("rounded-2xl p-5", className)}
      style={{
        background: V.card,
        boxShadow: `0 0 0 1px ${V.hairline}`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground font-medium leading-tight">{label}</p>
          <div className="mt-1.5 flex items-baseline gap-1.5">
            <span
              className="font-mono tabular-nums text-foreground leading-none"
              style={{ fontSize: "clamp(1.75rem, 3vw, 2.25rem)", letterSpacing: "-0.03em" }}
            >
              {value}
            </span>
            {unit && <span className="text-[13px] text-muted-foreground font-medium">{unit}</span>}
          </div>
          {extra && <div className="mt-1 text-[11px] text-muted-foreground">{extra}</div>}
        </div>
        {delta && <DeltaChip {...delta} />}
      </div>
      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}

// ── TimeRangeTabs — Kalo-style Week/Month/3M/Year pill ────────────────────
export type TimeRange = "week" | "month" | "3months" | "year";
export function TimeRangeTabs({
  value, onChange, options, testId = "time-range-tabs",
}: {
  value: TimeRange;
  onChange: (v: TimeRange) => void;
  options?: { value: TimeRange; label: string }[];
  testId?: string;
}) {
  const opts = options ?? [
    { value: "week", label: "Week" },
    { value: "month", label: "Month" },
    { value: "3months", label: "3 Months" },
    { value: "year", label: "Year" },
  ] as { value: TimeRange; label: string }[];
  return (
    <div className="inline-flex items-center gap-1" data-testid={testId}>
      {opts.map(opt => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => onChange(opt.value)}
            data-testid={`${testId}-${opt.value}`}
            className={cn(
              "rounded-md px-4 py-2 text-[13px] font-medium cursor-pointer",
              on ? "text-[#09090b]" : "text-muted-foreground hover:text-foreground",
            )}
            style={{
              background: on ? V.accent : "transparent",
              transition: "background-color 0.3s ease, color 0.3s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── StreakChip — round pill with count + icon (top-right meta) ─────────────
export function StreakChip({
  count, label = "días", tone = "amber", testId = "streak-chip",
}: {
  count: number;
  label?: string;
  tone?: "amber" | "accent";
  testId?: string;
}) {
  const hue = tone === "accent" ? V.accent : V.amber;
  return (
    <div
      data-testid={testId}
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
      style={{
        background: `${hue}18`,
        boxShadow: `0 0 0 1px ${hue}44`,
        color: hue,
      }}
    >
      <Flame size={12} strokeWidth={2} />
      <span className="font-mono tabular-nums text-[13px] font-medium">{count}</span>
      <span className="text-[11px] opacity-80 font-medium">{label}</span>
    </div>
  );
}

// ── PersonaGreeting — "Hola, [name]" + subtitle (top of AI Home) ───────────
export function PersonaGreeting({
  name, subtitle, wave = true, testId = "persona-greeting",
}: {
  name: string;
  subtitle?: string;
  wave?: boolean;
  testId?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      data-testid={testId}
    >
      <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-2">
        Hola{wave ? " 👋" : ""}
      </p>
      <h1
        className="v6-heading"
        data-testid="persona-name"
      >
        {name}
      </h1>
      {subtitle && (
        <p className="text-[15px] text-muted-foreground mt-2 leading-relaxed max-w-md">
          {subtitle}
        </p>
      )}
    </motion.div>
  );
}

// ── ProgressRing — small radial progress (streak/goal) ─────────────────────
export function ProgressRing({
  value, size = 56, thickness = 5, color = V.accent, children,
}: {
  /** 0..1 */
  value: number;
  size?: number;
  thickness?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - thickness) / 2;
  const c = 2 * Math.PI * r;
  const dash = c * Math.max(0, Math.min(1, value));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="rotate-[-90deg]">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={V.hairline} strokeWidth={thickness} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={thickness}
          strokeDasharray={`${dash} ${c}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.6s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">{children}</div>
    </div>
  );
}

// ── FabButton — Kalo-style central action ─────────────────────────────────
export function FabButton({
  onClick, ariaLabel = "Nueva acción", testId = "fab-button", children,
}: {
  onClick?: () => void;
  ariaLabel?: string;
  testId?: string;
  children?: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      data-testid={testId}
      className="h-14 w-14 rounded-full flex items-center justify-center cursor-pointer"
      style={{
        background: V.accent,
        color: "var(--background)",
        boxShadow: `0 12px 32px -8px ${V.accentRing}, 0 0 0 6px rgba(201, 240, 62, 0.06)`,
        transition: "transform 0.2s ease, box-shadow 0.3s ease",
      }}
      onMouseDown={(e) => (e.currentTarget.style.transform = "scale(0.94)")}
      onMouseUp={(e) => (e.currentTarget.style.transform = "scale(1)")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "scale(1)")}
    >
      {children ?? <Plus size={22} strokeWidth={2.5} />}
    </button>
  );
}

// ── SectionEyebrow — small uppercase label ─────────────────────────────────
export function VitalsEyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("text-[11px] uppercase tracking-[0.24em] font-medium text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// Primitivas de superficie / acción / feedback. Se reexportan acá para que las
// páginas importen todo el sistema desde un solo lugar:
//   import { Card, StatCard, PrimaryButton } from "@/components/soundmap/vitals/index.tsx";
export {
  Card, Hairline, ScreenShell, SectionHeader,
  PrimaryButton, SecondaryButton, IconButton,
  StatusPill, WarningBanner, EmptyState, Skeleton,
  type CardTone, type StatusTone,
} from "./primitives.tsx";

// §11/15/19/20 del design system — controles, estado, listas e IA.
export {
  Button, IconBtn, StatusDot, List, ListRow, ListIcon, Recommendation,
  type ButtonVariant, type ButtonSize, type SystemStatus,
} from "./controls.tsx";

// §14 — métricas editoriales y estructura de sección.
export { Metric, MetricRow, SectionLabel, Divider, type MetricProps } from "./metric.tsx";
