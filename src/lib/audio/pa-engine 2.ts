// PA Engine — SoundMap
// Recomienda configuración de PA basada en Escaneo de Sala + Equipo

import type { AcousticsResult, RoomScanInput } from "./acoustics.ts";
import { calculateRoomModes } from "./modal-eq.ts";
import { combinedSplMax } from "./array-gain.ts";

export interface GearItem {
  id: string;
  brand: string;
  model: string;
  category: "tops" | "subs" | "monitors" | "dsp" | "amp" | "mixer" | "mic";
  active: boolean;
  rmsWatts?: number;
  peakWatts?: number;
  splMax: number;
  coverageH?: number;
  coverageV?: number;
  freqLow?: number;
  freqHigh?: number;
  weight?: number;
  dspIntegrated?: boolean;
  /** How many units of this model are in the rig. Defaults to 1 if undefined. */
  quantity?: number;
  /**
   * Sistemas de line array profesionales que requieren amplificación dedicada
   * (no compatible con amps genéricos). Ej: d&b → D80, JBL VT → Crown ITech.
   * Si está definido, el engine genera un warning si el usuario no tiene ese amp.
   */
  requiredAmp?: string;
  /**
   * Impedancia nominal del parlante (Ω). Usada para calcular la potencia real
   * que entrega el amplificador a esa carga (típicos: 2, 4, 8, 16 Ω).
   */
  impedanceOhms?: number;
  /**
   * Separación física entre los tops L y R en el despliegue (m).
   * Usada para calcular comb filtering L/R en la zona central del público.
   * Default: room.width × 0.7 si no se especifica.
   */
  separationM?: number;
}

export interface PARecommendation {
  topsConfig: string;
  subsConfig: string;
  monitorsConfig: string;
  crossoverFreq: number;
  subStrategy: string;
  headroomDb: number;
  splTarget: number;
  coverageAngle: number;
  warnings: string[];
  eqHints: string[];
  ampSuggestions: string[];
  systemReady: boolean;
  /** Frecuencias de comb filtering L/R (nulas destructivas) derivadas de la separación física entre tops. */
  combFilteringFreqsHz: number[];
  /** Separación física usada para el cálculo de comb filtering (m). */
  topSeparationM: number;
}

export interface CrossoverPlan {
  /** Crossover frequency between subs and tops (Hz). 0 if no subs. */
  crossoverFreq: number;
  /** High-pass filter applied to the tops (Hz). Equals crossover when subs present. */
  topHpf: number;
  /** Low-pass filter applied to the tops (Hz). Usually the top's full range. */
  topLpf: number;
  /** Low-pass filter applied to the subs (Hz). Equals crossover. */
  subLpf: number;
  /** Subsonic / infrasonic high-pass to protect sub excursion (Hz). 0 if no subs. */
  subHpf: number;
  /** Filter slope label, e.g. "LR24". */
  slope: string;
  /** Plain-language reasons behind the values. */
  reasons: string[];
}

// Snap a frequency to the nearest conventional crossover point used on most DSPs.
const STANDARD_XOVER_POINTS = [60, 70, 80, 90, 100, 110, 120, 130] as const;
function snapToStandard(freq: number): number {
  return STANDARD_XOVER_POINTS.reduce((best, p) =>
    Math.abs(p - freq) < Math.abs(best - freq) ? p : best
  , STANDARD_XOVER_POINTS[0]);
}

/**
 * Derive the crossover and protective filters from the REAL frequency response
 * of the selected tops and subs. No fixed 80 Hz default.
 *
 * Logic:
 * - The crossover sits ~40% above the top's low-frequency limit so the top is
 *   never pushed to the edge of its range, snapped to a standard DSP point.
 * - It is clamped so it never exceeds what the subs can actually reproduce
 *   (their freqHigh) and stays within a musically sensible 60–130 Hz window.
 * - Subs get a subsonic high-pass just below their tuning to protect excursion.
 */
