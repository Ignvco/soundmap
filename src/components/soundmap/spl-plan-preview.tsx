import { useId } from "react";
import type { RoomScanInput } from "@/lib/audio/acoustics";
import { defaultReceiver } from "@/lib/audio/audit-evaluator";
import type { SplGrid } from "@/lib/audio/spl-grid";

/** Display the evaluator's samples; no interpolation or extra acoustic model. */
export function SplPlanPreview({
  room,
  grid,
  frequency,
}: {
  room: RoomScanInput;
  grid: SplGrid;
  frequency: number;
}) {
  const id = useId();
  const scale = Math.min(310 / room.width, 260 / room.length);
  const width = room.width * scale,
    height = room.length * scale;
  const left = (420 - width) / 2,
    top = (310 - height) / 2;
  const x = (v: number) => left + (v + room.width / 2) * scale;
  const z = (v: number) => top + (v + room.length / 2) * scale;
  const outline =
    room.geometry?.outline.map((p) => `${x(p.x)},${z(p.z)}`).join(" ") ??
    `${left},${top} ${left + width},${top} ${left + width},${top + height} ${left},${top + height}`;
  const dx = (grid.bounds.xMax - grid.bounds.xMin) / (grid.cols - 1);
  const dz = (grid.bounds.zMax - grid.bounds.zMin) / (grid.rows - 1);
  const receiver = defaultReceiver(room);
  // Same scale in cells and legend. A flat field uses the midpoint color.
  const colors = ["#233950", "#326b77", "#549b84", "#a1c879", "#e0ec7b"];
  const color = (value: number) => {
    const t =
      grid.max === grid.min
        ? 0.5
        : Math.max(0, Math.min(1, (value - grid.min) / (grid.max - grid.min)));
    return colors[Math.min(4, Math.floor(t * 5))];
  };
  return (
    <figure className="spl-plan" data-testid="spl-plan">
      <svg
        viewBox="0 0 420 344"
        role="img"
        aria-label={`SPL estimado a ${frequency} Hz, de ${grid.min.toFixed(1)} a ${grid.max.toFixed(1)} dB. Frente arriba; FOH marcado.`}
      >
        <defs>
          <clipPath id={`${id}-room`}>
            <polygon points={outline} />
          </clipPath>
        </defs>
        <polygon points={outline} fill="#111918" />
        <g clipPath={`url(#${id}-room)`}>
          {grid.cells.map((value, i) => {
            if (grid.validCells?.[i] === false) return null;
            return (
              <rect
                key={i}
                data-spl-cell={i}
                x={x(grid.bounds.xMin + (i % grid.cols) * dx - dx / 2)}
                y={z(
                  grid.bounds.zMin + Math.floor(i / grid.cols) * dz - dz / 2,
                )}
                width={dx * scale + 0.15}
                height={dz * scale + 0.15}
                fill={color(value)}
              >
                <title>{value.toFixed(1)} dB</title>
              </rect>
            );
          })}
        </g>
        <polygon
          points={outline}
          fill="none"
          stroke="#96a58d"
          strokeWidth="1"
        />
        <g transform={`translate(${x(receiver.x)} ${z(receiver.z)})`}>
          <circle r="6" fill="#111715" stroke="#fff" strokeWidth="1.5" />
          <path d="M-10 0H10 M0-10V10" stroke="#fff" />
          <text
            y="24"
            textAnchor="middle"
            fill="#fff"
            stroke="#111715"
            strokeWidth="3"
            paintOrder="stroke"
            fontSize="11"
          >
            FOH
          </text>
        </g>
        <text
          x="210"
          y={top - 10}
          textAnchor="middle"
          fill="#aeb7ac"
          fontSize="9"
          letterSpacing="3"
        >
          FRENTE
        </text>
        <text
          x="210"
          y={top + height + 22}
          textAnchor="middle"
          fill="#aeb7ac"
          fontSize="11"
        >
          {room.width} × {room.length} m
        </text>
      </svg>
      <figcaption>
        <div className="spl-plan-scale" aria-hidden="true">
          {colors.map((c) => (
            <span key={c} style={{ background: c }} />
          ))}
        </div>
        <div className="spl-plan-range">
          <span>{grid.min.toFixed(1)} dB</span>
          <span>{grid.max.toFixed(1)} dB</span>
        </div>
        <p>
          Escala relativa al rango actual ·{" "}
          {frequency >= 1000 ? `${frequency / 1000} kHz` : `${frequency} Hz`}
        </p>
      </figcaption>
    </figure>
  );
}
