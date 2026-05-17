import React, { useState } from 'react'
import {
  ActivityIndicator, Linking, Platform,
  ScrollView, Text, TouchableOpacity, View,
} from 'react-native'
import { useAppStore } from '@/store/app'
import { diagnosRoom } from '@/lib/audio/acoustics'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am, RD = C.rd

// ── Troubleshooting ───────────────────────────────────────
const TS = [
  { sym: 'Sin sonido en los TOPs activos', sev: 'h' as const,
    cause: 'XLR suelto, TOP apagado o preset mal configurado',
    sol: '1. Verificar TOP encendido.\n2. Verificar XLR OUT A o B del DCX2496.\n3. Panel trasero RCF: FLAT + sensibilidad máxima.\n4. LED limitador no debe ser permanente.' },
  { sym: 'Sin sonido en los SUBs', sev: 'h' as const,
    cause: 'XLR suelto en salida C o D, o SUB apagado',
    sol: '1. Verificar cada SUB encendido.\n2. XLR OUT C y D del DCX.\n3. Crossover interno del SUB al máximo.' },
  { sym: 'Sonido solo de un lado', sev: 'h' as const,
    cause: 'Cable cortado, paneo extremo o salida muda',
    sol: '1. Verificar paneo de todos los canales.\n2. Reemplazar cables XLR uno por uno.\n3. Main L y R del mixer.' },
  { sym: 'Click audible al público', sev: 'h' as const,
    cause: 'Fader CH13 no está en −∞ en el PA',
    sol: 'Bajar CH13 a −∞ INMEDIATAMENTE.\nSolo por Aux a in-ears de músicos.' },
  { sym: 'Feedback / acople', sev: 'm' as const,
    cause: 'Mic detrás de los TOPs o gain muy alto',
    sol: '1. Bajar fader del canal.\n2. Mic siempre delante de los TOPs.\n3. Cortar 1–4kHz.' },
  { sym: 'Bajo muy retumbante', sev: 'm' as const,
    cause: 'SUBs muy altos, sala con vidrios o preset incorrecto',
    sol: '1. ¿Preset con vidrios activo?\n2. Reducir nivel SUBs en DCX 1–2dB.\n3. Cortar 80Hz en EQ subs.' },
  { sym: 'Voces poco claras', sev: 'm' as const,
    cause: 'Reverberación excesiva, EQ o volumen alto',
    sol: '1. Bajar master 3dB.\n2. Cortar 200–400Hz en voces.\n3. Sin reverb en PA.' },
  { sym: 'LED limitador TOP permanente', sev: 'm' as const,
    cause: 'Nivel de salida del DCX demasiado alto',
    sol: 'Bajar OUT A/B en DCX 1–2dB. Parpadeo = normal. Permanente = nivel excesivo.' },
  { sym: 'Condensador sin señal', sev: 'm' as const,
    cause: 'Phantom 48V no encendido',
    sol: '1. Activar Phantom 48V en el mixer.\n2. Esperar 10 segundos.\n3. Verificar cable XLR.' },
  { sym: 'Ruido de fondo / zumbido', sev: 'm' as const,
    cause: 'Ground loop — cables de audio y corriente compartiendo tierra',
    sol: '1. Desconectar DI Box uno por uno.\n2. Usar DI con transformador de aislamiento.\n3. Mismo ramal eléctrico para mixer y amps.' },
  { sym: 'Distorsión — clip permanente', sev: 'm' as const,
    cause: 'Ganancia de preamplificador muy alta',
    sol: '1. Bajar trim/gain hasta que LED parpadee solo en picos.\n2. Si clipea con voz lejana → señal de línea, usar PAD.' },
  { sym: 'Sin señal en DI Box', sev: 'm' as const,
    cause: 'Cable suelto, DI apagado, batería descargada',
    sol: '1. Verificar cable TS del instrumento al DI.\n2. XLR del DI al mixer.\n3. DI activo → verificar batería 9V o phantom.' },
]

