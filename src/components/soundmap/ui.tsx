// SoundMap UI Components — Dark Premium Design System
// Near-black canvas, dark surfaces, bold orange accent, large rounded floating cards.
import { cn } from "@/lib/utils.ts";
import { type ReactNode } from "react";

// ── Glass Card ────────────────────────────────────────────────────────────────
type GlowTone = "accent" | "info" | "dsp" | "live" | "warning";
interface GlassCardProps {
  children: ReactNode;
  className?: string;
  glow?: boolean | GlowTone;
  onClick?: () => void;
  "data-testid"?: string;
}
export function GlassCard({ children, className, glow, onClick, ...rest }: GlassCardProps) {
  return (
    <div
      onClick={onClick}
      data-testid={rest["data-testid"]}
      className={cn(
        "relative rounded-2xl",
        onClick && "cursor-pointer",
        className,
      )}
      style={{
        background: "rgba(255,255,255,0.02)",
        boxShadow: glow
          ? "0 12px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)"
          : "0 0 0 1px rgba(255,255,255,0.05)",
        transition: onClick ? "background-color 0.3s ease, box-shadow 0.3s ease" : undefined,
      }}
    >
      {children}
    </div>
  );
}

// ── Dashboard Card (colored hero/widget card, like the reference metric tiles) ──
type CardTone = "accent" | "info" | "dsp" | "live" | "warning" | "white" | "dark" | "neutral" | "surface";
// Estas tarjetas tenían FONDO SÓLIDO en verde neón, teal, violeta y magenta.
// El rediseño pide lo contrario: el acento nunca es fondo general, y hay un
// solo acento. Ahora todas son superficies oscuras y el tono se comunica en el
// texto y en el hairline — que es donde no compite con el contenido.
const CARD_TONES: Record<CardTone, string> = {
  accent:  "bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--accent-ring)]",
  info:    "bg-[var(--surface-2)] text-[var(--info)] border border-[var(--border)]",
  dsp:     "bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]",
  live:    "bg-[var(--surface-2)] text-[var(--accent)] border border-[var(--border)]",
  warning: "bg-[var(--surface-2)] text-[var(--warning)] border border-[var(--border)]",
  white:   "bg-[var(--surface-3)] text-[var(--foreground)] border border-[var(--border)]",
  dark:    "bg-[var(--surface-1)] text-[var(--foreground)] border border-[var(--border)]",
  neutral: "bg-[var(--surface-2)] text-[var(--foreground)] border border-[var(--border)]",
  surface: "bg-[var(--surface-1)] text-foreground border border-[var(--border)]",
};
interface DashboardCardProps {
  children: ReactNode;
  tone?: CardTone;
  className?: string;
  onClick?: () => void;
}
export function DashboardCard({ children, tone = "surface", className, onClick }: DashboardCardProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "rounded-3xl p-5 shadow-[0_8px_28px_rgba(0,0,0,0.30)]",
        CARD_TONES[tone],
        onClick && "cursor-pointer transition-all duration-200 active:scale-[0.99]",
        className
      )}
    >
      {children}
    </div>
  );
}

