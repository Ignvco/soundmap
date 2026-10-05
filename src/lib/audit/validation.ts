import { z } from "zod";
import { calculateAcoustics } from "../audio/acoustics";
import {
  geometrySchema,
  geometryWithinRoom,
  surfacesSchema,
} from "../audio/geometry";
const finite = z.number().finite(),
  text = z.string().max(10000),
  id = z.string().min(1).max(200),
  small = z.string().max(300);
export const MAX_BACKUP_BYTES = 32 * 1024 * 1024;
export const roomSchema = z
  .object({
    geometry: geometrySchema.optional(),
    acousticSurfaces: surfacesSchema.optional(),
    rtMethod: z.enum(["sabine", "eyring"]).optional(),
    simulationMode: z.enum(["energy", "coherent"]).optional(),
    name: small,
    venueType: z.enum(["club", "festival", "theatre", "conference"]).optional(),
    length: finite.min(1).max(500),
    width: finite.min(1).max(500),
    height: finite.min(1).max(100),
    capacity: finite.int().min(0).max(200000),
    windowCount: finite.int().min(0).max(10000),
    ceilingType: z.enum([
      "flat",
      "vaulted",
      "domed",
      "industrial",
      "acoustic-tile",
    ]),
    wallMaterial: z.enum([
      "concrete",
      "wood",
      "carpet",
      "glass",
      "brick",
      "drywall",
      "foam",
    ]),
    floorType: z.enum(["concrete", "wood", "carpet", "tile"]),
    temperature: finite.min(-30).max(60).optional(),
    humidity: finite.min(0).max(100).optional(),
    occupancyPct: finite.min(0).max(100).optional(),
    targetSpl: finite.min(40).max(150).optional(),
    receiver: z.object({ x: finite, y: finite, z: finite }).optional(),
  })
  .passthrough()
  .refine(
    (r) =>
      !r.receiver ||
      (Math.abs(r.receiver.x) <= r.width / 2 &&
        Math.abs(r.receiver.z) <= r.length / 2 &&
        r.receiver.y >= 0 &&
        r.receiver.y <= r.height),
    "Receptor fuera del recinto",
  )
  .refine(
    (r) =>
      !r.geometry ||
      geometryWithinRoom(r.geometry, r.width, r.length, r.height),
    "Geometría fuera del recinto",
  );
export const gearSchema = z
  .object({
    id,
    brand: small,
    model: small,
    category: z.enum([
      "tops",
      "subs",
      "monitors",
      "dsp",
      "amp",
      "mixer",
      "mic",
    ]),
    active: z.boolean(),
    splMax: finite.min(0).max(200),
    quantity: finite.int().min(1).max(64).optional(),
    freqLow: finite.min(0).max(24000).optional(),
    freqHigh: finite.min(0).max(100000).optional(),
    coverageH: finite.min(0).max(360).optional(),
    coverageV: finite.min(0).max(360).optional(),
    rmsWatts: finite.min(0).max(1000000).optional(),
    peakWatts: finite.min(0).max(1000000).optional(),
    weight: finite.min(0).max(10000).optional(),
    impedanceOhms: finite.min(0.1).max(64).optional(),
    separationM: finite.min(0).max(500).optional(),
    dspIntegrated: z.boolean().optional(),
    requiredAmp: small.optional(),
    powerKind: z
      .enum(["continuous-speaker", "amplifier-module", "per-channel"])
      .optional(),
    powerRatings: z
      .array(
        z.object({
          watts: finite.min(0).max(1000000),
          ohms: finite.min(0.1).max(64),
          mode: z.enum(["dual", "bridge"]),
        }),
      )
      .max(32)
      .optional(),
    channels: finite.int().min(1).max(256).optional(),
    minimumLoadOhms: finite.min(0.1).max(64).optional(),
    cabinetType: z.enum(["line-array", "point-source"]).optional(),
    dimensionsM: z
      .object({
        width: finite.positive().max(20),
        height: finite.positive().max(20),
        depth: finite.positive().max(20),
      })
      .optional(),
    catalog: z
      .object({
        revision: small,
        status: z.enum(["unverified", "reviewed-fields", "technician"]),
        sources: z.array(text).max(32),
        reviewedFields: z.array(small).max(100),
        conditions: text,
      })
      .optional(),
  })
  .passthrough();
