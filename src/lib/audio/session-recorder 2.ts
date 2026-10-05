// Session Recorder — captures SPL samples over time and exports the log as
// CSV/JSON, plus computes exposure statistics compliant with ISO 1999 / EU
// 2003/10/EC noise-at-work directive.
//
// Usage:
//   const rec = new SessionRecorder();
//   rec.start();
//   rec.push(reading); // called from useSPLMeter's loop
//   ...
//   const stats = rec.summary();
//   const csv = rec.toCSV();
//   rec.stop();
//
// Exposure calc:
//   For each sample s_i with SPL L_i, add energy 10^(L_i/10) * dt_i.
//   Leq(T) = 10·log10(sum(energy) / T).
//   Daily exposure LEX = Leq + 10·log10(T/8h) — extrapolated to an 8h day.
//   Peak = max(L_i).
//   Time above 85 / 90 / 95 dB accumulated in seconds.

export interface SplSample {
  /** Timestamp in ms since start of recording. */
  tMs: number;
  /** Instantaneous SPL in dB. */
  spl: number;
  /** Peak hold at this instant (optional). */
  peak?: number;
}

export interface SessionSummary {
  /** Duration of the recording in seconds. */
  durationSec: number;
  /** Number of samples captured. */
  samples: number;
  /** Leq for the full recording (equivalent continuous level, dB). */
  leq: number;
  /** Peak SPL observed (dB). */
  peak: number;
  /** Minimum SPL observed (dB). */
  min: number;
  /** Mean instantaneous SPL (dB). */
  mean: number;
  /** Extrapolated 8h daily exposure LEX,8h (dB) — EU directive metric. */
  lex8h: number;
  /** Time (s) with SPL above 85 / 90 / 95 dB — regulatory action thresholds. */
  timeAbove85: number;
  timeAbove90: number;
  timeAbove95: number;
  /** Whether the session exceeded EU exposure action values. */
  exceedsAction: boolean;
  /** Recommended action per EU 2003/10/EC. */
  euCompliance: "safe" | "lower-action" | "upper-action" | "exposure-limit";
  /** ISO date-time when the recording started. */
  startedAt: string;
}

export class SessionRecorder {
  private samples: SplSample[] = [];
  private startedAt: number | null = null;
  private lastPushMs: number | null = null;
  /** Precomputed energy integral so summary() stays O(1). */
  private energyIntegral = 0;
  private timeAbove85 = 0;
  private timeAbove90 = 0;
  private timeAbove95 = 0;
  private peak = 0;
  private min = Infinity;
  private sumSpl = 0;

  isRecording(): boolean {
    return this.startedAt !== null;
  }

  start() {
    this.samples = [];
    this.startedAt = Date.now();
    this.lastPushMs = 0;
    this.energyIntegral = 0;
    this.timeAbove85 = 0;
    this.timeAbove90 = 0;
    this.timeAbove95 = 0;
    this.peak = 0;
    this.min = Infinity;
    this.sumSpl = 0;
  }

  stop() {
    // Preserve `lastPushMs` so `summary()` can still report a correct
    // duration after the recording ends. Only clear `startedAt` to flag the
    // recorder as not-actively-recording.
    this.startedAt = null;
  }

  clear() {
    this.stop();
    this.samples = [];
  }

  /** Push a new SPL reading. Silently ignored if not recording. */
  push(spl: number, peak?: number) {
    if (this.startedAt === null || this.lastPushMs === null) return;
    const tMs = Date.now() - this.startedAt;
    const dtSec = Math.max(0, (tMs - this.lastPushMs) / 1000);
    this.lastPushMs = tMs;
    this.samples.push({ tMs, spl, peak });

    // Integrate energy: 10^(L/10) · dt
    this.energyIntegral += Math.pow(10, spl / 10) * dtSec;
    if (spl >= 85) this.timeAbove85 += dtSec;
    if (spl >= 90) this.timeAbove90 += dtSec;
    if (spl >= 95) this.timeAbove95 += dtSec;
    if (spl > this.peak) this.peak = spl;
    if (spl < this.min) this.min = spl;
    this.sumSpl += spl;
  }

