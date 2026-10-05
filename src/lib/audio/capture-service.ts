import { useAppStore } from "@/store/app";
import {
  newId,
  type CalibrationProfile,
  type Measurement,
} from "../audit/document";
import { localDatabase } from "../persistence";
import { claimAudioSession } from "./audio-session";
import { defaultReceiver } from "./audit-evaluator";
import { aWeightingSections } from "./weighting";

export type SPLState = "idle" | "starting" | "running" | "denied" | "error";
export interface SPLReading {
  spl: number;
  rms: number;
  peak: number;
  leq: number;
  dbfs: number;
  timestamp: number;
  band: "quiet" | "moderate" | "loud" | "hot" | "clip";
}
interface CaptureSnapshot {
  state: SPLState;
  error: string | null;
  reading: SPLReading;
  calibrationOffset: number;
  isCalibrated: boolean;
  profile?: CalibrationProfile;
  device: string;
  sampleRate: number;
  interruptions: string[];
}
const emptyReading = (): SPLReading => ({
  spl: 0,
  rms: 0,
  peak: 0,
  leq: 0,
  dbfs: -100,
  timestamp: 0,
  band: "quiet",
});
const storedProfiles = async (): Promise<CalibrationProfile[]> => {
  try {
    return JSON.parse(
      (await localDatabase.getItem("soundmap-calibration")) ?? "[]",
    );
  } catch {
    return [];
  }
};

