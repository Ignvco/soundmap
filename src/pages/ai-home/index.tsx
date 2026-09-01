// Home — V6.
//
// Composición tomada del mockup: un panel de aplicación de altura completa, no
// un documento que scrollea.
//
//   Header      cabecera contextual (saludo · recinto · estado + acciones)
//   Métricas    banda de 4 lecturas separadas por hairlines verticales
//   Heatmap     ocupa TODO el espacio restante — es el protagonista
//   CTAs        flotan sobre el heatmap, abajo a la izquierda
//   Escenas     banda fija de 148 px al pie
//
// ── Escritorio vs móvil ─────────────────────────────────────────────────────
// En escritorio las cinco zonas son paneles de altura fija: nada scrollea, todo
// está a la vista. En 390 px eso es imposible —cinco zonas no entran—, así que
// móvil apila y scrollea. Mismo lenguaje visual, distinta composición.
//
// ── Datos ───────────────────────────────────────────────────────────────────
// La capa de datos NO cambió respecto de la versión anterior: mismos motores
// (`paSummary`, `coverageByZone`, `roomSummary`, `computeSplGrid`,
// `sceneToSources`), mismo store. El mockup dibuja su heatmap con gradientes
// fijos; acá se alimenta del grid real.
import { useMemo } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ChevronDown, Play, Activity, Plus, Map, Sparkles } from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import { feedback } from "@/lib/feedback.ts";
import { SplHeatmap2D } from "@/components/soundmap/spl-heatmap-2d.tsx";
import { computeSplGrid } from "@/lib/audio/spl-grid.ts";
import {
  paSummary, coverageByZone, roomSummary, sceneToSources,
} from "@/lib/audio/system-vitals.ts";

/** Lectura de instrumento: valor mono grande, unidad, label en mayúsculas. */
function Reading({
  value, unit, label, tone = "default", testId,
}: {
  value: string;
  unit?: string;
  label: string;
  tone?: "default" | "accent" | "warning";
  testId?: string;
}) {
  // Un "—" es ausencia de dato, no una lectura: va en el color apagado para
  // que no compita visualmente con las métricas que sí tienen valor.
  const isEmpty = value === "—";
  const color = isEmpty
    ? "var(--muted-foreground)"
    : tone === "accent" ? "var(--accent)"
    : tone === "warning" ? "var(--warning)"
    : "var(--foreground)";
  return (
    <div className="min-w-0" data-testid={testId}>
      <div className="flex items-baseline gap-1">
        <span
          className="t-mono font-semibold leading-none truncate"
          style={{ fontSize: 26, color }}
        >
          {value}
        </span>
        {unit && (
          <span className="t-mono" style={{ fontSize: 13, color: "var(--secondary-foreground)" }}>
            {unit}
          </span>
        )}
      </div>
      <div
        className="mt-[3px] uppercase truncate"
        style={{ fontSize: 10, letterSpacing: "0.1em", color: "var(--muted-foreground)" }}
      >
        {label}
      </div>
    </div>
  );
}

/** Botón de la cabecera: superficie elevada, borde sutil, radio de control. */
function HeaderAction({
  icon, label, onClick, accentIcon, testId,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  accentIcon?: boolean;
  testId?: string;
}) {
  return (
    <button
      onClick={onClick}
      data-testid={testId}
      className="hidden sm:inline-flex items-center gap-1.5 px-3.5 h-8 text-[12px] cursor-pointer shrink-0"
      style={{
        borderRadius: "var(--radius-control)",
        background: "var(--surface-2)",
        boxShadow: "0 0 0 1px var(--border)",
        color: "var(--secondary-foreground)",
        transition: "color var(--dur-fast) var(--ease)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.color = "var(--foreground)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.color = "var(--secondary-foreground)"; }}
    >
      <span style={accentIcon ? { color: "var(--accent)" } : undefined}>{icon}</span>
      {label}
    </button>
  );
}

