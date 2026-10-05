// Public shared scene viewer — DEPRECATED after Convex kill.
// Kept as a friendly stub that tells the visitor to use the JSON import flow
// instead. Prevents 404s from bookmarked share URLs.
import { useNavigate } from "react-router-dom";
import { motion } from "motion/react";
import { FileJson, ArrowRight } from "lucide-react";
import { feedback } from "@/lib/feedback.ts";

export default function SharedScenePage() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background text-foreground px-6 md:px-12 pt-10 md:pt-16 pb-24">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <p className="text-[11px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-4">
            Escena compartida
          </p>
          <h1
            className="text-[2rem] md:text-[2.8rem] leading-[1.05] tracking-[-0.03em] font-medium mb-3"
            data-testid="shared-scene-title"
          >
            Este enlace ya no está activo
          </h1>
          <p className="text-[15px] text-muted-foreground max-w-xl leading-relaxed mb-8">
            SoundMap ahora funciona 100% local. Pedile al que compartió la escena
            que te pase el archivo <span className="text-foreground font-medium">.json</span>
            desde <span className="text-foreground font-medium">Escenas → Compartir</span> y
            lo importás desde <span className="text-foreground font-medium">Ajustes → Backup</span>.
          </p>

          <div
            className="rounded-2xl px-5 py-4 flex items-start gap-3 mb-8"
            style={{ background: "rgba(74,107,255,0.06)", boxShadow: "0 0 0 1px rgba(74,107,255,0.25)" }}
          >
            <FileJson size={16} className="text-[#4A6BFF] shrink-0 mt-0.5" strokeWidth={1.75} />
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Los archivos JSON contienen la configuración completa (recinto, gear, DSP) y
              funcionan offline entre cualquier par de dispositivos.
            </p>
          </div>

          <button
            onClick={() => { feedback("select"); navigate("/"); }}
            data-testid="shared-scene-home"
            className="inline-flex items-center gap-2 rounded-full bg-[#C9F03E] text-[#09090b] px-5 py-2.5 text-[13px] font-medium cursor-pointer"
            style={{ transition: "background-color 0.3s ease" }}
          >
            Ir al inicio
            <ArrowRight size={13} strokeWidth={2} />
          </button>
        </motion.div>
      </div>
    </div>
  );
}