function TSItem({ item }: { item: typeof TS[0] }) {
  const [open, setOpen] = useState(false)
  const color = item.sev === 'h' ? RD : AM
  return (
    <View style={{ marginBottom: 7, backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, borderLeftWidth: 3, borderLeftColor: color, overflow: 'hidden' }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }} activeOpacity={0.8}>
        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: color, shadowColor: color, shadowRadius: 4, shadowOpacity: 0.7 }} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: TX, flex: 1, lineHeight: 17 }}>{item.sym}</Text>
        <View style={{ paddingHorizontal: 6, paddingVertical: 1, borderRadius: 20, backgroundColor: item.sev === 'h' ? C.rd2 : C.am2 }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color }}>{item.sev === 'h' ? 'Crítico' : 'Importante'}</Text>
        </View>
        <Text style={{ color: T3, fontSize: 11, marginLeft: 4, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>▾</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: 13, paddingBottom: 13, borderTopWidth: 0.5, borderTopColor: BR }}>
          <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 9, marginBottom: 3 }}>Causa</Text>
          <Text style={{ fontSize: 12, color: T2, marginBottom: 8, lineHeight: 17 }}>{item.cause}</Text>
          <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 4 }}>Solución</Text>
          <Text style={{ fontSize: 12, color: T2, lineHeight: 20 }}>{item.sol}</Text>
        </View>
      )}
    </View>
  )
}

// ── SECCIONES DEL MANUAL ─────────────────────────────────
const SECTIONS = [
  'Diagnóstico acústico completo · RT60 · STI',
  'Stage Map frontal + planta SVG',
  'Especificaciones del equipamiento',
  'DSP · presets · EQ paramétrico por salida',
  'Canal por canal — hasta 13 canales',
  'Protocolo backup de emergencia',
  'Troubleshooting completo',
]

type Tab = 'manual' | 'troubleshoot'

