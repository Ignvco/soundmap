// Compare Hub v5 — Premium A/B diff for pro audio designers.
// Redesigned with the Apple/Linear/Arc aesthetic: typography-first hierarchy,
// no permanent chrome, heatmaps as the hero, progressive disclosure for
// numeric diffs. Two SPL grids sit side-by-side, the delta pane sits below
// as a diverging surface. All numeric detail lives behind a single toggle.
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useNavigate } from "react-router-dom";
import { ArrowLeftRight, ArrowRight, Check, ChevronDown, Layers, TrendingUp, TrendingDown, Minus, Sparkles } from "lucide-react";
import { useAppStore, type Scene } from "@/store/app.ts";
import { computeSplGrid, type SplGrid } from "@/lib/audio/spl-grid.ts";
import { sceneToSources } from "@/lib/audio/system-vitals.ts";
import { SplHeatmap2D } from "@/components/soundmap/spl-heatmap-2d.tsx";
import { feedback } from "@/lib/feedback.ts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

// Two quiet, cohesive hues that read as A/B without shouting.
const A_HUE = "var(--sm-accent)"; // lime (Vitals accent)
const B_HUE = "var(--sm-amber)"; // amber (Vitals secondary)

// ── Helpers ─────────────────────────────────────────────────────────────────
function gearCount(scene: Scene, key: "tops" | "subs" | "monitors" | "amps" | "mics"): number {
  return scene[key].reduce((s, g) => s + (g.quantity ?? 1), 0);
}
function totalGearCount(scene: Scene): number {
  return gearCount(scene, "tops") + gearCount(scene, "subs") + gearCount(scene, "monitors") + gearCount(scene, "amps");
}

// NOTA: acá vivía una copia de `sceneToSources` con `20·log10` (la ganancia
// coherente vieja). Comparar dos escenas usaba un modelo acústico distinto al
// de la home, el Perform Hub y el optimizador, así que los deltas entre
// escenas — que es TODO lo que hace esta pantalla — salían de una física que
// ninguna otra vista compartía. Ahora usa la del motor.

/** Build a delta grid = A - B (must share dimensions cell-by-cell). */
function deltaGrid(a: SplGrid, b: SplGrid): SplGrid | null {
  if (a.rows !== b.rows || a.cols !== b.cols) return null;
  const cells: number[] = [];
  let min = Infinity;
  let max = -Infinity;
  let sum = 0;
  for (let i = 0; i < a.cells.length; i++) {
    const d = a.cells[i] - b.cells[i];
    cells.push(d);
    if (d < min) min = d;
    if (d > max) max = d;
    sum += d;
  }
  const mean = sum / cells.length;
  return {
    ...a,
    cells,
    min: Math.round(min * 10) / 10,
    max: Math.round(max * 10) / 10,
    mean: Math.round(mean * 10) / 10,
    spread: Math.round((max - min) * 10) / 10,
    uniformityPct: 0,
  };
}

