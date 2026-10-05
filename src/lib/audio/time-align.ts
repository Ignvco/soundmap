import { layoutSpeakers, type SpeakerLayout } from "../speaker-layout";
import { defaultReceiver } from "./audit-evaluator";
// Time Alignment Engine — SoundMap
// Calculates real propagation-based delays so wavefronts arrive coherently:
//   1. Sub↔Top alignment: the physically closer source is delayed by the path
//      difference to a mid-audience reference, derived from real mounting
//      geometry (sub on the ground, tops flown/on poles set back from the lip).
//   2. Delay towers: a downstream tower is delayed by the time the main PA's
//      wavefront takes to reach it, plus a Haas (precedence) offset so the
//      audience still localises the sound to the stage.
//
// Everything is grounded in distance ÷ speed of sound. No fixed placeholder ms.

import { speedOfSoundFromTemp, type RoomScanInput } from "./acoustics.ts";
import type { GearItem } from "./pa-engine.ts";

/** Velocidad del sonido de referencia a 20 °C, cuando no hay temperatura medida. */
export const SPEED_OF_SOUND = 343; // m/s

/**
 * Velocidad del sonido corregida por temperatura.
 *
 * Reexportada desde `acoustics.ts` para que exista UNA sola implementación.
 * Antes este módulo tenía su propia copia (`speedOfSoundMs`) que además NADIE
 * llamaba: todos los cálculos usaban la constante fija de 343 m/s, así que la
 * temperatura que el usuario carga en el escaneo de sala se ignoraba por
 * completo en la alineación temporal.
 */
export { speedOfSoundFromTemp };

// Precedence (Haas) offset added on top of pure propagation for delay towers.
// 10 ms keeps localisation toward the stage without an audible echo.
export const HAAS_OFFSET_MS = 0; // Additional precedence delay is an explicit operator choice.

/**
 * Milisegundos que tarda el sonido en recorrer `meters`.
 * `tempC` por defecto 20 °C. A 35 °C el sonido viaja a 352 m/s en vez de 343:
 * son ~2.6 % de diferencia, que en una torre de delay a 100 m son 7 ms — bien
 * audible y suficiente para arruinar la alineación en un show al aire libre.
 */
export function msFromMeters(meters: number, tempC = 20): number {
  return (meters / speedOfSoundFromTemp(tempC)) * 1000;
}

/** Metros que recorre el sonido en `ms` milisegundos. */
export function metersFromMs(ms: number, tempC = 20): number {
  return (ms / 1000) * speedOfSoundFromTemp(tempC);
}

export interface SubAlignment {
  /** Delay applied to the sub outputs (ms). 0 if tops are the closer source. */
  subDelayMs: number;
  /** Delay applied to the top outputs (ms). 0 if subs are the closer source. */
  topDelayMs: number;
  /** Which source ends up delayed. "none" when there is nothing to align. */
  delayedSource: "sub" | "top" | "none";
  /** Physical path-length difference between the two sources (m). */
  offsetM: number;
  /** Acoustic-center heights used in the model (m). */
  topHeightM: number;
  subHeightM: number;
  /** How far back the tops sit from the sub line (m). */
  topSetbackM: number;
  /** Reference listening distance the alignment is optimised for (m). */
  referenceDistanceM: number;
  /** Plain-language explanations of the calculation. */
  reasons: string[];
}

/**
 * Derive the sub↔top alignment delay from real mounting geometry.
 *
 * Model (documented for the user):
 * - Subs are ground-stacked at the stage lip (acoustic center ≈ 0.5 m high).
 * - Tops are flown in tall rooms or pole-mounted in low ones, and sit a little
 *   behind the sub line. Both height and set-back push the tops slightly farther
 *   from the audience than the subs.
 * - We measure the path difference to a mid-audience listener (ear height 1.5 m)
 *   and delay whichever source is physically CLOSER, so both wavefronts line up
 *   through the crossover region.
 */
export function calculateSubAlignment(room: RoomScanInput, tops: GearItem[], subs: GearItem[], layout?: SpeakerLayout): SubAlignment {
  const all = layoutSpeakers(room, tops, subs, [], layout), receiver = defaultReceiver(room);
  const top = all.filter(s => s.kind === "tops"), sub = all.filter(s => s.kind === "subs");
  const mean = (arr: typeof all, fn: (s: typeof all[number]) => number) => arr.length ? arr.reduce((n, s) => n + fn(s), 0) / arr.length : 0;
  const distance = (s: typeof all[number]) => Math.hypot(s.x - receiver.x, s.y - receiver.y, s.z - receiver.z);
  const topDistance = mean(top, distance), subDistance = mean(sub, distance);
  const delta = topDistance - subDistance;
  const complete = top.length > 0 && sub.length > 0;
  const delay = complete ? Math.abs(msFromMeters(delta, room.temperature)) : 0;
  return { subDelayMs: complete && delta > 0 ? delay : 0, topDelayMs: complete && delta < 0 ? delay : 0,
    delayedSource: !complete || Math.abs(delta) < 0.001 ? "none" : delta > 0 ? "sub" : "top",
    offsetM: complete ? Math.abs(delta) : 0, topHeightM: mean(top, s => s.y), subHeightM: mean(sub, s => s.y),
    topSetbackM: mean(sub, s => s.z) - mean(top, s => s.z), referenceDistanceM: receiver.z + room.length / 2,
    reasons: complete ? [`Alineación geométrica a ${room.temperature ?? 20} °C al receptor: trayecto medio tops ${topDistance.toFixed(2)} m, subs ${subDistance.toFixed(2)} m.`,
      "Promedio por grupo: verificar cada salida. No incluye latencias electrónicas ni fase de filtros; requiere medición antes de aplicar."] : ["Sin ambos grupos: alineación sub/top no aplicable."] };
}

export interface DelayTowerTiming {
  /** Distance from the main PA / stage to the tower (m). */
  distanceM: number;
  /** Pure propagation time for the main PA wavefront to reach the tower (ms). */
  propagationMs: number;
  /** Precedence (Haas) offset added on top of propagation (ms). */
  haasMs: number;
  /** Total delay to dial into the tower (ms). */
  totalDelayMs: number;
  /** Plain-language explanation. */
  reason: string;
}

/**
 * Time a delay tower so its sound trails the main PA by propagation + Haas.
 * delay = distance ÷ speed of sound + Haas offset.
 */
export function calculateDelayTowerTiming(distanceM: number, tempC = 20, precedenceMs = 0): DelayTowerTiming {
  // Una distancia negativa o NaN produciría un delay negativo, que ningún DSP
  // acepta y que en la UI se leía como un número válido.
  const safeDistance = Number.isFinite(distanceM) && distanceM > 0 ? distanceM : 0;
  const speed = Math.round(speedOfSoundFromTemp(tempC));
  const propagationMs = Math.round(msFromMeters(safeDistance, tempC) * 10) / 10;
  const totalDelayMs = Math.round((propagationMs + precedenceMs) * 10) / 10;
  return {
    distanceM: safeDistance,
    propagationMs,
    haasMs: precedenceMs,
    totalDelayMs,
    reason:
      `Torre a ${safeDistance} m: ${propagationMs} ms para que el frente del PA principal llegue a la torre ` +
      `(${safeDistance} m ÷ ${speed} m/s a ${tempC} °C) + ${precedenceMs} ms de efecto Haas para que el público siga localizando el sonido en el escenario = ${totalDelayMs} ms.`,
  };
}
