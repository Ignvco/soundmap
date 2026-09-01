// Alineación temporal. Un error acá no se ve en pantalla: se escucha como un
// sistema borroso o, peor, como una torre de delay que suena antes que el
// escenario. Por eso los tests son estrictos con signos y unidades.
import { describe, it, expect } from "vitest";
import {
  msFromMeters,
  metersFromMs,
  speedOfSoundFromTemp,
  calculateSubAlignment,
  calculateDelayTowerTiming,
  HAAS_OFFSET_MS,
  SPEED_OF_SOUND,
} from "../time-align.ts";
import type { RoomScanInput } from "../acoustics.ts";
import type { GearItem } from "../pa-engine.ts";

// Sin `as RoomScanInput`: el cast silenciaba a TypeScript y dejaba pasar
// nombres de campo inventados, lo que producía RT60 = NaN y hacía que los
// tests denunciaran un bug inexistente en el motor.
const room = (over: Partial<RoomScanInput> = {}): RoomScanInput => ({
  name: "Sala", width: 15, length: 25, height: 6,
  capacity: 200, ceilingType: "flat", wallMaterial: "drywall",
  floorType: "concrete", windowCount: 2, ...over,
});

const gear = (over: Partial<GearItem> = {}): GearItem => ({
  id: "g", brand: "B", model: "M", category: "tops", active: true,
  splMax: 138, freqLow: 55, freqHigh: 20000, coverageH: 90, quantity: 1, ...over,
});

const TOPS = [gear()];
const SUBS = [gear({ id: "s", category: "subs", splMax: 136, freqLow: 30, freqHigh: 120 })];

describe("conversión distancia ↔ tiempo", () => {
  it("343 m tardan ~1000 ms a 20 °C", () => {
    // La fórmula exacta da 343.2 m/s a 20 °C, no 343 redondos: 999.4 ms.
    // La constante SPEED_OF_SOUND = 343 es el valor redondeado de referencia.
    expect(msFromMeters(343, 20)).toBeCloseTo(999.4, 1);
  });

  it("msFromMeters y metersFromMs son inversas", () => {
    for (const m of [1, 12.5, 100]) {
      expect(metersFromMs(msFromMeters(m, 20), 20)).toBeCloseTo(m, 6);
    }
  });

  it("usa 20 °C por defecto", () => {
    expect(msFromMeters(100)).toBeCloseTo(msFromMeters(100, 20), 9);
  });

  it("el sonido viaja más rápido con más calor", () => {
    expect(speedOfSoundFromTemp(0)).toBeCloseTo(331.3, 1);
    expect(speedOfSoundFromTemp(20)).toBeCloseTo(343, 0);
    expect(speedOfSoundFromTemp(35)).toBeGreaterThan(speedOfSoundFromTemp(20));
    // Constante de referencia coherente con la fórmula a 20 °C.
    expect(Math.round(speedOfSoundFromTemp(20))).toBe(SPEED_OF_SOUND);
  });

  it("35 °C acorta el tiempo de vuelo de forma medible", () => {
    // El bug que esto protege: la temperatura del escaneo se ignoraba y todo
    // se calculaba a 343 m/s fijos. En una torre a 100 m son ~7 ms.
    const frio = msFromMeters(100, 20);
    const calor = msFromMeters(100, 35);
    expect(frio - calor).toBeGreaterThan(5);
  });
});