export default function AIHome() {
  const navigate = useNavigate();
  const { room, acoustics, tops, subs, monitors, scenes, loadDemoVenue } = useAppStore();

  const hasSystem = !!room && (tops.length > 0 || subs.length > 0);

  // `paSummary` deriva Max SPL y Headroom de los TOPS. Sin tops devuelve
  // arraySpl = 0 y headroom = 0 − 105 = −105 dB, que no son mediciones: son el
  // resultado aritmético de no tener datos. Presentarlos como métricas sería
  // exactamente el patrón de "dato falso" que venimos corrigiendo.
  //
  // El motor NO se toca —esos valores son correctos para su contrato—: es la
  // vista la que decide cuándo hay información suficiente para mostrarlos.
  const hasTops = tops.length > 0;

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
    <div className="md:h-full md:flex md:flex-col md:overflow-hidden" data-testid="home-v6">

      {/* ── Cabecera contextual ─────────────────────────────────────────── */}
      <header
        className="flex items-start sm:items-center justify-between gap-4 px-5 md:px-7 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
      >
        <div className="min-w-0">
          <p className="text-[11px] mb-1" style={{ color: "var(--muted-foreground)" }}>
            {greeting}, LevelPro
          </p>
          <button
            onClick={() => { feedback("tap"); navigate(hasSystem ? "/scenes" : "/design?step=room"); }}
            data-testid="home-venue"
            className="flex items-center gap-2 cursor-pointer text-left"
          >
            <h1 className="text-[19px] md:text-[22px] font-semibold tracking-[-0.02em] text-foreground truncate">
              {hasSystem && roomInfo ? roomInfo.name : "Sin sistema cargado"}
            </h1>
            <ChevronDown size={14} strokeWidth={1.5} className="shrink-0" style={{ color: "var(--muted-foreground)" }} />
          </button>
          <div className="flex items-center gap-1.5 mt-1">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: hasSystem && hasTops ? "var(--accent)" : "var(--muted-foreground)" }}
              aria-hidden="true"
            />
            <span className="text-[11px] font-medium" style={{ color: hasSystem && hasTops ? "var(--accent)" : "var(--muted-foreground)" }}>
              {!hasSystem ? "Sin sistema" : hasTops ? "Sistema optimizado" : "Recinto cargado · falta PA"}
            </span>
            {hasSystem && roomInfo && (
              <span className="text-[11px] truncate" style={{ color: "var(--muted-foreground)" }}>
                · {roomInfo.dims}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <HeaderAction
            icon={<Map size={13} strokeWidth={1.5} />}
            label="3D Map"
            onClick={() => { feedback("tap"); navigate("/stage-map"); }}
            testId="home-open-3d"
          />
          <HeaderAction
            icon={<Sparkles size={13} strokeWidth={1.5} />}
            label="AI Advisor"
            accentIcon
            onClick={() => { feedback("tap"); window.dispatchEvent(new Event("soundmap:openadvisor")); }}
            testId="home-open-advisor"
          />
        </div>
      </header>

      {/* ── Banda de métricas ───────────────────────────────────────────── */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 shrink-0"
        style={{ borderBottom: "1px solid var(--border)" }}
        data-testid="home-metrics"
      >
        {[
          {
            value: pa && hasTops ? `${Math.round(pa.arraySpl)}` : "—",
            unit: pa && hasTops ? "dB" : undefined,
            label: hasSystem && !hasTops ? "Max SPL · sin tops" : "Max SPL",
            testId: "metric-spl",
          },
          {
            // coverageByZone devuelve null si no hay fuentes: ya es honesto.
            value: coverage ? `${Math.round(coverage.uniformityPct)}` : "—",
            unit: coverage ? "%" : undefined,
            label: "Cobertura",
            testId: "metric-coverage",
          },
          {
            // El RT60 sólo depende del recinto: es válido aunque no haya PA.
            value: roomInfo ? roomInfo.rt60Audience.toFixed(2) : "—",
            unit: roomInfo ? "s" : undefined,
            label: "RT60 mid",
            testId: "metric-rt60",
          },
          {
            value: pa && hasTops ? `${pa.headroomDb > 0 ? "+" : ""}${pa.headroomDb}` : "—",
            unit: pa && hasTops ? "dB" : undefined,
            label: hasSystem && !hasTops ? "Headroom · sin tops" : "Headroom",
            testId: "metric-headroom",
            tone: (!pa || !hasTops ? "default" : pa.headroomDb >= 3 ? "accent" : "warning") as "default" | "accent" | "warning",
          },
        ].map((m, i) => (
          <div
            key={m.label}
            className="px-5 md:px-7 py-3.5"
            style={{
              // Hairlines verticales entre lecturas. En móvil la grilla es 2×2,
              // así que el corte va en las columnas impares.
              borderRight: i % 2 === 0 || i < 3 ? "1px solid var(--border)" : "none",
              borderTop: i >= 2 ? "1px solid var(--border)" : "none",
            }}
          >
            <Reading {...m} />
          </div>
        ))}
      </div>

      {/* ── Heatmap protagonista + CTAs flotantes ───────────────────────── */}
      <div className="relative md:flex-1 md:min-h-0" data-testid="home-hero">
        {grid ? (
          <button
            onClick={() => { feedback("tap"); navigate("/pa"); }}
            data-testid="home-heatmap"
            aria-label="Abrir análisis de SPL"
            className="block w-full h-[280px] md:h-full cursor-pointer"
          >
            <SplHeatmap2D grid={grid} className="w-full h-full" />
          </button>
        ) : (
          <div
            className="flex flex-col items-center justify-center h-[280px] md:h-full px-6 text-center"
            data-testid="home-heatmap-empty"
          >
            <p className="text-[14px] text-foreground font-medium">Sin cobertura que mostrar</p>
            <p className="text-[12px] mt-1.5 max-w-xs leading-relaxed" style={{ color: "var(--muted-foreground)" }}>
              Definí el recinto y elegí las cajas: el mapa de SPL se calcula solo.
            </p>
            <button
              onClick={() => { feedback("select"); loadDemoVenue(); }}
              data-testid="home-load-demo"
              className="mt-5 h-8 px-4 text-[12px] font-medium cursor-pointer"
              style={{
                borderRadius: "var(--radius-control)",
                background: "var(--surface-2)",
                boxShadow: "0 0 0 1px var(--border)",
                color: "var(--foreground)",
              }}
            >
              Cargar recinto de demo
            </button>
          </div>
        )}

        {/* CTAs: en escritorio flotan sobre el heatmap; en móvil van debajo. */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          className="flex flex-wrap gap-2.5 px-5 md:px-7 py-4 md:py-0 md:absolute md:bottom-5 md:left-0 md:z-10"
        >
          <button
            onClick={() => { feedback("select"); navigate("/design"); }}
            data-testid="home-primary-cta"
            className="group inline-flex items-center gap-2 px-5 h-10 text-[13px] font-semibold cursor-pointer"
            style={{
              borderRadius: "var(--radius-control)",
              background: "var(--accent)",
              color: "var(--accent-foreground)",
            }}
          >
            {hasSystem ? "Continuar diseño" : "Empezar diseño"}
            <ArrowRight size={14} strokeWidth={1.75} className="group-hover:translate-x-0.5" style={{ transition: "transform var(--dur) var(--ease)" }} />
          </button>

          {[
            { label: "Perform", icon: Play, to: "/perform", testId: "home-goto-perform" },
            { label: "Analizar", icon: Activity, to: "/pa", testId: "home-goto-analyze" },
          ].map(({ label, icon: Icon, to, testId }) => (
            <button
              key={to}
              onClick={() => { feedback("tap"); navigate(to); }}
              data-testid={testId}
              className="inline-flex items-center gap-2 px-5 h-10 text-[13px] cursor-pointer"
              style={{
                borderRadius: "var(--radius-control)",
                background: "var(--surface-2)",
                boxShadow: "0 0 0 1px var(--border)",
                color: "var(--foreground)",
              }}
            >
              <Icon size={14} strokeWidth={1.5} />
              {label}
            </button>
          ))}
        </motion.div>
      </div>

      {/* ── Escenas recientes ───────────────────────────────────────────── */}
      <div
        className="shrink-0 px-5 md:px-7 py-3.5"
        style={{ borderTop: "1px solid var(--border)", background: "var(--background)" }}
        data-testid="home-recent"
      >
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-[12px] font-medium" style={{ color: "var(--secondary-foreground)" }}>
            Escenas recientes
          </span>
          <button
            onClick={() => { feedback("tap"); navigate("/scenes"); }}
            data-testid="home-all-scenes"
            className="text-[11px] cursor-pointer"
            style={{ color: "var(--muted-foreground)" }}
          >
            Ver todas
          </button>
        </div>

        <div className="flex gap-2.5 overflow-x-auto no-scrollbar">
          {recent.map((sc) => (
            <button
              key={sc.id}
              onClick={() => { feedback("tap"); navigate("/scenes"); }}
              data-testid={`home-scene-${sc.id}`}
              className="flex-1 min-w-[150px] px-3.5 py-2.5 text-left cursor-pointer"
              style={{
                borderRadius: "var(--radius-control)",
                background: "var(--surface-1)",
                boxShadow: "0 0 0 1px var(--border)",
              }}
            >
              <p className="text-[13px] font-medium text-foreground truncate leading-tight">{sc.name}</p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                {sc.room?.name ?? "—"}
              </p>
              <div className="flex items-center justify-between mt-1.5">
                <span className="text-[10px]" style={{ color: "var(--muted-foreground)" }}>
                  {new Date(sc.updatedAt ?? Date.now()).toLocaleDateString("es-AR", { day: "numeric", month: "short" })}
                </span>
                <span className="t-mono text-[12px] font-semibold" style={{ color: "var(--accent)" }}>
                  {sc.acoustics?.rt60Audience != null ? `${sc.acoustics.rt60Audience}s` : ""}
                </span>
              </div>
            </button>
          ))}

          <button
            onClick={() => { feedback("tap"); navigate("/design?step=room"); }}
            data-testid="home-new-scene"
            className="shrink-0 w-[130px] flex items-center justify-center gap-1.5 text-[12px] cursor-pointer py-2.5"
            style={{
              borderRadius: "var(--radius-control)",
              border: "1px dashed var(--border-strong)",
              color: "var(--muted-foreground)",
            }}
          >
            <Plus size={13} strokeWidth={1.5} />
            Nueva escena
          </button>
        </div>
      </div>

      <span data-testid="ai-home-question" className="sr-only">¿Qué querés hacer hoy?</span>
    </div>
  );
}