const band = z.object({
  freq: finite.min(1).max(24000),
  gain: finite.min(-60).max(24),
  q: finite.min(0.05).max(100),
  type: z.enum(["peak", "shelf-lo", "shelf-hi", "hp", "lp"]),
});
export const outputSchema = z
  .object({
    id,
    label: small,
    destination: small,
    speakerId: id.optional(),
    gain: finite.min(-100).max(24),
    delayMs: finite.min(0).max(10000),
    hpfHz: finite.min(0).max(24000),
    lpfHz: finite.min(0).max(100000),
    limiterDb: finite.min(-100).max(24).nullable(),
    eq: z.array(band).max(32),
    polarity: z.boolean(),
    role: z.enum(["top", "sub", "monitor"]),
    dynamics: z
      .object({
        limiterDb: finite.nullable(),
        compressor: z.object({ enabled: z.boolean() }).passthrough(),
        gainStage: z.object({ note: text, status: small }).passthrough(),
        protection: z
          .object({
            status: z.enum(["pending", "calculated"]),
            reasons: z.array(text).max(100),
          })
          .passthrough(),
      })
      .passthrough(),
  })
  .passthrough();
const review = z.object({
  state: z.enum(["pending", "not-applicable", "verified"]),
  note: text,
  reviewedAt: small.optional(),
});
const profile = z.object({
  id,
  deviceId: small,
  label: small,
  sampleRate: finite.min(8000).max(384000),
  offsetDb: finite.min(-100).max(200),
  referenceDb: finite.min(20).max(140),
  reference: text,
  gain: text,
  calibratedAt: small,
  weighting: z.enum(["A-digital", "Z"]),
});
const measurement = z.object({
  id,
  kind: z.enum(["level", "decay"]),
  startedAt: small,
  endedAt: small,
  label: small,
  receiver: z.object({ x: finite, y: finite, z: finite }),
  method: text,
  unit: small,
  profile: profile.optional(),
  device: small,
  sampleRate: finite.min(8000).max(384000),
  samples: z.array(z.object({ t: finite.min(0), value: finite })).max(36000),
  summary: z.record(z.union([finite, text, z.null()])),
  interruptions: z.array(text).max(100),
});
const audit = z
  .object({
    id,
    technician: small,
    client: small,
    objective: text,
    conclusion: text,
    createdAt: small,
    reviews: z.record(review),
    findings: z
      .array(
        z.object({
          id,
          title: text,
          evidence: text,
          action: text,
          priority: z.enum(["P0", "P1", "P2", "P3"]),
          state: z.enum(["open", "accepted", "resolved"]),
        }),
      )
      .max(1000),
    measurements: z.array(measurement).max(100),
    dsp: z
      .object({
        outputs: z.array(outputSchema).max(256),
        notes: z.array(text).max(200),
        dspModel: small,
      })
      .optional(),
    channels: z
      .array(
        z.object({
          ch: finite.int().min(1).max(256),
          name: small,
          source: small,
          type: z.enum(["mono", "stereo", "return"]),
          stageboxInput: finite.int().min(1).max(256),
          phantom: z.boolean(),
          phantomSafe: z.boolean(),
          hpfHz: finite.min(0).max(24000),
          eqHint: text,
          monitorHint: text,
          priority: z.enum(["critical", "high", "medium", "low"]),
          feedbackRisk: z.enum(["high", "medium", "low"]),
        }),
      )
      .max(256)
      .optional(),
    routes: z
      .array(
        z.object({
          id,
          input: small,
          outputId: id,
          speakerIds: z.array(id).max(64),
          amplifierId: id.optional(),
          amplifierUnit: finite.int().min(1).max(64).optional(),
          channel: finite.int().min(1).max(64).optional(),
          note: text,
        }),
      )
      .max(256),
    protection: z.record(
      z.object({
        speakerId: id,
        amplifierId: z.string().max(200),
        amplifierUnit: finite.int().min(1).max(64),
        channel: finite.int().min(1).max(64),
        cabinetsInParallel: finite.int().min(1).max(64),
        speakerContinuousWatts: finite.min(0).max(20000),
        speakerOhms: finite.min(0).max(64),
        amplifierGainDb: finite.min(0).max(60),
        outputTrimDb: finite.min(-60).max(12),
        dspFullScaleDbu: finite.min(-20).max(40),
        marginDb: finite.min(0).max(30),
        source: text,
        verifiedBy: small,
        verifiedAt: small,
      }),
    ),
    dspState: z.enum(["suggested", "edited", "verified-on-device"]),
    dspVerifiedAt: small.optional(),
    savedView: z
      .object({
        camera: z.tuple([
          finite.min(-10000).max(10000),
          finite.min(-10000).max(10000),
          finite.min(-10000).max(10000),
        ]),
        target: z.tuple([
          finite.min(-1000).max(1000),
          finite.min(-1000).max(1000),
          finite.min(-1000).max(1000),
        ]),
      })
      .optional(),
  })
  .passthrough();
