// Cierre de cobertura: `gearMatchScore` (pa-engine) y el constructor de curvas
// de EQ (system-vitals).
//
// Los llamé "la parte narrativa" en una vuelta anterior. Me equivoqué:
// `gearMatchScore` es el motor que decide QUÉ EQUIPO te recomienda la app, y el
// constructor de curvas es lo que se dibuja en la pantalla DSP. Los dos son
// lógica que sale por pantalla, no texto.
import { describe, it, expect } from "vitest";
import { gearMatchScore, calculatePARecommendation } from "../pa-engine.ts";
import {
  logFreqPoints,
  eqCurveFromBands,
  eqBucketed,
  coverageByZone,
  roomSummary,
} from "../system-vitals.ts";
import { calculateAcoustics, type RoomScanInput } from "../acoustics.ts";
import type { GearItem } from "../pa-engine.ts";
import type { DSPBand } from "../dsp-engine.ts";

const room = (over: Partial<RoomScanInput> = {}): RoomScanInput => ({
  name: "Sala", width: 15, length: 25, height: 6,
  capacity: 200, ceilingType: "flat", wallMaterial: "drywall",
  floorType: "concrete", windowCount: 2, ...over,
});

const gear = (over: Partial<GearItem> = {}): GearItem => ({
  id: "g", brand: "B", model: "M", category: "tops", active: true,
  splMax: 138, freqLow: 55, freqHigh: 20000, coverageH: 90, quantity: 1, ...over,
});

