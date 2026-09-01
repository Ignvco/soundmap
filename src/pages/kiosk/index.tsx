// SoundMap — Kiosk FOH Mode
// Landscape-optimised console for live front-of-house work.
//
// Features:
//  - Huge stadium-style SPL display (from device mic via useSPLMeter)
//  - Virtual faders per DSP output (visual reference — does NOT drive real
//    hardware, but mirrors the derived DSPOutput chain so the operator has a
//    consistent mental model on stage).
//  - Panic-mute: single big red button that snaps every fader to -inf and
//    shows a full-screen MUTED banner. Second press restores previous positions.
//  - Fullscreen toggle (Fullscreen API) — hides all system chrome.
//  - Wake-lock keeps the phone screen ON while the console is active
//    (via the standard Screen Wake Lock API, no plugins).
import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { X, Maximize2, Minimize2, Volume2, Timer, Flag, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAppStore } from "@/store/app.ts";
import { useSPLMeter, type SPLState } from "@/hooks/use-spl-meter.ts";
import { generateDSPConfig } from "@/lib/audio/dsp-engine.ts";
import type { DSPOutput } from "@/lib/audio/dsp-engine.ts";
import { feedback } from "@/lib/feedback.ts";
import { cn } from "@/lib/utils.ts";
import { Capacitor } from "@capacitor/core";

// El kiosk conservaba la paleta neón legacy (var(--accent), var(--accent), var(--info),
// var(--destructive)) que ya se había purgado del resto de la app. Ahora usa los tokens.
// El color agrupa por ROL, no por número de salida: de un vistazo, en la
// oscuridad, querés distinguir tops de subs de monitores — no OUT-C de OUT-D.
function colorOf(role: DSPOutput["role"]): string {
  switch (role) {
    case "sub":     return "var(--sm-blue)";  // azul — graves
    case "monitor": return "var(--sm-amber)";  // ámbar — cuñas
    default:        return "var(--sm-accent)";  // lime — tops
  }
}

/**
 * Color por nivel. Los umbrales salen de `use-spl-meter` y siguen criterios de
 * exposición: 92 dB(A) es el entorno de los límites de jornada laboral, 105 es
 * zona de daño rápido, 120 es umbral de dolor.
 */
function bandColor(band: string) {
  switch (band) {
    case "clip": return "#FF3B30";  // rojo — dolor
    case "hot":  return "var(--sm-warm)";  // naranja — daño rápido
    case "loud": return "var(--sm-amber)";  // ámbar — límite de jornada
    case "moderate": return "var(--sm-accent)";
    default: return "var(--sm-muted)";
  }
}

/** Cuántos faders entran a lo ancho sin volverse ilegibles en horizontal. */
const MAX_VISIBLE_FADERS = 8;

function stateLabel(s: SPLState) {
  switch (s) {
    case "running":  return "MIC LIVE";
    case "starting": return "STARTING…";
    case "denied":   return "MIC BLOCKED";
    case "error":    return "MIC ERROR";
    default:         return "MIC OFF";
  }
}

