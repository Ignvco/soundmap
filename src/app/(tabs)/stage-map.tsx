import React, { useState } from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import Svg, {
  Circle, Line, Polygon, Rect, Text as SvgText,
} from 'react-native-svg'
import { useAppStore } from '@/store/app'
import { GEAR_DB, GEAR_CATS } from '@/constants/gear-database'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, SF = C.bg2, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, AM = C.am

type Esc = '15mt' | '10mt'
type Pos = 'sobre' | 'tripodes'
type View2 = 'frontal' | 'planta'

// ── Stage Map SVG ──────────────────────────────────────
function MapSVG({ esc, pos, view }: { esc: Esc; pos: Pos; view: View2 }) {
  const W = 320, H = 200
  const isLong = esc === '15mt'
  const sw = isLong ? 270 : 185, sh = isLong ? 150 : 182
  const sx = (W - sw) / 2, sy = 12
  const tipX = sx + sw / 2
  const tIzqX = sx + 36, tDerX = sx + sw - 36
  const topY = isLong ? 70 : 76
  const subY = sy + sh - 26

  if (view === 'planta') {
    return (
      <Svg width={W} height={H}>
        <Rect width={W} height={H} fill={BG} />
        <Rect x={sx} y={sy} width={sw} height={sh} fill="#111118" stroke="rgba(255,255,255,0.08)" strokeWidth={0.5} rx={5} />
        <Rect x={sx} y={sy} width={sw} height={sh * 0.18} fill="rgba(26,255,110,0.04)" stroke="rgba(26,255,110,0.08)" strokeWidth={0.5} />
        <SvgText x={tipX} y={sy + sh * 0.11} textAnchor="middle" fill={T3} fontSize={7} fontFamily="Inter">ESCENARIO · {isLong ? '15' : '10'}mt</SvgText>
        <SvgText x={tipX} y={sy + sh * 0.62} textAnchor="middle" fill="rgba(255,255,255,0.06)" fontSize={10} fontFamily="Inter">PÚBLICO</SvgText>
        {/* Coverage */}
        <Polygon points={`${tIzqX},${topY + 10} ${sx + 12},${sy + sh - 8} ${tipX - 4},${sy + sh - 8}`} fill="rgba(26,255,110,0.05)" />
        <Polygon points={`${tDerX},${topY + 10} ${sx + sw - 12},${sy + sh - 8} ${tipX + 4},${sy + sh - 8}`} fill="rgba(26,255,110,0.05)" />
        {/* TOPs */}
        <Rect x={tIzqX - 11} y={topY - 4} width={22} height={14} rx={3} fill="#0e0e1a" stroke={AC} strokeWidth={1.4} />
        <Circle cx={tIzqX} cy={topY + 3} r={3.5} fill="none" stroke={AC} strokeWidth={0.8} />
        <Rect x={tDerX - 11} y={topY - 4} width={22} height={14} rx={3} fill="#0e0e1a" stroke={AC} strokeWidth={1.4} />
        <Circle cx={tDerX} cy={topY + 3} r={3.5} fill="none" stroke={AC} strokeWidth={0.8} />
        {/* SUBs */}
        <Rect x={tipX - 18} y={subY - 6} width={36} height={18} rx={4} fill="#0e0e1a" stroke={AM} strokeWidth={1.2} />
        <SvgText x={tipX} y={subY + 5} textAnchor="middle" fill={AM} fontSize={6.5} fontWeight="600" fontFamily="Inter">AIR18×2</SvgText>
        {/* Labels */}
        <SvgText x={tIzqX} y={topY - 8} textAnchor="middle" fill={AC} fontSize={6} fontWeight="700" fontFamily="Inter">RCF</SvgText>
        <SvgText x={tDerX} y={topY - 8} textAnchor="middle" fill={AC} fontSize={6} fontWeight="700" fontFamily="Inter">RCF</SvgText>
        {/* Dimensions */}
        <SvgText x={sx + 4} y={sy - 3} fill={T3} fontSize={6} fontFamily="Inter">{isLong ? '15' : '10'}mt →</SvgText>
      </Svg>
    )
  }

  // FRONTAL
  return (
    <Svg width={W} height={H}>
      <Rect width={W} height={H} fill={BG} />
      {/* Techo triangular */}
      <Polygon points={`${tipX},${sy - 6} ${sx - 2},${sy + 30} ${sx + sw + 2},${sy + 30}`} fill="none" stroke="rgba(200,184,144,0.4)" strokeWidth={1.5} />
      {/* Pared escenario */}
      <Rect x={sx} y={sy + 30} width={sw} height={16} fill="rgba(237,228,208,0.1)" stroke="rgba(200,168,120,0.3)" strokeWidth={0.5} />
      <SvgText x={tipX} y={sy + 42} textAnchor="middle" fill={T3} fontSize={6.5} fontWeight="700" fontFamily="Inter">ESCENARIO · {isLong ? '15' : '10'}mt</SvgText>
      {/* Paredes laterales */}
      <Rect x={sx} y={sy + 30} width={24} height={sh * 0.55} fill="rgba(240,232,208,0.06)" stroke="rgba(200,168,120,0.2)" strokeWidth={0.5} />
      <Rect x={sx + sw - 24} y={sy + 30} width={24} height={sh * 0.55} fill="rgba(240,232,208,0.06)" stroke="rgba(200,168,120,0.2)" strokeWidth={0.5} />
      {/* Audience label */}
      <SvgText x={tipX} y={sy + 30 + sh * 0.58} textAnchor="middle" fill="rgba(255,255,255,0.07)" fontSize={9} fontFamily="Inter">PÚBLICO</SvgText>
      {/* Coverage */}
      <Polygon points={`${tIzqX},${topY + 10} ${sx + 8},${sy + sh} ${tipX - 4},${sy + sh}`} fill="rgba(26,255,110,0.05)" />
      <Polygon points={`${tDerX},${topY + 10} ${sx + sw - 8},${sy + sh} ${tipX + 4},${sy + sh}`} fill="rgba(26,255,110,0.05)" />
      {/* SUBs */}
      <Rect x={tipX - 18} y={sy + sh - 20} width={36} height={18} rx={4} fill="#0e0e1a" stroke={AM} strokeWidth={1.3} />
      <SvgText x={tipX} y={sy + sh - 8} textAnchor="middle" fill={AM} fontSize={6.5} fontWeight="600" fontFamily="Inter">AIR18×2</SvgText>
      {/* TOPs */}
      {pos === 'sobre' ? (
        <>
          <Rect x={tIzqX - 13} y={topY - 5} width={26} height={17} rx={4} fill="#0e0e1a" stroke={AC} strokeWidth={1.5} />
          <Circle cx={tIzqX} cy={topY + 3.5} r={4} fill="none" stroke={AC} strokeWidth={0.9} />
          <Rect x={tDerX - 13} y={topY - 5} width={26} height={17} rx={4} fill="#0e0e1a" stroke={AC} strokeWidth={1.5} />
          <Circle cx={tDerX} cy={topY + 3.5} r={4} fill="none" stroke={AC} strokeWidth={0.9} />
        </>
      ) : (
        <>
          <Line x1={tIzqX} y1={sy + 56} x2={tIzqX} y2={topY - 6} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
          <Rect x={tIzqX - 13} y={topY - 12} width={26} height={16} rx={4} fill="#0e0e1a" stroke={AC} strokeWidth={1.5} />
          <Line x1={tDerX} y1={sy + 56} x2={tDerX} y2={topY - 6} stroke="rgba(255,255,255,0.15)" strokeWidth={1.5} />
          <Rect x={tDerX - 13} y={topY - 12} width={26} height={16} rx={4} fill="#0e0e1a" stroke={AC} strokeWidth={1.5} />
        </>
      )}
      <SvgText x={tIzqX} y={topY - 16} textAnchor="middle" fill={AC} fontSize={6.5} fontWeight="700" fontFamily="Inter">RCF</SvgText>
      <SvgText x={tDerX} y={topY - 16} textAnchor="middle" fill={AC} fontSize={6.5} fontWeight="700" fontFamily="Inter">RCF</SvgText>
    </Svg>
  )
}

