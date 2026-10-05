import { GlassCard } from "@/components/soundmap/ui.tsx";
import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import { type SplGrid } from "@/lib/audio/spl-grid.ts";
import type { StageConfig } from "@/lib/audio/stage-engine.ts";
import {
  maxSpeakerHeight,
  SPEAKER_COLORS,
  type CabinetType,
  type SpeakerPlacement,
} from "@/lib/speaker-layout.ts";
import { SPL_STOPS } from "@/lib/venue-visual.ts";
import { Info, Mic2, Radio, Speaker, Wand2, X } from "lucide-react";
import { motion } from "motion/react";
import { useId, useRef, useState } from "react";
import {
  type NormPin,
  type PinEvaluation,
  type Rating,
  type SystemEvaluation,
} from "./_lib/placement-evaluator.ts";
export interface SpeakerPin {
  id: string;
  label: string;
  type: "tops" | "subs" | "monitors" | "delay";
  x: number; // SVG pixels
  y: number;
  // derived from gear
  model: string;
  brand: string;
  splMax: number;
  coverageH: number;
  color: string;
  normX: number;
  normY: number;
  heightM: number;
  suggestedHeightM: number;
  cabinetType: CabinetType;
  aimAngleDeg: number; // direction the speaker faces (180 = audience, 0 = stage)
}

export const SPK_COLORS = SPEAKER_COLORS;

export const RATING_META: Record<Rating, { color: string; label: string }> = {
  ideal: { color: "#67C5F5", label: "Ideal" },
  buena: { color: "#A3E635", label: "Buena" },
  regular: { color: "#FBBF24", label: "Regular" },
  mala: { color: "#F87171", label: "Mala" },
};

export const CAD = {
  bg: "#050706",
  roomFill: "#111312",
  roomEdge: "rgba(255,255,255,0.28)",
  grid: "rgba(255,255,255,0.05)",
  stageFill: "rgba(255,255,255,0.05)",
  stageEdge: "rgba(255,255,255,0.14)",
  textHard: "rgba(255,255,255,0.55)",
  textSoft: "rgba(255,255,255,0.32)",
  textFaint: "rgba(255,255,255,0.18)",
  dimLine: "rgba(255,255,255,0.28)",
};

