// SoundMap Vitals — primitivas de superficie, acción y feedback.
//
// Por qué existe este archivo
// ---------------------------
// El proyecto tenía DOS librerías haciendo lo mismo: `components/soundmap/ui.tsx`
// (v4, 20 exports, 9 páginas) y `components/soundmap/vitals/` (v5, 3 páginas).
// Dos páginas mezclaban ambas y seis no usaban ninguna: 322 estilos inline y 33
// radios escritos a mano.
//
// Este módulo completa `vitals/` con lo que le faltaba para poder reemplazar a
// `ui.tsx`, para que haya UN solo vocabulario:
//
//   Superficie → Card, Panel, Hairline
//   Acción     → PrimaryButton, SecondaryButton, IconButton
//   Feedback   → StatusPill, WarningBanner, EmptyState, Skeleton
//   Layout     → ScreenShell, SectionHeader
//
// Regla: una tarjeta de métrica (`StatCard`), no cuatro. Un `ProgressRing`, no
// dos. Si necesitás una variante, agregá una prop — no un componente nuevo.
import { type ReactNode, type ButtonHTMLAttributes } from "react";
import { AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils.ts";

/* ─────────────────────────── Superficie ─────────────────────────── */

export type CardTone = "default" | "raised" | "accent" | "warning";

const CARD_TONE: Record<CardTone, { background: string; boxShadow: string }> = {
  default: { background: "var(--sm-card)", boxShadow: "var(--elev-1)" },
  raised:  { background: "var(--sm-card-alt)", boxShadow: "var(--elev-2)" },
  accent:  { background: "var(--sm-accent-dim)", boxShadow: "var(--elev-accent)" },
  warning: { background: "rgba(245,182,46,0.10)", boxShadow: "0 0 0 1px rgba(245,182,46,0.30)" },
};

/**
 * Superficie base de la app. Reemplaza a `GlassCard`, `DashboardCard` y a los
 * ~90 `<div style={{ background: "var(--sm-card)", borderRadius: "18px" }}>`
 * repetidos por las páginas.
 */
export function Card({
  tone = "default", padded = true, className, children, testId, onClick,
}: {
  tone?: CardTone;
  /** `false` cuando el contenido maneja su propio padding (tablas, listas). */
  padded?: boolean;
  className?: string;
  children: ReactNode;
  testId?: string;
  onClick?: () => void;
}) {
  const interactive = typeof onClick === "function";
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      data-testid={testId}
      className={cn(padded && "p-5", interactive && "cursor-pointer", className)}
      style={{ borderRadius: "var(--radius-card)", ...CARD_TONE[tone] }}
    >
      {children}
    </div>
  );
}

/** Separador de 1px coherente con el hairline del sistema. */
export function Hairline({ className }: { className?: string }) {
  return <div className={cn("h-px w-full", className)} style={{ background: "var(--sm-hairline)" }} />;
}

/* ─────────────────────────── Layout ─────────────────────────── */

/**
 * Contenedor de pantalla. Centraliza el ancho máximo y el padding lateral, que
 * hoy están repetidos con valores distintos en cada página.
 */
export function ScreenShell({
  children, width = "default", className,
}: {
  children: ReactNode;
  width?: "default" | "wide" | "narrow";
  className?: string;
}) {
  const max = width === "wide" ? "max-w-5xl" : width === "narrow" ? "max-w-xl" : "max-w-3xl";
  return <div className={cn(max, "mx-auto px-5 md:px-8", className)}>{children}</div>;
}

