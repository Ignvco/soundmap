import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Svg, { Line, Path, Rect, Text as SvgText, Circle } from 'react-native-svg'
import { useAppStore, type SystemPreset } from '@/store/app'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, SF = C.bg2, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am, RD = C.rd, BL = C.bl

// ── EQ Paramétrico SVG ────────────────────────────────
interface EQBand { hz: number; db: number; tipo: 'peak' | 'hpf' | 'lpf' | 'shelf' }

function getEQTops(preset: SystemPreset): EQBand[] {
  const isCorta = preset.escenario === 'pared_corta'
  return [
    { hz: 80,    db: 0,                      tipo: 'hpf'   },
    { hz: 180,   db: -1.5,                   tipo: 'peak'  },
    { hz: 300,   db: isCorta ? -2.5 : -2,    tipo: 'peak'  },
    { hz: 800,   db: 0,                       tipo: 'peak'  },
    { hz: 2500,  db: 1,                       tipo: 'peak'  },
    { hz: 5000,  db: 0,                       tipo: 'peak'  },
    { hz: 8000,  db: preset.highShelfDb,      tipo: 'shelf' },
  ]
}
function getEQSubs(preset: SystemPreset): EQBand[] {
  return [
    { hz: 35,  db: 0,                            tipo: 'hpf'  },
    { hz: 55,  db: preset.vidrios ? 1.5 : 2,     tipo: 'peak' },
    { hz: 80,  db: preset.vidrios ? -1 : 0,      tipo: 'peak' },
    { hz: 100, db: -2,                            tipo: 'peak' },
    { hz: 100, db: 0,                             tipo: 'lpf'  },
  ]
}

function EQChart({ bands, label }: { bands: EQBand[]; label: string }) {
  const W = 320, H = 120, padL = 26, padR = 10, padT = 14, padB = 26
  const iW = W - padL - padR, iH = H - padT - padB
  const midY = padT + iH / 2
  const maxDb = 4
  const dbToY = (db: number) => midY - (db * (iH / 2)) / maxDb
  const logToX = (hz: number) => {
    const logMin = Math.log10(20), logMax = Math.log10(20000)
    return padL + ((Math.log10(hz) - logMin) / (logMax - logMin)) * iW
  }

  // Build smooth curve
  const pts: [number, number][] = []
  for (let hz = 20; hz <= 20000; hz *= 1.06) {
    let db = 0
    bands.forEach((b) => {
      if (b.tipo === 'peak' && b.db !== 0) {
        const q = 1.4
        const diff = Math.abs(Math.log2(hz / b.hz))
        db += b.db * Math.exp(-diff * diff * q * 2)
      }
    })
    pts.push([logToX(hz), dbToY(db)])
  }
  let pathD = `M ${pts[0]?.[0] ?? 0} ${pts[0]?.[1] ?? midY}`
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1] ?? [0, midY]
    const [x1, y1] = pts[i] ?? [0, midY]
    const cpx = (x0 + x1) / 2
    pathD += ` C ${cpx} ${y0} ${cpx} ${y1} ${x1} ${y1}`
  }
  const fillPath = `${pathD} L ${pts[pts.length - 1]?.[0] ?? W} ${midY} L ${pts[0]?.[0] ?? 0} ${midY} Z`

  const freqVals = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
  const freqLabels = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k']

  return (
    <View style={{ marginBottom: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1, textTransform: 'uppercase' }}>{label}</Text>
        <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
          {bands.filter((b) => b.db !== 0 || b.tipo !== 'peak').map((b, i) => {
            const isHPF = b.tipo === 'hpf' || b.tipo === 'lpf'
            const color = isHPF ? BL : b.db > 0 ? AC : RD
            const bg = isHPF ? C.bl2 : b.db > 0 ? C.ac2 : C.rd2
            const label_ = isHPF ? b.tipo.toUpperCase() : `${b.hz >= 1000 ? (b.hz / 1000) + 'k' : b.hz}Hz ${b.db > 0 ? '+' : ''}${b.db}dB`
            return (
              <View key={i} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, backgroundColor: bg, borderWidth: 0.5, borderColor: `${color}40` }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color }}>{label_}</Text>
              </View>
            )
          })}
        </View>
      </View>
      <View style={{ backgroundColor: '#080810', borderRadius: 10, borderWidth: 0.5, borderColor: BR, overflow: 'hidden' }}>
        <Svg width={W} height={H}>
          {/* Grid */}
          {[-3, -1.5, 0, 1.5, 3].map((db) => {
            const y = dbToY(db)
            return (
              <Line key={db} x1={padL} y1={y} x2={W - padR} y2={y}
                stroke={db === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
                strokeWidth={db === 0 ? 0.8 : 0.4}
              />
            )
          })}
          {/* Freq labels */}
          {freqVals.map((f, i) => {
            const x = logToX(f)
            return (
              <React.Fragment key={f}>
                <Line x1={x} y1={padT} x2={x} y2={padT + iH} stroke="rgba(255,255,255,0.03)" strokeWidth={0.4} />
                <SvgText x={x} y={H - 4} textAnchor="middle" fill={T3} fontSize={6.5} fontFamily="Inter">{freqLabels[i]}</SvgText>
              </React.Fragment>
            )
          })}
          {/* dB labels */}
          {[-3, 0, 3].map((db) => (
            <SvgText key={db} x={padL - 2} y={dbToY(db) + 3} textAnchor="end" fill={T3} fontSize={7} fontFamily="Inter">
              {db > 0 ? '+' : ''}{db}
            </SvgText>
          ))}
          {/* Curve */}
          <Path d={fillPath} fill="rgba(26,255,110,0.04)" />
          <Path d={pathD} fill="none" stroke="rgba(26,255,110,0.55)" strokeWidth={1.5} />
          {/* Band markers */}
          {bands.map((b, i) => {
            if (b.db === 0 && b.tipo === 'peak') return null
            const x = logToX(b.hz)
            const y = dbToY(b.db)
            const isHPF = b.tipo === 'hpf' || b.tipo === 'lpf'
            const color = isHPF ? BL : b.db > 0 ? AC : RD
            return (
              <React.Fragment key={i}>
                <Line x1={x} y1={midY} x2={x} y2={y} stroke={color} strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
                <Circle cx={x} cy={y} r={3.5} fill={color} opacity={0.9} />
              </React.Fragment>
            )
          })}
        </Svg>
      </View>
    </View>
  )
}

