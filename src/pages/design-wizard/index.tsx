// Design Wizard — 5-step guided flow for creating a system from scratch.
// Wraps existing feature pages as steps and provides a fixed bottom bar
// with progress + prev/next. Each step is lazy-mounted so its state
// persists in the Zustand store between navigations.
import { useEffect, useMemo } from "react";
import { motion } from "motion/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, ChevronRight, ChevronLeft, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import {
  wizardCompletion, wizardBlocker, firstIncompleteStep,
  type WizardProgressInput,
} from "./flow.ts";
import { feedback } from "@/lib/feedback.ts";
import { WizardContext } from "@/lib/wizard-context.ts";
import RoomScan from "@/pages/room-scan/index.tsx";
import GearBuilder from "@/pages/gear-builder/index.tsx";
import DSPPage from "@/pages/dsp/index.tsx";
import Channels from "@/pages/channels/index.tsx";
import ExportPage from "@/pages/export-page/index.tsx";
import { V } from "@/components/soundmap/vitals/index.tsx";

const STEPS = [
  { id: "room",   label: "Recinto",  hint: "Dimensiones + material",      Component: RoomScan },
  { id: "pa",     label: "PA",       hint: "Tops + subs + monitors",      Component: GearBuilder },
  { id: "dsp",    label: "DSP",      hint: "EQ + xover automáticos",      Component: DSPPage },
  { id: "patch",  label: "Patch",    hint: "Canales + micrófonos",        Component: Channels },
  { id: "save",   label: "Guardar",  hint: "Preview + exportar",          Component: ExportPage },
] as const;

type StepId = typeof STEPS[number]["id"];

