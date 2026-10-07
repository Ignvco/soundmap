import { WorkspaceHeading } from "@/components/soundmap/workspace-heading";
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
  WALL_OPTIONS,
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
  const [previewOpen, setPreviewOpen] = useState(false);
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
    timerRef.current = setTimeout(() => {
      setScanning(false);
      setStep(4);
    }, 320);
  };

  const result = step === 4 ? calculateAcoustics(form) : null;

  const STEP_LABELS = ["Dimensiones", "Materiales", "Revisión"];
  const previewToggle = step < 4 && (
    <button
      type="button"
      className="audit-button room-preview-toggle"
      aria-expanded={previewOpen}
      aria-controls="room-preview-panel"
      onClick={() => setPreviewOpen((v) => !v)}
    >
      <Layers size={16} />{" "}
      {previewOpen ? "Ocultar vista del recinto" : "Mostrar vista del recinto"}
    </button>
  );

  return (
    <ScreenShell compact={inWizard} className="room-workspace glow-room">
      {inWizard && (
        <div className="step-intro">
          <h2>Definí el recinto</h2>
          <p>Dimensiones, materiales y audiencia.</p>
          {previewToggle}
        </div>
      )}
      {!inWizard && (
        <WorkspaceHeading
          eyebrow="RECINTO"
          title={step < 4 ? "Define tu espacio" : "Tu recinto, calculado"}
          description={
            step < 4
              ? "Dimensiones reales para empezar tu diseño."
              : "Revisa las estimaciones antes de elegir el sistema."
          }
        >
          {previewToggle}
        </WorkspaceHeading>
      )}
      <div className={step < 4 ? "glow-room-layout" : ""}>
        <div className="min-w-0 room-form">
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
                      aria-current={active ? "step" : undefined}
                      className={cn(
                        "room-progress-step flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-medium transition-all",
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
                    : "Revisión"}
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
                  <label
                    htmlFor="room-name"
                    className="text-xs text-muted-foreground font-medium block mb-2"
                  >
                    {t("room_scan.venue_name")}
                  </label>
                  <input
                    id="room-name"
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
                  <div className="room-dimensions grid gap-3">
                    <NumInput
                      label="Largo"
                      value={form.length}
                      onChange={(v) => setField("length", v)}
                      suffix="m"
                      step={1}
                    />
                    <NumInput
                      label="Ancho"
                      value={form.width}
                      onChange={(v) => setField("width", v)}
                      suffix="m"
                      step={1}
                    />
                    <NumInput
                      label="Altura"
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
                  <div className="room-materials grid grid-cols-3 gap-2">
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
                  <div className="room-materials grid grid-cols-3 gap-2">
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
                  <div className="room-materials grid grid-cols-4 gap-2">
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
                  <div className="room-environment grid grid-cols-2 gap-3">
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

                <div className="room-step-actions flex gap-3">
                  <ProButton
                    variant="ghost"
                    onClick={() => setStep(1)}
                    className="flex-1"
                  >
                    {t("room_scan.back")}
                  </ProButton>
                  <ProButton
                    onClick={() => setStep(3)}
                    className="flex-[2]"
                    data-testid="room-continue-step2"
                  >
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
                <GlassCard className="room-calculation-card p-6">
                  <span className="workspace-tag">
                    <Waves size={14} /> Estimación acústica
                  </span>
                  <h2>
                    {scanning ? "Cálculo listo" : "Revisa antes de calcular"}
                  </h2>
                  <p>{form.name || "Recinto sin nombre"}</p>
                  <dl className="workspace-metrics">
                    <div>
                      <dt>Largo</dt>
                      <dd>
                        {form.length}
                        <small> m</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Ancho</dt>
                      <dd>
                        {form.width}
                        <small> m</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Altura</dt>
                      <dd>
                        {form.height}
                        <small> m</small>
                      </dd>
                    </div>
                  </dl>
                  <div className="room-calculation-summary">
                    <p>
                      <span>Audiencia prevista</span>
                      <strong>{form.capacity} personas</strong>
                    </p>
                    <p>
                      <span>Techo</span>
                      <strong>
                        {
                          CEILING_OPTIONS.find(
                            (o) => o.value === form.ceilingType,
                          )?.label
                        }
                      </strong>
                    </p>
                    <p>
                      <span>Muros</span>
                      <strong>
                        {
                          WALL_OPTIONS.find(
                            (o) => o.value === form.wallMaterial,
                          )?.label
                        }
                      </strong>
                    </p>
                    <p>
                      <span>Piso</span>
                      <strong>
                        {
                          FLOOR_OPTIONS.find((o) => o.value === form.floorType)
                            ?.label
                        }
                      </strong>
                    </p>
                  </div>
                  <p className="workspace-note">
                    Calcula la acústica a partir de tus dimensiones y
                    materiales. La medición con micrófono se registra por
                    separado.
                  </p>
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

                    <div className="room-step-actions flex gap-3">
                      <ProButton
                        variant="ghost"
                        onClick={() => setStep(2)}
                        className="flex-1"
                      >
                        {t("room_scan.back")}
                      </ProButton>
                      <ProButton
                        onClick={handleScan}
                        data-testid="room-calculate"
                        size="lg"
                        className="flex-[2]"
                      >
                        <Waves size={16} /> Calcular acústica
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
        {step < 4 && (
          <aside
            className={`room-preview glow-room-preview ${previewOpen ? "is-expanded" : ""}`}
            id="room-preview-panel"
            aria-label="Vista previa del recinto"
          >
            <div className="workspace-section-heading">
              <div>
                <p className="project-eyebrow">VISTA DEL ESPACIO</p>
                <h2>{form.name || "Tu recinto"}</h2>
              </div>
              <span className="workspace-tag">Geometría</span>
            </div>
            <VenuePreview room={form} geometryOnly compact={false} />
            <p className="workspace-note">
              {form.length} × {form.width} × {form.height} m ·{" "}
              {Math.round(form.length * form.width * form.height)} m³
            </p>
          </aside>
        )}
      </div>
    </ScreenShell>
  );
}