// ── Metric Card ───────────────────────────────────────────────────────────────
interface MetricCardProps {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
  accent?: boolean;
  className?: string;
}
export function MetricCard({ label, value, unit, sub, accent, className }: MetricCardProps) {
  return (
    <GlassCard className={cn("p-4", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-muted-foreground mb-1">{label}</p>
      <div className="flex items-end gap-1">
        <span className={cn("text-2xl font-bold leading-none", accent ? "text-accent" : "text-foreground")}>
          {value}
        </span>
        {unit && <span className="text-xs text-muted-foreground mb-0.5">{unit}</span>}
      </div>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </GlassCard>
  );
}

// ── Audio Metric Card (colored tile + label + value + mini visual) ──────────────
interface AudioMetricCardProps {
  icon: ReactNode;
  value: string | number;
  unit?: string;
  label: string;
  tone?: CardTone;
  chart?: ReactNode;
  className?: string;
  onClick?: () => void;
}
export function AudioMetricCard({ icon, value, unit, label, tone = "surface", chart, className, onClick }: AudioMetricCardProps) {
  const dark = tone === "surface";
  return (
    <DashboardCard tone={tone} className={cn("flex flex-col gap-3 overflow-hidden", className)} onClick={onClick}>
      <div className="flex items-start justify-between">
        <div className={cn(
          "h-9 w-9 rounded-full flex items-center justify-center shrink-0",
          dark ? "bg-secondary text-foreground" : "bg-black/15"
        )}>
          {icon}
        </div>
        <div className="text-right">
          <div className="flex items-end justify-end gap-1">
            <span className="text-xl font-medium leading-none">{value}</span>
            {unit && <span className="text-[11px] font-semibold opacity-70 mb-0.5">{unit}</span>}
          </div>
          <p className={cn("text-[11px] font-medium mt-0.5", dark ? "text-muted-foreground" : "opacity-70")}>{label}</p>
        </div>
      </div>
      {chart && <div className="mt-1">{chart}</div>}
    </DashboardCard>
  );
}

// ── Chart Card (surface card wrapper with header + chart body) ──────────────────
interface ChartCardProps {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}
export function ChartCard({ title, subtitle, action, children, className }: ChartCardProps) {
  return (
    <GlassCard className={cn("p-5", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4">
          <div>
            {title && <h3 className="text-sm font-bold text-foreground">{title}</h3>}
            {subtitle && <p className="text-[11px] text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </GlassCard>
  );
}

// ── Action Card (icon + title + sub, tappable row/tile) ─────────────────────────
interface ActionCardProps {
  icon: ReactNode;
  title: string;
  sub?: string;
  tone?: CardTone;
  onClick?: () => void;
  active?: boolean;
  className?: string;
}
export function ActionCard({ icon, title, sub, tone = "surface", onClick, active, className }: ActionCardProps) {
  if (tone !== "surface") {
    return (
      <DashboardCard tone={tone} className={cn("flex items-center gap-3", className)} onClick={onClick}>
        <div className="h-10 w-10 rounded-full bg-black/15 flex items-center justify-center shrink-0">{icon}</div>
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{title}</p>
          {sub && <p className="text-[11px] opacity-70 truncate">{sub}</p>}
        </div>
      </DashboardCard>
    );
  }
  return (
    <GlassCard
      onClick={onClick}
      glow={active}
      className={cn("p-4 flex items-center gap-3", active && "border-accent/40", className)}
    >
      <div className={cn(
        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
        active ? "bg-accent/15 text-accent" : "bg-secondary text-foreground"
      )}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold text-foreground truncate">{title}</p>
        {sub && <p className="text-[11px] text-muted-foreground truncate">{sub}</p>}
      </div>
    </GlassCard>
  );
}

// ── Status Pill ───────────────────────────────────────────────────────────────
type StatusType = "ready" | "standby" | "live" | "warning" | "error" | "offline" | "info" | "dsp";
interface StatusPillProps {
  status: StatusType;
  label?: string;
  className?: string;
}
const STATUS_CONFIG: Record<StatusType, { color: string; dot: string; text: string }> = {
  ready:   { color: "bg-accent/12 border-accent/30",        dot: "bg-accent",        text: "text-accent" },
  standby: { color: "bg-warning/12 border-warning/30",      dot: "bg-warning",       text: "text-warning" },
  live:    { color: "bg-live/12 border-live/30",            dot: "bg-live live-pulse", text: "text-live" },
  warning: { color: "bg-warning/12 border-warning/30",      dot: "bg-warning",       text: "text-warning" },
  error:   { color: "bg-destructive/12 border-destructive/30", dot: "bg-destructive", text: "text-destructive" },
  offline: { color: "bg-secondary border-border",           dot: "bg-muted-foreground", text: "text-muted-foreground" },
  info:    { color: "bg-info/12 border-info/30",            dot: "bg-info",          text: "text-info" },
  dsp:     { color: "bg-dsp/12 border-dsp/30",              dot: "bg-dsp",           text: "text-dsp" },
};
export function StatusPill({ status, label, className }: StatusPillProps) {
  const cfg = STATUS_CONFIG[status];
  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.16em]", cfg.color, className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      <span className={cfg.text}>{label ?? status.toUpperCase()}</span>
    </div>
  );
}

// ── Pro Button (+ PrimaryButton / SecondaryButton aliases) ──────────────────────
interface ProButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
  fullWidth?: boolean;
  "data-testid"?: string;
}
export function ProButton({ children, onClick, variant = "primary", size = "md", className, disabled, type = "button", fullWidth, ...rest }: ProButtonProps) {
  const base = "inline-flex items-center justify-center gap-2 rounded-full font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-white text-[#09090b] hover:bg-white/90",
    ghost: "text-foreground hover:text-foreground",
    danger: "text-[#FF6B4A]",
  };
  const variantStyle: Record<string, React.CSSProperties> = {
    primary: { transition: "background-color 0.3s ease" },
    ghost: {
      background: "rgba(255,255,255,0.03)",
      boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
      transition: "background-color 0.3s ease, color 0.3s ease",
    },
    danger: {
      background: "rgba(180,92,110,0.08)",
      boxShadow: "0 0 0 1px rgba(180,92,110,0.35)",
      transition: "background-color 0.3s ease",
    },
  };
  const sizes = {
    sm: "text-[12px] px-3.5 py-1.5",
    md: "text-[13px] px-4 py-2.5",
    lg: "text-[14px] px-5 py-3",
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      data-testid={rest["data-testid"]}
      className={cn(base, variants[variant], sizes[size], fullWidth && "w-full", className)}
      style={variantStyle[variant]}
    >
      {children}
    </button>
  );
}
export function PrimaryButton(props: Omit<ProButtonProps, "variant">) {
  return <ProButton {...props} variant="primary" />;
}
export function SecondaryButton(props: Omit<ProButtonProps, "variant">) {
  return <ProButton {...props} variant="ghost" />;
}

// ── Progress Ring ─────────────────────────────────────────────────────────────
interface ProgressRingProps {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  label?: string;
  sublabel?: string;
}
export function ProgressRing({ value, size = 80, stroke = 6, color = "var(--accent)", trackColor = "rgba(255,255,255,0.08)", label, sublabel }: ProgressRingProps) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        {label && <span className="text-sm font-bold text-foreground leading-none">{label}</span>}
        {sublabel && <span className="text-[9px] text-muted-foreground uppercase tracking-[0.16em] mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}

// ── Audio Meter ───────────────────────────────────────────────────────────────
interface AudioMeterProps {
  value: number; // 0-100
  label?: string;
  vertical?: boolean;
  className?: string;
}
export function AudioMeter({ value, label, vertical, className }: AudioMeterProps) {
  // Multi-band color: green in nominal range, amber approaching limit, magenta hot, red clip
  const color = value > 92 ? "var(--destructive)" : value > 85 ? "var(--destructive)" : value > 70 ? "var(--warning)" : "var(--accent)";
  if (vertical) {
    return (
      <div className={cn("flex flex-col items-center gap-1", className)}>
        <div className="h-16 w-2 bg-secondary rounded-full overflow-hidden flex flex-col-reverse">
          <div
            className="w-full rounded-full transition-all duration-300"
            style={{ height: `${value}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}66` }}
          />
        </div>
        {label && <span className="text-[10px] text-muted-foreground">{label}</span>}
      </div>
    );
  }
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {label && <span className="text-[11px] text-muted-foreground w-16 truncate">{label}</span>}
      <div className="flex-1 h-1.5 bg-secondary rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${value}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}66` }}
        />
      </div>
      <span className="text-[10px] text-muted-foreground w-8 text-right font-mono">{(value / 100 * -60 + 0).toFixed(1)}</span>
    </div>
  );
}

// ── Section Header / Section Title ──────────────────────────────────────────────
interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
}
export function SectionHeader({ title, subtitle, action }: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-4">
      <div>
        <h2 className="text-base font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// "See all" style section title used on dashboards
interface SectionTitleProps {
  title: string;
  action?: ReactNode;
  className?: string;
}
export function SectionTitle({ title, action, className }: SectionTitleProps) {
  return (
    <div className={cn("flex items-center justify-between mb-3", className)}>
      <h2 className="text-lg font-bold text-foreground tracking-tight">{title}</h2>
      {action}
    </div>
  );
}

// ── Warning Banner ────────────────────────────────────────────────────────────
interface WarningBannerProps {
  message: string;
  type?: "warning" | "error" | "info";
}
export function WarningBanner({ message, type = "warning" }: WarningBannerProps) {
  const cfg = {
    warning: "bg-accent/10 border-accent/25 text-accent",
    error: "bg-destructive/12 border-destructive/30 text-destructive",
    info: "bg-white/[0.03] border-white/[0.06] text-muted-foreground",
  };
  return (
    <div className={cn("rounded-2xl border px-4 py-3 text-xs font-medium", cfg[type])}>
      {message}
    </div>
  );
}

// ── Screen Shell ──────────────────────────────────────────────────────────────
interface ScreenShellProps {
  children: ReactNode;
  className?: string;
  compact?: boolean;
}
export function ScreenShell({ children, className, compact }: ScreenShellProps) {
  return (
    <div
      className={cn(
        compact
          ? "bg-background text-foreground px-5 md:px-8 pt-2 pb-4"
          : "min-h-screen bg-background text-foreground px-6 md:px-12 pt-10 md:pt-16 pb-24",
        className,
      )}
    >
      <div className={compact ? "max-w-3xl mx-auto" : "max-w-4xl mx-auto"}>
        {children}
      </div>
    </div>
  );
}

// ── Badge ─────────────────────────────────────────────────────────────────────
interface BadgeProps {
  children: ReactNode;
  color?: "accent" | "info" | "dsp" | "live" | "warning" | "green" | "gray"
        | "orange" | "purple" | "blue" | "red"; // legacy aliases (mapped below)
  className?: string;
  "data-testid"?: string;
}
const BADGE_COLORS: Record<NonNullable<BadgeProps["color"]>, string> = {
  accent:  "bg-accent/12 text-accent border-accent/30",
  info:    "bg-info/12 text-info border-info/30",
  dsp:     "bg-dsp/12 text-dsp border-dsp/30",
  live:    "bg-live/12 text-live border-live/30",
  warning: "bg-warning/12 text-warning border-warning/30",
  green:   "bg-accent/12 text-accent border-accent/30",
  gray:    "bg-secondary text-secondary-foreground border-border",
  // legacy → semantic v4
  orange:  "bg-warning/12 text-warning border-warning/30",
  purple:  "bg-dsp/12 text-dsp border-dsp/30",
  blue:    "bg-info/12 text-info border-info/30",
  red:     "bg-destructive/12 text-destructive border-destructive/30",
};
export function Badge({ children, color = "gray", className, ...rest }: BadgeProps) {
  return (
    <span
      data-testid={rest["data-testid"]}
      className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.14em]", BADGE_COLORS[color], className)}
    >
      {children}
    </span>
  );
}

