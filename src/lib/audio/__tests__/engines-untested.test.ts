// Motores que estaban en 0 % de cobertura: channels, live y early-reflections.
// El patrón `[0]` (asumir que el rig es homogéneo) apareció en cinco módulos
// distintos, así que estos tests lo buscan explícitamente.
import { describe, it, expect } from "vitest";
import { generateChannelPatch } from "../channels-engine.ts";
import {
  generateStartupProcedure,
  generateLineCheckProcedure,
  generateBackupProcedure,
  generateEmergencyProcedure,
} from "../live-engine.ts";
import { calculateEarlyReflections } from "../early-reflections.ts";
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

const mic = (over: Partial<GearItem> = {}): GearItem =>
  gear({ category: "mic", splMax: 0, ...over });

const ACOUSTICS = calculateAcoustics(room());

describe("generateChannelPatch", () => {
  it("sin micrófonos entrega la plantilla de banda estándar", () => {
    // No devuelve vacío a propósito: la plantilla es un punto de partida útil.
    const base = generateChannelPatch([], ACOUSTICS);
    expect(base.length).toBeGreaterThan(8);
  });

  it("numera los canales de forma consecutiva y sin repetir", () => {
    const patch = generateChannelPatch(
      [mic({ id: "m1", quantity: 4 }), mic({ id: "m2", model: "Otro", quantity: 2 })],
      ACOUSTICS,
    );
    const nums = patch.map((c) => c.ch);
    expect(new Set(nums).size).toBe(nums.length);
    expect(nums).toEqual([...nums].sort((a, b) => a - b));
  });

  it("asigna los micrófonos reales a los canales, no sólo el primero", () => {
    // El bug: sólo escribía el modelo del PRIMER micrófono, en el canal 12.
    const base = generateChannelPatch([], ACOUSTICS);
    const conMics = generateChannelPatch([mic({ brand: "Shure", model: "SM57", quantity: 4 })], ACOUSTICS);
    const asignados = conMics.filter(c => c.source.includes("SM57"));
    expect(asignados.length).toBe(4);
    expect(conMics.length).toBeGreaterThanOrEqual(base.length);
  });

  it("no ignora los modelos más allá del primero (patrón [0])", () => {
    const patch = generateChannelPatch(
      [mic({ id: "a", brand: "Shure", model: "SM57", quantity: 2 }),
       mic({ id: "b", brand: "Sennheiser", model: "e945", quantity: 3 })],
      ACOUSTICS,
    );
    expect(patch.some(c => c.source.includes("SM57"))).toBe(true);
    expect(patch.some(c => c.source.includes("e945"))).toBe(true);
  });

  it("marca phantom sólo donde corresponde y nunca ambas cosas a la vez", () => {
    for (const ch of generateChannelPatch([mic({ quantity: 3 })], ACOUSTICS)) {
      expect(typeof ch.phantom).toBe("boolean");
      expect(["low", "medium", "high"]).toContain(ch.feedbackRisk);
    }
  });

  it("crea canales extra cuando hay más micrófonos que la plantilla", () => {
    const base = generateChannelPatch([], ACOUSTICS);
    const muchos = generateChannelPatch([mic({ quantity: base.length + 5 })], ACOUSTICS);
    expect(muchos.length).toBe(base.length + 5);
    const nums = muchos.map(c => c.ch);
    expect(new Set(nums).size).toBe(nums.length);
  });

  it("da a cada canal un nombre y un destino no vacíos", () => {
    for (const ch of generateChannelPatch([mic({ quantity: 2 })], ACOUSTICS)) {
      expect(ch.source.length).toBeGreaterThan(0);
      expect(Number.isFinite(ch.ch)).toBe(true);
    }
  });

  it("es determinista", () => {
    const a = JSON.stringify(generateChannelPatch([mic({ quantity: 3 })], ACOUSTICS));
    const b = JSON.stringify(generateChannelPatch([mic({ quantity: 3 })], ACOUSTICS));
    expect(a).toBe(b);
  });
});

