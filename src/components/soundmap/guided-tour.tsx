// SoundMap — Guided Tour (coach marks)
// Spotlights key actions on the home dashboard with step-by-step tooltips.
import { useEffect, useLayoutEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "motion/react";
import { ChevronRight, ChevronLeft, X, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/app.ts";

interface TourStep {
  selector: string;
  title: string;
  desc: string;
  // preferred placement of the tooltip relative to the target
  placement?: "top" | "bottom";
}

const STEPS: TourStep[] = [
  {
    selector: '[data-tour="venue"]',
    title: "Tu recinto actual",
    desc: "Acá ves la sala activa con su acústica: RT60, riesgo de eco e inteligibilidad. Reescaneá cuando cambies de lugar.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="workflow"]',
    title: "Flujo de 6 pasos",
    desc: "Seguí el progreso de tu sistema: Escaneo, Equipo, PA, DSP, Escenario y Live. Tocá cualquier paso para saltar a él.",
    placement: "bottom",
  },
  {
    selector: '[data-tour="quick-access"]',
    title: "Acceso rápido",
    desc: "Saltá directo a las secciones más usadas. El botón resaltado es siempre tu próximo paso sugerido.",
    placement: "top",
  },
  {
    selector: '[data-tour="advisor"]',
    title: "Asesor IA",
    desc: "¿Dudas? El asesor conoce tu sala y tu equipo. Preguntale por qué tu RT60 es alto o qué subs agregar.",
    placement: "top",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PAD = 8;

export function GuidedTour() {
  const tourActive = useAppStore((s) => s.tourActive);
  const endTour = useAppStore((s) => s.endTour);
  const [index, setIndex] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const step = STEPS[index];

  const measure = useCallback(() => {
    if (!step) return;
    const el = document.querySelector(step.selector);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [step]);

  // Reset to first step whenever the tour (re)starts
  useEffect(() => {
    if (tourActive) setIndex(0);
  }, [tourActive]);

  // Scroll target into view, then measure
  useLayoutEffect(() => {
    if (!tourActive || !step) return;
    const el = document.querySelector(step.selector);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Allow scroll + layout to settle before measuring
    const t = window.setTimeout(measure, 320);
    return () => window.clearTimeout(t);
  }, [tourActive, step, index, measure]);

  // Keep spotlight aligned on resize / scroll
  useEffect(() => {
    if (!tourActive) return;
    const onChange = () => measure();
    window.addEventListener("resize", onChange);
    window.addEventListener("scroll", onChange, true);
    return () => {
      window.removeEventListener("resize", onChange);
      window.removeEventListener("scroll", onChange, true);
    };
  }, [tourActive, measure]);

  if (!tourActive || !step) return null;

  const isLast = index === STEPS.length - 1;
  const isFirst = index === 0;

  const next = () => {
    if (isLast) endTour();
    else setIndex((i) => i + 1);
  };
  const back = () => setIndex((i) => Math.max(0, i - 1));

  // Compute tooltip position
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const TOOLTIP_W = Math.min(340, vw - 32);

  let tooltipTop: number;
  let placeBelow = step.placement !== "top";

  if (rect) {
    const spaceBelow = vh - (rect.top + rect.height);
    const spaceAbove = rect.top;
    // Flip if not enough room in preferred direction
    if (placeBelow && spaceBelow < 200 && spaceAbove > spaceBelow) placeBelow = false;
    if (!placeBelow && spaceAbove < 200 && spaceBelow > spaceAbove) placeBelow = true;
    tooltipTop = placeBelow ? rect.top + rect.height + PAD + 8 : rect.top - PAD - 8;
  } else {
    tooltipTop = vh / 2;
  }

  const tooltipLeft = rect
    ? Math.max(16, Math.min(rect.left + rect.width / 2 - TOOLTIP_W / 2, vw - TOOLTIP_W - 16))
    : vw / 2 - TOOLTIP_W / 2;

  return createPortal(
    <div className="fixed inset-0 z-[80]">
      {/* Spotlight: a transparent box with a massive surrounding shadow */}
      <AnimatePresence mode="wait">
        {rect ? (
          <motion.div
            key={`spot-${index}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.25 }}
            className="absolute rounded-2xl pointer-events-none"
            style={{
              top: rect.top - PAD,
              left: rect.left - PAD,
              width: rect.width + PAD * 2,
              height: rect.height + PAD * 2,
              boxShadow: "0 0 0 9999px rgba(2,4,3,0.84)",
              border: "2px solid var(--accent-ring)",
            }}
          />
        ) : (
          // Fallback: plain dim backdrop when target not found
          <motion.div
            key="spot-fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0"
            style={{ background: "rgba(2,4,3,0.84)" }}
          />
        )}
      </AnimatePresence>

      {/* Click-catcher to advance / prevent interaction underneath */}
      <button
        onClick={next}
        className="absolute inset-0 cursor-default"
        aria-label="Continuar tour"
      />

      {/* Tooltip card */}
      <motion.div
        key={`card-${index}`}
        initial={{ opacity: 0, y: placeBelow ? -8 : 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}
        className="absolute rounded-2xl bg-card border border-border p-4 shadow-[0_18px_50px_rgba(0,0,0,0.55)]"
        style={{
          top: tooltipTop,
          left: tooltipLeft,
          width: TOOLTIP_W,
          transform: placeBelow ? "none" : "translateY(-100%)",
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-accent/15 flex items-center justify-center shrink-0">
              <Sparkles size={14} className="text-accent" />
            </div>
            <p className="text-sm font-medium text-foreground leading-tight">{step.title}</p>
          </div>
          <button
            onClick={endTour}
            data-testid="close-guided-tour"
            className="h-6 w-6 rounded-lg flex items-center justify-center bg-secondary hover:bg-secondary/70 transition-colors cursor-pointer shrink-0"
            aria-label="Cerrar tour"
          >
            <X size={12} className="text-muted-foreground" />
          </button>
        </div>

        <p className="text-[12px] text-muted-foreground leading-relaxed mb-3.5">{step.desc}</p>

        <div className="flex items-center justify-between">
          {/* Progress dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <span
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === index ? 16 : 6,
                  background: i === index ? "var(--accent)" : "rgba(255,255,255,0.2)",
                }}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                onClick={back}
                className="flex items-center gap-1 rounded-xl bg-secondary px-2.5 py-2 text-[11px] font-bold text-secondary-foreground hover:bg-secondary/70 transition-colors cursor-pointer"
              >
                <ChevronLeft size={13} />
                Atrás
              </button>
            )}
            <button
              onClick={next}
              className="flex items-center gap-1 rounded-xl bg-accent px-3.5 py-2 text-[11px] font-bold text-accent-foreground hover:bg-[var(--accent)] active:scale-[0.97] transition-all cursor-pointer shadow-[0_4px_14px_var(--accent-ring)]"
            >
              {isLast ? "Listo" : "Siguiente"}
              {!isLast && <ChevronRight size={13} />}
            </button>
          </div>
        </div>
      </motion.div>
    </div>,
    document.body,
  );
}
