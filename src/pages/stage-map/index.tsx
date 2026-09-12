import {
  layoutSpeakers,
  layoutSources,
  SPEAKER_COLORS,
  maxSpeakerHeight,
  type SpeakerPlacement,
  type CabinetType,
} from "@/lib/speaker-layout.ts";
import { SPL_STOPS } from "@/lib/venue-visual.ts";
import { VenueBoundary } from "@/components/soundmap/venue-preview.tsx";
// SoundMap — Stage Map (Interactive Floor Plan + 3D View) — Premium Dark CAD
// Drag speakers freely; get live placement feedback per unit and for the system.
import { useState, useMemo, useRef, useCallback, useId } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Link } from "react-router-dom";
import {
  Map,
  ChevronRight,
  Layers,
  AlertTriangle,
  Speaker,
  Radio,
  Mic2,
  X,
  Info,
  ZoomIn,
  ZoomOut,
  Wand2,
  Move,
  Box,
  LayoutGrid,
} from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import { calculateStageConfig } from "@/lib/audio/stage-engine.ts";
import type { StageConfig } from "@/lib/audio/stage-engine.ts";
import { GlassCard, Badge, ScreenShell } from "@/components/soundmap/ui.tsx";
import { EmptyRoomState } from "@/components/soundmap/empty-state.tsx";
import { V } from "@/components/soundmap/vitals/index.tsx";
import { DemoBanner } from "@/components/soundmap/demo-banner.tsx";

import { Stage3D } from "@/_r3f_isolated/stage-3d.jsx";
import { computeSplGrid, type SplGrid } from "@/lib/audio/spl-grid.ts";
import { OptimizerModal } from "@/components/soundmap/optimizer-modal.tsx";
import { feedback } from "@/lib/feedback.ts";
import type { RoomScanInput } from "@/lib/audio/acoustics.ts";
import {
  evaluatePlacement,
  type Rating,
  type NormPin,
  type SystemEvaluation,
  type PinEvaluation,
} from "./_lib/placement-evaluator.ts";

