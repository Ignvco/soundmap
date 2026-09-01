// SoundMap — PA Toolkit page
// Three interactive calculators: Cardioid Subs, Line Array Angles, Impedance.
import { useState, useMemo } from "react";
import { useAppStore } from "@/store/app.ts";
import { motion } from "motion/react";
import { Radio as RadioIcon, Layers, Zap, Info, Check, AlertTriangle } from "lucide-react";
import { GlassCard, ScreenShell } from "@/components/soundmap/ui.tsx";
import { feedback } from "@/lib/feedback.ts";
import {
  calculateCardioid, calculateLineArrayAngles, calculateImpedance,
  type CardioidConfig, type Wiring,
} from "@/lib/audio/pa-toolkit.ts";
import { solveLineArray } from "@/lib/audio/line-array-solver.ts";
import { cn } from "@/lib/utils.ts";

type Tool = "cardioid" | "line-array" | "impedance";

// SoundMap Vitals — single lime accent for all tools (semantic differentiation via icon+label, not color)
const LIME = "var(--sm-accent)";
const TOOLS: { key: Tool; label: string; icon: typeof RadioIcon; color: string }[] = [
  { key: "cardioid",   label: "Cardioid Subs", icon: RadioIcon, color: LIME },
  { key: "line-array", label: "Line Array",    icon: Layers,    color: LIME },
  { key: "impedance",  label: "Impedancia",    icon: Zap,       color: LIME },
];