// ── MAIN ──────────────────────────────────────────────
export default function StageMapScreen() {
  const { gear, setGear, activePreset } = useAppStore()
  const [tab, setTab] = useState<'mapa' | 'gear'>('mapa')
  const [esc, setEsc] = useState<Esc>('15mt')
  const [pos, setPos] = useState<Pos>('sobre')
  const [mapView, setMapView] = useState<View2>('frontal')
  const [gearCat, setGearCat] = useState<string>('tops')

  const filteredGear = GEAR_DB.filter((g) => g.cat === gearCat)

  const isGearSelected = (item: (typeof GEAR_DB)[0]) => {
    if (item.cat === 'tops')      return gear.top === item.id
    if (item.cat === 'subs')      return gear.sub === item.id
    if (item.cat === 'amps')      return gear.amp === item.id
    if (item.cat === 'dsp')       return gear.dsp === item.id
    if (item.cat === 'mixer')     return gear.mixer === item.id
    if (item.cat === 'mics')      return gear.mics.includes(item.id)
    if (item.cat === 'monitores') return gear.monitores.includes(item.id)
    return false
  }

  const toggleGear = (item: (typeof GEAR_DB)[0]) => {
    if (item.cat === 'tops')      setGear({ top: item.id })
    else if (item.cat === 'subs') setGear({ sub: item.id })
    else if (item.cat === 'amps') setGear({ amp: item.id })
    else if (item.cat === 'dsp')  setGear({ dsp: item.id })
    else if (item.cat === 'mixer') setGear({ mixer: item.id })
    else if (item.cat === 'mics') {
      const mics = gear.mics.includes(item.id)
        ? gear.mics.filter((id) => id !== item.id)
        : [...gear.mics, item.id]
      setGear({ mics })
    } else if (item.cat === 'monitores') {
      const mons = gear.monitores.includes(item.id)
        ? gear.monitores.filter((id) => id !== item.id)
        : [...gear.monitores, item.id]
      setGear({ monitores: mons })
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 16 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 16 }}>
          {tab === 'mapa' ? 'Stage Map' : 'Gear Builder'}
        </Text>

        {/* Tabs */}
        <View style={{ flexDirection: 'row', gap: 6 }}>
          {(['mapa', 'gear'] as const).map((t) => (
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
                {t === 'mapa' ? '🗺 Mapa' : '🔊 Gear'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── MAPA TAB ── */}
      {tab === 'mapa' && (
        <View style={{ paddingHorizontal: 14 }}>
          <View style={{
            backgroundColor: C.glass, borderRadius: 20,
            borderWidth: 0.5, borderColor: BR, overflow: 'hidden', marginBottom: 10,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 12, borderBottomWidth: 0.5, borderBottomColor: BR }}>
              <Text style={{ fontSize: 10, fontWeight: '700', color: T3, letterSpacing: 1.2, textTransform: 'uppercase' }}>Vista del sistema</Text>
              <View style={{ flexDirection: 'row', gap: 5 }}>
                {(['frontal', 'planta'] as View2[]).map((v) => (
                  <TouchableOpacity
                    key={v}
                    onPress={() => setMapView(v)}
                    style={{
                      paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
                      borderWidth: 0.5,
                      borderColor: mapView === v ? 'rgba(26,255,110,0.3)' : BR,
                      backgroundColor: mapView === v ? C.ac2 : 'transparent',
                    }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '600', color: mapView === v ? AC : T2 }}>
                      {v.charAt(0).toUpperCase() + v.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <MapSVG esc={esc} pos={pos} view={mapView} />
            <View style={{ padding: 10, flexDirection: 'row', gap: 5, flexWrap: 'wrap', borderTopWidth: 0.5, borderTopColor: BR }}>
              {(['15mt', '10mt'] as Esc[]).map((e) => (
                <TouchableOpacity
                  key={e}
                  onPress={() => setEsc(e)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                    borderWidth: 0.5,
                    borderColor: esc === e ? 'rgba(26,255,110,0.3)' : BR,
                    backgroundColor: esc === e ? C.ac2 : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: esc === e ? AC : T2 }}>Esc. {e}</Text>
                </TouchableOpacity>
              ))}
              {(['sobre', 'tripodes'] as Pos[]).map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => setPos(p)}
                  style={{
                    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
                    borderWidth: 0.5,
                    borderColor: pos === p ? 'rgba(26,255,110,0.3)' : BR,
                    backgroundColor: pos === p ? C.ac2 : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 11, fontWeight: '600', color: pos === p ? AC : T2 }}>
                    {p === 'sobre' ? 'Sobre subs' : 'Trípodes'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Métricas */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'Tilt TOPs',  value: esc === '15mt' ? '10°–15°' : '8°–12°', color: AC },
              { label: 'Crossover',  value: `${activePreset?.crossoverHz ?? 80} Hz LR24`, color: AC },
              { label: 'Delay SUBs', value: pos === 'sobre' ? '~0 ms' : 'Medir cinta', color: C.bl },
              { label: 'Cobertura',  value: '~90°', color: AM },
            ].map(({ label, value, color }) => (
              <View key={label} style={{ width: '47%', backgroundColor: C.glass, borderRadius: 12, borderWidth: 0.5, borderColor: BR, padding: 12 }}>
                <Text style={{ fontSize: 9, color: T3, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>{label}</Text>
                <Text style={{ fontSize: 14, fontWeight: '700', color }}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* ── GEAR TAB ── */}
      {tab === 'gear' && (
        <View>
          {/* Gear seleccionado */}
          <View style={{ paddingHorizontal: 14, marginBottom: 10 }}>
            <View style={{
              backgroundColor: '#080810', borderRadius: 12, borderWidth: 0.5,
              borderColor: BR, padding: 10, flexDirection: 'row', flexWrap: 'wrap', gap: 5, alignItems: 'center',
            }}>
              <Text style={{ fontSize: 9, color: T3, letterSpacing: 1, textTransform: 'uppercase', marginRight: 4 }}>Sistema:</Text>
              {[gear.top, gear.sub, gear.dsp, gear.mixer].map((id) => {
                const item = GEAR_DB.find((g) => g.id === id)
                if (!item) return null
                return (
                  <View key={id} style={{
                    paddingHorizontal: 8, paddingVertical: 2, borderRadius: 20,
                    backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.2)',
                  }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>
                      {item.name.split(' ').slice(0, 3).join(' ')}
                    </Text>
                  </View>
                )
              })}
            </View>
          </View>

          {/* Categorías */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 14, gap: 6, flexDirection: 'row', marginBottom: 12 }}
          >
            {GEAR_CATS.map(({ key, label }) => (
              <TouchableOpacity
                key={key}
                onPress={() => setGearCat(key)}
                style={{
                  paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20,
                  borderWidth: 0.5,
                  borderColor: gearCat === key ? 'rgba(26,255,110,0.25)' : BR,
                  backgroundColor: gearCat === key ? C.ac2 : C.glass,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: gearCat === key ? AC : T2 }}>{label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Lista */}
          <View style={{ paddingHorizontal: 14 }}>
            {filteredGear.map((item) => {
              const selected = isGearSelected(item)
              return (
                <TouchableOpacity
                  key={item.id}
                  onPress={() => toggleGear(item)}
                  style={{
                    backgroundColor: selected ? C.ac2 : C.glass,
                    borderRadius: 12,
                    borderWidth: 0.5,
                    borderColor: selected ? 'rgba(26,255,110,0.35)' : BR,
                    borderLeftWidth: selected ? 2 : 0.5,
                    borderLeftColor: selected ? AC : BR,
                    padding: 12,
                    marginBottom: 7,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 11,
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 20, width: 32, textAlign: 'center' }}>{item.emoji}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 8, fontWeight: '700', color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 1 }}>{item.brand}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '600', color: selected ? AC : TX, marginBottom: 1 }}>{item.name}</Text>
                    <Text style={{ fontSize: 10, color: T2 }}>{item.specs}</Text>
                  </View>
                  {selected && <Text style={{ color: AC, fontSize: 14 }}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
        </View>
      )}
    </ScrollView>
  )
}
