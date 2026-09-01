// SoundMap — Channels / Patch Screen (Dark Premium Mixer-Style)
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAppStore } from "@/store/app.ts";
import { generateChannelPatch } from "@/lib/audio/channels-engine.ts";
import type { ChannelPatch } from "@/lib/audio/channels-engine.ts";
import { GlassCard, ScreenShell } from "@/components/soundmap/ui.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import { StatCard, V, EmptyState, PrimaryButton } from "@/components/soundmap/vitals/index.tsx";
import { useNavigate } from "react-router-dom";
import { Sliders } from "lucide-react";
import { feedback } from "@/lib/feedback.ts";
import { useInWizard } from "@/lib/wizard-context.ts";
import { ChevronDown, ChevronUp, Mic, Mic2, Activity, AlertOctagon } from "lucide-react";

type ChannelView = "list" | "grid";
type ChannelFilter = "all" | "critical" | "phantom" | "feedback";

const PRIORITY_COLOR: Record<ChannelPatch["priority"], string> = {
  critical: "var(--sm-accent)",
  high:     "var(--sm-accent)",
  medium:   "var(--sm-muted)",
  low:      "rgba(255,255,255,0.30)",
};

const FEEDBACK_COLOR: Record<ChannelPatch["feedbackRisk"], string> = {
  high:   "var(--sm-warm)",
  medium: "var(--sm-amber)",
  low:    "var(--sm-accent)",
};

const PRIORITY_LABEL: Record<ChannelPatch["priority"], string> = {
  critical: "crítico",
  high:     "alto",
  medium:   "medio",
  low:      "bajo",
};

const FEEDBACK_LABEL: Record<ChannelPatch["feedbackRisk"], string> = {
  high:   "alto",
  medium: "medio",
  low:    "bajo",
};

// ── Animated VU Meter ────────────────────────────────────────────────────────
function VUMeter({ active }: { active: boolean }) {
  // Static deterministic meter heights for SSR safety
  const segments = [82, 65, 71, 58, 75, 63, 68, 55];
  return (
    <div className="flex items-end gap-[2px] h-6">
      {segments.map((h, i) => {
        const pct = active ? h : 4;
        const color = pct > 85 ? "var(--destructive)" : pct > 70 ? "#FBBF24" : "var(--info)";
        return (
          <motion.div
            key={i}
            className="w-[3px] rounded-sm"
            style={{ backgroundColor: active ? color : "rgba(255,255,255,0.10)" }}
            animate={{ height: active ? `${pct}%` : "4%" }}
            transition={{
              duration: 0.3 + i * 0.05,
              repeat: active ? Infinity : 0,
              repeatType: "reverse",
              ease: "easeInOut",
              delay: i * 0.06,
            }}
          />
        );
      })}
    </div>
  );
}

// ── HPF Frequency Bar ────────────────────────────────────────────────────────
function HPFBar({ hz }: { hz: number }) {
  const pct = (Math.log10(hz) - Math.log10(20)) / (Math.log10(20000) - Math.log10(20)) * 100;
  return (
    <div className="relative h-1.5 bg-secondary rounded-full overflow-hidden">
      <div
        className="absolute top-0 right-0 bottom-0 rounded-full bg-gradient-to-r from-chart-2/60 to-chart-2"
        style={{ left: `${pct}%` }}
      />
      <div
        className="absolute top-[-2px] bottom-[-2px] w-0.5 bg-chart-2"
        style={{ left: `${pct}%` }}
      />
    </div>
  );
}