// ── Types ────────────────────────────────────────────────────────────────────
interface SpeakerPin {
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

// ── Color palette (dark-theme friendly) ──────────────────────────────────────
const SPK_COLORS = SPEAKER_COLORS;

// Rating → color + label
const RATING_META: Record<Rating, { color: string; label: string }> = {
  ideal: { color: "#67C5F5", label: "Ideal" },
  buena: { color: "#A3E635", label: "Buena" },
  regular: { color: "#FBBF24", label: "Regular" },
  mala: { color: "#F87171", label: "Mala" },
};

// CAD surface tones (dark canvas)
const CAD = {
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

function splFill(db: number) {
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
function PositionField({
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

// ── Floor Plan SVG ────────────────────────────────────────────────────────────
const FP_W = 340;
const FP_H = 460;
const MARGIN = 32; // space for scale ruler + labels

interface Geometry {
  roomW: number;
  roomH: number;
  roomOriginX: number;
  roomOriginY: number;
}

function computeGeometry(room: RoomScanInput): Geometry {
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

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

// Pixel → normalised (0-100 relative to room rect)
function pxToNorm(x: number, y: number, geo: Geometry) {
  return {
    normX: ((x - geo.roomOriginX) / geo.roomW) * 100,
    normY: ((y - geo.roomOriginY) / geo.roomH) * 100,
  };
}

// Normalised → pixel
function normToPx(normX: number, normY: number, geo: Geometry) {
  return {
    x: geo.roomOriginX + (normX / 100) * geo.roomW,
    y: geo.roomOriginY + (normY / 100) * geo.roomH,
  };
}

// Convert pins to evaluator input
function pinsToNorm(pins: SpeakerPin[], geo: Geometry): NormPin[] {
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

// Draw a coverage arc emanating from a speaker pin
function CoverageArc({ pin, roomH }: { pin: SpeakerPin; roomH: number }) {
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

// Speaker icon shape
function SpeakerIcon({
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

interface FloorPlanProps {
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

function FloorPlan({
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

// ── Speaker Detail Panel ──────────────────────────────────────────────────────
function SpeakerDetail({
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

// ── Deployment mode badge ─────────────────────────────────────────────────────
const DEPLOY_LABEL: Record<string, string> = {
  "simple-stereo": "Estéreo Simple",
  "wide-stereo": "Estéreo Amplio",
  "line-array": "Line Array",
  "center-cluster": "Cluster Central",
  distributed: "Distribuido",
  "delay-tower": "Torre de Delay",
  mono: "Mono",
};

// ── System Evaluation card ────────────────────────────────────────────────────
function SystemEvaluationCard({
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

// ── Main Screen ───────────────────────────────────────────────────────────────
export default function StageMap() {
  const {
    room,
    acoustics,
    tops,
    subs,
    monitors,
    stageLayout,
    updateSpeakerPlacement,
    resetSpeakerLayout,
    activeSceneId,
  } = useAppStore();
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [layer, setLayer] = useState<"direction" | "spl" | "none">("direction");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [optimizerOpen, setOptimizerOpen] = useState(false);

  const stageConfig = useMemo(
    () =>
      room && acoustics
        ? calculateStageConfig(room, acoustics, tops, subs)
        : null,
    [room, acoustics, tops, subs],
  );

  const geo = useMemo(() => (room ? computeGeometry(room) : null), [room]);

  const speakers = useMemo(
    () => (room ? layoutSpeakers(room, tops, subs, monitors, stageLayout) : []),
    [room, tops, subs, monitors, stageLayout],
  );
  const pins = useMemo<SpeakerPin[]>(
    () =>
      geo
        ? speakers.map((speaker) => ({
            id: speaker.id,
            label: speaker.label,
            type: speaker.kind,
            ...normToPx(speaker.normX, speaker.normY, geo),
            normX: speaker.normX,
            normY: speaker.normY,
            heightM: speaker.y,
            suggestedHeightM: speaker.suggestedHeightM,
            cabinetType: speaker.cabinetType,
            brand: speaker.gear.brand,
            model: speaker.gear.model,
            splMax: speaker.gear.splMax,
            coverageH: speaker.gear.coverageH ?? 90,
            color: SPK_COLORS[speaker.kind],
            aimAngleDeg: speaker.kind === "monitors" ? 0 : 180,
          }))
        : [],
    [speakers, geo],
  );

  const systemEval = useMemo(() => {
    if (!room || !acoustics || !geo || pins.length === 0 || !stageConfig)
      return null;
    return evaluatePlacement(
      pinsToNorm(pins, geo),
      room,
      acoustics,
      stageConfig.delayTowerDistance || room.length * 0.6,
    );
  }, [room, acoustics, geo, pins, stageConfig]);

  const pinEvalMap = useMemo(() => {
    const map: Record<string, PinEvaluation> = {};
    systemEval?.pinEvals.forEach((e) => {
      map[e.pinId] = e;
    });
    return map;
  }, [systemEval]);

  const splGrid = useMemo(() => {
    if (!room) return undefined;
    const sources = layoutSources(speakers);
    return sources.length
      ? computeSplGrid(room, sources, {
          cols: 28,
          rows: 36,
          freqHz: 1000,
          yPlane: 1.6,
          tempC: room.temperature,
          humidity: room.humidity,
        })
      : undefined;
  }, [speakers, room]);
  const selectedPinData = pins.find((p) => p.id === selectedPin) ?? null;
  const hasCustomPositions = Object.keys(stageLayout).length > 0;
  const handleDragMove = useCallback(
    (id: string, normX: number, normY: number) => {
      updateSpeakerPlacement(id, { normX, normY });
    },
    [updateSpeakerPlacement],
  );

  if (!room || !acoustics || !geo) {
    return (
      <EmptyRoomState
        title="Mapa de Escenario"
        icon={Map}
        iconColor="var(--accent)"
        description="Hacé un Escaneo de Sala para generar el mapa de despliegue de parlantes, arcos de cobertura y posición de delay towers."
      />
    );
  }

  return (
    <ScreenShell>
      {/* Vitals-style header — eyebrow + big title + right actions */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-2">
            Mapa
          </p>
          <h1
            className="text-[1.6rem] md:text-[2.1rem] leading-[1.05] tracking-[-0.03em] font-medium text-foreground"
            data-testid="page-header-title"
          >
            {room.name}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {DEPLOY_LABEL[stageConfig?.deploymentMode ?? "mono"]} ·{" "}
            {tops.reduce((n, g) => n + (g.quantity ?? 1), 0)} tops ·{" "}
            {subs.reduce((n, g) => n + (g.quantity ?? 1), 0)} subs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              feedback("select");
              setOptimizerOpen(true);
            }}
            data-testid="stage-optimizer-btn"
            disabled={tops.length === 0 && subs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full h-9 px-4 text-[12px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: V.accent,
              color: "var(--background)",
              transition: "background-color 0.3s ease",
            }}
          >
            <Wand2 size={12} strokeWidth={2} />
            Optimizar
          </button>
        </div>
      </div>

      <DemoBanner />

      {/* 2D / 3D Toggle — Vitals pill style */}
      <div className="mb-4">
        <div
          className="inline-flex items-center gap-1 rounded-full p-1"
          data-testid="stage-view-toggle"
          style={{
            background: "rgba(255,255,255,0.03)",
            boxShadow: `0 0 0 1px ${V.hairline}`,
          }}
        >
          {[
            { key: "2d" as const, label: "Plano", icon: LayoutGrid },
            { key: "3d" as const, label: "3D", icon: Box },
          ].map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => {
                  feedback("select");
                  setViewMode(v.key);
                }}
                data-testid={`stage-view-${v.key}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium cursor-pointer"
                style={
                  active
                    ? {
                        background: V.accent,
                        color: "var(--background)",
                        transition:
                          "background-color 0.3s ease, color 0.3s ease",
                      }
                    : {
                        color: "var(--muted-foreground)",
                        transition: "color 0.3s ease",
                      }
                }
              >
                <Icon size={12} strokeWidth={active ? 2.25 : 1.75} />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D View */}
      {viewMode === "3d" && stageConfig && (
        <div className="px-4 mb-3">
          {/* El canvas manda. Las métricas flotan encima en vez de ocupar una
              tarjeta debajo: el brief pide "evitar paneles innecesarios
              alrededor" y que la visualización sea protagonista. */}
          <div className="relative">
            <VenueBoundary>
              <Stage3D
                room={room}
                config={stageConfig}
                tops={tops}
                subs={subs}
                monitors={monitors}
                splGrid={splGrid}
                speakers={speakers}
                selectedId={selectedPin}
                onSelect={setSelectedPin}
              />
            </VenueBoundary>

            {splGrid && (
              <div
                className="mt-3 px-4 py-3"
                style={{
                  borderRadius: "var(--radius-card)",
                  background: "rgba(8, 9, 10, 0.72)",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 0 0 1px var(--border)",
                }}
                data-testid="stage-3d-overlay"
              >
                <div className="grid grid-cols-4 gap-4">
                  {[
                    {
                      label: "Máx",
                      value: Math.round(splGrid.max),
                      unit: "dB",
                      color: "var(--foreground)",
                      testId: "spl-grid-max",
                    },
                    {
                      label: "Media",
                      value: Math.round(splGrid.mean),
                      unit: "dB",
                      color: "var(--foreground)",
                    },
                    {
                      label: "Spread",
                      value: splGrid.spread.toFixed(1),
                      unit: "dB",
                      color:
                        splGrid.spread < 6
                          ? V.accent
                          : splGrid.spread < 12
                            ? V.amber
                            : V.warm,
                    },
                    {
                      label: "Uniform",
                      value: splGrid.uniformityPct,
                      unit: "%",
                      color:
                        splGrid.uniformityPct > 70
                          ? V.accent
                          : splGrid.uniformityPct > 40
                            ? V.amber
                            : V.warm,
                      testId: "spl-grid-uniformity",
                    },
                  ].map((m) => (
                    <div key={m.label}>
                      <p
                        className="font-mono tabular-nums text-[17px] leading-none"
                        style={{ color: m.color }}
                        data-testid={m.testId}
                      >
                        {m.value}
                        <span
                          className="text-[10px] ml-0.5 font-sans"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {m.unit}
                        </span>
                      </p>
                      <p
                        className="text-[9px] uppercase tracking-[0.16em] mt-1.5"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metodología: es información importante pero no es lo que mirás
              mientras posicionás cajas. Va abajo, discreta. */}
          {splGrid && (
            <details className="mt-3 group" data-testid="stage-3d-method">
              <summary
                className="flex items-center gap-2 cursor-pointer list-none py-2 text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <Wand2 size={11} strokeWidth={1.75} />
                Predicción física ISO 9613 — ver modelo
              </summary>
              <p
                className="text-[11px] leading-relaxed pt-1 pb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Inverse-square + directividad (cono H/V) + absorción del aire
                ISO 9613 @ 1 kHz, con suma de potencia de las cajas en sus
                posiciones y alturas guardadas. No simula interferencia ni
                acoplamiento coherente entre subs. Plano de muestreo a 1.6 m del
                suelo.
              </p>
            </details>
          )}
        </div>
      )}

      {viewMode === "2d" && (
        <div className="mb-4 border border-border rounded-xl overflow-hidden bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Plano de equipos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Seleccioná una caja para editar su posición y altura.
              </p>
            </div>
            <div className="flex gap-2 items-center">
              <select
                aria-label="Capa del plano"
                value={layer}
                onChange={(e) => setLayer(e.target.value as typeof layer)}
                className="rounded-md border border-border bg-secondary p-2 text-xs"
              >
                <option value="direction">Dirección de cobertura</option>
                <option value="spl">Predicción SPL · 1 kHz</option>
                <option value="none">Solo equipos</option>
              </select>
              <button
                aria-label="Alejar plano"
                className="p-2"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              >
                <ZoomOut size={16} />
              </button>
              <button
                aria-label="Acercar plano"
                className="p-2"
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-auto bg-[#050706] p-4">
              <div
                className="mx-auto"
                style={{
                  width: 400 * zoom,
                  maxWidth: zoom <= 1 ? "100%" : undefined,
                }}
              >
                {stageConfig && (
                  <FloorPlan
                    room={room}
                    config={stageConfig}
                    geo={geo}
                    pins={pins}
                    pinEvals={pinEvalMap}
                    selected={selectedPin}
                    onSelect={setSelectedPin}
                    onDragMove={handleDragMove}
                    onDragEnd={() => {}}
                    zoom={1}
                    grid={splGrid}
                    layer={layer}
                  />
                )}
              </div>
            </div>
            <aside className="border-l border-border p-4 space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Equipos · {pins.length} unidades
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px]">
                {(
                  [
                    ["tops", "Tops / array"],
                    ["subs", "Subs"],
                    ["monitors", "Monitores"],
                  ] as const
                ).map(([kind, label]) => (
                  <span key={kind} className="flex gap-1.5 items-center">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: SPK_COLORS[kind] }}
                    />
                    {label}
                  </span>
                ))}
              </div>
              {selectedPinData && (
                <div className="space-y-3 p-3 bg-secondary/40 border border-border rounded-lg">
                  <p
                    className="text-xs font-medium"
                    style={{ color: selectedPinData.color }}
                  >
                    {selectedPinData.label} · {selectedPinData.model}
                  </p>
                  <PositionField
                    label="Altura rápida (m)"
                    value={selectedPinData.heightM}
                    min={0.1}
                    max={maxSpeakerHeight(room)}
                    onChange={(v) =>
                      updateSpeakerPlacement(selectedPinData.id, { heightM: v })
                    }
                  />
                  <button
                    className="text-[11px] text-accent"
                    onClick={() =>
                      updateSpeakerPlacement(selectedPinData.id, {
                        heightM: selectedPinData.suggestedHeightM,
                      })
                    }
                  >
                    Usar sugerida ·{" "}
                    {selectedPinData.suggestedHeightM.toFixed(2)} m
                  </button>
                  <p className="text-[10px] text-muted-foreground">
                    Centro del parlante sobre el piso.
                  </p>
                </div>
              )}
              <div className="space-y-1 max-h-[240px] overflow-auto">
                {pins.map((pin) => (
                  <button
                    key={pin.id}
                    onClick={() => setSelectedPin(pin.id)}
                    aria-pressed={selectedPin === pin.id}
                    className={`w-full text-left p-2.5 rounded-md border ${selectedPin === pin.id ? "border-accent bg-accent/5" : "border-transparent hover:bg-secondary"}`}
                  >
                    <span className="flex justify-between items-center text-xs">
                      <span style={{ color: pin.color }}>{pin.label}</span>
                      <span className="font-mono">
                        {pin.heightM.toFixed(2)} m ↑
                      </span>
                    </span>
                    <span className="block mt-1 text-[10px] text-muted-foreground">
                      {pin.brand} {pin.model}
                    </span>
                  </button>
                ))}
              </div>
              {layer === "spl" ? (
                <div>
                  <p className="text-[11px] mb-2">Nivel estimado · dB SPL</p>
                  <div
                    className="h-2 rounded"
                    style={{
                      background: `linear-gradient(to right, ${SPL_STOPS.map((s) => s.color).join(",")})`,
                    }}
                  />
                  <div className="flex justify-between text-[9px] font-mono mt-1">
                    {SPL_STOPS.map((s) => (
                      <span key={s.db}>{s.db}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Escala fija compartida con 3D. Plano de escucha a 1,60 m.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Los colores identifican el tipo de equipo. El abanico muestra
                  su dirección horizontal; seleccioná uno para aislarlo. La
                  valoración de posición aparece en su ficha.
                </p>
              )}
              <button
                onClick={() => {
                  resetSpeakerLayout();
                  setSelectedPin(null);
                }}
                disabled={!hasCustomPositions}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-2"
              >
                <Wand2 size={12} />
                Restablecer distribución
              </button>
            </aside>
          </div>
          <div className="border-t border-border px-4 py-3 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex gap-2 items-center">
              <Move size={12} />
              Arrastrá tops, subs y monitores. También podés usar la ficha.
            </span>
            <span data-testid="stage-save-status">
              Guardado automático en este dispositivo
              {activeSceneId ? " y en la escena activa" : ""} · 2D ↔ 3D
            </span>
          </div>
        </div>
      )}

      {/* Speaker detail panel */}
      <AnimatePresence>
        {selectedPinData && (
          <SpeakerDetail
            key={selectedPinData.id}
            pin={selectedPinData}
            room={room}
            onChange={(p) => updateSpeakerPlacement(selectedPinData.id, p)}
            evaluation={pinEvalMap[selectedPinData.id] ?? null}
            onClose={() => setSelectedPin(null)}
          />
        )}
      </AnimatePresence>

      {/* System evaluation */}
      {systemEval && (
        <div className="px-4 mb-4">
          <SystemEvaluationCard evaluation={systemEval} />
        </div>
      )}

      {/* Details toggle */}
      {stageConfig && (
        <div className="px-4 mb-4">
          <button
            onClick={() => setShowDetails((d) => !d)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3 cursor-pointer hover:bg-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                Detalles de Despliegue
              </span>
            </div>
            <motion.div
              animate={{ rotate: showDetails ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight size={13} className="text-muted-foreground" />
            </motion.div>
          </button>
        </div>
      )}

      <AnimatePresence>
        {showDetails && stageConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 space-y-3 pb-2">
              {/* Deployment summary */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={13} className="text-muted-foreground" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
                    Estrategia de Despliegue
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    {
                      label: "Modo",
                      value: DEPLOY_LABEL[stageConfig.deploymentMode],
                    },
                    {
                      label: "Alineación Sub/Top",
                      value:
                        stageConfig.alignedSource === "none"
                          ? "—"
                          : `${stageConfig.subAlignMs} ms · ${stageConfig.alignedSource === "sub" ? "subs" : "tops"}`,
                    },
                    {
                      label: "SPL Frontal/Trasero",
                      value: `${stageConfig.splFront} / ${stageConfig.splRear} dB`,
                    },
                    {
                      label: "Torres de Delay",
                      value: stageConfig.needsDelayTowers
                        ? `${stageConfig.delayTowerDistance}m · ${stageConfig.delayTowerMs} ms`
                        : "No requerido",
                      accent: stageConfig.needsDelayTowers,
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">
                        {row.label}
                      </p>
                      <p
                        className={`text-xs font-bold mt-0.5 ${row.accent ? "text-accent" : "text-foreground"}`}
                      >
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Speaker positions list */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Speaker size={13} className="text-muted-foreground" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
                    Posiciones de Altavoces
                  </p>
                </div>
                {pins.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sin altavoces seleccionados
                  </p>
                ) : (
                  <div>
                    {pins.map((pin) => {
                      const ev = pinEvalMap[pin.id];
                      const ratingMeta = ev ? RATING_META[ev.rating] : null;
                      return (
                        <div
                          key={pin.id}
                          className="flex items-center justify-between py-2.5 border-b border-border last:border-0 cursor-pointer"
                          onClick={() => {
                            setSelectedPin(
                              pin.id === selectedPin ? null : pin.id,
                            );
                            setShowDetails(false);
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: pin.color }}
                            />
                            <span className="text-xs font-bold text-foreground">
                              {pin.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ratingMeta && (
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: ratingMeta.color }}
                              >
                                {ratingMeta.label}
                              </span>
                            )}
                            <Badge color="gray">{pin.splMax} dB</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delay tower warning */}
      {stageConfig?.needsDelayTowers && (
        <div className="px-4 pb-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-accent/10 border border-accent/25 px-4 py-3">
            <AlertTriangle size={13} className="text-accent mt-0.5 shrink-0" />
            <p className="text-xs text-accent">
              Torres de delay recomendadas a{" "}
              <span className="font-bold">
                {stageConfig.delayTowerDistance}m
              </span>{" "}
              — configurar{" "}
              <span className="font-bold">{stageConfig.delayTowerMs} ms</span>{" "}
              de delay para alinear con los principales (propagación + efecto
              Haas)
            </p>
          </div>
        </div>
      )}

      {/* Add gear nudge */}
      {tops.length === 0 && (
        <div className="px-4 pb-4">
          <Link to="/gear-builder">
            <div className="flex items-center justify-between rounded-xl bg-secondary border border-border px-4 py-3 cursor-pointer hover:bg-secondary/70 transition-colors">
              <p className="text-xs text-muted-foreground">
                Agregá tops en el Armador de Equipo para ver posiciones de
                altavoces
              </p>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </Link>
        </div>
      )}
      {/* Optimizer */}
      <OptimizerModal
        open={optimizerOpen}
        room={room}
        tops={tops}
        subs={subs}
        onClose={() => setOptimizerOpen(false)}
        onApply={() => {
          /* Selected candidate is informational; user can adjust pins by hand or re-run. */
        }}
      />
    </ScreenShell>
  );
}
