// Community Hub v5 — Apple/Linear/Arc redesign.
// Typography-first minimal list with the top-upvoted item as a hero.
// Filters live as quiet ghost chips, submit modal is quiet + spacious.
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Plus, ThumbsUp, Sparkles, X, Check, AlertTriangle, Users, TrendingUp, ShieldCheck } from "lucide-react";
import { useSyncContext } from "@/components/providers/sync.tsx";
import { useAppStore } from "@/store/app.ts";
import type { GearItem } from "@/lib/audio/pa-engine.ts";
import { feedback } from "@/lib/feedback.ts";
import { toast } from "sonner";
import { cn } from "@/lib/utils.ts";
import { EmptyState, Skeleton, SecondaryButton } from "@/components/soundmap/vitals/index.tsx";
import {
  useCommunityGear, VERIFIED_UPVOTE_THRESHOLD,
  type CommunityRow, type CommunityCategory, type SubmitInput,
} from "@/lib/community/use-community-gear.ts";

type CommunityCategoryLocal = CommunityCategory;

// Neutral hue map — no rainbow, each category gets a quiet tint that reads
// as a category chip on a dark background.
const CAT_META: Record<CommunityCategoryLocal, { label: string; hue: string }> = {
  tops:     { label: "Tops",     hue: "var(--sm-amber)" },
  subs:     { label: "Subs",     hue: "var(--sm-blue)" },
  monitors: { label: "Monitors", hue: "var(--sm-accent)" },
  amp:      { label: "Amps",     hue: "var(--sm-amber)" },
  dsp:      { label: "DSP",      hue: "var(--sm-amber)" },
  mixer:    { label: "Consolas", hue: "var(--sm-muted)" },
  mic:      { label: "Mics",     hue: "var(--sm-blue)" },
};

const HUE_VERIFIED = "var(--sm-accent)";

// Convex row shape (relaxed)
type CommunityListRow = CommunityRow;