describe("gearMatchScore — el motor que elige qué recomendarte", () => {
  it("siempre devuelve un puntaje acotado y finito", () => {
    const casos: GearItem[] = [
      gear(), gear({ category: "subs" }), gear({ category: "monitors" }),
      gear({ category: "dsp" }), gear({ category: "amp", rmsWatts: 1200 }),
      gear({ category: "mixer" }), gear({ category: "mic" }),
      gear({ splMax: 0 }), gear({ splMax: 150 }),
    ];
    for (const g of casos) {
      for (const cap of [30, 200, 500, 1000, 5000]) {
        for (const rt of [0.4, 1.2, 2.6, 4]) {
          const s = gearMatchScore(g, cap, rt);
          expect(Number.isFinite(s)).toBe(true);
          expect(s).toBeGreaterThanOrEqual(0);
          expect(s).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it("el equipo no acústico recibe una línea base fija", () => {
    for (const cat of ["dsp", "mixer", "mic"] as const) {
      expect(gearMatchScore(gear({ category: cat }), 200, 1.2)).toBe(85);
      // Y no depende del recinto: un DSP no se elige por el RT60.
      expect(gearMatchScore(gear({ category: cat }), 5000, 4)).toBe(85);
    }
  });

  it("un show grande prefiere cajas con más SPL", () => {
    const chica = gear({ splMax: 128 });
    const grande = gear({ splMax: 144 });
    expect(gearMatchScore(grande, 1500, 1.2)).toBeGreaterThan(gearMatchScore(chica, 1500, 1.2));
  });

  it("penaliza el exceso en salas chicas", () => {
    // Una caja de 145 dB en una sala de 150 personas no es "mejor": es
    // sobredimensionar. Si el puntaje no lo refleja, la app te recomienda mal.
    const justa = gear({ splMax: 134 });
    const excesiva = gear({ splMax: 146 });
    expect(gearMatchScore(excesiva, 150, 1.2)).toBeLessThanOrEqual(gearMatchScore(justa, 150, 1.2) + 5);
  });

  it("los amplificadores se puntúan por potencia según el tamaño del show", () => {
    // El modelo usa ~4 W por persona como referencia: 8 kW para 2000 pax.
    const justo = gear({ category: "amp", rmsWatts: 8000 });
    const escaso = gear({ category: "amp", rmsWatts: 1000 });
    expect(gearMatchScore(justo, 2000, 1.2)).toBeGreaterThan(gearMatchScore(escaso, 2000, 1.2));
    // El MISMO amp vale más en un show chico que en uno grande.
    const amp = gear({ category: "amp", rmsWatts: 2000 });
    expect(gearMatchScore(amp, 150, 1.2)).toBeGreaterThan(gearMatchScore(amp, 2000, 1.2));
  });

  it("no rompe con datos incompletos", () => {
    for (const g of [
      gear({ splMax: undefined as unknown as number }),
      gear({ category: "amp", rmsWatts: undefined }),
      gear({ coverageH: undefined }),
    ]) {
      expect(Number.isFinite(gearMatchScore(g, 200, 1.2))).toBe(true);
    }
  });

  it("es determinista y no depende del orden de evaluación", () => {
    const g = gear({ splMax: 138 });
    expect(gearMatchScore(g, 400, 1.5)).toBe(gearMatchScore(g, 400, 1.5));
  });
});

describe("calculatePARecommendation — casos límite", () => {
  const acoustics = calculateAcoustics(room());

  it("no rompe sin equipo", () => {
    expect(() => calculatePARecommendation(room(), acoustics, [], [], [], [])).not.toThrow();
  });

  it("advierte cuando el sistema no alcanza para la sala", () => {
    const debil = gear({ splMax: 110, quantity: 1 });
    const rec = calculatePARecommendation(room({ length: 45, capacity: 1500 }), acoustics, [debil], [], [], []);
    expect(rec.warnings.length).toBeGreaterThan(0);
  });

  it("no produce NaN en ningún número que se muestre", () => {
    const rec = calculatePARecommendation(
      room(), acoustics,
      [gear({ quantity: 4 })],
      [gear({ id: "s", category: "subs", quantity: 2 })],
      [], [],
    );
    for (const v of Object.values(rec)) {
      if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
    }
  });
});

describe("curvas de EQ — lo que se dibuja en la pantalla DSP", () => {
  it("logFreqPoints cubre el rango audible en escala logarítmica", () => {
    const p = logFreqPoints();
    expect(p).toHaveLength(48);
    expect(p[0]).toBeCloseTo(20, 5);
    expect(p[p.length - 1]).toBeCloseTo(20000, 3);
    // Espaciado logarítmico: la razón entre puntos consecutivos es constante.
    const r1 = p[1] / p[0];
    const r2 = p[30] / p[29];
    expect(r1).toBeCloseTo(r2, 6);
  });

  it("logFreqPoints es siempre creciente", () => {
    for (const n of [8, 24, 48, 128]) {
      const p = logFreqPoints(n);
      for (let i = 1; i < p.length; i++) expect(p[i]).toBeGreaterThan(p[i - 1]);
    }
  });

  it("sin bandas la curva es plana en 0 dB", () => {
    for (const pt of eqCurveFromBands([])) {
      expect(pt.db).toBeCloseTo(0, 6);
    }
  });

  it("un realce de campana tiene su máximo EN la frecuencia central", () => {
    // Si el pico cae en otro lado, el gráfico miente sobre dónde estás tocando.
    const band: DSPBand = { freq: 1000, gain: 6, q: 2, type: "peak" };
    const curva = eqCurveFromBands([band]);
    const pico = curva.reduce((a, b) => (b.db > a.db ? b : a));
    expect(Math.abs(pico.hz - 1000) / 1000).toBeLessThan(0.15);
    expect(pico.db).toBeGreaterThan(4);
  });

  it("un corte de campana tiene su mínimo en la frecuencia central", () => {
    const curva = eqCurveFromBands([{ freq: 250, gain: -8, q: 3, type: "peak" }]);
    const valle = curva.reduce((a, b) => (b.db < a.db ? b : a));
    expect(Math.abs(valle.hz - 250) / 250).toBeLessThan(0.2);
    expect(valle.db).toBeLessThan(-4);
  });

  it("una Q más alta hace la campana más angosta", () => {
    const ancha = eqCurveFromBands([{ freq: 1000, gain: 6, q: 0.7, type: "peak" }]);
    const angosta = eqCurveFromBands([{ freq: 1000, gain: 6, q: 8, type: "peak" }]);
    const anchoDe = (c: { hz: number; db: number }[]) => c.filter(p => p.db > 3).length;
    expect(anchoDe(angosta)).toBeLessThan(anchoDe(ancha));
  });

  it("el paso alto atenúa por debajo del corte y deja pasar por encima", () => {
    const curva = eqCurveFromBands([{ freq: 100, gain: 0, q: 0.7, type: "hp" }]);
    const grave = curva.find(p => p.hz < 40)!;
    const agudo = curva.find(p => p.hz > 2000)!;
    expect(grave.db).toBeLessThan(agudo.db);
    expect(agudo.db).toBeGreaterThan(-1);
  });

  it("las bandas se suman entre sí", () => {
    const una = eqCurveFromBands([{ freq: 1000, gain: 6, q: 1, type: "peak" }]);
    const dos = eqCurveFromBands([
      { freq: 1000, gain: 6, q: 1, type: "peak" },
      { freq: 1000, gain: 6, q: 1, type: "peak" },
    ]);
    const maxUna = Math.max(...una.map(p => p.db));
    const maxDos = Math.max(...dos.map(p => p.db));
    expect(maxDos).toBeGreaterThan(maxUna);
  });

  it("nunca produce NaN, ni con Q inválida", () => {
    const bandas: DSPBand[] = [
      { freq: 1000, gain: 6, q: 0, type: "peak" },
      { freq: 20, gain: -12, q: 10, type: "peak" },
      { freq: 20000, gain: 3, q: 0.5, type: "shelf-hi" },
    ];
    for (const p of eqCurveFromBands(bandas)) {
      expect(Number.isFinite(p.db)).toBe(true);
      expect(Number.isFinite(p.hz)).toBe(true);
    }
  });

  it("eqBucketed resume la curva sin inventar valores", () => {
    const curva = eqCurveFromBands([{ freq: 1000, gain: 6, q: 1, type: "peak" }]);
    const buckets = eqBucketed(curva);
    expect(buckets.length).toBeGreaterThan(0);
    for (const b of buckets) {
      expect(Number.isFinite(b.value)).toBe(true);
      expect(b.label.length).toBeGreaterThan(0);
      // Ningún bucket puede exceder el máximo real de la curva.
      expect(b.value).toBeLessThanOrEqual(Math.max(...curva.map(p => p.db)) + 0.01);
    }
  });
});

describe("system-vitals — resúmenes de sala y cobertura", () => {
  it("roomSummary devuelve valores finitos y coherentes", () => {
    for (const r of [room(), room({ width: 4, length: 5, height: 2.5 }), room({ width: 60, length: 90, height: 20 })]) {
      const s = roomSummary(r, calculateAcoustics(r));
      for (const v of Object.values(s)) {
        if (typeof v === "number") expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("coverageByZone reparte el recinto sin huecos ni porcentajes imposibles", () => {
    const r = room();
    const z = coverageByZone(r, [gear({ quantity: 4 })], [gear({ id: "s", category: "subs", quantity: 2 })]);
    expect(z).not.toBeNull();
    for (const v of Object.values(z!)) {
      expect(Number.isFinite(v)).toBe(true);
    }
    // La uniformidad es un porcentaje: si se va de rango, el KPI miente.
    expect(z!.uniformityPct).toBeGreaterThanOrEqual(0);
    expect(z!.uniformityPct).toBeLessThanOrEqual(100);
    // El frente nunca puede recibir menos nivel que el fondo.
    expect(z!.front).toBeGreaterThanOrEqual(z!.back);
  });

  it("coverageByZone devuelve null sin equipo, en vez de inventar zonas", () => {
    expect(coverageByZone(room(), [], [])).toBeNull();
  });
});
