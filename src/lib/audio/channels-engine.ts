// Channels Engine — SoundMap
// Genera lista de patch inteligente desde mixer + mics + sala

import type { GearItem } from "./pa-engine.ts";
import type { AcousticsResult } from "./acoustics.ts";

export interface ChannelPatch {
  ch: number;
  name: string;
  source: string;
  type: "mono" | "stereo" | "return";
  stageboxInput: number;
  phantom: boolean;
  phantomSafe: boolean;
  hpfHz: number;
  eqHint: string;
  monitorHint: string;
  priority: "critical" | "high" | "medium" | "low";
  feedbackRisk: "high" | "medium" | "low";
}

const DEFAULT_CHANNELS: Omit<ChannelPatch, "ch">[] = [
  {
    name: "Kick In",
    source: "Bombo (interior)",
    type: "mono",
    stageboxInput: 1,
    phantom: false,
    phantomSafe: true,
    hpfHz: 40,
    eqHint: "Realzar 60Hz para punch, cortar 300–500Hz para claridad",
    monitorHint: "Bajo en monitores",
    priority: "critical",
    feedbackRisk: "low",
  },
  {
    name: "Kick Out",
    source: "Bombo (exterior)",
    type: "mono",
    stageboxInput: 2,
    phantom: false,
    phantomSafe: true,
    hpfHz: 60,
    eqHint: "Realzar 3–5kHz para click, cortar 400Hz",
    monitorHint: "Ninguno",
    priority: "high",
    feedbackRisk: "low",
  },
  {
    name: "Snare Top",
    source: "Caja (arriba)",
    type: "mono",
    stageboxInput: 3,
    phantom: false,
    phantomSafe: true,
    hpfHz: 100,
    eqHint: "Realzar 5–8kHz para crack, cortar 200–300Hz",
    monitorHint: "Medio — agregar para bateristas",
    priority: "critical",
    feedbackRisk: "low",
  },
  {
    name: "Snare Bot",
    source: "Caja (abajo)",
    type: "mono",
    stageboxInput: 4,
    phantom: false,
    phantomSafe: true,
    hpfHz: 150,
    eqHint: "Invertir fase — mezclar sizzle de caja",
    monitorHint: "Ninguno",
    priority: "medium",
    feedbackRisk: "low",
  },
  {
    name: "Hi-Hat",
    source: "Hi-hat",
    type: "mono",
    stageboxInput: 5,
    phantom: false,
    phantomSafe: true,
    hpfHz: 300,
    eqHint: "Cortar graves agresivamente, realzar 10kHz de aire",
    monitorHint: "Ninguno",
    priority: "medium",
    feedbackRisk: "low",
  },
  {
    name: "OH Izq",
    source: "Overhead Izquierdo",
    type: "mono",
    stageboxInput: 6,
    phantom: true,
    phantomSafe: true,
    hpfHz: 200,
    eqHint: "Overhead balanceado — igualar ganancia con cuidado",
    monitorHint: "Bajo en mezcla de batería",
    priority: "medium",
    feedbackRisk: "low",
  },
  {
    name: "OH Der",
    source: "Overhead Derecho",
    type: "mono",
    stageboxInput: 7,
    phantom: true,
    phantomSafe: true,
    hpfHz: 200,
    eqHint: "Igualar nivel con OH Izq exactamente",
    monitorHint: "Bajo en mezcla de batería",
    priority: "medium",
    feedbackRisk: "low",
  },
  {
    name: "Bajo DI",
    source: "Bajo DI",
    type: "mono",
    stageboxInput: 8,
    phantom: false,
    phantomSafe: true,
    hpfHz: 40,
    eqHint: "Realzar 80Hz, cortar 400–600Hz barro, 2–3kHz presencia",
    monitorHint: "Prominente en mezcla de bajo/teclados",
    priority: "critical",
    feedbackRisk: "low",
  },
  {
    name: "Guitarra Izq",
    source: "Amplificador guitarra izq",
    type: "mono",
    stageboxInput: 9,
    phantom: false,
    phantomSafe: true,
    hpfHz: 100,
    eqHint: "Cortar 200–400Hz, realzar 2–3kHz presencia",
    monitorHint: "Medio en mezcla de guitarra",
    priority: "high",
    feedbackRisk: "low",
  },
  {
    name: "Teclados Izq",
    source: "Teclados izquierdo",
    type: "mono",
    stageboxInput: 10,
    phantom: false,
    phantomSafe: true,
    hpfHz: 80,
    eqHint: "Balancear agudos y graves, cuidar barro en medios-bajos",
    monitorHint: "Medio",
    priority: "high",
    feedbackRisk: "low",
  },
  {
    name: "Teclados Der",
    source: "Teclados derecho",
    type: "mono",
    stageboxInput: 11,
    phantom: false,
    phantomSafe: true,
    hpfHz: 80,
    eqHint: "Igualar con Teclados Izq",
    monitorHint: "Medio",
    priority: "high",
    feedbackRisk: "low",
  },
  {
    name: "Voz Principal",
    source: "Micrófono vocal principal",
    type: "mono",
    stageboxInput: 12,
    phantom: true,
    phantomSafe: true,
    hpfHz: 120,
    eqHint: "Realzar 2–4kHz presencia, cortar 250–400Hz cuerpo, de-essar 6–8kHz",
    monitorHint: "Alto — crítico para el vocalista",
    priority: "critical",
    feedbackRisk: "high",
  },
  {
    name: "Coro 1",
    source: "Voz coro 1",
    type: "mono",
    stageboxInput: 13,
    phantom: true,
    phantomSafe: true,
    hpfHz: 150,
    eqHint: "Cortar medios-bajos, mezclar con cuidado debajo de la voz principal",
    monitorHint: "Medio",
    priority: "high",
    feedbackRisk: "high",
  },
  {
    name: "Coro 2",
    source: "Voz coro 2",
    type: "mono",
    stageboxInput: 14,
    phantom: true,
    phantomSafe: true,
    hpfHz: 150,
    eqHint: "Igual que Coro 1",
    monitorHint: "Medio",
    priority: "high",
    feedbackRisk: "high",
  },
  {
    name: "Playback Izq",
    source: "Pista de fondo izquierda",
    type: "mono",
    stageboxInput: 15,
    phantom: false,
    phantomSafe: true,
    hpfHz: 60,
    eqHint: "Mantener rango completo — no sobreprocesar",
    monitorHint: "Todos los monitores — crítico para usuarios de IEM",
    priority: "high",
    feedbackRisk: "low",
  },
  {
    name: "Playback Der",
    source: "Pista de fondo derecha",
    type: "mono",
    stageboxInput: 16,
    phantom: false,
    phantomSafe: true,
    hpfHz: 60,
    eqHint: "Igualar con Playback Izq",
    monitorHint: "Todos los monitores",
    priority: "high",
    feedbackRisk: "low",
  },
];