export default function ExportScreen() {
  const { room, gear, allPresets, channels } = useAppStore()
  const [tab,      setTab]      = useState<Tab>('manual')
  const [loading,  setLoading]  = useState(false)
  const [manualUrl,setManualUrl]= useState<string | null>(null)
  const [error,    setError]    = useState<string | null>(null)

  // ── FIX punto 7: función que abre el link correctamente ──
  const openLink = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url)
      if (canOpen) {
        await Linking.openURL(url)
      } else {
        setError(`No se puede abrir el link: ${url}`)
      }
    } catch (e) {
      setError('Error al abrir el manual. Copiá el link manualmente.')
    }
  }

  const generateManual = async () => {
    if (!room || !gear) {
      setError('Completá el Room Scan y el Gear Builder primero.')
      return
    }
    setLoading(true)
    setError(null)

    try {
      const diag = diagnosRoom(room)

      // Construir el contenido del manual como JSON para la Edge Function
      const payload = {
        room,
        gear: {
          tops:      gear.tops,
          subs:      gear.subs,
          systemType:gear.systemType,
          amps:      gear.amps,
          dsps:      gear.dsps,
          mixer:     gear.mixer,
          monitores: gear.monitores,
          mics:      gear.mics,
        },
        presets:  allPresets,
        channels: channels.map((ch) => ({
          num:    ch.num,
          nombre: ch.nombre,
          src:    ch.src,
          eq:     ch.eq,
          nota:   ch.nota,
        })),
        diagnostico: {
          rt60Empty:   diag.rt60Empty,
          rt60Full:    diag.rt60Full,
          eco:         diag.eco,
          sti:         diag.sti,
          score:       diag.score,
          scoreLabel:  diag.scoreLabel,
          tratamiento: diag.tratamiento,
        },
      }

      // Llamar a la Edge Function de Supabase
      const supabaseUrl  = process.env.EXPO_PUBLIC_SUPABASE_URL  ?? ''
      const supabaseKey  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

      if (!supabaseUrl || !supabaseKey) {
        // Sin Supabase → generar un link de demo
        await new Promise((r) => setTimeout(r, 1000))
        setManualUrl('https://soundmap.levelproaudio.com/manual/demo-' + Date.now())
        return
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/generate-pdf`, {
        method:  'POST',
        headers: {
          'Content-Type':  'application/json',
          'Authorization': `Bearer ${supabaseKey}`,
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errText = await response.text()
        throw new Error(errText || `Error ${response.status}`)
      }

      const data = await response.json() as { url: string }
      setManualUrl(data.url)

    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(`Error al generar: ${msg}`)
    } finally {
      setLoading(false)
    }
  }

  const criticos    = TS.filter((t) => t.sev === 'h')
  const importantes = TS.filter((t) => t.sev === 'm')

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 16 }}>
          {tab === 'manual' ? 'Manual Export' : 'Troubleshooting'}
        </Text>
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['manual', 'troubleshoot'] as Tab[]).map((t) => (
            <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: tab === t ? 1 : 0.5, borderColor: tab === t ? AC : BR, backgroundColor: tab === t ? C.ac2 : 'transparent' }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: tab === t ? AC : T2 }}>
                {t === 'manual' ? '📄 Manual' : '⚡ Troubleshoot'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── MANUAL TAB ── */}
      {tab === 'manual' && (
        <View style={{ paddingHorizontal: 14 }}>
          {/* Preview */}
          <View style={{ backgroundColor: C.glass, borderRadius: 16, borderWidth: 0.5, borderColor: BR, padding: 16, marginBottom: 14 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TX, marginBottom: 4 }}>Manual de Audio — SoundMap</Text>
            <Text style={{ fontSize: 10, color: T3, marginBottom: 12, letterSpacing: 1 }}>by LevelPro Audio</Text>
            {SECTIONS.map((s) => (
              <View key={s} style={{ flexDirection: 'row', gap: 7, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: BR }}>
                <Text style={{ color: AC, fontSize: 11 }}>✓</Text>
                <Text style={{ fontSize: 11, color: T2, flex: 1, lineHeight: 16 }}>{s}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              <View style={{ flex: 1, padding: 9, borderRadius: 9, backgroundColor: room ? C.ac3 : C.glass, borderWidth: 0.5, borderColor: room ? 'rgba(26,255,110,0.18)' : BR }}>
                <Text style={{ fontSize: 8, color: T3, marginBottom: 2 }}>Recinto</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: room ? AC : T3 }}>{room?.nombre ?? 'Pendiente'}</Text>
              </View>
              <View style={{ flex: 1, padding: 9, borderRadius: 9, backgroundColor: C.glass, borderWidth: 0.5, borderColor: BR }}>
                <Text style={{ fontSize: 8, color: T3, marginBottom: 2 }}>Canales</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: TX }}>{channels.length}</Text>
              </View>
              <View style={{ flex: 1, padding: 9, borderRadius: 9, backgroundColor: C.glass, borderWidth: 0.5, borderColor: BR }}>
                <Text style={{ fontSize: 8, color: T3, marginBottom: 2 }}>DSPs</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: TX }}>{gear.dsps.length}</Text>
              </View>
            </View>
          </View>

          {!room && (
            <View style={{ backgroundColor: C.am2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)', padding: 11, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: AM }}>⚠ Completá el Room Scan para un manual completo.</Text>
            </View>
          )}

          {error && (
            <View style={{ backgroundColor: C.rd2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)', padding: 11, marginBottom: 12 }}>
              <Text style={{ fontSize: 11, color: RD }}>{error}</Text>
            </View>
          )}

          {manualUrl ? (
            <View style={{ gap: 8 }}>
              <View style={{ backgroundColor: C.ac2, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)', padding: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: AC, marginBottom: 4 }}>✓ Manual generado</Text>
                <Text style={{ fontSize: 10, color: T2, lineHeight: 15 }} numberOfLines={2}>{manualUrl}</Text>
              </View>

              {/* FIX punto 7: botón que usa openLink con Linking.canOpenURL */}
              <TouchableOpacity
                onPress={() => openLink(manualUrl)}
                style={{ backgroundColor: AC, borderRadius: 12, padding: 14, alignItems: 'center' }}
              >
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Abrir manual ↗</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => { setManualUrl(null); setError(null) }}
                style={{ padding: 12, borderRadius: 12, borderWidth: 0.5, borderColor: BR, alignItems: 'center' }}
              >
                <Text style={{ color: T2, fontSize: 12 }}>Regenerar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={generateManual}
              disabled={loading}
              style={{ backgroundColor: AC, borderRadius: 12, padding: 15, alignItems: 'center', opacity: loading ? 0.7 : 1 }}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <ActivityIndicator color="#000" size="small" />
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Generando...</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Generar manual ↗</Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── TROUBLESHOOT TAB ── */}
      {tab === 'troubleshoot' && (
        <View style={{ paddingHorizontal: 14 }}>
          <View style={{ backgroundColor: C.rd2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)', padding: 12, marginBottom: 14 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: RD }}>🔴 Crítico = resolver antes de continuar</Text>
            <Text style={{ fontSize: 11, color: T2, marginTop: 3 }}>🟡 Importante = no detiene el culto</Text>
          </View>
          <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10 }}>Críticos — {criticos.length}</Text>
          {criticos.map((item, i) => <TSItem key={i} item={item} />)}
          <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 16 }}>Importantes — {importantes.length}</Text>
          {importantes.map((item, i) => <TSItem key={`m${i}`} item={item} />)}
        </View>
      )}
    </ScrollView>
  )
}
