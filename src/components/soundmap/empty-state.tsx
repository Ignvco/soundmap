// SoundMap — Shared Empty Room State Component
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { Scan, Zap, FlaskConical } from "lucide-react";
import { useAppStore } from "@/store/app.ts";
import { GlassCard } from "@/components/soundmap/ui.tsx";
import { DemoBanner } from "@/components/soundmap/demo-banner.tsx";
import { PageHeader } from "@/components/soundmap/nav.tsx";
import { ScreenShell } from "@/components/soundmap/ui.tsx";
import { useInWizard } from "@/lib/wizard-context.ts";

interface EmptyRoomStateProps {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  description: string;
  /** The next step to guide users toward (default: room scan) */
  requiredStep?: "room" | "gear";
}

export function EmptyRoomState({
  title,
  icon: Icon,
  iconColor,
  description,
  requiredStep = "room",
}: EmptyRoomStateProps) {
  const { loadDemoVenue } = useAppStore();
  const inWizard = useInWizard();

  return (
    <ScreenShell compact={inWizard}>
      {!inWizard && <PageHeader title={title} subtitle="Sin sala cargada" />}
      <DemoBanner />
      <div className="px-4 pt-2 space-y-3">
        {/* Main empty card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as const }}
        >
          <GlassCard className="p-6 overflow-hidden relative">
            {/* Background glow */}
            <div
              className="absolute -top-8 -right-8 w-40 h-40 rounded-full pointer-events-none"
              style={{ background: `radial-gradient(circle, ${iconColor}22 0%, transparent 70%)` }}
            />
            <div className="relative flex flex-col items-center text-center">
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center mb-4"
                style={{ background: `${iconColor}1F`, border: `1px solid ${iconColor}33` }}
              >
                <Icon size={28} style={{ color: iconColor }} />
              </div>
              <p className="text-base font-medium text-foreground mb-1.5">Sin Sala Cargada</p>
              <p className="text-xs text-muted-foreground leading-relaxed mb-6 max-w-xs">{description}</p>

              <div className="flex flex-col sm:flex-row gap-2.5 w-full max-w-xs">
                {requiredStep === "room" ? (
                  <Link to="/design?step=room" className="flex-1">
                    <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_4px_16px_rgba(15,15,15,0.18)] hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer">
                      <Scan size={14} />
                      Escanear Sala
                    </button>
                  </Link>
                ) : (
                  <Link to="/design?step=pa" className="flex-1">
                    <button className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-bold text-primary-foreground shadow-[0_4px_16px_rgba(15,15,15,0.18)] hover:bg-primary/90 active:scale-[0.98] transition-all cursor-pointer">
                      <Zap size={14} />
                      Armar Equipo
                    </button>
                  </Link>
                )}
                <button
                  onClick={loadDemoVenue}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-accent/30 bg-accent/10 px-5 py-3 text-sm font-bold text-accent hover:bg-accent/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <FlaskConical size={14} />
                  Cargar Demo
                </button>
              </div>
            </div>
          </GlassCard>
        </motion.div>

      </div>
    </ScreenShell>
  );
}
