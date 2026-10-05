/* The audio rendering clock owns sampling; UI frames do not integrate Leq. */
class SoundMapLevelProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.interval =
      sampleRate *
      Math.max(
        0.005,
        Math.min(0.1, options?.processorOptions?.interval ?? 0.1),
      );
    this.energy = 0;
    this.count = 0;
    this.peak = 0;
    this.fast = 0;
  }
  process(inputs, outputs) {
    const raw = inputs[0]?.[0],
      weighted = inputs[1]?.[0];
    for (const channel of outputs[0] ?? []) channel.fill(0);
    if (!raw || !weighted) return true;
    const alpha = Math.exp(-1 / (sampleRate * 0.125));
    for (let i = 0; i < weighted.length; i++) {
      const energy = weighted[i] * weighted[i];
      this.energy += energy;
      this.fast = alpha * this.fast + (1 - alpha) * energy;
      this.peak = Math.max(this.peak, Math.abs(raw[i]));
      this.count++;
    }
    if (this.count >= this.interval) {
      this.port.postMessage({
        meanSquare: this.energy / this.count,
        fastSquare: this.fast,
        peakDigital: this.peak,
        duration: this.count / sampleRate,
        audioTime: currentTime + raw.length / sampleRate,
      });
      this.energy = 0;
      this.count = 0;
      this.peak = 0;
    }
    return true;
  }
}
registerProcessor("soundmap-level", SoundMapLevelProcessor);