// ── Circular icon button (rounded header buttons, e.g. bell) ────────────────────
interface IconButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  dot?: boolean;
  "aria-label"?: string;
}
export function IconButton({ children, onClick, className, dot, ...rest }: IconButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative h-11 w-11 rounded-full bg-card border border-border flex items-center justify-center text-foreground transition-all duration-200 hover:border-white/15 active:scale-95 cursor-pointer",
        className
      )}
      {...rest}
    >
      {children}
      {dot && <span className="absolute top-2.5 right-2.5 h-2 w-2 rounded-full bg-accent ring-2 ring-card" />}
    </button>
  );
}

// ── EQ Graph ──────────────────────────────────────────────────────────────────
export function EQGraph({ className }: { className?: string }) {
  // Simple decorative EQ curve visualization
  const width = 280;
  const height = 80;
  const points = [
    [0, 60], [20, 55], [40, 45], [60, 50], [80, 40], [100, 35],
    [120, 42], [140, 38], [160, 36], [180, 40], [200, 38], [220, 42],
    [240, 50], [260, 55], [280, 58],
  ];
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"} ${p[0]} ${p[1]}`).join(" ");
  const fillD = pathD + ` L ${width} ${height} L 0 ${height} Z`;

  return (
    <div className={cn("relative overflow-hidden rounded-2xl", className)}>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-20">
        <defs>
          <linearGradient id="eq-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.40" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={fillD} fill="url(#eq-fill)" />
        <path d={pathD} fill="none" stroke="var(--accent)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {/* Frequency markers */}
        {[20, 100, 1000, 10000, 20000].map((f, i) => {
          const x = (i / 4) * width;
          return (
            <line key={f} x1={x} y1={0} x2={x} y2={height} stroke="rgba(255,255,255,0.06)" strokeWidth="1" />
          );
        })}
      </svg>
      {/* Freq labels */}
      <div className="flex justify-between px-1 mt-1">
        {["20", "100", "1k", "10k", "20k"].map(f => (
          <span key={f} className="text-[10px] font-mono text-muted-foreground">{f}</span>
        ))}
      </div>
    </div>
  );
}

// ── Mini bar chart (like the reference heart-rate / sleep bars) ─────────────────
interface MiniBarsProps {
  data: number[]; // 0-100
  color?: string;
  className?: string;
  highlightIndex?: number;
}
export function MiniBars({ data, color = "currentColor", className, highlightIndex }: MiniBarsProps) {
  return (
    <div className={cn("flex items-end gap-1 h-12", className)}>
      {data.map((v, i) => (
        <div
          key={i}
          className="flex-1 rounded-full transition-all duration-300"
          style={{
            height: `${Math.max(8, v)}%`,
            backgroundColor: color,
            opacity: highlightIndex === undefined ? 1 : highlightIndex === i ? 1 : 0.35,
          }}
        />
      ))}
    </div>
  );
}
