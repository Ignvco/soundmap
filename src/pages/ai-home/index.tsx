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
import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Radio, BarChart3, Plus, Check } from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import { feedback } from "@/lib/feedback.ts";
import { CommandPalette } from "@/components/soundmap/command-palette.tsx";
import { Metric, MetricRow, SectionLabel, Divider } from "@/components/soundmap/vitals/metric.tsx";
import { SplHeatmap2D } from "@/components/soundmap/spl-heatmap-2d.tsx";
import { computeSplGrid } from "@/lib/audio/spl-grid.ts";
import {
  paSummary, coverageByZone, roomSummary, sceneToSources,
} from "@/lib/audio/system-vitals.ts";

export default function AIHome() {
  const navigate = useNavigate();
  const { room, acoustics, tops, subs, monitors, scenes, loadDemoVenue } = useAppStore();
  const [paletteOpen, setPaletteOpen] = useState(false);

  const hasSystem = !!room && (tops.length > 0 || subs.length > 0);

  // Misma capa de datos que antes: los motores no cambiaron.
  const { pa, coverage, roomInfo, grid } = useMemo(() => {
    if (!hasSystem || !room || !acoustics) {
      return { pa: null, coverage: null, roomInfo: null, grid: null };
    }
    const sources = sceneToSources(room, tops, subs);
    return {
      pa: paSummary(tops, subs, monitors),
      coverage: coverageByZone(room, tops, subs),
      roomInfo: roomSummary(room, acoustics),
      grid: sources.length > 0 ? computeSplGrid(room, sources, { cols: 30, rows: 20 }) : null,
    };
  }, [hasSystem, room, acoustics, tops, subs, monitors]);

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
      <div className="px-5 md:px-10 pt-10 md:pt-12">
        <div className="max-w-[1180px] mx-auto">

          {/* ── 1. Encabezado editorial ─────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
              {greeting}, LevelPro
            </p>
            <button
              onClick={() => { feedback("tap"); navigate(hasSystem ? "/scenes" : "/design?step=room"); }}
              data-testid="home-venue"
              className="group mt-1.5 flex items-center gap-2.5 cursor-pointer text-left"
            >
              <h1 className="text-[30px] md:text-[42px] font-semibold tracking-[-0.035em] leading-[1.05] text-foreground truncate">
                {hasSystem && roomInfo ? roomInfo.name : "Sin sistema cargado"}
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
                style={{ background: hasSystem ? "var(--accent)" : "var(--muted-foreground)" }}
                aria-hidden="true"
              />
              <p className="text-[12px]" style={{ color: "var(--muted-foreground)" }}>
                {hasSystem
                  ? `Sistema optimizado · ${tops.reduce((n, t) => n + (t.quantity ?? 1), 0)} tops · ${subs.reduce((n, x) => n + (x.quantity ?? 1), 0)} subs`
                  : "Cargá un recinto para ver los vitales del sistema"}
              </p>
            </div>
          </motion.div>

          {/* ── 2. Métricas sin caja ────────────────────────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
            className="mt-9 md:mt-11"
          >
            <MetricRow testId="home-metrics">
              <Metric
                value={pa ? `${Math.round(pa.arraySpl)}` : "—"}
                unit="dB" label="Max SPL" testId="metric-spl"
              />
              <Metric
                value={coverage ? `${Math.round(coverage.uniformityPct)}` : "—"}
                unit="%" label="Cobertura" testId="metric-coverage"
              />
              <Metric
                value={roomInfo ? roomInfo.rt60Audience.toFixed(2) : "—"}
                unit="s" label="RT60 mid" testId="metric-rt60"
              />
              <Metric
                value={pa ? `${pa.headroomDb > 0 ? "+" : ""}${pa.headroomDb}` : "—"}
                unit="dB" label="Headroom"
                tone={!pa ? "default" : pa.headroomDb >= 3 ? "accent" : "warning"}
                testId="metric-headroom"
              />
            </MetricRow>
          </motion.div>

          {/* ── 3. La visualización como protagonista ───────────────────── */}
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.16, ease: [0.22, 1, 0.36, 1] }}
            className="mt-8 md:mt-10"
          >
            {grid ? (
              <button
                onClick={() => { feedback("tap"); navigate("/stage-map"); }}
                data-testid="home-heatmap"
                className="group block w-full cursor-pointer"
                aria-label="Abrir mapa 3D del escenario"
              >
                <div
                  className="relative overflow-hidden"
                  style={{
                    borderRadius: "var(--radius-card)",
                    background: "var(--surface-1)",
                    boxShadow: "var(--elev-1)",
                  }}
                >
                  <SplHeatmap2D grid={grid} className="w-full h-[280px] md:h-[380px]" />
                  <div className="absolute left-4 top-4 flex items-center gap-2">
                    <span
                      className="px-2 py-1 text-[10px] font-medium uppercase tracking-[0.14em]"
                      style={{
                        borderRadius: "var(--radius-chip)",
                        background: "rgba(0,0,0,0.55)",
                        color: "var(--muted-foreground)",
                        backdropFilter: "blur(8px)",
                      }}
                    >
                      SPL · dB
                    </span>
                  </div>
                </div>
              </button>
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
                <p className="text-[14px] text-foreground font-medium">Sin cobertura que mostrar</p>
                <p className="text-[12px] mt-1.5 max-w-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
                  Definí el recinto y elegí las cajas: el mapa de SPL se calcula solo.
                </p>
                <button
                  onClick={() => { feedback("select"); loadDemoVenue(); }}
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
            transition={{ duration: 0.5, delay: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 flex flex-col sm:flex-row gap-2.5"
          >
            <button
              onClick={() => { feedback("select"); navigate("/design"); }}
              data-testid="home-primary-cta"
              className="group flex-1 sm:flex-none sm:min-w-[220px] h-11 px-5 inline-flex items-center justify-center gap-2 text-[13px] font-medium cursor-pointer"
              style={{
                borderRadius: "var(--radius-pill)",
                background: "var(--accent)",
                color: "var(--accent-foreground)",
                transition: "opacity var(--dur-fast) var(--ease)",
              }}
            >
              {hasSystem ? "Continuar diseño" : "Empezar diseño"}
              <ArrowRight size={14} strokeWidth={2.25} className="group-hover:translate-x-0.5" style={{ transition: "transform var(--dur) var(--ease)" }} />
            </button>

            {[
              { label: "Perform", icon: Radio, to: "/perform", testId: "home-goto-perform" },
              { label: "Analizar", icon: BarChart3, to: "/compare", testId: "home-goto-analyze" },
            ].map(({ label, icon: Icon, to, testId }) => (
              <button
                key={to}
                onClick={() => { feedback("tap"); navigate(to); }}
                data-testid={testId}
                className="h-11 px-5 inline-flex items-center justify-center gap-2 text-[13px] font-medium cursor-pointer"
                style={{
                  borderRadius: "var(--radius-pill)",
                  background: "transparent",
                  boxShadow: "0 0 0 1px var(--border)",
                  color: "var(--foreground)",
                  transition: "box-shadow var(--dur-fast) var(--ease)",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px var(--border-strong)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px var(--border)"; }}
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
            className="mt-12 md:mt-14"
          >
            <SectionLabel
              action={
                <button
                  onClick={() => { feedback("tap"); navigate("/scenes"); }}
                  data-testid="home-all-scenes"
                  className="text-[12px] cursor-pointer"
                  style={{ color: "var(--muted-foreground)" }}
                >
                  Ver todas
                </button>
              }
            >
              Escenas recientes
            </SectionLabel>

            <Divider />

            {recent.length === 0 ? (
              <button
                onClick={() => { feedback("tap"); navigate("/design?step=room"); }}
                data-testid="home-new-scene"
                className="w-full flex items-center gap-3 py-4 cursor-pointer text-left"
              >
                <span
                  className="h-8 w-8 flex items-center justify-center shrink-0"
                  style={{ borderRadius: "var(--radius-chip)", background: "var(--surface-2)", color: "var(--muted-foreground)" }}
                >
                  <Plus size={14} strokeWidth={2} />
                </span>
                <span className="text-[13px]" style={{ color: "var(--muted-foreground)" }}>
                  Todavía no guardaste ninguna escena
                </span>
              </button>
            ) : (
              recent.map((sc) => (
                <div key={sc.id}>
                  <button
                    onClick={() => { feedback("tap"); navigate("/scenes"); }}
                    data-testid={`home-scene-${sc.id}`}
                    className="group w-full flex items-center gap-4 py-3.5 cursor-pointer text-left"
                  >
                    <span
                      className="h-8 w-8 flex items-center justify-center shrink-0"
                      style={{ borderRadius: "var(--radius-chip)", background: "var(--surface-2)", color: "var(--muted-foreground)" }}
                    >
                      <Check size={13} strokeWidth={2} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-foreground truncate leading-tight">{sc.name}</p>
                      <p className="text-[11px] mt-0.5 truncate" style={{ color: "var(--muted-foreground)" }}>
                        {new Date(sc.updatedAt ?? Date.now()).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                        {sc.room?.name ? ` · ${sc.room.name}` : ""}
                      </p>
                    </div>
                    <ArrowRight
                      size={13}
                      strokeWidth={1.75}
                      className="shrink-0 opacity-0 group-hover:opacity-100"
                      style={{ color: "var(--muted-foreground)", transition: "opacity var(--dur) var(--ease)" }}
                    />
                  </button>
                  <Divider />
                </div>
              ))
            )}
          </motion.div>
        </div>
      </div>

      <span data-testid="ai-home-question" className="sr-only">¿Qué querés hacer hoy?</span>
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </>
  );
}