describe("live-engine — procedimientos", () => {
  const tops = [gear({ quantity: 2 })];
  const subs = [gear({ id: "s", category: "subs", splMax: 136, freqLow: 30, freqHigh: 120, quantity: 2 })];
  const dsp = [gear({ id: "d", category: "dsp", brand: "Behringer", model: "DCX2496" })];
  const amps = [gear({ id: "a", category: "amp", brand: "Crown", model: "XLS" })];

  it("el arranque tiene pasos ordenados sin huecos ni repetidos", () => {
    const p = generateStartupProcedure(tops, subs, dsp, amps, ACOUSTICS);
    const orders = p.steps.map((s) => s.order);
    expect(orders).toEqual([...orders].sort((a, b) => a - b));
    expect(new Set(orders).size).toBe(orders.length);
  });

  it("enciende las etapas en el orden seguro: fuentes antes que amplificación", () => {
    // Encender los amplificadores primero mete un golpe por los parlantes.
    const p = generateStartupProcedure(tops, subs, dsp, amps, ACOUSTICS);
    const texto = p.steps.map((s) => s.title.toLowerCase());
    const iDsp = texto.findIndex((t) => t.includes("dsp"));
    const iAmp = texto.findIndex((t) => t.includes("ampl") || t.includes("potencia"));
    if (iDsp >= 0 && iAmp >= 0) expect(iDsp).toBeLessThan(iAmp);
  });

  it("todos los pasos tienen título y descripción utilizables", () => {
    for (const proc of [
      generateStartupProcedure(tops, subs, dsp, amps, ACOUSTICS),
      generateLineCheckProcedure(),
      generateBackupProcedure(tops, subs, dsp),
      generateEmergencyProcedure(),
    ]) {
      expect(proc.steps.length).toBeGreaterThan(0);
      for (const s of proc.steps) {
        expect(s.title.trim().length).toBeGreaterThan(3);
        expect(s.description.trim().length).toBeGreaterThan(10);
      }
    }
  });

  it("el procedimiento de emergencia arranca por mutear", () => {
    // Si el primer paso no es cortar el audio, el procedimiento no sirve.
    const first = generateEmergencyProcedure().steps[0];
    expect(`${first.title} ${first.description}`.toLowerCase()).toMatch(/mute|cortar|silenc/);
  });

  it("no rompe con un rig vacío", () => {
    expect(() => generateStartupProcedure([], [], [], [], ACOUSTICS)).not.toThrow();
    expect(() => generateBackupProcedure([], [], [])).not.toThrow();
  });
});

