// SoundMap Design System — controles, estado y estructura.
//
// Completa `primitives.tsx` con lo que pedía el brief del design system:
// §11 sistema de botones completo, §15 estado, §18 tipos de card, §19 listas.
//
// Regla del brief que guía todo esto: "No convertir todos los botones en pills."
// El pill se reserva para la acción primaria de una pantalla. Todo lo demás usa
// `--radius-control`, que es lo que hace que la interfaz se sienta precisa en
// vez de blanda.
import type { ReactNode, ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils.ts";

/* ═══════════════════════════ §11 Botones ═══════════════════════════ */

export type ButtonVariant = "primary" | "secondary" | "ghost" | "destructive";
export type ButtonSize = "compact" | "default" | "large";

const SIZE: Record<ButtonSize, { h: string; px: string; text: string }> = {
  compact: { h: "var(--control-h-sm)", px: "12px", text: "12px" },
  default: { h: "var(--control-h)",    px: "18px", text: "13px" },
  large:   { h: "var(--control-h-lg)", px: "24px", text: "14px" },
};

const VARIANT: Record<ButtonVariant, React.CSSProperties> = {
  primary:     { background: "var(--accent)", color: "var(--accent-foreground)" },
  secondary:   { background: "transparent", color: "var(--foreground)", boxShadow: "0 0 0 1px var(--border)" },
  ghost:       { background: "transparent", color: "var(--muted-foreground)" },
  destructive: { background: "transparent", color: "var(--destructive)", boxShadow: "0 0 0 1px rgba(255,107,74,0.30)" },
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Ocupa el ancho disponible. */
  block?: boolean;
  /** Sólo la acción primaria de una pantalla debería llevar pill. */
  pill?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "secondary", size = "default", block, pill, className, children, ...rest
}: ButtonProps) {
  const s = SIZE[size];
  return (
    <button
      {...rest}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium cursor-pointer whitespace-nowrap",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        "focus-visible:outline-none focus-visible:ring-2",
        block && "w-full",
        className,
      )}
      style={{
        height: s.h,
        paddingInline: s.px,
        fontSize: s.text,
        borderRadius: pill ? "var(--radius-pill)" : "var(--radius-control)",
        transition: "opacity var(--dur-fast) var(--ease), box-shadow var(--dur-fast) var(--ease)",
        ...VARIANT[variant],
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}

/**
 * Botón sólo-icono. `label` es obligatorio y sirve de `aria-label` y `title`:
 * el tipo hace imposible crear uno inaccesible por descuido.
 */
export function IconBtn({
  label, size = "default", variant = "ghost", className, children, ...rest
}: Omit<ButtonProps, "children" | "block" | "pill"> & { label: string; children: ReactNode }) {
  const h = SIZE[size].h;
  return (
    <button
      {...rest}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center cursor-pointer shrink-0",
        "disabled:opacity-40 disabled:cursor-not-allowed",
        className,
      )}
      style={{
        height: h, width: h,
        borderRadius: "var(--radius-control)",
        transition: "background var(--dur-fast) var(--ease), color var(--dur-fast) var(--ease)",
        ...VARIANT[variant],
        ...rest.style,
      }}
    >
      {children}
    </button>
  );
}

/* ═══════════════════════════ §15 Estado ═══════════════════════════ */

export type SystemStatus =
  | "live" | "optimized" | "healthy" | "warning" | "offline" | "processing" | "analyzing";

const STATUS_META: Record<SystemStatus, { label: string; color: string; pulse: boolean }> = {
  live:       { label: "En vivo",    color: "var(--accent)",           pulse: true },
  optimized:  { label: "Optimizado", color: "var(--accent)",           pulse: false },
  healthy:    { label: "Correcto",   color: "var(--accent)",           pulse: false },
  warning:    { label: "Atención",   color: "var(--warning)",          pulse: false },
  offline:    { label: "Sin señal",  color: "var(--muted-foreground)", pulse: false },
  processing: { label: "Procesando", color: "var(--info)",             pulse: true },
  analyzing:  { label: "Analizando", color: "var(--info)",             pulse: true },
};

/**
 * Indicador de estado: un punto de 6 px y una etiqueta.
 * El brief pide "pequeños indicadores, no enormes badges" — por eso no hay
 * fondo ni borde. El color del punto ya comunica; repetirlo en un chip relleno
 * sería decirlo dos veces.
 */
export function StatusDot({
  status, showLabel = true, label, className, testId,
}: {
  status: SystemStatus;
  showLabel?: boolean;
  /** Sobrescribe el texto por defecto. */
  label?: string;
  className?: string;
  testId?: string;
}) {
  const meta = STATUS_META[status];
  return (
    <span
      data-testid={testId}
      className={cn("inline-flex items-center gap-2 whitespace-nowrap", className)}
    >
      <span
        className={cn("h-1.5 w-1.5 rounded-full shrink-0", meta.pulse && "live-pulse")}
        style={{ background: meta.color }}
        aria-hidden="true"
      />
      {showLabel && (
        <span className="t-label" style={{ color: "var(--muted-foreground)" }}>
          {label ?? meta.label}
        </span>
      )}
      <span className="sr-only">{label ?? meta.label}</span>
    </span>
  );
}