export function splFill(db: number) {
  const upper = SPL_STOPS.findIndex((s) => s.db >= db);
  if (upper <= 0)
    return SPL_STOPS[upper === 0 ? 0 : SPL_STOPS.length - 1].color;
  const a = SPL_STOPS[upper - 1],
    b = SPL_STOPS[upper],
    t = (db - a.db) / (b.db - a.db);
  const rgb = (hex: string) =>
    [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const ca = rgb(a.color),
    cb = rgb(b.color);
  return `rgb(${ca.map((v, i) => Math.round(v + (cb[i] - v) * t)).join(",")})`;
}

export function PositionField({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="text-[10px] text-muted-foreground">
      {label}
      <input
        key={value}
        aria-label={label}
        type="number"
        min={min}
        max={max}
        step="0.01"
        defaultValue={value.toFixed(2)}
        className="w-full mt-1 p-2.5 rounded-md border border-border bg-secondary text-foreground font-mono text-sm"
        onBlur={(e) => {
          const v = Number(e.target.value);
          if (e.target.value.trim() && Number.isFinite(v)) {
            const next = Math.max(min, Math.min(max, v));
            e.target.value = next.toFixed(2);
            onChange(next);
          } else e.target.value = value.toFixed(2);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
    </label>
  );
}

export const FP_W = 340;

export const FP_H = 460;

export const MARGIN = 32;

export interface Geometry {
  roomW: number;
  roomH: number;
  roomOriginX: number;
  roomOriginY: number;
}

export function computeGeometry(room: RoomScanInput): Geometry {
  const roomAspect = room.width / room.length;
  const availW = FP_W - MARGIN * 2;
  const availH = FP_H - MARGIN * 2;
  let roomW: number, roomH: number;
  if (roomAspect > availW / availH) {
    roomW = availW;
    roomH = availW / roomAspect;
  } else {
    roomH = availH;
    roomW = availH * roomAspect;
  }
  const roomOriginX = MARGIN + (availW - roomW) / 2;
  const roomOriginY = MARGIN + (availH - roomH) / 2;
  return { roomW, roomH, roomOriginX, roomOriginY };
}

export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function pxToNorm(x: number, y: number, geo: Geometry) {
  return {
    normX: ((x - geo.roomOriginX) / geo.roomW) * 100,
    normY: ((y - geo.roomOriginY) / geo.roomH) * 100,
  };
}

export function normToPx(normX: number, normY: number, geo: Geometry) {
  return {
    x: geo.roomOriginX + (normX / 100) * geo.roomW,
    y: geo.roomOriginY + (normY / 100) * geo.roomH,
  };
}

export function pinsToNorm(pins: SpeakerPin[], geo: Geometry): NormPin[] {
  return pins.map((pin) => {
    const { normX, normY } = pxToNorm(pin.x, pin.y, geo);
    return {
      id: pin.id,
      type: pin.type,
      normX,
      normY,
      splMax: pin.splMax,
      coverageH: pin.coverageH,
    };
  });
}

export function CoverageArc({
  pin,
  roomH,
}: {
  pin: SpeakerPin;
  roomH: number;
}) {
  // Subs: omnidirectional fill circle
  if (pin.type === "subs") {
    const r = roomH * 0.18;
    return (
      <circle
        cx={pin.x}
        cy={pin.y}
        r={r}
        fill={`${pin.color}12`}
        stroke={`${pin.color}30`}
        strokeWidth="1"
        strokeDasharray="4 4"
      />
    );
  }

  const halfA = (pin.coverageH / 2) * (Math.PI / 180);
  // Direction: aimAngleDeg=180 means pointing down (+Y in SVG)
  const aimRad = (pin.aimAngleDeg - 90) * (Math.PI / 180);
  const arcR = pin.type === "delay" ? roomH * 0.28 : roomH * 0.55;

  const x1 = pin.x + arcR * Math.cos(aimRad - halfA);
  const y1 = pin.y + arcR * Math.sin(aimRad - halfA);
  const x2 = pin.x + arcR * Math.cos(aimRad + halfA);
  const y2 = pin.y + arcR * Math.sin(aimRad + halfA);
  const largeArc = pin.coverageH > 180 ? 1 : 0;

  const fillPath = `M ${pin.x} ${pin.y} L ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${x2} ${y2} Z`;

  return (
    <g>
      {/* Fill */}
      <path d={fillPath} fill={`${pin.color}12`} />
      {/* Outer arc */}
      <path
        d={`M ${x1} ${y1} A ${arcR} ${arcR} 0 ${largeArc} 1 ${x2} ${y2}`}
        fill="none"
        stroke={`${pin.color}40`}
        strokeWidth="1"
        strokeDasharray="5 3"
      />
      {/* Side lines */}
      <line
        x1={pin.x}
        y1={pin.y}
        x2={x1}
        y2={y1}
        stroke={pin.color}
        strokeOpacity={0.18}
        strokeWidth="0.8"
      />
      <line
        x1={pin.x}
        y1={pin.y}
        x2={x2}
        y2={y2}
        stroke={pin.color}
        strokeOpacity={0.18}
        strokeWidth="0.8"
      />
    </g>
  );
}

export function SpeakerIcon({
  pin,
  isSelected,
  ratingColor,
}: {
  pin: SpeakerPin;
  isSelected: boolean;
  ratingColor: string | null;
}) {
  const S = pin.type === "subs" ? 10 : pin.type === "monitors" ? 7 : 9;
  const color = pin.color;
  const ring = "#FFFFFF";
  void ratingColor;

  return (
    <g>
      {/* Selection ring */}
      {isSelected && (
        <circle
          cx={pin.x}
          cy={pin.y}
          r={S + 8}
          fill="none"
          stroke={ring}
          strokeWidth="1.5"
          strokeOpacity="0.7"
          strokeDasharray="3 2"
        />
      )}
      {/* Glow */}
      <circle
        cx={pin.x}
        cy={pin.y}
        r={S + 3}
        fill={color}
        fillOpacity={isSelected ? 0.22 : 0.1}
      />
      {/* Body */}
      <rect
        x={pin.x - S * 0.7}
        y={pin.y - S}
        width={S * 1.4}
        height={S * 2}
        rx={pin.type === "subs" ? 2 : 3}
        fill={"#15191B"}
        stroke={color}
        strokeWidth={isSelected ? 2 : 1.5}
      />
      {pin.cabinetType === "line-array" && pin.type === "tops" && (
        <path
          d={`M ${pin.x - S * 0.7} ${pin.y - 3} h ${S * 1.4} M ${pin.x - S * 0.7} ${pin.y + 3} h ${S * 1.4}`}
          stroke={color}
          strokeWidth="1"
        />
      )}
      {/* Speaker cone dot */}
      <circle
        cx={pin.x}
        cy={pin.y}
        r={S * 0.35}
        fill={color}
        fillOpacity="0.95"
      />
    </g>
  );
}

export interface FloorPlanProps {
  room: RoomScanInput;
  config: StageConfig;
  geo: Geometry;
  pins: SpeakerPin[];
  pinEvals: Record<string, PinEvaluation>;
  grid?: SplGrid;
  layer: "direction" | "spl" | "none";
  selected: string | null;
  onSelect: (id: string | null) => void;
  onDragMove: (id: string, normX: number, normY: number) => void;
  onDragEnd: () => void;
  zoom: number;
}

export function FloorPlan({
  room,
  config,
  geo,
  pins,
  pinEvals,
  selected,
  onSelect,
  onDragMove,
  onDragEnd,
  zoom,
  grid,
  layer,
}: FloorPlanProps) {
  const { roomW, roomH, roomOriginX, roomOriginY } = geo;
  const clipId = useId();
  const gridId = useId();
  const stageH = roomH * 0.12;
  const mPerPx = room.length / roomH;
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{
    id: string;
    startClientX: number;
    startClientY: number;
    startPinX: number;
    startPinY: number;
    inverse: DOMMatrix;
    moved: boolean;
  } | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  // Scale ruler: aim for 2-5m increments
  const rulerM = room.length <= 15 ? 2 : room.length <= 30 ? 5 : 10;
  const rulerPx = rulerM / mPerPx;

  const handlePointerDown = (e: React.PointerEvent, pin: SpeakerPin) => {
    e.stopPropagation();
    const matrix = svgRef.current?.getScreenCTM();
    if (!matrix) return;
    const inverse = matrix.inverse();
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(inverse);
    dragRef.current = {
      id: pin.id,
      startClientX: point.x,
      startClientY: point.y,
      startPinX: pin.x,
      startPinY: pin.y,
      inverse,
      moved: false,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDraggingId(pin.id);
    onSelect(pin.id);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const ds = dragRef.current;
    if (!ds) return;
    const point = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      ds.inverse,
    );
    const dx = point.x - ds.startClientX;
    const dy = point.y - ds.startClientY;
    if (Math.abs(dx) > 1.5 || Math.abs(dy) > 1.5) ds.moved = true;
    const nx = clamp(ds.startPinX + dx, roomOriginX, roomOriginX + roomW);
    const ny = clamp(ds.startPinY + dy, roomOriginY, roomOriginY + roomH);
    const { normX, normY } = pxToNorm(nx, ny, geo);
    onDragMove(ds.id, normX, normY);
  };

  const handlePointerUp = () => {
    if (dragRef.current) {
      const moved = dragRef.current.moved;
      dragRef.current = null;
      setDraggingId(null);
      if (moved) onDragEnd();
    }
  };

  return (
    <svg
      ref={svgRef}
      width="100%"
      viewBox={`0 0 ${FP_W} ${FP_H}`}
      className="block touch-none select-none"
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: "top center",
        transition: "transform 0.2s ease",
      }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      onLostPointerCapture={handlePointerUp}
      aria-label="Plano 2D del recinto"
      data-testid="stage-floor-plan"
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={roomOriginX} y={roomOriginY} width={roomW} height={roomH} />
        </clipPath>
        {/* Grid pattern */}
        <pattern
          id={gridId}
          width={roomW / 5}
          height={roomH / 5}
          patternUnits="userSpaceOnUse"
          x={roomOriginX}
          y={roomOriginY}
        >
          <path
            d={`M ${roomW / 5} 0 L 0 0 0 ${roomH / 5}`}
            fill="none"
            stroke={CAD.grid}
            strokeWidth="0.5"
          />
        </pattern>
      </defs>

      {/* Background */}
      <rect width={FP_W} height={FP_H} fill={CAD.bg} />

      {/* Room outline */}
      <rect
        x={roomOriginX}
        y={roomOriginY}
        width={roomW}
        height={roomH}
        fill={CAD.roomFill}
        stroke={CAD.roomEdge}
        strokeWidth="1.5"
        rx="2"
      />

      {/* Room grid */}
      <rect
        x={roomOriginX}
        y={roomOriginY}
        width={roomW}
        height={roomH}
        fill={`url(#${gridId})`}
        rx="2"
      />

      {/* Stage area */}
      <rect
        x={roomOriginX}
        y={roomOriginY}
        width={roomW}
        height={stageH}
        fill={CAD.stageFill}
        stroke={CAD.stageEdge}
        strokeWidth="1"
        rx="2"
      />
      <text
        x={roomOriginX + roomW / 2}
        y={roomOriginY - 10}
        textAnchor="middle"
        fill={CAD.textHard}
        fontSize="7"
        fontWeight="700"
        letterSpacing="3"
      >
        ESCENARIO
      </text>

      {/* Audience area label */}
      <text
        x={roomOriginX + roomW / 2}
        y={roomOriginY + roomH - 6}
        textAnchor="middle"
        fill={CAD.textFaint}
        fontSize="7"
        fontWeight="600"
        letterSpacing="2"
      >
        PÚBLICO
      </text>

      <g clipPath={`url(#${clipId})`} pointerEvents="none">
        {layer === "spl" &&
          grid &&
          grid.cells.map((db, i) => {
            if (grid.validCells?.[i] === false) return null;
            const col = i % grid.cols,
              row = Math.floor(i / grid.cols);
            const wx =
              grid.bounds.xMin +
              (col / (grid.cols - 1)) * (grid.bounds.xMax - grid.bounds.xMin);
            const wz =
              grid.bounds.zMin +
              (row / (grid.rows - 1)) * (grid.bounds.zMax - grid.bounds.zMin);
            const cw =
              ((grid.bounds.xMax - grid.bounds.xMin) /
                (grid.cols - 1) /
                room.width) *
              roomW;
            const ch =
              ((grid.bounds.zMax - grid.bounds.zMin) /
                (grid.rows - 1) /
                room.length) *
              roomH;
            return (
              <rect
                key={i}
                x={roomOriginX + (wx / room.width + 0.5) * roomW - cw / 2}
                y={roomOriginY + (wz / room.length + 0.5) * roomH - ch / 2}
                width={cw + 0.2}
                height={ch + 0.2}
                fill={splFill(db)}
                fillOpacity={0.62}
              />
            );
          })}
        {layer === "direction" &&
          pins
            .filter((pin) =>
              selected ? pin.id === selected : pin.type === "tops",
            )
            .map((pin) => <CoverageArc key={pin.id} pin={pin} roomH={roomH} />)}
      </g>

      {/* Delay tower distance annotation */}
      {config.needsDelayTowers &&
        (() => {
          const delayPins = pins.filter((p) => p.type === "delay");
          if (delayPins.length < 2) return null;
          const midX = (delayPins[0].x + delayPins[1].x) / 2;
          const y = Math.max(delayPins[0].y, delayPins[1].y);
          return (
            <g>
              <line
                x1={delayPins[0].x}
                y1={y + 16}
                x2={delayPins[1].x}
                y2={y + 16}
                stroke={SPK_COLORS.delay}
                strokeWidth="0.8"
                strokeOpacity="0.6"
              />
              <text
                x={midX}
                y={y + 24}
                textAnchor="middle"
                fill={SPK_COLORS.delay}
                fontSize="7"
                fontWeight="bold"
              >
                torre de delay
              </text>
            </g>
          );
        })()}

      {/* Speaker pins */}
      {pins.map((pin) => {
        const ev = pinEvals[pin.id];
        const ratingColor = ev ? RATING_META[ev.rating].color : null;
        const isDragging = draggingId === pin.id;
        return (
          <g
            key={pin.id}
            role="button"
            tabIndex={0}
            aria-label={`Seleccionar ${pin.label}`}
            data-testid={`speaker-pin-${pin.id}`}
            data-height={pin.heightM}
            data-norm-x={pin.normX}
            data-norm-y={pin.normY}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(pin.id);
              }
            }}
            onPointerDown={(e) => handlePointerDown(e, pin)}
            style={{ cursor: isDragging ? "grabbing" : "grab" }}
          >
            <SpeakerIcon
              pin={pin}
              isSelected={selected === pin.id}
              ratingColor={ratingColor}
            />
            <text
              x={pin.x}
              y={pin.y + (pin.type === "monitors" ? -13 : 18)}
              textAnchor="middle"
              fill={pin.color}
              fontSize="8"
              fontWeight="700"
              letterSpacing="0.5"
              style={{ pointerEvents: "none" }}
            >
              {pin.label}
            </text>
          </g>
        );
      })}

      {/* Dimension labels */}
      {/* Width arrow at bottom */}
      <line
        x1={roomOriginX}
        y1={roomOriginY + roomH + 8}
        x2={roomOriginX + roomW}
        y2={roomOriginY + roomH + 8}
        stroke={CAD.dimLine}
        strokeWidth="0.8"
      />
      <line
        x1={roomOriginX}
        y1={roomOriginY + roomH + 4}
        x2={roomOriginX}
        y2={roomOriginY + roomH + 12}
        stroke={CAD.dimLine}
        strokeWidth="0.8"
      />
      <line
        x1={roomOriginX + roomW}
        y1={roomOriginY + roomH + 4}
        x2={roomOriginX + roomW}
        y2={roomOriginY + roomH + 12}
        stroke={CAD.dimLine}
        strokeWidth="0.8"
      />
      <text
        x={roomOriginX + roomW / 2}
        y={roomOriginY + roomH + 20}
        textAnchor="middle"
        fill={CAD.textHard}
        fontSize="8"
        fontFamily="monospace"
      >
        {room.width}m
      </text>

      {/* Height arrow at right */}
      <line
        x1={roomOriginX + roomW + 8}
        y1={roomOriginY}
        x2={roomOriginX + roomW + 8}
        y2={roomOriginY + roomH}
        stroke={CAD.dimLine}
        strokeWidth="0.8"
      />
      <line
        x1={roomOriginX + roomW + 4}
        y1={roomOriginY}
        x2={roomOriginX + roomW + 12}
        y2={roomOriginY}
        stroke={CAD.dimLine}
        strokeWidth="0.8"
      />
      <line
        x1={roomOriginX + roomW + 4}
        y1={roomOriginY + roomH}
        x2={roomOriginX + roomW + 12}
        y2={roomOriginY + roomH}
        stroke={CAD.dimLine}
        strokeWidth="0.8"
      />
      <text
        x={roomOriginX + roomW + 18}
        y={roomOriginY + roomH / 2 + 3}
        textAnchor="middle"
        fill={CAD.textHard}
        fontSize="8"
        fontFamily="monospace"
        transform={`rotate(90, ${roomOriginX + roomW + 18}, ${roomOriginY + roomH / 2})`}
      >
        {room.length}m
      </text>

      {/* Scale ruler (bottom-left) */}
      <line
        x1={MARGIN}
        y1={FP_H - 10}
        x2={MARGIN + rulerPx}
        y2={FP_H - 10}
        stroke={CAD.textHard}
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <line
        x1={MARGIN}
        y1={FP_H - 13}
        x2={MARGIN}
        y2={FP_H - 7}
        stroke={CAD.textHard}
        strokeWidth="1"
      />
      <line
        x1={MARGIN + rulerPx}
        y1={FP_H - 13}
        x2={MARGIN + rulerPx}
        y2={FP_H - 7}
        stroke={CAD.textHard}
        strokeWidth="1"
      />
      <text
        x={MARGIN + rulerPx / 2}
        y={FP_H - 2}
        textAnchor="middle"
        fill={CAD.textSoft}
        fontSize="7"
        fontFamily="monospace"
      >
        {rulerM}m
      </text>

      {/* North arrow */}
      <text
        x={FP_W - MARGIN + 2}
        y={FP_H - 4}
        textAnchor="middle"
        fill={CAD.textSoft}
        fontSize="7"
        fontWeight="bold"
      >
        FRENTE ↑
      </text>
    </svg>
  );
}