class CaptureService {
  private unlock: (() => void) | undefined;
  private profiles: CalibrationProfile[] = [];
  private processingDetected = false;
  private state: CaptureSnapshot = {
    state: "idle",
    error: null,
    reading: emptyReading(),
    calibrationOffset: 100,
    isCalibrated: false,
    device: "",
    sampleRate: 0,
    interruptions: [],
  };
  private listeners = new Set<() => void>();
  private samples = new Set<(reading: SPLReading, dt: number) => void>();
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nodes: AudioNode[] = [];
  private generation = 0;
  private energy = 0;
  private duration = 0;
  private maxRms = -Infinity;
  private measurement: Measurement | null = null;
  private measurementSamples = 0;
  private deviceId = "";
  private measurementTimer = 0;
  subscribe = (cb: () => void) => {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  };
  subscribeSamples = (cb: (reading: SPLReading, dt: number) => void) => {
    this.samples.add(cb);
    return () => {
      this.samples.delete(cb);
    };
  };
  getSnapshot = () => this.state;
  private publish(patch: Partial<CaptureSnapshot>) {
    this.state = { ...this.state, ...patch };
    this.listeners.forEach((cb) => cb());
  }
  resetLeq = () => {
    this.energy = 0;
    this.duration = 0;
    this.maxRms = -Infinity;
  };
  private release() {
    this.unlock?.();
    this.unlock = undefined;
    this.nodes.forEach((n) => {
      try {
        n.disconnect();
      } catch {
        /* already disconnected */
      }
    });
    this.nodes = [];
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    if (this.ctx) {
      this.ctx.onstatechange = null;
      void this.ctx.close().catch(() => {});
      this.ctx = null;
    }
  }
  stop = () => {
    this.generation++;
    this.finishMeasurement();
    this.release();
    this.publish({ state: "idle" });
  };
  interrupt = (reason: string) => {
    if (!["running", "starting"].includes(this.state.state)) return;
    this.measurement?.interruptions.push(reason);
    this.publish({ interruptions: [...this.state.interruptions, reason] });
    this.stop();
    this.publish({
      error: `${reason}. La captura se detuvo; reinicia para una nueva sesión.`,
    });
  };
  start = async () => {
    if (["running", "starting"].includes(this.state.state)) return;
    const token = ++this.generation;
    this.publish({ state: "starting", error: null, interruptions: [] });
    try {
      this.unlock = claimAudioSession();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
          channelCount: 1,
        },
      });
      if (token !== this.generation) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      this.stream = stream;
      const ctx = new AudioContext();
      this.ctx = ctx;
      await ctx.audioWorklet.addModule(
        new URL("./level-worklet.js", import.meta.url),
      );
      if (token !== this.generation) return;
      await ctx.resume();
      if (token !== this.generation) return;
      const source = ctx.createMediaStreamSource(stream);
      const filters = aWeightingSections(ctx.sampleRate).map((c) =>
        ctx.createIIRFilter(c.feedforward, c.feedback),
      );
      const meter = new AudioWorkletNode(ctx, "soundmap-level", {
        numberOfInputs: 2,
        numberOfOutputs: 1,
        outputChannelCount: [1],
      });
      source.connect(meter, 0, 0);
      let previous: AudioNode = source;
      filters.forEach((filter) => {
        previous.connect(filter);
        previous = filter;
      });
      previous.connect(meter, 0, 1);
      meter.connect(ctx.destination);
      this.nodes = [source, ...filters, meter];
      this.resetLeq();
      const track = stream.getAudioTracks()[0],
        settings = track.getSettings();
      this.deviceId = settings.deviceId ?? track.label;
      this.profiles = await storedProfiles();
      if (token !== this.generation) return;
      const profile = this.profiles.find(
        (p) =>
          p.deviceId === this.deviceId &&
          p.sampleRate === ctx.sampleRate &&
          p.weighting === "A-digital",
      );
      const processed = (this.processingDetected =
        settings.autoGainControl === true ||
        settings.echoCancellation === true ||
        settings.noiseSuppression === true);
      this.publish({
        state: "running",
        reading: emptyReading(),
        device: track.label || "Micrófono",
        sampleRate: ctx.sampleRate,
        profile,
        calibrationOffset: profile?.offsetDb ?? 100,
        isCalibrated: !!profile && !processed,
        error: processed
          ? "El dispositivo mantiene procesamiento automático: el perfil no es válido para estimar SPL."
          : null,
      });
      track.onended = () => this.interrupt("Micrófono desconectado");
      ctx.onstatechange = () => {
        if (ctx.state === "suspended")
          this.interrupt("Audio suspendido por el sistema");
      };
      meter.port.onmessage = (event) => {
        if (token !== this.generation) return;
        const { meanSquare, fastSquare, peakDigital, duration, audioTime } =
          event.data;
        if (
          ![meanSquare, fastSquare, peakDigital, duration, audioTime].every(
            Number.isFinite,
          ) ||
          duration <= 0
        )
          return;
        const offset = this.state.calibrationOffset;
        const dbfs = 10 * Math.log10(Math.max(meanSquare, 1e-20));
        const spl = 10 * Math.log10(Math.max(fastSquare, 1e-20)) + offset;
        const rms = dbfs + offset;
        this.maxRms = Math.max(this.maxRms, rms);
        this.energy += meanSquare * 10 ** (offset / 10) * duration;
        this.duration += duration;
        const reading: SPLReading = {
          spl,
          rms,
          peak: this.maxRms,
          leq: 10 * Math.log10(Math.max(this.energy / this.duration, 1e-20)),
          dbfs,
          timestamp: audioTime,
          band:
            peakDigital >= 0.999
              ? "clip"
              : spl >= 105
                ? "hot"
                : spl >= 92
                  ? "loud"
                  : spl >= 70
                    ? "moderate"
                    : "quiet",
        };
        this.publish({ reading });
        this.samples.forEach((cb) => cb(reading, duration));
        if (this.measurement) {
          this.measurementSamples += duration;
          this.measurement.samples.push({
            t: this.measurementSamples,
            value: rms,
          });
          this.measurement.summary = {
            leq: reading.leq,
            maxRms: reading.peak,
            duration: this.measurementSamples,
          };
          if (this.measurement.samples.length >= 36000)
            this.finishMeasurement();
          else if (++this.measurementTimer % 50 === 0) this.checkpoint();
        }
      };
    } catch (err) {
      if (token !== this.generation) return;
      this.release();
      this.publish({
        state: (err as Error).name === "NotAllowedError" ? "denied" : "error",
        error: (err as Error).message || "No se pudo iniciar la captura",
      });
    }
  };
  calibrate = (targetDb: number) => {
    if (
      this.state.state !== "running" ||
      !Number.isFinite(targetDb) ||
      targetDb < 40 ||
      targetDb > 140 ||
      this.state.reading.band === "clip"
    )
      return;
    const offsetDb = targetDb - this.state.reading.dbfs;
    const profile: CalibrationProfile = {
      id: newId("cal"),
      deviceId: this.deviceId,
      label: this.state.device,
      sampleRate: this.state.sampleRate,
      offsetDb,
      referenceDb: targetDb,
      reference:
        "Referencia externa declarada por el técnico; verificar antes y después de medir",
      gain: "Mantener ganancia del dispositivo sin cambios",
      calibratedAt: new Date().toISOString(),
      weighting: "A-digital",
    };
    this.finishMeasurement();
    this.resetLeq();
    this.profiles = [
      ...this.profiles.filter(
        (p) =>
          p.deviceId !== profile.deviceId ||
          p.sampleRate !== profile.sampleRate,
      ),
      profile,
    ].slice(-30);
    void Promise.resolve(
      localDatabase.setItem(
        "soundmap-calibration",
        JSON.stringify(this.profiles),
      ),
    ).catch(() =>
      this.publish({ error: "Perfil activo sin guardar. Exporta tus datos." }),
    );
    this.publish({
      profile,
      calibrationOffset: offsetDb,
      isCalibrated: !this.processingDetected,
      reading: {
        ...this.state.reading,
        spl: targetDb,
        rms: targetDb,
        peak: targetDb,
        leq: targetDb,
      },
    });
  };
  setCalibrationOffset = (offset: number) => {
    if (!Number.isFinite(offset) || offset < 0 || offset > 200) return;
    this.finishMeasurement();
    this.resetLeq();
    this.publish({
      calibrationOffset: offset,
      isCalibrated: false,
      profile: undefined,
    });
  };
  startMeasurement = (label = "Nivel en receptor") => {
    const app = useAppStore.getState();
    if (!app.room || this.state.state !== "running") return;
    this.finishMeasurement();
    this.resetLeq();
    this.measurementSamples = 0;
    this.measurement = {
      id: newId("measurement"),
      kind: "level",
      startedAt: new Date().toISOString(),
      endedAt: "",
      label,
      receiver: defaultReceiver(app.room),
      method:
        "RMS continuo en AudioWorklet; ponderación A digital, FAST 125 ms; Leq por muestras",
      unit: this.state.isCalibrated
        ? "dB(A) estimado"
        : "dBFS ponderado + offset orientativo",
      profile: this.state.isCalibrated ? this.state.profile : undefined,
      device: this.state.device,
      sampleRate: this.state.sampleRate,
      samples: [],
      summary: {},
      interruptions: [],
    };
  };
  private checkpoint() {
    if (this.measurement) {
      const app = useAppStore.getState();
      app.updateAudit({
        measurements: [
          ...app.audit.measurements.filter(
            (m) => m.id !== this.measurement!.id,
          ),
          { ...this.measurement, endedAt: new Date().toISOString() },
        ].slice(-100),
      });
    }
  }
  finishMeasurement = () => {
    if (this.measurement) {
      this.checkpoint();
      this.measurement = null;
    }
  };
}
export const captureService = new CaptureService();
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", () =>
    captureService.interrupt("La aplicación dejó de estar activa"),
  );
  document.addEventListener("visibilitychange", () => {
    if (document.hidden)
      captureService.interrupt("Pantalla oculta o bloqueada");
  });
}
