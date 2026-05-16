import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg'
import { useAppStore, type SystemPreset } from '@/store/app'
import { GEAR_DB } from '@/constants/gear-database'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am, RD = C.rd, BL = C.bl

// ── EQ Bands derivadas del preset Y del gear ─────────
interface EQBand { hz: number; db: number; tipo: 'peak' | 'hpf' | 'lpf' | 'shelf'; q?: number }

function getEQTops(preset: SystemPreset, topSpl: number): EQBand[] {
  // Si el TOP tiene mucho SPL (>134dB) probablemente sea un line array → reducir altos
  const isHighSpl  = topSpl >= 134
  const isCorta    = preset.escenario === 'pared_corta'
  return [
    { hz: preset.crossoverHz,  db: 0,                            tipo: 'hpf'   },
    { hz: 180,                 db: -1.5,                          tipo: 'peak', q: 1.4 },
    { hz: 300,                 db: isCorta ? -2.5 : -2,           tipo: 'peak', q: 1.2 },
    { hz: 800,                 db: 0,                             tipo: 'peak', q: 1.0 },
    { hz: 2500,                db: 1,                             tipo: 'peak', q: 1.5 },
    { hz: 5000,                db: isHighSpl ? -0.5 : 0,          tipo: 'peak', q: 1.0 },
    { hz: 8000,                db: preset.highShelfDb,            tipo: 'shelf' },
  ]
}

function getEQSubs(preset: SystemPreset, subSpl: number): EQBand[] {
  // SUBs con más SPL (>137dB) tienden a tener más energía en 55-70Hz → bajar
  const isHeavy = subSpl >= 137
  return [
    { hz: 35,  db: 0,                                    tipo: 'hpf'  },
    { hz: 55,  db: preset.vidrios ? 1.5 : isHeavy ? 1 : 2, tipo: 'peak', q: 1.4 },
    { hz: 80,  db: preset.vidrios ? -1.5 : -1,           tipo: 'peak', q: 1.8 },
    { hz: 100, db: -2,                                   tipo: 'peak', q: 2.0 },
    { hz: preset.crossoverHz, db: 0,                     tipo: 'lpf'  },
  ]
}

