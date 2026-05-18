import React, { useCallback, useMemo, useState } from 'react'
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Svg, { Circle, Line, Path, Text as SvgText } from 'react-native-svg'
import { useAppStore, type DSPConfig, type DSPOutput, type SystemPreset } from '@/store/app'
import { GEAR_DB } from '@/constants/gear-database'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am, RD = C.rd, BL = C.bl

interface EQBand { hz: number; db: number; tipo: 'peak'|'hpf'|'lpf'|'shelf_high'|'shelf_low'; q?: number }

const DEFAULT_TOP_BANDS: EQBand[] = [
  { hz: 80,   db: 0,    tipo: 'hpf' },
  { hz: 180,  db: -1.5, tipo: 'peak', q: 1.4 },
  { hz: 300,  db: -2,   tipo: 'peak', q: 1.2 },
  { hz: 2500, db: 1,    tipo: 'peak', q: 1.5 },
  { hz: 8000, db: -1,   tipo: 'shelf_high' },
]
const DEFAULT_SUB_BANDS: EQBand[] = [
  { hz: 35,  db: 0,    tipo: 'hpf' },
  { hz: 55,  db: 2,    tipo: 'peak', q: 1.4 },
  { hz: 80,  db: -1.5, tipo: 'peak', q: 1.8 },
  { hz: 100, db: -2,   tipo: 'peak', q: 2.0 },
  { hz: 80,  db: 0,    tipo: 'lpf' },
]

