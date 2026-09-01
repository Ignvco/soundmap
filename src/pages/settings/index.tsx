// Settings v5 — Notion-style quiet preferences with progressive disclosure.
// Sections collapse by default (except the first). Each row is a text-first
// pair (label + hint on the left, control on the right). No heavy cards, no
// saturated colors — just typography, hairline dividers and one accent hue
// per state.
import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, AlertTriangle, Music, Tent, Drama, Mic2, Check, ArrowRight, RotateCcw, Cpu, ShieldCheck, ShieldAlert, ShieldOff, Mic, Compass, Download, Upload } from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import { useSettingsStore, type VenuePreset } from "@/store/settings.ts";
import { useHardwareCapabilities, type MicStatus, type GyroStatus } from "@/hooks/use-hardware-capabilities.ts";
import { exportBackupWithToast, importBackupWithToast, BACKUP_VERSION } from "@/lib/backup.ts";
import { cn } from "@/lib/utils.ts";
import { toast } from "sonner";
import { SUPPORTED_LOCALES_ARRAY, SUPPORTED_LOCALES, changeLocale, type SupportedLocale } from "@/i18n.ts";
import { feedback } from "@/lib/feedback.ts";

// Quiet hue map. Sage=positive/on, amethyst=neutral toggle, warm=danger.
const HUE_ON = "var(--sm-accent)";
const HUE_DANGER = "var(--sm-warm)";
const HUE_WARN = "var(--sm-amber)";
const HUE_MUTED = "var(--sm-muted)";

const VENUE_PRESETS: { value: VenuePreset; label: string; hint: string; icon: typeof Music }[] = [
  { value: "club",       label: "Club",        hint: "Recintos íntimos, alta presión",            icon: Music },
  { value: "festival",   label: "Festival",    hint: "Al aire libre, largo alcance",             icon: Tent },
  { value: "theatre",    label: "Teatro",      hint: "Voz clara, reverberación controlada",       icon: Drama },
  { value: "conference", label: "Conferencia", hint: "Inteligibilidad máxima de la voz",          icon: Mic2 },
];

