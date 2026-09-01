// stage-engine y system-vitals: los dos motores que quedaban sin cobertura.
// stage-engine decide DÓNDE van las cajas y si hacen falta torres de delay —
// un error acá se traduce en un despliegue físico equivocado.
import { describe, it, expect } from "vitest";
import { calculateStageConfig } from "../stage-engine.ts";
import { calculateDynamics } from "../dynamics.ts";
import { paSummary, sceneToSources, sessionsPeakSeries, paFrequencyResponse } from "../system-vitals.ts";
import { calculateAcoustics, type RoomScanInput } from "../acoustics.ts";
import type { GearItem } from "../pa-engine.ts";

const room = (over: Partial<RoomScanInput> = {}): RoomScanInput => ({
  name: "Sala", width: 15, length: 25, height: 6,
  capacity: 200, ceilingType: "flat", wallMaterial: "drywall",
  floorType: "concrete", windowCount: 2, ...over,
});

const gear = (over: Partial<GearItem> = {}): GearItem => ({
  id: "g", brand: "B", model: "M", category: "tops", active: true,
  splMax: 138, freqLow: 55, freqHigh: 20000, coverageH: 90, quantity: 1, ...over,
});

const TOPS = [gear({ id: "t", quantity: 2 })];
const SUBS = [gear({ id: "s", category: "subs", splMax: 136, freqLow: 30, freqHigh: 120, quantity: 2 })];

const cfg = (r = room(), tops = TOPS, subs = SUBS) =>
  calculateStageConfig(r, calculateAcoustics(r), tops, subs);

describe("calculateStageConfig — posiciones", () => {
  it("genera una posición por caja, respetando cantidades", () => {
    const c = cfg(room(), [gear({ quantity: 4 })], [gear({ id: "s", category: "subs", quantity: 2 })]);
    expect(c.topsPosition).toHaveLength(4);
    expect(c.subsPosition).toHaveLength(2);
  });

  it("mantiene todas las posiciones dentro del escenario (0–100)", () => {
    for (const n of [1, 2, 3, 6, 12]) {
      const c = cfg(room(), [gear({ quantity: n })], []);
      for (const p of c.topsPosition) {
        expect(p.x).toBeGreaterThanOrEqual(0);
        expect(p.x).toBeLessThanOrEqual(100);
        expect(Number.isFinite(p.y)).toBe(true);
      }
    }
  });

  it("una sola caja va al centro; dos van a los lados", () => {
    expect(cfg(room(), [gear({ quantity: 1 })], []).topsPosition[0].x).toBe(50);
    const par = cfg(room(), [gear({ quantity: 2 })], []).topsPosition;
    expect(par[0].x).toBeLessThan(50);
    expect(par[1].x).toBeGreaterThan(50);
  });

  it("las posiciones son simétricas respecto del centro", () => {
    const p = cfg(room(), [gear({ quantity: 4 })], []).topsPosition;
    for (let i = 0; i < p.length / 2; i++) {
      expect(p[i].x + p[p.length - 1 - i].x).toBeCloseTo(100, 0);
    }
  });

  it("no genera posiciones sin equipo", () => {
    const c = cfg(room(), [], []);
    expect(c.topsPosition).toHaveLength(0);
    expect(c.subsPosition).toHaveLength(0);
  });

  it("da a cada posición una etiqueta única", () => {
    const labels = cfg(room(), [gear({ quantity: 6 })], []).topsPosition.map(p => p.label);
    expect(new Set(labels).size).toBe(labels.length);
  });
});

describe("calculateStageConfig — modo de despliegue", () => {
  it("sin tops es mono", () => {
    expect(cfg(room(), [], SUBS).deploymentMode).toBe("mono");
  });

  it("una sala grande pide line array", () => {
    expect(cfg(room({ length: 50, capacity: 1500 })).deploymentMode).toBe("line-array");
  });

  it("una sala chica pide cluster central", () => {
    expect(cfg(room({ capacity: 60 })).deploymentMode).toBe("center-cluster");
  });

  it("siempre devuelve un modo válido", () => {
    const validos = ["mono", "simple-stereo", "wide-stereo", "line-array", "center-cluster", "distributed"];
    for (const r of [room(), room({ width: 40 }), room({ length: 60 }), room({ capacity: 30 })]) {
      expect(validos).toContain(cfg(r).deploymentMode);
    }
  });
});

