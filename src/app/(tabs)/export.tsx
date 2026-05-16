import React, { useState } from 'react'
import {
  ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View,
} from 'react-native'
import { useAppStore } from '@/store/app'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, SF = C.bg2, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am, RD = C.rd

const SECTIONS = [
  'Diagnóstico acústico completo · RT60 · SPL Map',
  'Stage Map frontal + planta SVG',
  'Especificaciones del equipamiento',
  'DCX2496 — presets del sistema',
  'Canal por canal — hasta 13 canales',
  'Protocolo backup de emergencia',
  'Troubleshooting completo',
]

const TS = [
  {
    sym: 'Sin sonido en los TOPs',
    sev: 'h' as const,
    cause: 'XLR suelto, TOP apagado o preset mal configurado',
    sol: '1. Verificar TOP encendido.\n2. Verificar XLR OUT A o B del DCX.\n3. Panel trasero: FLAT + sensibilidad máxima.\n4. LED limitador no debe ser permanente.',
  },
  {
    sym: 'Sin sonido en los SUBs',
    sev: 'h' as const,
    cause: 'XLR suelto o SUB apagado',
    sol: '1. Verificar cada SUB encendido.\n2. Verificar cables XLR de OUT C y D del DCX.\n3. Crossover interno SUB al máximo.',
  },
  {
    sym: 'Sonido solo de un lado',
    sev: 'h' as const,
    cause: 'Cable cortado, paneo extremo o OUT mudo',
    sol: '1. Verificar paneo de todos los canales.\n2. Reemplazar cables XLR uno por uno.\n3. Verificar Main L y R del mixer.',
  },
  {
    sym: 'Feedback / acople',
    sev: 'm' as const,
    cause: 'Micrófono detrás de los TOPs o gain muy alto',
    sol: '1. Bajar fader del canal problemático.\n2. Micrófono siempre delante de los TOPs.\n3. Cortar 1–4kHz en el canal.',
  },
  {
    sym: 'Bajo muy retumbante',
    sev: 'm' as const,
    cause: 'SUBs muy altos o sala con vidrios',
    sol: '1. Verificar preset — ¿tiene vidrios activo?\n2. Reducir nivel SUBs en DCX.\n3. Cortar Peak 80Hz en EQ subs.',
  },
  {
    sym: 'Voces poco claras',
    sev: 'm' as const,
    cause: 'Reverb excesiva, EQ inadecuado o volumen alto',
    sol: '1. Bajar master 3dB.\n2. Cortar 200–400Hz en canales de voz.\n3. Sin reverb en mezcla PA.',
  },
  {
    sym: 'LED limitador TOP permanente',
    sev: 'm' as const,
    cause: 'Nivel DCX demasiado alto',
    sol: 'Bajar OUT A/B en DCX 1–2dB. Parpadeo en picos es normal. Permanente = nivel excesivo.',
  },
  {
    sym: 'Click audible al público',
    sev: 'h' as const,
    cause: 'Fader CH13 no está en −∞',
    sol: 'Bajar CH13 a −∞ inmediatamente. Solo por Aux a in-ears de músicos.',
  },
  {
    sym: 'Condensador sin señal',
    sev: 'm' as const,
    cause: 'Phantom 48V no encendido',
    sol: 'Activar Phantom 48V en el mixer. Esperar 10 segundos. Verificar cable XLR.',
  },
]

function TSItem({ item }: { item: typeof TS[0] }) {
  const [open, setOpen] = useState(false)
  const isH = item.sev === 'h'
  const color = isH ? RD : AM

  return (
    <View style={{ marginBottom: 7, backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, overflow: 'hidden' }}>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{ padding: 13, flexDirection: 'row', alignItems: 'center', gap: 9 }}
        activeOpacity={0.8}
      >
        <View style={{
          width: 6, height: 6, borderRadius: 3, backgroundColor: color,
          shadowColor: color, shadowRadius: 5, shadowOpacity: 0.7,
        }} />
        <Text style={{ fontSize: 12, fontWeight: '600', color: TX, flex: 1 }}>{item.sym}</Text>
        <Text style={{ color: T3, fontSize: 11, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>▾</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: 13, paddingBottom: 12, borderTopWidth: 0.5, borderTopColor: BR }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginTop: 9, marginBottom: 3 }}>
            Causa probable
          </Text>
          <Text style={{ fontSize: 12, color: T2, marginBottom: 6 }}>{item.cause}</Text>
          <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>
            Solución
          </Text>
          <Text style={{ fontSize: 12, color: T2, lineHeight: 18 }}>{item.sol}</Text>
        </View>
      )}
    </View>
  )
}

type Tab = 'manual' | 'troubleshoot'