export function SpeakerDetail({
  pin,
  room,
  evaluation,
  onClose,
  onChange,
}: {
  pin: SpeakerPin;
  room: RoomScanInput;
  evaluation: PinEvaluation | null;
  onClose: () => void;
  onChange: (p: SpeakerPlacement) => void;
}) {
  const typeLabel: Record<SpeakerPin["type"], string> = {
    tops: "Tops Principales",
    subs: "Subwoofer",
    monitors: "Monitor de Escenario",
    delay: "Torre de Delay",
  };
  const ratingMeta = evaluation ? RATING_META[evaluation.rating] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 10 }}
      transition={{ duration: 0.18 }}
    >
      <GlassCard className="p-4 mx-4 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div
              className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: `${pin.color}18`,
                border: `1px solid ${pin.color}35`,
              }}
            >
              {pin.type === "tops" && (
                <Speaker size={16} style={{ color: pin.color }} />
              )}
              {pin.type === "subs" && (
                <Radio size={16} style={{ color: pin.color }} />
              )}
              {pin.type === "monitors" && (
                <Mic2 size={16} style={{ color: pin.color }} />
              )}
              {pin.type === "delay" && (
                <Speaker size={16} style={{ color: pin.color }} />
              )}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground leading-none">
                {pin.label}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: pin.color }}>
                {typeLabel[pin.type]}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="h-7 w-7 rounded-lg flex items-center justify-center bg-secondary hover:bg-secondary/70 transition-colors cursor-pointer"
          >
            <X size={13} className="text-muted-foreground" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-3">
          <PositionField
            label="Desde la izquierda (m)"
            value={(pin.normX / 100) * room.width}
            min={0}
            max={room.width}
            onChange={(v) => onChange({ normX: (v / room.width) * 100 })}
          />
          <PositionField
            label="Desde el frente (m)"
            value={(pin.normY / 100) * room.length}
            min={0}
            max={room.length}
            onChange={(v) => onChange({ normY: (v / room.length) * 100 })}
          />
          <PositionField
            label="Altura del centro (m)"
            value={pin.heightM}
            min={0.1}
            max={maxSpeakerHeight(room)}
            onChange={(v) => onChange({ heightM: v })}
          />
        </div>
        {pin.type === "tops" && (
          <label className="flex items-center justify-between gap-3 mb-3 text-xs text-muted-foreground">
            Tipo de caja
            <select
              aria-label="Tipo de caja"
              value={pin.cabinetType}
              onChange={(e) =>
                onChange({ cabinetType: e.target.value as CabinetType })
              }
              className="bg-secondary border border-border rounded-md p-2 text-foreground"
            >
              <option value="point-source">Top convencional</option>
              <option value="line-array">Elemento de line array</option>
            </select>
          </label>
        )}
        <div className="flex items-center justify-between gap-4 p-3 mb-3 rounded-lg bg-secondary">
          <div>
            <p className="text-xs text-foreground">
              Altura sugerida:{" "}
              <strong className="font-mono">
                {pin.suggestedHeightM.toFixed(2)} m
              </strong>
            </p>
            <p className="text-[11px] text-muted-foreground mt-1">
              Centro acústico desde el piso. Referencia inicial según caja y
              techo.
            </p>
          </div>
          <button
            className="text-xs text-accent shrink-0"
            onClick={() => onChange({ heightM: pin.suggestedHeightM })}
          >
            Usar altura
          </button>
        </div>
        {pin.type === "tops" && (
          <p className="text-[11px] text-muted-foreground mb-3">
            {pin.cabinetType === "line-array"
              ? "Altura por elemento; verificá curvatura, herrajes y cargas con el fabricante antes del montaje."
              : "Punto de partida de 2,20 m, limitado por el techo. Ajustá al público y al soporte disponible."}
          </p>
        )}
        {/* Placement rating */}
        {ratingMeta && evaluation && (
          <div
            className="rounded-xl px-3 py-2.5 mb-3 flex items-center justify-between"
            style={{
              background: `${ratingMeta.color}14`,
              border: `1px solid ${ratingMeta.color}33`,
            }}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ background: ratingMeta.color }}
              />
              <div className="min-w-0">
                <p
                  className="text-[9px] uppercase tracking-[0.28em] leading-none"
                  style={{ color: ratingMeta.color }}
                >
                  Posición {ratingMeta.label}
                </p>
                <p className="text-[10px] text-muted-foreground mt-1 leading-snug truncate">
                  {evaluation.summary}
                </p>
              </div>
            </div>
            <p
              className="text-lg font-medium leading-none ml-2 shrink-0"
              style={{ color: ratingMeta.color }}
            >
              {evaluation.score}
            </p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-xl bg-secondary px-2.5 py-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] leading-none mb-1">
              Modelo
            </p>
            <p className="text-[10px] font-bold text-foreground leading-tight">
              {pin.brand} {pin.model}
            </p>
          </div>
          <div className="rounded-xl bg-secondary px-2.5 py-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] leading-none mb-1">
              SPL Máx
            </p>
            <p
              className="text-sm font-medium leading-none"
              style={{ color: pin.color }}
            >
              {pin.splMax}
              <span className="text-[9px] text-muted-foreground ml-0.5">
                dB
              </span>
            </p>
          </div>
          <div className="rounded-xl bg-secondary px-2.5 py-2">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] leading-none mb-1">
              Cobertura
            </p>
            <p
              className="text-sm font-medium leading-none"
              style={{ color: pin.color }}
            >
              {pin.type === "subs" ? "Omni" : `${pin.coverageH}°`}
            </p>
          </div>
        </div>

        {/* Detailed issues */}
        {evaluation && evaluation.issues.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {evaluation.issues.map((issue, i) => {
              const dot =
                issue.severity === "error"
                  ? "#F87171"
                  : issue.severity === "warning"
                    ? "#FBBF24"
                    : "var(--info)";
              return (
                <div key={i} className="flex items-start gap-2">
                  <span
                    className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: dot }}
                  />
                  <p className="text-[11px] text-muted-foreground leading-snug">
                    {issue.message}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

export const DEPLOY_LABEL: Record<string, string> = {
  "simple-stereo": "Estéreo Simple",
  "wide-stereo": "Estéreo Amplio",
  "line-array": "Line Array",
  "center-cluster": "Cluster Central",
  distributed: "Distribuido",
  "delay-tower": "Torre de Delay",
  mono: "Mono",
};

export function SystemEvaluationCard({
  evaluation,
}: {
  evaluation: SystemEvaluation;
}) {
  const meta = RATING_META[evaluation.overallRating];
  const phaseLabel = { low: "Bajo", medium: "Medio", high: "Alto" }[
    evaluation.phaseRisk
  ];
  const phaseColor = { low: "var(--info)", medium: "#FBBF24", high: "#F87171" }[
    evaluation.phaseRisk
  ];

  return (
    <div
      className="rounded-3xl border bg-card p-4 shadow-[0_2px_8px_rgba(0,0,0,0.25),0_12px_32px_rgba(0,0,0,0.35)]"
      style={{ borderColor: `${meta.color}40` }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Wand2 size={13} style={{ color: meta.color }} />
          <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
            Calidad de Posicionamiento
          </p>
        </div>
        <div
          className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
          style={{
            background: `${meta.color}1A`,
            border: `1px solid ${meta.color}40`,
          }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: meta.color }}
          />
          <span className="text-[10px] font-bold" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <span
            className="text-[10px] font-medium ml-0.5"
            style={{ color: meta.color }}
          >
            {evaluation.overallScore}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {[
          { label: "Cobertura", value: `${evaluation.coverageEstimate}%` },
          { label: "Uniformidad SPL", value: `${evaluation.splUniformity}%` },
          {
            label: "SPL Frente/Fondo",
            value: `${evaluation.splFrontEstimate} / ${evaluation.splRearEstimate} dB`,
          },
          { label: "Riesgo de Fase", value: phaseLabel, color: phaseColor },
        ].map((row) => (
          <div key={row.label}>
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">
              {row.label}
            </p>
            <p
              className="text-xs font-bold mt-0.5"
              style={{ color: row.color ?? undefined }}
            >
              {row.value}
            </p>
          </div>
        ))}
      </div>

      {evaluation.notes.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border space-y-2">
          {evaluation.notes.map((note, i) => (
            <div key={i} className="flex items-start gap-2.5">
              <Info
                size={12}
                className="text-muted-foreground mt-0.5 shrink-0"
              />
              <p className="text-[11px] text-muted-foreground leading-snug">
                {note}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
