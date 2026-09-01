// SoundMap — Demo Mode Banner
import { motion } from "motion/react";
import { useAppStore } from "@/store/app.ts";
import { FlaskConical, X } from "lucide-react";

export function DemoBanner() {
  const { isDemoMode, resetSystem } = useAppStore();

  if (!isDemoMode) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="mx-4 mt-2 mb-1 flex items-center gap-2.5 rounded-xl border border-accent/30 bg-accent/10 px-3.5 py-2.5"
    >
      <FlaskConical size={14} className="text-accent shrink-0" />
      <span className="flex-1 text-[11px] font-semibold text-accent">
        Modo demo — The Warehouse Club (400 personas)
      </span>
      <button
        onClick={resetSystem}
        className="h-5 w-5 flex items-center justify-center rounded-md hover:bg-foreground/8 transition-colors cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <X size={12} />
      </button>
    </motion.div>
  );
}