export default function PAToolkit() {
  const [active, setActive] = useState<Tool>("cardioid");

  return (
    <ScreenShell>
      {/* Vitals header */}
      <div className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-2">Toolkit</p>
        <h1 className="text-[1.6rem] md:text-[2.1rem] leading-[1.05] tracking-[-0.03em] font-medium text-foreground" data-testid="page-header-title">
          Calculadoras PA
        </h1>
        <p className="text-[13px] text-muted-foreground mt-1">Cardioid · Line Array · Impedancia</p>
      </div>

      {/* Tool tabs — Vitals pill container */}
      <div className="mb-5">
        <div
          className="inline-flex items-center gap-1 rounded-full p-1"
          style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.05)" }}
        >
          {TOOLS.map(t => {
            const Icon = t.icon;
            const on = t.key === active;
            return (
              <button
                key={t.key}
                onClick={() => { feedback("select"); setActive(t.key); }}
                data-testid={`toolkit-tab-${t.key}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium cursor-pointer shrink-0"
                style={on
                  ? { background: LIME, color: "var(--background)", transition: "background-color 0.3s ease, color 0.3s ease" }
                  : { color: "var(--muted-foreground)", transition: "color 0.3s ease" }
                }
              >
                <Icon size={12} strokeWidth={on ? 2.25 : 1.75} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="px-4 space-y-4 pb-6">
        {active === "cardioid" && <CardioidPanel />}
        {active === "line-array" && <LineArrayPanel />}
        {active === "impedance" && <ImpedancePanel />}
      </div>
    </ScreenShell>
  );
}

// ── Cardioid Panel ──────────────────────────────────────────────────────────
function CardioidPanel() {
  const [tuning, setTuning] = useState(60);
  const [config, setConfig] = useState<CardioidConfig>("front-rear");
  // La calculadora usa la temperatura del recinto cargado, si hay uno.
  const roomTemp = useAppStore(st => st.room?.temperature) ?? 20;
  const result = useMemo(() => calculateCardioid(tuning, config, roomTemp), [tuning, config, roomTemp]);
  const dspColor = "var(--warning)";

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      {/* Config selector */}
      <GlassCard className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-2">Configuración</p>
        <div className="grid grid-cols-3 gap-1.5">
          {(["front-rear", "end-fire", "gradient"] as CardioidConfig[]).map(c => (
            <button
              key={c}
              onClick={() => { feedback("tap"); setConfig(c); }}
              data-testid={`cardioid-config-${c}`}
              className={cn(
                "rounded-xl border py-2 text-[11px] font-medium uppercase tracking-[0.2em] transition-all cursor-pointer",
                config === c
                  ? "border-transparent text-[#06080A]"
                  : "border-border bg-secondary text-muted-foreground hover:text-foreground"
              )}
              style={config === c ? { background: dspColor, boxShadow: `0 4px 14px ${dspColor}55` } : {}}
            >
              {c === "front-rear" ? "Front-Rear" : c === "end-fire" ? "End-Fire" : "Gradient"}
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Tuning */}
      <GlassCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Frecuencia de sintonía</p>
          <span className="text-lg font-medium font-mono" style={{ color: dspColor }}>{tuning}<span className="text-xs text-muted-foreground ml-1">Hz</span></span>
        </div>
        <input
          type="range"
          min={40} max={120} step={1}
          value={tuning}
          onChange={(e) => setTuning(parseInt(e.target.value, 10))}
          data-testid="cardioid-tuning-slider"
          className="w-full"
          style={{ accentColor: dspColor }}
        />
        <div className="flex justify-between text-[10px] font-mono text-muted-foreground">
          <span>40</span><span>60</span><span>80</span><span>100</span><span>120</span>
        </div>
      </GlassCard>

      {/* Result */}
      <GlassCard className="p-4" glow="dsp">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-3">Resultado</p>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <BigStat label="Spacing" value={result.spacingMeters.toFixed(2)} unit="m" color={dspColor} testId="cardioid-spacing" />
          <BigStat label="Delay" value={result.delayMs.toFixed(2)} unit="ms" color={dspColor} testId="cardioid-delay" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <SmallStat label="λ" value={`${result.wavelength.toFixed(2)}m`} color="var(--foreground)" />
          <SmallStat label="Boost" value={`+${result.frontBoostDb}dB`} color="var(--accent)" />
          <SmallStat label="Null" value={`${result.rearNullDb}dB`} color="var(--destructive)" />
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {result.notes.map((n, i) => (
            <div key={i} className="flex items-start gap-2">
              <Info size={11} className="text-muted-foreground shrink-0 mt-0.5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed">{n}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Polar visualization */}
      <GlassCard className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-3">Patrón polar</p>
        <PolarPattern frontBoost={result.frontBoostDb} rearNull={result.rearNullDb} />
      </GlassCard>
    </motion.div>
  );
}

// SVG polar plot of the cardioid pattern
function PolarPattern({ frontBoost, rearNull }: { frontBoost: number; rearNull: number }) {
  const size = 260;
  const c = size / 2;
  const rMax = c - 30;
  // Cardioid response: r = a*(1 + cos(θ)) — remapped for our custom boost/null.
  const points: string[] = [];
  for (let deg = 0; deg <= 360; deg += 5) {
    const rad = (deg * Math.PI) / 180;
    // Approximate: shape a cardioid whose front matches frontBoost dB and rear matches rearNull dB.
    const front = (1 + Math.cos(rad)) / 2; // 1 at 0°, 0 at 180°
    // Convert to dB scale for radial length
    const dB = rearNull * (1 - front) + frontBoost * front;
    const linear = Math.pow(10, dB / 20); // 0..~2
    const r = (linear / 2) * rMax;
    const x = c + r * Math.sin(rad);
    const y = c - r * Math.cos(rad);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return (
    <svg viewBox={`0 0 ${size} ${size}`} className="w-full h-auto max-w-[280px] mx-auto">
      {/* Range rings */}
      {[0.25, 0.5, 0.75, 1].map((f, i) => (
        <circle key={i} cx={c} cy={c} r={rMax * f} fill="none" stroke="rgba(255,255,255,0.08)" strokeDasharray="2 3" />
      ))}
      {/* Cardinal axes */}
      <line x1={c} y1={c - rMax} x2={c} y2={c + rMax} stroke="rgba(255,255,255,0.08)" />
      <line x1={c - rMax} y1={c} x2={c + rMax} y2={c} stroke="rgba(255,255,255,0.08)" />
      {/* Cardioid fill */}
      <polygon
        points={points.join(" ")}
        fill="rgba(183,148,246,0.20)"
        stroke="var(--warning)"
        strokeWidth={2}
        strokeLinejoin="round"
      />
      {/* Front indicator */}
      <text x={c} y={c - rMax - 8} textAnchor="middle" className="fill-accent" style={{ fontSize: 10, fontWeight: 900, fontFamily: "JetBrains Mono" }}>
        FRENTE (audiencia)
      </text>
      <text x={c} y={c + rMax + 18} textAnchor="middle" className="fill-destructive" style={{ fontSize: 10, fontWeight: 900, fontFamily: "JetBrains Mono" }}>
        DETRÁS (backstage)
      </text>
      <circle cx={c} cy={c} r={4} fill="var(--warning)" />
    </svg>
  );
}

// ── Line Array Panel ────────────────────────────────────────────────────────
function LineArrayPanel() {
  const [boxes, setBoxes] = useState(8);
  const [flyHeight, setFlyHeight] = useState(6);
  const [nearThrow, setNearThrow] = useState(6);
  const [farThrow, setFarThrow] = useState(30);
  const infoColor = "var(--info)";

  const result = useMemo(
    () => calculateLineArrayAngles({ boxes, flyHeightM: flyHeight, farThrowM: farThrow, nearThrowM: nearThrow }),
    [boxes, flyHeight, farThrow, nearThrow],
  );

  // Physics-based J-array plan (predicts SPL uniformity across the audience)
  const physical = useMemo(
    () => solveLineArray({
      numBoxes: boxes,
      singleBoxCoverageV: 10, // typical line-array box vertical coverage
      flownHeight: flyHeight,
      zNear: nearThrow,
      zFar: farThrow,
    }),
    [boxes, flyHeight, nearThrow, farThrow],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <GlassCard className="p-4 space-y-4">
        <SliderRow label="Cajas en el array" value={boxes} min={2} max={16} step={1} unit="" onChange={setBoxes} color={infoColor} testId="la-boxes" />
        <SliderRow label="Altura de vuelo" value={flyHeight} min={2} max={20} step={0.5} unit="m" onChange={setFlyHeight} color={infoColor} testId="la-fly-height" />
        <SliderRow label="Distancia mínima" value={nearThrow} min={2} max={40} step={0.5} unit="m" onChange={setNearThrow} color={infoColor} testId="la-near" />
        <SliderRow label="Distancia máxima" value={farThrow} min={5} max={80} step={1} unit="m" onChange={setFarThrow} color={infoColor} testId="la-far" />
      </GlassCard>

      <GlassCard className="p-4" glow="info">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-3">Ángulos sugeridos (entre cajas)</p>
        <div className="grid grid-cols-4 gap-1.5">
          {result.angles.map((angle, i) => {
            const step = angle < 2 ? "var(--info)" : angle < 5 ? "var(--accent)" : angle < 8 ? "var(--warning)" : "var(--destructive)";
            return (
              <div key={i} className="rounded-xl border border-border bg-secondary/40 p-2 text-center" data-testid={`la-angle-${i}`}>
                <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-0.5">J {i + 1}</p>
                <p className="text-base font-medium font-mono tabular-nums" style={{ color: step }}>{angle}°</p>
              </div>
            );
          })}
        </div>
        <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
          Tilt general de la caja superior: <span className="font-medium text-foreground font-mono">{result.overallTilt}°</span>
        </p>
        <div className="mt-3 pt-3 border-t border-border space-y-1.5">
          {result.notes.map((n, i) => {
            const isWarn = n.startsWith("⚠️");
            return (
              <div key={i} className="flex items-start gap-2">
                {isWarn
                  ? <AlertTriangle size={11} className="text-warning shrink-0 mt-0.5" />
                  : <Info size={11} className="text-muted-foreground shrink-0 mt-0.5" />}
                <p className={cn("text-[11px] leading-relaxed", isWarn ? "text-warning" : "text-muted-foreground")}>
                  {n.replace("⚠️ ", "")}
                </p>
              </div>
            );
          })}
        </div>
      </GlassCard>

      {/* Side view */}
      <GlassCard className="p-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-3">Vista lateral</p>
        <ArraySideView
          boxes={boxes}
          angles={result.angles}
          overallTilt={result.overallTilt}
          flyHeight={flyHeight}
          nearThrow={nearThrow}
          farThrow={farThrow}
        />
      </GlassCard>

      {/* Physical J-array prediction */}
      <GlassCard className="p-4" glow="info">
        <div className="flex items-center gap-2 mb-3">
          <Info size={11} className="text-info" />
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-info">Predicción física J-Array (ISO 9613)</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className="rounded-xl border border-border bg-secondary/40 p-2.5 text-center" data-testid="la-physical-spread">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Spread SPL</p>
            <p className="text-lg font-medium font-mono tabular-nums" style={{ color: physical.predictedSpread < 6 ? "var(--accent)" : physical.predictedSpread < 12 ? "var(--warning)" : "var(--destructive)" }}>
              {physical.predictedSpread.toFixed(1)}<span className="text-[9px] text-muted-foreground ml-0.5">dB</span>
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-2.5 text-center">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Uniforme</p>
            <p className="text-lg font-medium font-mono tabular-nums" style={{ color: physical.isUniform ? "var(--accent)" : "var(--destructive)" }} data-testid="la-physical-uniform">
              {physical.isUniform ? "Sí" : "No"}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-secondary/40 p-2.5 text-center">
            <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-0.5">Targets</p>
            <p className="text-lg font-medium font-mono tabular-nums text-foreground">
              {physical.targetDistances[0]?.toFixed(0) ?? "—"}<span className="text-[9px] text-muted-foreground mx-0.5">→</span>{physical.targetDistances[physical.targetDistances.length - 1]?.toFixed(0) ?? "—"}<span className="text-[9px] text-muted-foreground ml-0.5">m</span>
            </p>
          </div>
        </div>
        <p className="text-[10px] text-muted-foreground leading-relaxed mb-2">
          Splay óptimo (progresión geométrica): cada caja apunta al punto medio de una franja de audiencia distinta, compensando la caída 1/r con más ángulo abajo.
        </p>
        <div className="flex flex-wrap gap-1">
          {physical.splayAngles.map((s, i) => (
            <span key={i} className="text-[10px] font-mono font-medium rounded-full border border-info/25 bg-info/8 px-2 py-0.5 text-info tabular-nums">
              {i === 0 ? "top" : `+${s.toFixed(1)}°`}
            </span>
          ))}
        </div>
        {physical.notes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border space-y-1">
            {physical.notes.map((n, i) => (
              <p key={i} className="text-[10px] text-muted-foreground leading-snug">• {n}</p>
            ))}
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

function ArraySideView({ boxes, angles, overallTilt, flyHeight, nearThrow, farThrow }: {
  boxes: number; angles: number[]; overallTilt: number; flyHeight: number; nearThrow: number; farThrow: number;
}) {
  const w = 320, h = 220;
  const maxDist = Math.max(farThrow * 1.1, 20);
  const maxH = Math.max(flyHeight * 1.2, 10);
  const scaleX = (m: number) => (m / maxDist) * (w - 40) + 20;
  const scaleY = (m: number) => h - 20 - (m / maxH) * (h - 40);

  // Draw floor
  const floorY = scaleY(0);

  // Array position at x=0
  const arrayX = scaleX(0);
  const boxH = 10;
  const boxW = 22;

  // Compute each box position by stacking rotated boxes downward
  let currentTilt = overallTilt;
  const boxes3 = [];
  let baseY = scaleY(flyHeight);
  for (let i = 0; i < boxes; i++) {
    boxes3.push({ x: arrayX - boxW / 2, y: baseY, rot: currentTilt });
    baseY += boxH + 2;
    if (i < boxes - 1) currentTilt += angles[i] ?? 0;
  }

  // Draw aim rays from top and bottom of array
  const topRayAngle = overallTilt;
  const bottomRayAngle = boxes3.reduce((a, _, i) => a + (angles[i] ?? 0), overallTilt);
  const topRayEnd = { x: arrayX + Math.cos((topRayAngle * Math.PI) / 180) * (w - 40), y: scaleY(flyHeight) + Math.sin((topRayAngle * Math.PI) / 180) * flyHeight * 20 };
  const bottomRayEnd = { x: arrayX + Math.cos((bottomRayAngle * Math.PI) / 180) * (w - 40), y: scaleY(flyHeight) + Math.sin((bottomRayAngle * Math.PI) / 180) * flyHeight * 20 };

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto">
      {/* Grid */}
      <line x1={0} y1={floorY} x2={w} y2={floorY} stroke="rgba(255,255,255,0.15)" strokeWidth={1} />
      {[nearThrow, farThrow].map((m, i) => (
        <g key={i}>
          <line x1={scaleX(m)} y1={floorY - 4} x2={scaleX(m)} y2={floorY + 4} stroke="var(--accent)" strokeWidth={1.5} />
          <text x={scaleX(m)} y={floorY + 15} textAnchor="middle" style={{ fontSize: 9, fill: "var(--accent)", fontFamily: "JetBrains Mono", fontWeight: 900 }}>
            {m}m
          </text>
        </g>
      ))}
      {/* Audience zone */}
      <rect
        x={scaleX(nearThrow)}
        y={floorY - 4}
        width={scaleX(farThrow) - scaleX(nearThrow)}
        height={4}
        fill="rgba(0, 255, 158, 0.20)"
      />
      {/* Rays */}
      <line x1={arrayX} y1={scaleY(flyHeight)} x2={topRayEnd.x} y2={topRayEnd.y} stroke="var(--info)" strokeWidth={1} strokeDasharray="4 3" />
      <line x1={arrayX} y1={scaleY(flyHeight)} x2={bottomRayEnd.x} y2={bottomRayEnd.y} stroke="var(--info)" strokeWidth={1} strokeDasharray="4 3" />
      {/* Boxes */}
      {boxes3.map((b, i) => (
        <g key={i} transform={`rotate(${b.rot} ${b.x + boxW / 2} ${b.y + boxH / 2})`}>
          <rect x={b.x} y={b.y} width={boxW} height={boxH} rx={2} fill="var(--info)" stroke="var(--background)" strokeWidth={1} />
        </g>
      ))}
      {/* Fly point */}
      <circle cx={arrayX} cy={scaleY(flyHeight)} r={3} fill="var(--foreground)" />
      <text x={arrayX + 6} y={scaleY(flyHeight) - 4} style={{ fontSize: 9, fill: "var(--foreground)", fontFamily: "JetBrains Mono", fontWeight: 900 }}>
        {flyHeight}m
      </text>
    </svg>
  );
}

// ── Impedance Panel ─────────────────────────────────────────────────────────
function ImpedancePanel() {
  const [cabinets, setCabinets] = useState(2);
  const [cabZ, setCabZ] = useState(8);
  const [wiring, setWiring] = useState<Wiring>("parallel");
  const [ampMin, setAmpMin] = useState(4);
  const warningColor = "var(--warning)";
  const result = useMemo(
    () => calculateImpedance({ cabinets, cabinetImpedance: cabZ, wiring, ampMinImpedance: ampMin }),
    [cabinets, cabZ, wiring, ampMin],
  );

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
      <GlassCard className="p-4 space-y-4">
        <div>
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-2">Conexión</p>
          <div className="grid grid-cols-2 gap-1.5">
            {(["parallel", "series"] as Wiring[]).map(w => (
              <button
                key={w}
                onClick={() => { feedback("tap"); setWiring(w); }}
                data-testid={`imp-wiring-${w}`}
                className={cn(
                  "rounded-xl border py-2 text-[11px] font-medium uppercase tracking-[0.2em] transition-all cursor-pointer",
                  wiring === w
                    ? "border-transparent text-[#06080A]"
                    : "border-border bg-secondary text-muted-foreground hover:text-foreground"
                )}
                style={wiring === w ? { background: warningColor, boxShadow: `0 4px 14px ${warningColor}55` } : {}}
              >
                {w === "parallel" ? "Paralelo" : "Serie"}
              </button>
            ))}
          </div>
        </div>
        <SliderRow label="Gabinetes conectados" value={cabinets} min={1} max={8} step={1} unit="" onChange={setCabinets} color={warningColor} testId="imp-cabinets" />
        <SliderRow label="Impedancia por gabinete" value={cabZ} min={2} max={16} step={2} unit="Ω" onChange={setCabZ} color={warningColor} testId="imp-cab-z" />
        <SliderRow label="Mínimo del amplificador" value={ampMin} min={2} max={8} step={1} unit="Ω" onChange={setAmpMin} color={warningColor} testId="imp-amp-min" />
      </GlassCard>

      <GlassCard className="p-5" glow={result.safe ? "accent" : "live"}>
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Carga total</p>
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.28em]",
              result.safe
                ? "border-accent/40 bg-accent/12 text-accent"
                : "border-destructive/40 bg-destructive/12 text-destructive"
            )}
            data-testid="imp-safe-badge"
          >
            {result.safe ? <><Check size={11} strokeWidth={2.8} /> Segura</> : <><AlertTriangle size={11} strokeWidth={2.8} /> Insegura</>}
          </span>
        </div>
        <p
          className="text-5xl font-medium font-mono tabular-nums"
          style={{
            color: result.safe ? "var(--accent)" : "var(--destructive)",
            textShadow: `0 0 24px ${result.safe ? "var(--accent)" : "var(--destructive)"}44`,
          }}
          data-testid="imp-total-value"
        >
          {result.totalImpedance}<span className="text-lg text-muted-foreground ml-1">Ω</span>
        </p>
        <p className="text-[11px] text-muted-foreground mt-2 font-mono">{result.formula}</p>
        {result.warning && (
          <div className={cn(
            "mt-3 rounded-2xl border p-3 flex items-start gap-2",
            result.safe ? "border-warning/25 bg-warning/8" : "border-destructive/25 bg-destructive/8"
          )}>
            <AlertTriangle size={13} className={cn("shrink-0 mt-0.5", result.safe ? "text-warning" : "text-destructive")} />
            <p className={cn("text-[11px] leading-relaxed", result.safe ? "text-warning" : "text-destructive")}>
              {result.warning}
            </p>
          </div>
        )}
      </GlassCard>
    </motion.div>
  );
}

// ── Shared: Slider row + stats ──────────────────────────────────────────────
function SliderRow({ label, value, min, max, step, unit, onChange, color, testId }: {
  label: string; value: number; min: number; max: number; step: number; unit: string;
  onChange: (v: number) => void; color: string; testId?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
        <span className="text-sm font-medium font-mono tabular-nums" style={{ color }}>{value}<span className="text-[10px] text-muted-foreground ml-1">{unit}</span></span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={(e) => { feedback("tap", { sound: false }); onChange(parseFloat(e.target.value)); }}
        data-testid={testId}
        className="w-full"
        style={{ accentColor: color }}
      />
    </div>
  );
}

function BigStat({ label, value, unit, color, testId }: { label: string; value: string; unit: string; color: string; testId?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-secondary/40 p-3" data-testid={testId}>
      <p className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground mb-1">{label}</p>
      <p className="text-3xl font-medium font-mono tabular-nums" style={{ color, textShadow: `0 0 18px ${color}44` }}>
        {value}<span className="text-xs text-muted-foreground ml-1">{unit}</span>
      </p>
    </div>
  );
}

function SmallStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/40 py-2 text-center">
      <p className="text-[9px] font-medium uppercase tracking-[0.2em] text-muted-foreground mb-0.5">{label}</p>
      <p className="text-sm font-medium font-mono tabular-nums" style={{ color }}>{value}</p>
    </div>
  );
}
