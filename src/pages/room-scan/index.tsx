import { ARRoomScanModal } from "@/components/soundmap/ar-room-scan.tsx";
import { RT60Modal } from "@/components/soundmap/rt60-modal.tsx";
import {
  GlassCard,
  ProButton,
  ScreenShell,
  StatusPill,
} from "@/components/soundmap/ui.tsx";
import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import {
  calculateAcoustics,
  type RoomScanInput,
} from "@/lib/audio/acoustics.ts";
import { feedback } from "@/lib/feedback.ts";
import { cn } from "@/lib/utils.ts";
import { useInWizard } from "@/lib/wizard-context.ts";
import { useAppStore } from "@/store/app.ts";
import {
  Activity,
  AlertTriangle,
  Camera as CameraIcon,
  CheckCircle,
  ChevronRight,
  FlaskConical,
  Layers,
  LayoutTemplate,
  Thermometer,
  Volume2,
  Waves,
  Waves as WavesIcon,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
  CEILING_OPTIONS,
  FLOOR_OPTIONS,
  MaterialChip,
  NumInput,
  ResultsPanel,
  ScannerRing,
  WALL_OPTIONS,
  WaveformViz,
  type Step,
} from "./components";

export default function RoomScan() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const inWizard = useInWizard();
  const applyRoomScan = useAppStore((s) => s.applyRoomScan);
  const loadDemoVenue = useAppStore((s) => s.loadDemoVenue);
  const [step, setStep] = useState<Step>(1);
  const [scanning, setScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [rt60ModalOpen, setRt60ModalOpen] = useState(false);
  const [arScanOpen, setArScanOpen] = useState(false);
  const [measuredRt60, setMeasuredRt60] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const savedRoom = useAppStore((s) => s.room);
  const [form, setForm] = useState<RoomScanInput>(
    () =>
      savedRoom ?? {
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
      },
  );

  const setField = (key: keyof RoomScanInput, value: string | number) =>
    setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    // El setTimeout anterior nunca se limpiaba: si desmontabas a mitad del
    // escaneo, quedaba un setState sobre un componente desmontado.
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
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
    const scanForm: RoomScanInput = form.name.trim()
      ? form
      : { ...form, name: "Recinto sin nombre" };
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

  const result = step === 4 ? calculateAcoustics(form) : null;

  const STEP_LABELS = [
    t("room_scan.step_venue"),
    t("room_scan.step_materials"),
    t("room_scan.step_scan"),
  ];

  return (
    <ScreenShell compact={inWizard} className="room-workspace">
      {inWizard && (
        <div className="step-intro">
          <h2>Definí el recinto</h2>
          <p>Dimensiones, materiales y audiencia.</p>
        </div>
      )}
      <div
        className={
          step < 4
            ? "grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6"
            : ""
        }
      >
        {step < 4 && (
          <div className="room-preview xl:sticky xl:top-20 self-start">
            <VenuePreview room={form} geometryOnly compact={false} />
          </div>
        )}
        <div className="min-w-0">
          {/* Header — hidden inside wizard (wizard owns the title) */}
          {!inWizard && (
            <div className="mb-8">
              <div className="flex items-end justify-between gap-6 mb-3 flex-wrap">
                <div className="min-w-0">
                  <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-3">
                    Escaneo
                  </p>
                  <h1
                    className="text-[1.75rem] md:text-[2.4rem] leading-[1.05] tracking-[-0.03em] font-medium text-foreground"
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
                  {
                    [
                      t("room_scan.step1_subtitle"),
                      t("room_scan.step2_subtitle"),
                      t("room_scan.step3_subtitle"),
                      "",
                    ][step - 1]
                  }
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
                    <div
                      key={s}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-[10px] font-bold uppercase tracking-[0.2em] transition-all",
                        active
                          ? "bg-accent/12 border border-accent/30 text-accent"
                          : done
                            ? "bg-chart-2/10 border border-chart-2/25 text-chart-2"
                            : "bg-secondary/50 border border-border text-muted-foreground",
                      )}
                    >
                      {done ? (
                        <CheckCircle size={10} />
                      ) : (
                        <span className="text-[9px]">{s}</span>
                      )}
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Wizard-only compact sub-step indicator (mini pills for the internal 3-step flow) */}
          {inWizard && step < 4 && (
            <div className="mb-4 flex items-center gap-2">
              <p className="text-sm font-medium">
                {step === 1
                  ? "Dimensiones"
                  : step === 2
                    ? "Materiales"
                    : "Ambiente"}
              </p>
              <div className="flex gap-1">
                {[1, 2, 3].map((s) => (
                  <span
                    key={s}
                    className="h-1 rounded-full transition-all"
                    style={{
                      width: step === s ? 22 : 12,
                      background:
                        step > s
                          ? "var(--sm-accent)"
                          : step === s
                            ? "var(--sm-accent)"
                            : "rgba(255,255,255,0.10)",
                    }}
                  />
                ))}
              </div>
              <span className="text-[10px] text-muted-foreground tabular-nums ml-1">
                {step} / 3
              </span>
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
                className="space-y-5 pb-6"
              >
                {/* Load Demo shortcut — only inside wizard, only when no room yet */}
                {inWizard &&
                  !form.name.trim() &&
                  form.length === 20 &&
                  form.width === 15 && (
                    <motion.button
                      type="button"
                      onClick={() => {
                        feedback("success");
                        loadDemoVenue();
                      }}
                      data-testid="wizard-load-demo-btn"
                      whileTap={{ scale: 0.98 }}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="w-full flex items-center gap-3 rounded-2xl px-5 py-4 cursor-pointer text-left"
                      style={{
                        background:
                          "linear-gradient(135deg, rgba(201,240,62,0.14) 0%, rgba(201,240,62,0.05) 100%)",
                        boxShadow:
                          "0 0 0 1px rgba(201,240,62,0.35), 0 12px 32px -12px rgba(201,240,62,0.35)",
                      }}
                    >
                      <div
                        className="h-11 w-11 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          background: "var(--sm-accent)",
                          color: "var(--background)",
                        }}
                      >
                        <FlaskConical size={17} strokeWidth={2} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-foreground leading-tight">
                          Explorar con demo
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                          The Warehouse Club · 400 pax · sistema completo
                          pre-cargado
                        </p>
                      </div>
                      <ChevronRight
                        size={13}
                        className="text-muted-foreground shrink-0"
                        strokeWidth={1.75}
                      />
                    </motion.button>
                  )}

                {/* Plantillas — /templates sólo se alcanzaba desde //legacy, una
                página muerta. Su lugar natural es acá: es un punto de partida
                del diseño, no una sección aparte. */}
                {inWizard && !form.name.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      feedback("tap");
                      navigate("/templates");
                    }}
                    data-testid="room-scan-templates-btn"
                    className="w-full flex items-center gap-3 rounded-2xl px-5 py-3.5 cursor-pointer text-left"
                    style={{
                      background: "rgba(255,255,255,0.03)",
                      boxShadow: "0 0 0 1px rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        background: "rgba(255,255,255,0.05)",
                        color: "var(--sm-muted)",
                      }}
                    >
                      <LayoutTemplate size={15} strokeWidth={1.75} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-foreground leading-tight">
                        Empezar desde una plantilla
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Iglesia, club, teatro, salón — y ajustás
                      </p>
                    </div>
                    <ChevronRight
                      size={13}
                      className="text-muted-foreground shrink-0"
                      strokeWidth={1.75}
                    />
                  </button>
                )}

                {/* Venue name */}
                <GlassCard className="p-4">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-2">
                    {t("room_scan.venue_name")}
                  </label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setField("name", e.target.value)}
                    placeholder={t("room_scan.venue_placeholder")}
                    data-testid="room-name-input"
                    className="w-full rounded-xl bg-secondary/50 border border-border px-4 py-3 text-sm font-semibold text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50 focus:bg-accent/5 transition-all"
                  />
                </GlassCard>

                {/* AR Scan CTA — Vitals style, single lime accent */}
                <button
                  type="button"
                  onClick={() => {
                    feedback("select");
                    setArScanOpen(true);
                  }}
                  data-testid="open-ar-scan-btn"
                  className="w-full flex items-center gap-3 rounded-2xl px-4 py-3.5 hover:-translate-y-[1px] transition-all cursor-pointer text-left"
                  style={{
                    background: "rgba(201,240,62,0.06)",
                    boxShadow: "0 0 0 1px rgba(201,240,62,0.22)",
                  }}
                >
                  <div
                    className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                    style={{
                      background: "rgba(201,240,62,0.15)",
                      color: "var(--sm-accent)",
                    }}
                  >
                    <CameraIcon size={15} strokeWidth={1.75} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p className="text-[13px] font-medium text-foreground">
                        Escaneo AR
                      </p>
                      <span
                        className="text-[9px] font-medium uppercase tracking-[0.24em] px-1.5 py-0.5 rounded-full"
                        style={{
                          background: "rgba(201,240,62,0.15)",
                          color: "var(--sm-accent)",
                        }}
                      >
                        Asistido
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Capturá, revisá y ajustá largo, ancho y altura
                    </p>
                  </div>
                  <ChevronRight
                    size={13}
                    className="text-muted-foreground shrink-0"
                    strokeWidth={1.75}
                  />
                </button>

                {/* Dimensions */}
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Layers size={14} className="text-accent" />
                    <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
                      {t("room_scan.dimensions")}
                    </label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <NumInput
                      label="Length"
                      value={form.length}
                      onChange={(v) => setField("length", v)}
                      suffix="m"
                      step={1}
                    />
                    <NumInput
                      label="Width"
                      value={form.width}
                      onChange={(v) => setField("width", v)}
                      suffix="m"
                      step={1}
                    />
                    <NumInput
                      label="Height"
                      value={form.height}
                      onChange={(v) => setField("height", v)}
                      suffix="m"
                      step={0.5}
                    />
                  </div>
                  {/* Live volume preview */}
                  <div className="mt-3 rounded-xl bg-secondary/50 border border-border p-3 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {t("room_scan.volume")}
                    </span>
                    <span className="text-sm font-bold text-accent">
                      {Math.round(form.length * form.width * form.height)} m³
                    </span>
                  </div>
                </GlassCard>

                {/* Capacity */}
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Activity
                      size={14}
                      className="text-muted-foreground"
                      strokeWidth={1.75}
                    />
                    <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
                      {t("room_scan.capacity_title")}
                    </label>
                  </div>
                  <NumInput
                    label={t("room_scan.capacity_title")}
                    value={form.capacity}
                    onChange={(v) => setField("capacity", v)}
                    step={50}
                  />
                  <p className="text-[10px] text-muted-foreground mt-2 px-1">
                    {t("room_scan.capacity_note")}
                  </p>
                </GlassCard>

                <ProButton
                  fullWidth
                  size="lg"
                  onClick={() => setStep(2)}
                  disabled={form.length === 0}
                  data-testid="room-continue-step1"
                >
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
                className="space-y-5 pb-6"
              >
                {/* Ceiling */}
                <GlassCard className="p-4">
                  <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-3">
                    {t("room_scan.ceiling")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {CEILING_OPTIONS.map((opt) => (
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
                  <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-3">
                    {t("room_scan.walls")}
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {WALL_OPTIONS.map((opt) => (
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
                  <label className="text-[10px] text-muted-foreground uppercase tracking-[0.28em] font-semibold block mb-3">
                    {t("room_scan.floor")}
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {FLOOR_OPTIONS.map((opt) => (
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
                  <NumInput
                    label={t("room_scan.windows")}
                    value={form.windowCount}
                    onChange={(v) => setField("windowCount", v)}
                    step={1}
                  />
                </GlassCard>

                {/* Ambiente — afecta absorción del aire y tiempos de alineación */}
                <GlassCard className="p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Thermometer size={13} className="text-accent" />
                    <span className="text-[11px] font-medium text-foreground">
                      Ambiente
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <NumInput
                      label="Temperatura"
                      value={form.temperature ?? 20}
                      onChange={(v) =>
                        setField("temperature", Math.max(-10, Math.min(50, v)))
                      }
                      suffix="°C"
                      step={1}
                    />
                    <NumInput
                      label="Humedad"
                      value={form.humidity ?? 50}
                      onChange={(v) =>
                        setField("humidity", Math.max(0, Math.min(100, v)))
                      }
                      suffix="%"
                      step={5}
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2.5 leading-relaxed">
                    Cambia la absorción de agudos en el aire y la velocidad del
                    sonido. A 35 °C los delays se acortan ~2.6 % respecto de 20
                    °C: en una torre a 100 m son unos 7 ms.
                  </p>
                </GlassCard>

                {/* RT60 Preview */}
                <GlassCard className="p-4 bg-accent/5 border-accent/20">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Volume2 size={13} className="text-accent" />
                      <p className="text-[10px] text-accent uppercase tracking-[0.28em] font-medium">
                        {t("room_scan.rt60_preview")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        feedback("select");
                        setRt60ModalOpen(true);
                      }}
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
                          <p className="text-[10px] text-muted-foreground">
                            {t("room_scan.empty")}
                          </p>
                          <p className="text-lg font-bold text-foreground">
                            {preview.rt60Empty}
                            <span className="text-xs text-muted-foreground ml-0.5">
                              s
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] text-muted-foreground">
                            {t("room_scan.with_audience")}
                          </p>
                          <p className="text-lg font-bold text-accent">
                            {preview.rt60Audience}
                            <span className="text-xs text-muted-foreground ml-0.5">
                              s
                            </span>
                          </p>
                        </div>
                        <div className="ml-auto">
                          <StatusPill
                            status={
                              preview.echoRisk === "high"
                                ? "error"
                                : preview.echoRisk === "medium"
                                  ? "warning"
                                  : "ready"
                            }
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
                      <span className="text-[10px] text-muted-foreground">
                        Medición real:
                      </span>
                      <span className="text-sm font-medium text-accent font-mono">
                        {measuredRt60.toFixed(2)}s
                      </span>
                      <span className="ml-auto text-[10px] text-muted-foreground italic">
                        {Math.abs(
                          measuredRt60 - calculateAcoustics(form).rt60Audience,
                        ).toFixed(2)}
                        s de diferencia con estimado
                      </span>
                    </div>
                  )}
                </GlassCard>

                <div className="flex gap-3">
                  <ProButton
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    {t("room_scan.back")}
                  </ProButton>
                  <ProButton onClick={() => setStep(3)} className="flex-2">
                    {t("room_scan.continue")} <ChevronRight size={16} />
                  </ProButton>
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
                className="space-y-5 pb-6"
              >
                {/* Scanner card */}
                <GlassCard
                  className={cn(
                    "p-6 text-center overflow-hidden relative",
                    scanning && "border-accent/30",
                  )}
                  glow={scanning}
                >
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
                      <p className="text-sm font-bold text-foreground">
                        {form.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {form.length}m × {form.width}m × {form.height}m ·{" "}
                        {form.capacity} audience
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
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="space-y-3"
                  >
                    <div className="rounded-xl bg-accent/8 border border-accent/20 px-4 py-3 flex items-start gap-2.5">
                      <AlertTriangle
                        size={14}
                        className="text-accent shrink-0 mt-0.5"
                      />
                      <p className="text-xs text-secondary-foreground">
                        {t("room_scan.warning")}
                      </p>
                    </div>

                    <div className="flex gap-3">
                      <ProButton
                        variant="ghost"
                        onClick={() => setStep(2)}
                        className="flex-1"
                      >
                        {t("room_scan.back")}
                      </ProButton>
                      <ProButton
                        onClick={handleScan}
                        size="lg"
                        className="flex-2"
                      >
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
                className="room-results"
              >
                <ResultsPanel
                  result={result}
                  room={form}
                  venueName={form.name}
                  onContinue={() =>
                    navigate(inWizard ? "/design?step=pa" : "/gear-builder")
                  }
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
              setForm((f) => ({
                ...f,
                length:
                  typeof dims.length === "number"
                    ? Math.round(dims.length * 10) / 10
                    : f.length,
                width:
                  typeof dims.width === "number"
                    ? Math.round(dims.width * 10) / 10
                    : f.width,
                height:
                  typeof dims.height === "number"
                    ? Math.round(dims.height * 10) / 10
                    : f.height,
              }));
              setArScanOpen(false);
              feedback("success");
            }}
          />
        </div>
      </div>
    </ScreenShell>
  );
}
