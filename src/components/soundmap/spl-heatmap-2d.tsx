// SplHeatmap2D — SVG-based 2D visualisation of a SplGrid.
// Used in Compare A/B and other places where a full 3D canvas is overkill.
import type { SplGrid } from "@/lib/audio/spl-grid.ts";

interface Props {
  grid: SplGrid;
  /** Rendering mode:
   *  - "absolute": color by absolute SPL (default palette).
   *  - "delta":    color by signed dB delta (red=louder, blue=quieter).
   */
  mode?: "absolute" | "delta";
  /** Extra tailwind classes for the wrapping <svg>. */
  className?: string;
  "data-testid"?: string;
}

/**
 * Color por SPL, en escala RELATIVA al rango del propio grid.
 *
 * Antes esto usaba umbrales absolutos fijos (>108 rojo, >102 naranja, >96
 * ámbar…). El problema es que un PA bien dimensionado entrega 100-115 dB en
 * toda la platea: **todas las celdas caían en el tramo naranja/rojo** y el mapa
 * quedaba saturado, sin distinguir nada.
 *
 * Un mapa de cobertura no responde "¿cuántos dB hay acá?" — para eso está la
 * lectura numérica. Responde "¿dónde hay MÁS y dónde MENOS?". Por eso la escala
 * se normaliza contra el `min`/`max` reales del grid: el contraste aparece
 * donde de verdad hay variación.
 *
 * Los datos no se tocan: `computeSplGrid` entrega los mismos valores. Lo único
 * que cambia es cómo se mapean a color.
 *
 * `span` es el rango real en dB. Si es muy chico (sistema homogéneo), se aplica
 * un piso para no amplificar ruido numérico y pintar diferencias inexistentes.
 */
function absoluteColor(spl: number, min: number, span: number): string {
  // t ∈ [0,1] — 0 es la zona más floja del recinto, 1 la más caliente.
  const t = span > 0 ? Math.min(1, Math.max(0, (spl - min) / span)) : 0.5;

  // Rampa fría → acento → cálida. El lime marca la zona bien cubierta; el
  // naranja/rojo queda reservado al 15 % superior, para que signifique algo.
  if (t > 0.85) return "var(--destructive)";
  if (t > 0.70) return "var(--sm-warm)";
  if (t > 0.55) return "var(--warning)";
  if (t > 0.38) return "var(--accent)";
  if (t > 0.24) return "var(--info)";
  if (t > 0.12) return "var(--sm-blue)";
  return "#1E2A3D";
}

/**
 * Rango mínimo (dB) sobre el que se normaliza.
 * Por debajo de esto el sistema es homogéneo de verdad y estirar la escala sólo
 * inventaría contraste donde no lo hay.
 */
const MIN_SPAN_DB = 6;

/** Diverging palette: red (delta > 0), blue (delta < 0), grey (~0). */
function deltaColor(delta: number): string {
  const abs = Math.abs(delta);
  if (abs < 1)  return "#2A3038";
  if (abs < 3)  return delta > 0 ? "#5EEAD466" : "#4A6BFF66";
  if (abs < 6)  return delta > 0 ? "var(--warning)"   : "var(--sm-blue)";
  if (abs < 10) return delta > 0 ? "var(--sm-warm)"   : "#5D7CE0";
  return delta > 0 ? "var(--destructive)" : "#7A5EF0";
}

export function SplHeatmap2D({ grid, mode = "absolute", className, ...rest }: Props) {
  const { cols, rows, cells } = grid;
  // Rango real del grid, con piso para no amplificar diferencias irrelevantes.
  const span = Math.max(MIN_SPAN_DB, grid.max - grid.min);
  const floor = grid.max - span;
  // Aspect ratio: preserve grid proportions.
  const cellW = 100 / cols;
  const cellH = 100 / rows;
  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className={className}
      data-testid={rest["data-testid"]}
    >
      {/* Background */}
      <rect x="0" y="0" width="100" height="100" fill="#0A0D10" />
      {/* Cells */}
      {cells.map((v, i) => {
        const r = Math.floor(i / cols);
        const c = i % cols;
        const fill = mode === "delta" ? deltaColor(v) : absoluteColor(v, floor, span);
        return (
          <rect
            key={i}
            x={c * cellW}
            y={r * cellH}
            width={cellW * 1.02}
            height={cellH * 1.02}
            fill={fill}
            opacity={0.9}
          />
        );
      })}
      {/* Stage marker (top edge = stage side) */}
      <rect x="0" y="0" width="100" height="3" fill="#3A4048" />
      <text x="50" y="2.2" fontSize="2.2" fill="var(--foreground)" textAnchor="middle" fontWeight="bold" fontFamily="monospace">
        STAGE
      </text>
    </svg>
  );
}
