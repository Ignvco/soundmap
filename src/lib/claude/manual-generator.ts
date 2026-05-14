import type { GearSystem, SystemPreset } from '@/types/audio';
import type { AcousticDiagnosis, RoomData } from '@/types/room';

export interface ManualContent {
  diagnostico:     string
  recomendaciones: string
  posicionamiento: string
  troubleshooting: string[]
  notasOperacion:  string
}

// Contenido base calculado — sin IA
// Para activar Claude: descomentar generateWithClaude() y llamarla en generateManualText()
export function generateManualText(
  room: RoomData,
  gear: GearSystem,
  diag: AcousticDiagnosis,
  presets: SystemPreset[],
): ManualContent {
  // Diagnóstico calculado a partir de los datos reales del recinto
  const rt = diag.rt60Full.toFixed(1)
  const xover = presets[0]?.crossoverHz ?? 80
  const topName = gear.top.nombre
  const subName = gear.sub.nombre

  return {
    diagnostico:
      `Recinto de ${room.largo}×${room.ancho}×${room.alto}mt con ${room.capacidad} personas. ` +
      `Paredes de ${room.materialParedes}, piso de ${room.materialPiso}. ` +
      `RT60 estimado con público: ${rt} seg. ${diag.recomendacion}`,

    recomendaciones: diag.problemas.length > 0
      ? `Problemas identificados: ${diag.problemas.join('. ')}.`
      : `Sala en buenas condiciones acústicas para el uso previsto.`,

    posicionamiento:
      `${topName} en trípodes en esquinas frontales del escenario, ` +
      `altura del tweeter 2.0–2.2m, inclinación 10–15° hacia el público. ` +
      `${subName} juntos al centro del escenario en el piso.`,

    troubleshooting: [
      'Sin sonido en TOPs: verificar cables XLR del DCX a los TOPs.',
      'Sin sonido en SUBs: verificar cables XLR del DCX a los SUBs.',
      'Feedback: bajar gain del canal problemático. Micrófono delante de los TOPs.',
      'Bajo retumbante: verificar preset activo. Reducir nivel SUBs en DCX.',
      'Condensador sin señal: verificar Phantom 48V encendido en el mixer.',
    ],

    notasOperacion:
      `Crossover: ${xover}Hz LR24. ` +
      `Voces siempre por encima de los instrumentos. ` +
      `Durante predicación: bajar todos los instrumentos a −∞.`,
  }
}