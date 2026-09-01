// Métricas editoriales.
//
// El rediseño pide eliminar el look de "card · card · card". Estas métricas son
// justamente donde más se notaba: cuatro tarjetas iguales compitiendo entre sí.
//
// Acá el número ES el elemento. Sin caja, sin borde, sin fondo — sólo tipografía
// y espacio. La jerarquía la da el tamaño (valor grande en mono, unidad chica,
// label diminuto en mayúsculas), no un contenedor.
//
// Los valores usan Geist Mono con `tabular-nums`: en un instrumento los dígitos
// no deben bailar cuando cambia la lectura.
import type { ReactNode } from "react";
import { cn } from "@/lib/utils.ts";

export interface MetricProps {
  /** El número, ya formateado. Ej: "102", "1.42", "+7.4". */
  value: string;
  /** Unidad corta que va pegada al número. Ej: "dB", "s", "%". */
  unit?: string;
  /** Etiqueta en mayúsculas debajo. Ej: "MAX SPL". */
  label: string;
  /** Color del valor. Por defecto el foreground — el acento se reserva. */
  tone?: "default" | "accent" | "warning" | "danger";
  size?: "lg" | "md";
  testId?: string;
}

const TONE: Record<NonNullable<MetricProps["tone"]>, string> = {
  default: "var(--foreground)",
  accent: "var(--accent)",
  warning: "var(--warning)",
  danger: "var(--destructive)",
};

export function Metric({ value, unit, label, tone = "default", size = "lg", testId }: MetricProps) {
  const valueSize = size === "lg" ? "text-[30px] md:text-[34px]" : "text-[22px] md:text-[24px]";
  return (
    <div data-testid={testId} className="min-w-0">
      <p
        className={cn(valueSize, "font-mono tabular-nums leading-none tracking-[-0.03em] truncate")}
        style={{ color: TONE[tone] }}
      >
        {value}
        {unit && (
          <span
            className="ml-1 font-sans font-normal tracking-normal"
            style={{
              fontSize: size === "lg" ? "0.44em" : "0.5em",
              color: tone === "default" ? "var(--muted-foreground)" : TONE[tone],
            }}
          >
            {unit}
          </span>
        )}
      </p>
      <p
        className="mt-2 text-[10px] font-medium uppercase tracking-[0.16em] truncate"
        style={{ color: "var(--muted-foreground)" }}
      >
        {label}
      </p>
    </div>
  );
}

/**
 * Fila de métricas separadas por hairlines verticales.
 * Es el patrón del mockup: los números conviven en una banda, no en cajas.
 */
export function MetricRow({
  children, className, testId,
}: { children: ReactNode; className?: string; testId?: string }) {
  return (
    <div
      data-testid={testId}
      className={cn("grid grid-cols-2 sm:grid-cols-4 gap-y-6", className)}
    >
      {children}
    </div>
  );
}

/** Encabezado de sección: label discreto + acción opcional a la derecha. */
export function SectionLabel({
  children, action, className,
}: { children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4 mb-4", className)}>
      <p
        className="text-[11px] font-medium uppercase tracking-[0.16em]"
        style={{ color: "var(--muted-foreground)" }}
      >
        {children}
      </p>
      {action}
    </div>
  );
}

/** Divisor de 1px. La estructura la dan las líneas, no los bordes de tarjeta. */
export function Divider({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn("h-px w-full", className)}
      style={{ background: "var(--border-subtle)" }}
    />
  );
}
