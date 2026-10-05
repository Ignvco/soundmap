// Array Gain — ÚNICA fuente de verdad para la suma de N cajas.
//
// ¿Por qué existe este módulo?
// Antes, tres motores distintos calculaban la ganancia de array con fórmulas
// distintas: pa-engine usaba 10·log10(n) (incoherente) mientras system-vitals y
// stage-optimizer usaban 20·log10(n) (coherente). Para un rig de 4 tops eso son
// +6 dB vs +12 dB — es decir, dos pantallas de la MISMA app mostraban un SPL
// máximo con 6 dB de diferencia a partir del mismo input. Este módulo unifica
// el criterio.
//
// Física
// ------
// Cuando N fuentes radian la misma señal, cómo se suman depende de si sus
// frentes de onda llegan en fase al punto de escucha:
//
//   • ACOPLADO (coherente) — +6 dB por duplicación → 20·log10(n).
//     Ocurre cuando la separación entre cajas es << λ. Es el caso real de un
//     array de subs apilado o en línea sobre el piso: a 40 Hz, λ ≈ 8.6 m, así
//     que 4 subs juntos están efectivamente en el mismo punto.
//
//   • INCOHERENTE (potencia) — +3 dB por duplicación → 10·log10(n).
//     Ocurre cuando la separación es >> λ y las fases se aleatorizan. Es el
//     caso real de un sistema L/D de full-range: a 2 kHz, λ ≈ 17 cm, y los tops
//     están a 10 m de distancia entre sí. Sólo se suma potencia.
//
// Límite práctico
// ---------------
// El acoplamiento perfecto no escala al infinito: por tolerancias de fase,
// dispersión mecánica y descorrelación creciente, los arrays reales dejan de
// ganar 6 dB por duplicación a partir de ~8 elementos. Aplicamos un
// decaimiento suave sobre ese umbral en vez de un tope duro, para que la curva
// no tenga un codo antinatural.

/** Modo de suma de una agrupación de cajas. */
export type CouplingMode =
  /** Cajas acopladas (subs apilados, cluster compacto): +6 dB/duplicación. */
  | "coupled"
  /** Cajas independientes (L/D full-range, monitores): +3 dB/duplicación. */
  | "incoherent";

/** A partir de este número de cajas el acoplamiento empieza a degradarse. */
const COUPLING_KNEE = 8;
/** Fracción de la ganancia coherente que se conserva por encima del knee. */
const COUPLING_ROLLOFF = 0.5;

/**
 * Ganancia en dB de agrupar `count` cajas idénticas respecto de una sola.
 * Devuelve 0 para 0 o 1 caja. Nunca devuelve NaN ni valores negativos.
 */
export function arrayGainDb(count: number, mode: CouplingMode): number {
  const n = Math.floor(count);
  if (!Number.isFinite(n) || n <= 1) return 0;

  if (mode === "incoherent") return 10 * Math.log10(n);

  // Acoplado, con degradación progresiva por encima del knee.
  if (n <= COUPLING_KNEE) return 20 * Math.log10(n);
  const atKnee = 20 * Math.log10(COUPLING_KNEE);
  const extra = 20 * Math.log10(n / COUPLING_KNEE) * COUPLING_ROLLOFF;
  return atKnee + extra;
}

/** Modo de acoplamiento por defecto según la categoría de la caja. */
export function couplingForCategory(category: string): CouplingMode {
  // Los subs comparten longitudes de onda enormes → acoplan de verdad.
  // Todo lo demás (tops L/D, monitores en cuña) suma potencia.
  return category === "subs" ? "coupled" : "incoherent";
}

/** Elemento mínimo necesario para calcular el SPL combinado de un grupo. */
export interface SplContributor {
  /** SPL máximo de UNA caja de este modelo, @1 m (dB). */
  splMax: number;
  /** Cuántas cajas de este modelo hay. */
  quantity?: number;
}

/**
 * SPL máximo combinado de un grupo que puede mezclar modelos distintos.
 *
 * Suma la potencia real de cada modelo en vez de asumir que todo el rig es del
 * primer modelo de la lista (que era el bug anterior: 2× JBL 140 dB + 2× una
 * caja de 128 dB se reportaban como si fuesen 4× 140 dB).
 *
 * Para un rig homogéneo el resultado es idéntico a `splMax + arrayGainDb(n)`.
 * Devuelve 0 si el grupo está vacío o no tiene SPL declarado.
 */
export function combinedSplMax(items: SplContributor[], mode: CouplingMode): number {
  const valid = items.filter((i) => (i.splMax ?? 0) > 0 && (i.quantity ?? 1) > 0);
  if (valid.length === 0) return 0;

  const total = valid.reduce((s, i) => s + (i.quantity ?? 1), 0);
  if (total <= 0) return 0;

  // 1) Nivel equivalente de "una caja promedio" en energía.
  const meanPower =
    valid.reduce((s, i) => s + (i.quantity ?? 1) * Math.pow(10, i.splMax / 10), 0) / total;
  const meanSpl = 10 * Math.log10(meanPower);

  // 2) Ganancia por agrupar `total` de esas cajas equivalentes.
  return meanSpl + arrayGainDb(total, mode);
}