/* ═══════════════════════════ §19 Listas ═══════════════════════════ */

/**
 * Contenedor de lista. El brief es explícito: "las listas deben sentirse más
 * importantes que las cards para información estructurada". Sin caja alrededor
 * — la estructura la dan los divisores entre filas.
 */
export function List({ children, className, testId }: { children: ReactNode; className?: string; testId?: string }) {
  return <div data-testid={testId} className={cn("w-full", className)} role="list">{children}</div>;
}

export interface ListRowProps {
  /** Icono o avatar a la izquierda. */
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Datos técnicos o acciones a la derecha. */
  trailing?: ReactNode;
  onClick?: () => void;
  /** Divisor inferior. `false` en la última fila. */
  divider?: boolean;
  className?: string;
  testId?: string;
}

export function ListRow({
  leading, title, subtitle, trailing, onClick, divider = true, className, testId,
}: ListRowProps) {
  const interactive = typeof onClick === "function";
  return (
    <div role="listitem" className={className}>
      <div
        onClick={onClick}
        role={interactive ? "button" : undefined}
        tabIndex={interactive ? 0 : undefined}
        onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
        data-testid={testId}
        className={cn(
          "group flex items-center gap-4 py-3.5 px-3 -mx-3",
          interactive && "cursor-pointer",
        )}
        style={{
          borderRadius: "var(--radius-control)",
          transition: "background var(--dur-fast) var(--ease)",
        }}
        onMouseEnter={interactive ? (e) => { e.currentTarget.style.background = "var(--surface-1)"; } : undefined}
        onMouseLeave={interactive ? (e) => { e.currentTarget.style.background = "transparent"; } : undefined}
      >
        {leading && <div className="shrink-0">{leading}</div>}
        <div className="min-w-0 flex-1">
          <div className="t-body font-medium text-foreground truncate leading-tight">{title}</div>
          {subtitle && (
            <div className="t-caption mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
              {subtitle}
            </div>
          )}
        </div>
        {trailing && <div className="shrink-0 flex items-center gap-3">{trailing}</div>}
      </div>
      {divider && <div className="h-px" style={{ background: "var(--border-subtle)" }} />}
    </div>
  );
}

/** Icono cuadrado para el `leading` de una fila. */
export function ListIcon({
  children, tone = "neutral",
}: { children: ReactNode; tone?: "neutral" | "accent" | "warning" }) {
  const color = tone === "accent" ? "var(--accent)" : tone === "warning" ? "var(--warning)" : "var(--muted-foreground)";
  const bg = tone === "accent" ? "var(--accent-dim)" : "var(--surface-2)";
  return (
    <span
      className="h-9 w-9 flex items-center justify-center"
      style={{ borderRadius: "var(--radius-chip)", background: bg, color }}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

/* ═══════════════════════════ §20 IA ═══════════════════════════ */

/**
 * Recomendación de SoundMap Intelligence.
 *
 * El brief: "No quiero un chatbot genérico. Las recomendaciones deben estar
 * relacionadas con el sistema actual." Por eso el componente obliga a separar
 * el HALLAZGO de la ACCIÓN: si no se puede formular una acción concreta, es un
 * comentario, no una recomendación.
 */
export function Recommendation({
  finding, action, onApply, onAnalyze, impact = "medium", testId,
}: {
  /** Qué detectó. Ej: "El cruce sub/top genera una interacción en 100 Hz." */
  finding: ReactNode;
  /** Qué hacer. Ej: "Mover el cruce a 110 Hz." */
  action?: ReactNode;
  onApply?: () => void;
  onAnalyze?: () => void;
  impact?: "high" | "medium" | "low";
  testId?: string;
}) {
  const impactColor =
    impact === "high" ? "var(--warning)" : impact === "low" ? "var(--muted-foreground)" : "var(--info)";
  return (
    <div
      data-testid={testId}
      className="p-4"
      style={{
        borderRadius: "var(--radius-card)",
        background: "var(--surface-1)",
        boxShadow: "var(--elev-1)",
      }}
    >
      <p className="t-small text-foreground leading-relaxed">{finding}</p>
      {action && (
        <p className="t-small mt-2.5 leading-relaxed" style={{ color: "var(--accent)" }}>
          {action}
        </p>
      )}
      <div className="flex items-center gap-2 mt-4">
        {onApply && (
          <Button variant="primary" size="compact" onClick={onApply} data-testid={testId ? `${testId}-apply` : undefined}>
            Aplicar
          </Button>
        )}
        {onAnalyze && (
          <Button variant="ghost" size="compact" onClick={onAnalyze}>
            Ver análisis
          </Button>
        )}
        <span className="t-caption ml-auto" style={{ color: impactColor }}>
          Impacto {impact === "high" ? "alto" : impact === "low" ? "bajo" : "medio"}
        </span>
      </div>
    </div>
  );
}
