// SoundMap — PA System Screen (Dark Premium)
import { useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import {
  Speaker, Radio, Mic2, Zap, AlertTriangle, CheckCircle2,
  ChevronRight, AudioWaveform, Activity
} from "lucide-react";
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis,
  CartesianGrid, Tooltip, ReferenceLine,
} from "recharts";
import { useAppStore } from "@/store/app.ts";
import { calculatePARecommendation } from "@/lib/audio/pa-engine.ts";
import {
  GlassCard, StatusPill, WarningBanner, Badge, ScreenShell
} from "@/components/soundmap/ui.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import { EmptyRoomState } from "@/components/soundmap/empty-state.tsx";
import type { GearItem } from "@/lib/audio/pa-engine.ts";

// ── Theme palette (dark premium) ────────────────────────────────────────────
const C = {
  gold: "var(--accent)",
  amber: "#00D95A",
  green: "var(--info)",
  blue: "#F4F4F4",
  red: "var(--destructive)",
  ink: "#F4F4F4",
  grid: "rgba(255,255,255,0.06)",
  axis: "rgba(255,255,255,0.35)",
  faint: "rgba(255,255,255,0.45)",
};

// ── Frequency Response Chart (Recharts) ─────────────────────────────────────
const FREQ_POINTS = [20, 30, 40, 60, 80, 100, 150, 200, 300, 500, 800,
  1000, 1500, 2000, 3000, 5000, 8000, 10000, 15000, 20000];

function freqLabel(f: number): string {
  if (f >= 1000) return `${f / 1000}k`;
  return String(f);
}

// Simulate a frequency response curve based on gear low/high freq limits
function buildFreqResponse(freqLow: number, freqHigh: number) {
  return FREQ_POINTS.map(f => {
    let db = 0;
    // Rolloff below freqLow
    if (f < freqLow) {
      const octavesBelow = Math.log2(freqLow / f);
      db = -octavesBelow * octavesBelow * 6;
    }
    // Rolloff above freqHigh
    if (f > freqHigh) {
      const octavesAbove = Math.log2(f / freqHigh);
      db = -octavesAbove * octavesAbove * 6;
    }
    // slight presence peak
    const presenceDist = Math.abs(Math.log10(f) - Math.log10(3500));
    db += 1.5 * Math.exp(-(presenceDist * presenceDist) / 0.05);
    return { f, label: freqLabel(f), db: Math.max(-36, Math.round(db * 10) / 10) };
  });
}

interface CustomDotProps {
  cx?: number;
  cy?: number;
  payload?: { f: number };
  crossoverFreq: number;
}

function CrossoverDot({ cx, cy, payload, crossoverFreq }: CustomDotProps) {
  if (!payload || !cx || !cy) return null;
  // Find nearest point to crossover
  const nearest = FREQ_POINTS.reduce((prev, curr) =>
    Math.abs(curr - crossoverFreq) < Math.abs(prev - crossoverFreq) ? curr : prev
  );
  if (payload.f !== nearest) return null;
  return (
    <g>
      <circle cx={cx} cy={cy} r={5} fill={C.gold} stroke="#111312" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={9} fill={C.gold} fillOpacity={0.2} />
    </g>
  );
}

interface FreqChartProps {
  tops: GearItem[];
  subs: GearItem[];
  crossoverFreq: number;
}

