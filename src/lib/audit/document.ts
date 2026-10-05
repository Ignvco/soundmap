import type { Receiver } from "../audio/audit-evaluator";
import type { ChannelPatch } from "../audio/channels-engine";
import type { DSPConfig } from "../audio/dsp-engine";
import type { ProtectionChain } from "../audio/electrical-protection";

export type ReviewState = "pending" | "not-applicable" | "verified";
export interface Review {
  state: ReviewState;
  note: string;
  reviewedAt?: string;
}
export interface Finding {
  id: string;
  title: string;
  evidence: string;
  action: string;
  priority: "P0" | "P1" | "P2" | "P3";
  state: "open" | "accepted" | "resolved";
}
export interface CalibrationProfile {
  id: string;
  deviceId: string;
  label: string;
  sampleRate: number;
  offsetDb: number;
  referenceDb: number;
  reference: string;
  gain: string;
  calibratedAt: string;
  weighting: "A-digital" | "Z";
}
export interface Measurement {
  id: string;
  kind: "level" | "decay";
  startedAt: string;
  endedAt: string;
  label: string;
  receiver: Receiver;
  method: string;
  unit: string;
  profile?: CalibrationProfile;
  device: string;
  sampleRate: number;
  samples: { t: number; value: number }[];
  summary: Record<string, number | string | null>;
  interruptions: string[];
}
export interface SignalRoute {
  id: string;
  input: string;
  outputId: string;
  speakerIds: string[];
  amplifierId?: string;
  amplifierUnit?: number;
  channel?: number;
  note: string;
}
export interface AuditDocument {
  savedView?: {
    camera: [number, number, number];
    target: [number, number, number];
  };
  id: string;
  technician: string;
  client: string;
  objective: string;
  conclusion: string;
  createdAt: string;
  reviews: Record<string, Review>;
  findings: Finding[];
  measurements: Measurement[];
  dsp?: DSPConfig;
  channels?: ChannelPatch[];
  routes: SignalRoute[];
  protection: Record<string, ProtectionChain>;
  dspState: "suggested" | "edited" | "verified-on-device";
  dspVerifiedAt?: string;
}
export const newId = (prefix: string) =>
  `${prefix}-${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
export function newAudit(): AuditDocument {
  return {
    id: newId("audit"),
    createdAt: new Date().toISOString(),
    technician: "",
    client: "",
    objective: "",
    conclusion: "",
    reviews: {},
    findings: [],
    measurements: [],
    routes: [],
    protection: {},
    dspState: "suggested",
  };
}

/** Stable ordering makes dirty state independent of imported property order. */
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .filter(([, v]) => v !== undefined)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${canonical(v)}`)
      .join(",")}}`;
  return JSON.stringify(value) ?? "null";
}

/** A review is evidence, not an inventory counter. Changed inputs reopen affected reviews. */
export function invalidateReviews(
  audit: AuditDocument,
  keys: string[],
): AuditDocument {
  if (!keys.length) return audit;
  const reviews = { ...audit.reviews };
  for (const key of keys)
    if (reviews[key])
      reviews[key] = {
        ...reviews[key],
        state: "pending",
        reviewedAt: undefined,
      };
  return {
    ...audit,
    reviews,
    dspState: audit.dsp ? "edited" : "suggested",
    dspVerifiedAt: undefined,
  };
}
export const reviewComplete = (review?: Review) =>
  !!review && review.state !== "pending" && !!review.note.trim();