// ── Channel list card ────────────────────────────────────────────────────────
function ChannelCard({ ch, isActive }: { ch: ChannelPatch; isActive: boolean }) {
  const [expanded, setExpanded] = useState(false);
  const priorityColor = PRIORITY_COLOR[ch.priority];
  const feedbackColor = FEEDBACK_COLOR[ch.feedbackRisk];

  return (
    <motion.div layout initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      <GlassCard
        className="overflow-hidden"
        glow={expanded && ch.priority === "critical"}
      >
        {/* Main row */}
        <div
          className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={() => setExpanded(e => !e)}
        >
          {/* Channel number */}
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 font-medium text-xs"
            style={{
              background: `${priorityColor}15`,
              border: `1px solid ${priorityColor}30`,
              color: priorityColor,
            }}
          >
            {ch.ch.toString().padStart(2, "0")}
          </div>

          {/* Name + source */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-xs font-bold text-foreground truncate">{ch.name}</p>
              {ch.priority === "critical" && (
                <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.2em] text-accent bg-accent/12 px-1.5 py-0.5 rounded">CRIT</span>
              )}
            </div>
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{ch.source}</p>
          </div>

          {/* VU meters */}
          <VUMeter active={isActive} />

          {/* Tags */}
          <div className="flex flex-col items-end gap-1 shrink-0 ml-1">
            {ch.phantom && (
              <span className="text-[8px] font-bold bg-chart-2/15 text-chart-2 border border-chart-2/25 px-1.5 py-0.5 rounded-md">48V</span>
            )}
            <div
              className="h-1.5 w-1.5 rounded-full"
              style={{ background: feedbackColor }}
            />
          </div>

          <button
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            onClick={e => { e.stopPropagation(); setExpanded(x => !x); }}
          >
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>

        {/* Expanded section */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="overflow-hidden"
            >
              <div className="px-3 pb-3 pt-0 border-t border-border">
                {/* Spec grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2.5 pt-3 mb-3">
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">Entrada Stagebox</p>
                    <p className="text-sm font-bold text-foreground">CH {ch.stageboxInput}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">Phantom</p>
                    <p className={`text-sm font-bold ${ch.phantom ? "text-chart-2" : "text-muted-foreground"}`}>
                      {ch.phantom ? "48V ENCENDIDO" : "APAGADO"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">Prioridad</p>
                    <p className="text-sm font-bold capitalize" style={{ color: priorityColor }}>{PRIORITY_LABEL[ch.priority]}</p>
                  </div>
                  <div>
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">Riesgo de Feedback</p>
                    <p className="text-sm font-bold capitalize" style={{ color: feedbackColor }}>{FEEDBACK_LABEL[ch.feedbackRisk]}</p>
                  </div>
                </div>

                {/* HPF */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em]">Filtro Paso Alto</p>
                    <p className="text-[11px] font-bold text-chart-2">{ch.hpfHz} Hz</p>
                  </div>
                  <HPFBar hz={ch.hpfHz} />
                </div>

                {/* EQ hint */}
                <div className="rounded-xl bg-secondary border border-border px-3 py-2.5 mb-2">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] mb-1">Sugerencia EQ</p>
                  <p className="text-[11px] text-foreground/80 leading-relaxed">{ch.eqHint}</p>
                </div>

                {/* Monitor hint */}
                <div className="rounded-xl bg-secondary border border-border px-3 py-2.5">
                  <p className="text-[9px] text-muted-foreground uppercase tracking-[0.28em] mb-1">Envío a Monitor</p>
                  <p className="text-[11px] text-foreground/80">{ch.monitorHint}</p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </GlassCard>
    </motion.div>
  );
}