export default function CommunityGearPage() {
  const [category, setCategory] = useState<CommunityCategoryLocal | "all">("all");
  const [statusFilter, setStatusFilter] = useState<"approved" | "pending">("approved");
  const [submitOpen, setSubmitOpen] = useState(false);
  const { isAuthenticated } = useSyncContext();

  const { rows, loading, isDemoMode, upvote, submit } = useCommunityGear({ category, status: statusFilter });

  // Sorted rows: highest upvotes first. Hero = rows[0] when list has content.
  const sorted = useMemo(() => rows ? [...rows].sort((a, b) => b.upvotes - a.upvotes) : undefined, [rows]);
  const hero = sorted && sorted.length > 0 ? sorted[0] : null;
  const rest = sorted && sorted.length > 1 ? sorted.slice(1) : [];

  // In demo mode we let anonymous users interact (vote + submit) so it feels alive.
  const canInteract = isAuthenticated || isDemoMode;

  const handleProposeClick = () => {
    feedback("select");
    if (!canInteract) {
      toast.info("Iniciá sesión para proponer gear a la comunidad.");
      return;
    }
    setSubmitOpen(true);
  };

  return (
    <div className="min-h-screen bg-background text-foreground px-6 md:px-12 pt-10 md:pt-16 pb-24">
      <div className="max-w-4xl mx-auto">
        {/* Whisper header + title */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
            Comunidad
          </p>
          <div className="flex items-end justify-between gap-6 mb-3 flex-wrap">
            <h1
              className="text-[2rem] md:text-[2.8rem] leading-[1.05] tracking-[-0.03em] font-medium"
              data-testid="community-hub-title"
            >
              Gear que la comunidad valida
            </h1>
            <button
              onClick={handleProposeClick}
              data-testid="community-submit-btn"
              className="inline-flex items-center gap-2 rounded-full bg-white text-[#09090b] hover:bg-white/90 px-5 py-2.5 text-[13px] font-medium cursor-pointer shrink-0"
              style={{ transition: "background-color 0.3s ease" }}
            >
              <Plus size={13} strokeWidth={2} />
              Proponer gear
            </button>
          </div>
          <p className="text-[15px] text-muted-foreground max-w-xl leading-relaxed mb-10 md:mb-14">
            Modelos submitidos por técnicos reales. Votá los que confirmes en campo
            e importalos a tu sistema con un tap.
          </p>
        </motion.div>

        {/* Auth hint — quiet strip */}
        {!isAuthenticated && !isDemoMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-10 rounded-xl px-5 py-3.5 flex items-center gap-3"
            style={{
              background: "rgba(107,165,199,0.05)",
              boxShadow: "0 0 0 1px rgba(107,165,199,0.15)",
            }}
            data-testid="community-auth-hint"
          >
            <Users size={14} strokeWidth={1.75} className="text-[#4A6BFF] shrink-0" />
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Iniciá sesión</span> para votar y proponer nuevos modelos.
            </p>
          </motion.div>
        )}

        {/* Demo mode strip — shows when Convex is offline */}
        {isDemoMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-10 rounded-xl px-5 py-3.5 flex items-center gap-3"
            style={{
              background: "rgba(155,126,189,0.05)",
              boxShadow: "0 0 0 1px rgba(155,126,189,0.18)",
            }}
            data-testid="community-demo-hint"
          >
            <Sparkles size={14} strokeWidth={1.75} className="text-[#F5B62E] shrink-0" />
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              <span className="text-foreground font-medium">Modo demo</span> — mostrando gear curado. Tus votos y propuestas se guardan en este dispositivo.
            </p>
          </motion.div>
        )}

        {/* Filter chips row */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-6"
        >
          <div className="flex items-center gap-2 flex-wrap">
            {(["all", ...Object.keys(CAT_META)] as (CommunityCategoryLocal | "all")[]).map(cat => {
              const isAll = cat === "all";
              const meta = isAll ? null : CAT_META[cat as CommunityCategoryLocal];
              const on = category === cat;
              return (
                <button
                  key={cat}
                  onClick={() => { feedback("tap"); setCategory(cat); }}
                  data-testid={`community-filter-${cat}`}
                  className={cn(
                    "rounded-full px-3.5 py-1.5 text-[12px] font-medium cursor-pointer",
                    on ? "text-[#09090b]" : "text-muted-foreground hover:text-foreground"
                  )}
                  style={{
                    background: on ? (meta?.hue ?? "var(--foreground)") : "rgba(255,255,255,0.03)",
                    boxShadow: on ? "none" : "0 0 0 1px rgba(255,255,255,0.05)",
                    transition: "background-color 0.3s ease, color 0.3s ease",
                  }}
                >
                  {isAll ? "Todo" : meta!.label}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* Status tabs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="mb-10 md:mb-12"
        >
          <div className="inline-flex items-center gap-1 rounded-full p-1"
            style={{ background: "rgba(255,255,255,0.03)", boxShadow: "0 0 0 1px rgba(255,255,255,0.05)" }}
          >
            {(["approved", "pending"] as const).map(s => (
              <button
                key={s}
                onClick={() => { feedback("select"); setStatusFilter(s); }}
                data-testid={`community-status-${s}`}
                className={cn(
                  "rounded-full px-4 py-1.5 text-[12px] font-medium cursor-pointer",
                  statusFilter === s ? "bg-white text-[#09090b]" : "text-muted-foreground hover:text-foreground"
                )}
                style={{ transition: "background-color 0.3s ease, color 0.3s ease" }}
              >
                {s === "approved" ? "Aprobado" : "Pendiente"}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Carga — el Skeleton reserva el alto para que la lista no salte
            cuando llegan los datos. El spinner anterior colapsaba el layout. */}
        {loading && !isDemoMode && (
          <div className="space-y-3" data-testid="community-loading">
            <Skeleton height={96} />
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
        )}

        {/* Vacío — con acción, para que la pantalla diga qué hacer en vez de
            dejar al usuario sin salida. */}
        {!loading && sorted && sorted.length === 0 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
            <EmptyState
              testId="community-empty"
              icon={<Users size={18} strokeWidth={1.75} />}
              title="Sin gear todavía"
              description={
                statusFilter === "pending"
                  ? "No hay propuestas en revisión ahora."
                  : "Sé el primero en proponer un modelo para la comunidad."
              }
              action={
                statusFilter === "pending" ? (
                  <SecondaryButton onClick={() => setStatusFilter("approved")}>
                    Ver los aprobados
                  </SecondaryButton>
                ) : undefined
              }
            />
          </motion.div>
        )}

        {/* Hero — top-upvoted */}
        {hero && (
          <HeroGear row={hero} canInteract={canInteract} onUpvote={upvote} />
        )}

        {/* Rest — quiet typography list */}
        {rest.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.6 }}
            className="mt-14 md:mt-16"
            data-testid="community-list"
          >
            <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-6">
              Más propuestas
            </p>
            <div className="divide-y divide-white/[0.04]">
              {rest.map((row, i) => (
                <CommunityListRowView key={row._id} row={row} index={i} canInteract={canInteract} onUpvote={upvote} />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      <SubmitGearModal open={submitOpen} onClose={() => setSubmitOpen(false)} onSubmit={submit} />
    </div>
  );
}

// ── Hero — top-upvoted gear as the centrepiece ───────────────────────────────
function HeroGear({ row, canInteract, onUpvote }: {
  row: CommunityListRow; canInteract: boolean; onUpvote: (id: string) => Promise<void>;
}) {
  const setGear = useAppStore(s => s.setGear);
  const tops = useAppStore(s => s.tops);
  const subs = useAppStore(s => s.subs);
  const [voted, setVoted] = useState(false);
  const meta = CAT_META[row.category];

  const handleUpvote = async () => {
    if (!canInteract || voted) return;
    feedback("success");
    setVoted(true);
    try { await onUpvote(row._id); }
    catch { setVoted(false); feedback("error"); }
  };

  const canImport = row.category === "tops" || row.category === "subs";
  const handleImport = () => {
    const gearItem: GearItem = {
      id: `community-${row._id}`,
      brand: row.brand, model: row.model, category: row.category, active: row.active,
      splMax: row.splMax, rmsWatts: row.rmsWatts, peakWatts: row.peakWatts,
      coverageH: row.coverageH, coverageV: row.coverageV,
      freqLow: row.freqLow, freqHigh: row.freqHigh, dspIntegrated: row.dspIntegrated, quantity: 1,
    };
    if (row.category === "tops") setGear("tops", [...tops, gearItem]);
    if (row.category === "subs") setGear("subs", [...subs, gearItem]);
    feedback("success");
    toast.success(`Agregado a tu gear: ${row.brand} ${row.model}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl overflow-hidden"
      style={{
        background: "#0F1012",
        boxShadow: "0 24px 60px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)",
      }}
      data-testid="community-hero"
    >
      <div className="p-8 md:p-10">
        {/* Whisper crown */}
        <div className="flex items-center justify-between gap-3 mb-5">
          <div className="flex items-center gap-2">
            <TrendingUp size={12} strokeWidth={1.75} style={{ color: meta.hue }} />
            <p className="text-[10px] uppercase tracking-[0.28em] font-medium" style={{ color: meta.hue }}>
              Top comunidad · {meta.label}
            </p>
          </div>
          {row.verified && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] font-medium"
              style={{
                color: HUE_VERIFIED,
                background: `${HUE_VERIFIED}12`,
                boxShadow: `0 0 0 1px ${HUE_VERIFIED}44`,
              }}
              data-testid={`community-verified-${row._id}`}
              title={`Verificado en campo · ${VERIFIED_UPVOTE_THRESHOLD}+ upvotes`}
            >
              <ShieldCheck size={10} strokeWidth={2} />
              Verificado
            </span>
          )}
        </div>

        {/* Brand + model — big */}
        <p className="text-[13px] text-muted-foreground mb-1.5">{row.brand}</p>
        <h2
          className="text-[1.75rem] md:text-[2.4rem] leading-[1.05] tracking-[-0.02em] font-medium text-foreground mb-1"
          data-testid={`community-row-${row._id}`}
        >
          {row.model}
        </h2>
        <p className="text-[12px] text-muted-foreground mb-8">
          por {row.submitterName ?? "anónimo"}
          {row.status === "pending" && <span className="ml-2 text-[#F5B62E]">· pendiente</span>}
          {row.active && <span className="ml-2">· activo</span>}
          {row.dspIntegrated && <span className="ml-2">· DSP</span>}
        </p>

        {/* Specs grid — big mono numbers */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 mb-8">
          <HeroSpec label="SPL máx" value={`${row.splMax}`} unit="dB" />
          {row.rmsWatts && <HeroSpec label="RMS" value={`${row.rmsWatts}`} unit="W" />}
          {row.coverageH && <HeroSpec label="Cobertura H" value={`${row.coverageH}`} unit="°" />}
          {row.freqLow && <HeroSpec label="Freq baja" value={`${row.freqLow}`} unit="Hz" />}
        </div>

        {/* Actions row */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleUpvote}
            disabled={!canInteract || voted}
            data-testid={`community-upvote-${row._id}`}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            )}
            style={{
              background: voted ? `${meta.hue}22` : "rgba(255,255,255,0.03)",
              boxShadow: voted ? `0 0 0 1px ${meta.hue}55` : "0 0 0 1px rgba(255,255,255,0.06)",
              color: voted ? meta.hue : "var(--foreground)",
              transition: "background-color 0.3s ease, box-shadow 0.3s ease",
            }}
          >
            <ThumbsUp size={13} strokeWidth={1.75} />
            <span className="font-mono tabular-nums">{row.upvotes + (voted ? 1 : 0)}</span>
            <span className="text-muted-foreground text-[11px]">votos</span>
          </button>
          {canImport && (
            <button
              onClick={handleImport}
              data-testid={`community-import-${row._id}`}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-medium cursor-pointer"
              style={{
                background: meta.hue,
                color: "var(--background)",
                transition: "background-color 0.3s ease",
              }}
            >
              <Sparkles size={13} strokeWidth={2} />
              Agregar a mi gear
              <ArrowRight size={13} strokeWidth={2} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function HeroSpec({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-medium mb-2">{label}</p>
      <p
        className="font-mono tabular-nums text-foreground leading-none"
        style={{ fontSize: "clamp(1.35rem, 2.2vw, 1.75rem)", letterSpacing: "-0.02em" }}
      >
        {value}
        <span className="text-[12px] text-muted-foreground ml-1.5 font-sans">{unit}</span>
      </p>
    </div>
  );
}

// ── Quiet list row for the rest ─────────────────────────────────────────────
function CommunityListRowView({ row, index, canInteract, onUpvote }: {
  row: CommunityListRow; index: number; canInteract: boolean; onUpvote: (id: string) => Promise<void>;
}) {
  const setGear = useAppStore(s => s.setGear);
  const tops = useAppStore(s => s.tops);
  const subs = useAppStore(s => s.subs);
  const [voted, setVoted] = useState(false);
  const meta = CAT_META[row.category];

  const handleUpvote = async () => {
    if (!canInteract || voted) return;
    feedback("success");
    setVoted(true);
    try { await onUpvote(row._id); }
    catch { setVoted(false); feedback("error"); }
  };

  const canImport = row.category === "tops" || row.category === "subs";
  const handleImport = () => {
    const gearItem: GearItem = {
      id: `community-${row._id}`,
      brand: row.brand, model: row.model, category: row.category, active: row.active,
      splMax: row.splMax, rmsWatts: row.rmsWatts, peakWatts: row.peakWatts,
      coverageH: row.coverageH, coverageV: row.coverageV,
      freqLow: row.freqLow, freqHigh: row.freqHigh, dspIntegrated: row.dspIntegrated, quantity: 1,
    };
    if (row.category === "tops") setGear("tops", [...tops, gearItem]);
    if (row.category === "subs") setGear("subs", [...subs, gearItem]);
    feedback("success");
    toast.success(`Agregado a tu gear: ${row.brand} ${row.model}`);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.05 * Math.min(index, 6), ease: [0.22, 1, 0.36, 1] }}
      className="grid grid-cols-[1fr_auto] md:grid-cols-[auto_1fr_auto_auto] gap-4 md:gap-6 items-center py-5"
      data-testid={`community-list-row-${row._id}`}
    >
      {/* Category chip (md+) */}
      <div className="hidden md:flex items-center">
        <span
          className="text-[10px] uppercase tracking-[0.22em] font-medium px-2.5 py-1 rounded-full"
          style={{ color: meta.hue, background: `${meta.hue}12`, boxShadow: `0 0 0 1px ${meta.hue}30` }}
        >
          {meta.label}
        </span>
      </div>

      {/* Brand + model + specs */}
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-foreground truncate flex items-center gap-2">
          <span className="truncate">
            <span className="text-muted-foreground font-normal">{row.brand}</span>
            <span className="mx-2 text-muted-foreground/40">·</span>
            {row.model}
          </span>
          {row.verified && (
            <ShieldCheck
              size={12}
              strokeWidth={2}
              className="shrink-0"
              style={{ color: HUE_VERIFIED }}
              aria-label="Verificado en campo"
              data-testid={`community-verified-${row._id}`}
            />
          )}
        </p>
        <div className="mt-1 flex gap-4 flex-wrap font-mono text-[11px] tabular-nums text-muted-foreground">
          <span>{row.splMax} <span className="text-muted-foreground/60">dB</span></span>
          {row.rmsWatts && <span>{row.rmsWatts} <span className="text-muted-foreground/60">W</span></span>}
          {row.coverageH && <span>{row.coverageH}° <span className="text-muted-foreground/60">H</span></span>}
          {row.freqLow && <span>{row.freqLow}–{row.freqHigh ?? "?"} <span className="text-muted-foreground/60">Hz</span></span>}
          <span className="text-muted-foreground/60">· por {row.submitterName ?? "anónimo"}</span>
        </div>
      </div>

      {/* Upvote */}
      <button
        onClick={handleUpvote}
        disabled={!canInteract || voted}
        data-testid={`community-upvote-${row._id}`}
        className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: voted ? `${meta.hue}22` : "rgba(255,255,255,0.02)",
          boxShadow: voted ? `0 0 0 1px ${meta.hue}55` : "0 0 0 1px rgba(255,255,255,0.05)",
          color: voted ? meta.hue : "#B0B3B8",
          transition: "background-color 0.3s ease, color 0.3s ease",
        }}
      >
        <ThumbsUp size={11} strokeWidth={1.75} />
        <span className="font-mono tabular-nums">{row.upvotes + (voted ? 1 : 0)}</span>
      </button>

      {/* Import */}
      {canImport ? (
        <button
          onClick={handleImport}
          data-testid={`community-import-${row._id}`}
          className="hidden md:inline-flex items-center gap-1.5 text-[12px] text-muted-foreground hover:text-foreground cursor-pointer"
          style={{ transition: "color 0.3s ease" }}
        >
          <Plus size={12} strokeWidth={1.75} />
          Mi gear
        </button>
      ) : (
        <span className="hidden md:block w-[64px]" />
      )}
    </motion.div>
  );
}

// ── Submit Gear Modal ───────────────────────────────────────────────────────
function SubmitGearModal({ open, onClose, onSubmit }: {
  open: boolean; onClose: () => void; onSubmit: (input: SubmitInput) => Promise<void>;
}) {
  const [form, setForm] = useState<{
    brand: string; model: string; category: CommunityCategoryLocal;
    active: boolean; rmsWatts: string; splMax: string;
    coverageH: string; freqLow: string; freqHigh: string; dspIntegrated: boolean;
  }>({
    brand: "", model: "", category: "tops", active: true,
    rmsWatts: "", splMax: "", coverageH: "", freqLow: "", freqHigh: "", dspIntegrated: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => !!(form.brand.trim() && form.model.trim() && form.splMax.trim()),
    [form],
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit({
        brand: form.brand.trim(), model: form.model.trim(), category: form.category,
        active: form.active,
        rmsWatts: form.rmsWatts ? parseFloat(form.rmsWatts) : undefined,
        splMax: parseFloat(form.splMax),
        coverageH: form.coverageH ? parseFloat(form.coverageH) : undefined,
        freqLow: form.freqLow ? parseFloat(form.freqLow) : undefined,
        freqHigh: form.freqHigh ? parseFloat(form.freqHigh) : undefined,
        dspIntegrated: form.dspIntegrated,
      });
      feedback("success");
      toast.success("¡Propuesta enviada! Aparecerá en 'Pendiente' hasta la revisión.");
      onClose();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "No se pudo enviar.";
      setError(msg);
      feedback("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-4"
          onClick={onClose}
          data-testid="submit-gear-overlay"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg rounded-2xl p-6 md:p-8 max-h-[85vh] overflow-y-auto"
            style={{
              background: "#121214",
              boxShadow: "0 30px 80px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-8">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-2">
                  Nuevo modelo
                </p>
                <h3 className="text-[1.4rem] leading-tight tracking-[-0.02em] font-medium text-foreground">
                  Proponer gear a la comunidad
                </h3>
              </div>
              <button
                onClick={onClose}
                data-testid="submit-gear-close"
                className="h-9 w-9 rounded-full flex items-center justify-center cursor-pointer shrink-0"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
                  transition: "background-color 0.3s ease",
                }}
              >
                <X size={13} strokeWidth={1.75} className="text-muted-foreground" />
              </button>
            </div>

            {/* Category */}
            <div className="mb-6">
              <p className="text-[10px] uppercase tracking-[0.22em] font-medium text-muted-foreground mb-3">Categoría</p>
              <div className="flex flex-wrap gap-1.5">
                {(Object.keys(CAT_META) as CommunityCategoryLocal[]).map(cat => {
                  const meta = CAT_META[cat];
                  const on = form.category === cat;
                  return (
                    <button
                      key={cat}
                      onClick={() => { feedback("tap"); setForm(f => ({ ...f, category: cat })); }}
                      data-testid={`submit-cat-${cat}`}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-[12px] font-medium cursor-pointer",
                        on ? "text-[#09090b]" : "text-muted-foreground hover:text-foreground"
                      )}
                      style={{
                        background: on ? meta.hue : "rgba(255,255,255,0.03)",
                        boxShadow: on ? "none" : "0 0 0 1px rgba(255,255,255,0.05)",
                        transition: "background-color 0.3s ease, color 0.3s ease",
                      }}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <TextField label="Marca" required value={form.brand} onChange={v => setForm(f => ({ ...f, brand: v }))} testId="submit-brand" />
              <TextField label="Modelo" required value={form.model} onChange={v => setForm(f => ({ ...f, model: v }))} testId="submit-model" />
              <TextField label="SPL máx (dB)" required value={form.splMax} onChange={v => setForm(f => ({ ...f, splMax: v }))} type="number" testId="submit-spl" />
              <TextField label="RMS (W)" value={form.rmsWatts} onChange={v => setForm(f => ({ ...f, rmsWatts: v }))} type="number" testId="submit-rms" />
              <TextField label="Cobertura H°" value={form.coverageH} onChange={v => setForm(f => ({ ...f, coverageH: v }))} type="number" testId="submit-covh" />
              <TextField label="Freq baja (Hz)" value={form.freqLow} onChange={v => setForm(f => ({ ...f, freqLow: v }))} type="number" testId="submit-freq-low" />
              <TextField label="Freq alta (Hz)" value={form.freqHigh} onChange={v => setForm(f => ({ ...f, freqHigh: v }))} type="number" testId="submit-freq-high" />
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6 mb-6">
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
                  data-testid="submit-active"
                  className="h-4 w-4 accent-[#C9F03E]"
                />
                <span className="text-[13px] text-foreground">Activo</span>
              </label>
              <label className="inline-flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.dspIntegrated}
                  onChange={(e) => setForm(f => ({ ...f, dspIntegrated: e.target.checked }))}
                  data-testid="submit-dsp"
                  className="h-4 w-4 accent-[#F5B62E]"
                />
                <span className="text-[13px] text-foreground">DSP integrado</span>
              </label>
            </div>

            {error && (
              <div
                className="rounded-xl px-4 py-3 mb-6 flex items-start gap-3"
                style={{ background: "rgba(180,92,110,0.08)", boxShadow: "0 0 0 1px rgba(180,92,110,0.25)" }}
              >
                <AlertTriangle size={13} className="text-[#FF6B4A] shrink-0 mt-0.5" strokeWidth={1.75} />
                <p className="text-[12px] text-[#FF6B4A]">{error}</p>
              </div>
            )}

            {/* Submit CTA */}
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || busy}
              data-testid="submit-gear-btn"
              className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-white text-[#09090b] hover:bg-white/90 py-3 text-[14px] font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ transition: "background-color 0.3s ease" }}
            >
              {busy
                ? "Enviando…"
                : <><Check size={14} strokeWidth={2} /> Enviar propuesta</>}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function TextField({ label, required, value, onChange, type = "text", testId }: {
  label: string; required?: boolean; value: string; onChange: (v: string) => void; type?: string; testId?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] uppercase tracking-[0.22em] font-medium text-muted-foreground mb-2">
        {label}{required && <span className="text-[#F5B62E] ml-1">·</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        data-testid={testId}
        className="w-full rounded-xl px-3.5 py-2.5 text-[13px] text-foreground focus:outline-none"
        style={{
          background: "rgba(255,255,255,0.03)",
          boxShadow: "0 0 0 1px rgba(255,255,255,0.05)",
          transition: "box-shadow 0.3s ease",
        }}
        onFocus={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(155,126,189,0.55)"; }}
        onBlur={(e) => { e.currentTarget.style.boxShadow = "0 0 0 1px rgba(255,255,255,0.05)"; }}
      />
    </div>
  );
}