export function calculateCrossover(
  tops: GearItem[],
  subs: GearItem[]
): CrossoverPlan {
  const reasons: string[] = [];

  // ── Peor caso en rigs mixtos ────────────────────────────────────────────────
  // Un cruce sólo es seguro si TODAS las cajas del grupo lo soportan. Si el rig
  // mezcla modelos, el filtro lo dicta el más restrictivo:
  //   • tops  → el que baja MENOS (mayor freqLow) define dónde cortar el HPF
  //   • tops  → el que llega MENOS arriba (menor freqHigh) define el LPF
  //   • subs  → el que llega MENOS arriba (menor freqHigh) limita el cruce
  //   • subs  → el que baja MENOS (mayor freqLow) define el HPF subsónico
  // Antes se leía sólo `tops[0]`/`subs[0]`: con un top que baja a 55 Hz y otro a
  // 90 Hz, el cruce quedaba en 80 Hz y al segundo se le pedía tocar 10 Hz por
  // debajo de su límite real.
  const worstTopLow = tops.length > 0 ? Math.max(...tops.map((t) => t.freqLow ?? 80)) : 80;
  const worstTopHigh = tops.length > 0 ? Math.min(...tops.map((t) => t.freqHigh ?? 20000)) : 20000;
  const limitingTop =
    tops.length > 0 ? tops.reduce((w, t) => ((t.freqLow ?? 80) > (w.freqLow ?? 80) ? t : w), tops[0]) : undefined;
  const limitingSub =
    subs.length > 0
      ? subs.reduce((w, s) => ((s.freqHigh ?? 120) < (w.freqHigh ?? 120) ? s : w), subs[0])
      : undefined;

  const mixedTops = tops.length > 1;
  const top = limitingTop;
  const sub = limitingSub;

  // Top's usable high end (full-range LPF if not specified)
  const topLpf = tops.length > 0 ? worstTopHigh : 20000;

  if (!sub) {
    // No subs: tops run full-range with a protective HPF at their own low limit.
    const topLow = worstTopLow;
    const topHpf = top ? Math.max(40, Math.round(topLow * 1.1)) : 0;
    if (top) {
      reasons.push(
        `Sin subs: HPF en los tops a ${topHpf} Hz (límite real del ${top.model}: ${topLow} Hz) para proteger el woofer.`
      );
      if (mixedTops) reasons.push(`Rig mixto: el filtro lo define el top más restrictivo (${top.model}).`);
    }
    return { crossoverFreq: 0, topHpf, topLpf, subLpf: 0, subHpf: 0, slope: "LR24", reasons };
  }

  const topLow = worstTopLow;
  const subHigh = sub.freqHigh ?? 120;
  // El HPF subsónico protege al sub que MENOS baja.
  const subLow = Math.max(...subs.map((s) => s.freqLow ?? 35));

  // Ideal crossover: a margin above the top's low limit, snapped to a standard point.
  const ideal = snapToStandard(topLow * 1.4);
  // Never ask the subs to play higher than they can, and keep it musical.
  const ceiling = Math.min(subHigh, 130);
  const crossoverFreq = Math.max(60, Math.min(ideal, ceiling));

  reasons.push(
    `Cruce en ${crossoverFreq} Hz: el top ${top?.model ?? ""} llega hasta ${topLow} Hz, así que se cruza un ~40% por encima para mantenerlo en su zona lineal.`
  );
  if (mixedTops) {
    reasons.push(`Rig mixto de ${tops.length} modelos: el cruce lo dicta el top más restrictivo (${top?.model ?? ""}, ${topLow} Hz).`);
  }
  if (crossoverFreq === ceiling && ideal > ceiling) {
    reasons.push(`Limitado a ${ceiling} Hz porque el sub ${sub.model} no reproduce con utilidad por encima de su rango.`);
  }
  // Si el techo de los subs obliga a cruzar por debajo del límite real del top,
  // el top queda expuesto. Hay que decirlo en vez de entregar un número mudo.
  if (crossoverFreq < topLow) {
    reasons.push(
      `⚠ El cruce (${crossoverFreq} Hz) queda por debajo del límite del ${top?.model ?? "top"} (${topLow} Hz): ese top va a trabajar fuera de su zona lineal. Considerá subs que lleguen más arriba o tops que bajen más.`
    );
  }

  // Subsonic protection: just below the sub's tuning / low limit.
  const subHpf = Math.max(25, Math.round(subLow - 3));
  reasons.push(`HPF subsónico en ${subHpf} Hz: protege la excursión del ${sub.model} (límite ${subLow} Hz) por debajo de su sintonía.`);

  return {
    crossoverFreq,
    topHpf: crossoverFreq,
    topLpf,
    subLpf: crossoverFreq,
    subHpf,
    slope: "LR24",
    reasons,
  };
}

/**
 * Score how well a GearItem suits a given venue (capacity + RT60).
 * Returns a value in [50, 99]. No randomness.
 */
