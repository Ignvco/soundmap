import type { AcousticsResult, RoomScanInput } from "./acoustics";
import { calculateCrossover, type GearItem } from "./pa-engine";
import { layoutSpeakers, type SpeakerLayout } from "../speaker-layout";
import { calculateDynamics, type DynamicsSettings, type SpeakerRole } from "./dynamics";
import { defaultReceiver } from "./audit-evaluator";
import { speedOfSoundFromTemp } from "./acoustics";
import type { ProtectionChain } from "./electrical-protection";
export interface DSPBand { freq: number; gain: number; q: number; type: "peak" | "shelf-lo" | "shelf-hi" | "hp" | "lp" }
export interface DSPOutput {
  id: string; label: string; destination: string; speakerId?: string; gain: number; delayMs: number;
  hpfHz: number; lpfHz: number; limiterDb: number | null; eq: DSPBand[]; polarity: boolean;
  role: SpeakerRole; dynamics: DynamicsSettings;
}
export interface DSPConfig { outputs: DSPOutput[]; notes: string[]; dspModel: string }

/** One suggestion per EXISTING physical unit. Suggestions never imply that
 * a device has been configured; room modes never create automatic EQ notches.
 */
export function generateDSPConfig(room: RoomScanInput, acoustics: AcousticsResult,
  tops: GearItem[], subs: GearItem[], monitors: GearItem[], dspUnit: GearItem | null,
  amps: GearItem[] = [], layout?: SpeakerLayout, protection: Record<string, ProtectionChain> = {}): DSPConfig {
  const speakers = layoutSpeakers(room, tops, subs, monitors, layout);
  const cross = calculateCrossover(tops, subs), receiver = defaultReceiver(room);
  const distance = (s: typeof speakers[number]) => Math.hypot(s.x - receiver.x, s.y - receiver.y, s.z - receiver.z);
  const farthest = Math.max(0, ...speakers.filter(s => s.kind !== "monitors").map(distance));
  const outputs = speakers.map((speaker, i): DSPOutput => {
    const role: SpeakerRole = speaker.kind === "tops" ? "top" : speaker.kind === "subs" ? "sub" : "monitor";
    const dynamics = calculateDynamics(speaker.gear, role, amps, acoustics, protection[speaker.id]);
    return { id: `OUT-${i < 26 ? String.fromCharCode(65 + i) : i + 1}`, label: `Salida ${i + 1}`, destination: speaker.label,
      speakerId: speaker.id, gain: 0, delayMs: role === "monitor" ? 0 : Math.round(Math.max(0, farthest - distance(speaker)) / speedOfSoundFromTemp(room.temperature ?? 20) * 10000) / 10,
      hpfHz: role === "sub" ? cross.subHpf : role === "top" ? cross.topHpf : speaker.gear.freqLow ?? 0,
      lpfHz: role === "sub" ? cross.subLpf : speaker.gear.freqHigh ?? 20000,
      limiterDb: dynamics.limiterDb, eq: [], polarity: true, role, dynamics };
  });
  return { outputs, dspModel: dspUnit ? `${dspUnit.brand} ${dspUnit.model}` : "Procesador pendiente de asignación",
    notes: ["Propuesta de planificación. No hay conexión ni telemetría del DSP físico.",
      "Cruce LR24 orientativo; confirmar preset de fabricante. Alineación geométrica al receptor, sin compensar fase ni latencias de hardware.",
      "EQ inicialmente plana. Los modos de sala son frecuencias a comprobar, no filtros correctivos automáticos.",
      "La protección eléctrica necesita asignación por canal, ratings y referencias verificadas. No se deduce de SPL.", ...cross.reasons] };
}
