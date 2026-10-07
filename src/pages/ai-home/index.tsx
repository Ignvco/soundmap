import { ProjectPlanPreview } from "@/components/soundmap/project-plan-preview";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
// Home v8 — command center.
//
// El rediseño pide eliminar el look de "card · card · card". La v7 apilaba
// siete tarjetas del mismo peso: nada dominaba y no había una acción evidente.
//
// Jerarquía nueva, de arriba abajo:
//   1. Saludo + nombre del recinto (editorial, grande)
//   2. Cuatro métricas SIN caja — el número es el elemento
//   3. El heatmap de SPL como protagonista, no encerrado en una tarjeta chica
//   4. UNA acción primaria (Continuar diseño) + dos secundarias
//   5. Escenas recientes como lista, no como grilla de tarjetas
//
// La capa de datos NO cambió: los mismos motores, los mismos hooks.
import { feedback } from "@/lib/feedback.ts";
import { useAppStore } from "@/store/app.ts";
import {
  ArrowRight,
  BarChart3,
  Check,
  ChevronDown,
  Plus,
  Radio,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
import {
  Divider,
  Metric,
  MetricRow,
  SectionLabel,
} from "@/components/soundmap/vitals/metric.tsx";
import {
  coverageByZone,
  paSummary,
  roomSummary,
  sceneToSources,
} from "@/lib/audio/system-vitals.ts";

export default function AIHome() {
  const navigate = useNavigate();
  const {
    audit,
    stageLayout,
    room,
    acoustics,
    tops,
    subs,
    monitors,
    scenes,
    loadDemoVenue,
  } = useAppStore();

  const hasSystem = !!room && (tops.length > 0 || subs.length > 0);

  // Misma capa de datos que antes: los motores no cambiaron.
  const { pa, coverage, roomInfo, grid } = useMemo(() => {
    if (!hasSystem || !room || !acoustics) {
      return { pa: null, coverage: null, roomInfo: null, grid: null };
    }
    const sources = sceneToSources(room, tops, subs, stageLayout);
    return {
      pa: paSummary(
        tops,
        subs,
        monitors,
        room ?? undefined,
        stageLayout,
        audit.dsp,
      ),
      coverage: coverageByZone(room, tops, subs, stageLayout, audit.dsp),
      roomInfo: roomSummary(room, acoustics),
      grid:
        sources.length > 0
          ? evaluateAudit({ room, tops, subs, stageLayout, dsp: audit.dsp })
              .grid
          : null,
    };
  }, [
    hasSystem,
    room,
    acoustics,
    tops,
    subs,
    monitors,
    stageLayout,
    audit.dsp,
  ]);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Turno noche";
    if (h < 12) return "Buen día";
    if (h < 19) return "Buenas tardes";
    return "Buenas noches";
  }, []);

  const recent = scenes.slice(0, 3);

  return (
    <>
      <div className="v6-workspace home-workspace">
        <div className="max-w-[1440px] mx-auto glow-home-grid">
          {/* ── 1. Encabezado editorial ─────────────────────────────────── */}
          <motion.div
            className="glow-home-heading"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p
              className="text-[13px]"
              style={{ color: "var(--muted-foreground)" }}
            >
              {greeting} · Tu proyecto, en perspectiva
            </p>
            <button
              onClick={() => {
                feedback("tap");
                navigate(room ? "/scenes" : "/design?step=room");
              }}
              data-testid="home-venue"
              className="group mt-1.5 flex items-center gap-2.5 cursor-pointer text-left"
            >
              <h1 className="v6-heading text-foreground truncate">
                {room?.name || "Diseña cómo se escucha."}
              </h1>
              <ChevronDown
                size={20}
                strokeWidth={2}
                className="shrink-0 mt-1"
                style={{ color: "var(--muted-foreground)" }}
              />
            </button>

            <div className="flex items-center gap-2 mt-3">
              <span
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{
                  background: hasSystem
                    ? "var(--accent)"
                    : "var(--muted-foreground)",
                }}
                aria-hidden="true"
              />
              <p
                className="text-[12px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                {hasSystem
                  ? `Inventario cargado · ${tops.reduce((n, t) => n + (t.quantity ?? 1), 0)} tops · ${subs.reduce((n, x) => n + (x.quantity ?? 1), 0)} subs`
                  : room
                    ? "Recinto listo para añadir equipos"
                    : "Tu recinto, tu sistema, tu próxima revisión."}
              </p>
            </div>
          </motion.div>

          {/* ── 2. Métricas sin caja ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.08,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="home-vitals mt-6 py-5 border-y border-border"
          >
            <MetricRow testId="home-metrics">
              <Metric
                value={pa ? `${Math.round(pa.arraySpl)}` : "—"}
                unit="dB"
                label="SPL estimado a 1 m"
                testId="metric-spl"
              />
              <Metric
                value={coverage ? `${Math.round(coverage.uniformityPct)}` : "—"}
                unit="%"
                label="Uniformidad ±3 dB"
                testId="metric-coverage"
              />
              <Metric
                value={roomInfo ? roomInfo.rt60Audience.toFixed(2) : "—"}
                unit="s"
                label="RT60 estimado"
                testId="metric-rt60"
              />
              <Metric
                value={
                  pa ? `${pa.headroomDb > 0 ? "+" : ""}${pa.headroomDb}` : "—"
                }
                unit="dB"
                label="Headroom"
                tone={
                  !pa ? "default" : pa.headroomDb >= 3 ? "accent" : "warning"
                }
                testId="metric-headroom"
              />
            </MetricRow>
          </motion.div>

          {/* ── 3. La visualización como protagonista ───────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: 0.16,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="mt-5 glow-home-visual"
          >
            {room ? (
              <div data-testid="home-heatmap">
                <VenuePreview
                  layout={stageLayout}
                  room={room}
                  tops={tops}
                  subs={subs}
                  monitors={monitors}
                  grid={grid ?? undefined}
                  className="glow-home-preview"
                  plan={
                    <ProjectPlanPreview
                      room={room}
                      tops={tops}
                      subs={subs}
                      monitors={monitors}
                      layout={stageLayout}
                    />
                  }
                />
                <div className="home-map-caption flex justify-between items-center mt-3 text-xs text-muted-foreground">
                  <span>Diseño estimado · No medido</span>
                  <button
                    className="v6-button"
                    data-testid="home-open-plan"
                    onClick={() => navigate("/stage-map")}
                  >
                    Abrir plano <ArrowRight size={13} />
                  </button>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col items-center justify-center h-[240px] md:h-[300px] px-6 text-center"
                style={{
                  borderRadius: "var(--radius-card)",
                  background: "var(--surface-1)",
                  boxShadow: "var(--elev-1)",
                }}
                data-testid="home-heatmap-empty"
              >
                <p className="text-[14px] text-foreground font-medium">
                  Sin cobertura que mostrar
                </p>
                <p
                  className="text-[12px] mt-1.5 max-w-xs leading-relaxed"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Definí el recinto y elegí las cajas: el mapa de SPL se calcula
                  solo.
                </p>
                <button
                  onClick={() => {
                    feedback("select");
                    loadDemoVenue();
                  }}
                  data-testid="home-load-demo"
                  className="mt-5 h-9 px-4 text-[12px] font-medium cursor-pointer"
                  style={{
                    borderRadius: "var(--radius-control)",
                    background: "var(--surface-3)",
                    color: "var(--foreground)",
                  }}
                >
                  Cargar recinto de demo
                </button>
              </div>
            )}
          </motion.div>

          {/* ── 4. Una acción primaria, dos secundarias ─────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.5,
              delay: 0.24,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="home-actions mt-5"
          >
            <button
              onClick={() => {
                feedback("select");
                navigate("/design");
              }}
              data-testid="home-primary-cta"
              className="group flex-1 sm:flex-none sm:min-w-[220px] h-11 px-5 inline-flex items-center justify-center gap-2 text-[13px] font-medium cursor-pointer"
              style={{
                borderRadius: "var(--radius-control)",
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                transition: "opacity var(--dur-fast) var(--ease)",
              }}
            >
              <span className="hidden sm:inline">
                {hasSystem ? "Continuar diseño" : "Empezar diseño"}
              </span>
              <span className="sm:hidden">Diseñar</span>
              <ArrowRight
                size={14}
                strokeWidth={2.25}
                className="group-hover:translate-x-0.5"
                style={{ transition: "transform var(--dur) var(--ease)" }}
              />
            </button>

            {[
              {
                label: "Medición",
                icon: Radio,
                to: "/perform",
                testId: "home-goto-perform",
              },
              {
                label: "Analizar",
                icon: BarChart3,
                to: "/compare",
                testId: "home-goto-analyze",
              },
            ].map(({ label, icon: Icon, to, testId }) => (
              <button
                key={to}
                onClick={() => {
                  feedback("tap");
                  navigate(to);
                }}
                data-testid={testId}
                className="h-11 px-5 inline-flex items-center justify-center gap-2 text-[13px] font-medium cursor-pointer"
                style={{
                  borderRadius: "var(--radius-control)",
                  background: "transparent",
                  boxShadow: "0 0 0 1px var(--border)",
                  color: "var(--foreground)",
                  transition: "box-shadow var(--dur-fast) var(--ease)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow =
                    "0 0 0 1px var(--border-strong)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = "0 0 0 1px var(--border)";
                }}
              >
                <Icon size={14} strokeWidth={1.75} />
                {label}
              </button>
            ))}
          </motion.div>

          {/* ── 5. Escenas recientes como lista ─────────────────────────── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.32 }}
            className="mt-7 glow-home-recent"
          >
            <SectionLabel
              action={
                <button
                  onClick={() => {
                    feedback("tap");
                    navigate("/scenes");
                  }}
                  data-testid="home-all-scenes"
                  className="text-[12px] cursor-pointer"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Ver todas
                </button>
              }
            >
              Revisiones recientes
            </SectionLabel>

            <Divider />

            {recent.length === 0 ? (
              <button
                onClick={() => {
                  feedback("tap");
                  navigate("/design?step=room");
                }}
                data-testid="home-new-scene"
                className="w-full flex items-center gap-3 py-4 cursor-pointer text-left"
              >
                <span
                  className="h-8 w-8 flex items-center justify-center shrink-0"
                  style={{
                    borderRadius: "var(--radius-chip)",
                    background: "var(--surface-2)",
                    color: "var(--muted-foreground)",
                  }}
                >
                  <Plus size={14} strokeWidth={2} />
                </span>
                <span
                  className="text-[13px]"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Todavía no guardaste ninguna escena
                </span>
              </button>
            ) : (
              recent.map((sc) => (
                <div key={sc.id}>
                  <button
                    onClick={() => {
                      feedback("tap");
                      navigate("/scenes");
                    }}
                    data-testid={`home-scene-${sc.id}`}
                    className="group w-full flex items-center gap-4 py-3.5 cursor-pointer text-left"
                  >
                    <span
                      className="h-8 w-8 flex items-center justify-center shrink-0"
                      style={{
                        borderRadius: "var(--radius-chip)",
                        background: "var(--surface-2)",
                        color: "var(--muted-foreground)",
                      }}
                    >
                      <Check size={13} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate leading-tight">
                        {sc.name}
                      </p>
                      <p
                        className="text-[11px] mt-0.5 truncate"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {new Date(
                          sc.updatedAt ?? Date.now(),
                        ).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                        })}
                        {sc.room?.name ? ` · ${sc.room.name}` : ""}
                      </p>
                    </div>
                    <ArrowRight
                      size={13}
                      strokeWidth={1.75}
                      className="shrink-0 opacity-0 group-hover:opacity-100"
                      style={{
                        color: "var(--muted-foreground)",
                        transition: "opacity var(--dur) var(--ease)",
                      }}
                    />
                  </button>
                  <Divider />
                </div>
              ))
            )}
          </motion.div>
        </div>
      </div>

      <span data-testid="ai-home-question" className="sr-only">
        ¿Qué querés hacer hoy?
      </span>
    </>
  );
}