// ── Grid view mini channel strip ─────────────────────────────────────────────
function ChannelStrip({ ch, isActive }: { ch: ChannelPatch; isActive: boolean }) {
  const priorityColor = PRIORITY_COLOR[ch.priority];
  const feedbackColor = FEEDBACK_COLOR[ch.feedbackRisk];

  return (
    <div
      className="rounded-xl border border-border bg-card p-2.5 flex flex-col items-center gap-1.5 shadow-[0_1px_4px_rgba(15,15,15,0.04)]"
      style={{ borderColor: ch.priority === "critical" ? `${priorityColor}40` : undefined }}
    >
      {/* Feedback dot */}
      <div className="self-end h-1.5 w-1.5 rounded-full" style={{ background: feedbackColor }} />

      {/* Mini VU */}
      <div className="flex items-end gap-[1.5px] h-5 w-full justify-center">
        {[70, 55, 65, 50, 60].map((h, i) => {
          const pct = isActive ? h : 3;
          const color = pct > 85 ? "var(--destructive)" : pct > 70 ? "#FBBF24" : "var(--info)";
          return (
            <motion.div
              key={i}
              className="flex-1 rounded-sm max-w-[4px]"
              style={{ backgroundColor: isActive ? color : "rgba(255,255,255,0.10)" }}
              animate={{ height: isActive ? `${pct}%` : "3%" }}
              transition={{ duration: 0.4 + i * 0.08, repeat: isActive ? Infinity : 0, repeatType: "reverse", ease: "easeInOut" }}
            />
          );
        })}
      </div>

      {/* Fader line */}
      <div className="w-0.5 h-8 bg-secondary rounded-full relative mx-auto">
        <div
          className="absolute left-0 right-0 bottom-0 rounded-full"
          style={{ height: "65%", background: `linear-gradient(to top, ${priorityColor}, ${priorityColor}60)` }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 w-4 h-1.5 rounded-sm bg-popover border border-border shadow-sm"
          style={{ bottom: "62%" }}
        />
      </div>

      {/* Channel number */}
      <div
        className="h-5 w-5 rounded-md flex items-center justify-center text-[8px] font-medium"
        style={{ background: `${priorityColor}18`, color: priorityColor }}
      >
        {ch.ch}
      </div>
      <p className="text-[7px] text-muted-foreground text-center leading-none truncate w-full">{ch.name}</p>
      {ch.phantom && <div className="text-[6px] font-bold text-chart-2 bg-chart-2/12 px-1 rounded">48V</div>}
    </div>
  );
}

// ── Main Screen ──────────────────────────────────────────────────────────────
export default function Channels() {
  const navigate = useNavigate();
  const { acoustics, mics } = useAppStore();
  const inWizard = useInWizard();
  const [filter, setFilter] = useState<ChannelFilter>("all");
  const [view, setView] = useState<ChannelView>("list");
  const [isLive, setIsLive] = useState(false);

  const allChannels = useMemo(
    () => (acoustics ? generateChannelPatch(mics, acoustics) : []),
    [mics, acoustics]
  );

  const filtered = useMemo(() => {
    switch (filter) {
      case "critical": return allChannels.filter(c => c.priority === "critical");
      case "phantom":  return allChannels.filter(c => c.phantom);
      case "feedback": return allChannels.filter(c => c.feedbackRisk !== "low");
      default:         return allChannels;
    }
  }, [allChannels, filter]);

  const critCount   = allChannels.filter(c => c.priority === "critical").length;
  const phantomCount = allChannels.filter(c => c.phantom).length;
  const fbCount     = allChannels.filter(c => c.feedbackRisk !== "low").length;

  return (
    <ScreenShell compact={inWizard}>
      {!inWizard && (
        <PageHeader
          title="Canales"
          subtitle={`${allChannels.length} canales · ${phantomCount} phantom`}
          right={
            <button
              onClick={() => setIsLive(l => !l)}
              className="flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[10px] font-bold transition-all cursor-pointer border"
              style={isLive ? {
                background: "rgba(94,234,212,0.12)",
                borderColor: "rgba(94,234,212,0.30)",
                color: "var(--info)",
              } : {
                background: "var(--secondary)",
                borderColor: "var(--border)",
                color: "var(--muted-foreground)",
              }}
            >
              <Activity size={11} />
              {isLive ? "En Vivo" : "Estático"}
            </button>
          }
        />
      )}

      {/* Stats strip — Vitals StatCard tiles, single lime accent */}
      <div className="mb-5 grid grid-cols-3 gap-2.5">
        <StatCard
          label="Crítico"
          value={critCount}
          extra={<span className="inline-flex items-center gap-1"><AlertOctagon size={10} strokeWidth={1.75} className="text-muted-foreground" />prioridad</span>}
          testId="patch-stat-critical"
          className="!p-4"
        />
        <StatCard
          label="48V Phantom"
          value={phantomCount}
          extra={<span className="inline-flex items-center gap-1"><Mic2 size={10} strokeWidth={1.75} className="text-muted-foreground" />condensadores</span>}
          testId="patch-stat-phantom"
          className="!p-4"
        />
        <StatCard
          label="Riesgo FB"
          value={fbCount}
          extra={<span className="inline-flex items-center gap-1"><Mic size={10} strokeWidth={1.75} className="text-muted-foreground" />feedback</span>}
          testId="patch-stat-feedback"
          className="!p-4"
        />
      </div>

      {/* Filter + view toggle */}
      <div className="mb-4 flex items-center gap-2">
        <div className="flex gap-1 flex-1 rounded-full p-1" style={{ background: "rgba(255,255,255,0.03)", boxShadow: `0 0 0 1px ${V.hairline}` }}>
          {(["all", "critical", "phantom", "feedback"] as ChannelFilter[]).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              data-testid={`patch-filter-${f}`}
              className="flex-1 rounded-full py-1.5 text-[11px] font-medium cursor-pointer capitalize"
              style={filter === f
                ? { background: V.accent, color: "var(--background)", transition: "background-color 0.3s ease" }
                : { color: "var(--muted-foreground)", transition: "color 0.3s ease" }}
            >
              {f === "feedback" ? "FB" : f === "phantom" ? "48V" : f === "all" ? "Todo" : "Crítico"}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <button
          onClick={() => setView(v => v === "list" ? "grid" : "list")}
          className="h-9 w-9 rounded-xl border border-border bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {view === "list"
            ? <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="0" width="4" height="4" rx="1"/><rect x="5" y="0" width="4" height="4" rx="1"/><rect x="10" y="0" width="4" height="4" rx="1"/><rect x="0" y="5" width="4" height="4" rx="1"/><rect x="5" y="5" width="4" height="4" rx="1"/><rect x="10" y="5" width="4" height="4" rx="1"/></svg>
            : <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor"><rect x="0" y="1" width="14" height="2" rx="1"/><rect x="0" y="6" width="14" height="2" rx="1"/><rect x="0" y="11" width="14" height="2" rx="1"/></svg>
          }
        </button>
      </div>

      {/* Channel content */}
      {allChannels.length === 0 ? (
        <div className="px-4">
          {/* Antes este vacío no ofrecía salida: decía qué faltaba pero dejaba
              al usuario ahí parado. */}
          <EmptyState
            testId="channels-empty"
            icon={<Sliders size={18} strokeWidth={1.75} />}
            title="Sin canales generados"
            description="El patch se arma a partir del recinto y del equipo cargado. Completá esos pasos y los canales aparecen solos."
            action={
              <PrimaryButton onClick={() => { feedback("tap"); navigate("/design?step=room"); }}>
                Ir al escaneo de sala
              </PrimaryButton>
            }
          />
        </div>
      ) : view === "list" ? (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 items-start">
            <AnimatePresence mode="popLayout">
              {filtered.map(ch => (
                <ChannelCard key={ch.ch} ch={ch} isActive={isLive} />
              ))}
            </AnimatePresence>
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-8">Ningún canal coincide con este filtro</p>
          )}
        </div>
      ) : (
        <div className="px-4 pb-4">
          <div className="grid grid-cols-5 gap-2">
            {filtered.map(ch => (
              <ChannelStrip key={ch.ch} ch={ch} isActive={isLive} />
            ))}
          </div>
        </div>
      )}
    </ScreenShell>
  );
}
