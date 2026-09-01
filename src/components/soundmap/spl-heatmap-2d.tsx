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

/** Discrete SPL palette matching the Stage3D 3D map. */
function absoluteColor(spl: number): string {
  if (spl > 108) return "var(--destructive)";
  if (spl > 102) return "var(--sm-warm)";
  if (spl > 96)  return "var(--warning)";
  if (spl > 90)  return "var(--accent)";
  if (spl > 84)  return "var(--info)";
  if (spl > 78)  return "var(--sm-blue)";
  return "#2A3A55";
}

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
        const fill = mode === "delta" ? deltaColor(v) : absoluteColor(v);
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
