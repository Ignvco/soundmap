import { C } from '@/constants/theme';
import { diagnosRoom, type DiagItem, type TratamientoSugerido } from '@/lib/audio/acoustics';
import { useAppStore, type RoomData } from '@/store/app';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Polygon, Rect, Text as SvgText } from 'react-native-svg';

const AC = C.ac,
  BG = C.bg,
  BR = C.br2
const TX = C.tx,
  T2 = C.t2,
  T3 = C.t3
const AM = C.am,
  RD = C.rd,
  BL = C.bl,
  PU = C.pu

const MAT_TECHO = [
  { label: 'Triangular / A', alpha: 0.06, desc: 'Cumbrera — riesgo eco' },
  { label: 'Plano', alpha: 0.05, desc: 'Estándar' },
  { label: 'Curvo / Bóveda', alpha: 0.08, desc: 'Focalización de sonido' },
  { label: 'Irregular / mixto', alpha: 0.15, desc: 'Absorción variable' },
]
const MAT_PAREDES = [
  { label: 'Ladrillo visto', alpha: 0.03, desc: 'α=0.03 · Alta reflexión' },
  { label: 'Hormigón', alpha: 0.02, desc: 'α=0.02 · Muy reflectivo' },
  { label: 'Madera', alpha: 0.06, desc: 'α=0.06 · Media reflexión' },
  { label: 'Tratado acústico', alpha: 0.25, desc: 'α=0.25 · Baja reflexión' },
  { label: 'Yeso / Drywall', alpha: 0.12, desc: 'α=0.12 · Media-baja' },
  { label: 'Cortinas / Telas', alpha: 0.15, desc: 'α=0.15 · Absorbente' },
]
const MAT_PISO = [
  { label: 'Cemento liso', alpha: 0.02, desc: 'α=0.02 · Muy reflectivo' },
  { label: 'Madera flotante', alpha: 0.05, desc: 'α=0.05 · Media reflexión' },
  { label: 'Alfombra gruesa', alpha: 0.35, desc: 'α=0.35 · Muy absorbente' },
  { label: 'Cerámico', alpha: 0.02, desc: 'α=0.02 · Alta reflexión' },
]
const MAT_VENT = [
  { label: 'Sin ventanales', alpha: 0 },
  { label: 'Parciales', alpha: 0.08 },
  { label: 'Toda la pared', alpha: 0.2 },
]

