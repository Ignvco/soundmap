// AI System Advisor — floating button + slide-in dark chat panel.
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Sparkles, X, Send, Square, RotateCcw, AudioWaveform, AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils.ts";
import { useAdvisorChat } from "./use-advisor-chat.ts";
import { AdvisorMarkdown } from "./advisor-markdown.tsx";
import { useAppStore } from "@/store/app.ts";

const SUGGESTIONS = [
  "¿Por qué mi RT60 es tan alto?",
  "¿Qué subs debería agregar?",
  "¿Cómo corrijo el riesgo de eco?",
  "Revisá mi configuración de PA",
];

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="h-1.5 w-1.5 rounded-full bg-accent"
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
        />
      ))}
    </div>
  );
}

function AdvisorPanel({ onClose }: { onClose: () => void }) {
  const { messages, isStreaming, error, send, stop, reset } = useAdvisorChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const room = useAppStore((s) => s.room);
  const hasMessages = messages.length > 0;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isStreaming) return;
    void send(input);
    setInput("");
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 24, scale: 0.96 }}
      transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] as const }}
      className="fixed z-[70] flex flex-col overflow-hidden bg-[#050706] text-zinc-100 shadow-[0_24px_80px_rgba(0,0,0,0.5)]
        inset-x-0 bottom-0 top-0 rounded-none
        sm:inset-auto sm:bottom-6 sm:right-6 sm:top-auto sm:h-[640px] sm:max-h-[85vh] sm:w-[420px] sm:rounded-xl sm:border sm:border-[var(--border)]"
    >
      {/* Header */}
      <div className="relative flex items-center justify-between border-b border-[var(--border)] px-5 py-4">
        <div
          className="absolute inset-0 pointer-events-none opacity-60"
          style={{ background: "radial-gradient(120% 100% at 0% 0%, var(--accent-dim) 0%, transparent 55%)" }}
        />
        <div className="relative flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center r-control"
            style={{ background: "var(--accent-dim)", color: "var(--accent)" }}>
            <AudioWaveform size={17} strokeWidth={2} />
          </div>
          <div>
            <p className="text-[14px] font-semibold leading-none text-white tracking-[-0.01em]">SoundMap Intelligence</p>
            <p className="mt-1 text-[11px] leading-none text-zinc-400">
              {room ? room.name : "Sin recinto cargado"}
            </p>
          </div>
        </div>
        <div className="relative flex items-center gap-1">
          {hasMessages && (
            <button
              onClick={reset}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
              aria-label="Reiniciar conversación"
            >
              <RotateCcw size={15} />
            </button>
          )}
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 transition-colors hover:bg-white/10 hover:text-white cursor-pointer"
            aria-label="Cerrar"
          >
            <X size={17} />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-5 space-y-4">
        {!hasMessages && (
          <div className="flex flex-col items-center text-center px-4 pt-6">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/15 mb-4">
              <Sparkles size={26} className="text-accent" />
            </div>
            <p className="text-base font-bold text-white">¿En qué te ayudo con tu sistema?</p>
            <p className="mt-1.5 text-[12px] leading-relaxed text-zinc-400 max-w-[280px]">
              Conozco tu recinto, su acústica y tu equipo. Preguntame lo que quieras sobre tu sistema de audio.
            </p>
            <div className="mt-5 grid w-full gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => void send(s)}
                  className="rounded-xl border border-[#222423] bg-white/[0.03] px-3.5 py-2.5 text-left text-[12.5px] font-medium text-zinc-200 transition-all hover:border-accent/40 hover:bg-white/[0.06] active:scale-[0.98] cursor-pointer"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            {m.role === "user" ? (
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-[13px] font-medium leading-relaxed text-accent-foreground">
                {m.content}
              </div>
            ) : (
              <div className="max-w-[90%] rounded-2xl rounded-bl-md border border-[#222423] bg-white/[0.04] px-3.5 py-3">
                {m.content ? <AdvisorMarkdown content={m.content} /> : <TypingDots />}
              </div>
            )}
          </div>
        ))}

        {error && (
          <div className="flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-3 text-[12px] text-red-300">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-[#222423] bg-[#050706] p-3">
        <form onSubmit={handleSubmit} className="flex items-end gap-2">
          <div className="flex flex-1 items-center rounded-2xl border border-[#222423] bg-white/[0.04] px-3.5 py-2.5 focus-within:border-accent/50 transition-colors">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Preguntale a SoundMap..."
              className="w-full bg-transparent text-[13px] text-white placeholder:text-zinc-500 focus:outline-none"
            />
          </div>
          {isStreaming ? (
            <button
              type="button"
              onClick={stop}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/10 text-white transition-colors hover:bg-white/20 cursor-pointer"
              aria-label="Detener"
            >
              <Square size={16} className="fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim()}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent text-accent-foreground transition-all hover:bg-[#00D95A] active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              aria-label="Enviar"
            >
              <Send size={16} />
            </button>
          )}
        </form>
        <p className="mt-2 text-center text-[10px] text-zinc-600">
          La IA puede equivocarse. Verificá las decisiones críticas.
        </p>
      </div>
    </motion.div>
  );
}

export function AdvisorWidget() {
  const [open, setOpen] = useState(false);

  // La cabecera de la Home V6 tiene un botón "AI Advisor". El advisor todavía
  // es un widget flotante (se convierte en pantalla en la Fase 11), así que se
  // abre por evento en vez de duplicar el estado o levantarlo al shell.
  useEffect(() => {
    const openAdvisor = () => setOpen(true);
    window.addEventListener("soundmap:openadvisor", openAdvisor);
    return () => window.removeEventListener("soundmap:openadvisor", openAdvisor);
  }, []);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            key="advisor-fab"
            initial={{ opacity: 0, scale: 0.6 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] as const }}
            onClick={() => setOpen(true)}
            data-tour="advisor"
            className="fixed bottom-32 right-4 z-[60] flex items-center gap-2 rounded-full py-2.5 pl-2.5 pr-4 text-white cursor-pointer md:bottom-6 md:right-6"
            style={{ background: "var(--surface-1)", boxShadow: "var(--elev-2)" }}
            aria-label="Abrir SoundMap Intelligence"
          >
            <span
              className="relative flex h-7 w-7 items-center justify-center rounded-full"
              style={{ background: "var(--accent-dim)", color: "var(--accent)" }}
            >
              <Sparkles size={14} strokeWidth={2} />
            </span>
            <span className="text-[13px] font-medium tracking-[-0.01em]">Intelligence</span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-[65] bg-black/40 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none"
            />
            <AdvisorPanel onClose={() => setOpen(false)} />
          </>
        )}
      </AnimatePresence>
    </>
  );
}
