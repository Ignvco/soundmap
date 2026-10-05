export interface FilterCoefficients { feedforward: number[]; feedback: number[] }
const polynomial = (roots: number[]) => roots.reduce((a, r) => {
  const next = Array(a.length + 1).fill(0) as number[];
  a.forEach((x, i) => { next[i] += x; next[i + 1] -= x * r; }); return next;
}, [1]);
function response(c: FilterCoefficients, hz: number, fs: number): number {
  const magnitude = (v: number[]) => {
    let re = 0, im = 0; v.forEach((a, i) => { const angle = -2 * Math.PI * hz / fs * i; re += a * Math.cos(angle); im += a * Math.sin(angle); });
    return Math.hypot(re, im);
  };
  return magnitude(c.feedforward) / magnitude(c.feedback);
}
/** Bilinear transform of the analogue A-weighting pole/zero definition.
 * Normalised at 1 kHz. High-frequency warping is documented; no IEC class claim.
 * Cascade sections keep the near-DC poles numerically stable.
 */
export function aWeightingSections(sampleRate: number): FilterCoefficients[] {
  const pole = (f: number) => (2 * sampleRate - 2 * Math.PI * f) / (2 * sampleRate + 2 * Math.PI * f);
  const sections = [
    { feedforward: polynomial([1, 1]), feedback: polynomial([pole(20.598997), pole(20.598997)]) },
    { feedforward: polynomial([1, 1]), feedback: polynomial([pole(107.65265), pole(737.86223)]) },
    { feedforward: polynomial([-1, -1]), feedback: polynomial([pole(12194.217), pole(12194.217)]) },
  ];
  const gain = sections.reduce((g, s) => g * response(s, 1000, sampleRate), 1);
  sections[0].feedforward = sections[0].feedforward.map(b => b / gain);
  return sections;
}
export function digitalAWeightingDb(hz: number, sampleRate = 48000): number {
  return 20 * Math.log10(aWeightingSections(sampleRate).reduce((g, c) => g * response(c, hz, sampleRate), 1));
}
