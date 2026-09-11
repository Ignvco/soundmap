import { VenuePreview } from "@/components/soundmap/venue-preview.tsx";
// Perform Hub v7 — SoundMap Vitals show-time dashboard, app-native.
// Charts are driven by real system state:
//   • PA frequency response — from real crossover + speaker HPF/LPF
//   • Sessions Peak SPL — bar chart of last N saved scenes' arraySpl
// Split cards show live SPL + headroom. Kiosk banner, SPL meter and quick
// action links are retained.
import { useMemo } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Maximize2, ArrowRight, FileDown, Radio, Sliders, Activity } from "lucide-react";
import { SPLMeter } from "@/components/soundmap/spl-meter.tsx";
import { useAppStore } from "@/store/app.ts";
import { feedback } from "@/lib/feedback.ts";
import {
  PersonaGreeting, StreakChip, VitalsEyebrow, ProgressRing, V,
} from "@/components/soundmap/vitals/index.tsx";
import { ChartCardBar, ChartCardLine } from "@/components/soundmap/vitals/charts.tsx";
import { calculateCrossover } from "@/lib/audio/pa-engine.ts";
import { paSummary, paFrequencyResponse, sessionsPeakSeries } from "@/lib/audio/system-vitals.ts";
import { Metric, MetricRow } from "@/components/soundmap/vitals/metric.tsx";