export default function SceneCompare() {
  const { scenes, loadScene } = useAppStore();
  const navigate = useNavigate();
  const [aId, setAId] = useState<string | null>(scenes[0]?.id ?? null);
  const [bId, setBId] = useState<string | null>(scenes[1]?.id ?? null);
  const [showDetails, setShowDetails] = useState(false);

  const a = useMemo(() => scenes.find(s => (s.clientId ?? s.id) === aId), [scenes, aId]);
  const b = useMemo(() => scenes.find(s => (s.clientId ?? s.id) === bId), [scenes, bId]);

  const gridA = useMemo(() => {
    if (!a) return null;
    const sources = sceneToSources(a.room, a.tops, a.subs);
    if (sources.length === 0) return null;
    return computeSplGrid(a.room, sources, { cols: 16, rows: 22 });
  }, [a]);
  const gridB = useMemo(() => {
    if (!b) return null;
    const sources = sceneToSources(b.room, b.tops, b.subs);
    if (sources.length === 0) return null;
    return computeSplGrid(b.room, sources, { cols: 16, rows: 22 });
  }, [b]);

  const canShowDelta = useMemo(
    () => gridA !== null && gridB !== null && a !== undefined && b !== undefined &&
          Math.abs(a.room.length - b.room.length) < 5 &&
          Math.abs(a.room.width - b.room.width) < 5,
    [gridA, gridB, a, b]
  );

  const gridDelta = useMemo(
    () => (canShowDelta && gridA && gridB ? deltaGrid(gridA, gridB) : null),
    [canShowDelta, gridA, gridB]
  );

  const handleLoad = (scene: Scene) => {
    loadScene(scene.clientId ?? scene.id);
    toast.success(`Cargado: ${scene.name}`);
    feedback("success");
    navigate("/");
  };

  const swap = () => {
    feedback("select");
    setAId(bId);
    setBId(aId);
  };

  // ── Empty state ──────────────────────────────────────────────────────────
  if (scenes.length < 2) {
    return (
      <div className="min-h-screen bg-background text-foreground px-6 md:px-12 pt-10 md:pt-16 pb-24">
        <div className="max-w-4xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
              Compare A / B
            </p>
            <h1
              className="text-[2rem] md:text-[2.8rem] leading-[1.05] tracking-[-0.03em] font-medium mb-3"
              data-testid="compare-hub-title"
            >
              Necesitás dos escenas
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-lg leading-relaxed mb-10">
              Guardá al menos dos configuraciones para verlas lado a lado.
              El diff físico compara la cobertura SPL celda a celda.
            </p>
            <button
              onClick={() => { feedback("tap"); navigate("/scenes"); }}
              data-testid="compare-empty-cta"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#09090b] hover:bg-white/90 px-5 py-2.5 text-[13px] font-medium cursor-pointer"
              style={{ transition: "background-color 0.3s ease" }}
            >
              <Layers size={13} strokeWidth={2} />
              Ir a Escenas
              <ArrowRight size={13} strokeWidth={2} />
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground px-6 md:px-12 pt-10 md:pt-16 pb-24">
      <div className="max-w-5xl mx-auto">
        {/* Whisper header + title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
            Compare A / B
          </p>
          <h1
            className="text-[2rem] md:text-[2.8rem] leading-[1.05] tracking-[-0.03em] font-medium mb-3"
            data-testid="compare-hub-title"
          >
            Diff físico entre escenas
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-xl leading-relaxed mb-10 md:mb-14">
            Elegí dos configuraciones. La comparación calcula el mapa SPL de cada una
            y su delta cell-by-cell — así se ve el impacto real de cambiar tops, subs o recinto.
          </p>
        </motion.div>

        {/* Scene pickers row — quiet chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="grid grid-cols-[1fr_auto_1fr] gap-3 md:gap-4 items-stretch mb-10 md:mb-14"
        >
          <ScenePicker label="A" selectedId={aId} onSelect={setAId} scenes={scenes} hue={A_HUE} testId="picker-a" />
          <button
            onClick={swap}
            data-testid="compare-swap-btn"
            disabled={!a || !b}
            className="self-center h-10 w-10 rounded-full flex items-center justify-center shrink-0 cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            style={{
              background: "rgba(255,255,255,0.03)",
              boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
              transition: "background-color 0.3s ease, transform 0.2s ease",
            }}
            aria-label="Intercambiar A y B"
          >
            <ArrowLeftRight size={14} strokeWidth={1.75} className="text-muted-foreground" />
          </button>
          <ScenePicker label="B" selectedId={bId} onSelect={setBId} scenes={scenes} hue={B_HUE} testId="picker-b" />
        </motion.div>

        {a && b && (
          <>
            {/* Hero — Heatmaps side by side */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
              className="mb-10 md:mb-14"
              data-testid="compare-spl-grids"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <HeatmapHero grid={gridA} scene={a} label="A" hue={A_HUE} testId="compare-grid-a" />
                <HeatmapHero grid={gridB} scene={b} label="B" hue={B_HUE} testId="compare-grid-b" />
              </div>
            </motion.div>

            {/* Delta band — the "meaning" of the diff */}
            {gridDelta && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="mb-10 md:mb-14"
                data-testid="compare-grid-delta"
              >
                <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
                  Delta · A menos B
                </p>
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{
                    background: "var(--surface-1)",
                    boxShadow: "var(--elev-2)",
                  }}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr]">
                    {/* Delta heatmap */}
                    <div className="p-4 md:p-6">
                      <SplHeatmap2D
                        grid={gridDelta}
                        mode="delta"
                        className="w-full aspect-[16/9] md:aspect-[2/1] overflow-hidden r-card"
                        data-testid="compare-delta-heatmap"
                      />
                      <div className="flex items-center justify-between mt-4 text-[11px] font-medium">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--sm-amber)" }} />
                          B más fuerte
                        </span>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          A más fuerte
                          <span className="h-2 w-2 rounded-full" style={{ background: "var(--sm-accent)" }} />
                        </span>
                      </div>
                    </div>
                    {/* Delta stats — big numbers */}
                    <div className="p-6 md:p-8 md:border-l border-white/[0.04] flex flex-col justify-center gap-6">
                      <DeltaStat
                        label="Máxima diferencia"
                        value={`${gridDelta.max >= 0 ? "+" : ""}${gridDelta.max}`}
                        unit="dB"
                        hint="A vs B"
                        hue="var(--sm-accent)"
                      />
                      <DeltaStat
                        label="Mínima diferencia"
                        value={`${gridDelta.min}`}
                        unit="dB"
                        hint="B más fuerte"
                        hue="var(--sm-amber)"
                      />
                      <DeltaStat
                        label="Media"
                        value={`${gridDelta.mean >= 0 ? "+" : ""}${gridDelta.mean}`}
                        unit="dB"
                        hint={`Spread ${gridDelta.spread} dB`}
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
            {!gridDelta && canShowDelta === false && (
              <p
                className="text-[13px] text-muted-foreground mb-10 max-w-lg leading-relaxed"
                data-testid="compare-delta-nope"
              >
                Los recintos tienen dimensiones muy distintas — el delta cell-by-cell
                no se puede alinear. Compará los mapas SPL individuales arriba.
              </p>
            )}

            {/* Key metrics — big typography */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="mb-10 md:mb-14"
              data-testid="compare-key-metrics"
            >
              <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-6">
                Métricas clave
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                <MetricPair label="Uniformidad SPL" a={gridA?.uniformityPct ?? null} b={gridB?.uniformityPct ?? null} unit="%" higherIsBetter />
                <MetricPair label="Spread SPL" a={gridA?.spread ?? null} b={gridB?.spread ?? null} unit="dB" higherIsBetter={false} />
                <MetricPair label="Speech score" a={a.acoustics.speechScore} b={b.acoustics.speechScore} unit="/100" higherIsBetter />
                <MetricPair label="Music score" a={a.acoustics.musicScore} b={b.acoustics.musicScore} unit="/100" higherIsBetter />
              </div>
            </motion.div>

            {/* Progressive disclosure — details */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="mb-10 md:mb-14"
            >
              <button
                onClick={() => { feedback("tap"); setShowDetails(v => !v); }}
                data-testid="compare-toggle-details"
                className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
                style={{ transition: "color 0.3s ease" }}
              >
                <ChevronDown
                  size={14}
                  strokeWidth={1.75}
                  style={{
                    transform: showDetails ? "rotate(0)" : "rotate(-90deg)",
                    transition: "transform 0.35s cubic-bezier(0.22,1,0.36,1)",
                  }}
                />
                {showDetails ? "Ocultar detalles" : "Ver detalles"}
              </button>

              <AnimatePresence initial={false}>
                {showDetails && (
                  <motion.div
                    key="details"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                    className="overflow-hidden"
                    data-testid="compare-details-panel"
                  >
                    <div className="pt-8 space-y-10">
                      <RoomDiff a={a} b={b} />
                      <AcousticsDiff a={a} b={b} />
                      <GearDiff a={a} b={b} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Terminal actions — load one */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.55, ease: [0.22, 1, 0.36, 1] }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <button
                onClick={() => handleLoad(a)}
                data-testid="compare-load-a"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium cursor-pointer"
                style={{
                  background: A_HUE,
                  color: "var(--background)",
                  transition: "background-color 0.3s ease, transform 0.2s ease",
                }}
              >
                <Sparkles size={13} strokeWidth={2} />
                Cargar A · {a.name}
              </button>
              <button
                onClick={() => handleLoad(b)}
                data-testid="compare-load-b"
                className="inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-[14px] font-medium cursor-pointer"
                style={{
                  background: B_HUE,
                  color: "var(--background)",
                  transition: "background-color 0.3s ease, transform 0.2s ease",
                }}
              >
                <Sparkles size={13} strokeWidth={2} />
                Cargar B · {b.name}
              </button>
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Scene picker — quiet card style ─────────────────────────────────────────
function ScenePicker({ label, selectedId, onSelect, scenes, hue, testId }: {
  label: string;
  selectedId: string | null;
  onSelect: (id: string) => void;
  scenes: Scene[];
  hue: string;
  testId?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = scenes.find(s => (s.clientId ?? s.id) === selectedId);

  return (
    <div className="relative min-w-0" data-testid={testId}>
      <button
        onClick={() => { feedback("tap"); setOpen(o => !o); }}
        className="w-full rounded-2xl px-4 md:px-5 py-3.5 md:py-4 text-left flex items-center gap-3 cursor-pointer group"
        style={{
          background: "rgba(255,255,255,0.02)",
          boxShadow: `0 0 0 1px ${open ? `${hue}55` : "rgba(255,255,255,0.05)"}`,
          transition: "box-shadow 0.3s ease, background-color 0.3s ease",
        }}
      >
        <div
          className="h-8 w-8 rounded-full flex items-center justify-center text-[13px] font-medium shrink-0"
          style={{ background: `${hue}22`, color: hue, boxShadow: `0 0 0 1px ${hue}44` }}
        >
          {label}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[14px] font-medium text-foreground truncate leading-tight">
            {selected?.name ?? "Seleccionar escena…"}
          </p>
          <p className="text-[11px] text-muted-foreground truncate mt-0.5">
            {selected?.room.name ?? "—"}
          </p>
        </div>
        <ChevronDown
          size={13}
          strokeWidth={1.75}
          className="text-muted-foreground shrink-0"
          style={{
            transform: open ? "rotate(180deg)" : "rotate(0)",
            transition: "transform 0.3s cubic-bezier(0.22,1,0.36,1)",
          }}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full mt-2 left-0 right-0 z-40 rounded-2xl max-h-72 overflow-y-auto p-1.5"
            style={{
              background: "#121214",
              boxShadow: "0 20px 60px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)",
            }}
          >
            {scenes.map(s => {
              const sid = s.clientId ?? s.id;
              const isSelected = sid === selectedId;
              return (
                <button
                  key={sid}
                  onClick={() => { onSelect(sid); setOpen(false); feedback("select"); }}
                  data-testid={`picker-option-${sid}`}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl px-3 py-2.5 text-left cursor-pointer",
                    isSelected ? "bg-white/[0.04]" : "hover:bg-white/[0.03]"
                  )}
                  style={{ transition: "background-color 0.2s ease" }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-foreground truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate mt-0.5">{s.room.name}</p>
                  </div>
                  {isSelected && <Check size={13} strokeWidth={2} style={{ color: hue }} />}
                </button>
              );
            })}
          </motion.div>
        </>
      )}
    </div>
  );
}

// ── Heatmap hero card ───────────────────────────────────────────────────────
function HeatmapHero({ grid, scene, label, hue, testId }: {
  grid: SplGrid | null;
  scene: Scene;
  label: string;
  hue: string;
  testId?: string;
}) {
  return (
    <div
      className="rounded-2xl overflow-hidden p-5 md:p-6"
      style={{
        background: "var(--surface-1)",
        boxShadow: `0 12px 40px -10px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)`,
      }}
      data-testid={testId}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="h-7 w-7 rounded-full flex items-center justify-center text-[12px] font-medium shrink-0"
            style={{ background: `${hue}22`, color: hue, boxShadow: `0 0 0 1px ${hue}44` }}
          >
            {label}
          </div>
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-foreground truncate leading-tight">{scene.name}</p>
            <p className="text-[11px] text-muted-foreground truncate mt-0.5">{scene.room.name}</p>
          </div>
        </div>
      </div>

      {grid ? (
        <>
          <SplHeatmap2D grid={grid} className="w-full aspect-[3/4] overflow-hidden r-card" />
          <div className="grid grid-cols-3 gap-4 mt-4">
            <MicroStat label="Uniformidad" value={`${grid.uniformityPct}%`} />
            <MicroStat label="Media" value={`${grid.mean} dB`} />
            <MicroStat label="Máx" value={`${grid.max} dB`} />
          </div>
        </>
      ) : (
        <div className="w-full aspect-[3/4] rounded-2xl flex items-center justify-center bg-white/[0.02]">
          <p className="text-[11px] uppercase tracking-[0.24em] text-muted-foreground font-medium">
            Sin equipo cargado
          </p>
        </div>
      )}
    </div>
  );
}

function MicroStat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-medium mb-1">
        {label}
      </p>
      <p className="font-mono text-[13px] tabular-nums text-foreground" style={{ letterSpacing: "-0.01em" }}>
        {value}
      </p>
    </div>
  );
}

// ── Delta stat block — big number ───────────────────────────────────────────
function DeltaStat({ label, value, unit, hint, hue }: {
  label: string; value: string; unit: string; hint: string; hue?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-2">
        {label}
      </p>
      <p
        className="font-mono tabular-nums leading-none"
        style={{ fontSize: "clamp(1.75rem, 3.5vw, 2.4rem)", letterSpacing: "-0.03em", color: hue ?? "var(--foreground)" }}
      >
        {value}
        <span className="text-[13px] text-muted-foreground ml-1.5 font-sans">{unit}</span>
      </p>
      <p className="text-[11px] text-muted-foreground mt-1.5">{hint}</p>
    </div>
  );
}

// ── Metric pair — big diverging numbers ─────────────────────────────────────
function MetricPair({ label, a, b, unit, higherIsBetter }: {
  label: string; a: number | null; b: number | null; unit: string; higherIsBetter: boolean;
}) {
  if (a === null || b === null) {
    return (
      <div>
        <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-2">{label}</p>
        <p className="text-[13px] text-muted-foreground">—</p>
      </div>
    );
  }
  const better = a === b ? null : higherIsBetter ? (a > b ? "a" : "b") : (a < b ? "a" : "b");
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-3">{label}</p>
      <div className="flex items-baseline gap-2">
        <span
          className="font-mono tabular-nums leading-none"
          style={{
            fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
            letterSpacing: "-0.02em",
            color: better === "a" ? A_HUE : "var(--foreground)",
          }}
        >
          {a}
        </span>
        <span className="text-[11px] text-muted-foreground">vs</span>
        <span
          className="font-mono tabular-nums leading-none"
          style={{
            fontSize: "clamp(1.25rem, 2vw, 1.6rem)",
            letterSpacing: "-0.02em",
            color: better === "b" ? B_HUE : "var(--foreground)",
          }}
        >
          {b}
        </span>
      </div>
      <p className="text-[11px] text-muted-foreground mt-1.5">
        {unit}{better ? ` · ${better === "a" ? "A" : "B"} gana` : " · iguales"}
      </p>
    </div>
  );
}

