// Reflexiones tempranas — panel del escaneo de sala.
//
// `calculateEarlyReflections` estaba implementado, correcto y con cobertura de
// tests… pero ninguna pantalla lo llamaba. Este panel lo conecta.
//
// Qué muestra y por qué le importa a un operador:
// las primeras reflexiones (piso, techo, paredes) llegan pocos milisegundos
// después del sonido directo y se suman con él. Esa suma no es plana: cancela a
// f = 1/(2·Δt) y refuerza al doble de esa frecuencia, y así sucesivamente. Es el
// comb filtering — lo que hace que un sistema medido plano suene metálico o
// hueco en la sala. Saber QUÉ superficie lo causa es lo que te dice dónde poner
// el tratamiento, o cómo reapuntar la caja.
import { useMemo } from "react";
import { motion } from "motion/react";
import { calculateEarlyReflections, type EarlyReflection } from "@/lib/audio/early-reflections.ts";
import { speedOfSoundFromTemp, type RoomScanInput } from "@/lib/audio/acoustics.ts";
import { GlassCard } from "@/components/soundmap/ui.tsx";

const RISK_COLOR: Record<EarlyReflection["combRisk"], string> = {
  high: "var(--sm-warm)",
  medium: "var(--sm-amber)",
  low: "var(--sm-accent)",
  none: "var(--sm-muted)",
};

const RISK_LABEL: Record<EarlyReflection["combRisk"], string> = {
  high: "Severo",
  medium: "Moderado",
  low: "Leve",
  none: "Sin riesgo",
};

interface Props {
  room: RoomScanInput;
  /** SPL @1 m del top, para estimar el nivel de cada reflexión. */
  spl1m?: number;
}

export function EarlyReflectionsPanel({ room, spl1m = 130 }: Props) {
  const result = useMemo(() => {
    // Geometría típica de despliegue, coherente con la que usa `calculateSubAlignment`:
    // top volado a ~75 % de la altura útil, adelantado respecto del centro, y el
    // oyente de referencia a media platea con los oídos a 1.5 m.
    const srcHeight = Math.min(room.height * 0.75, room.height - 0.5);
    const srcDepth = room.length * 0.38;
    const receiverDist = room.length * 0.25;
    return calculateEarlyReflections(
      room,
      srcHeight,
      srcDepth,
      receiverDist,
      1.5,
      spl1m,
      speedOfSoundFromTemp(room.temperature ?? 20),
    );
  }, [room, spl1m]);

  // De peor a mejor: lo que hay que tratar primero va arriba.
  const orden: Record<EarlyReflection["combRisk"], number> = { high: 0, medium: 1, low: 2, none: 3 };
  const reflexiones = [...result.reflections].sort(
    (a, b) => orden[a.combRisk] - orden[b.combRisk] || a.deltaMs - b.deltaMs,
  );

  return (
    <GlassCard className="p-4" data-testid="early-reflections-panel">
      <div className="flex items-baseline justify-between mb-1">
        <p className="text-[11px] text-muted-foreground uppercase tracking-[0.28em] font-semibold">
          Reflexiones tempranas
        </p>
        <p className="text-[10px] text-muted-foreground">
          nula peor · {result.worstCombFreqHz} Hz
        </p>
      </div>
      <p className="text-[10px] text-muted-foreground mb-4 leading-relaxed">
        Retardo de cada superficie respecto del sonido directo y frecuencia donde
        cancela. Por debajo de 5 ms el comb filtering es audible como coloración.
      </p>

      <div className="space-y-1.5">
        {reflexiones.map((r, i) => (
          <motion.div
            key={r.boundary}
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i }}
            className="flex items-center gap-3 rounded-xl bg-secondary/50 border border-border px-3 py-2"
            data-testid={`reflection-${r.boundary}`}
          >
            <span
              className="h-1.5 w-1.5 rounded-full shrink-0"
              style={{ background: RISK_COLOR[r.combRisk] }}
              aria-hidden="true"
            />
            <p className="text-[11px] text-foreground flex-1 min-w-0 truncate">{r.label}</p>
            <p className="text-[11px] font-mono tabular-nums text-muted-foreground shrink-0">
              {r.deltaMs.toFixed(1)} ms
            </p>
            <p className="text-[11px] font-mono tabular-nums shrink-0 w-16 text-right"
               style={{ color: RISK_COLOR[r.combRisk] }}>
              {r.firstNullHz >= 1000
                ? `${(r.firstNullHz / 1000).toFixed(1)}k`
                : r.firstNullHz} Hz
            </p>
            <p className="text-[10px] shrink-0 w-16 text-right" style={{ color: RISK_COLOR[r.combRisk] }}>
              {RISK_LABEL[r.combRisk]}
            </p>
          </motion.div>
        ))}
      </div>

      {result.reflections.some(r => r.echoRisk) && (
        <p className="text-[10px] mt-3 leading-relaxed" style={{ color: "var(--sm-warm)" }}>
          ⚠ Hay reflexiones por encima de 30 ms: se perciben como eco discreto,
          no como coloración. Tratamiento absorbente en esas superficies.
        </p>
      )}

      <p className="text-[11px] text-secondary-foreground mt-3 leading-relaxed">
        {result.recommendation}
      </p>
    </GlassCard>
  );
}