export default function DesignWizard() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { room, tops, subs, dspUnits, mics, scenes, lastWizardStep, setLastWizardStep } = useAppStore();

  const urlStep = params.get("step") as StepId | null;
  // If URL has no explicit step, restore the last visited one from persist
  const currentStep: StepId = urlStep ?? (lastWizardStep as StepId) ?? "room";
  const idx = STEPS.findIndex(s => s.id === currentStep);
  const step = STEPS[Math.max(0, idx)];
  const StepComponent = step.Component;

  // Sync URL ↔ store: when the user lands on /design with no ?step and there's
  // a lastWizardStep saved, reflect it in the URL so refresh/back-nav is stable.
  useEffect(() => {
    if (!urlStep && lastWizardStep && lastWizardStep !== "room") {
      setParams({ step: lastWizardStep }, { replace: true });
    }
    // Also persist the current step every time it changes
    if (urlStep && urlStep !== lastWizardStep) {
      setLastWizardStep(urlStep);
    }
  }, [urlStep, lastWizardStep, setParams, setLastWizardStep]);

  // `patch` y `save` estaban hardcodeados en `false`: los pasos 4 y 5 nunca se
  // marcaban como hechos por más que el usuario los completara, así que la
  // barra de progreso mentía y nunca llegabas a verla entera.
  // Las reglas de flujo viven en `flow.ts` — son lógica de dominio, no render,
  // y así se testean sin jsdom ni testing-library. Ver __tests__/flow.test.ts.
  const progress = useMemo<WizardProgressInput>(() => ({
    hasRoom: !!room,
    gearCount: tops.length + subs.length,
    dspCount: dspUnits.length,
    micCount: mics.length,
    sceneCount: scenes.length,
  }), [room, tops, subs, dspUnits, mics, scenes]);

  const completed = useMemo(() => wizardCompletion(progress), [progress]);
  const blocker = wizardBlocker(currentStep, progress);
  const firstIncomplete = firstIncompleteStep(progress);

  const goTo = (stepId: StepId) => {
    feedback("select");
    setParams({ step: stepId }, { replace: false });
    setLastWizardStep(stepId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const goPrev = () => idx > 0 && goTo(STEPS[idx - 1].id);
  const goNext = () => {
    if (blocker) { feedback("select"); goTo(firstIncomplete); return; }
    if (idx < STEPS.length - 1) goTo(STEPS[idx + 1].id);
    else {
      feedback("success");
      navigate("/perform");
    }
  };

  return (
    <div className="bg-background text-foreground pb-32">
      {/* Progress bar */}
      <div
        className="sticky top-14 z-20 px-5 md:px-7 pt-4 pb-3 border-b border-border"
        style={{
          background: "linear-gradient(180deg, var(--background) 62%, rgba(8,9,10,0.88) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        <div className="max-w-[1400px] mx-auto">
          {/* Barra de pasos: "01 Room · 02 PA · 03 DSP…". El activo se marca con
              el acento; los demás quedan disponibles pero secundarios. Antes
              cada paso era un chip con fondo propio — cinco cápsulas compitiendo
              donde alcanza con tipografía y una línea. */}
          <nav
            className="flex items-center gap-5 md:gap-7 overflow-x-auto no-scrollbar -mx-1 px-1"
            data-testid="wizard-steps"
            aria-label="Pasos del diseño"
          >
            {STEPS.map((s, i) => {
              const done = completed[s.id];
              const active = s.id === currentStep;
              return (
                <button
                  key={s.id}
                  onClick={() => goTo(s.id)}
                  data-testid={`wizard-step-${s.id}`}
                  aria-current={active ? "step" : undefined}
                  className="group relative flex items-center gap-1.5 py-2 text-[12px] font-medium cursor-pointer whitespace-nowrap shrink-0"
                  style={{
                    color: active ? "var(--accent)" : done ? "var(--foreground)" : "var(--muted-foreground)",
                    transition: "color var(--dur) var(--ease)",
                  }}
                >
                  <span className="font-mono tabular-nums opacity-60">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {s.label}
                  {done && !active && (
                    <Check size={10} strokeWidth={2.5} style={{ color: "var(--accent)" }} />
                  )}
                  {/* Subrayado del paso activo — 2px, no una cápsula rellena. */}
                  <span
                    aria-hidden="true"
                    className="absolute left-0 right-0 -bottom-px h-[2px] rounded-full"
                    style={{
                      background: active ? "var(--accent)" : "transparent",
                      transition: "background var(--dur) var(--ease)",
                    }}
                  />
                </button>
              );
            })}
          </nav>
        </div>
        <div className="h-px mt-0" style={{ background: "var(--border-subtle)" }} />
      </div>

      {/* Step content — reuse existing page, marked "inside wizard" so it
          strips its own outer chrome (headers, step pills, min-h-screen) */}
      <WizardContext.Provider value={true}>
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
          data-testid={`wizard-body-${currentStep}`}
        >
          {blocker ? (
            <div className="max-w-[1400px] mx-auto px-5 md:px-10 pt-10" data-testid="wizard-blocked">
              <div
                className="p-6 text-center max-w-md"
                style={{
                  borderRadius: "var(--radius-card)",
                  background: "var(--surface-1)",
                  boxShadow: "var(--elev-1)",
                }}
              >
                <p className="text-[14px] text-foreground mb-1.5">Falta un paso previo</p>
                <p className="text-[13px] text-muted-foreground mb-5">{blocker}</p>
                <button
                  onClick={() => goTo(firstIncomplete)}
                  data-testid="wizard-goto-blocker"
                  className="inline-flex items-center gap-1.5 h-10 px-5 text-[13px] font-medium cursor-pointer"
                  style={{ borderRadius: "var(--radius-pill)", background: "var(--accent)", color: "var(--accent-foreground)" }}
                >
                  Ir a {STEPS.find(s => s.id === firstIncomplete)?.label}
                  <ChevronRight size={13} strokeWidth={2} />
                </button>
              </div>
            </div>
          ) : (
            <StepComponent />
          )}
        </motion.div>
      </WizardContext.Provider>

      {/* Fixed bottom action bar */}
      <div
        className="fixed inset-x-0 md:left-[var(--sidebar-w)] z-30 px-5 md:px-10 py-3 wizard-actionbar"
      >
        <div
          className="absolute inset-0 -z-10"
          style={{
            background: "rgba(8, 9, 10, 0.92)",
            backdropFilter: "blur(20px)",
            borderTop: "1px solid var(--border-subtle)",
          }}
        />
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
          <button
            onClick={goPrev}
            disabled={idx === 0}
            data-testid="wizard-prev"
            className="inline-flex items-center gap-1.5 h-10 px-4 text-[13px] font-medium cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              borderRadius: "var(--radius-control)",
              background: "transparent",
              boxShadow: "0 0 0 1px var(--border)",
              color: "var(--foreground)",
              transition: "box-shadow var(--dur-fast) var(--ease)",
            }}
          >
            <ChevronLeft size={13} strokeWidth={2} />
            Anterior
          </button>
          <p className="text-[11px] text-muted-foreground hidden sm:block">Auto-guardado</p>
          <button
            onClick={goNext}
            data-testid="wizard-next"
            className="inline-flex items-center gap-1.5 h-10 px-6 text-[13px] font-medium cursor-pointer"
            style={{
              borderRadius: "var(--radius-pill)",
              background: "var(--accent)",
              color: "var(--accent-foreground)",
              transition: "opacity var(--dur-fast) var(--ease)",
            }}
          >
            {idx === STEPS.length - 1 ? (
              <>
                <Sparkles size={13} strokeWidth={2} />
                Ir a Perform
              </>
            ) : (
              <>
                Siguiente
                <ChevronRight size={13} strokeWidth={2} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