function EQChart({ bands, label, tagName }: { bands: EQBand[]; label: string; tagName?: string }) {
  const safeBands = bands.length > 0 ? bands : DEFAULT_TOP_BANDS
  const W = 300, H = 100, padL = 24, padR = 8, padT = 10, padB = 22
  const iW = W - padL - padR, iH = H - padT - padB
  const midY = padT + iH / 2, maxDb = 4
  const dbToY  = (db: number) => midY - (db * (iH / 2)) / maxDb
  const logToX = (hz: number) => {
    const lMin = Math.log10(20), lMax = Math.log10(20000)
    return padL + ((Math.log10(Math.max(hz, 20)) - lMin) / (lMax - lMin)) * iW
  }
  const freqVals   = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000]
  const freqLabels = ['20', '50', '100', '200', '500', '1k', '2k', '5k', '10k', '20k']
  const pts: [number, number][] = []
  for (let hz = 20; hz <= 20000; hz *= 1.06) {
    let db = 0
    safeBands.forEach((b) => {
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
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
        <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase' }}>{label}</Text>
        {tagName && (
          <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)' }}>
            <Text style={{ fontSize: 8, fontWeight: '700', color: AC }}>{tagName}</Text>
          </View>
        )}
      </View>
      <View style={{ flexDirection: 'row', gap: 4, flexWrap: 'wrap', marginBottom: 6 }}>
        {safeBands.map((b, i) => {
          const isHP = b.tipo === 'hpf' || b.tipo === 'lpf'
          const fc = isHP ? BL : b.db > 0 ? AC : b.db < 0 ? RD : T3
          const bg = isHP ? C.bl2 : b.db > 0 ? C.ac2 : b.db < 0 ? C.rd2 : C.glass
          const lbl = isHP
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
      <View style={{ backgroundColor: '#080810', borderRadius: 8, borderWidth: 0.5, borderColor: BR, overflow: 'hidden' }}>
        <Svg width={W} height={H}>
          {[-3, 0, 3].map((db) => (
            <Line key={db} x1={padL} y1={dbToY(db)} x2={W - padR} y2={dbToY(db)}
              stroke={db === 0 ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)'}
              strokeWidth={db === 0 ? 0.8 : 0.4} />
          ))}
          {freqVals.map((f, i) => (
            <React.Fragment key={f}>
              <Line x1={logToX(f)} y1={padT} x2={logToX(f)} y2={padT + iH} stroke="rgba(255,255,255,0.03)" strokeWidth={0.4} />
              <SvgText x={logToX(f)} y={H - 3} textAnchor="middle" fill={T3} fontSize={6} fontFamily="Inter">{freqLabels[i]}</SvgText>
            </React.Fragment>
          ))}
          <Path d={fill} fill="rgba(26,255,110,0.04)" />
          <Path d={curve} fill="none" stroke="rgba(26,255,110,0.55)" strokeWidth={1.5} />
          {safeBands.map((b, i) => {
            if (b.db === 0 && b.tipo === 'peak') return null
            const x = logToX(b.hz), y = dbToY(b.db)
            const isHP = b.tipo === 'hpf' || b.tipo === 'lpf'
            const fc = isHP ? BL : b.db > 0 ? AC : RD
            return (
              <React.Fragment key={i}>
                <Line x1={x} y1={midY} x2={x} y2={y} stroke={fc} strokeWidth={0.8} strokeDasharray="2 2" opacity={0.5} />
                <Circle cx={x} cy={y} r={3} fill={fc} opacity={0.9} />
              </React.Fragment>
            )
          })}
        </Svg>
      </View>
    </View>
  )
}

function usePresetEQ(preset: SystemPreset | null, topSpl: number, subSpl: number) {
  return useMemo(() => {
    if (!preset) return { topBands: DEFAULT_TOP_BANDS, subBands: DEFAULT_SUB_BANDS }
    const isCorta = preset.escenario === 'pared_corta'
    const topBands: EQBand[] = [
      { hz: preset.crossoverHz, db: 0, tipo: 'hpf' },
      { hz: 180,  db: -1.5, tipo: 'peak', q: 1.4 },
      { hz: 300,  db: isCorta ? -2.5 : -2, tipo: 'peak', q: 1.2 },
      { hz: 2500, db: 1, tipo: 'peak', q: 1.5 },
      { hz: 8000, db: preset.highShelfDb, tipo: 'shelf_high' },
    ]
    const subBands: EQBand[] = [
      { hz: 35, db: 0, tipo: 'hpf' },
      { hz: 55, db: preset.vidrios ? 1.5 : 2, tipo: 'peak', q: 1.4 },
      { hz: 80, db: preset.vidrios ? -1.5 : -1, tipo: 'peak', q: 1.8 },
      { hz: 100, db: -2, tipo: 'peak', q: 2.0 },
      { hz: preset.crossoverHz, db: 0, tipo: 'lpf' },
    ]
    return { topBands, subBands }
  }, [preset?.id, topSpl, subSpl])
}

function OutputPanel({ out, dspId }: { out: DSPOutput; dspId: string }) {
  const [open, setOpen] = useState(false)
  const updateDSP = useAppStore((s) => s.updateDSP)
  const gear      = useAppStore((s) => s.gear)
  const isSub = out.label.toLowerCase().includes('sub')
  const color = isSub ? AM : AC
  const bands: EQBand[] = [
    ...(out.hpfHz > 20 ? [{ hz: out.hpfHz, db: 0, tipo: 'hpf' as const }] : []),
    ...out.eqBands.map((b) => ({ hz: b.hz, db: b.db, q: b.q, tipo: b.tipo })),
    ...(out.lpfHz < 20000 ? [{ hz: out.lpfHz, db: 0, tipo: 'lpf' as const }] : []),
  ]
  const displayBands = bands.length > 0 ? bands : (isSub ? DEFAULT_SUB_BANDS : DEFAULT_TOP_BANDS)
  return (
    <View style={{ backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, borderLeftWidth: 3, borderLeftColor: color, overflow: 'hidden', marginBottom: 8 }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }} activeOpacity={0.8}>
        <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: `${color}15` }}>
          <Text style={{ fontSize: 10, fontWeight: '700', color }}>{out.id}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color: TX }}>{out.label}</Text>
          <Text style={{ fontSize: 10, color: T2 }}>{out.destino}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ fontSize: 10, color: T2 }}>{out.gainDb >= 0 ? '+' : ''}{out.gainDb}dB · {out.delayMs}ms</Text>
          <Text style={{ fontSize: 9, color: T3 }}>{out.hpfHz}Hz – {out.lpfHz >= 20000 ? '20kHz' : out.lpfHz + 'Hz'}</Text>
        </View>
        <Text style={{ color: T3, fontSize: 11, marginLeft: 4, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>▾</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 13, borderTopWidth: 0.5, borderTopColor: BR }}>
          <EQChart bands={displayBands} label={`Salida ${out.id} — ${out.label}`} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 6 }}>
            {[
              { label: 'Gain (dB)', value: String(out.gainDb), key: 'gainDb' as const },
              { label: 'Delay ms', value: String(out.delayMs), key: 'delayMs' as const },
              { label: 'HPF Hz', value: String(out.hpfHz), key: 'hpfHz' as const },
              { label: 'LPF Hz', value: String(out.lpfHz), key: 'lpfHz' as const },
              { label: 'Límit', value: String(out.limiterDb), key: 'limiterDb' as const },
            ].map(({ label, value, key }) => (
              <View key={key} style={{ width: '30%' }}>
                <Text style={{ fontSize: 8, color: T3, marginBottom: 3 }}>{label}</Text>
                <TextInput
                  style={{ backgroundColor: C.glass2, borderWidth: 0.5, borderColor: BR, borderRadius: 8, padding: 8, color: TX, fontSize: 12 }}
                  value={value}
                  keyboardType="numeric"
                  onChangeText={(v) => {
                    const num = parseFloat(v) || 0
                    const dsp = gear.dsps.find((d) => d.dspId === dspId)
                    if (!dsp) return
                    updateDSP(dspId, { outputs: dsp.outputs.map((o) => o.id === out.id ? { ...o, [key]: num } : o) })
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      )}
    </View>
  )
}

function DSPCard({ dsp }: { dsp: DSPConfig }) {
  const [open, setOpen] = useState(false)
  const removeDSP = useAppStore((s) => s.removeDSP)
  const updateDSP = useAppStore((s) => s.updateDSP)
  const item = GEAR_DB.find((g) => g.id === dsp.dspId)
  const handleUpdate = useCallback((field: keyof DSPConfig, val: any) => {
    updateDSP(dsp.dspId, { [field]: val })
  }, [dsp.dspId, updateDSP])
  return (
    <View style={{ backgroundColor: C.glass, borderRadius: 16, borderWidth: 0.5, borderColor: BR, overflow: 'hidden', marginBottom: 10 }}>
      <TouchableOpacity onPress={() => setOpen(!open)} style={{ padding: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }} activeOpacity={0.8}>
        <Text style={{ fontSize: 18 }}>⚙️</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: TX }}>{dsp.nombre}</Text>
          <Text style={{ fontSize: 10, color: T2 }}>{item?.name ?? dsp.dspId} · {dsp.outputs.length} sal. · {dsp.crossoverHz}Hz</Text>
        </View>
        <TouchableOpacity onPress={() => removeDSP(dsp.dspId)} style={{ padding: 5, borderRadius: 7, backgroundColor: C.rd2 }}>
          <Text style={{ fontSize: 11, color: RD }}>✕</Text>
        </TouchableOpacity>
        <Text style={{ color: T3, fontSize: 11, transform: [{ rotate: open ? '180deg' : '0deg' }] }}>▾</Text>
      </TouchableOpacity>
      {open && (
        <View style={{ paddingHorizontal: 12, paddingBottom: 14, borderTopWidth: 0.5, borderTopColor: BR }}>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12, marginTop: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: T3, marginBottom: 3 }}>Crossover (Hz)</Text>
              <TextInput style={{ backgroundColor: C.glass2, borderWidth: 0.5, borderColor: BR, borderRadius: 8, padding: 9, color: TX, fontSize: 13 }} value={String(dsp.crossoverHz)} keyboardType="numeric" onChangeText={(v) => handleUpdate('crossoverHz', parseFloat(v) || 80)} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: T3, marginBottom: 3 }}>Tipo</Text>
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(['linkwitz_riley', 'butterworth', 'bessel'] as DSPConfig['tipo'][]).map((t) => (
                  <TouchableOpacity key={t} onPress={() => handleUpdate('tipo', t)} style={{ flex: 1, padding: 6, borderRadius: 7, borderWidth: 0.5, borderColor: dsp.tipo === t ? 'rgba(26,255,110,0.3)' : BR, backgroundColor: dsp.tipo === t ? C.ac2 : 'transparent', alignItems: 'center' }}>
                    <Text style={{ fontSize: 7, fontWeight: '700', color: dsp.tipo === t ? AC : T3 }}>{t === 'linkwitz_riley' ? 'LR' : t === 'butterworth' ? 'BW' : 'BSL'}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
          <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>Salidas</Text>
          {dsp.outputs.map((out) => <OutputPanel key={out.id} out={out} dspId={dsp.dspId} />)}
        </View>
      )}
    </View>
  )
}

