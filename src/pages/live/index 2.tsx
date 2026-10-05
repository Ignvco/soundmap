// SoundMap — Live Screen (v4 Neon Console / Real-time Ops)
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "@/store/app.ts";
import { generateStartupProcedure, generateLineCheckProcedure } from "@/lib/audio/live-engine.ts";
import type { LiveStep } from "@/lib/audio/live-engine.ts";
import { calculatePARecommendation } from "@/lib/audio/pa-engine.ts";
import { GlassCard, StatusPill, ScreenShell } from "@/components/soundmap/ui.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import { SPLMeter } from "@/components/soundmap/spl-meter.tsx";
import { TestSignalsPlayer } from "@/components/soundmap/test-signals-player.tsx";
import { feedback } from "@/lib/feedback.ts";
import {
  Check, RefreshCw, Radio, Zap, ShieldAlert, Wifi,
  Activity, Volume2, AlertTriangle, Maximize2
} from "lucide-react";
import { Link } from "react-router-dom";

type LiveTab = "startup" | "linecheck" | "backup" | "emergency";

const TAB_CONFIG: { id: LiveTab; label: string; icon: React.ElementType; color: string }[] = [
  { id: "startup",   label: "Arranque",  icon: Zap,        color: "var(--accent)" },
  { id: "linecheck", label: "Línea",     icon: Activity,   color: "var(--info)" },
  { id: "backup",    label: "Respaldo",  icon: Radio,      color: "var(--warning)" },
  { id: "emergency", label: "Emergencia", icon: ShieldAlert, color: "var(--destructive)" },
];

const STEP_CATEGORY_ICON: Record<LiveStep["category"], React.ElementType> = {
  power:     Zap,
  check:     Activity,
  tune:      Volume2,
  verify:    Wifi,
  emergency: AlertTriangle,
};

const STEP_CATEGORY_COLOR: Record<LiveStep["category"], string> = {
  power:     "#00D95A",
  check:     "#F4F4F4",
  tune:      "#9A9A9A",
  verify:    "var(--info)",
  emergency: "var(--destructive)",
};