/** Encabezado de sección con acción opcional a la derecha. */
export function SectionHeader({
  title, subtitle, right, className,
}: {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4", className)}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-medium tracking-[-0.01em] text-foreground">{title}</h2>
        {subtitle && <p className="text-[12px] text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

/* ─────────────────────────── Acción ───────────────────────────
   Los botones viven en `controls.tsx` (§11 del design system: primary,
   secondary, ghost, destructive × compact/default/large).

   Acá había tres implementaciones propias — `PrimaryButton`, `SecondaryButton`,
   `IconButton` — que hacían lo mismo con otros valores. Es exactamente el
   "10 componentes visualmente distintos que hacen lo mismo" que el brief
   prohíbe, y lo introduje yo al crear `controls.tsx`.

   Se conservan los nombres como envoltorios finos para no romper los ~20 sitios
   que ya los importan, pero hay UNA sola implementación debajo. */
import { Button, IconBtn } from "./controls.tsx";

export function PrimaryButton({ block, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; block?: boolean }) {
  return <Button variant="primary" pill block={block} {...rest}>{children}</Button>;
}

export function SecondaryButton({ block, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; block?: boolean }) {
  return <Button variant="secondary" pill block={block} {...rest}>{children}</Button>;
}

export function IconButton({ label, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return <IconBtn label={label} {...rest}>{children}</IconBtn>;
}

/* ─────────────────────────── Feedback ─────────────────────────── */

export type StatusTone = "ok" | "warn" | "danger" | "info" | "neutral";

const STATUS_TONE: Record<StatusTone, { color: string; background: string }> = {
  ok:      { color: "var(--sm-accent)", background: "var(--sm-accent-dim)" },
  warn:    { color: "var(--sm-amber)",  background: "rgba(245,182,46,0.14)" },
  danger:  { color: "var(--sm-warm)",   background: "rgba(255,107,74,0.14)" },
  info:    { color: "var(--sm-blue)",   background: "rgba(74,107,255,0.14)" },
  neutral: { color: "var(--sm-muted)",  background: "rgba(255,255,255,0.05)" },
};

export function StatusPill({
  tone = "neutral", children, testId,
}: { tone?: StatusTone; children: ReactNode; testId?: string }) {
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium whitespace-nowrap"
      style={{ borderRadius: "var(--radius-pill)", ...STATUS_TONE[tone] }}
    >
      {children}
    </span>
  );
}

/** Aviso persistente. Para advertencias del motor, no para errores de red. */
export function WarningBanner({
  tone = "warn", title, children, testId,
}: { tone?: "warn" | "info"; title?: string; children: ReactNode; testId?: string }) {
  const Icon = tone === "info" ? Info : AlertTriangle;
  const color = tone === "info" ? "var(--sm-blue)" : "var(--sm-amber)";
  return (
    <div
      data-testid={testId}
      role="status"
      className="flex items-start gap-3 p-4"
      style={{
        borderRadius: "var(--radius-card)",
        background: tone === "info" ? "rgba(74,107,255,0.08)" : "rgba(245,182,46,0.08)",
        boxShadow: `0 0 0 1px ${color}33`,
      }}
    >
      <Icon size={15} strokeWidth={2} style={{ color, flexShrink: 0, marginTop: 1 }} />
      <div className="min-w-0 text-[13px] leading-relaxed">
        {title && <p className="font-medium text-foreground mb-0.5">{title}</p>}
        <div className="text-muted-foreground">{children}</div>
      </div>
    </div>
  );
}

/**
 * Estado vacío. `action` es lo que hace que la app diga *hacia dónde ir* en vez
 * de dejar una pantalla en blanco.
 */
export function EmptyState({
  icon, title, description, action, testId,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  testId?: string;
}) {
  return (
    <div data-testid={testId} className="flex flex-col items-center text-center py-14 px-6">
      {icon && (
        <div
          className="h-11 w-11 rounded-full flex items-center justify-center mb-4"
          style={{ background: "var(--sm-accent-dim)", color: "var(--sm-accent)" }}
        >
          {icon}
        </div>
      )}
      <p className="text-[15px] font-medium text-foreground">{title}</p>
      {description && <p className="text-[13px] text-muted-foreground mt-1.5 max-w-sm leading-relaxed">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/** Placeholder de carga. Reserva el alto para que el layout no salte. */
export function Skeleton({ height = 80, className }: { height?: number; className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("shimmer", className)}
      style={{ height, borderRadius: "var(--radius-card)", background: "var(--sm-card)" }}
    />
  );
}