export function gearMatchScore(item: GearItem, capacity: number, rt60: number): number {
  const cat = item.category;

  // Non-acoustic gear: fixed baseline
  if (cat === "dsp" || cat === "mixer" || cat === "mic") return 85;

  // Amps: score by rmsWatts — bigger rig needs more headroom
  if (cat === "amp") {
    const watts = item.rmsWatts ?? 0;
    // Ideal wattage thresholds by capacity tier
    const idealWatts = capacity >= 1000 ? 8000 : capacity >= 500 ? 4000 : capacity >= 200 ? 2000 : 1000;
    const ratio = watts / idealWatts;
    if (ratio >= 1.5) return 97;
    if (ratio >= 1.0) return 92;
    if (ratio >= 0.7) return 80;
    if (ratio >= 0.4) return 65;
    return 52;
  }

  // Subs: freqLow extension + SPL headroom
  if (cat === "subs") {
    const spl = item.splMax ?? 0;
    const freqLow = item.freqLow ?? 60;
    let score = 70;
    // SPL component (up to +20)
    const splIdeal = capacity >= 1000 ? 144 : capacity >= 500 ? 140 : capacity >= 200 ? 136 : 130;
    score += Math.min(20, Math.max(0, spl - splIdeal + 10));
    // freqLow extension bonus (lower = better for subs)
    if (freqLow <= 28) score += 9;
    else if (freqLow <= 32) score += 7;
    else if (freqLow <= 38) score += 4;
    // DSP integration bonus for live use
    if (item.dspIntegrated) score += 3;
    return Math.min(99, Math.max(50, score));
  }

  // Tops / Monitors: capacity tier SPL matching + coverage + active/passive fit
  const spl = item.splMax ?? 0;
  let score = 60;

  // SPL tier matching
  if (capacity >= 1000) {
    // Large shows need serious headroom
    if (spl >= 144) score += 20;
    else if (spl >= 141) score += 15;
    else if (spl >= 138) score += 8;
    else if (spl >= 134) score += 2;
    else score -= 5;
  } else if (capacity >= 500) {
    if (spl >= 140) score += 20;
    else if (spl >= 136) score += 14;
    else if (spl >= 132) score += 7;
    else score += 1;
  } else if (capacity >= 200) {
    if (spl >= 136) score += 18;
    else if (spl >= 132) score += 14;
    else if (spl >= 128) score += 9;
    else score += 3;
    // Penalise heavy overkill for small rooms
    if (spl > 143) score -= 4;
  } else {
    // Small rooms: 125–135 is ideal, overkill penalised
    if (spl >= 125 && spl <= 135) score += 18;
    else if (spl >= 120 && spl < 125) score += 10;
    else if (spl > 135 && spl <= 140) score += 8;
    else if (spl > 140) score += 2;
    else score += 2;
  }

  // Coverage angle fit: wide angle benefits reverberant rooms
  const coverageH = item.coverageH ?? 90;
  if (rt60 > 1.5 && coverageH >= 100) score += 5;
  else if (rt60 <= 1.0 && coverageH >= 110) score -= 3; // too wide in dry rooms wastes energy
  else score += 2;

  // Active units get a small convenience bonus (self-powered, built-in processing)
  if (item.active) score += 3;
  if (item.dspIntegrated) score += 2;

  return Math.min(99, Math.max(50, score));
}

