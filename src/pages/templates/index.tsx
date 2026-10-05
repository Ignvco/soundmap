// SoundMap — Templates catalogue
// Pre-configured starting points for common venue types.
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Church, Music, Presentation, Tent, Drama, ChevronRight, Users, Layers, Volume2, Sparkles } from "lucide-react";
import { ScreenShell, Badge } from "@/components/soundmap/ui.tsx";
import { useAppStore } from "@/store/app.ts";
import { TEMPLATES, type Template } from "@/lib/audio/templates.ts";
import { calculateAcoustics } from "@/lib/audio/acoustics.ts";
import { feedback } from "@/lib/feedback.ts";
import { toast } from "sonner";

const ICON_MAP = {
  church: Church,
  club: Music,
  corporate: Presentation,
  festival: Tent,
  theater: Drama,
} as const;

export default function Templates() {
  const applyTemplate = useAppStore(s => s.applyTemplate);
  const navigate = useNavigate();

  const handleApply = (tpl: Template) => {
    feedback("success");
    applyTemplate(tpl);
    toast.success(`Plantilla aplicada: ${tpl.name}`);
    navigate("/");
  };

  return (
    <ScreenShell>
      {/* Vitals header */}
      <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-2">Biblioteca</p>
          <h1 className="text-[1.6rem] md:text-[2.1rem] leading-[1.05] tracking-[-0.03em] font-medium text-foreground" data-testid="page-header-title">
            Plantillas
          </h1>
          <p className="text-[13px] text-muted-foreground mt-1">Punto de partida por tipo de servicio</p>
        </div>
        <div
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-medium"
          style={{ background: "rgba(201,240,62,0.12)", color: "var(--sm-accent)", boxShadow: "0 0 0 1px rgba(201,240,62,0.30)" }}
        >
          <Sparkles size={11} strokeWidth={2} />
          {TEMPLATES.length} listas
        </div>
      </div>

      <div className="pb-6 space-y-4">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <div
            className="rounded-2xl p-4"
            style={{ background: "rgba(201,240,62,0.05)", boxShadow: "0 0 0 1px rgba(201,240,62,0.20)" }}
          >
            <div className="flex items-start gap-3">
              <div
                className="h-10 w-10 rounded-full flex items-center justify-center shrink-0"
                style={{ background: "rgba(201,240,62,0.15)", color: "var(--sm-accent)" }}
              >
                <Sparkles size={15} strokeWidth={1.75} />
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-foreground mb-1">Punto de partida instantáneo</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Cada plantilla incluye recinto pre-configurado + gear pool típico. Aplicala y ajustá lo que necesites — 100% editable.
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {TEMPLATES.map((tpl, idx) => {
            const Icon = ICON_MAP[tpl.category];
            const totalGear = tpl.tops.reduce((s, g) => s + (g.quantity ?? 1), 0)
                            + tpl.subs.reduce((s, g) => s + (g.quantity ?? 1), 0)
                            + tpl.monitors.reduce((s, g) => s + (g.quantity ?? 1), 0);
            const preview = calculateAcoustics(tpl.room);
            return (
              <motion.div
                key={tpl.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <div
                  className="rounded-2xl overflow-hidden"
                  style={{ background: "var(--card)", boxShadow: "0 0 0 1px rgba(255,255,255,0.05)" }}
                >
                  {/* Header */}
                  <div className="p-4 pb-3">
                    <div className="flex items-start gap-3 mb-3">
                      <div
                        className="h-11 w-11 rounded-2xl flex items-center justify-center shrink-0"
                        style={{ background: "rgba(201,240,62,0.12)", color: "var(--sm-accent)" }}
                      >
                        <Icon size={18} strokeWidth={1.75} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-foreground leading-tight" data-testid={`tpl-name-${tpl.id}`}>
                          {tpl.name}
                        </p>
                        <p className="text-[10px] font-medium uppercase tracking-[0.24em] mt-1 text-muted-foreground">
                          {tpl.serviceType}
                        </p>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{tpl.description}</p>
                  </div>

                  {/* Metrics — Vitals hairline row */}
                  <div className="grid grid-cols-4 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    {[
                      { icon: Users, value: tpl.room.capacity, label: "pax" },
                      { icon: Volume2, value: `${preview.rt60Audience}s`, label: "RT60" },
                      { icon: Layers, value: `${totalGear}×`, label: "gear" },
                      { icon: Sparkles, value: `${tpl.room.length}×${tpl.room.width}`, label: "m" },
                    ].map((m, i, arr) => {
                      const MI = m.icon;
                      return (
                        <div
                          key={i}
                          className="flex flex-col items-center py-3 gap-0.5"
                          style={{ borderRight: i < arr.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
                        >
                          <MI size={11} className="text-muted-foreground" strokeWidth={1.75} />
                          <span className="text-[13px] font-medium text-foreground font-mono tabular-nums">{m.value}</span>
                          <span className="text-[9px] font-medium text-muted-foreground uppercase tracking-[0.2em]">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Ideal for */}
                  <div className="px-4 py-3 border-t" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
                    <p className="text-[10px] font-medium uppercase tracking-[0.24em] text-muted-foreground mb-2">Ideal para</p>
                    <ul className="space-y-1.5">
                      {tpl.ideal.slice(0, 3).map((line, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-1.5 h-1 w-1 rounded-full shrink-0" style={{ background: "var(--sm-accent)" }} />
                          <span className="text-[11px] text-muted-foreground leading-snug">{line}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Gear badges */}
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5">
                    {tpl.tops.length > 0 && <Badge color="accent">{tpl.tops.reduce((s, g) => s + (g.quantity ?? 1), 0)}× Tops</Badge>}
                    {tpl.subs.length > 0 && <Badge color="accent">{tpl.subs.reduce((s, g) => s + (g.quantity ?? 1), 0)}× Subs</Badge>}
                    {tpl.monitors.length > 0 && <Badge color="accent">{tpl.monitors.reduce((s, g) => s + (g.quantity ?? 1), 0)}× Mon</Badge>}
                    {tpl.mics.length > 0 && <Badge color="gray">{tpl.mics.reduce((s, g) => s + (g.quantity ?? 1), 0)}× Mic</Badge>}
                  </div>

                  {/* CTA */}
                  <div className="px-4 pb-4">
                    <button
                      onClick={() => handleApply(tpl)}
                      data-testid={`tpl-apply-${tpl.id}`}
                      className="w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-[13px] font-medium cursor-pointer hover:brightness-105 active:scale-[0.98]"
                      style={{
                        background: "var(--sm-accent)",
                        color: "var(--background)",
                        boxShadow: "0 12px 32px -12px rgba(201,240,62,0.45)",
                        transition: "filter 0.2s ease, transform 0.15s ease",
                      }}
                    >
                      Aplicar plantilla
                      <ChevronRight size={13} strokeWidth={2} />
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </ScreenShell>
  );
}
