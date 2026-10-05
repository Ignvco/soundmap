import { AnalysisNav } from "@/components/soundmap/analysis-nav.tsx";
import { SplHeatmap2D } from "@/components/soundmap/spl-heatmap-2d.tsx";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import { sceneToSources } from "@/lib/audio/system-vitals.ts";
import { feedback } from "@/lib/feedback.ts";
import { useAppStore, type Scene } from "@/store/app.ts";
import {
  ArrowLeftRight,
  ArrowRight,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  A_HUE,
  AcousticsDiff,
  B_HUE,
  deltaGrid,
  DeltaStat,
  GearDiff,
  HeatmapHero,
  MetricPair,
  RoomDiff,
  ScenePicker,
} from "./components";

export default function SceneCompare() {
  const { scenes, loadScene } = useAppStore();
  const navigate = useNavigate();
  const [aId, setAId] = useState<string | null>(scenes[0]?.id ?? null);
  const [bId, setBId] = useState<string | null>(scenes[1]?.id ?? null);
  const [showDetails, setShowDetails] = useState(false);

  const a = useMemo(
    () => scenes.find((s) => (s.clientId ?? s.id) === aId),
    [scenes, aId],
  );
  const b = useMemo(
    () => scenes.find((s) => (s.clientId ?? s.id) === bId),
    [scenes, bId],
  );

  const gridA = useMemo(() => {
    if (!a) return null;
    const sources = sceneToSources(a.room, a.tops, a.subs, a.stageLayout);
    if (sources.length === 0) return null;
    return evaluateAudit({
      room: a.room,
      tops: a.tops,
      subs: a.subs,
      stageLayout: a.stageLayout,
      dsp: a.audit?.dsp,
    }).grid;
  }, [a]);
  const gridB = useMemo(() => {
    if (!b) return null;
    const sources = sceneToSources(b.room, b.tops, b.subs, b.stageLayout);
    if (sources.length === 0) return null;
    return evaluateAudit({
      room: b.room,
      tops: b.tops,
      subs: b.subs,
      stageLayout: b.stageLayout,
      dsp: b.audit?.dsp,
    }).grid;
  }, [b]);

  const canShowDelta = useMemo(
    () =>
      gridA !== null &&
      gridB !== null &&
      a !== undefined &&
      b !== undefined &&
      Math.abs(a.room.length - b.room.length) < 5 &&
      Math.abs(a.room.width - b.room.width) < 5,
    [gridA, gridB, a, b],
  );

  const gridDelta = useMemo(
    () => (canShowDelta && gridA && gridB ? deltaGrid(gridA, gridB) : null),
    [canShowDelta, gridA, gridB],
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
      <div className="v6-workspace compare-workspace">
        <div className="max-w-[1400px] mx-auto">
          <AnalysisNav />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
              Compare A / B
            </p>
            <h1 className="v6-heading mb-3" data-testid="compare-hub-title">
              Necesitás dos escenas
            </h1>
            <p className="text-[15px] text-muted-foreground max-w-lg leading-relaxed mb-10">
              Guardá al menos dos configuraciones para verlas lado a lado. El
              diff físico compara la cobertura SPL celda a celda.
            </p>
            <button
              onClick={() => {
                feedback("tap");
                navigate("/scenes");
              }}
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
    <div className="v6-workspace compare-workspace">
      <div className="max-w-[1400px] mx-auto">
        <AnalysisNav />
        {/* Whisper header + title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <h1 className="v6-heading mb-3" data-testid="compare-hub-title">
            Compare A/B
          </h1>
          <p className="text-sm text-muted-foreground max-w-xl leading-relaxed mb-6">
            Compará la cobertura y el rendimiento de tus escenas.
          </p>
        </motion.div>

        {/* Scene pickers row — quiet chips */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          className="compare-selectors grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] gap-2 md:gap-4 items-stretch mb-6"
        >
          <ScenePicker
            label="A"
            selectedId={aId}
            onSelect={setAId}
            scenes={scenes}
            hue={A_HUE}
            testId="picker-a"
          />
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
            <ArrowLeftRight
              size={14}
              strokeWidth={1.75}
              className="text-muted-foreground"
            />
          </button>
          <ScenePicker
            label="B"
            selectedId={bId}
            onSelect={setBId}
            scenes={scenes}
            hue={B_HUE}
            testId="picker-b"
          />
        </motion.div>

        {a && b && (
          <>
            {/* Hero — Heatmaps side by side */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.2,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mb-6"
              data-testid="compare-spl-grids"
            >
              <div className="compare-previews grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <HeatmapHero
                  grid={gridA}
                  scene={a}
                  label="A"
                  hue={A_HUE}
                  testId="compare-grid-a"
                />
                <HeatmapHero
                  grid={gridB}
                  scene={b}
                  label="B"
                  hue={B_HUE}
                  testId="compare-grid-b"
                />
              </div>
              <p className="sm:hidden text-[11px] text-muted-foreground mt-3">
                SPL estimado · Escala común de 70 a 150+ dB
              </p>
            </motion.div>

            {/* Delta band — the "meaning" of the diff */}
            {gridDelta && (
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.6,
                  delay: 0.3,
                  ease: [0.22, 1, 0.36, 1],
                }}
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
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: "var(--sm-amber)" }}
                          />
                          B más fuerte
                        </span>
                        <span className="flex items-center gap-2 text-muted-foreground">
                          A más fuerte
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ background: "var(--sm-accent)" }}
                          />
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
                Los recintos tienen dimensiones muy distintas — el delta
                cell-by-cell no se puede alinear. Compará los mapas SPL
                individuales arriba.
              </p>
            )}

            {/* Key metrics — big typography */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: 0.4,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mb-10 md:mb-14"
              data-testid="compare-key-metrics"
            >
              <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-6">
                Métricas clave
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-12">
                <MetricPair
                  label="Uniformidad SPL"
                  a={gridA?.uniformityPct ?? null}
                  b={gridB?.uniformityPct ?? null}
                  unit="%"
                  higherIsBetter
                />
                <MetricPair
                  label="Spread SPL"
                  a={gridA?.spread ?? null}
                  b={gridB?.spread ?? null}
                  unit="dB"
                  higherIsBetter={false}
                />
                <MetricPair
                  label="Speech score"
                  a={a.acoustics.speechScore}
                  b={b.acoustics.speechScore}
                  unit="/100"
                  higherIsBetter
                />
                <MetricPair
                  label="Music score"
                  a={a.acoustics.musicScore}
                  b={b.acoustics.musicScore}
                  unit="/100"
                  higherIsBetter
                />
              </div>
            </motion.div>

            {/* Progressive disclosure — details */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.5,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mb-10 md:mb-14"
            >
              <button
                onClick={() => {
                  feedback("tap");
                  setShowDetails((v) => !v);
                }}
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
              transition={{
                duration: 0.6,
                delay: 0.55,
                ease: [0.22, 1, 0.36, 1],
              }}
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
