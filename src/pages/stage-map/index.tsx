import { Stage3D } from "@/_r3f_isolated/stage-3d";
import { DemoBanner } from "@/components/soundmap/demo-banner.tsx";
import { EmptyRoomState } from "@/components/soundmap/empty-state.tsx";
import { OptimizerModal } from "@/components/soundmap/optimizer-modal.tsx";
import { Badge, GlassCard, ScreenShell } from "@/components/soundmap/ui.tsx";
import { VenueBoundary } from "@/components/soundmap/venue-preview.tsx";
import { V } from "@/components/soundmap/vitals/index.tsx";
import { evaluateAudit } from "@/lib/audio/audit-evaluator";
import { calculateStageConfig } from "@/lib/audio/stage-engine.ts";
import { feedback } from "@/lib/feedback.ts";
import { layoutSpeakers, maxSpeakerHeight } from "@/lib/speaker-layout.ts";
import { SPL_STOPS } from "@/lib/venue-visual.ts";
import { useAppStore } from "@/store/app.ts";
import {
  AlertTriangle,
  Box,
  ChevronRight,
  Layers,
  LayoutGrid,
  Map,
  Move,
  Speaker,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  evaluatePlacement,
  type PinEvaluation,
} from "./_lib/placement-evaluator.ts";
import {
  DEPLOY_LABEL,
  FloorPlan,
  PositionField,
  RATING_META,
  SPK_COLORS,
  SpeakerDetail,
  SystemEvaluationCard,
  computeGeometry,
  normToPx,
  pinsToNorm,
  type SpeakerPin,
} from "./components";