// ── Pasos (Backup / Arranque) ─────────────────────────
function StepList({ steps, accentColor = AC }: { steps: string[]; accentColor?: string }) {
  return (
    <View>
      {steps.map((s, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: BR }}>
          <View style={{
            width: 20, height: 20, borderRadius: 10,
            backgroundColor: accentColor, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <Text style={{ fontSize: 9, fontWeight: '800', color: '#000' }}>{i + 1}</Text>
          </View>
          <Text style={{ fontSize: 12, color: T2, flex: 1, lineHeight: 18 }}>{s}</Text>
        </View>
      ))}
    </View>
  )
}

const BACKUP_STEPS = [
  'Bajar master del mixer a cero',
  'Apagar los TOPs activos (RCF/QSC)',
  'Conectar OUT A/B del DCX → Gemini P-800',
  'Gemini CH1 → PV215 IZQ · CH2 → PV215 DER',
  'Verificar panel trasero Gemini: modo STEREO',
  'Cargar preset BACKUP en DCX2496',
  'Encender Gemini P-800 — ganancia 75–80%',
  'Subir master lentamente',
]
const ARRANQUE_STEPS = [
  'Master del mixer a −∞ (cero)',
  'Encender mixer',
  'Verificar Phantom 48V activo (CH6)',
  'Encender DCX2496 → cargar preset correcto',
  'Verificar panel trasero RCF: FLAT + sensibilidad máxima',
  'Encender TOPs activos IZQ y DER',
  'Encender SUBs IZQ y DER',
  'Subir master lentamente — prueba de sonido',
  'Confirmar click en in-ears de músicos',
]

type Tab = 'presets' | 'eq' | 'backup' | 'arranque'