// ── Fader ───────────────────────────────────────────────────────────────────
interface FaderProps {
  output: DSPOutput;
  value: number;      // dB, from -60 to +6
  muted: boolean;
  onChange: (dB: number) => void;
  onToggleMute: () => void;
  testId: string;
}
function Fader({ output, value, muted, onChange, onToggleMute, testId }: FaderProps) {
  const color = colorOf(output.role);
  const trackRef = useRef<HTMLDivElement | null>(null);
  // Fader travel: -60 dB → +6 dB linearly, 0 dB is around 90% up
  const MIN = -60;
  const MAX = 6;
  const knobPct = (value - MIN) / (MAX - MIN); // 0..1

  const setFromEvent = (clientY: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const rel = 1 - (clientY - rect.top) / rect.height; // 0 bottom → 1 top
    const clamped = Math.max(0, Math.min(1, rel));
    const dB = Math.round((MIN + clamped * (MAX - MIN)) * 10) / 10;
    onChange(dB);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setFromEvent(e.clientY);
    feedback("tap");
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1) return;
    setFromEvent(e.clientY);
  };

  return (
    <div className="flex flex-col items-center gap-2 min-w-0" data-testid={testId}>
      <p className="text-[9px] font-medium uppercase tracking-[0.28em] truncate max-w-[76px]" style={{ color }}>
        {output.label.replace("OUT-", "")}
      </p>
      <p className="text-[8px] text-muted-foreground truncate max-w-[76px]">{output.destination}</p>
      <div
        ref={trackRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        className="relative h-40 w-8 rounded-full border border-border cursor-pointer touch-none"
        style={{
          background: "var(--surface-1)",
          boxShadow: `inset 0 2px 8px rgba(0,0,0,0.6), 0 0 0 1px ${color}20`,
        }}
      >
        {/* travel scale ticks */}
        {[0, 0.25, 0.5, 0.75, 1].map(t => (
          <span
            key={t}
            className="absolute left-full ml-1 h-px w-1.5 bg-border"
            style={{ bottom: `${t * 100}%` }}
          />
        ))}
        {/* Fill */}
        <div
          className="absolute left-1 right-1 bottom-1 rounded-full transition-opacity"
          style={{
            top: `${(1 - knobPct) * 100}%`,
            background: `linear-gradient(180deg, ${color}70, ${color}20)`,
            opacity: muted ? 0.25 : 1,
          }}
        />
        {/* Knob */}
        <motion.div
          className="absolute left-1/2 -translate-x-1/2 w-9 h-5 rounded-md border border-border shadow-lg flex items-center justify-center"
          style={{
            top: `calc(${(1 - knobPct) * 100}% - 10px)`,
            background: muted ? "#1A1D22" : `linear-gradient(180deg, #2A2E35, #16181C)`,
            boxShadow: muted ? "none" : `0 2px 8px ${color}44, inset 0 1px 0 rgba(255,255,255,0.08)`,
          }}
          animate={{ scale: muted ? 0.9 : 1 }}
          transition={{ duration: 0.15 }}
        >
          <span className="text-[8px] font-mono font-medium tabular-nums" style={{ color: muted ? "#666" : color }}>
            {value >= 0 ? "+" : ""}{value.toFixed(1)}
          </span>
        </motion.div>
      </div>
      <button
        onClick={onToggleMute}
        data-testid={`${testId}-mute`}
        className={cn(
          "rounded-lg px-2 py-1 border text-[9px] font-medium uppercase tracking-[0.28em] cursor-pointer active:scale-90 transition-all",
          muted
            ? "bg-destructive/25 border-destructive/50 text-destructive shadow-[0_0_12px_rgba(255,77,109,0.4)]"
            : "bg-secondary/60 border-border text-muted-foreground hover:text-foreground",
        )}
      >
        {muted ? "MUTED" : "MUTE"}
      </button>
    </div>
  );
}

// ── Timer ───────────────────────────────────────────────────────────────────
function useElapsedTimer(active: boolean) {
  const [elapsed, setElapsed] = useState(0);
  const accumulatedRef = useRef(0);
  const startRef = useRef<number | null>(null);
  useEffect(() => {
    // Antes se reseteaba a 0 al parar el micrófono: pausabas el medidor y
    // perdías el tiempo de sesión, que es justo el dato con el que se estima
    // exposición acumulada. Ahora se acumula entre pausas.
    if (!active) {
      startRef.current = null;
      return;
    }
    const startedAt = Date.now();
    startRef.current = startedAt;
    const id = setInterval(() => {
      setElapsed(accumulatedRef.current + Math.floor((Date.now() - startedAt) / 1000));
    }, 500);
    return () => {
      clearInterval(id);
      accumulatedRef.current += Math.floor((Date.now() - startedAt) / 1000);
    };
  }, [active]);
  const h = Math.floor(elapsed / 3600);
  const m = Math.floor((elapsed % 3600) / 60);
  const s = elapsed % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ── Screen Wake Lock ────────────────────────────────────────────────────────
function useWakeLock(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let lock: WakeLockSentinel | null = null;
    const request = async () => {
      try {
        if ("wakeLock" in navigator) {
          lock = await (navigator as Navigator & { wakeLock: WakeLock }).wakeLock.request("screen");
        }
      } catch {
        /* not supported / user hasn't gestured yet */
      }
    };
    request();
    const onVis = () => {
      if (document.visibilityState === "visible") request();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      if (lock) {
        try { lock.release(); } catch { /* ignore */ }
      }
    };
  }, [enabled]);
}

