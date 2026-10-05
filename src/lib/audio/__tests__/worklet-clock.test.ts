import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { audioSessionActive, claimAudioSession } from "../audio-session";
describe("capture clock and ownership", () => {
  it("integrates every rendered sample independently of UI updates and outputs silence", () => {
    const messages: {
      meanSquare: number;
      duration: number;
      audioTime: number;
      peakDigital: number;
    }[] = [];
    let Processor: new (options?: unknown) => {
      process: (inputs: Float32Array[][], outputs: Float32Array[][]) => boolean;
    };
    const context = vm.createContext({
      AudioWorkletProcessor: class {
        port = {
          postMessage: (p: (typeof messages)[number]) => messages.push(p),
        };
      },
      sampleRate: 48000,
      currentTime: 0,
      registerProcessor: (_name: string, p: typeof Processor) => {
        Processor = p;
      },
    });
    vm.runInContext(
      readFileSync(new URL("../level-worklet.js", import.meta.url), "utf8"),
      context,
    );
    const p = new Processor!({ processorOptions: { interval: 0.02 } }),
      input = new Float32Array(128).fill(0.25),
      output = new Float32Array(128).fill(1);
    for (let i = 0; i < 80; i++) {
      context.currentTime = (i * 128) / 48000;
      p.process([[input], [input]], [[output]]);
    }
    expect(messages).toHaveLength(10);
    expect(messages.reduce((s, m) => s + m.duration, 0)).toBeCloseTo(
      (80 * 128) / 48000,
      10,
    );
    expect(messages.at(-1)!.audioTime).toBeCloseTo((80 * 128) / 48000, 10);
    for (const m of messages) {
      expect(m.meanSquare).toBeCloseTo(0.0625, 10);
      expect(m.peakDigital).toBe(0.25);
    }
    expect(output.every((v) => v === 0)).toBe(true);
  });
  it("rejects overlapping capture requests and stale release cannot unlock a new owner", () => {
    const release = claimAudioSession();
    expect(audioSessionActive()).toBe(true);
    expect(() => claimAudioSession()).toThrow();
    release();
    const next = claimAudioSession();
    release();
    expect(audioSessionActive()).toBe(true);
    next();
    expect(audioSessionActive()).toBe(false);
  });
});
