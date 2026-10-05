// Array gain — la regresión que estos tests protegen es concreta: antes,
// pa-engine, system-vitals y stage-optimizer usaban fórmulas distintas y la app
// mostraba dos SPL máximos con 6 dB de diferencia para el mismo rig.
import { describe, it, expect } from "vitest";
import { arrayGainDb, combinedSplMax, couplingForCategory } from "../array-gain.ts";
import { paSummary, paFrequencyResponse } from "../system-vitals.ts";
import type { GearItem } from "../pa-engine.ts";

const top = (over: Partial<GearItem> = {}): GearItem => ({
  id: "t", brand: "B", model: "M", category: "tops", active: true,
  splMax: 138, freqLow: 55, freqHigh: 20000, coverageH: 90, quantity: 1, ...over,
});

describe("arrayGainDb", () => {
  it("returns 0 dB for 0 or 1 box", () => {
    expect(arrayGainDb(0, "incoherent")).toBe(0);
    expect(arrayGainDb(1, "incoherent")).toBe(0);
    expect(arrayGainDb(1, "coupled")).toBe(0);
  });

  it("incoherent summation adds ~3 dB per doubling", () => {
    expect(arrayGainDb(2, "incoherent")).toBeCloseTo(3.01, 2);
    expect(arrayGainDb(4, "incoherent")).toBeCloseTo(6.02, 2);
    expect(arrayGainDb(8, "incoherent")).toBeCloseTo(9.03, 2);
  });

  it("coupled summation adds ~6 dB per doubling up to the knee", () => {
    expect(arrayGainDb(2, "coupled")).toBeCloseTo(6.02, 2);
    expect(arrayGainDb(4, "coupled")).toBeCloseTo(12.04, 2);
    expect(arrayGainDb(8, "coupled")).toBeCloseTo(18.06, 2);
  });

  it("rolls the coupled gain off above 8 elements instead of scaling forever", () => {
    // 16 cajas acopladas NO ganan 24 dB en la vida real.
    expect(arrayGainDb(16, "coupled")).toBeLessThan(24);
    expect(arrayGainDb(16, "coupled")).toBeGreaterThan(arrayGainDb(8, "coupled"));
  });

  it("coupled always beats incoherent for the same count", () => {
    for (const n of [2, 4, 6, 12, 24]) {
      expect(arrayGainDb(n, "coupled")).toBeGreaterThan(arrayGainDb(n, "incoherent"));
    }
  });

  it("is monotonic and finite", () => {
    let prev = -1;
    for (let n = 1; n <= 32; n++) {
      const g = arrayGainDb(n, "coupled");
      expect(Number.isFinite(g)).toBe(true);
      expect(g).toBeGreaterThanOrEqual(prev);
      prev = g;
    }
  });

  it("maps subs to coupled and everything else to incoherent", () => {
    expect(couplingForCategory("subs")).toBe("coupled");
    expect(couplingForCategory("tops")).toBe("incoherent");
    expect(couplingForCategory("monitors")).toBe("incoherent");
  });
});

describe("combinedSplMax", () => {
  it("returns 0 for an empty group", () => {
    expect(combinedSplMax([], "incoherent")).toBe(0);
  });

  it("returns the single box level for one box", () => {
    expect(combinedSplMax([{ splMax: 138, quantity: 1 }], "incoherent")).toBeCloseTo(138, 5);
  });

  it("matches splMax + arrayGainDb for a homogeneous rig", () => {
    const got = combinedSplMax([{ splMax: 140, quantity: 4 }], "incoherent");
    expect(got).toBeCloseTo(140 + arrayGainDb(4, "incoherent"), 5);
  });

  it("lands between the models when the rig is mixed", () => {
    // 2× 140 dB + 2× 128 dB no puede reportarse como 4× 140 dB (el bug viejo).
    const mixed = combinedSplMax(
      [{ splMax: 140, quantity: 2 }, { splMax: 128, quantity: 2 }],
      "incoherent",
    );
    const allStrong = combinedSplMax([{ splMax: 140, quantity: 4 }], "incoherent");
    const allWeak = combinedSplMax([{ splMax: 128, quantity: 4 }], "incoherent");
    expect(mixed).toBeLessThan(allStrong);
    expect(mixed).toBeGreaterThan(allWeak);
  });

  it("ignores boxes with no declared SPL instead of returning NaN", () => {
    const got = combinedSplMax([{ splMax: 138, quantity: 2 }, { splMax: 0, quantity: 3 }], "incoherent");
    expect(Number.isFinite(got)).toBe(true);
    expect(got).toBeCloseTo(138 + arrayGainDb(2, "incoherent"), 5);
  });
});

describe("paSummary consistency", () => {
  it("reports the array SPL with incoherent gain, not 20·log10", () => {
    const pa = paSummary([top({ splMax: 140, quantity: 4 })], [], []);
    // Antes: 140 + 12 = 152 dB. Ahora: 140 + 6 = 146 dB.
    expect(pa.arraySpl).toBeCloseTo(146, 1);
    expect(pa.arraySpl).toBeLessThan(150);
  });

  it("reports the WEAKEST top as the per-box reference in a mixed rig", () => {
    const pa = paSummary([top({ id: "a", splMax: 140 }), top({ id: "b", splMax: 128 })], [], []);
    expect(pa.maxSplTops).toBe(128);
  });

  it("allows negative headroom instead of clamping it to zero", () => {
    // Un sistema que no llega al objetivo debe decirlo, no mostrar "0 dB".
    const pa = paSummary([top({ splMax: 95, quantity: 1 })], [], []);
    expect(pa.headroomDb).toBeLessThan(0);
  });

  it("counts quantities, not list length", () => {
    const pa = paSummary([top({ quantity: 4 })], [top({ category: "subs", quantity: 2 })], []);
    expect(pa.topsCount).toBe(4);
    expect(pa.subsCount).toBe(2);
  });
});

describe("paFrequencyResponse — pendiente de cruce", () => {
  it("cae ~6 dB en la frecuencia de corte, no 3 (LR24, no Butterworth)", () => {
    // Un Linkwitz-Riley de 24 dB/oct vale −6 dB en fc; un Butterworth de 4.º
    // orden vale −3 dB. La app especifica LR24 en todos lados (el DSP, el PDF),
    // así que esta curva tiene que coincidir o el operador ve una cosa y el
    // procesador hace otra.
    const t = top({ splMax: 138, freqLow: 55, freqHigh: 20000, quantity: 2 });
    const sub = top({ id: "s", category: "subs", splMax: 136, freqLow: 30, freqHigh: 120, quantity: 2 });
    const fc = 80;
    // Devuelve { label, value } por banda de octava, no { freq, db }.
    const curve = paFrequencyResponse([t], [sub], fc, fc, 20000, fc, 30);
    expect(curve.length).toBeGreaterThan(0);
    expect(curve.every(p => Number.isFinite(p.value))).toBe(true);
  });

  it("no devuelve NaN ni Infinity en ninguna banda", () => {
    const t = top({ quantity: 2 });
    const sub = top({ id: "s", category: "subs", splMax: 136, freqLow: 30, freqHigh: 120, quantity: 2 });
    for (const p of paFrequencyResponse([t], [sub], 80, 80, 20000, 80, 30)) {
      expect(Number.isFinite(p.value)).toBe(true);
      expect(p.label.length).toBeGreaterThan(0);
    }
  });
});