// ── Kiosk Page ──────────────────────────────────────────────────────────────
export default function KioskPage() {
  const navigate = useNavigate();
  const { room, acoustics, tops, subs, monitors, dspUnits, amps } = useAppStore();
  const dsp = useMemo(
    () => (room && acoustics ? generateDSPConfig(room, acoustics, tops, subs, monitors, dspUnits[0] ?? null, amps) : null),
    [room, acoustics, tops, subs, monitors, dspUnits, amps]
  );
  const outputs = dsp?.outputs ?? [];

  // Fader positions in dB (init at each output's gain)
  const [faders, setFaders] = useState<Record<string, number>>({});
  const [mutes, setMutes] = useState<Record<string, boolean>>({});
  const [fullscreen, setFullscreen] = useState(false);
  // Marcas de sesión: anotar el pico de un tema sin soltar el kiosk.
  const [marks, setMarks] = useState<{ at: number; time: string; spl: number }[]>([]);

  useEffect(() => {
    const init: Record<string, number> = {};
    outputs.forEach(o => { init[o.id] = o.gain; });
    setFaders(init);
    setMutes({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outputs.length, outputs.map(o => o.id).join(",")]);

  const spl = useSPLMeter();
  // Sólo mantener la pantalla encendida mientras el medidor corre de verdad.
  useWakeLock(spl.state === "running");
  const timer = useElapsedTimer(spl.state === "running");

  const handleFader = (id: string, dB: number) => {
    setFaders(prev => ({ ...prev, [id]: dB }));
  };
  const markMoment = () => {
    feedback("success");
    setMarks(prev => [{ at: Date.now(), time: timer, spl: displaySpl }, ...prev].slice(0, 12));
  };

  const handleMute = (id: string) => {
    setMutes(prev => ({ ...prev, [id]: !prev[id] }));
    feedback("select");
  };

  // En la app nativa (Capacitor) la Fullscreen API no existe: el botón quedaba
  // visible pero muerto. Se oculta donde no aplica en vez de fingir que anda.
  const canFullscreen =
    typeof document !== "undefined" &&
    typeof document.documentElement.requestFullscreen === "function" &&
    !Capacitor.isNativePlatform();

  const toggleFullscreen = async () => {
    if (!canFullscreen) return;
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setFullscreen(true);
      } else {
        await document.exitFullscreen();
        setFullscreen(false);
      }
    } catch {
      /* denegado por el navegador */
    }
  };

  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const splColor = bandColor(spl.reading.band);
  const displaySpl = spl.state === "running" ? spl.reading.spl : 0;
  const displayPeak = spl.state === "running" ? spl.reading.peak : 0;
  const displayLeq = spl.state === "running" ? spl.reading.leq : 0;

  return (
    <div className="fixed inset-0 z-40 overflow-hidden select-none touch-none"
      style={{ background: "#000" }}
      data-testid="kiosk-root">
      {/* Grain */}
      <div className="grain-overlay" aria-hidden="true" />

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-4 py-2 bg-gradient-to-b from-black/80 to-transparent pt-safe">
        <div className="flex items-center gap-2">
          <button
            onClick={() => { feedback("tap"); navigate(-1); }}
            data-testid="kiosk-exit"
            className="h-9 w-9 rounded-full bg-secondary/70 border border-border flex items-center justify-center cursor-pointer active:scale-90"
          >
            <X size={14} />
          </button>
          <div className="flex flex-col leading-none">
            <span className="text-[9px] font-medium uppercase tracking-[0.28em] text-muted-foreground">FOH Kiosk</span>
            <span className="text-[10px] font-mono text-foreground">{room?.name ?? "Sin recinto"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="rounded-full bg-secondary/60 border border-border px-2.5 py-1 flex items-center gap-1.5">
            <Timer size={10} className="text-muted-foreground" />
            <span className="text-[10px] font-mono tabular-nums text-foreground" data-testid="kiosk-timer">{timer}</span>
          </div>
          {canFullscreen && <button
            onClick={toggleFullscreen}
            aria-label={fullscreen ? "Salir de pantalla completa" : "Pantalla completa"}
            data-testid="kiosk-fullscreen"
            className="h-9 w-9 rounded-full bg-secondary/70 border border-border flex items-center justify-center cursor-pointer active:scale-90"
          >
            {fullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
          </button>}
        </div>
      </div>

      {/* SPL centerpiece */}
      <div className="absolute top-14 left-1/2 -translate-x-1/2 flex flex-col items-center">
        <button
          onClick={() => { feedback("tap"); if (spl.state === "running") spl.stop(); else spl.start(); }}
          data-testid="kiosk-spl-toggle"
          className="rounded-full px-3 py-1 mb-1 text-[9px] font-medium uppercase tracking-[0.28em] border cursor-pointer active:scale-95"
          style={{
            background: spl.state === "running" ? `${splColor}20` : "transparent",
            borderColor: `${splColor}55`,
            color: splColor,
            boxShadow: spl.state === "running" ? `0 0 16px ${splColor}55` : "none",
          }}
        >
          {stateLabel(spl.state)}
        </button>
        <div
          className="font-mono font-medium tabular-nums leading-none"
          style={{
            color: splColor,
            textShadow: spl.state === "running" ? `0 0 22px ${splColor}88` : "none",
            fontSize: "clamp(80px, 24vw, 220px)",
          }}
          data-testid="kiosk-spl-value"
        >
          {displaySpl.toFixed(0)}
        </div>
        <div className="text-[10px] font-medium uppercase tracking-[0.4em] text-muted-foreground -mt-3">
          dB SPL · A
        </div>
        <div className="mt-1 flex items-center gap-4">
          <div className="text-center">
            <p className="text-[8px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Peak</p>
            <p className="text-sm font-mono font-medium tabular-nums" style={{ color: splColor }} data-testid="kiosk-peak">{displayPeak.toFixed(1)}</p>
          </div>
          <div className="text-center">
            <p className="text-[8px] font-medium uppercase tracking-[0.28em] text-muted-foreground">Leq sesión</p>
            <p className="text-sm font-mono font-medium tabular-nums text-foreground" data-testid="kiosk-leq">{displayLeq.toFixed(1)}</p>
          </div>
        </div>
      </div>

      {/* Faders row */}
      <div className="absolute inset-x-0 bottom-24 px-4 flex justify-center gap-3 overflow-x-auto no-scrollbar" data-testid="kiosk-faders">
        {outputs.length === 0 ? (
          <div className="text-center py-14 px-6">
            <p className="text-[13px] text-foreground font-medium">Sin sistema cargado</p>
            <p className="text-[11px] text-muted-foreground mt-1.5 max-w-xs mx-auto leading-relaxed">
              El medidor de SPL funciona igual. Para ver la referencia de ganancias
              necesitás un recinto y un PA.
            </p>
            <button
              onClick={() => { feedback("tap"); navigate("/design?step=room"); }}
              data-testid="kiosk-empty-cta"
              className="mt-4 px-4 py-2 rounded-full text-[12px] font-medium cursor-pointer"
              style={{ background: "rgba(255,255,255,0.05)", boxShadow: "0 0 0 1px rgba(255,255,255,0.08)" }}
            >
              Ir a Diseño
            </button>
          </div>
        ) : (
          outputs.slice(0, MAX_VISIBLE_FADERS).map(out => (
            <Fader
              key={out.id}
              output={out}
              value={faders[out.id] ?? out.gain}
              muted={!!mutes[out.id]}
              onChange={(dB) => handleFader(out.id, dB)}
              onToggleMute={() => handleMute(out.id)}
              testId={`kiosk-fader-${out.id.toLowerCase()}`}
            />
          ))
        )}
      </div>
      {outputs.length > MAX_VISIBLE_FADERS && (
        <p
          className="absolute bottom-[4.5rem] left-4 text-[10px] text-muted-foreground"
          data-testid="kiosk-faders-overflow"
        >
          +{outputs.length - MAX_VISIBLE_FADERS} salidas más — ver en DSP
        </p>
      )}

      {/* Barra inferior — aviso de alcance + marcar momento */}
      <div className="absolute bottom-0 inset-x-0 px-4 pb-safe pb-3 flex items-center gap-2.5 bg-gradient-to-t from-black/85 to-transparent">
        <div
          className="flex-1 flex items-center gap-2 px-3 h-11 rounded-2xl min-w-0"
          style={{ background: "rgba(245,182,46,0.10)", boxShadow: "0 0 0 1px rgba(245,182,46,0.30)" }}
          data-testid="kiosk-reference-notice"
        >
          <AlertTriangle size={13} strokeWidth={2} style={{ color: "var(--sm-amber)", flexShrink: 0 }} />
          <p className="text-[11px] leading-tight truncate" style={{ color: "var(--sm-amber)" }}>
            Referencia visual — no controla el DSP
          </p>
        </div>
        <button
          onClick={markMoment}
          data-testid="kiosk-mark-btn"
          className="h-11 px-5 rounded-2xl text-[12px] font-medium cursor-pointer active:scale-[0.97] shrink-0"
          style={{ background: "var(--sm-accent)", color: "var(--background)" }}
        >
          <span className="inline-flex items-center gap-1.5"><Flag size={13} strokeWidth={2} /> Marcar</span>
        </button>
      </div>

      {/* Últimas marcas — para anotar el pico de un tema sin soltar el kiosk */}
      {marks.length > 0 && (
        <div className="absolute bottom-20 right-4 flex flex-col items-end gap-1" data-testid="kiosk-marks">
          {marks.slice(0, 3).map((m, i) => (
            <div
              key={m.at}
              className="px-2.5 py-1 rounded-full text-[10px] font-mono tabular-nums"
              style={{ background: "rgba(255,255,255,0.06)", color: i === 0 ? "#F4F4F5" : "var(--muted-foreground)" }}
            >
              {m.time} · {m.spl.toFixed(0)} dB
            </div>
          ))}
        </div>
      )}

      {/* Corner state (mic denied etc.) */}
      {spl.state === "denied" && (
        <div className="absolute top-16 left-4 rounded-xl border border-warning/40 bg-warning/15 px-3 py-2 flex items-center gap-2 text-[10px] font-medium text-warning uppercase tracking-[0.28em]">
          <Volume2 size={11} /> Permitir mic para leer SPL
        </div>
      )}
    </div>
  );
}