function FrequencyResponseChart({ tops, subs, crossoverFreq }: FreqChartProps) {
  const topsData = useMemo(() => {
    if (tops.length === 0) return buildFreqResponse(80, 18000);
    const t = tops[0];
    return buildFreqResponse(t.freqLow ?? 80, t.freqHigh ?? 18000);
  }, [tops]);

  const subsData = useMemo(() => {
    if (subs.length === 0) return null;
    const s = subs[0];
    return buildFreqResponse(s.freqLow ?? 30, s.freqHigh ?? 120);
  }, [subs]);

  // Merge both datasets by frequency index
  const combined = useMemo(() =>
    topsData.map((pt, i) => ({
      ...pt,
      dbSub: subsData ? subsData[i].db : undefined,
    })),
    [topsData, subsData]
  );

  return (
    <div className="w-full" style={{ height: 140 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={combined} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={C.grid}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: C.axis, fontSize: 8, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            interval={2}
          />
          <YAxis
            domain={[-36, 6]}
            tick={{ fill: C.axis, fontSize: 8 }}
            axisLine={false}
            tickLine={false}
            tickCount={5}
          />
          <Tooltip
            contentStyle={{
              background: "#111312",
              border: "1px solid rgba(255,255,255,0.10)",
              borderRadius: 10,
              fontSize: 10,
              color: C.ink,
              boxShadow: "0 8px 24px rgba(0,0,0,0.45)",
            }}
            itemStyle={{ color: C.gold }}
            formatter={(value: number) => [`${value} dB`]}
            labelFormatter={(label: string) => `${label} Hz`}
          />
          {/* 0 dB reference */}
          <ReferenceLine y={0} stroke="rgba(255,255,255,0.15)" strokeDasharray="4 4" />
          {/* Crossover marker */}
          {crossoverFreq > 0 && (
            <ReferenceLine
              x={freqLabel(FREQ_POINTS.reduce((prev, curr) =>
                Math.abs(curr - crossoverFreq) < Math.abs(prev - crossoverFreq) ? curr : prev
              ))}
              stroke={C.gold}
              strokeDasharray="3 3"
              strokeOpacity={0.7}
              label={{ value: `Cruce ${crossoverFreq}Hz`, position: "insideTopRight", fill: C.gold, fontSize: 8 }}
            />
          )}
          {/* Sub response */}
          {subsData && (
            <Line
              dataKey="dbSub"
              stroke={C.amber}
              strokeWidth={1.5}
              dot={false}
              strokeOpacity={0.8}
              strokeDasharray="4 2"
            />
          )}
          {/* Tops response */}
          <Line
            dataKey="db"
            stroke={C.gold}
            strokeWidth={2.5}
            dot={<CrossoverDot crossoverFreq={crossoverFreq} />}
            activeDot={{ r: 4, fill: C.gold }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── SPL Heatmap Grid ─────────────────────────────────────────────────────────
interface SPLHeatmapProps {
  splTarget: number;
  headroom: number;
  coverageAngle: number;
}

function SPLHeatmap({ splTarget, headroom, coverageAngle }: SPLHeatmapProps) {
  const COLS = 7;
  const ROWS = 5;

  // Generate grid cells with SPL dropoff from center
  const cells = useMemo(() => {
    const result: { row: number; col: number; spl: number; inCoverage: boolean }[] = [];
    const centerCol = (COLS - 1) / 2;
    const halfAngleRad = (coverageAngle / 2) * (Math.PI / 180);

    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        // Distance falloff: further rows = more loss
        const distFactor = 1 + row * 0.3;
        const distLoss = 20 * Math.log10(distFactor);
        // Angular offset
        const colOffset = (col - centerCol) / centerCol;
        const angle = Math.atan(colOffset * Math.tan(halfAngleRad) * 1.5);
        // Coverage check
        const inCoverage = Math.abs(angle) <= halfAngleRad;
        // Angular attenuation (cosine rolloff outside coverage)
        const angularLoss = inCoverage ? 0 : 6 + (Math.abs(angle) - halfAngleRad) * (180 / Math.PI) * 0.3;
        const spl = Math.round(splTarget - distLoss - angularLoss);
        result.push({ row, col, spl, inCoverage });
      }
    }
    return result;
  }, [splTarget, coverageAngle]);

  // Color scale: slate (quiet) → green → orange → amber → red (loud)
  function splColor(spl: number): string {
    const norm = Math.max(0, Math.min(1, (spl - 80) / (splTarget + headroom - 80)));
    if (norm > 0.85) return "rgba(255,90,90,0.80)";    // red – very loud
    if (norm > 0.7)  return "rgba(0,217,90,0.80)";     // amber
    if (norm > 0.5)  return "rgba(0,255,102,0.72)";    // orange
    if (norm > 0.3)  return "rgba(94,234,212,0.60)";   // green
    return "rgba(244,244,244,0.40)";                   // blue – quiet
  }

  return (
    <div className="space-y-2">
      {/* Stage label */}
      <div className="flex items-center justify-between text-[9px] text-muted-foreground font-semibold uppercase tracking-[0.28em]">
        <span>Escenario</span>
        <span>← {coverageAngle}° cobertura →</span>
        <span>Escenario</span>
      </div>
      {/* Grid */}
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      >
        {cells.map(({ row, col, spl, inCoverage }) => (
          <div
            key={`${row}-${col}`}
            className="rounded-md flex items-center justify-center relative overflow-hidden"
            style={{
              height: 28,
              background: splColor(spl),
              border: `1px solid ${inCoverage ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.05)"}`,
              opacity: inCoverage ? 1 : 0.45,
            }}
          >
            <span className="text-[8px] font-bold leading-none" style={{ color: "rgba(2,4,3,0.85)" }}>{spl}</span>
          </div>
        ))}
      </div>
      {/* Legend */}
      <div className="flex items-center gap-2 pt-1">
        <div className="flex gap-2 flex-1">
          {["Bajo", "Bueno", "Alto", "Pico"].map((label, i) => (
            <div key={label} className="flex items-center gap-1">
              <div
                className="h-2 w-2 rounded-sm"
                style={{ background: ["rgba(244,244,244,0.6)", "rgba(94,234,212,0.7)", "rgba(0,217,90,0.78)", "rgba(255,90,90,0.82)"][i] }}
              />
              <span className="text-[8px] text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>
        <span className="text-[8px] text-muted-foreground">dB SPL</span>
      </div>
    </div>
  );
}

// ── Coverage Arc Visualizer ──────────────────────────────────────────────────
function CoverageArc({ angle, spl }: { angle: number; spl: number }) {
  const r = 60;
  const cx = 80;
  const cy = 80;
  const halfAngle = (angle / 2) * (Math.PI / 180);
  const x1 = cx + r * Math.sin(-halfAngle);
  const y1 = cy - r * Math.cos(-halfAngle);
  const x2 = cx + r * Math.sin(halfAngle);
  const y2 = cy - r * Math.cos(halfAngle);
  const large = angle > 180 ? 1 : 0;
  const color = spl >= 140 ? C.red : spl >= 132 ? C.amber : C.green;

  return (
    <svg width={160} height={110} className="overflow-visible">
      <defs>
        <radialGradient id="arc-fill" cx="50%" cy="100%" r="80%">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>
      <path
        d={`M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`}
        fill="url(#arc-fill)"
      />
      <path
        d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.85"
      />
      <line x1={cx} y1={cy} x2={cx} y2={cy - r} stroke={color} strokeWidth="1.5" strokeOpacity="0.5" />
      <circle cx={cx} cy={cy} r={4} fill={color} />
      <circle cx={cx} cy={cy} r={8} fill={color} fillOpacity="0.2" />
      <text x={cx} y={cy + 18} textAnchor="middle" fill={C.ink} fontSize="11" fontWeight="bold" opacity="0.85">
        {spl} dB
      </text>
      <text x={cx} y={cy - r - 8} textAnchor="middle" fill={color} fontSize="10" fontWeight="bold">
        {angle}°
      </text>
    </svg>
  );
}

// ── Gear Section ─────────────────────────────────────────────────────────────
interface GearSectionProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  items: GearItem[];
  desc: string;
  splMax?: number | null;
  coverage?: number | null;
  emptyRoute: string;
}

function GearSection({ title, icon: Icon, iconColor, items, desc, splMax, coverage, emptyRoute }: GearSectionProps) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center"
            style={{ background: `${iconColor}1A`, border: `1px solid ${iconColor}33` }}
          >
            <Icon size={15} style={{ color: iconColor }} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground leading-none">{title}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {splMax != null && splMax > 0 && <Badge color="blue">{splMax} dB</Badge>}
          {coverage != null && <Badge color="gray">{coverage}°</Badge>}
        </div>
      </div>
      {items.length === 0 ? (
        <Link to={emptyRoute}>
          <div className="flex items-center justify-between rounded-xl border border-dashed border-border px-3 py-2.5 text-xs text-muted-foreground cursor-pointer hover:border-accent/40 hover:text-foreground transition-all">
            <span>Agregar {title.toLowerCase()}</span>
            <ChevronRight size={13} />
          </div>
        </Link>
      ) : (
        <div className="flex flex-wrap gap-2">
          {items.map(item => (
            <div
              key={item.id}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ background: `${iconColor}12`, border: `1px solid ${iconColor}26` }}
            >
              <div className="h-1.5 w-1.5 rounded-full" style={{ background: iconColor }} />
              <span className="text-xs font-semibold text-foreground">{item.brand} {item.model}</span>
              {item.active && <Badge color="green">Activo</Badge>}
            </div>
          ))}
        </div>
      )}
    </GlassCard>
  );
}

// ── Metric Tile ──────────────────────────────────────────────────────────────
function MetricTile({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <GlassCard className="p-4">
      <p className="text-[9px] font-semibold uppercase tracking-[0.28em] text-muted-foreground mb-2">{label}</p>
      <div className="flex items-end gap-1 leading-none">
        <span className="text-[22px] font-medium" style={{ color: color ?? C.ink }}>{value}</span>
        {unit && <span className="text-[11px] text-muted-foreground mb-0.5">{unit}</span>}
      </div>
    </GlassCard>
  );
}

// ── SPL Budget Bar ───────────────────────────────────────────────────────────
function SPLBar({ target, headroom, max }: { target: number; headroom: number; max: number }) {
  const pct = Math.min(100, (target / max) * 100);
  const hPct = Math.min(100, ((target + headroom) / max) * 100);
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>80 dB</span>
        <span>SPL Objetivo: <span className="text-accent font-bold">{target} dB</span></span>
        <span>{max} dB</span>
      </div>
      <div className="relative h-3 bg-secondary rounded-full overflow-hidden">
        <div
          className="absolute top-0 bottom-0 rounded-full opacity-40"
          style={{ left: `${pct}%`, width: `${hPct - pct}%`, background: `linear-gradient(90deg, ${C.green}, ${C.green}aa)` }}
        />
        <div
          className="absolute top-0 bottom-0 rounded-full"
          style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.amber})` }}
        />
        <div className="absolute top-0 bottom-0 w-0.5 bg-foreground/60" style={{ left: `${pct}%` }} />
      </div>
      <div className="flex justify-between text-[9px] text-muted-foreground">
        <span>SPL Objetivo</span>
        <span style={{ color: C.green }}>{headroom} dB margen</span>
      </div>
    </div>
  );
}

// ── Main PA Screen ───────────────────────────────────────────────────────────
export default function PA() {
  const { room, acoustics, tops, subs, monitors, amps } = useAppStore();

  const pa = useMemo(() =>
    room && acoustics
      ? calculatePARecommendation(room, acoustics, tops, subs, monitors, amps)
      : null,
    [room, acoustics, tops, subs, monitors, amps]
  );

  if (!room || !acoustics) {
    return (
      <EmptyRoomState
        title="Sistema PA"
        icon={AudioWaveform}
        iconColor={C.gold}
        description="Completá un Escaneo de Sala para calcular configuración de PA, curva de respuesta en frecuencia y target de SPL."
      />
    );
  }

  const maxSPL = tops[0]?.splMax ?? 140;

  return (
    <ScreenShell>
      <PageHeader
        title="Sistema PA"
        subtitle={room.name}
        right={
          <StatusPill
            status={pa?.systemReady ? "ready" : "warning"}
            label={pa?.systemReady ? "Sistema Listo" : "Incompleto"}
          />
        }
      />

      {/* Status banner */}
      {pa?.systemReady ? (
        <div className="px-4 mb-4">
          <div className="flex items-center gap-2.5 rounded-xl bg-chart-2/10 border border-chart-2/25 px-4 py-3">
            <CheckCircle2 size={15} className="text-chart-2 shrink-0" />
            <p className="text-xs font-semibold text-chart-2">Sistema PA configurado y listo para despliegue</p>
          </div>
        </div>
      ) : (
        <div className="px-4 mb-4">
          <WarningBanner message="Sistema PA incompleto — agregá tops para continuar" type="warning" />
        </div>
      )}

      {/* Key metrics */}
      <div className="px-4 mb-4 grid grid-cols-3 gap-2.5">
        <MetricTile label="SPL Objetivo" value={pa?.splTarget ?? "—"} unit="dB" color={C.gold} />
        <MetricTile label="Margen" value={pa?.headroomDb ?? "—"} unit="dB" color={C.green} />
        <MetricTile label="Cobertura" value={pa?.coverageAngle ?? "—"} unit="°" color={C.blue} />
      </div>

      {/* SPL Budget Bar */}
      {pa && (
        <div className="px-4 mb-4">
          <GlassCard className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">Presupuesto SPL</p>
            <SPLBar target={pa.splTarget} headroom={pa.headroomDb} max={maxSPL || 140} />
          </GlassCard>
        </div>
      )}

      {/* ── Frequency Response Chart ─────────────────── */}
      <div className="px-4 mb-4">
        <GlassCard className="p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">Respuesta en Frecuencia</p>
            <div className="flex items-center gap-3 text-[9px] text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <div className="h-0.5 w-4 rounded-full" style={{ background: C.gold }} />
                <span>Tops</span>
              </div>
              {subs.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-0.5 w-4 rounded-full opacity-80" style={{ background: C.amber }} />
                  <span>Subs</span>
                </div>
              )}
              {pa && pa.crossoverFreq > 0 && (
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-0.5 opacity-80" style={{ background: C.gold }} />
                  <span>Cruce</span>
                </div>
              )}
            </div>
          </div>
          <div className="bg-secondary/50 rounded-xl p-3 border border-border">
            <FrequencyResponseChart
              tops={tops}
              subs={subs}
              crossoverFreq={pa?.crossoverFreq ?? 0}
            />
          </div>
        </GlassCard>
      </div>

      {/* ── SPL Heatmap ──────────────────────────────── */}
      {pa && tops.length > 0 && (
        <div className="px-4 mb-4">
          <GlassCard className="p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">Mapa de Cobertura SPL</p>
              <Badge color="gray">Vista del Público</Badge>
            </div>
            <SPLHeatmap
              splTarget={pa.splTarget}
              headroom={pa.headroomDb}
              coverageAngle={pa.coverageAngle}
            />
          </GlassCard>
        </div>
      )}

      {/* Coverage pattern + sub strategy */}
      {tops.length > 0 && (
        <div className="px-4 mb-4 grid grid-cols-2 gap-2.5">
          <GlassCard className="p-4 flex flex-col items-center">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-2 self-start">Patrón de Cobertura</p>
            <CoverageArc angle={pa?.coverageAngle ?? 90} spl={tops[0]?.splMax ?? 130} />
          </GlassCard>
          <GlassCard className="p-4">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">Estrategia de Subs</p>
            {subs.length > 0 && pa ? (
              <div className="space-y-3">
                <div className="h-10 w-10 rounded-xl bg-accent/12 border border-accent/25 flex items-center justify-center">
                  <Activity size={16} className="text-accent" />
                </div>
                <p className="text-sm font-bold text-foreground leading-tight">{pa.subStrategy}</p>
                <div className="rounded-lg bg-secondary px-2 py-1.5">
                  <p className="text-[10px] text-muted-foreground">Cruce</p>
                  <p className="text-sm font-bold text-accent">{pa.crossoverFreq} Hz</p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground mt-4">Sin subs seleccionados</p>
            )}
          </GlassCard>
        </div>
      )}

      {/* Gear sections */}
      <div className="px-4 space-y-3 mb-4">
        <GearSection
          title="Tops / Line Arrays"
          icon={Speaker}
          iconColor={C.gold}
          items={tops}
          desc={pa?.topsConfig ?? "Sin tops seleccionados"}
          splMax={tops[0]?.splMax}
          coverage={tops[0]?.coverageH}
          emptyRoute="/gear-builder"
        />
        <GearSection
          title="Subwoofers"
          icon={Radio}
          iconColor={C.amber}
          items={subs}
          desc={pa?.subsConfig ?? "Sin subs seleccionados"}
          splMax={subs[0]?.splMax}
          emptyRoute="/gear-builder"
        />
        <GearSection
          title="Monitores de Escenario"
          icon={Mic2}
          iconColor={C.green}
          items={monitors}
          desc={pa?.monitorsConfig ?? "Sin monitores seleccionados"}
          splMax={monitors[0]?.splMax}
          coverage={monitors[0]?.coverageH}
          emptyRoute="/gear-builder"
        />
        <GearSection
          title="Amplificadores de Potencia"
          icon={Zap}
          iconColor={C.blue}
          items={amps}
          desc={amps.length > 0 ? `${amps.length}x amplificador${amps.length > 1 ? "es" : ""} asignado${amps.length > 1 ? "s" : ""}` : "Sin amplificadores seleccionados"}
          emptyRoute="/gear-builder"
        />
      </div>

      {/* EQ Hints */}
      {pa && pa.eqHints.length > 0 && (
        <div className="px-4 mb-4">
          <GlassCard className="p-4">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">Sugerencias DSP / EQ</p>
            <div className="space-y-2.5">
              {pa.eqHints.map((hint, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.07 }}
                  className="flex items-start gap-2.5"
                >
                  <div className="h-1.5 w-1.5 rounded-full bg-accent mt-1.5 shrink-0" />
                  <p className="text-xs text-foreground/70 leading-relaxed">{hint}</p>
                </motion.div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Amp suggestions */}
      {pa && pa.ampSuggestions.length > 0 && (
        <div className="px-4 mb-4">
          <GlassCard className="p-4">
            <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">Notas de Amplificación</p>
            <div className="space-y-2">
              {pa.ampSuggestions.map((s, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: C.blue }} />
                  <p className="text-xs text-foreground/70">{s}</p>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      )}

      {/* Warnings */}
      {pa && pa.warnings.length > 0 && (
        <div className="px-4 pb-4 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={12} className="text-accent" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.28em]">Advertencias del Sistema</p>
          </div>
          {pa.warnings.map((w, i) => (
            <WarningBanner key={i} message={w} type="warning" />
          ))}
        </div>
      )}
    </ScreenShell>
  );
}