// ── Root ─────────────────────────────────────────────────────────────────────
export default function Settings() {
  const {
    units, defaultVenueType, soundEnabled, hapticsEnabled,
    setUnits, setDefaultVenueType, setSoundEnabled, setHapticsEnabled,
  } = useSettingsStore();
  const resetSystem = useAppStore((s) => s.resetSystem);
  const startTour = useAppStore((s) => s.startTour);
  const capabilities = useHardwareCapabilities();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [openSection, setOpenSection] = useState<string>("measurement");
  const [showReset, setShowReset] = useState(false);

  const toggle = (id: string) => { feedback("tap"); setOpenSection(o => o === id ? "" : id); };

  const handleReset = () => {
    resetSystem();
    setShowReset(false);
    feedback("warning");
    toast.success("Datos del sistema borrados");
  };

  const handleReplayTour = () => {
    feedback("select");
    navigate("/");
    setTimeout(() => startTour(), 400);
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 md:px-12 pt-10 md:pt-16 pb-24">
      <div className="max-w-3xl mx-auto">
        {/* Whisper header + title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
            Ajustes
          </p>
          <h1
            className="text-[2rem] md:text-[2.8rem] leading-[1.05] tracking-[-0.03em] font-medium mb-3"
            data-testid="settings-title"
          >
            Preferencias
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-lg leading-relaxed mb-12 md:mb-16">
            Ajustá cómo suena, se siente y se mide SoundMap.
            Los cambios se guardan solos.
          </p>
        </motion.div>

        {/* Sections — progressive disclosure */}
        <div className="space-y-1" data-testid="settings-sections">
          <Section
            id="measurement"
            title="Medición"
            summary={units === "metric" ? "Sistema métrico" : "Sistema imperial"}
            isOpen={openSection === "measurement"}
            onToggle={() => toggle("measurement")}
          >
            <Row
              label="Unidades"
              hint="Sistema de medición para dimensiones y distancias"
            >
              <SegmentControl
                value={units}
                onChange={setUnits}
                options={[
                  { value: "metric", label: "Métrico" },
                  { value: "imperial", label: "Imperial" },
                ]}
                testId="units-segment"
              />
            </Row>
          </Section>

          <Section
            id="language"
            title={t("settings.language")}
            summary={SUPPORTED_LOCALES[i18n.language as SupportedLocale]?.nativeName ?? "Español"}
            isOpen={openSection === "language"}
            onToggle={() => toggle("language")}
          >
            <Row
              label={t("settings.language")}
              hint={t("settings.language_desc")}
            >
              <SegmentControl
                value={(SUPPORTED_LOCALES_ARRAY.includes(i18n.language as SupportedLocale)
                  ? i18n.language
                  : "es") as SupportedLocale}
                onChange={(lng) => { feedback("tap"); void changeLocale(lng); }}
                options={SUPPORTED_LOCALES_ARRAY.map((code) => ({
                  value: code,
                  label: SUPPORTED_LOCALES[code].nativeName,
                }))}
                testId="language-segment"
              />
            </Row>
          </Section>

          <Section
            id="feedback"
            title="Feedback sensorial"
            summary={[soundEnabled ? "Sonido" : null, hapticsEnabled ? "Vibración" : null].filter(Boolean).join(" · ") || "Silencio"}
            isOpen={openSection === "feedback"}
            onToggle={() => toggle("feedback")}
          >
            <Row
              label="Sonidos de interfaz"
              hint="Tonos musicales sutiles al interactuar (Web Audio)"
            >
              <Toggle
                value={soundEnabled}
                onChange={(v) => {
                  setSoundEnabled(v);
                  if (v) feedback("success", { haptic: false });
                }}
                testId="toggle-sound"
              />
            </Row>
            <Row
              label="Vibración háptica"
              hint="Retroalimentación táctil en cada acción (nativo Android)"
            >
              <Toggle
                value={hapticsEnabled}
                onChange={(v) => {
                  setHapticsEnabled(v);
                  if (v) feedback("tap", { sound: false });
                }}
                testId="toggle-haptics"
              />
            </Row>
          </Section>

          <Section
            id="venue"
            title="Recinto por defecto"
            summary={VENUE_PRESETS.find(v => v.value === defaultVenueType)?.label ?? "—"}
            isOpen={openSection === "venue"}
            onToggle={() => toggle("venue")}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3" data-testid="venue-grid">
              {VENUE_PRESETS.map(preset => {
                const active = defaultVenueType === preset.value;
                const Icon = preset.icon;
                return (
                  <button
                    key={preset.value}
                    onClick={() => { feedback("select"); setDefaultVenueType(preset.value); }}
                    data-testid={`venue-${preset.value}`}
                    className="text-left px-4 py-3.5 flex items-start gap-3 cursor-pointer r-control"
                    style={{
                      background: active ? `${HUE_ON}12` : "rgba(255,255,255,0.02)",
                      boxShadow: active
                        ? `0 0 0 1px ${HUE_ON}55`
                        : "0 0 0 1px rgba(255,255,255,0.05)",
                      transition: "background-color 0.3s ease, box-shadow 0.3s ease",
                    }}
                  >
                    <div className="shrink-0 mt-0.5">
                      <Icon size={15} strokeWidth={1.75} style={{ color: active ? HUE_ON : "var(--muted-foreground)" }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-foreground leading-tight">{preset.label}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{preset.hint}</p>
                    </div>
                    {active && (
                      <Check size={13} strokeWidth={2} style={{ color: HUE_ON }} className="shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section
            id="guide"
            title="Guía"
            summary="Repetir tutorial"
            isOpen={openSection === "guide"}
            onToggle={() => toggle("guide")}
          >
            <Row
              label="Repetir tour guiado"
              hint="Volvé a ver el recorrido por las funciones clave"
            >
              <button
                onClick={handleReplayTour}
                data-testid="replay-tour-btn"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium cursor-pointer"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
                  color: "var(--foreground)",
                  transition: "background-color 0.3s ease",
                }}
              >
                Iniciar
                <ArrowRight size={12} strokeWidth={1.75} />
              </button>
            </Row>
          </Section>

          <Section
            id="hardware"
            title="Hardware"
            summary={summarizeHardware(capabilities.mic, capabilities.gyroscope, capabilities.isNativeApp)}
            isOpen={openSection === "hardware"}
            onToggle={() => toggle("hardware")}
          >
            <Row
              label="Micrófono"
              hint="Necesario para el medidor SPL en vivo y para medir RT60"
            >
              <div className="flex items-center gap-2">
                {(capabilities.mic === "prompt" || capabilities.mic === "unknown") && (
                  <button
                    onClick={async () => {
                      feedback("tap");
                      const status = await capabilities.requestMic();
                      if (status === "granted") { toast.success("Micrófono habilitado"); feedback("success"); }
                      else if (status === "denied") { toast.error("Permiso denegado. Habilitalo desde el navegador."); feedback("error"); }
                      else if (status === "unavailable") { toast.error("Este dispositivo no soporta micrófono."); feedback("error"); }
                    }}
                    data-testid="hw-mic-request"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer"
                    style={{
                      background: "rgba(155,126,189,0.10)",
                      boxShadow: "0 0 0 1px rgba(155,126,189,0.40)",
                      color: "var(--sm-amber)",
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    <Mic size={11} strokeWidth={1.75} />
                    Habilitar
                  </button>
                )}
                <HardwareChip status={micLabel(capabilities.mic)} tone={micTone(capabilities.mic)} testId="hw-mic" />
              </div>
            </Row>
            <Row
              label="Giroscopio"
              hint="Se usa en el modo AR para medir dimensiones apuntando el teléfono"
            >
              <div className="flex items-center gap-2">
                {capabilities.gyroscope === "supported" && (
                  <button
                    onClick={async () => {
                      feedback("tap");
                      const status = await capabilities.requestGyro();
                      if (status === "granted") { toast.success("Giroscopio habilitado"); feedback("success"); }
                      else if (status === "denied") { toast.error("Permiso denegado."); feedback("error"); }
                    }}
                    data-testid="hw-gyro-request"
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-medium cursor-pointer"
                    style={{
                      background: "rgba(155,126,189,0.10)",
                      boxShadow: "0 0 0 1px rgba(155,126,189,0.40)",
                      color: "var(--sm-amber)",
                      transition: "background-color 0.3s ease",
                    }}
                  >
                    <Compass size={11} strokeWidth={1.75} />
                    Habilitar
                  </button>
                )}
                <HardwareChip status={gyroLabel(capabilities.gyroscope)} tone={gyroTone(capabilities.gyroscope)} testId="hw-gyro" />
              </div>
            </Row>
            <Row
              label="Modo nativo"
              hint="Detecta si estás corriendo dentro de la app Capacitor (Android/iOS)"
            >
              <HardwareChip
                status={capabilities.isNativeApp ? "Nativo" : "Web"}
                tone={capabilities.isNativeApp ? "on" : "muted"}
                testId="hw-native"
              />
            </Row>
            <Row
              label="Contexto seguro"
              hint="Los sensores requieren HTTPS o localhost"
            >
              <HardwareChip
                status={capabilities.isSecureContext ? "Habilitado" : "Sin HTTPS"}
                tone={capabilities.isSecureContext ? "on" : "warn"}
                testId="hw-secure"
              />
            </Row>
          </Section>

          <Section
            id="backup"
            title="Backup"
            summary="Exportar · Importar"
            isOpen={openSection === "backup"}
            onToggle={() => toggle("backup")}
          >
            <Row
              label="Exportar todo"
              hint="Descargá un archivo JSON con escenas, preferencias y comunidad local"
            >
              <button
                onClick={() => { feedback("success"); exportBackupWithToast(); }}
                data-testid="backup-export-btn"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium cursor-pointer"
                style={{
                  background: "rgba(201,240,62,0.10)",
                  boxShadow: "0 0 0 1px rgba(201,240,62,0.45)",
                  color: "var(--sm-accent)",
                  transition: "background-color 0.3s ease",
                }}
              >
                <Download size={12} strokeWidth={1.75} />
                Exportar
              </button>
            </Row>
            <Row
              label="Importar backup"
              hint="Restaurá desde un JSON exportado. Reemplaza tu data actual."
            >
              <label
                htmlFor="backup-import-input"
                data-testid="backup-import-label"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium cursor-pointer"
                style={{
                  background: "rgba(74,107,255,0.10)",
                  boxShadow: "0 0 0 1px rgba(74,107,255,0.45)",
                  color: "var(--sm-blue)",
                  transition: "background-color 0.3s ease",
                }}
              >
                <Upload size={12} strokeWidth={1.75} />
                Importar
                <input
                  id="backup-import-input"
                  data-testid="backup-import-input"
                  type="file"
                  accept="application/json,.json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      feedback("select");
                      importBackupWithToast(file);
                    }
                    e.currentTarget.value = "";
                  }}
                />
              </label>
            </Row>
            <Row
              label="Guía"
              hint="El JSON funciona offline entre 2 dispositivos. Guardalo en Drive o Dropbox como respaldo remoto."
            >
              <span className="text-[11px] text-muted-foreground font-mono">v{BACKUP_VERSION}</span>
            </Row>
          </Section>

          <Section
            id="about"
            title="Acerca de"
            summary="SoundMap · v5"
            isOpen={openSection === "about"}
            onToggle={() => toggle("about")}
          >
            <Row label="Aplicación" hint="Consola profesional de audio en vivo">
              <span className="text-[13px] font-medium text-foreground font-mono">SoundMap</span>
            </Row>
            <Row label="Versión" hint="Design System v5 · Console Silenciosa">
              <span className="text-[13px] font-mono text-muted-foreground tabular-nums">v5.0.0</span>
            </Row>
            <Row label="Motor" hint="Físico acústico + DSP + Session Recorder">
              <span className="text-[13px] font-mono text-muted-foreground">SoundMap Engine</span>
            </Row>
          </Section>

          <Section
            id="danger"
            title="Datos"
            summary="Resetear sistema"
            isOpen={openSection === "danger"}
            onToggle={() => toggle("danger")}
            danger
          >
            <Row
              label="Resetear sistema"
              hint="Borra el recinto, los equipos y las escenas guardadas. Las preferencias se conservan."
              danger
            >
              <button
                onClick={() => setShowReset(true)}
                data-testid="reset-system-btn"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-[12px] font-medium cursor-pointer"
                style={{
                  background: `${HUE_DANGER}12`,
                  boxShadow: `0 0 0 1px ${HUE_DANGER}55`,
                  color: HUE_DANGER,
                  transition: "background-color 0.3s ease",
                }}
              >
                <RotateCcw size={12} strokeWidth={1.75} />
                Resetear
              </button>
            </Row>
          </Section>
        </div>
      </div>

      <AnimatePresence>
        {showReset && (
          <ResetConfirmDialog onConfirm={handleReset} onCancel={() => setShowReset(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Section (progressive disclosure) ────────────────────────────────────────
function Section({ id, title, summary, isOpen, onToggle, children, danger }: {
  id: string;
  title: string;
  summary: string;
  isOpen: boolean;
  onToggle: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <motion.div
      layout
      data-testid={`settings-section-${id}`}
      className="overflow-hidden"
      style={{
        borderRadius: isOpen ? "var(--radius-card)" : "0px",
        background: isOpen ? "var(--surface-1)" : "transparent",
        boxShadow: isOpen ? "var(--elev-1)" : "none",
        borderBottom: isOpen ? "none" : "1px solid var(--border-subtle)",
        transition: "background-color var(--dur) var(--ease), border-radius var(--dur) var(--ease)",
      }}
    >
      <button
        onClick={onToggle}
        data-testid={`settings-section-${id}-toggle`}
        className="w-full flex items-center justify-between gap-4 px-4 md:px-5 py-4 text-left cursor-pointer"
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-[14px] font-medium leading-tight"
            style={{ color: danger ? HUE_DANGER : "var(--foreground)" }}
          >
            {title}
          </p>
          {!isOpen && (
            <p className="text-[12px] text-muted-foreground mt-1 truncate">{summary}</p>
          )}
        </div>
        <ChevronDown
          size={14}
          strokeWidth={1.75}
          className="text-muted-foreground shrink-0"
          style={{
            transform: isOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden"
          >
            <div className="px-5 md:px-6 pb-5 md:pb-6 space-y-0">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Row (Notion-style label + control pair) ─────────────────────────────────
function Row({ label, hint, children, danger }: {
  label: string;
  hint?: string;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <div
      className="flex items-start justify-between gap-6 py-4 first:pt-2"
      style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
    >
      <div className="flex-1 min-w-0">
        <p
          className="text-[13px] font-medium leading-tight"
          style={{ color: danger ? HUE_DANGER : "var(--foreground)" }}
        >
          {label}
        </p>
        {hint && (
          <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed max-w-md">
            {hint}
          </p>
        )}
      </div>
      <div className="shrink-0 pt-0.5">{children}</div>
    </div>
  );
}

// ── Segment control ─────────────────────────────────────────────────────────
function SegmentControl<T extends string>({ value, onChange, options, testId }: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
  testId?: string;
}) {
  return (
    <div
      className="inline-flex items-center gap-0.5 rounded-full p-1"
      style={{
        background: "rgba(255,255,255,0.03)",
        boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
      }}
      data-testid={testId}
    >
      {options.map(opt => {
        const on = value === opt.value;
        return (
          <button
            key={opt.value}
            onClick={() => { feedback("select"); onChange(opt.value); }}
            data-testid={`${testId}-${opt.value}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[12px] font-medium cursor-pointer",
              on ? "text-[#09090b]" : "text-muted-foreground hover:text-foreground"
            )}
            style={{
              background: on ? "var(--foreground)" : "transparent",
              transition: "background-color 0.3s ease, color 0.3s ease",
            }}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Toggle ──────────────────────────────────────────────────────────────────
function Toggle({ value, onChange, testId }: { value: boolean; onChange: (v: boolean) => void; testId?: string }) {
  return (
    <button
      onClick={() => onChange(!value)}
      data-testid={testId}
      aria-pressed={value}
      className="relative h-6 w-11 rounded-full cursor-pointer"
      style={{
        background: value ? HUE_ON : "rgba(255,255,255,0.06)",
        boxShadow: value ? `0 0 0 1px ${HUE_ON}55` : "0 0 0 1px rgba(255,255,255,0.06)",
        transition: "background-color 0.35s cubic-bezier(0.22,1,0.36,1), box-shadow 0.35s cubic-bezier(0.22,1,0.36,1)",
      }}
    >
      <motion.div
        className="absolute top-[3px] h-[18px] w-[18px] rounded-full"
        style={{ background: value ? "var(--background)" : "var(--foreground)" }}
        animate={{ left: value ? "20px" : "3px" }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
      />
    </button>
  );
}

// ── Reset confirm dialog ────────────────────────────────────────────────────
function ResetConfirmDialog({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4 bg-black/70 backdrop-blur-md"
      onClick={onCancel}
      data-testid="reset-overlay"
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md rounded-2xl p-7"
        style={{
          background: "#121214",
          boxShadow: "0 30px 80px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-4 mb-5">
          <div
            className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: `${HUE_DANGER}18`, boxShadow: `0 0 0 1px ${HUE_DANGER}44` }}
          >
            <AlertTriangle size={16} strokeWidth={1.75} style={{ color: HUE_DANGER }} />
          </div>
          <div className="min-w-0">
            <h3 className="text-[16px] font-medium text-foreground leading-tight">¿Borrar todos los datos?</h3>
            <p className="text-[12px] text-muted-foreground mt-1.5 leading-relaxed">
              Se eliminarán recinto, equipos y escenas guardadas. Las preferencias se conservan.
              Esta acción no se puede deshacer.
            </p>
          </div>
        </div>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            data-testid="reset-cancel-btn"
            className="flex-1 rounded-full py-2.5 text-[13px] font-medium cursor-pointer"
            style={{
              background: "rgba(255,255,255,0.03)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.06)",
              color: "var(--foreground)",
              transition: "background-color 0.3s ease",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            data-testid="reset-confirm-btn"
            className="flex-1 rounded-full py-2.5 text-[13px] font-medium cursor-pointer"
            style={{
              background: HUE_DANGER,
              color: "var(--background)",
              transition: "background-color 0.3s ease",
            }}
          >
            Sí, borrar
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


// ── Hardware helpers ────────────────────────────────────────────────────────
function micLabel(s: MicStatus): string {
  return { unknown: "Verificando…", unavailable: "No disponible", prompt: "Sin conceder", granted: "Concedido", denied: "Denegado" }[s];
}
function micTone(s: MicStatus): ChipTone {
  return { unknown: "muted", unavailable: "muted", prompt: "warn", granted: "on", denied: "danger" }[s] as ChipTone;
}
function gyroLabel(s: GyroStatus): string {
  return { unavailable: "No disponible", supported: "Soportado", granted: "Concedido", denied: "Denegado" }[s];
}
function gyroTone(s: GyroStatus): ChipTone {
  return { unavailable: "muted", supported: "warn", granted: "on", denied: "danger" }[s] as ChipTone;
}
function summarizeHardware(mic: MicStatus, gyro: GyroStatus, isNative: boolean): string {
  const parts: string[] = [];
  if (isNative) parts.push("Nativo");
  parts.push(mic === "granted" ? "Mic OK" : mic === "denied" ? "Mic denegado" : "Mic pendiente");
  parts.push(gyro === "granted" || gyro === "supported" ? "Giro OK" : gyro === "denied" ? "Giro denegado" : "Sin giro");
  return parts.join(" · ");
}

type ChipTone = "on" | "warn" | "danger" | "muted";
function HardwareChip({ status, tone, testId }: { status: string; tone: ChipTone; testId?: string }) {
  const hue = { on: HUE_ON, warn: HUE_WARN, danger: HUE_DANGER, muted: HUE_MUTED }[tone];
  const Icon = tone === "on" ? ShieldCheck : tone === "danger" ? ShieldOff : tone === "warn" ? ShieldAlert : Cpu;
  return (
    <span
      data-testid={testId}
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
      style={{
        color: hue,
        background: `${hue}12`,
        boxShadow: `0 0 0 1px ${hue}44`,
      }}
    >
      <Icon size={10} strokeWidth={2} />
      {status}
    </span>
  );
}
