// DSP Engine — SoundMap
// Generates DSP output configuration based on room + gear

import type { AcousticsResult, RoomScanInput } from "./acoustics.ts";
import type { GearItem } from "./pa-engine.ts";
import { calculateCrossover } from "./pa-engine.ts";
import { calculateRoomModes, modalEQBands } from "./modal-eq.ts";
import { calculateDynamics } from "./dynamics.ts";
import type { DynamicsSettings, SpeakerRole } from "./dynamics.ts";
import { calculateSubAlignment } from "./time-align.ts";

export interface DSPBand {
  freq: number;
  gain: number;
  q: number;
  type: "peak" | "shelf-lo" | "shelf-hi" | "hp" | "lp";
}

export interface DSPOutput {
  id: string;
  label: string;
  destination: string;
  gain: number;
  delayMs: number;
  hpfHz: number;
  lpfHz: number;
  limiterDb: number;
  eq: DSPBand[];
  polarity: boolean;
  role: SpeakerRole;
  dynamics: DynamicsSettings;
}

export interface DSPConfig {
  outputs: DSPOutput[];
  notes: string[];
  dspModel: string;
}

// Modal EQ bands carry a plain-language reason; the DSPBand stored on an output
// only needs the filter parameters, so drop the explanation here.
function stripReason(b: { freq: number; gain: number; q: number; type: "peak" }): DSPBand {
  return { freq: b.freq, gain: b.gain, q: b.q, type: b.type };
}