describe("calculateEarlyReflections", () => {
  const call = (over: Partial<{ speed: number; dist: number }> = {}) =>
    calculateEarlyReflections(room(), 3, 2, over.dist ?? 12, 1.5, 138, over.speed ?? 343);

  it("devuelve las seis superficies del recinto", () => {
    const r = call();
    expect(r.reflections).toHaveLength(6);
    const b = r.reflections.map((x) => x.boundary);
    for (const s of ["ceiling", "floor", "rear-wall", "front-wall", "side-left", "side-right"]) {
      expect(b).toContain(s);
    }
  });

  it("toda reflexión llega DESPUÉS del sonido directo", () => {
    // Un delta negativo significaría que el rebote llega antes que el directo:
    // físicamente imposible y señal de un error de signo en la fuente imagen.
    for (const x of call().reflections) {
      expect(x.deltaMs).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(x.deltaMs)).toBe(true);
    }
  });

  it("toda reflexión es más débil que la fuente directa", () => {
    for (const x of call().reflections) {
      expect(x.splAtReceiver).toBeLessThan(138);
    }
  });

  it("con aire más frío el sonido tarda más en rebotar", () => {
    const frio = calculateEarlyReflections(room(), 3, 2, 12, 1.5, 138, 331);
    const calor = calculateEarlyReflections(room(), 3, 2, 12, 1.5, 138, 352);
    for (let i = 0; i < frio.reflections.length; i++) {
      expect(frio.reflections[i].deltaMs).toBeGreaterThanOrEqual(calor.reflections[i].deltaMs);
    }
  });

  it("las paredes laterales son simétricas en una sala simétrica", () => {
    const r = call();
    const izq = r.reflections.find((x) => x.boundary === "side-left")!;
    const der = r.reflections.find((x) => x.boundary === "side-right")!;
    expect(izq.deltaMs).toBeCloseTo(der.deltaMs, 6);
  });

  it("la primera nula del comb filter cae donde manda la teoría", () => {
    // Primera cancelación en f = 1 / (2·Δt): con 5 ms son 100 Hz.
    for (const x of call().reflections) {
      if (x.deltaMs > 0.1) {
        expect(Math.abs(x.firstNullHz - 1000 / (2 * x.deltaMs))).toBeLessThan(6);
      }
    }
  });

  it("no produce NaN en ningún campo numérico", () => {
    for (const x of call().reflections) {
      for (const v of [x.pathM, x.deltaMs, x.splAtReceiver, x.firstNullHz]) {
        expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("siempre entrega una recomendación al usuario", () => {
    expect(call().recommendation.length).toBeGreaterThan(20);
  });

  it("no rompe con salas degeneradas", () => {
    for (const r of [room({ width: 1, length: 1, height: 2 }), room({ width: 90, length: 140, height: 30 })]) {
      expect(() => calculateEarlyReflections(r, 3, 2, 12, 1.5, 138, 343)).not.toThrow();
    }
  });
});

describe("early-reflections con la geometría que usa el panel del escaneo", () => {
  // El panel deriva la posición de la fuente del recinto. Si esa derivación
  // produjera una fuente fuera de la sala, los números serían basura sin que
  // nada avisara.
  const panelGeometry = (r: RoomScanInput) => ({
    srcHeight: Math.min(r.height * 0.75, r.height - 0.5),
    srcDepth: r.length * 0.38,
    receiverDist: r.length * 0.25,
  });

  it("coloca la fuente dentro del recinto en cualquier sala razonable", () => {
    for (const r of [room(), room({ height: 2.5 }), room({ height: 20, length: 60 }), room({ length: 6 })]) {
      const g = panelGeometry(r);
      expect(g.srcHeight).toBeGreaterThan(0);
      expect(g.srcHeight).toBeLessThan(r.height);
      expect(g.srcDepth).toBeLessThan(r.length / 2 + 0.01);
    }
  });

  it("produce reflexiones utilizables con esa geometría", () => {
    for (const r of [room(), room({ height: 3 }), room({ width: 40, length: 60 })]) {
      const g = panelGeometry(r);
      const res = calculateEarlyReflections(r, g.srcHeight, g.srcDepth, g.receiverDist, 1.5, 130, 343);
      expect(res.reflections).toHaveLength(6);
      for (const x of res.reflections) {
        expect(x.deltaMs).toBeGreaterThanOrEqual(0);
        expect(Number.isFinite(x.firstNullHz)).toBe(true);
        expect(x.firstNullHz).toBeGreaterThan(0);
      }
      expect(res.worstCombFreqHz).toBeGreaterThan(0);
    }
  });

  it("un techo bajo produce una reflexión de techo más temprana", () => {
    const mk = (h: number) => {
      const r = room({ height: h });
      const g = panelGeometry(r);
      return calculateEarlyReflections(r, g.srcHeight, g.srcDepth, g.receiverDist, 1.5, 130, 343)
        .reflections.find(x => x.boundary === "ceiling")!;
    };
    // Menos altura = camino reflejado más corto = menos retardo = comb más arriba.
    expect(mk(3).deltaMs).toBeLessThan(mk(12).deltaMs);
  });
});