// ── Checklist step card ───────────────────────────────────────────────────────
function StepCard({
  step,
  done,
  onToggle,
  tabColor,
  index,
}: {
  step: LiveStep;
  done: boolean;
  onToggle: () => void;
  tabColor: string;
  index: number;
}) {
  const CatIcon = STEP_CATEGORY_ICON[step.category];
  const catColor = STEP_CATEGORY_COLOR[step.category];

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.04, duration: 0.2 }}
      layout
    >
      <div
        onClick={onToggle}
        className={`relative flex items-start gap-3 rounded-2xl border p-4 cursor-pointer transition-all duration-200 ${
          done
            ? "bg-secondary/50 border-border opacity-60"
            : "bg-card border-border hover:border-foreground/15 shadow-[0_2px_8px_rgba(15,15,15,0.04)]"
        }`}
        style={!done && step.critical ? { borderColor: `${tabColor}40` } : {}}
      >
        {/* Step number / check */}
        <div
          className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 transition-all"
          style={done ? {
            background: "rgba(94,234,212,0.15)",
            border: "1px solid rgba(94,234,212,0.30)",
          } : {
            background: `${catColor}15`,
            border: `1px solid ${catColor}30`,
          }}
        >
          {done
            ? <Check size={16} className="text-chart-2" />
            : <CatIcon size={15} style={{ color: catColor }} />
          }
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <p className={`text-xs font-bold leading-snug ${done ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {step.title}
            </p>
            {step.critical && !done && (
              <span
                className="text-[8px] font-bold uppercase tracking-[0.2em] px-1.5 py-0.5 rounded-md"
                style={{ background: `${tabColor}18`, color: tabColor, border: `1px solid ${tabColor}25` }}
              >
                Crítico
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">{step.description}</p>
        </div>

        {/* Tap to complete hint */}
        {!done && (
          <div className="shrink-0 h-5 w-5 rounded-full border border-input flex items-center justify-center mt-0.5">
            <div className="h-2 w-2 rounded-full bg-muted-foreground/40" />
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ── Emergency protocol card ───────────────────────────────────────────────────
function EmergencyProtocol() {
  const steps = [
    { order: 1, text: "MUTEAR el fader maestro inmediatamente", urgent: true },
    { order: 2, text: "Mutear todos los envíos a monitor", urgent: true },
    { order: 3, text: "Notificar al personal del recinto e ingeniero de FOH", urgent: false },
    { order: 4, text: "Evaluar causa: feedback / sobrecarga / falla de equipo", urgent: false },
    { order: 5, text: "Si es seguro continuar: restablecer faders gradualmente en orden", urgent: false },
    { order: 6, text: "Si no es seguro: iniciar secuencia de apagado completo", urgent: true },
  ];

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-xl bg-destructive/12 border border-destructive/25 flex items-center justify-center">
          <AlertTriangle size={16} className="text-destructive" />
        </div>
        <div>
          <p className="text-xs font-bold text-destructive">Protocolo de Emergencia</p>
          <p className="text-[10px] text-muted-foreground">Seguir en orden — no saltear pasos</p>
        </div>
      </div>
      <div className="space-y-2.5">
        {steps.map(s => (
          <div key={s.order} className="flex items-start gap-3">
            <div
              className={`h-6 w-6 rounded-lg flex items-center justify-center shrink-0 text-[10px] font-medium ${
                s.urgent ? "bg-destructive/15 text-destructive border border-destructive/30" : "bg-secondary text-muted-foreground border border-border"
              }`}
            >
              {s.order}
            </div>
            <p className={`text-xs pt-0.5 leading-snug ${s.urgent ? "text-destructive font-semibold" : "text-foreground/70"}`}>
              {s.text}
            </p>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ── Backup protocol card ──────────────────────────────────────────────────────
function BackupProtocol() {
  const items = [
    { title: "Consola de repuesto",         desc: "Mantener una consola secundaria pre-patcheada lista para cambio inmediato" },
    { title: "Fuentes de audio de respaldo", desc: "Reproducción USB / SD en caso de falla del laptop" },
    { title: "Frecuencias inalámbricas",    desc: "Escanear canales de respaldo en todos los sistemas inalámbricos antes del show" },
    { title: "Cajas DI",                    desc: "Llevar cajas DI pasivas de repuesto para cada instrumento" },
    { title: "Cables",                      desc: "Cables XLR, de altavoz y de alimentación de respaldo probados en el escenario" },
  ];

  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="h-9 w-9 rounded-xl bg-chart-3/12 border border-chart-3/25 flex items-center justify-center" style={{ background: "rgba(154,154,154,0.12)", borderColor: "rgba(154,154,154,0.25)" }}>
          <Radio size={16} style={{ color: "#9A9A9A" }} />
        </div>
        <div>
          <p className="text-xs font-bold" style={{ color: "#9A9A9A" }}>Lista de Respaldo</p>
          <p className="text-[10px] text-muted-foreground">Ítems de preparación pre-show</p>
        </div>
      </div>
      <div className="space-y-3">
        {items.map(item => (
          <div key={item.title} className="flex items-start gap-2.5">
            <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: "#9A9A9A" }} />
            <div>
              <p className="text-xs font-bold text-foreground">{item.title}</p>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </GlassCard>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────
export default function Live() {
  const { room, acoustics, tops, subs, monitors, dspUnits, amps } = useAppStore();
  const [activeTab, setActiveTab] = useState<LiveTab>("startup");
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  const startup   = room && acoustics ? generateStartupProcedure(tops, subs, dspUnits, amps, acoustics) : null;
  const linecheck = generateLineCheckProcedure();

  // Derive the PA target SPL from the current system (for the SPL Meter target marker)
  const paRec = room && acoustics
    ? calculatePARecommendation(room, acoustics, tops, subs, monitors, amps)
    : null;
  const splTarget = paRec?.splTarget ?? undefined;

  const procedure = activeTab === "startup" ? startup : activeTab === "linecheck" ? linecheck : null;
  const steps     = procedure?.steps ?? [];

  const completedCount = steps.filter(s => completedSteps.has(s.id)).length;
  const isComplete     = steps.length > 0 && completedCount === steps.length;
  const progressPct    = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  const toggleStep = useCallback((id: string) => {
    feedback("select", { sound: false });
    setCompletedSteps(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);

  const resetProcedure = useCallback(() => {
    setCompletedSteps(new Set());
  }, []);

  const hasGear = tops.length > 0;
  const tabConfig = TAB_CONFIG.find(t => t.id === activeTab)!;

  // Signal success when startup checklist completes
  useEffect(() => {
    if (isComplete && activeTab === "startup") feedback("success");
  }, [isComplete, activeTab]);

  return (
    <ScreenShell>
      <PageHeader
        title="Live"
        subtitle={room?.name ?? "Sin recinto cargado"}
        right={
          <div className="flex items-center gap-2">
            <Link
              to="/kiosk"
              onClick={() => feedback("select")}
              data-testid="open-kiosk-btn"
              className="h-8 flex items-center gap-1.5 rounded-xl px-2.5 bg-accent/12 border border-accent/25 text-[10px] font-medium text-accent hover:bg-accent/20 active:scale-90 cursor-pointer uppercase tracking-[0.2em]"
            >
              <Maximize2 size={11} />
              Kiosk
            </Link>
            <StatusPill
              status={isComplete ? "live" : hasGear ? "standby" : "offline"}
              label={isComplete ? "EN VIVO" : hasGear ? "En Espera" : "Apagado"}
            />
          </div>
        }
      />

      {/* SPL Meter (real, using the device microphone) */}
      <div className="px-4 mb-4">
        <SPLMeter target={splTarget} />
      </div>

      {/* Test Signal Player */}
      <div className="px-4 mb-4">
        <TestSignalsPlayer />
      </div>

      {/* Tabs */}
      <div className="px-4 mb-4">
        <div className="grid grid-cols-4 gap-1.5">
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id); resetProcedure(); }}
                className="rounded-xl py-2.5 text-[10px] font-bold transition-all cursor-pointer flex flex-col items-center gap-1 border"
                style={isActive ? {
                  background: `${tab.color}18`,
                  borderColor: `${tab.color}40`,
                  color: tab.color,
                  boxShadow: `0 2px 10px ${tab.color}20`,
                } : {
                  background: "var(--secondary)",
                  borderColor: "var(--border)",
                  color: "var(--muted-foreground)",
                }}
              >
                <Icon size={14} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Progress bar (for checklist tabs) */}
      {steps.length > 0 && (
        <div className="px-4 mb-4">
          <GlassCard className="p-3">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <p className="text-[10px] font-bold text-foreground">{procedure?.title}</p>
                {isComplete && (
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
                    <StatusPill status="ready" label="Completo" />
                  </motion.div>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-muted-foreground">{completedCount}/{steps.length}</span>
                <button
                  onClick={resetProcedure}
                  className="text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} />
                </button>
              </div>
            </div>
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: `linear-gradient(90deg, ${tabConfig.color}, ${tabConfig.color}bb)` }}
                animate={{ width: `${progressPct}%` }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
            </div>
            <div className="flex justify-between text-[9px] text-muted-foreground mt-1.5">
              <span>0%</span>
              <span>{Math.round(progressPct)}% completado</span>
              <span>100%</span>
            </div>
          </GlassCard>
        </div>
      )}

      {/* Step list / protocol content */}
      <div className="px-4 space-y-2 pb-6">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.15 }}
            className="space-y-2"
          >
            {activeTab === "emergency" ? (
              <EmergencyProtocol />
            ) : activeTab === "backup" ? (
              <BackupProtocol />
            ) : (
              <>
                {steps.map((step: LiveStep, i: number) => (
                  <StepCard
                    key={step.id}
                    step={step}
                    done={completedSteps.has(step.id)}
                    onToggle={() => toggleStep(step.id)}
                    tabColor={tabConfig.color}
                    index={i}
                  />
                ))}

                {steps.length === 0 && (
                  <GlassCard className="p-8 text-center">
                    <p className="text-sm font-bold text-foreground mb-1">Sin Procedimiento Generado</p>
                    <p className="text-xs text-muted-foreground">Completá un Escaneo de Sala y agregá equipo para generar el procedimiento de arranque</p>
                  </GlassCard>
                )}

                {/* Completion message */}
                <AnimatePresence>
                  {isComplete && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                    >
                      <div className="rounded-2xl p-5 text-center"
                        style={{
                          background: `linear-gradient(135deg, ${tabConfig.color}14, transparent)`,
                          border: `1px solid ${tabConfig.color}30`,
                        }}
                      >
                        <div
                          className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-3"
                          style={{ background: `${tabConfig.color}20` }}
                        >
                          <Check size={22} style={{ color: tabConfig.color }} />
                        </div>
                        <p className="text-sm font-medium text-foreground mb-1">
                          {procedure?.title} Completo
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {activeTab === "startup"
                            ? "El sistema está listo. Procedé a la prueba de línea."
                            : "Prueba de línea completa. Listo para el show."}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </ScreenShell>
  );
}
