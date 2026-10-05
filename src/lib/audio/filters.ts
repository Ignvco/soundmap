import type { DSPBand } from "./dsp-engine";

export interface Complex { re: number; im: number }
export const multiply = (a: Complex, b: Complex): Complex => ({ re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re });
export const magnitudeDb = (a: Complex) => 20 * Math.log10(Math.max(1e-12, Math.hypot(a.re, a.im)));
const divide = (a: Complex, b: Complex): Complex => {
  const d = b.re * b.re + b.im * b.im;
  return { re: (a.re * b.re + a.im * b.im) / d, im: (a.im * b.re - a.re * b.im) / d };
};

/** Ideal analogue LR24: two cascaded Butterworth sections, INCLUDING phase. */
export function lr24(f: number, corner: number, kind: "hp" | "lp"): Complex {
  if (!(corner > 0)) return { re: 1, im: 0 };
  const r = f / corner;
  const section = divide({ re: kind === "lp" ? 1 : -r * r, im: 0 }, { re: 1 - r * r, im: Math.SQRT2 * r });
  return multiply(section, section);
}
export const lr24Db = (f: number, corner: number, kind: "hp" | "lp") => magnitudeDb(lr24(f, corner, kind));

/** RBJ biquad transfer, evaluated at the same sample rate as the coefficient design. */
export function bandResponse(band: DSPBand, frequency: number, sampleRate = 48000): Complex {
  const f0 = Math.max(1, Math.min(sampleRate * 0.49, band.freq));
  const A = 10 ** (band.gain / 40), w = 2 * Math.PI * f0 / sampleRate;
  const c = Math.cos(w), s = Math.sin(w), alpha = s / (2 * Math.max(0.05, band.q));
  let b: number[], a: number[];
  if (band.type === "hp" || band.type === "lp") {
    const sign = band.type === "hp" ? 1 : -1;
    b = [(1 + sign * c) / 2, -sign * (1 + sign * c), (1 + sign * c) / 2];
    a = [1 + alpha, -2 * c, 1 - alpha];
  } else if (band.type === "shelf-lo" || band.type === "shelf-hi") {
    const k = 2 * Math.sqrt(A) * s / Math.SQRT2;
    if (band.type === "shelf-lo") {
      b = [A * ((A + 1) - (A - 1) * c + k), 2 * A * ((A - 1) - (A + 1) * c), A * ((A + 1) - (A - 1) * c - k)];
      a = [(A + 1) + (A - 1) * c + k, -2 * ((A - 1) + (A + 1) * c), (A + 1) + (A - 1) * c - k];
    } else {
      b = [A * ((A + 1) + (A - 1) * c + k), -2 * A * ((A - 1) + (A + 1) * c), A * ((A + 1) + (A - 1) * c - k)];
      a = [(A + 1) - (A - 1) * c + k, 2 * ((A - 1) - (A + 1) * c), (A + 1) - (A - 1) * c - k];
    }
  } else {
    b = [1 + alpha * A, -2 * c, 1 - alpha * A];
    a = [1 + alpha / A, -2 * c, 1 - alpha / A];
  }
  const wf = 2 * Math.PI * frequency / sampleRate;
  const polynomial = (v: number[]): Complex => ({ re: v[0] + v[1] * Math.cos(wf) + v[2] * Math.cos(2 * wf), im: -v[1] * Math.sin(wf) - v[2] * Math.sin(2 * wf) });
  return divide(polynomial(b), polynomial(a));
}
export const eqResponseDb = (bands: DSPBand[], f: number) => bands.reduce((sum, band) => sum + magnitudeDb(bandResponse(band, f)), 0);