const layout = z.record(
  z
    .object({
      normX: finite.min(0).max(100).optional(),
      normY: finite.min(0).max(100).optional(),
      heightM: finite.min(0).max(100).optional(),
      yawDeg: finite.min(-180).max(180).optional(),
      tiltDeg: finite.min(-90).max(90).optional(),
      gainDb: finite.min(-100).max(24).optional(),
      delayMs: finite.min(0).max(10000).optional(),
      inverted: z.boolean().optional(),
      groupId: small.optional(),
    })
    .passthrough(),
);
const rig = {
  tops: z.array(gearSchema).max(64),
  subs: z.array(gearSchema).max(64),
  monitors: z.array(gearSchema).max(64),
  dspUnits: z.array(gearSchema).max(64),
  amps: z.array(gearSchema).max(64),
  mixers: z.array(gearSchema).max(64),
  mics: z.array(gearSchema).max(128),
};
export const sceneSchema = z
  .object({
    id,
    clientId: id.optional(),
    name: small,
    createdAt: small,
    room: roomSchema,
    acoustics: z.object({}).passthrough(),
    stageLayout: layout.optional(),
    audit: audit.optional(),
    revision: finite.int().min(1).optional(),
    ...rig,
  })
  .passthrough()
  .transform((scene) => ({
    ...scene,
    acoustics: calculateAcoustics(scene.room),
  }));
const state = z
  .object({
    room: roomSchema.nullable().optional(),
    audit: audit.optional(),
    scenes: z.array(sceneSchema).max(500).optional(),
    stageLayout: layout.optional(),
    ...Object.fromEntries(
      Object.entries(rig).map(([k, v]) => [k, v.optional()]),
    ),
  })
  .passthrough();
export function validateStore(value: unknown) {
  const result = z
    .object({ version: finite.int().min(0).max(4), state })
    .parse(value);
  const checkRig = (s: Record<string, unknown>) => {
    const arrays = [s.tops, s.subs, s.monitors].filter(Array.isArray);
    const count = arrays
      .flat()
      .reduce(
        (sum, g) => sum + ((g as { quantity?: number }).quantity ?? 1),
        0,
      );
    if (count > 256)
      throw new Error("Máximo 256 cajas físicas por expediente.");
  };
  checkRig(result.state);
  for (const scene of result.state.scenes ?? []) checkRig(scene);
  return {
    ...result,
    state: {
      ...result.state,
      acoustics: result.state.room
        ? calculateAcoustics(result.state.room)
        : null,
    },
  };
}
/** Bound nested imported values including extension metadata, without trusting casts. */
export function validateTree(
  value: unknown,
  depth = 0,
  budget = { left: 2500000 },
): void {
  if (--budget.left < 0 || depth > 32)
    throw new Error("Archivo demasiado complejo.");
  if (typeof value === "number" && !Number.isFinite(value))
    throw new Error("Número no finito.");
  if (typeof value === "string" && value.length > 20000)
    throw new Error("Texto demasiado largo.");
  if (Array.isArray(value) && value.length > 36000)
    throw new Error("Colección demasiado extensa.");
  if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(k))
        throw new Error("Clave no admitida.");
      validateTree(v, depth + 1, budget);
    }
}
export function validatePersistedKey(key: string, value: unknown) {
  validateTree(value);
  if (key === "soundmap-store") return validateStore(value);
  else if (key === "soundmap-calibration")
    return z.array(profile).max(30).parse(value);
  else if (key === "soundmap-settings")
    return z
      .object({
        version: finite.int().min(0).max(2),
        state: z
          .object({
            units: z.enum(["metric", "imperial"]),
            theme: z.enum(["dark", "amoled"]),
            defaultVenueType: z.enum([
              "club",
              "festival",
              "theatre",
              "conference",
            ]),
            soundEnabled: z.boolean(),
            hapticsEnabled: z.boolean(),
          })
          .passthrough(),
      })
      .parse(value);
  else if (key === "soundmap-community-demo")
    return z
      .object({
        upvotes: z.record(finite.int().min(0).max(1000000)),
        submitted: z
          .array(
            gearSchema
              .omit({ id: true })
              .extend({
                _id: id,
                status: z.enum(["pending", "approved", "rejected"]),
                upvotes: finite.int().min(0).max(1000000),
                createdAt: finite.min(0),
                submitterName: small.optional(),
              }),
          )
          .max(1000),
      })
      .parse(value);
  else throw new Error("Clave de backup no admitida.");
}