function SPLMap({ L, A }: { L: number; A: number }) {
  const W = 300,
    H = 108,
    pad = 14
  const sw = W - pad * 2,
    sh = H - 20
  const tipX = pad + sw / 2
  const tIzqX = pad + 34,
    tDerX = pad + sw - 34
  const topY = sh * 0.3,
    subY = H - 22
  const zones = Math.min(7, Math.max(3, Math.round(Math.max(L, A))))
  const gradColors = [
    'rgba(26,255,110,',
    'rgba(100,255,80,',
    'rgba(180,255,60,',
    'rgba(251,191,36,',
    'rgba(255,140,0,',
    'rgba(255,77,77,',
    'rgba(200,40,40,',
  ]
  return (
    <View
      style={{
        backgroundColor: '#060610',
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: BR,
        overflow: 'hidden',
        padding: 8,
        marginBottom: 8,
      }}
    >
      <Svg width={W} height={H}>
        <Rect
          x={pad}
          y={12}
          width={sw}
          height={sh}
          fill="#0a0a16"
          stroke="rgba(255,255,255,0.07)"
          strokeWidth={0.5}
          rx={4}
        />
        <Rect
          x={pad}
          y={12}
          width={sw}
          height={sh * 0.18}
          fill="rgba(26,255,110,0.04)"
          stroke="rgba(26,255,110,0.07)"
          strokeWidth={0.5}
        />
        <SvgText
          x={tipX}
          y={12 + sh * 0.13}
          textAnchor="middle"
          fill={T3}
          fontSize={6.5}
          fontFamily="Inter"
        >
          ESCENARIO · {L}mt × {A}mt
        </SvgText>
        {Array.from({ length: zones }, (_, i) => {
          const zH = (sh * 0.82) / zones
          const y = 12 + sh * 0.18 + i * zH
          return (
            <Rect
              key={i}
              x={pad}
              y={y}
              width={sw}
              height={zH + 1}
              fill={`${gradColors[Math.min(i, gradColors.length - 1)]}${0.08 + i * 0.04})`}
            />
          )
        })}
        <Polygon
          points={`${tIzqX},${topY + 12} ${pad + 6},${H - 7} ${tipX - 4},${H - 7}`}
          fill="rgba(26,255,110,0.05)"
        />
        <Polygon
          points={`${tDerX},${topY + 12} ${pad + sw - 6},${H - 7} ${tipX + 4},${H - 7}`}
          fill="rgba(26,255,110,0.05)"
        />
        <Rect
          x={tipX - 18}
          y={subY - 5}
          width={36}
          height={15}
          rx={3}
          fill="#0e0e1a"
          stroke={AM}
          strokeWidth={1.2}
        />
        <SvgText
          x={tipX}
          y={subY + 5}
          textAnchor="middle"
          fill={AM}
          fontSize={6.5}
          fontWeight="600"
          fontFamily="Inter"
        >
          AIR18×2
        </SvgText>
        <Rect
          x={tIzqX - 11}
          y={topY - 3}
          width={22}
          height={13}
          rx={3}
          fill="#0e0e1a"
          stroke={AC}
          strokeWidth={1.4}
        />
        <Circle cx={tIzqX} cy={topY + 4} r={3.5} fill="none" stroke={AC} strokeWidth={0.8} />
        <Rect
          x={tDerX - 11}
          y={topY - 3}
          width={22}
          height={13}
          rx={3}
          fill="#0e0e1a"
          stroke={AC}
          strokeWidth={1.4}
        />
        <Circle cx={tDerX} cy={topY + 4} r={3.5} fill="none" stroke={AC} strokeWidth={0.8} />
        <SvgText x={tIzqX} y={topY - 7} textAnchor="middle" fill={AC} fontSize={6} fontWeight="700">
          RCF
        </SvgText>
        <SvgText x={tDerX} y={topY - 7} textAnchor="middle" fill={AC} fontSize={6} fontWeight="700">
          RCF
        </SvgText>
      </Svg>
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 5, flexWrap: 'wrap' }}>
        {[
          { color: AC, label: '>100dB' },
          { color: AM, label: '85–100dB' },
          { color: RD, label: '<85dB' },
        ].map((l) => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 9, height: 3, borderRadius: 2, backgroundColor: l.color }} />
            <Text style={{ fontSize: 8, color: T2 }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

function DiagCard({ item }: { item: DiagItem }) {
  const [open, setOpen] = useState(false)
  const color = item.status === 'ok' ? AC : item.status === 'warn' ? AM : RD
  return (
    <View
      style={{
        backgroundColor: C.glass,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: BR,
        overflow: 'hidden',
        marginBottom: 7,
      }}
    >
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 9 }}
        activeOpacity={0.8}
      >
        <View
          style={{
            width: 7,
            height: 7,
            borderRadius: 3.5,
            backgroundColor: color,
            shadowColor: color,
            shadowRadius: 5,
            shadowOpacity: 0.8,
          }}
        />
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, fontWeight: '600', color }}>{item.title}</Text>
          <Text style={{ fontSize: 10, color: T3, marginTop: 1 }}>{item.valor}</Text>
        </View>
        <Text
          style={{ color: T3, fontSize: 11, transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        >
          ▾
        </Text>
      </TouchableOpacity>
      {open && (
        <View
          style={{
            paddingHorizontal: 12,
            paddingBottom: 13,
            borderTopWidth: 0.5,
            borderTopColor: BR,
          }}
        >
          {[
            { label: '¿Por qué?', text: item.porq },
            { label: '¿Para qué importa?', text: item.paraq },
            { label: '¿Cómo resolverlo?', text: item.como },
          ].map(({ label, text }) => (
            <View key={label}>
              <Text
                style={{
                  fontSize: 8,
                  fontWeight: '700',
                  color: T3,
                  letterSpacing: 0.8,
                  textTransform: 'uppercase',
                  marginTop: 10,
                  marginBottom: 4,
                }}
              >
                {label}
              </Text>
              <Text style={{ fontSize: 12, color: T2, lineHeight: 18 }}>{text}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  )
}

function TratCard({ t }: { t: TratamientoSugerido }) {
  const pcolor = { alta: RD, media: AM, baja: BL }[t.prioridad]
  const pbg = { alta: C.rd2, media: C.am2, baja: C.bl2 }[t.prioridad]
  return (
    <View
      style={{
        backgroundColor: C.glass,
        borderRadius: 12,
        borderWidth: 0.5,
        borderColor: BR,
        borderLeftWidth: 3,
        borderLeftColor: pcolor,
        padding: 12,
        marginBottom: 7,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 6 }}>
        <View
          style={{
            paddingHorizontal: 6,
            paddingVertical: 2,
            borderRadius: 20,
            backgroundColor: pbg,
            borderWidth: 0.5,
            borderColor: `${pcolor}40`,
          }}
        >
          <Text
            style={{ fontSize: 8, fontWeight: '700', color: pcolor, textTransform: 'uppercase' }}
          >
            {t.prioridad}
          </Text>
        </View>
        <Text style={{ fontSize: 11, fontWeight: '700', color: TX, flex: 1 }}>{t.zona}</Text>
      </View>
      <Text style={{ fontSize: 12, color: TX, marginBottom: 4 }}>{t.material}</Text>
      <Text style={{ fontSize: 11, color: T2, marginBottom: 3 }}>↳ {t.efecto}</Text>
      <Text style={{ fontSize: 10, color: T3 }}>💰 {t.costo}</Text>
    </View>
  )
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? AC : score >= 60 ? AM : score >= 40 ? '#ff8800' : RD
  return (
    <View
      style={{
        backgroundColor: `${color}0d`,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: `${color}25`,
        padding: 16,
        alignItems: 'center',
        marginBottom: 12,
      }}
    >
      <Text
        style={{
          fontSize: 9,
          fontWeight: '700',
          color: T3,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        Puntuación acústica global
      </Text>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 6 }}>
        <Text style={{ fontSize: 52, fontWeight: '900', color, lineHeight: 54, letterSpacing: -2 }}>
          {score}
        </Text>
        <View style={{ paddingBottom: 8 }}>
          <Text style={{ fontSize: 14, color: T2 }}>/100</Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color }}>{label}</Text>
        </View>
      </View>
      <View
        style={{
          width: '100%',
          height: 4,
          backgroundColor: C.glass2,
          borderRadius: 2,
          marginTop: 10,
        }}
      >
        <View
          style={{ width: `${score}%` as any, height: 4, borderRadius: 2, backgroundColor: color }}
        />
      </View>
    </View>
  )
}

export default function RoomScanScreen() {
  const router = useRouter()
  const setRoom = useAppStore((s) => s.setRoom)
  const saveScene = useAppStore((s) => s.saveScene)

  const [step, setStep] = useState(0)
  const [nombre, setNombre] = useState('')
  const [largo, setLargo] = useState('15')
  const [ancho, setAncho] = useState('10')
  const [alto, setAlto] = useState('5')
  const [cap, setCap] = useState('100')
  const [selTecho, setSelTecho] = useState(0)
  const [selPared, setSelPared] = useState(0)
  const [selPiso, setSelPiso] = useState(0)
  const [selVent, setSelVent] = useState(1)
  const [diagTab, setDiagTab] = useState<'diag' | 'frec' | 'trat'>('diag')

  const L = parseFloat(largo) || 15
  const A = parseFloat(ancho) || 10
  const H_ = parseFloat(alto) || 5
  const Cap = parseInt(cap, 10) || 100

  const partial: RoomData = {
    nombre: nombre || 'Recinto',
    largo: L,
    ancho: A,
    alto: H_,
    cap: Cap,
    matTecho: MAT_TECHO[selTecho]?.alpha ?? 0.06,
    matParedes: MAT_PAREDES[selPared]?.alpha ?? 0.03,
    matPiso: MAT_PISO[selPiso]?.alpha ?? 0.02,
    matVentanales: MAT_VENT[selVent]?.alpha ?? 0.08,
    rt60Empty: 0,
    rt60Full: 0,
    eco: 0,
    vol: 0,
  }
  const diag = diagnosRoom(partial)

  const goNext = () => {
    if (step === 0 && !nombre.trim()) {
      Alert.alert('Nombre', 'Ingresá el nombre del recinto')
      return
    }
    if (step < 2) {
      setStep(step + 1)
      return
    }
    const final: RoomData = {
      ...partial,
      rt60Empty: diag.rt60Empty,
      rt60Full: diag.rt60Full,
      eco: diag.eco,
      vol: diag.vol,
    }
    setRoom(final)
    saveScene(nombre)
    router.back()
  }

  const iStyle = {
    backgroundColor: C.glass,
    borderWidth: 0.5,
    borderColor: BR,
    borderRadius: 10,
    padding: 10,
    color: TX,
    fontSize: 13,
  } as const
  const sb = (active: boolean) =>
    ({
      backgroundColor: active ? `${AC}14` : C.glass,
      borderWidth: active ? 1 : 0.5,
      borderColor: active ? `${AC}40` : BR,
      borderRadius: 10,
      padding: 11,
      marginBottom: 7,
    }) as const

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 18, paddingTop: 20, paddingBottom: 120 }}
    >
      <Text
        style={{ fontSize: 30, fontWeight: '300', color: TX, letterSpacing: -1, marginBottom: 4 }}
      >
        Room{'\n'}
        <Text style={{ color: AC }}>Scan</Text>
      </Text>
      <Text style={{ fontSize: 11, color: T2, marginBottom: 18 }}>
        Diagnóstico acústico completo · 3 pasos
      </Text>

      {/* Steps bar */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 22 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 2.5,
              borderRadius: 2,
              backgroundColor: i <= step ? AC : BR,
              opacity: i === step ? 1 : i < step ? 0.8 : 0.2,
            }}
          />
        ))}
      </View>

      {/* ── PASO 0 ── */}
      {step === 0 && (
        <>
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Nombre del recinto
          </Text>
          <TextInput
            style={{ ...iStyle, marginBottom: 14 }}
            placeholder="Ej: Iglesia Central"
            placeholderTextColor={T3}
            value={nombre}
            onChangeText={setNombre}
          />

          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Dimensiones
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {[
              { l: 'Largo (mt)', v: largo, s: setLargo },
              { l: 'Ancho (mt)', v: ancho, s: setAncho },
              { l: 'Altura máx. (mt)', v: alto, s: setAlto },
              { l: 'Capacidad (pers.)', v: cap, s: setCap },
            ].map(({ l, v, s }) => (
              <View key={l} style={{ width: '47%' }}>
                <Text style={{ fontSize: 9, color: T2, marginBottom: 4 }}>{l}</Text>
                <TextInput
                  style={iStyle}
                  value={v}
                  onChangeText={s}
                  keyboardType="numeric"
                  placeholderTextColor={T3}
                />
              </View>
            ))}
          </View>

          {/* Live preview */}
          <View
            style={{
              backgroundColor: C.ac3,
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: 'rgba(26,255,110,0.15)',
              padding: 10,
              flexDirection: 'row',
              gap: 18,
              marginBottom: 14,
            }}
          >
            {[
              { l: 'RT60 vacío', v: `${diag.rt60Empty.toFixed(1)}s`, c: AC },
              { l: 'Volumen', v: `${diag.vol}m³`, c: PU },
              { l: 'Eco máx.', v: `${diag.eco}ms`, c: diag.eco > 50 ? RD : BL },
            ].map(({ l, v, c }) => (
              <View key={l}>
                <Text
                  style={{
                    fontSize: 8,
                    color: T3,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 2,
                  }}
                >
                  {l}
                </Text>
                <Text style={{ fontSize: 17, fontWeight: '700', color: c }}>{v}</Text>
              </View>
            ))}
          </View>

          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Tipo de techo
          </Text>
          {MAT_TECHO.map((m, i) => (
            <TouchableOpacity key={i} onPress={() => setSelTecho(i)} style={sb(selTecho === i)}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: selTecho === i ? AC : TX }}>
                {m.label}
              </Text>
              <Text style={{ fontSize: 10, color: T2, marginTop: 1 }}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </>
      )}

      {/* ── PASO 1 ── */}
      {step === 1 && (
        <>
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Material de paredes
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {MAT_PAREDES.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelPared(i)}
                style={{ ...sb(selPared === i), width: '47%', marginBottom: 0 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: selPared === i ? AC : TX }}>
                  {m.label}
                </Text>
                <Text style={{ fontSize: 10, color: T2, marginTop: 1 }}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            Material de piso
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {MAT_PISO.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelPiso(i)}
                style={{ ...sb(selPiso === i), width: '47%', marginBottom: 0 }}
              >
                <Text style={{ fontSize: 12, fontWeight: '600', color: selPiso === i ? AC : TX }}>
                  {m.label}
                </Text>
                <Text style={{ fontSize: 10, color: T2, marginTop: 1 }}>{m.desc}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 7,
            }}
          >
            ¿Ventanales laterales?
          </Text>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {MAT_VENT.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelVent(i)}
                style={{ ...sb(selVent === i), flex: 1, marginBottom: 0 }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: selVent === i ? AC : TX,
                    textAlign: 'center',
                  }}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </>
      )}

      {/* ── PASO 2 — Diagnóstico ── */}
      {step === 2 && (
        <>
          <ScoreGauge score={diag.score} label={diag.scoreLabel} />

          {/* Métricas 3×2 */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {[
              { l: 'RT60 vacío', v: `${diag.rt60Empty.toFixed(1)}s`, c: AC },
              {
                l: 'RT60 público',
                v: `${diag.rt60Full.toFixed(1)}s`,
                c: diag.rt60Full > 1.2 ? RD : diag.rt60Full > 0.8 ? AM : AC,
              },
              { l: 'Eco', v: `${diag.eco}ms`, c: diag.eco > 80 ? RD : diag.eco > 50 ? AM : BL },
              {
                l: 'STI',
                v: diag.sti.toFixed(2),
                c: diag.sti >= 0.65 ? AC : diag.sti >= 0.5 ? AM : RD,
              },
              { l: 'Volumen', v: `${diag.vol}m³`, c: PU },
              { l: 'Delay SUBs', v: `${diag.delaySubsMs}ms`, c: BL },
            ].map(({ l, v, c }) => (
              <View
                key={l}
                style={{
                  width: '30%',
                  backgroundColor: C.glass,
                  borderRadius: 12,
                  borderWidth: 0.5,
                  borderColor: BR,
                  padding: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 8,
                    fontWeight: '700',
                    color: T3,
                    letterSpacing: 0.8,
                    textTransform: 'uppercase',
                    marginBottom: 4,
                  }}
                >
                  {l}
                </Text>
                <Text style={{ fontSize: 16, fontWeight: '700', color: c }}>{v}</Text>
              </View>
            ))}
          </View>

          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Distribución SPL estimada
          </Text>
          <SPLMap L={L} A={A} />

          {/* Tabs */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 12, marginTop: 4 }}>
            {[
              { k: 'diag', l: '🔍 Diagnóstico' },
              { k: 'frec', l: '🎵 Frecuencias' },
              { k: 'trat', l: '🔧 Tratamiento' },
            ].map(({ k, l }) => (
              <TouchableOpacity
                key={k}
                onPress={() => setDiagTab(k as any)}
                style={{
                  flex: 1,
                  paddingVertical: 7,
                  borderRadius: 20,
                  alignItems: 'center',
                  borderWidth: diagTab === k ? 1 : 0.5,
                  borderColor: diagTab === k ? 'rgba(26,255,110,0.3)' : BR,
                  backgroundColor: diagTab === k ? C.ac2 : 'transparent',
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: diagTab === k ? AC : T2 }}>
                  {l}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {diagTab === 'diag' && diag.items.map((item) => <DiagCard key={item.id} item={item} />)}

          {diagTab === 'frec' && (
            <View>
              <Text style={{ fontSize: 11, color: T2, lineHeight: 17, marginBottom: 12 }}>
                Modos axiales — frecuencias donde el sonido se refuerza naturalmente por las
                dimensiones del recinto.
              </Text>
              {diag.problemFreqs.map((f) => {
                const fc = f.sev === 'ok' ? AC : f.sev === 'warn' ? AM : RD
                return (
                  <View
                    key={f.hz}
                    style={{
                      backgroundColor: C.glass,
                      borderRadius: 12,
                      borderWidth: 0.5,
                      borderColor: BR,
                      borderLeftWidth: 3,
                      borderLeftColor: fc,
                      padding: 12,
                      marginBottom: 7,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 5,
                      }}
                    >
                      <View
                        style={{
                          paddingHorizontal: 8,
                          paddingVertical: 3,
                          borderRadius: 20,
                          backgroundColor: `${fc}18`,
                          borderWidth: 0.5,
                          borderColor: `${fc}40`,
                        }}
                      >
                        <Text style={{ fontSize: 11, fontWeight: '800', color: fc }}>
                          {f.hz} Hz
                        </Text>
                      </View>
                      <Text style={{ fontSize: 11, fontWeight: '600', color: TX, flex: 1 }}>
                        {f.label.split('—')[1]?.trim()}
                      </Text>
                    </View>
                    <Text style={{ fontSize: 11, color: T2, lineHeight: 16 }}>{f.desc}</Text>
                  </View>
                )
              })}
              <View
                style={{
                  backgroundColor: C.ac3,
                  borderRadius: 10,
                  borderWidth: 0.5,
                  borderColor: 'rgba(26,255,110,0.15)',
                  padding: 12,
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 10, fontWeight: '700', color: AC, marginBottom: 4 }}>
                  → En el DCX2496
                </Text>
                <Text style={{ fontSize: 11, color: T2, lineHeight: 17 }}>
                  Verificar los peaks del EQ de SUBs en estas frecuencias. Cortes de −1 a −2dB en
                  los modos problemáticos mejoran la uniformidad del campo sonoro.
                </Text>
              </View>
            </View>
          )}

          {diagTab === 'trat' && (
            <View>
              {diag.tratamiento.length === 0 ? (
                <View
                  style={{
                    backgroundColor: C.ac2,
                    borderRadius: 12,
                    borderWidth: 0.5,
                    borderColor: 'rgba(26,255,110,0.2)',
                    padding: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ fontSize: 22, marginBottom: 8 }}>✓</Text>
                  <Text style={{ fontSize: 13, fontWeight: '700', color: AC }}>
                    Sala en buen estado acústico
                  </Text>
                  <Text style={{ fontSize: 11, color: T2, marginTop: 4, textAlign: 'center' }}>
                    No se detectaron problemas que requieran tratamiento inmediato.
                  </Text>
                </View>
              ) : (
                <>
                  <Text style={{ fontSize: 11, color: T2, lineHeight: 17, marginBottom: 12 }}>
                    Sugerencias ordenadas por prioridad. Costos son referenciales en USD.
                  </Text>
                  {diag.tratamiento.map((t, i) => (
                    <TratCard key={i} t={t} />
                  ))}
                </>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={() => saveScene(nombre)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              marginTop: 12,
              paddingHorizontal: 14,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor: C.ac2,
              borderWidth: 0.5,
              borderColor: 'rgba(26,255,110,0.3)',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: AC }}>💾 Guardar escenario</Text>
          </TouchableOpacity>
        </>
      )}

      {/* Nav buttons */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
        <TouchableOpacity
          onPress={() => (step > 0 ? setStep(step - 1) : router.back())}
          style={{
            paddingHorizontal: 18,
            paddingVertical: 13,
            borderRadius: 13,
            borderWidth: 0.5,
            borderColor: BR,
            backgroundColor: C.glass,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '500', color: TX }}>
            {step > 0 ? 'Atrás' : 'Cancelar'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={goNext}
          style={{
            flex: 1,
            paddingVertical: 13,
            borderRadius: 13,
            backgroundColor: AC,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#000' }}>
            {step < 2 ? 'Siguiente →' : 'Aplicar →'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
