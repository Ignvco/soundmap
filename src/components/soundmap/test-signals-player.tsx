import { useEffect, useRef, useState } from "react";
import { Play, Square, Volume2 } from "lucide-react";
import {
  playSignal,
  stopSignal,
  type SignalKind,
} from "@/lib/audio/test-signals";
import { cn } from "@/lib/utils";

const PRESETS: { kind: SignalKind; label: string; description: string }[] = [
  { kind: "pink-noise", label: "Ruido rosa", description: "Prueba de sistema" },
  { kind: "white-noise", label: "Ruido blanco", description: "Banda completa" },
  { kind: "sine-1k", label: "Tono 1 kHz", description: "Frecuencia fija" },
  { kind: "sine-100", label: "Tono 100 Hz", description: "Prueba de graves" },
  { kind: "sine-sweep", label: "Barrido", description: "20 Hz a 20 kHz" },
];

export function TestSignalsPlayer({ className }: { className?: string }) {
  const [active, setActive] = useState<SignalKind | null>(null);
  const [levelDb, setLevelDb] = useState(-18);
  const [error, setError] = useState("");
  const generation = useRef(0);
  useEffect(
    () => () => {
      generation.current++;
      stopSignal();
    },
    [],
  );
  const stop = () => {
    generation.current++;
    stopSignal();
    setActive(null);
  };
  const play = (kind: SignalKind) => {
    if (kind === active) {
      stop();
      return;
    }
    const token = ++generation.current;
    setError("");
    try {
      playSignal(kind, levelDb, () => {
        if (generation.current === token) setActive(null);
      });
      setActive(kind);
    } catch {
      stop();
      setError(
        "No se pudo iniciar la señal. Revisá la salida de audio y volvé a intentar.",
      );
    }
  };
  return (
    <section
      className={cn("workspace-card glow-signals", className)}
      data-testid="test-signals-player"
    >
      <div className="workspace-section-heading">
        <div>
          <p className="project-eyebrow">SALIDA DE AUDIO</p>
          <h2>Señales de prueba</h2>
        </div>
        <Volume2 size={20} />
      </div>
      <p className="workspace-note">
        Se reproducen por la salida del dispositivo. Empezá con el volumen del
        sistema bajo.
      </p>
      <label className="signal-level-label" htmlFor="signal-level">
        Nivel de la señal <output>{levelDb} dB</output>
      </label>
      <input
        id="signal-level"
        type="range"
        min={-40}
        max={0}
        step={1}
        value={levelDb}
        disabled={!!active}
        onChange={(e) => setLevelDb(Number(e.target.value))}
        data-testid="test-signal-level"
      />
      <p className="workspace-note">
        {active
          ? "Detené la señal para cambiar el nivel."
          : "Ganancia digital del generador; no representa SPL."}
      </p>
      {levelDb > -6 && (
        <p className="signal-level-warning" role="status">
          Nivel alto: revisá el volumen de salida antes de reproducir.
        </p>
      )}
      <div className="signal-presets">
        {PRESETS.map((preset) => (
          <button
            key={preset.kind}
            type="button"
            aria-pressed={active === preset.kind}
            aria-label={`${active === preset.kind ? "Detener" : "Reproducir"} ${preset.label}`}
            data-testid={`test-signal-${preset.kind}`}
            onClick={() => play(preset.kind)}
          >
            {active === preset.kind ? <Square size={17} /> : <Play size={17} />}
            <span>
              {preset.label}
              <small>{preset.description}</small>
            </span>
          </button>
        ))}
      </div>
      <button
        className="audit-button signal-stop"
        disabled={!active}
        onClick={stop}
        data-testid="test-signal-stop"
      >
        <Square size={15} /> Detener señal
      </button>
      {error && (
        <p className="meter-error" role="status">
          {error}
        </p>
      )}
    </section>
  );
}
