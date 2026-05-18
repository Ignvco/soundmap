import React, { useState } from 'react'
import {
  Alert, ScrollView, Text, TextInput, TouchableOpacity, View,
} from 'react-native'
import Svg, { Circle, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg'
import { useAppStore } from '@/store/app'
import {
  GEAR_DB, GEAR_CATS,
  detectSystemType, checkAmpCompatibility,
  type GearItem,
} from '@/constants/gear-database'
import type { AmpConfig, DSPConfig, GearSelection } from '@/store/app'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am, RD = C.rd, BL = C.bl

// ── Colores por tipo de sistema ───────────────────────────
const SYS_COLOR = { active: AC, passive: BL, hybrid: AM } as const
const SYS_LABEL = { active: 'Sistema activo', passive: 'Sistema pasivo', hybrid: 'Sistema híbrido' } as const
const SYS_DESC  = {
  active:  'Todos los parlantes tienen amplificador interno',
  passive: 'Los parlantes necesitan amplificador externo',
  hybrid:  'Combinación de activos y pasivos',
} as const

// ── Stage Map SVG ─────────────────────────────────────────
type Esc  = '15mt' | '10mt'
type Pos  = 'sobre' | 'tripodes'
type MapV = 'frontal' | 'planta'

function MapSVG({ esc, pos, view, topName, subName }: {
  esc: Esc; pos: Pos; view: MapV; topName: string; subName: string
}) {
  const W = 320, H = 200
  const isLong = esc === '15mt'
  const sw = isLong ? 270 : 185, sh = isLong ? 150 : 182
  const sx = (W - sw) / 2, sy = 12
  const tipX = sx + sw / 2
  const tIzqX = sx + 36, tDerX = sx + sw - 36
  const topY = isLong ? 70 : 76
  const subY = sy + sh - 26
  const topLabel = topName.split(' ').slice(0, 2).join(' ').substring(0, 10)
  const subLabel = subName.split(' ').slice(0, 2).join(' ').substring(0, 10)

  return (
    <Svg width={W} height={H}>
      <Rect width={W} height={H} fill={BG} />
      <Rect x={sx} y={sy} width={sw} height={sh} fill="#111118" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={view === 'planta' ? 5 : 0} />
      <Rect x={sx} y={sy} width={sw} height={sh * 0.18} fill="rgba(26,255,110,0.03)" stroke="rgba(26,255,110,0.07)" strokeWidth={0.5} />
      <SvgText x={tipX} y={sy + sh * 0.11} textAnchor="middle" fill={T3} fontSize={7} fontFamily="Inter">ESCENARIO · {isLong ? '15' : '10'}mt</SvgText>
      <SvgText x={tipX} y={sy + sh * 0.62} textAnchor="middle" fill="rgba(255,255,255,0.06)" fontSize={10} fontFamily="Inter">PÚBLICO</SvgText>
      <Polygon points={`${tIzqX},${topY + 10} ${sx + 12},${sy + sh - 8} ${tipX - 4},${sy + sh - 8}`} fill="rgba(26,255,110,0.05)" />
      <Polygon points={`${tDerX},${topY + 10} ${sx + sw - 12},${sy + sh - 8} ${tipX + 4},${sy + sh - 8}`} fill="rgba(26,255,110,0.05)" />
      <Rect x={tIzqX - 11} y={topY - 4} width={22} height={14} rx={3} fill="#0e0e1a" stroke={AC} strokeWidth={1.4} />
      <Circle cx={tIzqX} cy={topY + 3} r={3.5} fill="none" stroke={AC} strokeWidth={0.8} />
      <Rect x={tDerX - 11} y={topY - 4} width={22} height={14} rx={3} fill="#0e0e1a" stroke={AC} strokeWidth={1.4} />
      <Circle cx={tDerX} cy={topY + 3} r={3.5} fill="none" stroke={AC} strokeWidth={0.8} />
      <SvgText x={tIzqX} y={topY - 8} textAnchor="middle" fill={AC} fontSize={5.5} fontWeight="700" fontFamily="Inter">{topLabel}</SvgText>
      <SvgText x={tDerX} y={topY - 8} textAnchor="middle" fill={AC} fontSize={5.5} fontWeight="700" fontFamily="Inter">{topLabel}</SvgText>
      <Rect x={tipX - 18} y={subY - 6} width={36} height={16} rx={4} fill="#0e0e1a" stroke={AM} strokeWidth={1.2} />
      <SvgText x={tipX} y={subY + 4} textAnchor="middle" fill={AM} fontSize={5.5} fontWeight="600" fontFamily="Inter">{subLabel}</SvgText>
      {pos === 'tripodes' && (
        <>
          <Line x1={tIzqX} y1={sy + 52} x2={tIzqX} y2={topY - 5} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
          <Line x1={tDerX} y1={sy + 52} x2={tDerX} y2={topY - 5} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
        </>
      )}
    </Svg>
  )
}

// ── Validación de compatibilidad amp ──────────────────────
function AmpValidator({ gear }: { gear: GearSelection }) {
  if (gear.systemType === 'active') return null

  const passiveTops = gear.tops
    .map((id) => GEAR_DB.find((g) => g.id === id))
    .filter((g): g is GearItem => !!g && !g.active)

  if (passiveTops.length === 0 || gear.amps.length === 0) return null

  const amp = gear.amps[0]
  if (!amp) return null

  const speaker = passiveTops[0]
  if (!speaker) return null

  const check = checkAmpCompatibility(
    amp.wattsPerCh,
    speaker.watts ?? 300,
    speaker.ohms  ?? 8,
    amp.ohmsPerCh,
  )

  if (check.ok && !check.warning) return null

  return (
    <View style={{
      backgroundColor: check.ok ? C.am2 : C.rd2,
      borderRadius: 10, borderWidth: 0.5,
      borderColor: check.ok ? 'rgba(251,191,36,0.25)' : 'rgba(255,77,77,0.25)',
      padding: 11, marginHorizontal: 14, marginBottom: 10,
    }}>
      <Text style={{ fontSize: 11, color: check.ok ? AM : RD, fontWeight: '600', lineHeight: 17 }}>
        ⚠ {check.warning}
      </Text>
    </View>
  )
}

// ── PANTALLA ──────────────────────────────────────────────
export default function StageMapScreen() {
  const { gear, setGear, setSystemType, addAmp, removeAmp, activePreset } = useAppStore()

  const [tab,     setTab]     = useState<'mapa' | 'gear' | 'amps'>('mapa')
  const [esc,     setEsc]     = useState<Esc>('15mt')
  const [pos,     setPos]     = useState<Pos>('sobre')
  const [mapView, setMapView] = useState<MapV>('frontal')
  const [gearCat, setGearCat] = useState<string>('tops')

  // Leer nombres reales
  const topItem = GEAR_DB.find((g) => g.id === (gear.tops[0] ?? gear.top))
  const subItem = GEAR_DB.find((g) => g.id === (gear.subs[0] ?? gear.sub))
  const topName = topItem?.name ?? 'TOP'
  const subName = subItem?.name ?? 'SUB'

  const sysColor = SYS_COLOR[gear.systemType]
  const filteredGear = GEAR_DB.filter((g) => g.cat === gearCat)

  const isSelected = (item: GearItem) => {
    switch (item.cat) {
      case 'tops':      return (gear.tops ?? []).includes(item.id)
      case 'subs':      return (gear.subs ?? []).includes(item.id)
      case 'amps':      return gear.amps.some((a) => a.ampId === item.id)
      case 'dsp':       return gear.dsps.some((d) => d.dspId === item.id)
      case 'mixer':     return gear.mixer === item.id
      case 'mics':      return (gear.mics ?? []).includes(item.id)
      case 'monitores': return (gear.monitores ?? []).includes(item.id)
      default:          return false
    }
  }

  const toggleItem = (item: GearItem) => {
    switch (item.cat) {
      case 'tops': {
        const tops = gear.tops.includes(item.id)
          ? gear.tops.filter((id) => id !== item.id)
          : [...gear.tops, item.id]
        const newType = detectSystemType(tops, gear.subs)
        setGear({ tops, top: tops[0] ?? '' })
        setSystemType(newType)
        break
      }
      case 'subs': {
        const subs = gear.subs.includes(item.id)
          ? gear.subs.filter((id) => id !== item.id)
          : [...gear.subs, item.id]
        const newType = detectSystemType(gear.tops, subs)
        setGear({ subs, sub: subs[0] ?? '' })
        setSystemType(newType)
        break
      }
      case 'amps': {
        if (gear.amps.some((a) => a.ampId === item.id)) {
          removeAmp(item.id)
        } else {
          const newAmp: AmpConfig = {
            ampId:      item.id,
            nombre:     item.name,
            canales:    (item.outputs ?? 2),
            wattsPerCh: Math.round((item.watts ?? 500) / (item.outputs ?? 2)),
            ohmsPerCh:  item.ohms ?? 8,
            modo:       'stereo',
            destinoCH1: topName + ' IZQ',
            destinoCH2: topName + ' DER',
            gainCH1:    75,
            gainCH2:    75,
          }
          addAmp(newAmp)
        }
        break
      }
      case 'dsp':   setGear({ dsp: item.id }); break
      case 'mixer': setGear({ mixer: item.id }); break
      case 'mics': {
        const mics = gear.mics.includes(item.id)
          ? gear.mics.filter((id) => id !== item.id)
          : [...gear.mics, item.id]
        setGear({ mics })
        break
      }
      case 'monitores': {
        const monitores = gear.monitores.includes(item.id)
          ? gear.monitores.filter((id) => id !== item.id)
          : [...gear.monitores, item.id]
        setGear({ monitores })
        break
      }
    }
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: BG }} contentContainerStyle={{ paddingBottom: 100 }}>

      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 14 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 14 }}>
          {tab === 'mapa' ? 'Stage Map' : tab === 'gear' ? 'Gear Builder' : 'Amplificadores'}
        </Text>

        {/* Tipo de sistema */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', gap: 8,
          backgroundColor: `${sysColor}10`, borderRadius: 10,
          borderWidth: 0.5, borderColor: `${sysColor}30`,
          padding: 10, marginBottom: 14,
        }}>
          <View style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: sysColor, shadowColor: sysColor, shadowRadius: 4, shadowOpacity: 0.8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: sysColor }}>{SYS_LABEL[gear.systemType]}</Text>
            <Text style={{ fontSize: 10, color: T2, marginTop: 1 }}>{SYS_DESC[gear.systemType]}</Text>
          </View>
          {/* Override manual */}
          <View style={{ flexDirection: 'row', gap: 4 }}>
            {(['active', 'passive', 'hybrid'] as const).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setSystemType(t)}
                style={{
                  paddingHorizontal: 7, paddingVertical: 3, borderRadius: 20,
                  backgroundColor: gear.systemType === t ? `${SYS_COLOR[t]}20` : 'transparent',
                  borderWidth: 0.5,
                  borderColor: gear.systemType === t ? SYS_COLOR[t] : BR,
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: '700', color: gear.systemType === t ? SYS_COLOR[t] : T3 }}>
                  {t === 'active' ? 'ACT' : t === 'passive' ? 'PAS' : 'HÍB'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {[
            { k: 'mapa' as const, l: '🗺 Mapa'  },
            { k: 'gear' as const, l: '🔊 Gear'  },
            { k: 'amps' as const, l: `⚡ Amps (${gear.amps.length})` },
          ].map(({ k, l }) => (
            <TouchableOpacity
              key={k}
              onPress={() => setTab(k)}
              style={{
                paddingHorizontal: 13, paddingVertical: 6, borderRadius: 20,
                borderWidth: tab === k ? 1 : 0.5,
                borderColor: tab === k ? AC : BR,
                backgroundColor: tab === k ? C.ac2 : 'transparent',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '700', color: tab === k ? AC : T2 }}>{l}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── VALIDACIÓN AMP ── */}
      <AmpValidator gear={gear} />

      {/* ── MAPA ── */}
      {tab === 'mapa' && (
        <View style={{ paddingHorizontal: 14 }}>
          {/* Sistema activo banner */}
          <View style={{ backgroundColor: '#080810', borderRadius: 12, borderWidth: 0.5, borderColor: BR, padding: 10, flexDirection: 'row', gap: 6, flexWrap: 'wrap', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 8, color: T3, letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>Sistema:</Text>
            {[...gear.tops, ...gear.subs].map((id) => {
              const item = GEAR_DB.find((g) => g.id === id)
              if (!item) return null
              return (
                <View key={id} style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: item.active ? C.ac2 : C.bl2, borderWidth: 0.5, borderColor: item.active ? 'rgba(26,255,110,0.2)' : 'rgba(96,165,250,0.2)' }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: item.active ? AC : BL }}>{item.name.split(' ').slice(0, 3).join(' ')}</Text>
                </View>
              )
            })}
          </View>

          <View style={{ backgroundColor: C.glass, borderRadius: 20, borderWidth: 0.5, borderColor: BR, overflow: 'hidden', marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 11, borderBottomWidth: 0.5, borderBottomColor: BR }}>
              <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Vista del sistema</Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {(['frontal', 'planta'] as MapV[]).map((v) => (
                  <TouchableOpacity key={v} onPress={() => setMapView(v)} style={{ paddingHorizontal: 9, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5, borderColor: mapView === v ? 'rgba(26,255,110,0.3)' : BR, backgroundColor: mapView === v ? C.ac2 : 'transparent' }}>
                    <Text style={{ fontSize: 10, fontWeight: '600', color: mapView === v ? AC : T2 }}>{v.charAt(0).toUpperCase() + v.slice(1)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <MapSVG esc={esc} pos={pos} view={mapView} topName={topName} subName={subName} />
            <View style={{ padding: 10, flexDirection: 'row', gap: 5, flexWrap: 'wrap', borderTopWidth: 0.5, borderTopColor: BR }}>
              {(['15mt', '10mt'] as Esc[]).map((e) => (
                <TouchableOpacity key={e} onPress={() => setEsc(e)} style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: esc === e ? 'rgba(26,255,110,0.3)' : BR, backgroundColor: esc === e ? C.ac2 : 'transparent' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: esc === e ? AC : T2 }}>Esc. {e}</Text>
                </TouchableOpacity>
              ))}
              {(['sobre', 'tripodes'] as Pos[]).map((p) => (
                <TouchableOpacity key={p} onPress={() => setPos(p)} style={{ paddingHorizontal: 9, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: pos === p ? 'rgba(26,255,110,0.3)' : BR, backgroundColor: pos === p ? C.ac2 : 'transparent' }}>
                  <Text style={{ fontSize: 11, fontWeight: '600', color: pos === p ? AC : T2 }}>{p === 'sobre' ? 'Sobre subs' : 'Trípodes'}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { l: 'Tilt TOPs',   v: esc === '15mt' ? '10°–15°' : '8°–12°', c: AC },
              { l: 'Crossover',   v: `${activePreset?.crossoverHz ?? 80} Hz LR24`, c: AC },
              { l: 'TOP',         v: topName.split(' ').slice(0, 2).join(' '), c: AC },
              { l: 'SUB',         v: subName.split(' ').slice(0, 2).join(' '), c: AM },
              { l: 'Delay SUBs',  v: pos === 'sobre' ? '~0 ms' : 'Medir', c: BL },
              { l: 'Sistema',     v: SYS_LABEL[gear.systemType], c: sysColor },
            ].map(({ l, v, c }) => (
              <View key={l} style={{ width: '47%', backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, padding: 11 }}>
                <Text style={{ fontSize: 8, color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 }}>{l}</Text>
                <Text style={{ fontSize: 11, fontWeight: '700', color: c }} numberOfLines={1}>{v}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── GEAR BUILDER ── */}
      {tab === 'gear' && (
        <View>
          {/* Alerta sistema pasivo → necesita amp */}
          {gear.systemType !== 'active' && gear.amps.length === 0 && (
            <View style={{ marginHorizontal: 14, marginBottom: 10, backgroundColor: C.rd2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.25)', padding: 11 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: RD }}>⚠ Sistema pasivo — seleccioná al menos un amplificador en la tab Amps</Text>
            </View>
          )}

          <View style={{ backgroundColor: '#080810', borderRadius: 12, borderWidth: 0.5, borderColor: BR, padding: 10, flexDirection: 'row', gap: 5, flexWrap: 'wrap', alignItems: 'center', marginHorizontal: 14, marginBottom: 10 }}>
            <Text style={{ fontSize: 8, color: T3, letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>Seleccionado:</Text>
            {[...gear.tops, ...gear.subs, gear.dsp, gear.mixer].filter(Boolean).map((id) => {
              const item = GEAR_DB.find((g) => g.id === id)
              if (!item) return null
              return (
                <View key={id} style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)' }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: AC }}>{item.name.split(' ').slice(0, 3).join(' ')}</Text>
                </View>
              )
            })}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 14, gap: 6, flexDirection: 'row', marginBottom: 12 }}>
            {GEAR_CATS.map(({ key, label }) => (
              <TouchableOpacity key={key} onPress={() => setGearCat(key)} style={{ paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20, borderWidth: 0.5, borderColor: gearCat === key ? 'rgba(26,255,110,0.25)' : BR, backgroundColor: gearCat === key ? C.ac2 : C.glass }}>
                <Text style={{ fontSize: 11, fontWeight: '600', color: gearCat === key ? AC : T2 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={{ paddingHorizontal: 14 }}>
            {filteredGear.map((item) => {
              const sel = isSelected(item)
              const isPassive = !item.active && (item.cat === 'tops' || item.cat === 'subs')
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleItem(item)}
                  style={{
                    backgroundColor: sel ? C.ac2 : C.glass,
                    borderRadius: 12, borderWidth: 0.5,
                    borderColor: sel ? 'rgba(26,255,110,0.35)' : BR,
                    borderLeftWidth: 2.5,
                    borderLeftColor: sel ? AC : isPassive ? BL : BR,
                    padding: 12, marginBottom: 7,
                    flexDirection: 'row', alignItems: 'center', gap: 11,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 1 }}>
                      <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase' }}>{item.brand}</Text>
                      <View style={{ paddingHorizontal: 5, paddingVertical: 1, borderRadius: 8, backgroundColor: item.active ? C.ac2 : C.bl2 }}>
                        <Text style={{ fontSize: 7, fontWeight: '700', color: item.active ? AC : BL }}>{item.active ? 'ACTIVO' : 'PASIVO'}</Text>
                      </View>
                    </View>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: sel ? AC : TX, marginBottom: 1 }}>{item.name}</Text>
                    <Text style={{ fontSize: 10, color: T2 }}>{item.specs}</Text>
                  </View>
                  {sel && <Text style={{ color: AC, fontSize: 14 }}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}

      {/* ── AMPLIFICADORES ── */}
      {tab === 'amps' && (
        <View style={{ paddingHorizontal: 14 }}>
          {gear.systemType === 'active' && (
            <View style={{ backgroundColor: C.ac2, borderRadius: 10, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)', padding: 12, marginBottom: 14 }}>
              <Text style={{ fontSize: 11, color: AC, fontWeight: '600' }}>
                Sistema activo — los amplificadores son internos en cada parlante. Los amps externos son opcionales (monitor pasivo, etc.).
              </Text>
            </View>
          )}

          {gear.amps.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center', backgroundColor: C.glass, borderRadius: 16, borderWidth: 0.5, borderColor: BR }}>
              <Text style={{ fontSize: 28, marginBottom: 8 }}>⚡</Text>
              <Text style={{ fontSize: 12, color: T2, textAlign: 'center' }}>No hay amplificadores configurados.</Text>
              <Text style={{ fontSize: 11, color: T3, textAlign: 'center', marginTop: 4 }}>Seleccioná un amp en la tab Gear → Amplif.</Text>
            </View>
          ) : (
            gear.amps.map((amp, idx) => {
              const ampItem  = GEAR_DB.find((g) => g.id === amp.ampId)
              const topItem_ = GEAR_DB.find((g) => g.id === (gear.tops[0] ?? gear.top))
              const compat   = topItem_ && !topItem_.active
                ? checkAmpCompatibility(amp.wattsPerCh, topItem_.watts ?? 300, topItem_.ohms ?? 8, amp.ohmsPerCh)
                : { ok: true, warning: null }

              return (
                <View key={amp.ampId + idx} style={{ backgroundColor: C.glass, borderRadius: 16, borderWidth: 0.5, borderColor: compat.ok ? BR : 'rgba(255,77,77,0.3)', padding: 14, marginBottom: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                    <Text style={{ fontSize: 16, marginRight: 8 }}>⚡</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 13, fontWeight: '700', color: TX }}>{amp.nombre}</Text>
                      <Text style={{ fontSize: 10, color: T2 }}>{ampItem?.specs ?? ''}</Text>
                    </View>
                    <TouchableOpacity onPress={() => removeAmp(amp.ampId)} style={{ padding: 6, borderRadius: 8, backgroundColor: C.rd2, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)' }}>
                      <Text style={{ fontSize: 11, color: RD }}>✕</Text>
                    </TouchableOpacity>
                  </View>

                  {compat.warning && (
                    <View style={{ backgroundColor: compat.ok ? C.am2 : C.rd2, borderRadius: 8, padding: 9, marginBottom: 10, borderWidth: 0.5, borderColor: compat.ok ? 'rgba(251,191,36,0.25)' : 'rgba(255,77,77,0.25)' }}>
                      <Text style={{ fontSize: 11, color: compat.ok ? AM : RD }}>{compat.warning}</Text>
                    </View>
                  )}

                  {[
                    { k: 'Canales',    v: `${amp.canales} canales · ${amp.modo}` },
                    { k: 'Potencia',   v: `${amp.wattsPerCh}W/ch @ ${amp.ohmsPerCh}Ω` },
                    { k: 'CH1 → ',     v: amp.destinoCH1 + ` · Gain: ${amp.gainCH1}%` },
                    { k: 'CH2 → ',     v: amp.destinoCH2 + ` · Gain: ${amp.gainCH2}%` },
                  ].map(({ k, v }) => (
                    <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: BR }}>
                      <Text style={{ fontSize: 11, color: T2 }}>{k}</Text>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: TX }}>{v}</Text>
                    </View>
                  ))}
                </View>
              )
            })
          )}

          {/* Lista de amps disponibles para agregar */}
          <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 }}>
            Agregar amplificador
          </Text>
          {GEAR_DB.filter((g) => g.cat === 'amps').map((item) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => toggleItem(item)}
              style={{ backgroundColor: isSelected(item) ? C.ac2 : C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: isSelected(item) ? 'rgba(26,255,110,0.35)' : BR, padding: 12, marginBottom: 7, flexDirection: 'row', alignItems: 'center', gap: 11 }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.emoji}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1 }}>{item.brand}</Text>
                <Text style={{ fontSize: 12, fontWeight: '600', color: isSelected(item) ? AC : TX }}>{item.name}</Text>
                <Text style={{ fontSize: 10, color: T2 }}>{item.specs}</Text>
              </View>
              {isSelected(item) && <Text style={{ color: AC, fontSize: 14 }}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