  get sampleCount() { return this.samples.length; }

  summary(): SessionSummary {
    const n = this.samples.length;
    const durationSec = this.lastPushMs !== null ? this.lastPushMs / 1000 : 0;
    if (n === 0 || durationSec <= 0) {
      return {
        durationSec: 0, samples: 0, leq: 0, peak: 0, min: 0, mean: 0,
        lex8h: 0, timeAbove85: 0, timeAbove90: 0, timeAbove95: 0,
        exceedsAction: false, euCompliance: "safe",
        startedAt: new Date(this.startedAt ?? Date.now()).toISOString(),
      };
    }
    const leq = 10 * Math.log10(Math.max(this.energyIntegral / durationSec, 1e-12));
    const lex8h = leq + 10 * Math.log10(durationSec / (8 * 3600));
    let euCompliance: SessionSummary["euCompliance"] = "safe";
    if (lex8h >= 87) euCompliance = "exposure-limit";
    else if (lex8h >= 85) euCompliance = "upper-action";
    else if (lex8h >= 80) euCompliance = "lower-action";
    return {
      durationSec: Math.round(durationSec * 10) / 10,
      samples: n,
      leq: Math.round(leq * 10) / 10,
      peak: Math.round(this.peak * 10) / 10,
      min: this.min === Infinity ? 0 : Math.round(this.min * 10) / 10,
      mean: Math.round((this.sumSpl / n) * 10) / 10,
      lex8h: Math.round(lex8h * 10) / 10,
      timeAbove85: Math.round(this.timeAbove85 * 10) / 10,
      timeAbove90: Math.round(this.timeAbove90 * 10) / 10,
      timeAbove95: Math.round(this.timeAbove95 * 10) / 10,
      exceedsAction: lex8h >= 80,
      euCompliance,
      startedAt: new Date(this.startedAt ?? Date.now() - durationSec * 1000).toISOString(),
    };
  }

  /**
   * Returns the raw samples. Useful for plotting or forwarding to a chart.
   * Returns a shallow copy to protect internal state.
   */
  getSamples(): SplSample[] {
    return this.samples.slice();
  }

  /**
   * Export the session as CSV (semicolon-separated for Excel compat in ES/EU
   * locales). Contains header rows with summary + per-sample data.
   */
  toCSV(): string {
    const sum = this.summary();
    const header = [
      `# SoundMap session log`,
      `# Started at;${sum.startedAt}`,
      `# Duration (s);${sum.durationSec}`,
      `# Samples;${sum.samples}`,
      `# Leq (dB);${sum.leq}`,
      `# LEX,8h (dB);${sum.lex8h}`,
      `# Peak (dB);${sum.peak}`,
      `# Time above 85 dB (s);${sum.timeAbove85}`,
      `# Time above 90 dB (s);${sum.timeAbove90}`,
      `# Time above 95 dB (s);${sum.timeAbove95}`,
      `# EU compliance;${sum.euCompliance}`,
      ``,
      `t_ms;spl_db;peak_db`,
    ].join("\n");
    const rows = this.samples
      .map(s => `${s.tMs};${s.spl.toFixed(1)};${s.peak?.toFixed(1) ?? ""}`)
      .join("\n");
    return header + "\n" + rows + "\n";
  }

  toJSON(): string {
    return JSON.stringify({ summary: this.summary(), samples: this.samples }, null, 2);
  }
}

/**
 * Human-friendly compliance labels per EU 2003/10/EC.
 */
export function euComplianceLabel(c: SessionSummary["euCompliance"]): { label: string; color: string } {
  switch (c) {
    case "safe": return { label: "Seguro", color: "#00FF9E" };
    case "lower-action": return { label: "Valor de acción inferior (80 dB)", color: "#FFB84D" };
    case "upper-action": return { label: "Valor de acción superior (85 dB)", color: "#FF7A3A" };
    case "exposure-limit": return { label: "Límite de exposición (87 dB)", color: "#FF3EA5" };
  }
}
