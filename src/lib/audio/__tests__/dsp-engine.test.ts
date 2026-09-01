// DSP Engine — la pantalla central del producto. Estos valores se copian
// literalmente a un DCX2496 o similar, así que un error acá sale por los
// parlantes.
import { describe, it, expect } from "vitest";
import { generateDSPConfig } from "../dsp-engine.ts";
import { calculateAcoustics, type RoomScanInput } from "../acoustics.ts";
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

const TOP = gear({ id: "t", quantity: 2 });
const SUB = gear({ id: "s", category: "subs", splMax: 136, freqLow: 30, freqHigh: 120, quantity: 2 });
const MON = gear({ id: "m", category: "monitors", splMax: 128, freqLow: 70, freqHigh: 18000, quantity: 2 });

function build(tops: GearItem[], subs: GearItem[], monitors: GearItem[] = [], r = room()) {
  return generateDSPConfig(r, calculateAcoustics(r), tops, subs, monitors, null, []);
}

describe("generateDSPConfig — estructura", () => {
  it("no genera salidas sin equipo", () => {
    expect(build([], []).outputs).toHaveLength(0);
  });

  it("genera L/D de tops y de subs", () => {
    const dests = build([TOP], [SUB]).outputs.map((o) => o.destination);
    expect(dests).toContain("TOP L");
    expect(dests).toContain("TOP R");
    expect(dests).toContain("SUB L");
    expect(dests).toContain("SUB R");
  });

  it("una sola caja de top da un mirror, no un par estéreo", () => {
    const dests = build([gear({ quantity: 1 })], [SUB]).outputs.map((o) => o.destination);
    expect(dests).toContain("TOP R (Mirror)");
  });

  it("cuenta unidades, no renglones: una entrada con quantity 2 es un par real", () => {
    // El bug: se usaba tops.length (cantidad de MODELOS distintos), así que el
    // caso más común —un solo modelo, dos cajas— caía en la rama de "mirror".
    const dests = build([gear({ quantity: 2 })], []).outputs.map((o) => o.destination);
    expect(dests).toContain("TOP R");
    expect(dests).not.toContain("TOP R (Mirror)");
  });

  it("da ids de salida únicos", () => {
    const ids = build([TOP], [SUB], [MON]).outputs.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("genera una salida por monitor", () => {
    const outs = build([TOP], [SUB], [MON, gear({ id: "m2", category: "monitors" })]).outputs;
    expect(outs.filter((o) => o.role === "monitor")).toHaveLength(2);
  });
});

describe("generateDSPConfig — seguridad de los altavoces", () => {
  it("los dos lados de los tops llevan EXACTAMENTE el mismo EQ", () => {
    // Si L y D difieren, la imagen estéreo se corre. Pasaba con un solo modelo:
    // OUT-A llevaba un shelf de +1.5 dB en 10 kHz y el mirror no.
    for (const tops of [[gear({ quantity: 1 })], [gear({ quantity: 2 })]]) {
      const outs = build(tops, [SUB]).outputs.filter((o) => o.role === "top");
      expect(outs.length).toBeGreaterThanOrEqual(2);
      expect(outs[0].eq).toEqual(outs[1].eq);
      expect(outs[0].limiterDb).toBe(outs[1].limiterDb);
      expect(outs[0].gain).toBe(outs[1].gain);
    }
  });

  it("el limitador se calcula sobre la caja MÁS DÉBIL del rig mixto", () => {
    // El bug que esto protege: se usaba tops[0]. Con un 140 dB primero y un
    // 128 dB segundo, el limitador quedaba 12 dB por encima de lo que aguanta
    // el segundo — nunca actuaba y se quemaba el driver chico.
    const fuerte = gear({ id: "a", splMax: 140 });
    const debil = gear({ id: "b", splMax: 128 });
    const conDebil = build([fuerte, debil], []).outputs.find((o) => o.role === "top")!;
    const soloFuerte = build([fuerte], []).outputs.find((o) => o.role === "top")!;
    expect(conDebil.limiterDb).toBeLessThan(soloFuerte.limiterDb);
  });

  it("el orden de la lista no cambia el limitador", () => {
    const a = gear({ id: "a", splMax: 140 });
    const b = gear({ id: "b", splMax: 128 });
    const ab = build([a, b], []).outputs.find((o) => o.role === "top")!.limiterDb;
    const ba = build([b, a], []).outputs.find((o) => o.role === "top")!.limiterDb;
    expect(ab).toBe(ba);
  });

  it("nunca pide a un top reproducir por debajo de su límite físico", () => {
    const topAlto = gear({ freqLow: 95, quantity: 2 });
    for (const o of build([topAlto], [SUB]).outputs.filter((x) => x.role === "top")) {
      expect(o.hpfHz).toBeGreaterThanOrEqual(90);
    }
  });

  it("todo HPF queda por debajo de su LPF en cada salida", () => {
    for (const o of build([TOP], [SUB], [MON]).outputs) {
      expect(o.hpfHz).toBeLessThan(o.lpfHz);
    }
  });

  it("los subs se cortan antes que los tops (sin solape invertido)", () => {
    const outs = build([TOP], [SUB]).outputs;
    const sub = outs.find((o) => o.role === "sub")!;
    const top = outs.find((o) => o.role === "top")!;
    expect(sub.lpfHz).toBeLessThanOrEqual(top.hpfHz * 1.5);
  });
});

describe("generateDSPConfig — valores utilizables", () => {
  it("no produce NaN ni Infinity en ningún parámetro numérico", () => {
    for (const o of build([TOP], [SUB], [MON]).outputs) {
      for (const v of [o.gain, o.delayMs, o.hpfHz, o.lpfHz, o.limiterDb]) {
        expect(Number.isFinite(v)).toBe(true);
      }
      for (const b of o.eq) {
        expect(Number.isFinite(b.freq)).toBe(true);
        expect(Number.isFinite(b.gain)).toBe(true);
        expect(b.q).toBeGreaterThan(0);
      }
    }
  });

  it("los delays nunca son negativos — ningún DSP los acepta", () => {
    for (const o of build([TOP], [SUB], [MON]).outputs) {
      expect(o.delayMs).toBeGreaterThanOrEqual(0);
    }
  });

  it("mantiene el EQ dentro de rangos aplicables", () => {
    for (const o of build([TOP], [SUB], [MON]).outputs) {
      for (const b of o.eq) {
        expect(b.freq).toBeGreaterThanOrEqual(20);
        expect(b.freq).toBeLessThanOrEqual(20000);
        expect(Math.abs(b.gain)).toBeLessThanOrEqual(12);
      }
    }
  });

  it("sólo una de las dos fuentes lleva delay de alineación", () => {
    const outs = build([TOP], [SUB]).outputs;
    const topDelay = outs.find((o) => o.role === "top")!.delayMs;
    const subDelay = outs.find((o) => o.role === "sub")!.delayMs;
    expect(topDelay > 0 && subDelay > 0).toBe(false);
  });

  it("explica cada decisión en las notas", () => {
    const cfg = build([TOP], [SUB], [MON]);
    expect(cfg.notes.length).toBeGreaterThan(3);
    expect(cfg.notes.join(" ")).toContain("Cruce");
  });

  it("es determinista: mismo input, mismo output", () => {
    const a = JSON.stringify(build([TOP], [SUB], [MON]));
    const b = JSON.stringify(build([TOP], [SUB], [MON]));
    expect(a).toBe(b);
  });

  it("no explota con salas degeneradas", () => {
    for (const r of [room({ width: 1, length: 1, height: 2 }), room({ width: 80, length: 120, height: 25 })]) {
      expect(() => build([TOP], [SUB], [MON], r)).not.toThrow();
    }
  });
});
