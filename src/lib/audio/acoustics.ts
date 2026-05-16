// ═══════════════════════════════════════════════════════════
// SoundMap — Motor de diagnóstico acústico completo v2
// Cálculos reales: RT60, eco, modos de sala, delay, STI
// ═══════════════════════════════════════════════════════════

import type { RoomData } from '@/store/app';

// ── Interfaces ────────────────────────────────────────────

export interface AcousticDiagnosis {
  rt60Empty:    number   // segundos
  rt60Full:     number   // con público
  eco:          number   // ms eco pared trasera
  vol:          number   // m³
  area:         number   // m² planta
  relacion:     number   // largo/ancho
  volPerPerson: number   // m³ por persona
  delaySubsMs:  number   // delay recomendado SUBs
  sti:          number   // Speech Transmission Index estimado 0–1
  problemFreqs: ProblemFreq[]
  score:        number   // 0–100 puntuación acústica global
  scoreLabel:   string   // 'Excelente' | 'Bueno' | 'Regular' | 'Problemático'
  items:        DiagItem[]
  tratamiento:  TratamientoSugerido[]
}

export interface ProblemFreq {
  hz:    number
  label: string
  desc:  string
  sev:   'ok' | 'warn' | 'bad'
}

export interface DiagItem {
  id:     string
  status: 'ok' | 'warn' | 'bad'
  title:  string
  valor:  string
  porq:   string
  paraq:  string
  como:   string
}

export interface TratamientoSugerido {
  prioridad: 'alta' | 'media' | 'baja'
  zona:      string
  material:  string
  efecto:    string
  costo:     string
}

// ── Motor principal ────────────────────────────────────────

