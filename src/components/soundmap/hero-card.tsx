// Hero Card — the single card that replaces the widget grid dashboard.
// Answers the three brief-mandated questions in <3 seconds:
//   1. Is my system ready?
//   2. How good is my design?
//   3. What should I do next?
//
// Uses typography and negative space instead of borders / boxes to establish
// hierarchy, per the redesign brief.
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import { feedback } from "@/lib/feedback.ts";

type SystemState = "empty" | "in-progress" | "ready" | "live" | "warning";

interface HeroCardProps {
  onCommandBarOpen?: () => void;
}

export function HeroCard({ onCommandBarOpen }: HeroCardProps) {
  const { room, acoustics, tops, subs, monitors, amps, dspUnits } = useAppStore();

  const hasRoom = !!room && !!acoustics;
  const hasPa = tops.length > 0 || subs.length > 0;
  const hasDsp = dspUnits.length > 0;
  const hasAmps = amps.length > 0;
  const hasMonitors = monitors.length > 0;

  const steps = [
    { label: "Recinto", done: hasRoom, path: "/design" },
    { label: "Sistema PA", done: hasPa, path: "/design" },
    { label: "DSP", done: hasDsp, path: "/design" },
    { label: "Amplificación", done: hasAmps, path: "/design" },
    { label: "Monitores", done: hasMonitors, path: "/design" },
  ];
  const completed = steps.filter(s => s.done).length;
  const progress = completed / steps.length;

  const state: SystemState =
    completed === 0 ? "empty"
    : completed >= 4 ? "ready"
    : "in-progress";

  // Design quality score — completion + RT60 healthiness (using rt60Audience)
  const rt60 = acoustics?.rt60Audience ?? 0;
  const rt60Health = acoustics
    ? Math.max(0, Math.min(1, 1 - Math.abs(rt60 - 1.2) / 2))
    : 0;
  const designScore = Math.round((progress * 0.7 + rt60Health * 0.3) * 100);

  const primaryCTA = (() => {
    if (state === "empty") {
      return { label: "Empezar diseño", path: "/design", testId: "hero-cta-start" };
    }
    if (state === "ready") {
      return { label: "Ir a Perform", path: "/perform", testId: "hero-cta-perform" };
    }
    // in-progress → point to next unfinished step
    const next = steps.find(s => !s.done);
    return {
      label: `Continuar · ${next?.label ?? "Diseño"}`,
      path: next?.path ?? "/design",
      testId: "hero-cta-continue",
    };
  })();

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      className="relative w-full max-w-3xl mx-auto rounded-2xl bg-card px-8 pt-10 pb-8 md:px-14 md:pt-14 md:pb-12 overflow-hidden"
      style={{ boxShadow: "0 20px 80px -20px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)" }}
      data-testid="hero-card"
    >
      {/* Ambient glow — very subtle */}
      <div
        className="pointer-events-none absolute -inset-24 opacity-[0.12] blur-[80px]"
        style={{
          background: state === "ready"
            ? "radial-gradient(circle at 30% 30%, var(--sm-accent) 0%, transparent 55%)"
            : "radial-gradient(circle at 30% 30%, #C77A9E 0%, transparent 55%)",
        }}
      />

      {/* State label */}
      <p
        className="text-[11px] uppercase tracking-[0.24em] font-medium mb-8"
        style={{
          color: state === "ready" ? "var(--sm-accent)" : state === "empty" ? "var(--muted-foreground)" : "var(--sm-blue)",
        }}
        data-testid="hero-state"
      >
        {state === "empty" ? "Sin proyecto activo"
          : state === "ready" ? "Sistema listo"
          : `${completed} de ${steps.length} pasos completos`}
      </p>

      {/* Ready question — typography as hierarchy */}
      <h1
        className="text-[2.4rem] md:text-[3.2rem] leading-[1.05] tracking-[-0.03em] font-medium text-foreground mb-4"
        data-testid="hero-headline"
      >
        {state === "empty" && "Diseñá tu primer sistema."}
        {state === "in-progress" && (room ? room.name : "Tu proyecto")}
        {state === "ready" && (room?.name ?? "Sistema listo para show")}
      </h1>

      {/* Secondary line */}
      <p className="text-[15px] md:text-[16px] text-muted-foreground max-w-lg leading-relaxed mb-10" data-testid="hero-description">
        {state === "empty" &&
          "Escaneá un recinto o cargá una plantilla. SoundMap se ocupa de PA, DSP, patch y monitoreo."}
        {state === "in-progress" && (
          <>Estás a {steps.length - completed} paso{steps.length - completed === 1 ? "" : "s"} de tener tu configuración completa.</>
        )}
        {state === "ready" &&
          "Todo listo. Podés ir a Perform, exportar el reporte técnico o refinar la cobertura."}
      </p>

      {/* KPI row — reveals only when data exists */}
      {(state === "in-progress" || state === "ready") && (
        <div className="flex items-baseline gap-10 mb-10" data-testid="hero-kpis">
          <Metric label="Diseño" value={designScore} suffix="/100" tone={designScore > 70 ? "live" : "info"} testId="hero-kpi-score" />
          {acoustics && (
            <>
              <Metric label="RT60" value={rt60.toFixed(2)} suffix="s" tone="info" testId="hero-kpi-rt60" />
              <Metric label="Capacidad" value={room?.capacity ?? 0} suffix="pax" tone="muted" testId="hero-kpi-capacity" />
            </>
          )}
        </div>
      )}

      {/* Progress bar — a subtle track, no borders */}
      {state !== "empty" && (
        <div className="mb-10">
          <div className="h-[3px] w-full rounded-full bg-white/[0.06] overflow-hidden">
            <motion.div
              className="h-full"
              style={{ background: state === "ready" ? "var(--sm-accent)" : "#C77A9E" }}
              initial={{ width: 0 }}
              animate={{ width: `${progress * 100}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
              data-testid="hero-progress"
            />
          </div>
        </div>
      )}

      {/* Primary CTA — the only obvious button on screen */}
      <div className="flex items-center gap-3">
        <Link
          to={primaryCTA.path}
          onClick={() => feedback("select")}
          data-testid={primaryCTA.testId}
          className="group relative inline-flex items-center gap-2.5 rounded-full bg-[#C77A9E] hover:bg-[#D488AA] text-[#09090b] px-6 md:px-7 py-3.5 text-[15px] font-medium tracking-tight cursor-pointer"
          style={{ transition: "background-color 0.4s cubic-bezier(0.22,1,0.36,1), transform 0.2s ease" }}
        >
          <span>{primaryCTA.label}</span>
          <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" strokeWidth={2} />
        </Link>

        {onCommandBarOpen && (
          <button
            onClick={() => { feedback("tap"); onCommandBarOpen(); }}
            data-testid="hero-cmd-hint"
            className="hidden md:inline-flex items-center gap-2 px-4 py-3 text-[13px] text-muted-foreground hover:text-foreground rounded-full cursor-pointer"
            style={{ transition: "color 0.3s ease" }}
          >
            <Sparkles size={13} strokeWidth={1.75} />
            <span>Preguntar a SoundMap</span>
            <kbd className="ml-1 px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] font-mono">⌘K</kbd>
          </button>
        )}
      </div>
    </motion.section>
  );
}

function Metric({ label, value, suffix, tone, testId }: {
  label: string;
  value: number | string;
  suffix?: string;
  tone: "live" | "info" | "muted";
  testId?: string;
}) {
  const color = tone === "live" ? "var(--sm-accent)" : tone === "info" ? "var(--sm-blue)" : "#F4F4F5";
  return (
    <div data-testid={testId}>
      <p className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground font-medium mb-1.5">{label}</p>
      <p className="font-mono tabular-nums" style={{ color, fontSize: "1.8rem", fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1 }}>
        {value}
        {suffix && <span className="text-muted-foreground text-[15px] font-normal ml-1">{suffix}</span>}
      </p>
    </div>
  );
}
