// Electrical protection never derives a DSP threshold from acoustic SPL.
import type { AcousticsResult } from "./acoustics";
import type { GearItem } from "./pa-engine";
import { calculateElectricalProtection, type ProtectionChain, type ProtectionResult } from "./electrical-protection";
export type SpeakerRole = "top" | "sub" | "monitor";
export interface CompressorSettings { enabled: boolean; thresholdDb: number; ratio: number; attackMs: number; releaseMs: number; kneeDb: number }
export interface GainStage {
  outputGainDb: number; ampWatts: number | null; speakerRmsWatts: number | null; speakerPeakWatts: number | null;
  powerRatio: number | null; status: "ideal" | "underpowered" | "overpowered" | "active" | "unknown"; note: string;
}
export interface DynamicsSettings {
  limiterDb: number | null; // dBFS referenced to documented DSP full-scale output
  limiterHeadroomDb: number | null;
  limiterAttackMs: number; limiterReleaseMs: number; limiterType: "rms" | "peak";
  compressor: CompressorSettings; gainStage: GainStage; protection: ProtectionResult;
}
export function calculateDynamics(speaker: GearItem, _role: SpeakerRole, amps: GearItem[], _acoustics: AcousticsResult, chain?: ProtectionChain): DynamicsSettings {
  const protection = calculateElectricalProtection(speaker, amps.find(a => a.id === chain?.amplifierId), chain);
  return {
    limiterDb: protection.status === "calculated" ? protection.thresholdDbfs : null,
    limiterHeadroomDb: chain?.marginDb ?? null,
    limiterAttackMs: 0, limiterReleaseMs: 0, limiterType: "rms",
    compressor: { enabled: false, thresholdDb: 0, ratio: 1, attackMs: 0, releaseMs: 0, kneeDb: 0 },
    gainStage: { outputGainDb: 0, ampWatts: protection.status === "calculated" ? protection.amplifierWatts : null,
      speakerRmsWatts: chain?.speakerContinuousWatts ?? null, speakerPeakWatts: null, powerRatio: null,
      status: speaker.active ? "active" : "unknown", note: protection.reasons.join(" ") }, protection,
  };
}