describe("calculateStageConfig — cobertura y SPL", () => {
  it("la cobertura se mantiene en un rango declarable", () => {
    for (const r of [room(), room({ width: 40, length: 60 }), room({ width: 5, length: 6 })]) {
      const c = cfg(r);
      expect(c.coveragePercent).toBeGreaterThanOrEqual(30);
      expect(c.coveragePercent).toBeLessThanOrEqual(98);
    }
  });

  it("la cobertura la limita el top MÁS CERRADO, no el primero de la lista", () => {
    // El bug: `tops[0].coverageH`. Con un top de 90° y otro de 60°, el
    // resultado dependía del orden en que los cargabas.
    const ancho = gear({ id: "a", coverageH: 90 });
    const cerrado = gear({ id: "b", coverageH: 45 });
    const ab = cfg(room(), [ancho, cerrado], []).coveragePercent;
    const ba = cfg(room(), [cerrado, ancho], []).coveragePercent;
    expect(ab).toBe(ba);
    // Y debe ser menor que si sólo estuviera el ancho.
    expect(ab).toBeLessThanOrEqual(cfg(room(), [ancho], []).coveragePercent);
  });

  it("el fondo de sala siempre recibe menos SPL que el frente", () => {
    for (const r of [room(), room({ length: 50 }), room({ length: 8 })]) {
      const c = cfg(r);
      expect(c.splRear).toBeLessThan(c.splFront);
    }
  });

  it("más cajas dan más SPL", () => {
    const dos = cfg(room(), [gear({ quantity: 2 })], []).splFront;
    const ocho = cfg(room(), [gear({ quantity: 8 })], []).splFront;
    expect(ocho).toBeGreaterThan(dos);
  });
});

describe("calculateStageConfig — torres de delay", () => {
  it("una sala corta no necesita torres", () => {
    const c = cfg(room({ length: 15 }));
    expect(c.needsDelayTowers).toBe(false);
    expect(c.delayTowerMs).toBe(0);
    expect(c.delayTowerDistance).toBe(0);
  });

  it("si hay torres, el delay y la distancia son coherentes entre sí", () => {
    const c = cfg(room({ length: 60, capacity: 1200 }));
    if (c.needsDelayTowers) {
      expect(c.delayTowerDistance).toBeGreaterThan(0);
      expect(c.delayTowerMs).toBeGreaterThan(0);
      // El delay total tiene que superar el tiempo de vuelo puro, o la torre
      // suena antes que el escenario y se pierde la localización.
      expect(c.delayTowerMs).toBeGreaterThan((c.delayTowerDistance / 352) * 1000);
    }
  });

  it("la temperatura de la sala afecta el delay de las torres", () => {
    const frio = cfg(room({ length: 60, capacity: 1200, temperature: 5 }));
    const calor = cfg(room({ length: 60, capacity: 1200, temperature: 35 }));
    if (frio.needsDelayTowers && calor.needsDelayTowers) {
      expect(frio.delayTowerMs).toBeGreaterThan(calor.delayTowerMs);
    }
  });

  it("nunca devuelve delays negativos", () => {
    for (const r of [room(), room({ length: 60 }), room({ length: 5 })]) {
      const c = cfg(r);
      expect(c.delayTowerMs).toBeGreaterThanOrEqual(0);
      expect(c.subAlignMs).toBeGreaterThanOrEqual(0);
    }
  });
});