export default function ExportScreen() {
  const { room, gear, allPresets, channels } = useAppStore()
  const [tab, setTab] = useState<Tab>('manual')
  const [loading, setLoading] = useState(false)
  const [manualUrl, setManualUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const generateManual = async () => {
    if (!room || !gear) {
      setError('Completá el Room Scan y el Gear Builder primero.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      // Simulated — in prod llamar a Supabase Edge Function
      await new Promise((r) => setTimeout(r, 1500))
      setManualUrl('https://soundmap.levelproaudio.com/manual/demo')
    } catch {
      setError('Error al generar. Verificá la conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 16 }}>
          {tab === 'manual' ? 'Manual Export' : 'Troubleshooting'}
        </Text>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['manual', 'troubleshoot'] as Tab[]).map((t) => (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={{
                paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
                borderWidth: tab === t ? 1 : 0.5,
                borderColor: tab === t ? AC : BR,
                backgroundColor: tab === t ? C.ac2 : 'transparent',
              }}
            >
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
          {/* Preview card */}
          <View style={{
            backgroundColor: C.glass, borderRadius: 16,
            borderWidth: 0.5, borderColor: BR, padding: 16, marginBottom: 14,
          }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: TX, marginBottom: 4 }}>
              Manual de Audio — SoundMap
            </Text>
            <Text style={{ fontSize: 10, color: T3, marginBottom: 12, letterSpacing: 1 }}>
              by LevelPro Audio
            </Text>
            {SECTIONS.map((s) => (
              <View
                key={s}
                style={{ flexDirection: 'row', gap: 7, paddingVertical: 5, borderBottomWidth: 0.5, borderBottomColor: BR }}
              >
                <Text style={{ color: AC, fontSize: 11 }}>✓</Text>
                <Text style={{ fontSize: 11, color: T2, flex: 1, lineHeight: 16 }}>{s}</Text>
              </View>
            ))}

            {/* Estado del sistema */}
            <View style={{ marginTop: 12, flexDirection: 'row', gap: 8 }}>
              <View style={{
                flex: 1, padding: 10, borderRadius: 10,
                backgroundColor: room ? C.ac3 : C.glass,
                borderWidth: 0.5, borderColor: room ? 'rgba(26,255,110,0.2)' : BR,
              }}>
                <Text style={{ fontSize: 9, color: T3, marginBottom: 3 }}>Recinto</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: room ? AC : T3 }}>
                  {room?.nombre ?? 'Pendiente'}
                </Text>
              </View>
              <View style={{
                flex: 1, padding: 10, borderRadius: 10,
                backgroundColor: C.glass, borderWidth: 0.5, borderColor: BR,
              }}>
                <Text style={{ fontSize: 9, color: T3, marginBottom: 3 }}>Canales</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: TX }}>{channels.length}</Text>
              </View>
            </View>
          </View>

          {error && (
            <Text style={{ color: RD, fontSize: 12, marginBottom: 10 }}>{error}</Text>
          )}

          {manualUrl ? (
            <View style={{ gap: 8 }}>
              <View style={{
                backgroundColor: C.ac2, borderRadius: 12,
                borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)', padding: 12,
              }}>
                <Text style={{ fontSize: 12, fontWeight: '700', color: AC, marginBottom: 4 }}>✓ Manual generado</Text>
                <Text style={{ fontSize: 10, color: T2 }}>{manualUrl}</Text>
              </View>
              <TouchableOpacity
                onPress={() => Linking.openURL(manualUrl)}
                style={{
                  backgroundColor: AC, borderRadius: 12,
                  padding: 14, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Abrir manual ↗</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setManualUrl(null)}
                style={{
                  padding: 12, borderRadius: 12,
                  borderWidth: 0.5, borderColor: BR, alignItems: 'center',
                }}
              >
                <Text style={{ color: T2, fontSize: 12 }}>Regenerar</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              onPress={generateManual}
              disabled={loading}
              style={{
                backgroundColor: AC, borderRadius: 12,
                padding: 15, alignItems: 'center',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? (
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
                  <ActivityIndicator color="#000" size="small" />
                  <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Generando...</Text>
                </View>
              ) : (
                <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>
                  Generar manual ↗
                </Text>
              )}
            </TouchableOpacity>
          )}

          {!room && (
            <View style={{
              marginTop: 10, backgroundColor: C.am2, borderRadius: 10,
              borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)', padding: 11,
            }}>
              <Text style={{ fontSize: 11, color: AM }}>
                ⚠ Completá el Room Scan primero para generar el manual completo.
              </Text>
            </View>
          )}
        </View>
      )}

      {/* ── TROUBLESHOOT TAB ── */}
      {tab === 'troubleshoot' && (
        <View style={{ paddingHorizontal: 14 }}>
          <View style={{
            backgroundColor: C.rd2, borderRadius: 10,
            borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)', padding: 12, marginBottom: 14,
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: RD }}>🔴 Crítico</Text>
            <Text style={{ fontSize: 11, color: T2, marginTop: 3 }}>= resolver antes de continuar el culto</Text>
          </View>
          {TS.map((item, i) => <TSItem key={i} item={item} />)}
        </View>
      )}
    </ScrollView>
  )
}
