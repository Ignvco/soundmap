// Command Palette — Raycast-style ⌘K navigator + AI copilot entry point.
// Filterable list of everything you can DO in SoundMap. Keyboard-first.
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { Search, ArrowUpRight, Sparkles } from "lucide-react";
import { feedback } from "@/lib/feedback.ts";

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  section: "Diseñar" | "Ejecutar" | "Analizar" | "Biblioteca" | "Ajustes";
  path: string;
  keywords?: string[];
}

const COMMANDS: CommandItem[] = [
  { id: "spl-analysis", label: "SPL Analysis · 3D", section: "Analizar", path: "/spl-analysis", keywords: ["cobertura", "frecuencia"] },
  { id: "acoustic-analysis", label: "Acoustic Analysis", section: "Analizar", path: "/acoustic-analysis", keywords: ["rt60", "modos"] },
  { id: "ai-advisor", label: "AI Advisor", section: "Analizar", path: "/ai-advisor", keywords: ["ia", "intelligence"] },
  { id: "design", label: "Diseño del sistema", hint: "Wizard · Recinto → PA → DSP → Patch → Guardar", section: "Diseñar", path: "/design", keywords: ["recinto", "escaneo", "pa", "dsp", "stage", "canales", "wizard"] },
  { id: "design-room", label: "Wizard · Recinto", section: "Diseñar", path: "/design?step=room", keywords: ["dimensiones", "rt60", "materiales", "ar"] },
  { id: "design-pa", label: "Wizard · PA & Inventario", section: "Diseñar", path: "/design?step=pa", keywords: ["equipo", "tops", "subs", "amps"] },
  { id: "design-dsp", label: "Wizard · Cadena DSP", section: "Diseñar", path: "/design?step=dsp", keywords: ["eq", "xover", "delay"] },
  { id: "design-patch", label: "Wizard · Canales y patch", section: "Diseñar", path: "/design?step=patch" },
  { id: "design-save", label: "Wizard · Guardar & exportar", section: "Diseñar", path: "/design?step=save" },
  { id: "pa", label: "PA · Diseño avanzado", section: "Diseñar", path: "/pa", keywords: ["cobertura", "spl"] },
  { id: "stage-map", label: "Mapa de escenario", hint: "2D + 3D + Optimizer", section: "Diseñar", path: "/stage-map", keywords: ["stage", "3d", "optimizer"] },

  { id: "perform", label: "Perform Hub", hint: "SPL en vivo + escenas", section: "Ejecutar", path: "/perform", keywords: ["live", "hub"] },
  { id: "live", label: "Modo Live", hint: "SPL + grabación de sesión", section: "Ejecutar", path: "/live", keywords: ["spl", "leq", "rec"] },
  { id: "kiosk", label: "Kiosk FOH", hint: "Landscape · faders · panic mute", section: "Ejecutar", path: "/kiosk", keywords: ["panic", "faders", "big spl"] },

  { id: "compare", label: "Comparar A/B", hint: "Heatmap SPL diverging", section: "Analizar", path: "/compare", keywords: ["diff", "compare", "analiz"] },
  { id: "toolkit", label: "Toolkit", hint: "Cardioid · Line Array · Impedancia", section: "Analizar", path: "/toolkit", keywords: ["calc", "impedance"] },
  { id: "export", label: "Exportar reporte", hint: "PDF · CSV EU 2003/10/EC", section: "Analizar", path: "/export", keywords: ["pdf", "csv", "reporte"] },

  { id: "scenes", label: "Escenas guardadas", section: "Biblioteca", path: "/scenes", keywords: ["save", "load"] },
  { id: "templates", label: "Plantillas", hint: "5 rigs pre-hechos", section: "Biblioteca", path: "/templates", keywords: ["preset", "iglesia", "club"] },
  { id: "community", label: "Community Gear DB", section: "Biblioteca", path: "/community" },

  { id: "settings", label: "Ajustes", hint: "Audio · vibración · idioma · tour", section: "Ajustes", path: "/settings" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function CommandPalette({ open, onClose }: Props) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  // Filter commands
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return COMMANDS;
    return COMMANDS.filter(c => {
      const hay = [c.label, c.hint ?? "", c.section, ...(c.keywords ?? [])].join(" ").toLowerCase();
      return hay.includes(q);
    });
  }, [query]);

  // Group by section
  const grouped = useMemo(() => {
    const map: Record<string, CommandItem[]> = {};
    items.forEach(c => {
      (map[c.section] ||= []).push(c);
    });
    return map;
  }, [items]);

  // Auto-focus input on open, reset state on close
  useEffect(() => {
    if (open) {
      setQuery("");
      setActiveIdx(0);
      // Defer focus to after mount animation
      setTimeout(() => inputRef.current?.focus(), 80);
    }
  }, [open]);

  // Keyboard: ↑↓ nav + Enter run
  useEffect(() => {
    if (!open) return;
    const flat = items;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx(i => Math.min(flat.length - 1, i + 1)); }
      if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx(i => Math.max(0, i - 1)); }
      if (e.key === "Enter") {
        e.preventDefault();
        const c = flat[activeIdx];
        if (c) run(c);
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, items, activeIdx]);

  // Global ⌘K binding (mounted regardless of open state)
  useEffect(() => {
    const onGlobalKey = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === "k") {
        e.preventDefault();
        // Toggle: if already open, close; else open — the parent owns state so
        // we dispatch a custom event that pages can listen to. For simplicity
        // here we only open (parent handles).
        window.dispatchEvent(new CustomEvent("soundmap:openpalette"));
      }
    };
    document.addEventListener("keydown", onGlobalKey);
    return () => document.removeEventListener("keydown", onGlobalKey);
  }, []);

  const run = (c: CommandItem) => {
    feedback("select");
    onClose();
    navigate(c.path);
  };

  // Reset active idx when query changes so first result is highlighted
  useEffect(() => { setActiveIdx(0); }, [query]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-md flex items-start justify-center pt-24 px-4"
          onClick={onClose}
          data-testid="command-palette-overlay"
        >
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl bg-[#121214] overflow-hidden"
            style={{ boxShadow: "0 30px 80px -20px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-white/[0.05]">
              <Search size={16} className="text-muted-foreground shrink-0" strokeWidth={1.75} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                data-testid="palette-input"
                placeholder="Buscar acción, pantalla o pregunta…"
                className="flex-1 bg-transparent outline-none text-[15px] text-foreground placeholder:text-muted-foreground/60"
              />
              <kbd className="px-1.5 py-0.5 rounded-md bg-white/5 text-[10px] font-mono text-muted-foreground">ESC</kbd>
            </div>

            {/* Results */}
            <div className="max-h-[420px] overflow-y-auto py-2" data-testid="palette-results">
              {items.length === 0 ? (
                <div className="px-6 py-10 flex flex-col items-center text-center gap-3">
                  <Sparkles size={18} className="text-muted-foreground" strokeWidth={1.75} />
                  <p className="text-[13px] text-muted-foreground">Sin resultados para "{query}"</p>
                </div>
              ) : (
                Object.entries(grouped).map(([section, cmds]) => (
                  <div key={section} className="px-1.5 py-1.5">
                    <p className="px-4 py-1.5 text-[10px] uppercase tracking-[0.22em] font-medium text-muted-foreground">{section}</p>
                    {cmds.map((c) => {
                      const idxInFlat = items.indexOf(c);
                      const active = idxInFlat === activeIdx;
                      return (
                        <button
                          key={c.id}
                          onMouseEnter={() => setActiveIdx(idxInFlat)}
                          onClick={() => run(c)}
                          data-testid={`palette-item-${c.id}`}
                          className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl text-left cursor-pointer"
                          style={{
                            background: active ? "rgba(255,255,255,0.05)" : "transparent",
                            transition: "background-color 0.18s ease",
                          }}
                        >
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] text-foreground truncate">{c.label}</p>
                            {c.hint && <p className="text-[11px] text-muted-foreground truncate">{c.hint}</p>}
                          </div>
                          {active && <ArrowUpRight size={13} className="text-muted-foreground shrink-0 ml-3" strokeWidth={1.75} />}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-2.5 border-t border-white/[0.05] flex items-center justify-between text-[10px] text-muted-foreground font-mono">
              <span className="flex items-center gap-3">
                <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/5">↑↓</kbd> navegar</span>
                <span className="flex items-center gap-1"><kbd className="px-1 rounded bg-white/5">↵</kbd> abrir</span>
                <span className="flex items-center gap-1 hidden sm:inline-flex"><kbd className="px-1 rounded bg-white/5">⌘K</kbd> alternar</span>
              </span>
              <span>{items.length} resultado{items.length === 1 ? "" : "s"}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