// ── Detail sections ─────────────────────────────────────────────────────────
function RoomDiff({ a, b }: { a: Scene; b: Scene }) {
  const rows = [
    { label: "Capacidad", a: a.room.capacity, b: b.room.capacity, unit: "pax" },
    { label: "Largo", a: a.room.length, b: b.room.length, unit: "m" },
    { label: "Ancho", a: a.room.width, b: b.room.width, unit: "m" },
    { label: "Alto", a: a.room.height, b: b.room.height, unit: "m" },
  ];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
        Recinto
      </p>
      <div className="grid grid-cols-1 gap-2">
        {rows.map(r => <DiffRow key={r.label} {...r} />)}
      </div>
    </div>
  );
}

function AcousticsDiff({ a, b }: { a: Scene; b: Scene }) {
  const rows = [
    { label: "Volumen", a: a.acoustics.volume, b: b.acoustics.volume, unit: "m³", higherIsBetter: false as const },
    { label: "RT60 con público", a: a.acoustics.rt60Audience, b: b.acoustics.rt60Audience, unit: "s", higherIsBetter: false as const },
    { label: "Distancia crítica", a: a.acoustics.criticalDistance, b: b.acoustics.criticalDistance, unit: "m", higherIsBetter: true as const },
    { label: "Speech score", a: a.acoustics.speechScore, b: b.acoustics.speechScore, unit: "/100", higherIsBetter: true as const },
    { label: "Music score", a: a.acoustics.musicScore, b: b.acoustics.musicScore, unit: "/100", higherIsBetter: true as const },
  ];
  return (
    <div>
      <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
        Acústica
      </p>
      <div className="grid grid-cols-1 gap-2">
        {rows.map(r => <DiffRow key={r.label} {...r} />)}
      </div>
    </div>
  );
}