export function diagnosRoom(room: RoomData): AcousticDiagnosis {
  const { largo: L, ancho: A, alto: H, cap: Cap } = room
  const vol   = L * A * H
  const area  = L * A
  const relacion = Math.max(L, A) / Math.min(L, A)
  const volPerPerson = vol / Cap

  // ── RT60 Sabine ──────────────────────────────────────
  const sParedes = 2 * (L * H + A * H)
  const sPiso    = L * A
  const sTecho   = L * A
  const sTotal   = sParedes + sPiso + sTecho

  const absTotal = (
    sParedes * room.matParedes +
    sPiso    * room.matPiso    +
    sTecho   * room.matTecho   +
    sTotal   * room.matVentanales
  )
  const absAudiencia = Cap * 0.42 // absorción promedio por persona en silla

  const rt60Empty = Math.round((0.161 * vol / absTotal) * 10) / 10
  const rt60Full  = Math.round((0.161 * vol / (absTotal + absAudiencia)) * 10) / 10
  const eco       = Math.round((Math.max(L, A) * 2 / 343) * 1000)

  // ── Delay recomendado SUBs ───────────────────────────
  // SUBs detrás de TOPs → delay = distancia entre them en mt × 2.915ms/mt
  // Para este sistema asumimos SUBs a 0.5mt detrás de los TOPs
  const delaySubsMs = Math.round(0.5 * 2.915 * 10) / 10

  // ── STI estimado (Farret 1985, simplificado) ─────────
  // STI = 1 - (RT60Full * 0.32) - (eco > 50 ? 0.15 : 0)
  const stiRaw = Math.max(0, Math.min(1,
    1 - (rt60Full * 0.32) - (eco > 50 ? 0.15 : eco > 30 ? 0.05 : 0)
  ))
  const sti = Math.round(stiRaw * 100) / 100

  // ── Frecuencias problemáticas (modos axiales) ───────
  // f = c / (2 × dimensión)  — primer modo por eje
  const fL  = Math.round(343 / (2 * L))   // modo axial largo
  const fA  = Math.round(343 / (2 * A))   // modo axial ancho
  const fH  = Math.round(343 / (2 * H))   // modo axial altura

  const sevFL: ProblemFreq['sev'] = fL < 60 ? 'bad' : fL < 100 ? 'warn' : 'ok'
  const sevFA: ProblemFreq['sev'] = fA < 60 ? 'bad' : fA < 100 ? 'warn' : 'ok'
  const sevFH: ProblemFreq['sev'] = fH < 100 ? 'warn' : 'ok'

  const problemFreqs: ProblemFreq[] = [
    {
      hz: fL,
      label: `${fL} Hz — Modo largo`,
      desc:  `Modo axial del largo (${L}mt). Acumulación en pared frontal y trasera.`,
      sev:   sevFL,
    },
    {
      hz: fA,
      label: `${fA} Hz — Modo ancho`,
      desc:  `Modo axial del ancho (${A}mt). Acumulación en paredes laterales.`,
      sev:   sevFA,
    },
    {
      hz: fH,
      label: `${fH} Hz — Modo altura`,
      desc:  `Modo axial de la altura (${H}mt). Acumulación en piso y techo.`,
      sev:   sevFH,
    },
    {
      hz:    80,
      label: '80 Hz — Crossover RCF/AIR18',
      desc:  `Frecuencia de corte. Verificar suma de fase en la zona del crossover.`,
      sev:   'warn' as const,
    },
  ].sort((a, b) => a.hz - b.hz)

  // ── Score acústico global ────────────────────────────
  let score = 100
  // RT60
  if (rt60Full > 2.0)      score -= 35
  else if (rt60Full > 1.5) score -= 25
  else if (rt60Full > 1.2) score -= 15
  else if (rt60Full > 0.9) score -= 5
  else if (rt60Full < 0.4) score -= 10
  // Eco
  if (eco > 80)      score -= 20
  else if (eco > 50) score -= 10
  // Proporciones
  if (relacion > 3)        score -= 15
  else if (relacion > 2.5) score -= 8
  else if (relacion < 1.2) score -= 5
  // Vol/persona
  if (volPerPerson < 2) score -= 10
  // STI
  if (sti < 0.45)      score -= 15
  else if (sti < 0.60) score -= 8

  score = Math.max(0, Math.min(100, score))
  const scoreLabel =
    score >= 80 ? 'Excelente' :
    score >= 60 ? 'Bueno' :
    score >= 40 ? 'Regular'  : 'Problemático'

  // ── Items de diagnóstico ─────────────────────────────
  const items: DiagItem[] = []

  // 1. RT60
  const rt60Status: DiagItem['status'] =
    rt60Full < 0.4 ? 'warn' :
    rt60Full < 0.9 ? 'ok'   :
    rt60Full < 1.3 ? 'warn' : 'bad'

  items.push({
    id:    'rt60',
    status: rt60Status,
    title: rt60Status === 'ok'
      ? 'RT60 óptimo para voz hablada'
      : rt60Full < 0.4
        ? 'RT60 muy bajo — sala sorda'
        : rt60Full < 1.3
          ? 'RT60 moderado — ajuste necesario'
          : 'RT60 crítico — sala muy reverberante',
    valor: `${rt60Full.toFixed(1)} seg`,
    porq: rt60Status === 'ok'
      ? `RT60 de ${rt60Full.toFixed(1)}s ideal para habla y predicación con este recinto de ${vol.toFixed(0)}m³.`
      : rt60Full < 0.4
        ? `RT60 de ${rt60Full.toFixed(1)}s indica exceso de material absorbente. La sala "mata" el sonido.`
        : rt60Full < 1.3
          ? `RT60 de ${rt60Full.toFixed(1)}s genera reverberación audible que afecta la claridad del habla.`
          : `RT60 de ${rt60Full.toFixed(1)}s es excesivo. El sonido se superpone a sí mismo.`,
    paraq: rt60Status === 'ok'
      ? 'Excelente inteligibilidad. El público comprende con claridad sin esfuerzo.'
      : rt60Full < 0.4
        ? 'La música sonará apagada, sin presencia ni energía. Las voces perderán naturalidad.'
        : rt60Full < 1.3
          ? 'La inteligibilidad de la palabra se reduce significativamente. Las consonantes se pierden.'
          : 'Pérdida severa de inteligibilidad. Imposible entender voces a volumen alto. Feedback frecuente.',
    como: rt60Status === 'ok'
      ? 'Mantener la configuración actual de materiales. Calibrar con sala llena.'
      : rt60Full < 0.4
        ? 'Reducir material absorbente. Agregar superficies reflectantes controladas (madera, difusores).'
        : rt60Full < 1.3
          ? 'Cortar 200–400Hz en canales de voz. Reducir master 3dB. Agregar alfombras o cortinas en paredes laterales.'
          : 'Tratamiento acústico urgente: paneles absorbentes (5cm grosor mín.) en paredes y fondo, alfombra gruesa. Reducir volumen del PA hasta resolver.',
  })

  // 2. Eco
  const ecoStatus: DiagItem['status'] =
    eco > 80 ? 'bad' : eco > 50 ? 'warn' : 'ok'

  items.push({
    id:    'eco',
    status: ecoStatus,
    title: ecoStatus === 'ok'
      ? 'Eco de pared trasera controlado'
      : ecoStatus === 'warn'
        ? 'Eco de pared trasera leve'
        : 'Eco de pared trasera — audible y problemático',
    valor: `${eco} ms`,
    porq: `La dimensión mayor del recinto es ${Math.max(L, A)}mt. El sonido rebota en la pared trasera y regresa en ${eco}ms.`,
    paraq: ecoStatus === 'ok'
      ? 'Dentro del tiempo de integración del oído (~30ms). Se suma como energía útil.'
      : ecoStatus === 'warn'
        ? 'En el umbral de percepción. Con volumen alto puede percibirse como confusión del sonido.'
        : 'Eco perceptible como repetición separada del sonido. Destruye la inteligibilidad y la imagen estéreo.',
    como: ecoStatus === 'ok'
      ? 'No se requiere tratamiento específico. Mantener configuración actual.'
      : ecoStatus === 'warn'
        ? 'Agregar material absorbente (cortina pesada o panel 5cm) en la pared trasera.'
        : 'Panel absorbente obligatorio en pared trasera (mín. 8cm de espuma o lana mineral). Considerar delay speakers para filas traseras. Reducir ganancia de los TOPs.',
  })

  // 3. Proporciones
  const propStatus: DiagItem['status'] =
    relacion > 2.5 ? 'bad' :
    relacion < 1.2 ? 'warn' : 'ok'

  items.push({
    id:    'proporciones',
    status: propStatus,
    title: propStatus === 'ok'
      ? 'Proporciones de sala adecuadas'
      : relacion > 2.5
        ? 'Sala muy larga — modos axiales graves intensos'
        : 'Sala casi cuadrada — modos coincidentes',
    valor: `${relacion.toFixed(1)}:1`,
    porq: `Relación largo/ancho de ${relacion.toFixed(1)}:1. Los modos axiales del recinto caen en ${fL}Hz y ${fA}Hz.`,
    paraq: propStatus === 'ok'
      ? 'Los modos de sala se distribuyen bien. Buena base acústica.'
      : relacion > 2.5
        ? `Acumulación severa de graves en ~${fL}Hz. El sonido variará mucho según la posición del oyente.`
        : `Los modos en ${fL}Hz y ${fA}Hz son casi coincidentes → se amplifican mutuamente.`,
    como: propStatus === 'ok'
      ? 'Optimizar con tratamiento puntual en zonas de reflexión temprana (paredes laterales).'
      : relacion > 2.5
        ? `Cortar ${fL}Hz en el EQ del DSP. Material absorbente de graves (trampas de graves) en las esquinas. Difusores en paredes largas.`
        : `Tratamiento asimétrico: difusores en una pared lateral, absorbente en la otra. Evitar muebles simétricos.`,
  })

  // 4. STI — Inteligibilidad
  const stiStatus: DiagItem['status'] =
    sti >= 0.65 ? 'ok' :
    sti >= 0.50 ? 'warn' : 'bad'

  const stiDesc =
    sti >= 0.75 ? 'Excelente' :
    sti >= 0.65 ? 'Bueno'     :
    sti >= 0.50 ? 'Regular'   :
    sti >= 0.35 ? 'Malo'      : 'Muy malo'

  items.push({
    id:    'sti',
    status: stiStatus,
    title: `STI estimado — Inteligibilidad ${stiDesc}`,
    valor: `${sti.toFixed(2)} (${stiDesc})`,
    porq: `El Speech Transmission Index estima la inteligibilidad de la palabra en el recinto. Combina RT60 y eco para dar un valor 0–1.`,
    paraq: stiStatus === 'ok'
      ? 'La mayoría del público entenderá el contenido sin esfuerzo, incluso sin seguir el texto.'
      : stiStatus === 'warn'
        ? 'Parte del público necesitará esfuerzo extra para comprender. Los mayores y personas con pérdida auditiva sufrirán más.'
        : 'Alta probabilidad de incomprensión. El mensaje no llega. La amplificación agrava el problema si el RT60 es alto.',
    como: stiStatus === 'ok'
      ? 'Muy bien. Mantener niveles actuales y no subir más el volumen del PA.'
      : 'Priorizar el control del RT60 (principal factor). Reducir reflexiones tempranas con paneles. No compensar con más volumen.',
  })

  // 5. Volumen por persona
  const volStatus: DiagItem['status'] =
    volPerPerson < 2 ? 'bad' :
    volPerPerson < 3 ? 'warn' : 'ok'

  items.push({
    id:    'volumen',
    status: volStatus,
    title: volStatus === 'ok'
      ? 'Volumen acústico por persona adecuado'
      : volPerPerson < 2
        ? 'Sala muy cargada — poca distancia entre personas'
        : 'Poco volumen por persona — considerar impacto del público',
    valor: `${volPerPerson.toFixed(1)} m³/pers.`,
    porq: `Con ${vol.toFixed(0)}m³ y ${Cap} personas, hay ${volPerPerson.toFixed(1)}m³ por persona. Esto afecta cuánto baja el RT60 con sala llena.`,
    paraq: volStatus === 'ok'
      ? 'El público no alterará drásticamente las condiciones acústicas.'
      : volStatus === 'warn'
        ? `Con sala llena, el RT60 bajará ~${(rt60Empty - rt60Full).toFixed(1)}s respecto al vacío. Calibrar siempre con público.`
        : 'Con sala llena habrá mucha absorción. Será necesario subir el PA significativamente vs sala vacía.',
    como: volStatus === 'ok'
      ? 'Hacer ajustes finos de EQ y nivel con sala llena.'
      : `Compensar en directo: subir master ${volStatus === 'bad' ? '4–6' : '2–3'}dB al llenarse la sala. Boost de +2dB en 2–5kHz para presencia.`,
  })

  // 6. Modos de sala
  const modesStatus: DiagItem['status'] =
    (fL < 50 || fA < 50) ? 'bad' :
    (fL < 80 || fA < 80) ? 'warn' : 'ok'

  items.push({
    id:    'modos',
    status: modesStatus,
    title: modesStatus === 'ok'
      ? 'Modos de sala en rango controlable'
      : `Modos de sala bajos — ${fL}Hz / ${fA}Hz / ${fH}Hz`,
    valor: `${fL}Hz · ${fA}Hz · ${fH}Hz`,
    porq: `Los modos axiales del recinto son f=c/(2×dim). Para este recinto: Largo→${fL}Hz, Ancho→${fA}Hz, Alto→${fH}Hz. En esas frecuencias el sonido se refuerza naturalmente.`,
    paraq: modesStatus === 'ok'
      ? 'Los modos están en un rango donde el DSP y el EQ pueden controlarlos eficientemente.'
      : 'Acumulación de bajos difícil de corregir solo con EQ. Cada posición de oyente tendrá un nivel de bajos diferente.',
    como: modesStatus === 'ok'
      ? `En el DCX, revisar la zona de ${fL}–${fA}Hz en el EQ de los SUBs. Pequeños cortes pueden mejorar la uniformidad.`
      : `Prioridad: trampa de graves (bass trap) en esquinas del recinto. En DCX: cortar ${fL}Hz ±1dB en EQ subs. Si el crossover es ${Math.round(fL * 1.2)}Hz, considerar subirlo.`,
  })

  // ── Tratamiento sugerido ─────────────────────────────
  const tratamiento: TratamientoSugerido[] = []

  if (rt60Full > 0.9) {
    tratamiento.push({
      prioridad: rt60Full > 1.3 ? 'alta' : 'media',
      zona:      'Paredes laterales',
      material:  'Paneles absorbentes 5cm (lana mineral o espuma acústica)',
      efecto:    `Reducción estimada de RT60 en ~0.${rt60Full > 1.5 ? '3' : '2'}s`,
      costo:     '$$ — Paneles 60×120cm, ~$15–30 c/u, se necesitan 6–10',
    })
  }

  if (eco > 50) {
    tratamiento.push({
      prioridad: eco > 80 ? 'alta' : 'media',
      zona:      'Pared trasera',
      material:  eco > 80
        ? 'Panel absorbente 8–10cm (lana mineral) o cortina pesada doble'
        : 'Cortina gruesa o panel 5cm de espuma',
      efecto:    `Reducción del eco de ${eco}ms al rango seguro (<40ms)`,
      costo:     eco > 80
        ? '$$$ — Panel profesional o cortina blackout pesada'
        : '$ — Cortina pesada existente reubicada',
    })
  }

  if (relacion > 2) {
    tratamiento.push({
      prioridad: relacion > 2.5 ? 'media' : 'baja',
      zona:      'Esquinas de paredes largas',
      material:  'Trampas de graves (bass traps) — lana mineral 15cm mínimo',
      efecto:    `Control de modo axial en ${fL}Hz`,
      costo:     '$$$ — Trampas de graves de baja frecuencia son costosas',
    })
  }

  if (room.matPiso < 0.1 && rt60Full > 0.8) {
    tratamiento.push({
      prioridad: 'media',
      zona:      'Piso — zona de público',
      material:  'Alfombra gruesa (mín. 8mm) en toda la zona de asientos',
      efecto:    `Aumento de absorción. RT60 puede bajar ~0.1–0.2s. Mejora STI.`,
      costo:     '$$ — Alfombra comercial o carpet tiles',
    })
  }

  if (room.matVentanales > 0.1) {
    tratamiento.push({
      prioridad: 'baja',
      zona:      'Ventanales laterales',
      material:  'Cortinas blackout pesadas (colocadas solo durante cultos)',
      efecto:    'Reducción de reflexiones en ventanales. Mejora RT60 y eco lateral.',
      costo:     '$ — Cortinas blackout estándar',
    })
  }

  // Siempre sugerir difusores si hay espacio
  if (vol > 300) {
    tratamiento.push({
      prioridad: 'baja',
      zona:      'Pared trasera o laterales altas',
      material:  'Difusores QRD (madera) — alternativa a absorción total',
      efecto:    'Dispersa reflexiones sin eliminar toda la energía. Sonido más natural.',
      costo:     '$$ — Difusores DIY de MDF, ~$50–100 por panel',
    })
  }

  return {
    rt60Empty, rt60Full, eco, vol, area, relacion,
    volPerPerson, delaySubsMs, sti,
    problemFreqs, score, scoreLabel,
    items, tratamiento,
  }
}