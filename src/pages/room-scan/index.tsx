// SoundMap — Room Scan — Dark premium professional acoustic tool
import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "motion/react";
import { RT60Modal } from "@/components/soundmap/rt60-modal.tsx";
import { EarlyReflectionsPanel } from "@/components/soundmap/early-reflections-panel.tsx";
import { ARRoomScanModal } from "@/components/soundmap/ar-room-scan.tsx";
import { feedback } from "@/lib/feedback.ts";
import { Waves as WavesIcon, Camera as CameraIcon, FlaskConical, Thermometer, LayoutTemplate } from "lucide-react";
import {
  CheckCircle, ChevronRight, AlertTriangle, Layers,
  Volume2, Waves, Activity, ArrowRight
} from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import {
  calculateAcoustics,
  type RoomScanInput,
  type RoomMaterial,
  type CeilingType,
  type FloorType,
  type AcousticsResult,
} from "@/lib/audio/acoustics.ts";
import { GlassCard, ProButton, StatusPill, ScreenShell } from "@/components/soundmap/ui.tsx";
import { cn } from "@/lib/utils.ts";
import { useTranslation } from "react-i18next";
import { useInWizard } from "@/lib/wizard-context.ts";

// ── Palette (aligned to dark premium design tokens) ────────────────────────────
const GOLD = "var(--accent)";
const GREEN = "var(--info)";
const RED = "var(--destructive)";
const PURPLE = "#9A9A9A";
const AMBER = "#00D95A";

// ── Types ──────────────────────────────────────────────────────────────────────
type Step = 1 | 2 | 3 | 4;

const CEILING_OPTIONS: { value: CeilingType; label: string; icon: string }[] = [
  { value: "flat", label: "Flat", icon: "▬" },
  { value: "vaulted", label: "Vaulted", icon: "⌒" },
  { value: "domed", label: "Domed", icon: "◡" },
  { value: "industrial", label: "Industrial", icon: "⋀" },
  { value: "acoustic-tile", label: "Acoustic Tile", icon: "▦" },
];
const WALL_OPTIONS: { value: RoomMaterial; label: string }[] = [
  { value: "concrete", label: "Concrete" },
  { value: "drywall", label: "Drywall" },
  { value: "brick", label: "Brick" },
  { value: "wood", label: "Wood" },
  { value: "glass", label: "Glass" },
  { value: "carpet", label: "Carpet" },
  { value: "foam", label: "Foam" },
];
const FLOOR_OPTIONS: { value: FloorType; label: string }[] = [
  { value: "concrete", label: "Concrete" },
  { value: "tile", label: "Tile" },
  { value: "wood", label: "Wood" },
  { value: "carpet", label: "Carpet" },
];

// ── Animated Waveform ──────────────────────────────────────────────────────────
function WaveformViz({ active, progress }: { active: boolean; progress: number }) {
  const BAR_COUNT = 32;
  return (
    <div className="flex items-center justify-center gap-[2px] h-12">
      {Array.from({ length: BAR_COUNT }).map((_, i) => {
        const phase = (i / BAR_COUNT) * Math.PI * 2;
        const baseH = Math.abs(Math.sin(phase)) * 60 + 10;
        const scanInfluence = active ? Math.abs(Math.sin(phase + progress * 0.2)) * 80 + 10 : baseH * 0.3;
        const height = active ? scanInfluence : baseH * 0.3;
        const color = active
          ? i / BAR_COUNT < progress / 100
            ? GOLD
            : "rgba(0,255,102,0.25)"
          : "rgba(255,255,255,0.10)";
        return (
          <motion.div
            key={i}
            className="rounded-full w-[3px]"
            animate={{ height: `${height}%` }}
            transition={{ duration: 0.15, delay: i * 0.01 }}
            style={{ backgroundColor: color, minHeight: 3 }}
          />
        );
      })}
    </div>
  );
}