function DiffRow({ label, a, b, unit, higherIsBetter }: {
  label: string; a: number; b: number; unit: string; higherIsBetter?: boolean;
}) {
  const delta = b - a;
  const same = Math.abs(delta) < 0.01;
  const better = higherIsBetter === undefined
    ? null
    : higherIsBetter ? (delta > 0 ? "b" : "a") : (delta < 0 ? "b" : "a");

  return (
    <div
      className="grid grid-cols-[1fr_auto_auto_auto] gap-4 md:gap-6 items-center py-3"
      style={{ borderBottom: "1px solid rgba(255,255,255,0.04)" }}
      data-testid={`diff-row-${label.toLowerCase().replace(/\s+/g, "-")}`}
    >
      <p className="text-[13px] text-muted-foreground">{label}</p>
      <span
        className="font-mono text-[14px] tabular-nums text-right w-16"
        style={{ letterSpacing: "-0.01em", color: better === "a" ? A_HUE : "var(--foreground)" }}
      >
        {a}<span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
      </span>
      <span className="w-6 flex justify-center">
        {same
          ? <Minus size={12} className="text-muted-foreground/60" />
          : delta > 0
            ? <TrendingUp size={13} className={cn(better === "b" ? "text-[#C9F03E]" : "text-[#F5B62E]")} />
            : <TrendingDown size={13} className={cn(better === "b" ? "text-[#C9F03E]" : "text-[#F5B62E]")} />}
      </span>
      <span
        className="font-mono text-[14px] tabular-nums text-right w-16"
        style={{ letterSpacing: "-0.01em", color: better === "b" ? B_HUE : "var(--foreground)" }}
      >
        {b}<span className="text-[10px] text-muted-foreground ml-1">{unit}</span>
      </span>
    </div>
  );
}