export function generateDSPConfig(
  room: RoomScanInput,
  acoustics: AcousticsResult,
  tops: GearItem[],
  subs: GearItem[],
  monitors: GearItem[],
  dspUnit: GearItem | null,
  amps: GearItem[] = []
): DSPConfig {
  const notes: string[] = [];
  const outputs: DSPOutput[] = [];

  // Crossover & protective filters derived from the real speaker frequency response
  const xover = calculateCrossover(tops, subs);
  // Tops are high-passed at the crossover when subs exist, otherwise at their own limit.
  const topHpf = xover.topHpf;
  const topLpf = xover.topLpf >= 20000 ? 20000 : xover.topLpf;

  // ── Room-mode analysis ──────────────────────────────────────────────────────
  // Compute the actual axial resonances of THIS room (343/2L and harmonics on
  // every axis) and place EQ notches exactly on the worst ones, scaled by RT60
  // and wall hardness. Each speaker type only corrects modes inside its own band.
  const roomModes = calculateRoomModes(room, acoustics);

  // Tops cover the mid/upper modal region above the crossover (or their HPF).
  const topModalBands = modalEQBands(
    roomModes,
    acoustics.rt60Audience,
    { min: Math.max(topHpf, 80), max: 320 },
    3
  );
  // Subs own the low modal region up to the crossover point.
  const subModalBands = modalEQBands(
    roomModes,
    acoustics.rt60Audience,
    { min: 25, max: xover.crossoverFreq > 0 ? xover.crossoverFreq : 120 },
    2
  );

  // Tops also get a gentle low-mid shaping cut when the room is opaque/boomy,
  // layered on top of the precise modal notches.
  const topShaping: DSPBand[] = [];
  if (acoustics.lowMidBuildupRisk) {
    topShaping.push({ freq: 315, gain: -3, q: 1.2, type: "peak" });
  }
  if (acoustics.rt60Audience > 1.5) {
    topShaping.push({ freq: 3000, gain: 2, q: 1.5, type: "peak" });
  }

  const baseEQ: DSPBand[] = [...topModalBands.map(stripReason), ...topShaping];

  // ── Dynamics & gain staging ─────────────────────────────────────────────────
  // El limitador se calcula sobre la caja MÁS DÉBIL del grupo, no sobre la
  // primera de la lista. Con un rig mixto (140 dB + 128 dB), derivar el
  // threshold del primer modelo lo deja 12 dB por encima de lo que aguanta el
  // segundo: el limitador nunca actúa y se quema el driver más chico.
  const weakest = (arr: GearItem[]): GearItem =>
    arr.reduce((w, g) => ((g.splMax || Infinity) < (w.splMax || Infinity) ? g : w), arr[0]);

  const topRef = tops.length > 0 ? weakest(tops) : null;
  const subRef = subs.length > 0 ? weakest(subs) : null;
  const topDynamics = topRef ? calculateDynamics(topRef, "top", amps, acoustics) : null;
  const subDynamics = subRef ? calculateDynamics(subRef, "sub", amps, acoustics) : null;

  // ── Time alignment ──────────────────────────────────────────────────────────
  // Delay the physically closer source (subs or tops) so both wavefronts arrive
  // in phase through the crossover region, derived from real mounting geometry
  // and distance ÷ speed of sound.
  const alignment = calculateSubAlignment(room, tops, subs);

  // Cantidad real de cajas, no de renglones en la lista: una sola entrada con
  // quantity 2 ES un par L/D real, no un mirror de una caja sola.
  const topUnits = tops.reduce((n, t) => n + (t.quantity ?? 1), 0);

  // El shelf de agudos va en AMBOS lados. Antes OUT-A lo llevaba y el OUT-B
  // "mirror" no, así que con un solo modelo de top la imagen estéreo quedaba
  // asimétrica: 1.5 dB de más en agudos sólo en el lado izquierdo.
  const topEQ: DSPBand[] = [...baseEQ, { freq: 10000, gain: 1.5, q: 0.7, type: "shelf-hi" }];

  // Tops L
  if (tops.length > 0 && topDynamics) {
    outputs.push({
      id: "OUT-A",
      label: "OUT A",
      destination: "TOP L",
      gain: topDynamics.gainStage.outputGainDb,
      delayMs: alignment.topDelayMs,
      hpfHz: topHpf,
      lpfHz: topLpf,
      limiterDb: topDynamics.limiterDb,
      polarity: true,
      role: "top",
      dynamics: topDynamics,
      eq: topEQ,
    });
  }

  // Tops R
  if (topUnits > 1 && topDynamics) {
    outputs.push({
      id: "OUT-B",
      label: "OUT B",
      destination: "TOP R",
      gain: topDynamics.gainStage.outputGainDb,
      delayMs: alignment.topDelayMs,
      hpfHz: topHpf,
      lpfHz: topLpf,
      limiterDb: topDynamics.limiterDb,
      polarity: true,
      role: "top",
      dynamics: topDynamics,
      eq: topEQ,
    });
  } else if (topUnits === 1 && topDynamics) {
    outputs.push({
      id: "OUT-B",
      label: "OUT B",
      destination: "TOP R (Mirror)",
      gain: topDynamics.gainStage.outputGainDb,
      delayMs: alignment.topDelayMs,
      hpfHz: topHpf,
      lpfHz: topLpf,
      limiterDb: topDynamics.limiterDb,
      polarity: true,
      role: "top",
      dynamics: topDynamics,
      eq: topEQ,
    });
  }

  // Subs L
  if (subs.length > 0 && subDynamics) {
    const subEQ: DSPBand[] = [...subModalBands.map(stripReason)];
    if (acoustics.sbirRisk) subEQ.push({ freq: 63, gain: -3, q: 1.0, type: "peak" });
    outputs.push({
      id: "OUT-C",
      label: "OUT C",
      destination: "SUB L",
      gain: Math.min(-3, subDynamics.gainStage.outputGainDb - 3),
      delayMs: alignment.subDelayMs,
      hpfHz: xover.subHpf,
      lpfHz: xover.subLpf,
      limiterDb: subDynamics.limiterDb,
      polarity: true,
      role: "sub",
      dynamics: subDynamics,
      eq: subEQ,
    });
    outputs.push({
      id: "OUT-D",
      label: "OUT D",
      destination: "SUB R",
      gain: Math.min(-3, subDynamics.gainStage.outputGainDb - 3),
      delayMs: alignment.subDelayMs,
      hpfHz: xover.subHpf,
      lpfHz: xover.subLpf,
      limiterDb: subDynamics.limiterDb,
      polarity: true,
      role: "sub",
      dynamics: subDynamics,
      eq: subEQ,
    });
  }

  // Monitors
  // Monitors sit on the floor near the mic — the most feedback-prone path. Beyond
  // the usual 400 Hz tame, notch the single worst room mode in their range so the
  // wedge doesn't excite the room's resonance straight into the vocal mic.
  const monitorModeBand = modalEQBands(
    roomModes,
    acoustics.rt60Audience,
    { min: 100, max: 300 },
    1
  )[0];
  monitors.forEach((mon, i) => {
    const letter = String.fromCharCode(69 + i); // E, F, G...
    const monEQ: DSPBand[] = [{ freq: 400, gain: -2, q: 1.2, type: "peak" }];
    if (monitorModeBand) monEQ.push(stripReason(monitorModeBand));
    const monDynamics = calculateDynamics(mon, "monitor", amps, acoustics);
    outputs.push({
      id: `OUT-${letter}`,
      label: `OUT ${letter}`,
      destination: `Monitor ${i + 1}`,
      gain: Math.min(-6, monDynamics.gainStage.outputGainDb - 6),
      delayMs: 0,
      hpfHz: 100,
      lpfHz: 16000,
      limiterDb: monDynamics.limiterDb,
      polarity: true,
      role: "monitor",
      dynamics: monDynamics,
      eq: monEQ,
    });
  });

  // Notes
  notes.push(`DSP Unit: ${dspUnit ? `${dspUnit.brand} ${dspUnit.model}` : "Generic DSP"}`);
  if (xover.crossoverFreq > 0) {
    notes.push(`Cruce TOPS/SUBS a ${xover.crossoverFreq} Hz (${xover.slope}) — calculado desde el rango real de los altavoces`);
    xover.reasons.forEach(r => notes.push(r));
  } else if (tops.length > 0) {
    notes.push(`Sin subs — TOPS con HPF de protección a ${topHpf} Hz`);
  }

  // Explain the modal EQ so the user sees these are calculated, not generic.
  if (roomModes.length > 0) {
    const worst = roomModes[0];
    notes.push(
      `Modos de sala calculados desde las dimensiones (${room.length}×${room.width}×${room.height} m): el modo más fuerte está en ${worst.freq} Hz${worst.pileUp ? " (coincidencia de ejes — pile-up)" : ""}.`
    );
    [...subModalBands, ...topModalBands].slice(0, 4).forEach(b => notes.push(b.reason));
    if (monitorModeBand) notes.push(`Monitores: notch extra en ${monitorModeBand.freq} Hz para evitar realimentación sobre el modo de sala.`);
  }
  if (acoustics.schroederFreq > 0) notes.push(`Frecuencia de Schroeder en ${acoustics.schroederFreq} Hz — por debajo dominan los modos; por encima la sala es difusa y no se ecualiza con notches.`);
  notes.push(`Distancia crítica: ${acoustics.criticalDistance} m — evitá ubicar público más allá sin apoyo de delays.`);

  // Time-alignment explanation (subs vs tops).
  if (alignment.delayedSource !== "none") {
    alignment.reasons.forEach(r => notes.push(r));
  }

  // Gain staging & limiter explanations
  if (topDynamics && topRef) {
    const top0 = topRef;
    notes.push(`Limitador TOPS: configurar threshold ${topDynamics.limiterHeadroomDb} dB por debajo del SPL máximo del ${top0.model} (${top0.splMax} dBSPL − ${topDynamics.limiterHeadroomDb} dB = referencia ${topDynamics.limiterDb} dBSPL). Ataque ${topDynamics.limiterAttackMs} ms / release ${topDynamics.limiterReleaseMs} ms.`);
    notes.push(`Gain staging TOPS: ${topDynamics.gainStage.note}`);
  }
  if (subDynamics && subs.length > 0) {
    notes.push(`Limitador SUBS: configurar threshold ${subDynamics.limiterHeadroomDb} dB por debajo del SPL máximo (referencia ${subDynamics.limiterDb} dBSPL). Timing lento — ataque ${subDynamics.limiterAttackMs} ms / release ${subDynamics.limiterReleaseMs} ms — para evitar bombeo en graves.`);
    if (subDynamics.gainStage.status !== "active") notes.push(`Gain staging SUBS: ${subDynamics.gainStage.note}`);
  }

  return {
    outputs,
    notes,
    dspModel: dspUnit ? `${dspUnit.brand} ${dspUnit.model}` : "No DSP selected",
  };
}