export default function ConfigScreen() {
  const { allPresets, activePreset, setActivePreset, gear } = useAppStore()
  const [tab, setTab] = useState<Tab>('presets')

  const topItem = gear ? GEAR_DB_MINI.find((g) => g.id === gear.top) : null
  const topName = topItem?.name ?? 'TOP'

  const TABS: { key: Tab; label: string }[] = [
    { key: 'presets',  label: 'Presets'   },
    { key: 'eq',       label: 'EQ'        },
    { key: 'backup',   label: 'Backup'    },
    { key: 'arranque', label: 'Arranque'  },
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 4 }}>Config Engine</Text>
        {activePreset && (
          <Text style={{ fontSize: 10, color: AC, fontWeight: '700', marginBottom: 16, letterSpacing: 0.5 }}>
            ● {activePreset.nombre}
          </Text>
        )}

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
          {TABS.map((t) => (
            <TouchableOpacity
              key={t.key}
              onPress={() => setTab(t.key)}
              style={{
                paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20,
                borderWidth: tab === t.key ? 1 : 0.5,
                borderColor: tab === t.key ? AC : BR,
                backgroundColor: tab === t.key ? C.ac2 : 'transparent',
              }}
            >
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
              const active = activePreset?.id === p.id
              const isBackup = p.nombre.includes('BACKUP')
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setActivePreset(p)}
                  style={{
                    width: '47%',
                    backgroundColor: active ? C.ac2 : C.glass,
                    borderRadius: 14,
                    borderWidth: active ? 1 : 0.5,
                    borderColor: active ? 'rgba(26,255,110,0.4)' : BR,
                    padding: 14,
                    opacity: isBackup ? 0.7 : 1,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 5 }}>
                    {isBackup ? 'Backup' : 'Preset'}
                  </Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: active ? AC : TX, marginBottom: 10 }}>{p.nombre}</Text>
                  {[
                    { k: 'X-over', v: `${p.crossoverHz} Hz LR24` },
                    { k: 'TOPs',   v: `${p.nivelTopsDb >= 0 ? '+' : ''}${p.nivelTopsDb} dB` },
                    { k: 'SUBs',   v: `${p.nivelSubsDb} dB` },
                    { k: 'Vidrios',v: p.vidrios ? 'Sí' : 'No' },
                  ].map(({ k, v }) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3, borderBottomWidth: 0.5, borderBottomColor: active ? 'rgba(26,255,110,0.12)' : BR }}>
                      <Text style={{ fontSize: 10, color: T3 }}>{k}</Text>
                      <Text style={{ fontSize: 10, fontWeight: '600', color: active ? AC : T2 }}>{v}</Text>
                    </View>
                  ))}
                  {p.vidrios && (
                    <View style={{ marginTop: 6, backgroundColor: C.rd2, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2, alignSelf: 'flex-start', borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)' }}>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: RD }}>Vidrios</Text>
                    </View>
                  )}
                </TouchableOpacity>
              )
            })}
          </View>
        )}

        {/* ── EQ ── */}
        {tab === 'eq' && activePreset && (
          <View>
            <EQChart bands={getEQTops(activePreset)} label={`EQ TOPs — ${topName}`} />
            <EQChart bands={getEQSubs(activePreset)} label="EQ SUBs" />
            {/* Parámetros DCX */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 4 }}>
              {[
                { k: 'Crossover',  v: `${activePreset.crossoverHz} Hz`, color: AC },
                { k: 'TOPs',       v: `${activePreset.nivelTopsDb >= 0 ? '+' : ''}${activePreset.nivelTopsDb} dB`, color: AC },
                { k: 'SUBs',       v: `${activePreset.nivelSubsDb} dB`, color: AM },
                { k: 'Limitador',  v: '+18 dBu', color: RD },
              ].map(({ k, v, color }) => (
                <View key={k} style={{ width: '47%', backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, padding: 12 }}>
                  <Text style={{ fontSize: 9, color: T3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{k}</Text>
                  <Text style={{ fontSize: 16, fontWeight: '700', color }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
        {tab === 'eq' && !activePreset && (
          <Text style={{ fontSize: 12, color: T2, marginTop: 12 }}>Seleccioná un preset primero.</Text>
        )}

        {/* ── BACKUP ── */}
        {tab === 'backup' && (
          <View>
            <View style={{ backgroundColor: C.am2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)', padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: AM }}>⚠ Protocolo de emergencia</Text>
              <Text style={{ fontSize: 11, color: T2, marginTop: 4, lineHeight: 16 }}>
                Usar cuando fallen los TOPs activos. Las PV215 pasivas van con el Gemini P-800.
              </Text>
            </View>
            <StepList steps={BACKUP_STEPS} accentColor={AM} />
          </View>
        )}

        {/* ── ARRANQUE ── */}
        {tab === 'arranque' && (
          <View>
            <View style={{ backgroundColor: C.ac2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)', padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: AC }}>Orden obligatorio — nunca saltear pasos</Text>
            </View>
            <StepList steps={ARRANQUE_STEPS} />
          </View>
        )}
      </View>
    </ScrollView>
  )
}

// Mini lookup para evitar import circular
const GEAR_DB_MINI = [
  { id: 'rcf912', name: 'RCF 912-A' }, { id: 'rcf910', name: 'RCF 910-A' },
  { id: 'rcf935', name: 'RCF 935-A' }, { id: 'qsck12', name: 'QSC K12.2' },
  { id: 'jbl715', name: 'JBL EON715'}, { id: 'pv215',  name: 'PV215'     },
  { id: 'yamdxr12', name: 'DXR12 mkII' }, { id: 'evekx15', name: 'EKX-15P' },
]
