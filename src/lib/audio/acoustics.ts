import type { AcousticDiagnosis, RoomData } from '@/types/room';

// Coeficientes de absorción por material (125Hz promediado)
export const ABSORPTION_COEFS = {
  paredes: { ladrillo: 0.03, hormigon: 0.02, madera: 0.06, tratado: 0.25 },
  piso: { cemento: 0.02, madera: 0.05, alfombra: 0.35, ceramica: 0.02 },
  techo: { madera: 0.06, hormigon: 0.02, panel: 0.15, tratado: 0.3 },
  persona: 0.42,
  ventanal: { no: 0, parcial: 0.08, completo: 0.2 },
  tratamiento: { ninguno: 0, parcial: 0.06, completo: 0.18 },
} as const

// Fórmula de Sabine: RT60 = 0.161 × V / A
export function calcRT60(room: RoomData, conPublico = false): number {
  const vol = room.largo * room.ancho * room.alto
  const sParedes = 2 * (room.largo * room.alto + room.ancho * room.alto)
  const sPiso = room.largo * room.ancho
  const sTecho = sPiso
  const sTotal = sParedes + sPiso + sTecho

  const aParedes = ABSORPTION_COEFS.paredes[room.materialParedes] ?? 0.03
  const aPiso = ABSORPTION_COEFS.piso[room.materialPiso] ?? 0.02
  const aTecho = ABSORPTION_COEFS.techo[room.materialTecho] ?? 0.06
  const aVent = ABSORPTION_COEFS.ventanal[room.ventanales] ?? 0
  const aTrat = ABSORPTION_COEFS.tratamiento[room.tratamiento] ?? 0

  const absTotal =
    sParedes * aParedes +
    sPiso * aPiso +
    sTecho * aTecho +
    sTotal * (aVent + aTrat) +
    (conPublico ? room.capacidad * ABSORPTION_COEFS.persona : 0)

  return Math.round(((0.161 * vol) / absTotal) * 10) / 10
}

export function calcEcoMs(room: RoomData): number {
  const maxDist = Math.max(room.largo, room.ancho)
  return Math.round(((maxDist * 2) / 343) * 1000)
}

export function diagnosRoom(room: RoomData): AcousticDiagnosis {
  const rt60Empty = calcRT60(room, false)
  const rt60Full = calcRT60(room, true)
  const ecoMs = calcEcoMs(room)
  const aCoef = ABSORPTION_COEFS.paredes[room.materialParedes] ?? 0.03

  let reflexion: 'muy_alta' | 'alta' | 'media' | 'baja'
  if (aCoef < 0.03) reflexion = 'muy_alta'
  else if (aCoef < 0.07) reflexion = 'alta'
  else if (aCoef < 0.15) reflexion = 'media'
  else reflexion = 'baja'

  const problemas: string[] = [
    'Acumulación de graves 80–120 Hz',
    'Reflexión de medios 200–400 Hz',
    ...(rt60Full > 1.0 ? ['Reverb excesiva — inteligibilidad reducida'] : []),
    ...(ecoMs > 60 ? [`Eco de pared trasera ~${ecoMs}ms`] : []),
    ...(room.techo === 'triangular' ? ['Techo parabólico — riesgo de concentración'] : []),
  ]

  let recomendacion: string
  if (rt60Full > 1.2)
    recomendacion =
      'Sala muy reverberante. Cortar 200–400Hz en voces. Considerar cortinas en ventanales.'
  else if (rt60Full > 0.8)
    recomendacion = 'Sala con reverb moderada. Aplicar EQ estándar. Menos volumen = más claridad.'
  else recomendacion = 'Sala bien controlada. Configuración estándar, ajustes mínimos.'

  return { rt60Empty, rt60Full, ecoMs, reflexion, problemas, recomendacion }
}