// ── EQ Chart SVG ─────────────────────────────────────
function EQChart({ bands, label, tagName }: { bands: EQBand[]; label: string; tagName: string }) {
  const W = 320, H = 120, padL = 26, padR = 10, padT = 14, padB = 24
  const iW = W - padL - padR, iH = H - padT - padB
  const midY = padT + iH / 2
  const maxDb = 4
  const dbToY = (db: number) => midY - (db * (iH / 2)) / maxDb
  const logToX = (hz: number) => {
    const lMin = Math.log10(20), lMax = Math.log10(20000)
    return padL + ((Math.log10(Math.max(hz, 20)) - lMin) / (lMax - lMin)) * iW
  }

  const freqVals   = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
  const freqLabels = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k']

  // Curve
  const pts: [number, number][] = []
  for (let hz = 20; hz <= 20000; hz *= 1.06) {
    let db = 0
    bands.forEach((b) => {
      if (b.tipo === 'peak' && b.db !== 0) {
        const q = b.q ?? 1.4
        const diff = Math.abs(Math.log2(hz / b.hz))
        db += b.db * Math.exp(-diff * diff * q * 2)
      }
    })
    pts.push([logToX(hz), dbToY(db)])
  }
  let curve = `M ${pts[0]?.[0] ?? padL} ${pts[0]?.[1] ?? midY}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1]!
    const [x1, y1] = pts[i]!
    const cx = (x0 + x1) / 2
    curve += ` C ${cx} ${y0} ${cx} ${y1} ${x1} ${y1}`
  }
  const fill = `${curve} L ${pts[pts.length - 1]?.[0] ?? W} ${midY} L ${pts[0]?.[0] ?? padL} ${midY} Z`

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 7 }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
        <View style={{ paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)' }}>
          <Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>{tagName}</Text>
        </View>
      </View>
      {/* Band chips */}
      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 7 }}>
        {bands.map((b, i) => {
          const isHPF = b.tipo === 'hpf' || b.tipo === 'lpf'
          const fc = isHPF ? BL : b.db > 0 ? AC : b.db < 0 ? RD : T3
          const bg = isHPF ? C.bl2 : b.db > 0 ? C.ac2 : b.db < 0 ? C.rd2 : C.glass
          const lbl = isHPF
            ? `${b.tipo.toUpperCase()} ${b.hz}Hz`
            : b.db === 0
              ? `${b.hz >= 1000 ? b.hz / 1000 + 'k' : b.hz}Hz`
              : `${b.hz >= 1000 ? b.hz / 1000 + 'k' : b.hz}Hz ${b.db > 0 ? '+' : ''}${b.db}dB`
          return (
            <View key={i} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, backgroundColor: bg, borderWidth: 0.5, borderColor: `${fc}40` }}>
              <Text style={{ fontSize: 8, fontWeight: '700', color: fc }}>{lbl}</Text>
            </View>
          )
        })}
      </View>
      <View style={{ backgroundColor: '#080810', borderRadius: 10, borderWidth: 0.5, borderColor: BR, overflow: 'hidden' }}>
        <Svg width={W} height={H}>
          {[-3, -1.5, 0, 1.5, 3].map((db) => (
            <Line key={db} x1={padL} y1={dbToY(db)} x2={W - padR} y2={dbToY(db)}
              stroke={db === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={db === 0 ? 0.8 : 0.4} />
          ))}
          {freqVals.map((f, i) => (
            <React.Fragment key={f}>
              <Line x1={logToX(f)} y1={padT} x2={logToX(f)} y2={padT + iH} stroke="rgba(255,255,255,0.03)" strokeWidth={0.4} />
              <SvgText x={logToX(f)} y={H - 3} textAnchor="middle" fill={T3} fontSize={6.5} fontFamily="Inter">{freqLabels[i]}</SvgText>
            </React.Fragment>
          ))}
          {[-3, 0, 3].map((db) => (
            <SvgText key={db} x={padL - 2} y={dbToY(db) + 3} textAnchor="end" fill={T3} fontSize={7} fontFamily="Inter">{db > 0 ? '+' : ''}{db}</SvgText>
          ))}
          <Path d={fill} fill="rgba(26,255,110,0.04)" />
          <Path d={curve} fill="none" stroke="rgba(26,255,110,0.55)" strokeWidth={1.5} />
          {bands.map((b, i) => {
            if (b.db === 0 && b.tipo === 'peak') return null
            const x = logToX(b.hz), y = dbToY(b.db)
            const isHPF = b.tipo === 'hpf' || b.tipo === 'lpf'
            const fc = isHPF ? BL : b.db > 0 ? AC : RD
            return (
              <React.Fragment key={i}>
                <Line x1={x} y1={midY} x2={x} y2={y} stroke={fc} strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
                <Circle cx={x} cy={y} r={3.5} fill={fc} opacity={0.9} />
              </React.Fragment>
            )
          })}
        </Svg>
      </View>
    </View>
  )
}

// ── Steps ────────────────────────────────────────────
function StepList({ steps, color = AC }: { steps: string[]; color?: string }) {
  return (
    <View>
      {steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: BR }}>
          <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: color, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#000' }}>{i + 1}</Text>
          </View>
          <Text style={{ fontSize: 12, color: T2, flex: 1, lineHeight: 18 }}>{s}</Text>
        </View>
      ))}
    </View>
  )
}

const BACKUP = [
  'Bajar master del mixer a −∞',
  'Apagar TOPs activos (RCF/QSC)',
  'Conectar OUT A/B del DCX → Gemini P-800',
  'Gemini CH1 → PV215 IZQ · CH2 → PV215 DER',
  'Modo STEREO en el Gemini',
  'Cargar preset BACKUP en DCX2496',
  'Encender Gemini — ganancia 75–80%',
  'Subir master lentamente',
]
const ARRANQUE = [
  'Master del mixer a −∞',
  'Encender mixer',
  'Verificar Phantom 48V activo (CH6)',
  'Encender DCX2496 → cargar preset correcto',
  'Verificar panel trasero RCF: FLAT + sensibilidad máxima',
  'Encender TOPs activos IZQ y DER',
  'Encender SUBs IZQ y DER',
  'Subir master lentamente — prueba de sonido',
  'Confirmar click solo en in-ears',
]

type Tab = 'presets' | 'eq' | 'backup' | 'arranque'

export default function ConfigScreen() {
  const { allPresets, activePreset, setActivePreset, gear } = useAppStore()
  const [tab, setTab] = useState<Tab>('presets')

  // ── Leer TOP y SUB REALES del store ──────────────────
  const topItem = GEAR_DB.find((g) => g.id === gear.top)
  const subItem = GEAR_DB.find((g) => g.id === gear.sub)
  const topName = topItem?.name ?? 'TOP'
  const subName = subItem?.name ?? 'SUB'
  // SPL de los equipos seleccionados para ajustar el EQ
  const topSpl  = topItem ? parseInt(topItem.specs.match(/(\d{3})dB/)?.[1] ?? '131') : 131
  const subSpl  = subItem ? parseInt(subItem.specs.match(/(\d{3})dB/)?.[1] ?? '133') : 133

  const TABS: { key: Tab; label: string }[] = [
    { key: 'presets',  label: 'Presets'   },
    { key: 'eq',       label: 'EQ'        },
    { key: 'backup',   label: 'Backup'    },
    { key: 'arranque', label: 'Arranque'  },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 4 }}>Config Engine</Text>
        {activePreset && (
          <Text style={{ fontSize: 10, color: AC, fontWeight: '700', marginBottom: 4, letterSpacing: 0.5 }}>● {activePreset.nombre}</Text>
        )}
        {/* Equipos activos - se actualiza con el gear */}
        <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          {topItem && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>🔊 {topName}</Text>
            </View>
          )}
          {subItem && (
            <View style={{ paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: C.am2, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)' }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: AM }}>🔉 {subName}</Text>
            </View>
          )}
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: tab === t.key ? 1 : 0.5, borderColor: tab === t.key ? AC : BR, backgroundColor: tab === t.key ? C.ac2 : 'transparent' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: tab === t.key ? AC : T2 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ paddingHorizontal: 14 }}>

        {/* ── PRESETS ── */}
        {tab === 'presets' && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {allPresets.map((p) => {
              const isActive  = activePreset?.id === p.id
              const isBackup  = p.nombre.includes('BACKUP')
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setActivePreset(p)}
                  style={{ width: '47%', backgroundColor: isActive ? C.ac2 : C.glass, borderRadius: 14, borderWidth: isActive ? 1 : 0.5, borderColor: isActive ? 'rgba(26,255,110,0.4)' : BR, padding: 13, opacity: isBackup ? 0.72 : 1 }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 7, fontWeight: '700', color: T3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{isBackup ? 'Backup' : 'Preset'}</Text>
                  <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? AC : TX, marginBottom: 9 }}>{p.nombre}</Text>
                  {[
                    { k: 'Crossover', v: `${p.crossoverHz} Hz LR24` },
                    { k: 'TOPs',      v: `${p.nivelTopsDb >= 0 ? '+' : ''}${p.nivelTopsDb} dB` },
                    { k: 'SUBs',      v: `${p.nivelSubsDb} dB` },
                    { k: 'Vidrios',   v: p.vidrios ? 'Sí' : 'No' },
                  ].map(({ k, v }) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: isActive ? 'rgba(26,255,110,0.12)' : BR }}>
                      <Text style={{ fontSize: 10, color: T3 }}>{k}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: isActive ? AC : T2 }}>{v}</Text>
                    </View>
                  ))}
                  {p.vidrios && (
                    <View style={{ marginTop: 6, backgroundColor: C.rd2, borderRadius: 8, paddingHorizontal: 5, paddingVertical: 2, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)' }}>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: RD }}>Vidrios</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* ── EQ — se actualiza con gear ── */}
        {tab === 'eq' && (
          activePreset ? (
            <View>
              {/* EQ TOPs — nombre real del equipo seleccionado */}
              <EQChart
                bands={getEQTops(activePreset, topSpl)}
                label="EQ Paramétrico — TOPs"
                tagName={topName}
              />
              {/* EQ SUBs — nombre real del sub seleccionado */}
              <EQChart
                bands={getEQSubs(activePreset, subSpl)}
                label="EQ Paramétrico — SUBs"
                tagName={subName}
              />
              {/* Parámetros DCX */}
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
                {[
                  { k: 'Crossover',  v: `${activePreset.crossoverHz} Hz`, c: AC },
                  { k: 'TOPs',       v: `${activePreset.nivelTopsDb >= 0 ? '+' : ''}${activePreset.nivelTopsDb} dB`, c: AC },
                  { k: 'SUBs',       v: `${activePreset.nivelSubsDb} dB`, c: AM },
                  { k: 'Limitador',  v: '+18 dBu', c: RD },
                  { k: 'Delay SUBs', v: '~1.5ms', c: BL },
                  { k: 'Tipo filtro',v: 'LR 24dB/oct', c: T2 },
                ].map(({ k, v, c }) => (
                  <View key={k} style={{ width: '47%', backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, padding: 11 }}>
                    <Text style={{ fontSize: 9, color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>{k}</Text>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: c }}>{v}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : (
            <Text style={{ fontSize: 12, color: T2, marginTop: 12 }}>Seleccioná un preset primero.</Text>
          )
        )}

        {/* ── BACKUP ── */}
        {tab === 'backup' && (
          <View>
            <View style={{ backgroundColor: C.am2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)', padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: AM }}>⚠ Protocolo de emergencia</Text>
              <Text style={{ fontSize: 11, color: T2, marginTop: 4, lineHeight: 16 }}>Cuando fallen los TOPs activos. PV215 pasivas con Gemini P-800.</Text>
            </View>
            <StepList steps={BACKUP} color={AM} />
          </View>
        )}

        {/* ── ARRANQUE ── */}
        {tab === 'arranque' && (
          <View>
            <View style={{ backgroundColor: C.ac2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)', padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: AC }}>Orden obligatorio — nunca saltear pasos</Text>
            </View>
            <StepList steps={ARRANQUE} />
          </View>
        )}
      </View>
    </ScrollView>
  )
}
