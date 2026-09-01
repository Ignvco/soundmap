// SoundMap — Export Screen (Dark Premium)
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "@/store/app.ts";
import { calculatePARecommendation } from "@/lib/audio/pa-engine.ts";
import { generateDSPConfig } from "@/lib/audio/dsp-engine.ts";
import { calculateStageConfig } from "@/lib/audio/stage-engine.ts";
import { generateTechnicalPDF } from "@/lib/pdf-export.ts";
import {
  GlassCard, ProButton, Badge, ScreenShell, StatusPill, MetricCard
} from "@/components/soundmap/ui.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import { useInWizard } from "@/lib/wizard-context.ts";
import {
  Download, FileText, BookMarked, ChevronDown, ChevronUp,
  Check, AlertTriangle, Cpu, Speaker, Activity, Layers, Share2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";

// ── Collapsible section ────────────────────────────────────────────────────────
function CollapseSection({
  title, icon, children, defaultOpen = false
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassCard>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 p-4 cursor-pointer"
      >
        <div className="h-8 w-8 rounded-xl bg-accent/12 flex items-center justify-center shrink-0">
          <span className="text-accent">{icon}</span>
        </div>
        <span className="flex-1 text-sm font-bold text-foreground text-left">{title}</span>
        {open ? <ChevronUp size={16} className="text-muted-foreground" /> : <ChevronDown size={16} className="text-muted-foreground" />}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-border">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </GlassCard>
  );
}

// ── Data row ──────────────────────────────────────────────────────────────────
function DataRow({ label, value, accent }: { label: string; value: string | number; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-border/60 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className={cn("text-xs font-semibold", accent ? "text-accent" : "text-foreground")}>{value}</span>
    </div>
  );
}

// ── Warning chip ──────────────────────────────────────────────────────────────
function WarningChip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <AlertTriangle size={12} className="text-accent mt-0.5 shrink-0" />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

// ── Recommendation chip ───────────────────────────────────────────────────────
function RecoChip({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 py-1.5">
      <Check size={12} className="text-chart-2 mt-0.5 shrink-0" />
      <span className="text-xs text-muted-foreground">{text}</span>
    </div>
  );
}

export default function ExportPage() {
  const { room, acoustics, tops, subs, monitors, dspUnits, amps, saveScene } = useAppStore();
  const inWizard = useInWizard();
  const [sceneName, setSceneName] = useState("");
  const [copied, setCopied] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const pa = room && acoustics
    ? calculatePARecommendation(room, acoustics, tops, subs, monitors, amps)
    : null;
  const dsp = room && acoustics
    ? generateDSPConfig(room, acoustics, tops, subs, monitors, dspUnits[0] ?? null, amps)
    : null;
  const stage = room && acoustics
    ? calculateStageConfig(room, acoustics, tops, subs)
    : null;

  const exportContent = room && acoustics
    ? `# LevelPro Audio Technical Export
Generated: ${new Date().toLocaleString()}

## Venue
Name: ${room.name}
Dimensions: ${room.length}m × ${room.width}m × ${room.height}m
Volume: ${acoustics.volume} m³
Capacity: ${room.capacity} audience

## Acoustic Analysis
RT60 (empty): ${acoustics.rt60Empty}s
RT60 (+audience): ${acoustics.rt60Audience}s
Schroeder Frequency: ${acoustics.schroederFreq} Hz
Critical Distance: ${acoustics.criticalDistance}m
Echo Risk: ${acoustics.echoRisk.toUpperCase()}
Speech Score: ${acoustics.speechScore}/100
Music Score: ${acoustics.musicScore}/100

## PA System
${pa?.topsConfig ?? "—"}
${pa?.subsConfig ?? "—"}
${pa?.monitorsConfig ?? "—"}
SPL Target: ${pa?.splTarget ?? "—"} dB
Headroom: ${pa?.headroomDb ?? "—"} dB
Crossover: ${pa?.crossoverFreq ?? "—"} Hz
Sub Strategy: ${pa?.subStrategy ?? "—"}

## DSP Outputs
${dsp?.outputs.map(o => `${o.label} → ${o.destination} | HPF:${o.hpfHz}Hz LPF:${o.lpfHz >= 20000 ? "Full" : o.lpfHz + "Hz"} Limiter:${o.limiterDb.toFixed(1)}dB Delay:${o.delayMs}ms`).join("\n") ?? "No DSP"}

## Stage Configuration
Mode: ${stage?.deploymentMode ?? "—"}
Coverage: ${stage?.coveragePercent ?? "—"}%
SPL Front: ${stage?.splFront ?? "—"} dB
SPL Rear: ${stage?.splRear ?? "—"} dB
Delay Towers: ${stage?.needsDelayTowers ? "Yes — " + stage.delayTowerDistance + "m" : "Not required"}

## Warnings
${[...(pa?.warnings ?? [])].map(w => `⚠ ${w}`).join("\n") || "None"}

## Recommendations
${acoustics.recommendations.map(r => `→ ${r}`).join("\n")}

---
LevelPro Audio — Pro Audio System Designer
`
    : "No room scan data available. Please complete a Room Scan first.";

  const handleCopy = async () => {
    await navigator.clipboard.writeText(exportContent);
    setCopied(true);
    toast.success("Copiado al portapapeles");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!room || !acoustics || !pa || !dsp || !stage) {
      toast.error("Completá un Escaneo de Sala primero");
      return;
    }
    setPdfLoading(true);
    try {
      generateTechnicalPDF(room, acoustics, pa, dsp, stage);
      toast.success("¡PDF descargado!");
    } catch (err) {
      console.error(err);
      toast.error("Error al generar PDF");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShare = async () => {
    if (!room || !acoustics) { toast.error("Sin datos para compartir"); return; }
    if (navigator.share) {
      try {
        await navigator.share({
          title: `SoundMap Report — ${room.name}`,
          text: exportContent,
        });
      } catch (_) {
        // Cancelled
      }
    } else {
      await navigator.clipboard.writeText(exportContent);
      toast.success("Copiado al portapapeles (compartir no disponible en este dispositivo)");
    }
  };

  const handleSaveScene = () => {
    if (!sceneName.trim()) { toast.error("Ingresá un nombre de escena"); return; }
    if (!room) { toast.error("Completá un Escaneo de Sala primero"); return; }
    saveScene(sceneName.trim());
    setSceneName("");
    toast.success(`Escena "${sceneName}" guardada`);
  };

  const hasData = !!room && !!acoustics;

  return (
    <ScreenShell compact={inWizard}>
      {!inWizard && (
        <PageHeader
          title="Exportar"
          subtitle={room?.name ?? "No data"}
          right={<StatusPill status={hasData ? "ready" : "offline"} label={hasData ? "Listo" : "Sin Datos"} />}
        />
      )}

      <div className={inWizard ? "space-y-3 pb-4" : "px-4 space-y-3 pb-4"}>

        {/* ── Headline metrics ── */}
        {hasData && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="grid grid-cols-2 gap-2"
          >
            <MetricCard label="RT60" value={acoustics!.rt60Audience} unit="s" sub="Con público" accent />
            <MetricCard label="Puntaje de Voz" value={acoustics!.speechScore} unit="/100" sub="Inteligibilidad" />
            <MetricCard label="SPL Objetivo" value={pa?.splTarget ?? "—"} unit="dB" sub="Techo del sistema" />
            <MetricCard label="Cobertura" value={`${stage?.coveragePercent ?? "—"}`} unit="%" sub="Área del escenario" />
          </motion.div>
        )}

        {/* ── Venue ── */}
        {hasData && (
          <CollapseSection title="Recinto y Acústica" icon={<Activity size={16} />} defaultOpen>
            <div className="mt-2 space-y-0">
              <DataRow label="Recinto" value={room!.name} accent />
              <DataRow label="Dimensiones" value={`${room!.length}m × ${room!.width}m × ${room!.height}m`} />
              <DataRow label="Volumen" value={`${acoustics!.volume} m³`} />
              <DataRow label="Capacidad" value={`${room!.capacity} pax`} />
              <DataRow label="RT60 Vacío" value={`${acoustics!.rt60Empty}s`} />
              <DataRow label="RT60 + Público" value={`${acoustics!.rt60Audience}s`} />
              <DataRow label="Frecuencia de Schroeder" value={`${acoustics!.schroederFreq} Hz`} />
              <DataRow label="Distancia Crítica" value={`${acoustics!.criticalDistance}m`} />
              <DataRow label="Riesgo de Eco" value={acoustics!.echoRisk.toUpperCase()} accent={acoustics!.echoRisk === "high"} />
              <DataRow label="Puntaje Musical" value={`${acoustics!.musicScore}/100`} />
            </div>
          </CollapseSection>
        )}

        {/* ── PA System ── */}
        {hasData && pa && (
          <CollapseSection title="Sistema PA" icon={<Speaker size={16} />} defaultOpen>
            <div className="mt-2 space-y-0">
              <DataRow label="Config de Tops" value={pa.topsConfig} />
              <DataRow label="Config de Subs" value={pa.subsConfig} />
              <DataRow label="Monitores" value={pa.monitorsConfig} />
              <DataRow label="SPL Objetivo" value={`${pa.splTarget} dB`} accent />
              <DataRow label="Margen" value={`${pa.headroomDb} dB`} />
              <DataRow label="Cruce" value={`${pa.crossoverFreq} Hz`} />
              <DataRow label="Estrategia de Subs" value={pa.subStrategy} />
            </div>
            {pa.warnings.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-[10px] uppercase tracking-[0.28em] text-muted-foreground mb-2">Advertencias</p>
                {pa.warnings.map((w, i) => <WarningChip key={i} text={w} />)}
              </div>
            )}
          </CollapseSection>
        )}

        {/* ── DSP Outputs ── */}
        {hasData && dsp && (
          <CollapseSection title="Salidas DSP" icon={<Cpu size={16} />}>
            <div className="mt-2 space-y-2">
              {dsp.outputs.map((o, i) => (
                <div key={i} className="rounded-xl bg-secondary border border-border p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-foreground">{o.label}</span>
                    <Badge color="orange">{o.destination}</Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                    <span className="text-muted-foreground">HPF: <span className="text-foreground font-medium">{o.hpfHz} Hz</span></span>
                    <span className="text-muted-foreground">LPF: <span className="text-foreground font-medium">{o.lpfHz >= 20000 ? "Completo" : o.lpfHz + " Hz"}</span></span>
                    <span className="text-muted-foreground">Limitador: <span className="text-foreground font-medium">{o.limiterDb.toFixed(1)} dB</span></span>
                    <span className="text-muted-foreground">Delay: <span className="text-foreground font-medium">{o.delayMs} ms</span></span>
                  </div>
                </div>
              ))}
            </div>
          </CollapseSection>
        )}

        {/* ── Stage ── */}
        {hasData && stage && (
          <CollapseSection title="Configuración de Escenario" icon={<Layers size={16} />}>
            <div className="mt-2 space-y-0">
              <DataRow label="Modo de Despliegue" value={stage.deploymentMode} accent />
              <DataRow label="Cobertura" value={`${stage.coveragePercent}%`} />
              <DataRow label="SPL Frontal" value={`${stage.splFront} dB`} />
              <DataRow label="SPL Trasero" value={`${stage.splRear} dB`} />
              <DataRow label="Torres de Delay" value={stage.needsDelayTowers ? `Sí — ${stage.delayTowerDistance}m` : "No requerido"} />
            </div>
          </CollapseSection>
        )}

        {/* ── Recommendations ── */}
        {hasData && acoustics!.recommendations.length > 0 && (
          <CollapseSection title="Recomendaciones" icon={<Check size={16} />}>
            <div className="mt-2">
              {acoustics!.recommendations.map((r, i) => <RecoChip key={i} text={r} />)}
            </div>
          </CollapseSection>
        )}

        {/* ── Export & Save ── */}
        <GlassCard className="p-4" glow>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-accent/15 flex items-center justify-center shrink-0">
              <FileText size={18} className="text-accent" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Exportar Informe Técnico</p>
              <p className="text-xs text-muted-foreground">Descargá el PDF completo o copiá en markdown</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {/* Primary: Download PDF */}
            <ProButton
              onClick={handleDownloadPDF}
              disabled={!hasData || pdfLoading}
              className="w-full justify-center gap-2"
            >
              {pdfLoading
                ? <span className="h-3.5 w-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                : <Download size={15} />
              }
              {pdfLoading ? "Generando PDF…" : "Descargar Informe PDF"}
            </ProButton>
            {/* Secondary row: Copy Markdown + Share */}
            <div className="flex gap-2">
              <button
                onClick={handleCopy}
                disabled={!hasData}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground transition-all cursor-pointer",
                  "hover:bg-secondary/70 disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                {copied ? <Check size={13} className="text-chart-2" /> : <FileText size={13} />}
                {copied ? "¡Copiado!" : "Copiar Markdown"}
              </button>
              <button
                onClick={handleShare}
                disabled={!hasData}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 rounded-xl border border-border bg-secondary py-2.5 text-xs font-semibold text-secondary-foreground transition-all cursor-pointer",
                  "hover:bg-secondary/70 disabled:opacity-40 disabled:cursor-not-allowed"
                )}
              >
                <Share2 size={13} />
                Compartir
              </button>
            </div>
          </div>
        </GlassCard>

        {/* ── Save Scene ── */}
        <GlassCard className="p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <BookMarked size={18} className="text-muted-foreground" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-foreground">Guardar como Escena</p>
              <p className="text-xs text-muted-foreground">Guardar toda esta configuración</p>
            </div>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={sceneName}
              onChange={e => setSceneName(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleSaveScene()}
              placeholder="Nombre de escena ej. Escenario Principal Vie"
              className="flex-1 rounded-xl bg-secondary border border-border px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-accent/50 transition-colors"
            />
            <ProButton onClick={handleSaveScene} disabled={!hasData || !sceneName.trim()}>
              Guardar
            </ProButton>
          </div>
        </GlassCard>

        {!hasData && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <GlassCard className="p-8 text-center">
              <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center mx-auto mb-4">
                <FileText size={22} className="text-muted-foreground" />
              </div>
              <p className="text-sm font-bold text-foreground mb-2">Sin Datos del Sistema</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Completá un Escaneo de Sala y configurá tu equipo para generar un informe técnico completo
              </p>
            </GlassCard>
          </motion.div>
        )}
      </div>
    </ScreenShell>
  );
}