describe("calculateStageConfig — robustez", () => {
  it("no produce NaN en ningún campo numérico", () => {
    for (const r of [room(), room({ width: 1, length: 1, height: 2 }), room({ width: 80, length: 140, height: 25 })]) {
      const c = cfg(r);
      for (const v of [c.coveragePercent, c.splFront, c.splRear, c.delayTowerMs, c.delayTowerDistance, c.subAlignMs]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("siempre explica sus decisiones", () => {
    expect(cfg().notes.length).toBeGreaterThan(0);
  });

  it("es determinista", () => {
    expect(JSON.stringify(cfg())).toBe(JSON.stringify(cfg()));
  });
});

describe("system-vitals — sceneToSources", () => {
  it("no genera fuentes sin equipo", () => {
    expect(sceneToSources(room(), [], [])).toHaveLength(0);
  });

  it("reparte los tops en dos lados y agrupa los subs en uno", () => {
    const src = sceneToSources(room(), [gear({ quantity: 4 })], [gear({ id: "s", category: "subs", quantity: 2 })]);
    const izq = src.filter(s => s.x < 0);
    const der = src.filter(s => s.x > 0);
    expect(izq.length).toBeGreaterThan(0);
    expect(der.length).toBeGreaterThan(0);
    expect(src.some(s => s.x === 0)).toBe(true); // el cluster de subs
  });

  it("mantiene todas las fuentes dentro del recinto", () => {
    const r = room();
    for (const s of sceneToSources(r, [gear({ quantity: 4 })], [gear({ id: "s", category: "subs", quantity: 2 })])) {
      expect(Math.abs(s.x)).toBeLessThanOrEqual(r.width / 2);
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThanOrEqual(r.height);
      expect(Number.isFinite(s.spl1m)).toBe(true);
    }
  });

  it("los subs acoplan más que los tops para la misma cantidad", () => {
    const conSubs = sceneToSources(room(), [], [gear({ id: "s", category: "subs", splMax: 138, quantity: 4 })]);
    const conTops = sceneToSources(room(), [gear({ splMax: 138, quantity: 4 })], []);
    const subSpl = conSubs[0].spl1m;
    const topSpl = Math.max(...conTops.map(s => s.spl1m));
    expect(subSpl).toBeGreaterThan(topSpl);
  });
});

describe("system-vitals — series y respuesta", () => {
  it("sessionsPeakSeries no rompe con lista vacía", () => {
    expect(() => sessionsPeakSeries([])).not.toThrow();
  });

  it("paSummary cuenta monitores además de tops y subs", () => {
    const pa = paSummary(TOPS, SUBS, [gear({ id: "m", category: "monitors", quantity: 3 })]);
    expect(pa.monitorsCount).toBe(3);
  });

  it("paFrequencyResponse cubre el rango audible sin huecos", () => {
    const curva = paFrequencyResponse(TOPS, SUBS, 80, 80, 20000, 80, 30);
    expect(curva.length).toBeGreaterThan(4);
    expect(curva.every(p => Number.isFinite(p.value))).toBe(true);
  });
});

describe("calculateDynamics — protección del altavoz", () => {
  const acoustics = calculateAcoustics(room());
  const amp = (w: number) => gear({ id: `a${w}`, category: "amp", brand: "Crown", model: `X${w}`, rmsWatts: w });
  const passive = (over: Partial<GearItem> = {}) =>
    gear({ active: false, rmsWatts: 400, peakWatts: 1600, impedanceOhms: 8, ...over });

  it("una caja activa gestiona su propio gain staging", () => {
    const d = calculateDynamics(gear({ active: true }), "top", [amp(1000)], acoustics);
    expect(d.gainStage.status).toBe("active");
    expect(d.gainStage.outputGainDb).toBe(0);
  });

  it("marca subalimentación cuando el amp no llega", () => {
    const d = calculateDynamics(passive({ rmsWatts: 800 }), "top", [amp(200)], acoustics);
    expect(d.gainStage.status).toBe("underpowered");
  });

  it("baja la ganancia cuando el amp sobra mucho", () => {
    const d = calculateDynamics(passive({ rmsWatts: 200 }), "top", [amp(2000)], acoustics);
    expect(d.gainStage.outputGainDb).toBeLessThan(0);
  });

  it("elige el amp MÁS potente: es el peor caso para el parlante", () => {
    // Si eligiera el más chico, el limitador quedaría flojo para el amp que
    // realmente puede estar conectado.
    const a = calculateDynamics(passive(), "top", [amp(500), amp(3000)], acoustics);
    const b = calculateDynamics(passive(), "top", [amp(3000), amp(500)], acoustics);
    expect(a.gainStage.ampWatts).toBe(b.gainStage.ampWatts);
    expect(a.gainStage.ampWatts).toBeGreaterThan(500);
  });

  it("a menor impedancia el amp entrega más potencia", () => {
    const ocho = calculateDynamics(passive({ impedanceOhms: 8 }), "top", [amp(1000)], acoustics);
    const cuatro = calculateDynamics(passive({ impedanceOhms: 4 }), "top", [amp(1000)], acoustics);
    expect(cuatro.gainStage.ampWatts!).toBeGreaterThan(ocho.gainStage.ampWatts!);
    // Pero nunca el doble: hay pérdidas internas reales.
    expect(cuatro.gainStage.ampWatts!).toBeLessThan(ocho.gainStage.ampWatts! * 2);
  });

  it("avisa en vez de inventar cuando falta el amplificador", () => {
    const d = calculateDynamics(passive(), "top", [], acoustics);
    expect(d.gainStage.status).toBe("unknown");
    expect(d.gainStage.note.length).toBeGreaterThan(20);
  });

  it("los subs toleran ataques más lentos que los tops", () => {
    const top = calculateDynamics(gear({ active: true }), "top", [], acoustics);
    const sub = calculateDynamics(gear({ active: true, category: "subs" }), "sub", [], acoustics);
    expect(sub.limiterAttackMs).toBeGreaterThanOrEqual(top.limiterAttackMs);
  });

  it("el threshold siempre queda por debajo del SPL máximo del parlante", () => {
    for (const role of ["top", "sub", "monitor"] as const) {
      const d = calculateDynamics(gear({ active: true, splMax: 138 }), role, [], acoustics);
      expect(d.limiterDb).toBeLessThan(138);
      // El headroom es lo accionable: lo que el técnico teclea en el DSP.
      expect(d.limiterHeadroomDb).toBeGreaterThan(0);
    }
  });

  it("no produce NaN en ningún parámetro", () => {
    const d = calculateDynamics(passive(), "top", [amp(1000)], acoustics);
    for (const v of [d.limiterDb, d.limiterHeadroomDb, d.limiterAttackMs, d.limiterReleaseMs, d.gainStage.outputGainDb]) {
      expect(Number.isFinite(v)).toBe(true);
    }
  });
});
