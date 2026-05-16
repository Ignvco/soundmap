import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am, RD = C.rd

const TS = [
  {
    sym:   'Sin sonido en los TOPs activos',
    sev:   'h' as const,
    cause: 'XLR suelto, TOP apagado o preset mal configurado en el DCX',
    sol:   '1. Verificar TOP encendido.\n2. Verificar XLR OUT A o B del DCX2496.\n3. Panel trasero RCF: FLAT + sensibilidad al máximo.\n4. LED limitador no debe ser permanente.',
  },
  {
    sym:   'Sin sonido en los SUBs',
    sev:   'h' as const,
    cause: 'XLR suelto en salida C o D del DCX, o SUB apagado',
    sol:   '1. Verificar cada SUB encendido.\n2. Verificar cables XLR OUT C y D del DCX.\n3. Crossover interno del SUB al máximo.',
  },
  {
    sym:   'Sonido solo de un lado',
    sev:   'h' as const,
    cause: 'Cable cortado, paneo extremo en mixer, o salida muda en DCX',
    sol:   '1. Verificar paneo de todos los canales del mixer.\n2. Reemplazar cables XLR uno por uno.\n3. Verificar que Main L y R estén abiertos.',
  },
  {
    sym:   'Click audible al público',
    sev:   'h' as const,
    cause: 'Fader CH13 no está en −∞ en el PA',
    sol:   'Bajar CH13 a −∞ INMEDIATAMENTE.\nEl click solo debe ir por Aux a los in-ears de los músicos.\nLa congregación nunca debe escucharlo.',
  },
  {
    sym:   'Feedback / acople',
    sev:   'm' as const,
    cause: 'Micrófono detrás de los TOPs, o ganancia muy alta',
    sol:   '1. Bajar fader del canal problemático.\n2. El micrófono siempre delante de los TOPs.\n3. Cortar 1–4kHz en el canal que acopla.',
  },
  {
    sym:   'Bajo muy retumbante',
    sev:   'm' as const,
    cause: 'SUBs muy altos, sala con vidrios, o preset sin compensación',
    sol:   '1. Verificar qué preset está activo — ¿tiene vidrios?\n2. Reducir nivel SUBs en DCX 1–2dB.\n3. Cortar Peak 80Hz en EQ subs del DCX.',
  },
  {
    sym:   'Voces poco claras / incomprensibles',
    sev:   'm' as const,
    cause: 'Reverberación excesiva de la sala, EQ inadecuado o volumen general alto',
    sol:   '1. Bajar master 3dB.\n2. Cortar 200–400Hz en todos los canales de voz.\n3. Sin reverb en la mezcla del PA.\n4. Si el RT60 es >1.2s considerar tratamiento acústico.',
  },
  {
    sym:   'LED limitador TOP permanente',
    sev:   'm' as const,
    cause: 'Nivel de salida del DCX demasiado alto para el TOP',
    sol:   'Bajar OUT A/B en el DCX 1–2dB.\nParpadeo en picos de transiente es normal.\nLED permanente = señal excesiva que daña el amplificador.',
  },
  {
    sym:   'Condensador sin señal (AT, KSM9, etc.)',
    sev:   'm' as const,
    cause: 'Phantom 48V no encendido en el mixer',
    sol:   '1. Activar Phantom 48V en el mixer (botón global o por canal).\n2. Esperar 10 segundos antes de abrir el fader.\n3. Verificar cable XLR — los balanceados transmiten el phantom.',
  },
  {
    sym:   'Distorsión en el mixer — clip permanente',
    sev:   'm' as const,
    cause: 'Ganancia de preamplificador demasiado alta',
    sol:   '1. Bajar el trim/gain del canal hasta que el LED de clip solo parpadee en picos fuertes.\n2. El gain correcto: voz a 10–20cm del mic → nivel entre −6 y 0dBu.\n3. Si el canal clipea con la voz lejos: el instrumento tiene nivel de línea — usar PAD o DI.',
  },
  {
    sym:   'Ruido de fondo / zumbido 50/60Hz',
    sev:   'm' as const,
    cause: 'Ground loop — cables de audio y corriente comparten tierra',
    sol:   '1. Desconectar los DI Box uno por uno hasta aislar el culpable.\n2. Usar DI Box con transformador de aislamiento.\n3. Verificar que el rack de audio y los amplificadores estén en el mismo ramal eléctrico.\n4. No usar adaptadores de 3 a 2 patas en el mixer.',
  },
  {
    sym:   'Sin señal en canal de DI Box',
    sev:   'm' as const,
    cause: 'DI apagado, cable TS/TRS suelto, o instrumento sin batería',
    sol:   '1. Verificar cable del instrumento al DI (conector TS).\n2. Verificar XLR del DI al mixer.\n3. Si el DI es activo: verificar batería 9V o phantom 48V.\n4. Probar el instrumento con otro cable.',
  },
]

function TSItem({ item }: { item: typeof TS[0] }) {
  const [open, setOpen] = useState(false)
  const isH    = item.sev === 'h'
  const color  = isH ? RD : AM
  return (
    <View style={{
      marginBottom: 7, backgroundColor: C.glass,
      borderRadius: 12, borderWidth: 0.5, borderColor: BR,
      borderLeftWidth: 3, borderLeftColor: color,
      overflow: 'hidden',
    }}>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }}
        activeOpacity={0.8}
      >
        <View style={{
          width: 6, height: 6, borderRadius: 3,
          backgroundColor: color,
          shadowColor: color, shadowRadius: 5, shadowOpacity: 0.7,
        }} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: TX, flex: 1, lineHeight: 17 }}>
          {item.sym}
        </Text>
        <View style={{
          paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20,
          backgroundColor: isH ? C.rd2 : C.am2,
          borderWidth: 0.5, borderColor: `${color}40`,
        }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color }}>{isH ? 'Crítico' : 'Importante'}</Text>
        </View>
        <Text style={{ color: T3, fontSize: 11, marginLeft: 4, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>▾</Text>
      </TouchableOpacity>

      {open && (
        <View style={{ paddingHorizontal: 13, paddingBottom: 13, borderTopWidth: 0.5, borderTopColor: BR }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 10, marginBottom: 4 }}>
            Causa probable
          </Text>
          <Text style={{ fontSize: 12, color: T2, marginBottom: 8, lineHeight: 17 }}>{item.cause}</Text>
          <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>
            Solución paso a paso
          </Text>
          <Text style={{ fontSize: 12, color: T2, lineHeight: 20 }}>{item.sol}</Text>
        </View>
      )}
    </View>
  )
}

export default function TroubleshootScreen() {
  const criticos    = TS.filter((t) => t.sev === 'h')
  const importantes = TS.filter((t) => t.sev === 'm')

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 100 }}
    >
      <View style={{ backgroundColor: C.rd2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)', padding: 12, marginBottom: 18 }}>
        <Text style={{ fontSize: 12, fontWeight: '700', color: RD, marginBottom: 3 }}>🔴 Crítico = resolver antes de continuar</Text>
        <Text style={{ fontSize: 11, color: T2 }}>Amarillo = importante pero no detiene el culto</Text>
      </View>

      <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>
        Críticos — {criticos.length} casos
      </Text>
      {criticos.map((item, i) => <TSItem key={i} item={item} />)}

      <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 }}>
        Importantes — {importantes.length} casos
      </Text>
      {importantes.map((item, i) => <TSItem key={`m${i}`} item={item} />)}
    </ScrollView>
  )
}