export function calculatePARecommendation(
  room: RoomScanInput,
  acoustics: AcousticsResult,
  tops: GearItem[],
  subs: GearItem[],
  monitors: GearItem[],
  amps: GearItem[]
): PARecommendation {
  const warnings: string[] = [];
  const eqHints: string[] = [];
  const ampSuggestions: string[] = [];

  // ── SPL objetivo con pérdida por distancia ──────────────────────────────────
  // El SPL objetivo en la posición de mezcla (60-70% de la sala) no es el mismo
  // que el SPL del speaker a 1m. Cada vez que se duplica la distancia se pierden
  // 6 dB (campo libre) o ~4 dB (campo difuso en salas).
  // Usamos la ley inversa del cuadrado corregida por el factor de sala RT60:
  // ΔdB = 20·log10(d_mezcla / 1m) — pero en sala real la pérdida es menor.
  const mixDistance = Math.max(3, room.length * 0.65); // posición de mezcla típica
  const distanceLoss = 20 * Math.log10(mixDistance); // pérdida a 1m de referencia del splMax
  // Nivel requerido en la posición de mezcla según tipo de evento
  const targetAtMix = room.capacity > 500 ? 105 : room.capacity > 200 ? 103 : 100;
  // splMax que necesita el sistema para alcanzar ese nivel a esa distancia (con headroom)
  const requiredSplAt1m = targetAtMix + distanceLoss;
  const splTarget = targetAtMix; // lo que el público escucha

  // SPL del sistema considerando cantidad de tops (ganancia incoherente 10·log10(n)).
  // Ver `array-gain.ts` — es la MISMA fórmula que usan system-vitals y el
  // optimizador, para que las tres pantallas nunca discrepen.
  // maxSPL = el peor top del rig, que es el que limita el sistema.
  const maxSPL = tops.length > 0 ? Math.min(...tops.map((t) => t.splMax || Infinity)) : 0;
  const totalTopUnits = tops.reduce((sum, t) => sum + (t.quantity ?? 1), 0);
  // combinedSplMax suma la potencia real de cada modelo (soporta rigs mixtos).
  const systemSplAtMix = combinedSplMax(tops, "incoherent") - distanceLoss;
  const headroomDb = Math.max(0, Math.round(systemSplAtMix - splTarget));

  // Advertencia si el sistema no alcanza el nivel requerido
  if (tops.length > 0 && Number.isFinite(maxSPL) && maxSPL < requiredSplAt1m) {
    const weakest = tops.reduce((w, t) => ((t.splMax || Infinity) < (w.splMax || Infinity) ? t : w), tops[0]);
    warnings.push(`Sistema posiblemente insuficiente: el top necesita ~${Math.round(requiredSplAt1m)} dBSPL@1m para cubrir ${Math.round(mixDistance)}m, el ${weakest.model} entrega ${maxSPL} dBSPL`);
  }

  // Crossover — derivado del rango de frecuencias real de tops y subs
  const crossover = calculateCrossover(tops, subs);
  const crossoverFreq = crossover.crossoverFreq;

  // Sub strategy — total de unidades
  const totalSubUnits = subs.reduce((sum, s) => sum + (s.quantity ?? 1), 0);
  let subStrategy = "Estéreo Dividido";
  if (totalSubUnits >= 4) subStrategy = "Array Cardioide";
  else if (totalSubUnits === 0) subStrategy = "Sin Subs";
  else if (room.capacity > 300) subStrategy = "Cluster Central";

  // totalTopUnits ya declarado arriba para el cálculo de headroom
  const totalMonitorUnits = monitors.reduce((sum, m) => sum + (m.quantity ?? 1), 0);

  // ── Ángulo de cobertura efectivo según configuración real ────────────────────
  // 1–2 elementos: ángulo del elemento (no se suman en estéreo L/D).
  // 3–5 elementos en array corto: leve estrechamiento del lóbulo (~80%).
  // 6+ elementos en array largo: el beam se estrecha significativamente (~65%).
  const topCovH = tops.length > 0 ? (tops[0].coverageH ?? 90) : 90;
  let coverageAngle: number;
  if (totalTopUnits >= 6)      coverageAngle = Math.round(topCovH * 0.65);
  else if (totalTopUnits >= 3) coverageAngle = Math.round(topCovH * 0.80);
  else                         coverageAngle = topCovH;

  // Tops config
  const topsConfig = tops.length === 0
    ? "Sin tops seleccionados"
    : totalTopUnits === 1
    ? `1x ${tops[0].brand} ${tops[0].model} — Mono Central`
    : `${totalTopUnits}x ${tops[0].brand} ${tops[0].model} — Estéreo I/D`;

  // Subs config
  const subsConfig = subs.length === 0
    ? "Sin subs seleccionados"
    : `${totalSubUnits}x ${subs[0].brand} ${subs[0].model} — ${subStrategy}`;

  // Monitors config
  const monitorsConfig = monitors.length === 0
    ? "Sin monitores seleccionados"
    : `${totalMonitorUnits}x ${monitors[0].brand} ${monitors[0].model}`;

  // Warnings
  if (tops.length === 0) warnings.push("Sin tops seleccionados — sistema PA incompleto");
  if (acoustics.rt60Audience > 2) warnings.push("RT60 alto detectado — reducir energía en medios-bajos");
  if (acoustics.lowMidBuildupRisk) warnings.push("Riesgo de acumulación en medios-bajos — cortar 200–400 Hz");
  if (headroomDb < 3) warnings.push("Headroom bajo — riesgo de distorsión a volúmenes altos");
  if (acoustics.echoRisk === "high") warnings.push("Riesgo de eco — usar tiempos de delay más cortos");
  if (subs.length > 0 && acoustics.sbirRisk) warnings.push("Riesgo SBIR — alejar los subs de las paredes");

  // EQ hints — derived from the room's actual calculated modes
  const roomModes = calculateRoomModes(room, acoustics);
  const significantModes = roomModes.filter(m => m.severity >= 0.45).slice(0, 3);
  if (significantModes.length > 0) {
    const list = significantModes.map(m => `${m.freq} Hz${m.pileUp ? " (pile-up)" : ""}`).join(", ");
    eqHints.push(`Modos de sala a corregir con notch: ${list} — calculados desde ${room.length}×${room.width}×${room.height} m.`);
  }
  if (acoustics.rt60Audience > 1.5) {
    eqHints.push("Realzar ligeramente 2–4 kHz para mayor claridad vocal");
  }
  if (acoustics.lowMidBuildupRisk) eqHints.push("Filtro paso alto a 80 Hz en todos los canales que no sean graves");
  if (crossoverFreq > 0) {
    eqHints.push(`Cruce de subs a ${crossoverFreq} Hz — Linkwitz-Riley 24dB/oct`);
    crossover.reasons.forEach(r => eqHints.push(r));
  }

  // Advertencia para sistemas con amplificación dedicada
  tops.filter(t => t.requiredAmp).forEach(t => {
    const hasCompatibleAmp = amps.some(a => a.brand.toLowerCase().includes(t.brand.split(" ")[0].toLowerCase()));
    if (!hasCompatibleAmp) {
      warnings.push(`${t.brand} ${t.model} requiere amplificación dedicada (${t.requiredAmp}) — no compatible con amps genéricos`);
    }
  });

  // Amp suggestions
  if (tops.some(t => !t.active) && amps.length === 0) {
    ampSuggestions.push("Tops pasivos detectados — se requiere amplificador");
  }
  amps.forEach(amp => {
    ampSuggestions.push(`${amp.brand} ${amp.model} — verificar coincidencia de impedancia`);
  });

  // ── Comb filtering L/R — acoplamiento entre tops en la zona central ──────────
  // Cuando dos tops están separados físicamente (L/R estéreo), en el centro del
  // público ambos llegan en fase (suman). Fuera del eje central, la diferencia de
  // camino crea nulas y picos: f_null = v / (2 × d_separación × sin(θ)).
  // En el eje central (θ=0) no hay comb, pero sí en los lados del área de mezcla.
  // Calculamos las primeras nulas en el eje del 30° lateral (típico).
  const separationM = tops.length > 0 && tops[0].separationM != null
    ? tops[0].separationM
    : room.width * 0.7; // default: 70% del ancho de sala — despliegue estándar L/R

  const combFilteringFreqsHz: number[] = [];
  if (tops.length >= 1 && separationM > 0) {
    // Velocidad del sonido — usamos 343 m/s como referencia (temperatura no disponible aquí)
    const v = 343;
    // Primeras 3 nulas destructivas para un oyente a 30° lateral
    // Δd = separationM × sin(30°) = separationM × 0.5
    const pathDiff = separationM * 0.5;
    for (let n = 1; n <= 3; n++) {
      const f_null = ((2 * n - 1) * v) / (2 * pathDiff);
      if (f_null > 50 && f_null < 16000) combFilteringFreqsHz.push(Math.round(f_null));
    }
    if (combFilteringFreqsHz.length > 0) {
      const freqList = combFilteringFreqsHz.map(f => `${f} Hz`).join(", ");
      warnings.push(
        `Comb filtering L/R a 30° lateral: nulas destructivas en ${freqList} (separación ${separationM.toFixed(1)} m). ` +
        `Reducir separación o usar delay lateral para mitigar.`
      );
      eqHints.push(
        `Zona central del público: comb filtering por separación L/R. Primera nula a ${combFilteringFreqsHz[0]} Hz en lateral 30°.`
      );
    }
  }

  return {
    topsConfig,
    subsConfig,
    monitorsConfig,
    crossoverFreq,
    subStrategy,
    headroomDb: Math.round(headroomDb),
    splTarget,
    coverageAngle,
    warnings,
    eqHints,
    ampSuggestions,
    systemReady: tops.length > 0,
    combFilteringFreqsHz,
    topSeparationM: Math.round(separationM * 100) / 100,
  };
}