export default function StageMap() {
  const {
    room,
    acoustics,
    tops,
    subs,
    monitors,
    stageLayout,
    updateSpeakerPlacement,
    resetSpeakerLayout,
    activeSceneId,
  } = useAppStore();
  const [selectedPin, setSelectedPin] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [showDetails, setShowDetails] = useState(false);
  const [layer, setLayer] = useState<"direction" | "spl" | "none">("direction");
  const [viewMode, setViewMode] = useState<"2d" | "3d">("3d");
  const [layoutBeforeOptimization, setLayoutBeforeOptimization] = useState<
    import("@/lib/speaker-layout").SpeakerLayout | null
  >(null);
  const [optimizerOpen, setOptimizerOpen] = useState(false);

  const acceptedDsp = useAppStore((s) => s.audit.dsp);
  const stageConfig = useMemo(
    () =>
      room && acoustics
        ? calculateStageConfig(
            room,
            acoustics,
            tops,
            subs,
            stageLayout,
            acceptedDsp,
          )
        : null,
    [room, acoustics, tops, subs, stageLayout, acceptedDsp],
  );

  const geo = useMemo(() => (room ? computeGeometry(room) : null), [room]);

  const speakers = useMemo(
    () => (room ? layoutSpeakers(room, tops, subs, monitors, stageLayout) : []),
    [room, tops, subs, monitors, stageLayout],
  );
  const pins = useMemo<SpeakerPin[]>(
    () =>
      geo
        ? speakers.map((speaker) => ({
            id: speaker.id,
            label: speaker.label,
            type: speaker.kind,
            ...normToPx(speaker.normX, speaker.normY, geo),
            normX: speaker.normX,
            normY: speaker.normY,
            heightM: speaker.y,
            suggestedHeightM: speaker.suggestedHeightM,
            cabinetType: speaker.cabinetType,
            brand: speaker.gear.brand,
            model: speaker.gear.model,
            splMax: speaker.gear.splMax,
            coverageH: speaker.gear.coverageH ?? 90,
            color: SPK_COLORS[speaker.kind],
            aimAngleDeg: speaker.yawDeg,
          }))
        : [],
    [speakers, geo],
  );

  const systemEval = useMemo(() => {
    if (!room || !acoustics || !geo || pins.length === 0 || !stageConfig)
      return null;
    return evaluatePlacement(
      pinsToNorm(pins, geo),
      room,
      acoustics,
      stageConfig.delayTowerDistance || room.length * 0.6,
    );
  }, [room, acoustics, geo, pins, stageConfig]);

  const pinEvalMap = useMemo(() => {
    const map: Record<string, PinEvaluation> = {};
    systemEval?.pinEvals.forEach((e) => {
      map[e.pinId] = e;
    });
    return map;
  }, [systemEval]);

  const splGrid = useMemo(() => {
    if (!room) return undefined;
    return (
      evaluateAudit({ room, tops, subs, stageLayout, dsp: acceptedDsp }).grid ??
      undefined
    );
  }, [tops, subs, stageLayout, room, acceptedDsp]);
  const selectedPinData = pins.find((p) => p.id === selectedPin) ?? null;
  const hasCustomPositions = Object.keys(stageLayout).length > 0;
  const handleDragMove = useCallback(
    (id: string, normX: number, normY: number) => {
      updateSpeakerPlacement(id, { normX, normY });
    },
    [updateSpeakerPlacement],
  );

  if (!room || !acoustics || !geo) {
    return (
      <EmptyRoomState
        title="Mapa de Escenario"
        icon={Map}
        iconColor="var(--accent)"
        description="Hacé un Escaneo de Sala para generar el mapa de despliegue de parlantes, arcos de cobertura y posición de delay towers."
      />
    );
  }

  return (
    <ScreenShell className="stage-workspace">
      {/* Vitals-style header — eyebrow + big title + right actions */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-2">
            Stage Map
          </p>
          <h1 className="v6-heading" data-testid="page-header-title">
            {room.name}
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">
            {DEPLOY_LABEL[stageConfig?.deploymentMode ?? "mono"]} ·{" "}
            {tops.reduce((n, g) => n + (g.quantity ?? 1), 0)} tops ·{" "}
            {subs.reduce((n, g) => n + (g.quantity ?? 1), 0)} subs
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              feedback("select");
              setOptimizerOpen(true);
            }}
            data-testid="stage-optimizer-btn"
            disabled={tops.length === 0 && subs.length === 0}
            className="inline-flex items-center gap-1.5 rounded-full h-9 px-4 text-[12px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: V.accent,
              color: "var(--background)",
              transition: "background-color 0.3s ease",
            }}
          >
            <Wand2 size={12} strokeWidth={2} />
            Optimizar
          </button>
        </div>
      </div>

      <DemoBanner />

      {/* 2D / 3D Toggle — Vitals pill style */}
      <div className="mb-4">
        <div
          className="inline-flex items-center gap-1 rounded-full p-1"
          data-testid="stage-view-toggle"
          style={{
            background: "rgba(255,255,255,0.03)",
            boxShadow: `0 0 0 1px ${V.hairline}`,
          }}
        >
          {[
            { key: "2d" as const, label: "Plano", icon: LayoutGrid },
            { key: "3d" as const, label: "3D", icon: Box },
          ].map((v) => {
            const Icon = v.icon;
            const active = viewMode === v.key;
            return (
              <button
                key={v.key}
                onClick={() => {
                  feedback("select");
                  setViewMode(v.key);
                }}
                data-testid={`stage-view-${v.key}`}
                className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium cursor-pointer"
                style={
                  active
                    ? {
                        background: V.accent,
                        color: "var(--background)",
                        transition:
                          "background-color 0.3s ease, color 0.3s ease",
                      }
                    : {
                        color: "var(--muted-foreground)",
                        transition: "color 0.3s ease",
                      }
                }
              >
                <Icon size={12} strokeWidth={active ? 2.25 : 1.75} />
                {v.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3D View */}
      {viewMode === "3d" && stageConfig && (
        <div className="mb-3">
          {/* El canvas manda. Las métricas flotan encima en vez de ocupar una
              tarjeta debajo: el brief pide "evitar paneles innecesarios
              alrededor" y que la visualización sea protagonista. */}
          <div className="relative">
            <VenueBoundary>
              <Stage3D
                room={room}
                config={stageConfig}
                tops={tops}
                subs={subs}
                monitors={monitors}
                splGrid={splGrid}
                speakers={speakers}
                selectedId={selectedPin}
                onSelect={setSelectedPin}
              />
            </VenueBoundary>

            {splGrid && (
              <div
                className="mt-3 px-4 py-3"
                style={{
                  borderRadius: "var(--radius-card)",
                  background: "rgba(8, 9, 10, 0.72)",
                  backdropFilter: "blur(16px)",
                  boxShadow: "0 0 0 1px var(--border)",
                }}
                data-testid="stage-3d-overlay"
              >
                <div className="stage-metrics grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    {
                      label: "Máx",
                      value: Math.round(splGrid.max),
                      unit: "dB",
                      color: "var(--foreground)",
                      testId: "spl-grid-max",
                    },
                    {
                      label: "Media",
                      value: Math.round(splGrid.mean),
                      unit: "dB",
                      color: "var(--foreground)",
                    },
                    {
                      label: "Spread",
                      value: splGrid.spread.toFixed(1),
                      unit: "dB",
                      color:
                        splGrid.spread < 6
                          ? V.accent
                          : splGrid.spread < 12
                            ? V.amber
                            : V.warm,
                    },
                    {
                      label: "Uniform",
                      value: splGrid.uniformityPct,
                      unit: "%",
                      color:
                        splGrid.uniformityPct > 70
                          ? V.accent
                          : splGrid.uniformityPct > 40
                            ? V.amber
                            : V.warm,
                      testId: "spl-grid-uniformity",
                    },
                  ].map((m) => (
                    <div key={m.label}>
                      <p
                        className="font-mono tabular-nums text-[17px] leading-none"
                        style={{ color: m.color }}
                        data-testid={m.testId}
                      >
                        {m.value}
                        <span
                          className="text-[10px] ml-0.5 font-sans"
                          style={{ color: "var(--muted-foreground)" }}
                        >
                          {m.unit}
                        </span>
                      </p>
                      <p
                        className="text-[9px] uppercase tracking-[0.16em] mt-1.5"
                        style={{ color: "var(--muted-foreground)" }}
                      >
                        {m.label}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Metodología: es información importante pero no es lo que mirás
              mientras posicionás cajas. Va abajo, discreta. */}
          {splGrid && (
            <details className="mt-3 group" data-testid="stage-3d-method">
              <summary
                className="flex items-center gap-2 cursor-pointer list-none py-2 text-[11px]"
                style={{ color: "var(--muted-foreground)" }}
              >
                <Wand2 size={11} strokeWidth={1.75} />
                Estimación de campo directo — ver supuestos
              </summary>
              <p
                className="text-[11px] leading-relaxed pt-1 pb-2"
                style={{ color: "var(--muted-foreground)" }}
              >
                Divergencia geométrica, polar genérica y absorción atmosférica.
                Incluye el DSP aceptado. Modo{" "}
                {room.simulationMode === "coherent"
                  ? "coherente ideal"
                  : "energético"}
                ; sin reflexiones ni acoplamiento de arrays. Plano de muestreo:{" "}
                {splGrid.yPlane.toFixed(2)} m. No es una medición ni una
                predicción certificada del fabricante.
              </p>
            </details>
          )}
        </div>
      )}

      {viewMode === "2d" && (
        <div className="mb-4 border border-border rounded-xl overflow-hidden bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <p className="text-sm font-medium">Plano de equipos</p>
              <p className="text-xs text-muted-foreground mt-1">
                Seleccioná una caja para editar su posición y altura.
              </p>
            </div>
            <div className="plan-controls flex gap-2 items-center">
              <select
                aria-label="Capa del plano"
                value={layer}
                onChange={(e) => setLayer(e.target.value as typeof layer)}
                className="rounded-md border border-border bg-secondary p-2 text-xs"
              >
                <option value="direction">Dirección de cobertura</option>
                <option value="spl">Predicción SPL · 1 kHz</option>
                <option value="none">Solo equipos</option>
              </select>
              <button
                aria-label="Alejar plano"
                className="p-2"
                onClick={() => setZoom((z) => Math.max(0.6, z - 0.15))}
              >
                <ZoomOut size={16} />
              </button>
              <button
                aria-label="Acercar plano"
                className="p-2"
                onClick={() => setZoom((z) => Math.min(1.5, z + 0.15))}
              >
                <ZoomIn size={16} />
              </button>
            </div>
          </div>
          <div className="grid lg:grid-cols-[minmax(0,1fr)_300px]">
            <div className="overflow-auto bg-[#050706] p-4">
              <div
                className="mx-auto"
                style={{
                  width: 400 * zoom,
                  maxWidth: zoom <= 1 ? "100%" : undefined,
                }}
              >
                {stageConfig && (
                  <FloorPlan
                    room={room}
                    config={stageConfig}
                    geo={geo}
                    pins={pins}
                    pinEvals={pinEvalMap}
                    selected={selectedPin}
                    onSelect={setSelectedPin}
                    onDragMove={handleDragMove}
                    onDragEnd={() => {}}
                    zoom={1}
                    grid={splGrid}
                    layer={layer}
                  />
                )}
              </div>
            </div>
            <aside className="border-l border-border p-4 space-y-4">
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Equipos · {pins.length} unidades
              </p>
              <div className="flex flex-wrap gap-x-3 gap-y-2 text-[11px]">
                {(
                  [
                    ["tops", "Tops / array"],
                    ["subs", "Subs"],
                    ["monitors", "Monitores"],
                  ] as const
                ).map(([kind, label]) => (
                  <span key={kind} className="flex gap-1.5 items-center">
                    <span
                      className="w-2 h-2 rounded-sm"
                      style={{ background: SPK_COLORS[kind] }}
                    />
                    {label}
                  </span>
                ))}
              </div>
              {selectedPinData && (
                <div className="space-y-3 p-3 bg-secondary/40 border border-border rounded-lg">
                  <p
                    className="text-xs font-medium"
                    style={{ color: selectedPinData.color }}
                  >
                    {selectedPinData.label} · {selectedPinData.model}
                  </p>
                  <PositionField
                    label="Altura rápida (m)"
                    value={selectedPinData.heightM}
                    min={0.1}
                    max={maxSpeakerHeight(room)}
                    onChange={(v) =>
                      updateSpeakerPlacement(selectedPinData.id, { heightM: v })
                    }
                  />
                  <button
                    className="text-[11px] text-accent"
                    onClick={() =>
                      updateSpeakerPlacement(selectedPinData.id, {
                        heightM: selectedPinData.suggestedHeightM,
                      })
                    }
                  >
                    Usar sugerida ·{" "}
                    {selectedPinData.suggestedHeightM.toFixed(2)} m
                  </button>
                  <p className="text-[10px] text-muted-foreground">
                    Centro del parlante sobre el piso.
                  </p>
                </div>
              )}
              <div className="space-y-1 max-h-[240px] overflow-auto">
                {pins.map((pin) => (
                  <button
                    key={pin.id}
                    onClick={() => setSelectedPin(pin.id)}
                    aria-pressed={selectedPin === pin.id}
                    className={`w-full text-left p-2.5 rounded-md border ${selectedPin === pin.id ? "border-accent bg-accent/5" : "border-transparent hover:bg-secondary"}`}
                  >
                    <span className="flex justify-between items-center text-xs">
                      <span style={{ color: pin.color }}>{pin.label}</span>
                      <span className="font-mono">
                        {pin.heightM.toFixed(2)} m ↑
                      </span>
                    </span>
                    <span className="block mt-1 text-[10px] text-muted-foreground">
                      {pin.brand} {pin.model}
                    </span>
                  </button>
                ))}
              </div>
              {layer === "spl" ? (
                <div>
                  <p className="text-[11px] mb-2">Nivel estimado · dB SPL</p>
                  <div
                    className="h-2 rounded"
                    style={{
                      background: `linear-gradient(to right, ${SPL_STOPS.map((s) => s.color).join(",")})`,
                    }}
                  />
                  <div className="flex justify-between text-[9px] font-mono mt-1">
                    {SPL_STOPS.map((s) => (
                      <span key={s.db}>{s.db}</span>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    Escala fija compartida con 3D. Plano de escucha a 1,60 m.
                  </p>
                </div>
              ) : (
                <p className="text-[11px] leading-relaxed text-muted-foreground">
                  Los colores identifican el tipo de equipo. El abanico muestra
                  su dirección horizontal; seleccioná uno para aislarlo. La
                  valoración de posición aparece en su ficha.
                </p>
              )}
              <button
                onClick={() => {
                  resetSpeakerLayout();
                  setSelectedPin(null);
                }}
                disabled={!hasCustomPositions}
                className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-40 flex items-center gap-2"
              >
                <Wand2 size={12} />
                Restablecer distribución
              </button>
            </aside>
          </div>
          <div className="border-t border-border px-4 py-3 flex flex-wrap justify-between gap-2 text-[11px] text-muted-foreground">
            <span className="flex gap-2 items-center">
              <Move size={12} />
              Arrastrá tops, subs y monitores. También podés usar la ficha.
            </span>
            <span data-testid="stage-save-status">
              Guardado automático en este dispositivo
              {activeSceneId ? " y en la escena activa" : ""} · 2D ↔ 3D
            </span>
          </div>
        </div>
      )}

      {/* Speaker detail panel */}
      <AnimatePresence>
        {selectedPinData && (
          <SpeakerDetail
            key={selectedPinData.id}
            pin={selectedPinData}
            room={room}
            onChange={(p) => updateSpeakerPlacement(selectedPinData.id, p)}
            evaluation={pinEvalMap[selectedPinData.id] ?? null}
            onClose={() => setSelectedPin(null)}
          />
        )}
      </AnimatePresence>

      {/* System evaluation */}
      {systemEval && (
        <details className="stage-evaluation mb-4">
          <summary>
            Evaluación del posicionamiento{" "}
            <span>{systemEval.overallScore}/100</span>
          </summary>
          <SystemEvaluationCard evaluation={systemEval} />
        </details>
      )}

      {/* Details toggle */}
      {stageConfig && (
        <div className="mb-4">
          <button
            onClick={() => setShowDetails((d) => !d)}
            className="w-full flex items-center justify-between rounded-xl border border-border bg-secondary px-4 py-3 cursor-pointer hover:bg-secondary/70 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Layers size={13} className="text-muted-foreground" />
              <span className="text-xs font-semibold text-foreground">
                Detalles de Despliegue
              </span>
            </div>
            <motion.div
              animate={{ rotate: showDetails ? 90 : 0 }}
              transition={{ duration: 0.15 }}
            >
              <ChevronRight size={13} className="text-muted-foreground" />
            </motion.div>
          </button>
        </div>
      )}

      <AnimatePresence>
        {showDetails && stageConfig && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 space-y-3 pb-2">
              {/* Deployment summary */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers size={13} className="text-muted-foreground" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
                    Estrategia de Despliegue
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  {[
                    {
                      label: "Modo",
                      value: DEPLOY_LABEL[stageConfig.deploymentMode],
                    },
                    {
                      label: "Alineación Sub/Top",
                      value:
                        stageConfig.alignedSource === "none"
                          ? "—"
                          : `${stageConfig.subAlignMs} ms · ${stageConfig.alignedSource === "sub" ? "subs" : "tops"}`,
                    },
                    {
                      label: "SPL Frontal/Trasero",
                      value: `${stageConfig.splFront} / ${stageConfig.splRear} dB`,
                    },
                    {
                      label: "Torres de Delay",
                      value: stageConfig.needsDelayTowers
                        ? `${stageConfig.delayTowerDistance}m · ${stageConfig.delayTowerMs} ms`
                        : "No requerido",
                      accent: stageConfig.needsDelayTowers,
                    },
                  ].map((row) => (
                    <div key={row.label}>
                      <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">
                        {row.label}
                      </p>
                      <p
                        className={`text-xs font-bold mt-0.5 ${row.accent ? "text-accent" : "text-foreground"}`}
                      >
                        {row.value}
                      </p>
                    </div>
                  ))}
                </div>
              </GlassCard>

              {/* Speaker positions list */}
              <GlassCard className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Speaker size={13} className="text-muted-foreground" />
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
                    Posiciones de Altavoces
                  </p>
                </div>
                {pins.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    Sin altavoces seleccionados
                  </p>
                ) : (
                  <div>
                    {pins.map((pin) => {
                      const ev = pinEvalMap[pin.id];
                      const ratingMeta = ev ? RATING_META[ev.rating] : null;
                      return (
                        <div
                          key={pin.id}
                          className="flex items-center justify-between py-2.5 border-b border-border last:border-0 cursor-pointer"
                          onClick={() => {
                            setSelectedPin(
                              pin.id === selectedPin ? null : pin.id,
                            );
                            setShowDetails(false);
                          }}
                        >
                          <div className="flex items-center gap-2.5">
                            <div
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ background: pin.color }}
                            />
                            <span className="text-xs font-bold text-foreground">
                              {pin.label}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            {ratingMeta && (
                              <span
                                className="text-[10px] font-bold"
                                style={{ color: ratingMeta.color }}
                              >
                                {ratingMeta.label}
                              </span>
                            )}
                            <Badge color="gray">{pin.splMax} dB</Badge>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </GlassCard>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delay tower warning */}
      {stageConfig?.needsDelayTowers && (
        <div className="pb-4">
          <div className="flex items-start gap-2.5 rounded-xl bg-accent/10 border border-accent/25 px-4 py-3">
            <AlertTriangle size={13} className="text-accent mt-0.5 shrink-0" />
            <p className="text-xs text-accent">
              Torres de delay recomendadas a{" "}
              <span className="font-bold">
                {stageConfig.delayTowerDistance}m
              </span>{" "}
              — configurar{" "}
              <span className="font-bold">{stageConfig.delayTowerMs} ms</span>{" "}
              de delay para alinear con los principales (propagación + efecto
              Haas)
            </p>
          </div>
        </div>
      )}

      {/* Add gear nudge */}
      {tops.length === 0 && (
        <div className="pb-4">
          <Link to="/gear-builder">
            <div className="flex items-center justify-between rounded-xl bg-secondary border border-border px-4 py-3 cursor-pointer hover:bg-secondary/70 transition-colors">
              <p className="text-xs text-muted-foreground">
                Agregá tops en el Armador de Equipo para ver posiciones de
                altavoces
              </p>
              <ChevronRight size={14} className="text-muted-foreground" />
            </div>
          </Link>
        </div>
      )}
      {layoutBeforeOptimization && (
        <button
          className="audit-button"
          onClick={() => {
            useAppStore
              .getState()
              .replaceSpeakerLayout(layoutBeforeOptimization);
            setLayoutBeforeOptimization(null);
          }}
        >
          Deshacer optimización
        </button>
      )}
      {/* Optimizer */}
      <OptimizerModal
        open={optimizerOpen}
        room={room}
        tops={tops}
        subs={subs}
        onClose={() => setOptimizerOpen(false)}
        onApply={(best) => {
          setLayoutBeforeOptimization({ ...stageLayout });
          useAppStore.getState().replaceSpeakerLayout(best.layout);
        }}
      />
    </ScreenShell>
  );
}
