// SoundMap — Onboarding Overlay
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "@/store/app.ts";
import { useNavigate } from "react-router-dom";
import { Scan, Layers, Radio, ChevronRight, AudioWaveform } from "lucide-react";

const STEPS = [
  {
    icon: Scan,
    color: "var(--accent)",
    title: "Escaneá tu Recinto",
    desc: "Ingresá dimensiones, materiales y capacidad. LevelPro calcula RT60, riesgo de eco y frecuencia de Schroeder al instante.",
  },
  {
    icon: Layers,
    color: "var(--accent)",
    title: "Armá tu Rig",
    desc: "Elegí tops, subs, DSP, amps y monitores desde la base de datos profesional. Los puntajes de coincidencia guían cada elección.",
  },
  {
    icon: Radio,
    color: "var(--info)",
    title: "Salí en Vivo",
    desc: "Generá config de PA, salidas DSP, mapa de escenario, lista de canales y exportá un informe técnico completo.",
  },
];

export function OnboardingOverlay() {
  const { hasSeenOnboarding, dismissOnboarding, loadDemoVenue, startTour } = useAppStore();
  const navigate = useNavigate();

  if (hasSeenOnboarding) return null;

  const handleDemo = () => {
    loadDemoVenue();
    navigate("/");
    dismissOnboarding();
    // Let the dashboard render before spotlighting its elements
    setTimeout(() => startTour(), 400);
  };

  const handleDismiss = () => {
    dismissOnboarding();
    setTimeout(() => startTour(), 400);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col justify-end"
        style={{ background: "rgba(2,4,3,0.88)", backdropFilter: "blur(16px)" }}
      >
        {/* Decorative glow */}
        <div
          className="absolute top-1/4 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: "radial-gradient(circle, var(--accent-dim) 0%, transparent 70%)" }}
        />

        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
          className="relative px-5 pb-10 pt-7 max-w-md mx-auto w-full bg-card border border-border rounded-t-3xl shadow-[0_-8px_40px_rgba(15,15,15,0.12)]"
        >
          {/* Logo mark */}
          <div className="flex items-center gap-2.5 mb-6">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center shadow-[0_4px_16px_rgba(15,15,15,0.18)]">
              <AudioWaveform size={20} className="text-primary-foreground" strokeWidth={2.5} />
            </div>
            <div>
              <p className="text-base font-medium text-foreground tracking-tight">LevelPro Audio</p>
              <p className="text-[11px] text-muted-foreground font-semibold uppercase tracking-[0.28em]">Diseñador de Sistemas Pro Audio</p>
            </div>
          </div>

          <h2 className="text-2xl font-medium text-foreground mb-1 leading-tight tracking-tight">
            Tres pasos hacia un<br />
            <span className="text-accent">sistema PA perfecto.</span>
          </h2>
          <p className="text-sm text-muted-foreground mb-7">
            Análisis acústico · Selección de equipo · Despliegue en vivo
          </p>

          {/* Step cards */}
          <div className="space-y-3 mb-7">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.35, ease: "easeOut" as const }}
                className="flex items-start gap-3 rounded-2xl bg-secondary/60 border border-border p-3.5"
              >
                <div
                  className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: `${step.color}22` }}
                >
                  <step.icon size={16} style={{ color: step.color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-bold uppercase tracking-[0.28em]" style={{ color: step.color }}>
                      Paso {i + 1}
                    </span>
                  </div>
                  <p className="text-sm font-bold text-foreground">{step.title}</p>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mt-0.5">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55, duration: 0.3, ease: "easeOut" as const }}
            className="space-y-2.5"
          >
            <button
              onClick={handleDemo}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 text-sm font-bold text-primary-foreground shadow-[0_4px_20px_rgba(15,15,15,0.2)] hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer"
            >
              <AudioWaveform size={16} strokeWidth={2.5} />
              Cargar Recinto Demo
              <ChevronRight size={15} />
            </button>
            <button
              onClick={handleDismiss}
              className="w-full rounded-2xl bg-secondary border border-border py-3.5 text-sm font-semibold text-secondary-foreground hover:bg-secondary/70 active:scale-[0.98] transition-all cursor-pointer"
            >
              Comenzar desde cero
            </button>
          </motion.div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
