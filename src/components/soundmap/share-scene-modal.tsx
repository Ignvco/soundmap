// Share Scene Modal — LOCAL-ONLY.
// After killing Convex, sharing works by downloading the scene as a JSON file
// that another SoundMap user can import via Settings → Backup → Importar.
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, Check, FileJson } from "lucide-react";
import { feedback } from "@/lib/feedback.ts";
import type { Scene } from "@/store/app.ts";
import { toast } from "sonner";

interface Props {
  open: boolean;
  scene: Scene | null;
  onClose: () => void;
}

export function ShareSceneModal({ open, scene, onClose }: Props) {
  const [downloaded, setDownloaded] = useState(false);

  useEffect(() => { if (!open) setDownloaded(false); }, [open]);

  const download = () => {
    if (!scene) return;
    feedback("success");
    const payload = {
      _kind: "soundmap.scene",
      _version: 1,
      exportedAt: new Date().toISOString(),
      scene,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `soundmap-scene-${scene.name.replace(/\s+/g, "-").toLowerCase()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloaded(true);
    toast.success("Escena descargada como JSON");
  };

  return (
    <AnimatePresence>
      {open && scene && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-md flex items-end md:items-center justify-center p-4"
          onClick={onClose}
          data-testid="share-scene-overlay"
        >
          <motion.div
            initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl p-7"
            style={{
              background: "#121214",
              boxShadow: "0 30px 80px -10px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05)",
            }}
          >
            <div className="flex items-start justify-between mb-6">
              <div>
                <p className="text-[10px] uppercase tracking-[0.28em] font-medium text-muted-foreground mb-2">
                  Compartir escena
                </p>
                <h3 className="text-[1.3rem] leading-tight tracking-[-0.02em] font-medium text-foreground">
                  {scene.name}
                </h3>
                <p className="text-[12px] text-muted-foreground mt-1">{scene.room.name}</p>
              </div>
              <button
                onClick={onClose}
                data-testid="share-scene-close"
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

            <div
              className="rounded-xl px-5 py-4 flex items-start gap-3 mb-6"
              style={{ background: "rgba(74,107,255,0.06)", boxShadow: "0 0 0 1px rgba(74,107,255,0.25)" }}
            >
              <FileJson size={16} className="text-[#4A6BFF] shrink-0 mt-0.5" strokeWidth={1.75} />
              <p className="text-[12px] text-muted-foreground leading-relaxed">
                Descargá la escena como archivo JSON.
                Otro técnico puede importarla desde <span className="text-foreground font-medium">Ajustes → Backup → Importar</span>.
              </p>
            </div>

            <button
              onClick={download}
              data-testid="share-scene-download"
              disabled={downloaded}
              className="w-full inline-flex items-center justify-center gap-2 rounded-full py-3 text-[14px] font-medium cursor-pointer disabled:opacity-70"
              style={{
                background: downloaded ? "rgba(201,240,62,0.15)" : "var(--sm-accent)",
                color: downloaded ? "var(--sm-accent)" : "var(--background)",
                boxShadow: downloaded ? "0 0 0 1px rgba(201,240,62,0.45)" : "none",
                transition: "background-color 0.3s ease",
              }}
            >
              {downloaded ? <><Check size={14} strokeWidth={2} /> Descargado</> : <><Download size={14} strokeWidth={2} /> Descargar JSON</>}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