function MonitoresEQ() {
  const gear = useAppStore((s) => s.gear)
  const mons = gear.monitores.map((id) => GEAR_DB.find((g) => g.id === id)).filter(Boolean) as typeof GEAR_DB
  if (mons.length === 0) {
    return (
      <View style={{ padding: 24, alignItems: 'center', backgroundColor: C.glass, borderRadius: 16, borderWidth: 0.5, borderColor: BR }}>
        <Text style={{ fontSize: 12, color: T2, textAlign: 'center' }}>Sin monitores. Ir a Gear Builder → Monitores.</Text>
      </View>
    )
  }
  const getMonBands = (spl: number): EQBand[] => {
    const s = spl < 122
    return [
      { hz: 100,  db: s ? -4 : -2, q: 1.2, tipo: 'peak' as const },
      { hz: 300,  db: -2, q: 1.4, tipo: 'peak' as const },
      { hz: 3000, db: 1, q: 1.5, tipo: 'peak' as const },
      { hz: 8000, db: s ? -2 : -1, q: 0, tipo: 'shelf_high' as const },
    ]
  }
  return (
    <View>
      <View style={{ backgroundColor: C.bl2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(96,165,250,0.2)', padding: 11, marginBottom: 14 }}>
        <Text style={{ fontSize: 11, fontWeight: '600', color: BL }}>EQ sugerida para monitores. Ajustar según posición en el escenario.</Text>
      </View>
      {mons.map((mon) => (
        <View key={mon.id} style={{ backgroundColor: C.glass, borderRadius: 14, borderWidth: 0.5, borderColor: BR, borderLeftWidth: 3, borderLeftColor: BL, padding: 13, marginBottom: 10 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Text style={{ fontSize: 16 }}>{mon.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 13, fontWeight: '700', color: TX }}>{mon.name}</Text>
              <Text style={{ fontSize: 10, color: T2 }}>{mon.specs}</Text>
            </View>
          </View>
          <EQChart bands={getMonBands(mon.spl ?? 120)} label="EQ sugerida" />
        </View>
      ))}
    </View>
  )
}

const BACKUP   = ['Bajar master −∞','Apagar TOPs activos','OUT A/B DCX → Gemini P-800','Gemini CH1→PV215 IZQ · CH2→PV215 DER','Modo STEREO en Gemini','Cargar preset BACKUP en DCX','Encender Gemini — ganancia 75%','Subir master']
const ARRANQUE = ['Master del mixer a −∞','Encender mixer','Phantom 48V activo (CH6)','DCX → cargar preset correcto','Panel trasero RCF: FLAT + sens. máxima','Encender TOPs IZQ y DER','Encender SUBs IZQ y DER','Subir master lentamente','Click solo en in-ears']

type Tab = 'presets' | 'dsps' | 'monitores' | 'backup' | 'arranque'

export default function ConfigScreen() {
  const allPresets      = useAppStore((s) => s.allPresets)
  const activePreset    = useAppStore((s) => s.activePreset)
  const setActivePreset = useAppStore((s) => s.setActivePreset)
  const gear            = useAppStore((s) => s.gear)
  const room            = useAppStore((s) => s.room)
  const generateDSPConfig = useAppStore((s) => s.generateDSPConfig)
  const [tab, setTab] = useState<Tab>('presets')
  const topItem = GEAR_DB.find((g) => g.id === (gear.tops[0] ?? gear.top))
  const subItem = GEAR_DB.find((g) => g.id === (gear.subs[0] ?? gear.sub))
  const topName = topItem?.name ?? 'TOP'
  const subName = subItem?.name ?? 'SUB'
  const { topBands, subBands } = usePresetEQ(activePreset, topItem?.spl ?? 131, subItem?.spl ?? 133)

  const TABS: { key: Tab; label: string }[] = [
    { key: 'presets',   label: 'Presets' },
    { key: 'dsps',      label: `DSP (${gear.dsps.length})` },
    { key: 'monitores', label: 'Monitores' },
    { key: 'backup',    label: 'Backup' },
    { key: 'arranque',  label: 'Arranque' },
  ]

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 100 }}>
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 14 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 4 }}>Config Engine</Text>
        <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 12 }}>
          {topItem && <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)' }}><Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>🔊 {topName}</Text></View>}
          {subItem && <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.am2, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)' }}><Text style={{ fontSize: 9, fontWeight: '700', color: AM }}>🔉 {subName}</Text></View>}
          {activePreset && <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.glass, borderWidth: 0.5, borderColor: BR }}><Text style={{ fontSize: 9, fontWeight: '600', color: T2 }}>● {activePreset.nombre}</Text></View>}
        </View>

        {/* EQ SIEMPRE VISIBLE — Fix Bug 2 */}
        <EQChart bands={topBands} label="EQ paramétrico — TOPs" tagName={topName} />
        <EQChart bands={subBands} label="EQ paramétrico — SUBs" tagName={subName} />
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
          {activePreset && [
            { k: 'Crossover', v: `${activePreset.crossoverHz} Hz`, c: AC },
            { k: 'TOPs', v: `${activePreset.nivelTopsDb >= 0 ? '+' : ''}${activePreset.nivelTopsDb} dB`, c: AC },
            { k: 'SUBs', v: `${activePreset.nivelSubsDb} dB`, c: AM },
            { k: 'Delay', v: `${activePreset.delaySubsMs} ms`, c: BL },
            { k: 'Limitador', v: '+18 dBu', c: RD },
            { k: 'Vidrios', v: activePreset.vidrios ? 'Sí' : 'No', c: T2 },
          ].map(({ k, v, c }) => (
            <View key={k} style={{ width: '30%', backgroundColor: C.glass, borderRadius: 10, borderWidth: 0.5, borderColor: BR, padding: 9 }}>
              <Text style={{ fontSize: 8, color: T3, letterSpacing: 0.7, textTransform: 'uppercase', marginBottom: 3 }}>{k}</Text>
              <Text style={{ fontSize: 13, fontWeight: '700', color: c }}>{v}</Text>
            </View>
          ))}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, flexDirection: 'row' }}>
          {TABS.map((t) => (
            <TouchableOpacity key={t.key} onPress={() => setTab(t.key)} style={{ paddingHorizontal: 11, paddingVertical: 6, borderRadius: 20, borderWidth: tab === t.key ? 1 : 0.5, borderColor: tab === t.key ? AC : BR, backgroundColor: tab === t.key ? C.ac2 : 'transparent' }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: tab === t.key ? AC : T2 }}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={{ paddingHorizontal: 14 }}>
        {tab === 'presets' && (
          <View>
            {room && (
              <TouchableOpacity onPress={generateDSPConfig} style={{ backgroundColor: C.ac2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.25)', padding: 11, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '700', color: AC, flex: 1 }}>⚡ Regenerar desde Room Scan ({room.nombre})</Text>
                <Text style={{ fontSize: 11, color: AC }}>›</Text>
              </TouchableOpacity>
            )}
            {allPresets.length === 0 && (
              <View style={{ padding: 20, backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: T2, textAlign: 'center' }}>Completá el Room Scan para generar presets.</Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {allPresets.map((p) => {
                const isActive = activePreset?.id === p.id
                const isBackup = p.nombre.includes('BACKUP')
                return (
                  <TouchableOpacity key={p.id} onPress={() => setActivePreset(p)} style={{ width: '47%', backgroundColor: isActive ? C.ac2 : C.glass, borderRadius: 14, borderWidth: isActive ? 1 : 0.5, borderColor: isActive ? 'rgba(26,255,110,0.4)' : BR, padding: 13, opacity: isBackup ? 0.72 : 1 }} activeOpacity={0.8}>
                    <Text style={{ fontSize: 7, fontWeight: '700', color: T3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{isBackup ? 'Backup' : 'Preset'}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: isActive ? AC : TX, marginBottom: 8 }}>{p.nombre}</Text>
                    {[{ k: 'Crossover', v: `${p.crossoverHz} Hz` }, { k: 'TOPs', v: `${p.nivelTopsDb >= 0 ? '+' : ''}${p.nivelTopsDb} dB` }, { k: 'SUBs', v: `${p.nivelSubsDb} dB` }, { k: 'Delay', v: `${p.delaySubsMs} ms` }].map(({ k, v }) => (
                      <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2, borderBottomWidth: 0.5, borderBottomColor: isActive ? 'rgba(26,255,110,0.12)' : BR }}>
                        <Text style={{ fontSize: 9, color: T3 }}>{k}</Text>
                        <Text style={{ fontSize: 9, fontWeight: '600', color: isActive ? AC : T2 }}>{v}</Text>
                      </View>
                    ))}
                    {isActive && <View style={{ marginTop: 5, backgroundColor: C.ac2, borderRadius: 7, paddingHorizontal: 5, paddingVertical: 1, alignSelf: 'flex-start' }}><Text style={{ fontSize: 7, fontWeight: '700', color: AC }}>● Activo</Text></View>}
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {tab === 'dsps' && (
          <View>
            {room && (
              <TouchableOpacity onPress={generateDSPConfig} style={{ backgroundColor: C.ac2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.25)', padding: 11, marginBottom: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: AC, flex: 1 }}>⚡ Auto-configurar — RT60: {room.rt60Full.toFixed(1)}s</Text>
                <Text style={{ fontSize: 11, color: AC }}>›</Text>
              </TouchableOpacity>
            )}
            {gear.dsps.length === 0 ? (
              <View style={{ padding: 24, alignItems: 'center', backgroundColor: C.glass, borderRadius: 16, borderWidth: 0.5, borderColor: BR }}>
                <Text style={{ fontSize: 12, color: T2, textAlign: 'center' }}>Sin DSP. Seleccioná uno en Gear Builder.</Text>
              </View>
            ) : (
              gear.dsps.map((dsp) => <DSPCard key={`${dsp.dspId}-${dsp.crossoverHz}`} dsp={dsp} />)
            )}
          </View>
        )}

        {tab === 'monitores' && <MonitoresEQ />}

        {tab === 'backup' && (
          <View>
            <View style={{ backgroundColor: C.am2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(251,191,36,0.2)', padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: AM }}>⚠ Protocolo emergencia — TOPs caídos</Text>
            </View>
            {BACKUP.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: BR }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: AM, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#000' }}>{i + 1}</Text></View>
                <Text style={{ fontSize: 12, color: T2, flex: 1, lineHeight: 18 }}>{s}</Text>
              </View>
            ))}
          </View>
        )}

        {tab === 'arranque' && (
          <View>
            <View style={{ backgroundColor: C.ac2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)', padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 12, fontWeight: '700', color: AC }}>Orden obligatorio — nunca saltear pasos</Text>
            </View>
            {ARRANQUE.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 10, paddingVertical: 9, borderBottomWidth: 0.5, borderBottomColor: BR }}>
                <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: AC, alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}><Text style={{ fontSize: 9, fontWeight: '800', color: '#000' }}>{i + 1}</Text></View>
                <Text style={{ fontSize: 12, color: T2, flex: 1, lineHeight: 18 }}>{s}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