export function generateChannelPatch(
  mics: GearItem[],
  acoustics: AcousticsResult
): ChannelPatch[] {
  const channels = DEFAULT_CHANNELS.map((ch, idx) => {
    const patch: ChannelPatch = { ...ch, ch: idx + 1 };

    // Ajustar feedback risk según acústica de la sala
    if (acoustics.rt60Audience > 2 && patch.feedbackRisk === "high") {
      patch.eqHint += " — RT60 ALTO: máxima atención al feedback";
    }

    // HPF más agresivo en salas muy reverberantes
    if (acoustics.rt60Audience > 1.8 && patch.hpfHz < 100) {
      patch.eqHint += ` — considerar HPF a ${patch.hpfHz + 20}Hz por RT60 elevado`;
    }

    return patch;
  });

  // ── Micrófonos reales del usuario ──────────────────────────────────────────
  // Antes esto sólo escribía el modelo del PRIMER micrófono en el canal 12 y
  // descartaba todo el resto: elegías seis micrófonos en el paso de PA y cinco
  // eran invisibles en el patch. También ignoraba las cantidades. Es el mismo
  // patrón `[0]` que apareció en el resto de los motores.
  //
  // Ahora la plantilla aporta la ESTRUCTURA (un patch de banda estándar) y el
  // inventario del usuario se asigna sobre ella en orden, agregando canales
  // extra para lo que no entre.
  const units: GearItem[] = [];
  for (const m of mics) {
    for (let i = 0; i < (m.quantity ?? 1); i++) units.push(m);
  }
  if (units.length === 0) return channels;

  const merged = channels.map((ch, idx) => {
    const m = units[idx];
    if (!m) return ch;
    return {
      ...ch,
      source: `${m.brand} ${m.model}`.trim() || ch.source,
      // Sólo los de condensador necesitan phantom; la base de datos marca los
      // dinámicos con splMax bajo o nulo.
      phantom: ch.phantom && !!m.splMax && m.splMax >= 150,
      phantomSafe: true,
    };
  });

  // Canales extra para los micrófonos que exceden la plantilla: si el usuario
  // cargó 20 micrófonos, tiene que verlos los 20.
  for (let i = channels.length; i < units.length; i++) {
    const m = units[i];
    merged.push({
      ...channels[channels.length - 1],
      ch: i + 1,
      name: `Extra ${i - channels.length + 1}`,
      source: `${m.brand} ${m.model}`.trim(),
      stageboxInput: i + 1,
      phantom: !!m.splMax && m.splMax >= 150,
      phantomSafe: true,
      feedbackRisk: "medium",
      eqHint: "Canal adicional del inventario — ajustar según la fuente real.",
    });
  }

  return merged;
}
