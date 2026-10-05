import { describe, expect, it } from "vitest";
import { calculateElectricalProtection, type ProtectionChain } from "../electrical-protection";
import { digitalAWeightingDb } from "../weighting";
import { AMPS_DATABASE } from "../gear-database";
import type { GearItem } from "../pa-engine";

const speaker: GearItem = { id: "passive", category: "tops", active: false, brand: "Fixture", model: "Fixture", splMax: 140 };
const amp = AMPS_DATABASE.find(a => a.id === "crown-xls2502")!;
const chain: ProtectionChain = { speakerId: speaker.id, amplifierId: amp.id, amplifierUnit: 1, channel: 1,
  cabinetsInParallel: 1, speakerContinuousWatts: 200, speakerOhms: 8, amplifierGainDb: 32, outputTrimDb: 0,
  dspFullScaleDbu: 22, marginDb: 0, source: "Synthetic reference, not a real loudspeaker", verifiedBy: "Test", verifiedAt: "2026-10-02T00:00:00Z" };
describe("electrical reference", () => {
  it("200 W into 8 ohms is 40 Vrms; converts using the stated amplifier gain", () => {
    const r = calculateElectricalProtection(speaker, amp, chain);
    expect(r.status).toBe("calculated");
    if (r.status !== "calculated") throw new Error("Expected valid fixture");
    expect(r.outputVrms).toBeCloseTo(40, 8);
    expect(r.inputDbu).toBeCloseTo(20 * Math.log10(40 / 0.775) - 32, 8);
    expect(r.thresholdDbfs).toBeCloseTo(r.inputDbu - 22, 8);
    expect(calculateElectricalProtection({ ...speaker, splMax: 90 }, amp, chain)).toEqual(r);
  });
  it("rejects missing references, unsupported load and impossible channel", () => {
    for (const patch of [{ channel: 3 }, { speakerOhms: 3 }, { cabinetsInParallel: 8 }, { amplifierGainDb: NaN }, { source: "" }]) {
      expect(calculateElectricalProtection(speaker, amp, { ...chain, ...patch }).status).toBe("pending");
    }
    expect(calculateElectricalProtection(speaker, amp).status).toBe("pending");
  });
});
it("digital A transfer matches reference octave values within 1 dB, 31.5 Hz–8 kHz", () => {
  const reference = [[31.5, -39.4], [63, -26.2], [125, -16.1], [250, -8.6], [500, -3.2], [1000, 0], [2000, 1.2], [4000, 1.0], [8000, -1.1]];
  for (const fs of [44100, 48000, 96000]) for (const [frequency, expected] of reference) {
    expect(Math.abs(digitalAWeightingDb(frequency, fs) - expected)).toBeLessThan(1);
  }
});
