// Hardware capabilities probe — one-stop runtime check for the sensors we need.
// Used by pages to show device-specific hints and enable/disable features.
//
// Contract:
//   const caps = useHardwareCapabilities();
//   caps.mic:        "unknown" | "unavailable" | "prompt" | "granted" | "denied"
//   caps.gyroscope:  "unavailable" | "supported" | "granted" | "denied"
//   caps.isNativeApp: true when running inside Capacitor WebView.
//
// The probe runs once on mount; nothing here re-queries continuously.
import { useCallback, useEffect, useState } from "react";

export type MicStatus = "unknown" | "unavailable" | "prompt" | "granted" | "denied";
export type GyroStatus = "unavailable" | "supported" | "granted" | "denied";

export interface HardwareCapabilities {
  mic: MicStatus;
  gyroscope: GyroStatus;
  isNativeApp: boolean;
  isSecureContext: boolean;
  /** Trigger a live getUserMedia prompt so mic can move from `prompt` → `granted`/`denied`. */
  requestMic: () => Promise<MicStatus>;
  /** Trigger the iOS 13+ gyroscope permission prompt if applicable. */
  requestGyro: () => Promise<GyroStatus>;
}

async function probeMic(): Promise<MicStatus> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unavailable";
  }
  // Try the modern Permissions API first — it doesn't prompt the user.
  try {
    if (navigator.permissions?.query) {
      const result = await navigator.permissions.query({ name: "microphone" as PermissionName });
      if (result.state === "granted") return "granted";
      if (result.state === "denied") return "denied";
      return "prompt";
    }
  } catch { /* permissions API may reject on some browsers */ }
  return "prompt";
}

/** Fires a real getUserMedia call so the user gets the browser prompt. */
async function requestMicPermission(): Promise<MicStatus> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return "unavailable";
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Immediately release the tracks — we only wanted the permission.
    stream.getTracks().forEach((t) => t.stop());
    return "granted";
  } catch (err) {
    const name = (err as Error).name;
    if (name === "NotAllowedError" || name === "PermissionDeniedError") return "denied";
    return "unavailable";
  }
}

function probeGyro(): GyroStatus {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) {
    return "unavailable";
  }
  // iOS 13+ requires a user gesture to request permission — until then we can only
  // say the API is "supported" and hasn't been granted yet.
  return "supported";
}

/** Fires the iOS 13+ gyroscope permission prompt (no-op elsewhere). */
async function requestGyroPermission(): Promise<GyroStatus> {
  if (typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return "unavailable";
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: () => Promise<"granted" | "denied"> };
  if (typeof DOE?.requestPermission !== "function") {
    // Non-iOS browsers grant automatically — treat as granted.
    return "granted";
  }
  try {
    const result = await DOE.requestPermission();
    return result === "granted" ? "granted" : "denied";
  } catch {
    return "denied";
  }
}

function detectNativeApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

export function useHardwareCapabilities(): HardwareCapabilities {
  const [state, setState] = useState<Omit<HardwareCapabilities, "requestMic" | "requestGyro">>({
    mic: "unknown",
    gyroscope: "unavailable",
    isNativeApp: false,
    isSecureContext: typeof window !== "undefined" && window.isSecureContext,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mic = await probeMic();
      const gyroscope = probeGyro();
      const isNativeApp = detectNativeApp();
      if (!cancelled) {
        setState((prev) => ({ ...prev, mic, gyroscope, isNativeApp }));
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const requestMic = useCallback(async () => {
    const status = await requestMicPermission();
    setState((prev) => ({ ...prev, mic: status }));
    return status;
  }, []);

  const requestGyro = useCallback(async () => {
    const status = await requestGyroPermission();
    setState((prev) => ({ ...prev, gyroscope: status }));
    return status;
  }, []);

  return { ...state, requestMic, requestGyro };
}
