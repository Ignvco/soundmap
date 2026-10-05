import { useSyncExternalStore } from "react";
import { captureService } from "@/lib/audio/capture-service";
export type { SPLState } from "@/lib/audio/capture-service";
export interface UseSPLMeterOptions { refOffset?: number; peakDecayDbPerSec?: number }
/** Capture belongs to the session, not a mounted screen. Navigation can subscribe
 * without starting a second microphone or discarding the calibration profile. */
export function useSPLMeter(_opts: UseSPLMeterOptions = {}) {
  const snapshot = useSyncExternalStore(captureService.subscribe, captureService.getSnapshot);
  return { ...snapshot, start: captureService.start, stop: captureService.stop, calibrate: captureService.calibrate,
    setCalibrationOffset: captureService.setCalibrationOffset, resetLeq: captureService.resetLeq };
}