// ── Scanner Ring ───────────────────────────────────────────────────────────────
function ScannerRing({ progress, scanning }: { progress: number; scanning: boolean }) {
  const size = 200;
  const stroke = 8;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;

  const { t } = useTranslation();
  // Phase label sequence
  const phases = [t("room_scan.phase0"), t("room_scan.phase1"), t("room_scan.phase2"), t("room_scan.phase3"), t("room_scan.phase4")];
  const phaseIdx = Math.min(Math.floor(progress / 20), phases.length - 1);

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer glow rings */}
      {scanning && (
        <>
          <motion.div
            className="absolute rounded-full border border-accent/15"
            style={{ width: size + 40, height: size + 40 }}
            animate={{ scale: [1, 1.05, 1], opacity: [0.4, 0.15, 0.4] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <motion.div
            className="absolute rounded-full border border-accent/10"
            style={{ width: size + 70, height: size + 70 }}
            animate={{ scale: [1, 1.08, 1], opacity: [0.25, 0.08, 0.25] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: 0.3 }}
          />
        </>
      )}

      {/* SVG rings */}
      <svg width={size} height={size} className="-rotate-90">
        {/* Background ring */}
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
        {/* Inner decorative ring */}
        <circle cx={size / 2} cy={size / 2} r={r - 18} fill="none" stroke="rgba(0,255,102,0.18)" strokeWidth={1} strokeDasharray="4 6" />
        {/* Progress arc */}
        <circle
          cx={size / 2} cy={size / 2} r={r}
          fill="none"
          stroke={scanning ? GOLD : "rgba(0,255,102,0.45)"}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ filter: scanning ? "drop-shadow(0 0 6px rgba(0,255,102,0.45))" : "none", transition: "stroke-dashoffset 0.3s ease" }}
        />
        {/* Tick marks */}
        {Array.from({ length: 36 }).map((_, i) => {
          const angle = (i / 36) * 360;
          const rad = (angle * Math.PI) / 180;
          const x1 = size / 2 + (r + 4) * Math.cos(rad);
          const y1 = size / 2 + (r + 4) * Math.sin(rad);
          const x2 = size / 2 + (r + 8) * Math.cos(rad);
          const y2 = size / 2 + (r + 8) * Math.sin(rad);
          return (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2}
              stroke={i % 3 === 0 ? "var(--accent-ring)" : "var(--border-strong)"} strokeWidth={i % 3 === 0 ? 2 : 1} />
          );
        })}
      </svg>

      {/* Center content */}
      <div className="absolute flex flex-col items-center gap-1">
        {scanning ? (
          <>
            <motion.span
              className="text-3xl font-bold text-foreground"
              key={Math.floor(progress)}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.1 }}
            >
              {Math.round(progress)}
              <span className="text-sm text-muted-foreground">%</span>
            </motion.span>
            <span className="text-[10px] text-accent font-semibold uppercase tracking-[0.2em] text-center px-4">
              {phases[phaseIdx]}
            </span>
          </>
        ) : (
          <>
            <Waves size={28} className="text-accent" />
            <span className="text-xs text-muted-foreground font-semibold mt-1">{t("room_scan.ready")}</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Acoustic Heatmap Bar ───────────────────────────────────────────────────────
function AcousticBar({ label, value, max, color, unit }: {
  label: string; value: number; max: number; color: string; unit?: string;
}) {
  const pct = Math.min(100, (value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-[11px]">
        <span className="text-muted-foreground font-medium">{label}</span>
        <span className="font-bold text-foreground">{value}{unit ?? ""}</span>
      </div>
      <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
        <motion.div
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ── Score Ring ─────────────────────────────────────────────────────────────────
function ScoreRing({ value, label, color }: { value: number; label: string; color: string }) {
  const size = 72;
  const stroke = 5;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (value / 100) * circ;
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative">
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth={stroke} />
          <motion.circle
            cx={size / 2} cy={size / 2} r={r}
            fill="none" stroke={color} strokeWidth={stroke}
            strokeDasharray={circ}
            initial={{ strokeDashoffset: circ }}
            animate={{ strokeDashoffset: offset }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-bold text-foreground">{value}</span>
        </div>
      </div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-[0.2em] font-semibold">{label}</span>
    </div>
  );
}

// ── Material Chip ──────────────────────────────────────────────────────────────
/**
 * Chip de selección de material.
 * V6: el seleccionado se marca con el acento en el TEXTO y un borde tenue, no
 * con un bloque relleno. Radio de chip (4px), no de tarjeta.
 */
function MaterialChip({
  label, selected, onClick
}: { label: string; selected: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className="px-3 h-8 text-[12px] cursor-pointer focus-visible:outline-none focus-visible:ring-2"
      style={{
        borderRadius: "var(--radius-chip)",
        background: selected ? "var(--accent-dim2)" : "transparent",
        boxShadow: selected ? "0 0 0 1px var(--accent-ring)" : "0 0 0 1px var(--border)",
        color: selected ? "var(--accent)" : "var(--muted-foreground)",
        transition: "color var(--dur-fast) var(--ease), background var(--dur-fast) var(--ease)",
      }}
      onMouseEnter={(e) => { if (!selected) e.currentTarget.style.color = "var(--foreground)"; }}
      onMouseLeave={(e) => { if (!selected) e.currentTarget.style.color = "var(--muted-foreground)"; }}
    >
      {label}
    </button>
  );
}

// ── Number Input ───────────────────────────────────────────────────────────────
/**
 * Campo numérico técnico.
 *
 * Antes cada campo era una TARJETA (`rounded-2xl bg-secondary/50 border p-3`):
 * seis campos = seis tarjetas apiladas, justo lo que el brief V6 prohíbe. Ahora
 * es una fila: label a la izquierda, valor en mono a la derecha, y los
 * steppers como controles discretos. El campo se lee como una lectura de
 * instrumento editable, no como un formulario.
 *
 * El valor va en Geist Mono con `tabular-nums` para que no baile al escribir.
 */
function NumInput({
  label, value, onChange, suffix, step = 1
}: { label: string; value: number; onChange: (v: number) => void; suffix?: string; step?: number }) {
  const id = `num-${label.replace(/\s+/g, "-").toLowerCase()}`;
  return (
    <div
      className="flex items-center gap-3 px-3 h-11"
      style={{
        borderRadius: "var(--radius-control)",
        background: "var(--surface-1)",
        boxShadow: "0 0 0 1px var(--border)",
      }}
    >
      <label htmlFor={id} className="text-[12px] flex-1 min-w-0 truncate" style={{ color: "var(--muted-foreground)" }}>
        {label}
      </label>
      <button
        onClick={() => onChange(Math.max(0, value - step))}
        aria-label={`Reducir ${label}`}
        className="h-6 w-6 flex items-center justify-center cursor-pointer shrink-0 text-[14px]"
        style={{ borderRadius: "var(--radius-chip)", color: "var(--muted-foreground)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
      >−</button>
      <input
        id={id}
        type="number"
        value={value}
        onChange={e => onChange(parseFloat(e.target.value) || 0)}
        className="t-mono w-[52px] bg-transparent text-right text-[14px] font-medium text-foreground focus:outline-none shrink-0"
      />
      <button
        onClick={() => onChange(value + step)}
        aria-label={`Aumentar ${label}`}
        className="h-6 w-6 flex items-center justify-center cursor-pointer shrink-0 text-[14px]"
        style={{ borderRadius: "var(--radius-chip)", color: "var(--muted-foreground)" }}
        onMouseEnter={(e) => { e.currentTarget.style.color = "var(--accent)"; }}
        onMouseLeave={(e) => { e.currentTarget.style.color = "var(--muted-foreground)"; }}
      >+</button>
      <span className="text-[11px] w-5 shrink-0 text-right" style={{ color: "var(--muted-foreground)" }}>
        {suffix ?? ""}
      </span>
    </div>
  );
}

// ── Results Panel ──────────────────────────────────────────────────────────────
function ResultsPanel({ result, room, venueName, onContinue }: {
  result: AcousticsResult;
  /** Necesario para las reflexiones tempranas: dependen de la geometría, no del RT60. */
  room: RoomScanInput;
  venueName: string;
  onContinue: () => void;
}) {
  const { t } = useTranslation();
  const rt60Color = result.rt60Audience < 0.8 ? GREEN : result.rt60Audience < 1.5 ? GREEN : result.rt60Audience < 2.5 ? AMBER : RED;
  const echoColor = result.echoRisk === "low" ? GREEN : result.echoRisk === "medium" ? AMBER : RED;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="space-y-4"
    >
      {/* Success header */}
      <div className="flex items-center gap-3 px-1">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 300, delay: 0.1 }}
          className="h-8 w-8 rounded-full bg-chart-2/15 flex items-center justify-center"
        >
          <CheckCircle size={18} className="text-chart-2" />
        </motion.div>
        <div>
          <p className="text-sm font-bold text-chart-2">{t("room_scan.scan_complete")}</p>
          <p className="text-[11px] text-muted-foreground">{venueName}</p>
        </div>
      </div>

      {/* Primary metrics — big display */}
      <div className="grid grid-cols-2 gap-3">
        {[
          { label: "RT60 Empty", value: result.rt60Empty, unit: "s", color: GREEN },
          { label: "RT60 + Audience", value: result.rt60Audience, unit: "s", color: GOLD },
          { label: "Volume", value: result.volume, unit: "m³", color: PURPLE },
          { label: "Critical Distance", value: result.criticalDistance, unit: "m", color: AMBER },
        ].map((m, i) => (
          <motion.div
            key={m.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.08 }}
          >
            <GlassCard className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1">{m.label}</p>
              <div className="flex items-end gap-1">
                <span className="text-2xl font-bold leading-none" style={{ color: m.color }}>{m.value}</span>
                <span className="text-xs text-muted-foreground mb-0.5">{m.unit}</span>
              </div>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      {/* Scores */}
      <GlassCard className="p-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-4">{t("room_scan.acoustic_scores")}</p>
        <div className="flex justify-around">
          <ScoreRing value={result.speechScore} label={t("room_scan.speech")} color={GREEN} />
          <ScoreRing value={result.musicScore} label={t("room_scan.music")} color={PURPLE} />
          <ScoreRing value={Math.round(100 - (result.rt60Audience / 4) * 100)} label={t("room_scan.clarity")} color={AMBER} />
        </div>
      </GlassCard>

      {/* Frequency & modal analysis */}
      <GlassCard className="p-4 space-y-3">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-1">{t("room_scan.freq_analysis")}</p>
        <AcousticBar label="Schroeder Frequency" value={result.schroederFreq} max={500} color={PURPLE} unit=" Hz" />
        <AcousticBar label="Axial Mode X" value={result.axialModes.x} max={200} color={GOLD} unit=" Hz" />
        <AcousticBar label="Axial Mode Y" value={result.axialModes.y} max={200} color={GREEN} unit=" Hz" />
        <AcousticBar label="Axial Mode Z" value={result.axialModes.z} max={200} color={AMBER} unit=" Hz" />
      </GlassCard>

      {/* Reflexiones tempranas — conecta calculateEarlyReflections, que estaba
          implementado y correcto pero sin ninguna pantalla que lo llamara. */}
      <EarlyReflectionsPanel room={room} />

      {/* Risk indicators */}
      <GlassCard className="p-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">{t("room_scan.risk_assessment")}</p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: "Echo Risk", value: result.echoRisk, color: echoColor },
            { label: "RT60", value: `${result.rt60Audience}s`, color: rt60Color },
            { label: "Flutter Echo", value: result.flutterEchoRisk ? "Risk" : "Clear", color: result.flutterEchoRisk ? AMBER : GREEN },
            { label: "SBIR", value: result.sbirRisk ? "Risk" : "Clear", color: result.sbirRisk ? AMBER : GREEN },
            { label: "Low-Mid Buildup", value: result.lowMidBuildupRisk ? "Likely" : "Clear", color: result.lowMidBuildupRisk ? RED : GREEN },
          ].map(item => (
            <div key={item.label} className="p-2.5" style={{ borderRadius: "var(--radius-control)", background: "var(--surface-1)", boxShadow: "0 0 0 1px var(--border)" }}>
              <p className="text-[10px] text-muted-foreground mb-0.5">{item.label}</p>
              <p className="text-xs font-bold capitalize" style={{ color: item.color }}>{item.value}</p>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Recommendations */}
      <GlassCard className="p-4">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold mb-3">{t("room_scan.engineer_notes")}</p>
        <div className="space-y-2">
          {result.recommendations.map((rec, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 + i * 0.06 }}
              className="flex items-start gap-2.5"
            >
              <div className="mt-1 h-1.5 w-1.5 rounded-full bg-accent shrink-0" />
              <p className="text-xs text-secondary-foreground leading-relaxed">{rec}</p>
            </motion.div>
          ))}
        </div>
      </GlassCard>

      {/* CTA */}
      <ProButton fullWidth size="lg" onClick={onContinue}>
        {t("room_scan.continue_gear")} <ArrowRight size={16} />
      </ProButton>
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function RoomScan() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const inWizard = useInWizard();
  const applyRoomScan = useAppStore(s => s.applyRoomScan);
  const loadDemoVenue = useAppStore(s => s.loadDemoVenue);
  const [step, setStep] = useState<Step>(1);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [rt60ModalOpen, setRt60ModalOpen] = useState(false);
  const [arScanOpen, setArScanOpen] = useState(false);
  const [measuredRt60, setMeasuredRt60] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [form, setForm] = useState<RoomScanInput>({
    name: "",
    length: 20,
    width: 15,
    height: 5,
    capacity: 200,
    ceilingType: "flat",
    wallMaterial: "drywall",
    floorType: "concrete",
    windowCount: 0,
    temperature: 20,
    humidity: 50,
  });

  const setField = (key: keyof RoomScanInput, value: string | number) =>
    setForm(f => ({ ...f, [key]: value }));

  useEffect(() => {
    // El setTimeout anterior nunca se limpiaba: si desmontabas a mitad del
    // escaneo, quedaba un setState sobre un componente desmontado.
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  const handleScan = () => {
    // El cálculo acústico es síncrono e instantáneo: Sabine, modos axiales,
    // distancia crítica y absorción del aire son aritmética, no una medición.
    //
    // Antes esto corría una barra de progreso FALSA de ~2 s alimentada con
    // `Math.random()`. Simular trabajo que no existe es exactamente lo que le
    // resta credibilidad a una herramienta cuyo argumento es el rigor: si el
    // escaneo finge dos segundos de proceso, el usuario tiene motivos para
    // dudar del resto de los números.
    //
    // Se conserva una transición breve y FIJA (no aleatoria) para que el cambio
    // de paso no sea un salto brusco — eso es una decisión de animación, no un
    // proceso inventado.
    const scanForm: RoomScanInput = form.name.trim() ? form : { ...form, name: "Recinto sin nombre" };
    const acoustics = calculateAcoustics(scanForm);
    applyRoomScan(scanForm, acoustics);
    feedback("success");
    setScanning(true);
    setScanProgress(100);
    timerRef.current = setTimeout(() => {
      setScanning(false);
      setStep(4);
    }, 320);
  };

  // `calculateAcoustics` se llamaba en CADA render del paso 4. Es barato, pero
  // el panel de resultados incluye reflexiones tempranas y modos de sala: sin
  // memo, cada pulsación de tecla recalcula todo el árbol.
  const result = useMemo(
    () => (step === 4 ? calculateAcoustics(form) : null),
    [step, form],
  );

  const STEP_LABELS = [t("room_scan.step_venue"), t("room_scan.step_materials"), t("room_scan.step_scan")];

  return (
    <ScreenShell compact={inWizard}>
      {/* Header — hidden inside wizard (wizard owns the title) */}
      {!inWizard && (
        <div className="mb-8">
          <div className="flex items-end justify-between gap-6 mb-3 flex-wrap">
            <div className="min-w-0">
              <p className="t-label mb-2" style={{ color: "var(--muted-foreground)" }}>
                Design
              </p>
              <h1
                className="text-[22px] md:text-[26px] leading-[1.1] tracking-[-0.02em] font-semibold text-foreground"
                data-testid="page-header-title"
              >
                {t("room_scan.title")}
              </h1>
            </div>
            {step < 4 && (
              <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-[0.28em]">
                {t("room_scan.step", { step })}
              </span>
            )}
          </div>
          {step < 4 && (
            <p className="text-[14px] text-muted-foreground max-w-xl leading-relaxed">
              {[t("room_scan.step1_subtitle"), t("room_scan.step2_subtitle"), t("room_scan.step3_subtitle"), ""][step - 1]}
            </p>
          )}
        </div>
      )}

      {/* Step progress pills — hidden inside wizard (wizard shows step chips) */}
      {!inWizard && step < 4 && (
        <div className="mb-5">
          <div className="flex gap-2">
            {STEP_LABELS.map((label, i) => {
              const s = (i + 1) as 1 | 2 | 3;
              const active = step === s;
              const done = step > s;
              return (
                <div key={s} className={cn(
                  "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                  active ? "bg-accent/12 border border-accent/30 text-accent"
                    : done ? "bg-chart-2/10 border border-chart-2/25 text-chart-2"
                    : "bg-secondary/50 border border-border text-muted-foreground"
                )}>
                  {done ? <CheckCircle size={10} /> : <span className="text-[9px]">{s}</span>}
                  {label}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sub-pasos internos del Room. Antes eran tres barritas sin etiqueta más
          un "1 / 3": el usuario veía que había tres etapas pero no cuáles. V6
          las nombra, con el activo en acento y los completados marcados. */}
      {inWizard && step < 4 && (
        <div className="px-4 mb-5 flex items-center gap-4" data-testid="room-substeps">
          {STEP_LABELS.map((label, i) => {
            const s = (i + 1) as 1 | 2 | 3;
            const active = step === s;
            const done = step > s;
            return (
              <div key={s} className="flex items-center gap-1.5 shrink-0">
                <span
                  className="t-mono text-[10px]"
                  style={{ color: active ? "var(--accent)" : done ? "var(--secondary-foreground)" : "var(--muted-foreground)" }}
                >
                  {String(s).padStart(2, "0")}
                </span>
                <span
                  className="text-[11px]"
                  style={{ color: active ? "var(--accent)" : done ? "var(--secondary-foreground)" : "var(--muted-foreground)" }}
                >
                  {label}
                </span>
                {done && <CheckCircle size={10} style={{ color: "var(--accent)" }} />}
              </div>
            );
          })}
        </div>
      )}

      <AnimatePresence mode="wait">
        {/* ── STEP 1 — Venue Details ── */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="px-4 space-y-4 pb-32"
          >
            {/* Load Demo shortcut — only inside wizard, only when no room yet */}
            {inWizard && !form.name.trim() && form.length === 20 && form.width === 15 && (
              <motion.button
                type="button"
                onClick={() => { feedback("success"); loadDemoVenue(); }}
                data-testid="wizard-load-demo-btn"
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 cursor-pointer text-left"
                style={{
                  background: "linear-gradient(135deg, rgba(201,240,62,0.14) 0%, rgba(201,240,62,0.05) 100%)",
                  boxShadow: "0 0 0 1px rgba(201,240,62,0.35), 0 12px 32px -12px rgba(201,240,62,0.35)",
                }}
              >
                <div
                  className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "var(--sm-accent)", color: "var(--background)" }}
                >
                  <FlaskConical size={17} strokeWidth={2} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[14px] font-medium text-foreground leading-tight">Explorar con demo</p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                    The Warehouse Club · 400 pax · sistema completo pre-cargado
                  </p>
                </div>
                <ChevronRight size={13} className="text-muted-foreground shrink-0" strokeWidth={1.75} />
              </motion.button>
            )}

            {/* Plantillas — /templates sólo se alcanzaba desde //legacy, una
                página muerta. Su lugar natural es acá: es un punto de partida
                del diseño, no una sección aparte. */}
            {inWizard && !form.name.trim() && (
              <button
                type="button"
                onClick={() => { feedback("tap"); navigate("/templates"); }}
                data-testid="room-scan-templates-btn"
                className="w-full flex items-center gap-3 rounded-2xl px-5 py-3.5 cursor-pointer text-left"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.07)",
                }}
              >
                <div
                  className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)", color: "var(--sm-muted)" }}
                >
                  <LayoutTemplate size={15} strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground leading-tight">Empezar desde una plantilla</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">Iglesia, club, teatro, salón — y ajustás</p>
                </div>
                <ChevronRight size={13} className="text-muted-foreground shrink-0" strokeWidth={1.75} />
              </button>
            )}

            {/* Venue name */}
            <GlassCard className="p-4">
              <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-2">{t("room_scan.venue_name")}</label>
              <input
                type="text"
                value={form.name}
                onChange={e => setField("name", e.target.value)}
                placeholder={t("room_scan.venue_placeholder")}
                data-testid="room-name-input"
                className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50 focus:bg-accent/5 transition-all"
              />
            </GlassCard>

            {/* AR Scan CTA — Vitals style, single lime accent */}
            <button
              type="button"
              onClick={() => { feedback("select"); setArScanOpen(true); }}
              data-testid="open-ar-scan-btn"
              className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 hover:-translate-y-[1px] transition-all cursor-pointer text-left"
              style={{
                background: "rgba(201,240,62,0.06)",
                boxShadow: "0 0 0 1px rgba(201,240,62,0.22)",
              }}
            >
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(201,240,62,0.15)", color: "var(--sm-accent)" }}
              >
                <CameraIcon size={15} strokeWidth={1.75} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-[13px] font-medium text-foreground">Escaneo AR</p>
                  <span className="text-[9px] font-medium uppercase tracking-[0.24em] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(201,240,62,0.15)", color: "var(--sm-accent)" }}>β</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5">Medí dimensiones apuntando esquinas con la cámara</p>
              </div>
              <ChevronRight size={13} className="text-muted-foreground shrink-0" strokeWidth={1.75} />
            </button>


            {/* Dimensions */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Layers size={14} className="text-accent" />
                <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">{t("room_scan.dimensions")}</label>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                <NumInput label="Length" value={form.length} onChange={v => setField("length", v)} suffix="m" step={1} />
                <NumInput label="Width" value={form.width} onChange={v => setField("width", v)} suffix="m" step={1} />
                <NumInput label="Height" value={form.height} onChange={v => setField("height", v)} suffix="m" step={0.5} />
              </div>
              {/* Live volume preview */}
              <div className="mt-3 rounded-xl bg-secondary/50 border border-border p-3 flex items-center justify-between">
                <span className="text-[11px] text-muted-foreground">{t("room_scan.volume")}</span>
                <span className="text-sm font-bold text-accent">{Math.round(form.length * form.width * form.height)} m³</span>
              </div>
            </GlassCard>

            {/* Capacity */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Activity size={14} className="text-muted-foreground" strokeWidth={1.75} />
                <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">{t("room_scan.capacity_title")}</label>
              </div>
              <NumInput label={t("room_scan.capacity_title")} value={form.capacity} onChange={v => setField("capacity", v)} step={50} />
              <p className="text-[10px] text-muted-foreground mt-2 px-1">{t("room_scan.capacity_note")}</p>
            </GlassCard>

            <ProButton fullWidth size="lg" onClick={() => setStep(2)} disabled={form.length === 0} data-testid="room-continue-step1">
              {t("room_scan.continue")} <ChevronRight size={16} />
            </ProButton>
          </motion.div>
        )}

        {/* ── STEP 2 — Materials ── */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.25 }}
            className="px-4 space-y-4 pb-32"
          >
            {/* Ceiling */}
            <GlassCard className="p-4">
              <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-3">{t("room_scan.ceiling")}</label>
              <div className="grid grid-cols-3 gap-2">
                {CEILING_OPTIONS.map(opt => (
                  <MaterialChip
                    key={opt.value}
                    label={opt.label}
                    selected={form.ceilingType === opt.value}
                    onClick={() => setField("ceilingType", opt.value)}
                  />
                ))}
              </div>
            </GlassCard>

            {/* Walls */}
            <GlassCard className="p-4">
              <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-3">{t("room_scan.walls")}</label>
              <div className="grid grid-cols-3 gap-2">
                {WALL_OPTIONS.map(opt => (
                  <MaterialChip
                    key={opt.value}
                    label={opt.label}
                    selected={form.wallMaterial === opt.value}
                    onClick={() => setField("wallMaterial", opt.value)}
                  />
                ))}
              </div>
            </GlassCard>

            {/* Floor */}
            <GlassCard className="p-4">
              <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-3">{t("room_scan.floor")}</label>
              <div className="grid grid-cols-4 gap-2">
                {FLOOR_OPTIONS.map(opt => (
                  <MaterialChip
                    key={opt.value}
                    label={opt.label}
                    selected={form.floorType === opt.value}
                    onClick={() => setField("floorType", opt.value)}
                  />
                ))}
              </div>
            </GlassCard>

            {/* Windows */}
            <GlassCard className="p-4">
              <NumInput label={t("room_scan.windows")} value={form.windowCount} onChange={v => setField("windowCount", v)} step={1} />
            </GlassCard>

            {/* Ambiente — afecta absorción del aire y tiempos de alineación */}
            <GlassCard className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Thermometer size={13} className="text-accent" />
                <span className="text-[11px] font-medium text-foreground">Ambiente</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <NumInput
                  label="Temperatura"
                  value={form.temperature ?? 20}
                  onChange={v => setField("temperature", Math.max(-10, Math.min(50, v)))}
                  suffix="°C"
                  step={1}
                />
                <NumInput
                  label="Humedad"
                  value={form.humidity ?? 50}
                  onChange={v => setField("humidity", Math.max(0, Math.min(100, v)))}
                  suffix="%"
                  step={5}
                />
              </div>
              <p className="text-[10px] text-muted-foreground mt-2.5 leading-relaxed">
                Cambia la absorción de agudos en el aire y la velocidad del sonido.
                A 35 °C los delays se acortan ~2.6 % respecto de 20 °C: en una torre
                a 100 m son unos 7 ms.
              </p>
            </GlassCard>

            {/* RT60 Preview */}
            <GlassCard className="p-4 bg-accent/5 border-accent/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <Volume2 size={13} className="text-accent" />
                  <p className="text-[10px] text-accent uppercase tracking-[0.28em] font-medium">{t("room_scan.rt60_preview")}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { feedback("select"); setRt60ModalOpen(true); }}
                  data-testid="open-rt60-modal-btn"
                  className="inline-flex items-center gap-1.5 rounded-full bg-accent/12 border border-accent/25 px-2.5 py-1 text-[10px] font-medium text-accent hover:bg-accent/20 transition-all cursor-pointer uppercase tracking-[0.2em]"
                >
                  <WavesIcon size={10} /> Medir con Mic
                </button>
              </div>
              {(() => {
                const preview = calculateAcoustics(form);
                return (
                  <div className="flex gap-4">
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("room_scan.empty")}</p>
                      <p className="text-lg font-bold text-foreground">{preview.rt60Empty}<span className="text-xs text-muted-foreground ml-0.5">s</span></p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground">{t("room_scan.with_audience")}</p>
                      <p className="text-lg font-bold text-accent">{preview.rt60Audience}<span className="text-xs text-muted-foreground ml-0.5">s</span></p>
                    </div>
                    <div className="ml-auto">
                      <StatusPill
                        status={preview.echoRisk === "high" ? "error" : preview.echoRisk === "medium" ? "warning" : "ready"}
                        label={`Echo: ${preview.echoRisk}`}
                      />
                    </div>
                  </div>
                );
              })()}
              {measuredRt60 !== null && (
                <div className="mt-3 pt-3 border-t border-accent/15 flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-accent/15 border border-accent/25 flex items-center justify-center">
                    <WavesIcon size={10} className="text-accent" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">Medición real:</span>
                  <span className="text-sm font-medium text-accent font-mono">{measuredRt60.toFixed(2)}s</span>
                  <span className="ml-auto text-[10px] text-muted-foreground italic">
                    {Math.abs(measuredRt60 - calculateAcoustics(form).rt60Audience).toFixed(2)}s de diferencia con estimado
                  </span>
                </div>
              )}
            </GlassCard>

            <div className="flex gap-3">
              <ProButton variant="ghost" onClick={() => setStep(1)} className="flex-1">{t("room_scan.back")}</ProButton>
              <ProButton onClick={() => setStep(3)} className="flex-2">{t("room_scan.continue")} <ChevronRight size={16} /></ProButton>
            </div>
          </motion.div>
        )}

        {/* ── STEP 3 — Scanner ── */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3 }}
            className="px-4 space-y-4 pb-32"
          >
            {/* Scanner card */}
            <GlassCard className={cn("p-6 text-center overflow-hidden relative", scanning && "border-accent/30")} glow={scanning}>
              {/* Background gradient when scanning */}
              {scanning && (
                <div className="absolute inset-0 bg-gradient-radial from-accent/8 via-transparent to-transparent pointer-events-none" />
              )}

              {/* Scanner ring */}
              <div className="flex justify-center mb-5">
                <ScannerRing progress={scanProgress} scanning={scanning} />
              </div>

              {/* Waveform */}
              <WaveformViz active={scanning} progress={scanProgress} />

              {!scanning && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-4 space-y-1"
                >
                  <p className="text-sm font-bold text-foreground">{form.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {form.length}m × {form.width}m × {form.height}m · {form.capacity} audience
                  </p>
                </motion.div>
              )}

              {scanning && (
                <motion.p
                  key={Math.floor(scanProgress / 20)}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 text-[11px] text-muted-foreground"
                >
                  {t("room_scan.processing")}
                </motion.p>
              )}
            </GlassCard>

            {/* Warning + system info */}
            {!scanning && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="rounded-xl bg-accent/8 border border-accent/20 px-4 py-3 flex items-start gap-2.5">
                  <AlertTriangle size={14} className="text-accent shrink-0 mt-0.5" />
                  <p className="text-xs text-secondary-foreground">{t("room_scan.warning")}</p>
                </div>

                <div className="flex gap-3">
                  <ProButton variant="ghost" onClick={() => setStep(2)} className="flex-1">{t("room_scan.back")}</ProButton>
                  <ProButton onClick={handleScan} size="lg" className="flex-2">
                    <Waves size={16} /> {t("room_scan.run_scan")}
                  </ProButton>
                </div>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* ── STEP 4 — Results ── */}
        {step === 4 && result && (
          <motion.div
            key="step4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4"
          >
            <ResultsPanel
              result={result}
              room={form}
              venueName={form.name}
              onContinue={() => navigate(inWizard ? "/design?step=pa" : "/gear-builder")}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <RT60Modal
        open={rt60ModalOpen}
        onClose={() => setRt60ModalOpen(false)}
        onApply={(rt60) => {
          setMeasuredRt60(rt60);
          // Adjust room parameters slightly to match the measured RT60 (best-effort)
          // by scaling the estimated absorption. Simplest heuristic:
          // if measured > estimated → walls harder than assumed → keep material.
          // We just show the measured value alongside the estimate for now.
        }}
      />

      <ARRoomScanModal
        open={arScanOpen}
        onClose={() => setArScanOpen(false)}
        onApply={(dims) => {
          setForm(f => ({
            ...f,
            length: typeof dims.length === "number" ? Math.round(dims.length * 10) / 10 : f.length,
            width: typeof dims.width === "number" ? Math.round(dims.width * 10) / 10 : f.width,
            height: typeof dims.height === "number" ? Math.round(dims.height * 10) / 10 : f.height,
          }));
          setArScanOpen(false);
          feedback("success");
        }}
      />
    </ScreenShell>
  );
}