describe("calculateSubAlignment", () => {
  it('devuelve "none" sin tops o sin subs', () => {
    expect(calculateSubAlignment(room(), [], SUBS).delayedSource).toBe("none");
    expect(calculateSubAlignment(room(), TOPS, []).delayedSource).toBe("none");
    expect(calculateSubAlignment(room(), [], []).subDelayMs).toBe(0);
  });

  it("nunca atrasa las dos fuentes a la vez", () => {
    for (const h of [3, 4.9, 5, 8, 12]) {
      const a = calculateSubAlignment(room({ height: h }), TOPS, SUBS);
      expect(a.subDelayMs > 0 && a.topDelayMs > 0).toBe(false);
    }
  });

  it("el delay siempre es positivo o cero, nunca negativo", () => {
    for (const len of [5, 20, 60]) {
      const a = calculateSubAlignment(room({ length: len }), TOPS, SUBS);
      expect(a.subDelayMs).toBeGreaterThanOrEqual(0);
      expect(a.topDelayMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("el delay corresponde a la diferencia de camino informada", () => {
    const a = calculateSubAlignment(room(), TOPS, SUBS);
    const esperado = msFromMeters(a.offsetM, 20);
    const aplicado = Math.max(a.subDelayMs, a.topDelayMs);
    expect(aplicado).toBeCloseTo(esperado, 0);
  });

  it("atrasa la fuente MÁS CERCANA, nunca la más lejana", () => {
    // Si atrasáramos la fuente lejana, empeoraríamos la desalineación en vez
    // de corregirla. Es el error de signo clásico.
    const a = calculateSubAlignment(room({ height: 8 }), TOPS, SUBS);
    if (a.delayedSource === "sub") {
      const distSub = Math.hypot(a.referenceDistanceM, 1.5 - a.subHeightM);
      const distTop = Math.hypot(a.referenceDistanceM + a.topSetbackM, 1.5 - a.topHeightM);
      expect(distSub).toBeLessThan(distTop);
    } else if (a.delayedSource === "top") {
      const distSub = Math.hypot(a.referenceDistanceM, 1.5 - a.subHeightM);
      const distTop = Math.hypot(a.referenceDistanceM + a.topSetbackM, 1.5 - a.topHeightM);
      expect(distTop).toBeLessThan(distSub);
    }
  });

  it("techos bajos implican tops en trípode, techos altos rig colgado", () => {
    expect(calculateSubAlignment(room({ height: 3 }), TOPS, SUBS).topHeightM).toBe(2.2);
    expect(calculateSubAlignment(room({ height: 8 }), TOPS, SUBS).topHeightM).toBeGreaterThan(2.2);
  });

  it("nunca cuelga los tops por encima del techo", () => {
    for (const h of [5, 6, 7, 20]) {
      const a = calculateSubAlignment(room({ height: h }), TOPS, SUBS);
      expect(a.topHeightM).toBeLessThan(h);
    }
  });

  it("usa la temperatura de la sala y lo dice en la explicación", () => {
    const calor = calculateSubAlignment(room({ temperature: 35 }), TOPS, SUBS);
    expect(calor.reasons.join(" ")).toContain("35 °C");
    const frio = calculateSubAlignment(room({ temperature: 5 }), TOPS, SUBS);
    // Más frío = sonido más lento = más ms para la misma distancia.
    const msCalor = Math.max(calor.subDelayMs, calor.topDelayMs);
    const msFrio = Math.max(frio.subDelayMs, frio.topDelayMs);
    expect(msFrio).toBeGreaterThanOrEqual(msCalor);
  });

  it("siempre explica la decisión al usuario", () => {
    const a = calculateSubAlignment(room(), TOPS, SUBS);
    expect(a.reasons.length).toBeGreaterThan(0);
    expect(a.reasons.every((r) => r.length > 20)).toBe(true);
  });
});

describe("calculateDelayTowerTiming", () => {
  it("delay total = propagación + Haas", () => {
    const t = calculateDelayTowerTiming(50);
    expect(t.totalDelayMs).toBeCloseTo(t.propagationMs + HAAS_OFFSET_MS, 1);
    expect(t.haasMs).toBe(HAAS_OFFSET_MS);
  });

  it("la propagación coincide con distancia ÷ velocidad", () => {
    expect(calculateDelayTowerTiming(34.3).propagationMs).toBeCloseTo(100, 0);
  });

  it("más lejos siempre es más delay", () => {
    let prev = -1;
    for (const d of [10, 25, 50, 100, 200]) {
      const ms = calculateDelayTowerTiming(d).totalDelayMs;
      expect(ms).toBeGreaterThan(prev);
      prev = ms;
    }
  });

  it("el delay SIEMPRE supera el tiempo de vuelo — si no, la torre suena antes que el escenario", () => {
    for (const d of [5, 40, 120]) {
      const t = calculateDelayTowerTiming(d);
      expect(t.totalDelayMs).toBeGreaterThan(t.propagationMs);
    }
  });

  it("blinda distancias inválidas en vez de devolver delays negativos", () => {
    for (const bad of [-10, NaN, Infinity]) {
      const t = calculateDelayTowerTiming(bad);
      expect(t.distanceM).toBe(0);
      expect(t.totalDelayMs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(t.totalDelayMs)).toBe(true);
    }
  });

  it("aplica la temperatura al tiempo de propagación", () => {
    const frio = calculateDelayTowerTiming(100, 5);
    const calor = calculateDelayTowerTiming(100, 35);
    expect(frio.propagationMs).toBeGreaterThan(calor.propagationMs);
    expect(calor.reason).toContain("35 °C");
  });
});

describe("consistencia entre motor y vista", () => {
  // Guardarraíl: el proyecto tenía CINCO copias de la velocidad del sonido y
  // CUATRO de la ganancia de array, cada una en un archivo distinto. Cuando la
  // vista reimplementa la física, muestra un número que no coincide con el que
  // el motor calculó, y el operador copia el equivocado.
  it("la distancia equivalente de un delay debe derivarse de la misma temperatura", () => {
    for (const tempC of [5, 20, 35]) {
      const ms = msFromMeters(10, tempC);
      const metersPerMs = speedOfSoundFromTemp(tempC) / 1000;
      // Ida y vuelta: ms → metros tiene que devolver los 10 m originales.
      expect(ms * metersPerMs).toBeCloseTo(10, 6);
    }
  });

  it("usar 343 m/s fijo se desvía de forma medible en calor", () => {
    // Justifica por qué la vista no puede hardcodear 0.343: a 35 °C, sobre el
    // delay de una torre a 100 m, el error de distancia supera un metro.
    const tempC = 35;
    const ms = msFromMeters(100, tempC);
    const conFijo = ms * 0.343;
    expect(Math.abs(conFijo - 100)).toBeGreaterThan(1);
  });
});
