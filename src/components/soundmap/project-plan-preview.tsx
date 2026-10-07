import { useId, useMemo } from "react";
import type { RoomScanInput } from "@/lib/audio/acoustics";
import type { GearItem } from "@/lib/audio/pa-engine";
import { defaultReceiver } from "@/lib/audio/audit-evaluator";
import { venueSpeakers } from "@/lib/venue-visual";
import type { SpeakerLayout } from "@/lib/speaker-layout";

/** A plan of the current inventory; colors identify equipment, not SPL. */
export function ProjectPlanPreview({
  room,
  tops,
  subs,
  monitors,
  layout,
}: {
  room: RoomScanInput;
  tops: GearItem[];
  subs: GearItem[];
  monitors: GearItem[];
  layout: SpeakerLayout;
}) {
  const id = useId();
  const speakers = useMemo(
    () => venueSpeakers(room, tops, subs, monitors, layout),
    [room, tops, subs, monitors, layout],
  );
  const scale = Math.min(270 / room.width, 220 / room.length);
  const w = room.width * scale,
    h = room.length * scale;
  const left = (360 - w) / 2,
    top = (280 - h) / 2;
  const x = (value: number) => left + (value + room.width / 2) * scale;
  const z = (value: number) => top + (value + room.length / 2) * scale;
  const receiver = defaultReceiver(room);
  const outline =
    room.geometry?.outline.map((p) => `${x(p.x)},${z(p.z)}`).join(" ") ??
    `${left},${top} ${left + w},${top} ${left + w},${top + h} ${left},${top + h}`;
  return (
    <svg
      viewBox="0 0 360 280"
      className="project-plan-preview"
      role="img"
      aria-label={`Plano de ${room.name}, ${speakers.length} equipos; ${room.width} por ${room.length} metros. Colores por tipo de equipo.`}
    >
      <defs>
        <pattern
          id={`${id}-grid`}
          width={w / 8}
          height={h / 10}
          patternUnits="userSpaceOnUse"
          x={left}
          y={top}
        >
          <path
            d={`M ${w / 8} 0 H 0 V ${h / 10}`}
            fill="none"
            stroke="#4b5548"
            strokeWidth="0.6"
            opacity="0.45"
          />
        </pattern>
        <clipPath id={`${id}-clip`}>
          <polygon points={outline} />
        </clipPath>
      </defs>
      <polygon
        points={outline}
        fill="#151c17"
        stroke="#72846a"
        strokeWidth="1"
      />
      <g clipPath={`url(#${id}-clip)`}>
        <rect x={left} y={top} width={w} height={h} fill={`url(#${id}-grid)`} />
        {speakers.map((s) => (
          <g key={s.id} transform={`translate(${x(s.x)} ${z(s.z)})`}>
            <circle
              r="9"
              fill={s.kind === "subs" ? "#f5b62e" : "#c9f03e"}
              opacity="0.08"
            />
            <rect
              x="-2.5"
              y="-3"
              width="5"
              height="6"
              rx="1"
              fill={
                s.kind === "subs"
                  ? "#f5b62e"
                  : s.kind === "monitors"
                    ? "#7bc9d4"
                    : "#c9f03e"
              }
              transform={`rotate(${s.yawDeg ?? 0})`}
            />
            <title>
              {s.label} · {s.y.toFixed(2)} m de altura
            </title>
          </g>
        ))}
        <g transform={`translate(${x(receiver.x)} ${z(receiver.z)})`}>
          <circle r="5" fill="#0b0d0c" stroke="#d5ddd2" />
          <path d="M-9 0H9 M0-9V9" stroke="#d5ddd2" strokeWidth="0.7" />
          <text
            y="20"
            textAnchor="middle"
            fill="#d5ddd2"
            fontSize="8"
            letterSpacing="1"
          >
            FOH
          </text>
        </g>
      </g>
      <text
        x="180"
        y={top - 13}
        textAnchor="middle"
        fill="#b9c3b3"
        fontSize="8"
        letterSpacing="3"
      >
        FRENTE
      </text>
      <path
        d={`M${left} ${top + h + 11}H${left + w} M${left} ${top + h + 7}v8 M${left + w} ${top + h + 7}v8`}
        stroke="#697263"
        strokeWidth="0.6"
      />
      <text
        x="180"
        y={top + h + 25}
        textAnchor="middle"
        fill="#b9c3b3"
        fontSize="9"
      >
        {room.width} m
      </text>
      <text
        x={left + w + 16}
        y={top + h / 2}
        textAnchor="middle"
        fill="#b9c3b3"
        fontSize="9"
        transform={`rotate(90 ${left + w + 16} ${top + h / 2})`}
      >
        {room.length} m
      </text>
    </svg>
  );
}