function GearDiff({ a, b }: { a: Scene; b: Scene }) {
  const cats: { key: "tops" | "subs" | "monitors" | "amps" | "mics"; label: string }[] = [
    { key: "tops", label: "Tops" },
    { key: "subs", label: "Subs" },
    { key: "monitors", label: "Monitors" },
    { key: "amps", label: "Amps" },
    { key: "mics", label: "Mics" },
  ];
  const totalA = totalGearCount(a);
  const totalB = totalGearCount(b);
  const totalDelta = totalB - totalA;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-4">
        <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground">
          Equipamiento
        </p>
        <p className="text-[11px] text-muted-foreground font-mono tabular-nums">
          <span style={{ color: A_HUE }}>{totalA}</span>
          <span className="mx-1.5">→</span>
          <span style={{ color: B_HUE }}>{totalB}</span>
          <span className="ml-1.5">
            ({totalDelta > 0 ? "+" : ""}{totalDelta})
          </span>
        </p>
      </div>
      <div className="grid grid-cols-1 gap-3">
        {cats.map(cat => {
          const ca = gearCount(a, cat.key);
          const cb = gearCount(b, cat.key);
          if (ca === 0 && cb === 0) return null;
          const max = Math.max(ca, cb, 1);
          return (
            <div
              key={cat.key}
              className="grid grid-cols-[80px_1fr_40px_40px_1fr] items-center gap-3"
              data-testid={`gear-diff-${cat.key}`}
            >
              <span className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground font-medium">
                {cat.label}
              </span>
              <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(ca / max) * 100}%`, background: A_HUE, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }}
                />
              </div>
              <span className="font-mono text-[13px] tabular-nums text-right" style={{ color: A_HUE }}>{ca}</span>
              <span className="font-mono text-[13px] tabular-nums" style={{ color: B_HUE }}>{cb}</span>
              <div className="h-[3px] rounded-full bg-white/[0.05] overflow-hidden">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${(cb / max) * 100}%`, background: B_HUE, transition: "width 0.6s cubic-bezier(0.22,1,0.36,1)" }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