export default function PerformHub() {
  const { room, tops, subs, monitors, dspUnits, scenes } = useAppStore();

  const hasSystem = tops.length > 0 || subs.length > 0;
  const hasDsp = dspUnits.length > 0;

  const { pa, freqResponse, sessions } = useMemo(() => {
    if (!hasSystem) return { pa: null, freqResponse: null, sessions: [] };
    const summary = paSummary(tops, subs, monitors);
    const xover = calculateCrossover(tops, subs);
    const fr = paFrequencyResponse(
      tops, subs,
      xover.crossoverFreq, xover.topHpf, xover.topLpf, xover.subLpf, xover.subHpf,
    );
    const sess = sessionsPeakSeries(scenes, 7);
    return { pa: summary, freqResponse: fr, sessions: sess };
  }, [hasSystem, tops, subs, monitors, scenes]);

  const streak = Math.max(scenes.length, hasSystem ? 1 : 0);
  const latestArraySpl = sessions.length > 0 ? sessions[sessions.length - 1].value : (pa?.arraySpl ?? 0);
  const previousArraySpl = sessions.length > 1 ? sessions[sessions.length - 2].value : latestArraySpl;
  const deltaPeak = latestArraySpl - previousArraySpl;

  return (
    <div className="v6-workspace">
      <div className="max-w-[1400px] mx-auto">
        {/* Persona greeting + streak */}
        <div className="flex items-start justify-between gap-4 mb-8 md:mb-10">
          <PersonaGreeting
            name={room?.name ?? "Show time"}
            subtitle={
              hasSystem
                ? "Respuesta del PA, sesiones anteriores y nivel en vivo."
                : "Cargá al menos un top o un sub para arrancar."
            }
            testId="perform-hub-title-wrap"
          />
          {hasSystem && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
              className="shrink-0"
            >
              <StreakChip count={streak} label="shows" tone="amber" />
            </motion.div>
          )}
        </div>
        <span data-testid="perform-hub-title" className="sr-only">{room?.name ?? "Show time"}</span>

        {room && <div className="mb-6"><VenuePreview room={room} tops={tops} subs={subs} monitors={monitors} /></div>}
        {/* ── Estado del sistema, en grande ──────────────────────────────
            El mockup pone el SPL como dato dominante: abrís Perform y sabés al
            instante si el sistema está listo. Antes lo primero era un banner
            promocionando el Kiosk (que además seguía mencionando el "panic
            mute" que se eliminó por mentir sobre lo que hacía). */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: hasSystem ? "var(--accent)" : "var(--muted-foreground)" }}
              aria-hidden="true"
            />
            <p className="text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: "var(--muted-foreground)" }}>
              {hasSystem ? "Sistema configurado" : "Sin sistema"}
            </p>
          </div>

          <p
            className="font-mono tabular-nums leading-none tracking-[-0.04em]"
            style={{ fontSize: "clamp(3.25rem, 11vw, 5rem)", color: "var(--foreground)" }}
            data-testid="perform-live-spl"
          >
            {pa ? pa.arraySpl.toFixed(1) : "—"}
            <span className="ml-2 font-sans font-normal text-[0.26em]" style={{ color: "var(--muted-foreground)" }}>
              dB
            </span>
          </p>
          <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.16em]" style={{ color: "var(--muted-foreground)" }}>
            SPL máximo estimado del sistema
          </p>

          <div className="mt-7">
            <MetricRow className="sm:grid-cols-3">
              <Metric
                size="md"
                value={pa ? `${pa.headroomDb > 0 ? "+" : ""}${pa.headroomDb}` : "—"}
                unit="dB" label="Headroom"
                tone={!pa ? "default" : pa.headroomDb >= 3 ? "accent" : "warning"}
                testId="perform-headroom"
              />
              <Metric
                size="md"
                value={latestArraySpl > 0 ? `${latestArraySpl}` : "—"}
                unit="dB" label="Peak sesión" testId="perform-peak"
              />
              <Metric
                size="md"
                value={pa ? `${pa.topsCount + pa.subsCount}` : "—"}
                unit="cajas" label="PA activo" testId="perform-boxes"
              />
            </MetricRow>
          </div>
        </motion.div>

        {/* Vitals headline */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="mb-4"
        >
          <VitalsEyebrow>Vitales del show</VitalsEyebrow>
          <p className="text-[13px] text-muted-foreground mt-1.5">
            {hasSystem ? "Datos reales del PA y de tus sesiones guardadas." : "Sin equipo cargado todavía."}
          </p>
        </motion.div>

        {/* Charts stack — REAL data */}
        <div className="space-y-3 mb-4">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChartCardLine
              title="Respuesta del PA"
              value={pa ? `${pa.arraySpl}` : "—"}
              unit={pa ? "dB máx" : ""}
              extra={pa
                ? `Crossover ${calculateCrossover(tops, subs).crossoverFreq || "—"} Hz · LR24`
                : "Cargá tops o subs"}
              data={freqResponse ?? [
                { label: "31", value: -30 }, { label: "63", value: -30 }, { label: "125", value: -30 },
                { label: "250", value: -30 }, { label: "500", value: -30 }, { label: "1k", value: -30 },
                { label: "2k", value: -30 }, { label: "4k", value: -30 }, { label: "8k", value: -30 }, { label: "16k", value: -30 },
              ]}
              yTicks={[-24, -12, -6, 0, 3]}
              testId="perform-freq-response"
              height={150}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <ChartCardBar
              title="Peak SPL por sesión"
              value={latestArraySpl > 0 ? latestArraySpl : "—"}
              unit={latestArraySpl > 0 ? "dB" : ""}
              extra={sessions.length > 0
                ? `Últimas ${sessions.length} escenas guardadas`
                : "Guardá una escena para ver el histórico"}
              data={sessions.length > 0
                ? sessions.map(s => ({ label: s.label, value: s.value, highlight: s.highlight }))
                : [{ label: "—", value: 0, highlight: false }]}
              yTicks={[100, 120, 145]}
              delta={sessions.length > 1
                ? {
                  value: Math.round(deltaPeak * 10) / 10,
                  unit: "dB",
                  label: "vs sesión anterior",
                  tone: deltaPeak > 0 ? "bad" : "good",
                }
                : undefined}
              testId="perform-sessions-bar"
            />
          </motion.div>
        </div>

        {/* Split cards — SPL en vivo + headroom del sistema */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div
            className="rounded-2xl p-5 flex items-center gap-4"
            style={{ background: V.card, boxShadow: `0 0 0 1px ${V.hairline}` }}
            data-testid="perform-live-spl-card"
          >
            <div className="flex-1 min-w-0">
              <p className="text-[13px] text-muted-foreground font-medium">Ahora</p>
              <p
                className="font-mono tabular-nums text-foreground leading-none mt-1.5"
                style={{ fontSize: "1.75rem", letterSpacing: "-0.03em" }}
              >
                —<span className="text-[13px] text-muted-foreground ml-1 font-sans">dB</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">Iniciá micrófono ↓</p>
            </div>
            <ProgressRing value={0} size={56} thickness={5} color={V.accent}>
              <Radio size={14} strokeWidth={1.75} style={{ color: V.accent }} />
            </ProgressRing>
          </div>
          <div
            className="rounded-2xl p-5 flex flex-col justify-between"
            style={{ background: V.card, boxShadow: `0 0 0 1px ${V.hairline}` }}
            data-testid="perform-headroom-card"
          >
            <div>
              <p className="text-[13px] text-muted-foreground font-medium">Headroom</p>
              <p
                className="font-mono tabular-nums leading-none mt-1.5"
                style={{
                  fontSize: "1.75rem",
                  letterSpacing: "-0.03em",
                  color: !pa ? "var(--foreground)" : pa.headroomDb >= 3 ? V.accent : V.warm,
                }}
              >
                {pa ? `${pa.headroomDb > 0 ? "+" : ""}${pa.headroomDb}` : "—"}
                <span className="text-[13px] text-muted-foreground ml-1 font-sans">dB</span>
              </p>
            </div>
            <div className="mt-3">
              <div className="h-1.5 w-full rounded-full overflow-hidden" style={{ background: V.hairline }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    background: pa && pa.headroomDb >= 3 ? V.accent : V.warm,
                    width: pa ? `${Math.max(0, Math.min(100, (pa.headroomDb / 12) * 100))}%` : "0%",
                  }}
                />
              </div>
              <p className="text-[11px] mt-1.5 text-muted-foreground">
                {pa
                  ? pa.headroomDb >= 3
                    ? `${pa.arraySpl} dB SPL vs objetivo 105 dB`
                    : "Margen ajustado sobre el objetivo de 105 dB"
                  : "Sin sistema cargado"}
              </p>
            </div>
          </div>
        </div>

        {/* SPL meter */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
          data-testid="perform-spl-meter-wrap"
        >
          <SPLMeter target={undefined} />
        </motion.div>

        {/* Acciones de show. El Kiosk vive acá, al mismo nivel que las demás:
            en el mockup es un botón, no un banner que ocupa la primera pantalla. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3" data-testid="perform-quick-actions">
          <Link
            to="/kiosk"
            onClick={() => feedback("select")}
            data-testid="perform-goto-kiosk"
            className="group px-5 py-4 flex items-center justify-between cursor-pointer"
            style={{
              borderRadius: "var(--radius-card)",
              background: "var(--surface-1)",
              boxShadow: "var(--elev-1)",
              transition: "box-shadow var(--dur) var(--ease)",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = "var(--elev-accent)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = "var(--elev-1)"; }}
          >
            <div className="min-w-0 flex items-center gap-3">
              <div
                className="h-9 w-9 flex items-center justify-center shrink-0"
                style={{ borderRadius: "var(--radius-chip)", background: "var(--accent-dim)", color: "var(--accent)" }}
              >
                <Maximize2 size={14} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground leading-tight">FOH Kiosk</p>
                <p className="text-[11px] mt-0.5" style={{ color: "var(--muted-foreground)" }}>
                  SPL a pantalla completa, apaisado
                </p>
              </div>
            </div>
            <ArrowRight size={13} strokeWidth={1.75} className="shrink-0 group-hover:translate-x-0.5" style={{ color: "var(--muted-foreground)", transition: "transform var(--dur) var(--ease)" }} />
          </Link>

          {/* /pa sólo se alcanzaba desde //legacy, una página muerta. Es análisis
              del sistema ya diseñado (respuesta en frecuencia, cobertura), no
              selección de equipo — su lugar es acá, no en el wizard. */}
          <Link
            to="/pa"
            onClick={() => feedback("tap")}
            data-testid="perform-goto-pa"
            className="group rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer"
            style={{
              background: V.card,
              boxShadow: `0 0 0 1px ${V.hairline}`,
              transition: "box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${V.accentRing}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${V.hairline}`; }}
          >
            <div className="min-w-0 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: V.accentDim, color: V.accent }}
              >
                <Activity size={14} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground leading-tight">Respuesta del sistema</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Curva y cobertura del PA cargado</p>
              </div>
            </div>
            <ArrowRight size={13} strokeWidth={1.75} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5" style={{ transition: "transform 0.3s ease" }} />
          </Link>

          <Link
            to="/export-page"
            onClick={() => feedback("tap")}
            data-testid="perform-goto-export"
            className="group rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer"
            style={{
              background: V.card,
              boxShadow: `0 0 0 1px ${V.hairline}`,
              transition: "box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${V.accentRing}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${V.hairline}`; }}
          >
            <div className="min-w-0 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: V.accentDim, color: V.accent }}
              >
                <FileDown size={14} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground leading-tight">Generar reporte</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">PDF · CSV del sistema diseñado</p>
              </div>
            </div>
            <ArrowRight size={13} strokeWidth={1.75} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5" style={{ transition: "transform 0.3s ease" }} />
          </Link>

          <Link
            to={hasDsp ? "/dsp" : "/design"}
            onClick={() => feedback("tap")}
            data-testid="perform-goto-dsp"
            className="group rounded-2xl px-5 py-4 flex items-center justify-between cursor-pointer"
            style={{
              background: V.card,
              boxShadow: `0 0 0 1px ${V.hairline}`,
              transition: "box-shadow 0.3s ease",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${V.accentRing}`; }}
            onMouseLeave={(e) => { e.currentTarget.style.boxShadow = `0 0 0 1px ${V.hairline}`; }}
          >
            <div className="min-w-0 flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-full flex items-center justify-center shrink-0"
                style={{ background: V.accentDim, color: V.accent }}
              >
                <Sliders size={14} strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-foreground leading-tight">
                  {hasDsp ? "Ajustar cadena DSP" : "Configurar DSP"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {hasDsp ? `${dspUnits[0].model} · ${dspUnits.length} unidad${dspUnits.length === 1 ? "" : "es"}` : "Sin DSP asignado"}
                </p>
              </div>
            </div>
            <ArrowRight size={13} strokeWidth={1.75} className="text-muted-foreground shrink-0 group-hover:translate-x-0.5" style={{ transition: "transform 0.3s ease" }} />
          </Link>
        </div>

        {!hasSystem && (
          <div className="mt-14 flex items-center justify-center">
            <Link
              to="/design"
              onClick={() => feedback("tap")}
              data-testid="perform-goto-design"
              className="inline-flex items-center gap-2 text-[13px] text-muted-foreground hover:text-foreground cursor-pointer"
              style={{ transition: "color 0.3s ease" }}
            >
              Volver al diseño
              <ArrowRight size={13} strokeWidth={1.75} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
