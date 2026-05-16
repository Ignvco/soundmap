import { C } from '@/constants/theme';
import { useAppStore, type RoomData } from '@/store/app';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Polygon, Rect, Text as SvgText } from 'react-native-svg';

const AC = C.ac,
  BG = C.bg,
  SF = C.bg2,
  BR = C.br2
const TX = C.tx,
  T2 = C.t2,
  T3 = C.t3
const AM = C.am,
  RD = C.rd,
  BL = C.bl,
  PU = C.pu

// ── Materiales ─────────────────────────────────────────
const MAT_TECHO = [
  { label: 'Triangular / A', alpha: 0.06, desc: 'Cumbrera — riesgo eco' },
  { label: 'Plano', alpha: 0.05, desc: 'Estándar' },
  { label: 'Curvo / Bóveda', alpha: 0.08, desc: 'Focalización de sonido' },
  { label: 'Irregular', alpha: 0.15, desc: 'Absorción variable' },
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
  { label: 'Madera flotante', alpha: 0.05, desc: 'α=0.05 · Reflexión media' },
  { label: 'Alfombra gruesa', alpha: 0.35, desc: 'α=0.35 · Muy absorbente' },
  { label: 'Cerámico', alpha: 0.02, desc: 'α=0.02 · Alta reflexión' },
]
const MAT_VENTANALES = [
  { label: 'Sin ventanales', alpha: 0 },
  { label: 'Parciales', alpha: 0.08 },
  { label: 'Toda la pared', alpha: 0.2 },
]

// ── Cálculo RT60 (Sabine) ──────────────────────────────
function calcRT60(
  L: number,
  A: number,
  H: number,
  Cap: number,
  alpTecho: number,
  alpParedes: number,
  alpPiso: number,
  alpVent: number
) {
  const vol = L * A * H
  const sPared = 2 * (L * H + A * H)
  const sPiso = L * A
  const sTecho = L * A
  const sTotal = sPared + sPiso + sTecho
  const abs = sPared * alpParedes + sPiso * alpPiso + sTecho * alpTecho + sTotal * alpVent
  const rt60e = (0.161 * vol) / abs
  const rt60f = (0.161 * vol) / (abs + Cap * 0.42)
  const eco = Math.round(((Math.max(L, A) * 2) / 343) * 1000)
  return { vol, rt60e, rt60f, eco }
}

// ── SPL Map SVG ────────────────────────────────────────
function SPLMap({ L, A }: { L: number; A: number }) {
  const W = 300,
    H = 100,
    pad = 16
  const sw = W - pad * 2,
    sh = H - 20
  const tipX = pad + sw / 2
  const tIzqX = pad + 36,
    tDerX = pad + sw - 36
  const topY = sh * 0.3,
    subY = H - 24

  const zones = Math.min(7, Math.round(Math.max(L, A)))
  const colors = [
    'rgba(26,255,110,',
    'rgba(100,255,80,',
    'rgba(180,255,60,',
    'rgba(251,191,36,',
    'rgba(255,140,0,',
    'rgba(255,80,0,',
    'rgba(255,77,77,',
  ]

  return (
    <View style={{ marginBottom: 8 }}>
      <Text
        style={{
          fontSize: 9,
          fontWeight: '700',
          color: T3,
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Distribución de presión sonora
      </Text>
      <View
        style={{
          backgroundColor: '#080810',
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: BR,
          overflow: 'hidden',
          padding: 8,
        }}
      >
        <Svg width={W} height={H}>
          {/* Sala */}
          <Rect
            x={pad}
            y={12}
            width={sw}
            height={sh}
            fill="#0a0a14"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth={0.5}
            rx={4}
          />
          {/* Escenario */}
          <Rect
            x={pad}
            y={12}
            width={sw}
            height={sh * 0.2}
            fill="rgba(26,255,110,0.04)"
            stroke="rgba(26,255,110,0.08)"
            strokeWidth={0.5}
          />
          <SvgText
            x={tipX}
            y={12 + sh * 0.14}
            textAnchor="middle"
            fill={T3}
            fontSize={6}
            fontFamily="Inter"
          >
            ESCENARIO
          </SvgText>
          {/* SPL zonas */}
          {Array.from({ length: zones }, (_, i) => {
            const zH = (sh * 0.8) / zones
            const y = 12 + sh * 0.2 + i * zH
            const alpha = 0.1 + i * 0.04
            return (
              <Rect
                key={i}
                x={pad}
                y={y}
                width={sw}
                height={zH + 1}
                fill={`${colors[Math.min(i, colors.length - 1)]}${alpha})`}
              />
            )
          })}
          {/* TOPs */}
          <Rect
            x={tIzqX - 11}
            y={topY - 3}
            width={22}
            height={14}
            rx={3}
            fill="#0e0e1a"
            stroke={AC}
            strokeWidth={1.4}
          />
          <Circle cx={tIzqX} cy={topY + 4} r={4} fill="none" stroke={AC} strokeWidth={0.8} />
          <Rect
            x={tDerX - 11}
            y={topY - 3}
            width={22}
            height={14}
            rx={3}
            fill="#0e0e1a"
            stroke={AC}
            strokeWidth={1.4}
          />
          <Circle cx={tDerX} cy={topY + 4} r={4} fill="none" stroke={AC} strokeWidth={0.8} />
          <SvgText
            x={tIzqX}
            y={topY - 6}
            textAnchor="middle"
            fill={AC}
            fontSize={6}
            fontWeight="700"
          >
            RCF
          </SvgText>
          <SvgText
            x={tDerX}
            y={topY - 6}
            textAnchor="middle"
            fill={AC}
            fontSize={6}
            fontWeight="700"
          >
            RCF
          </SvgText>
          {/* SUBs */}
          <Rect
            x={tipX - 16}
            y={subY - 5}
            width={32}
            height={14}
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
            fontSize={6}
            fontWeight="600"
          >
            AIR18×2
          </SvgText>
          {/* Coverage */}
          <Polygon
            points={`${tIzqX},${topY + 11} ${pad + 4},${H - 6} ${tipX - 4},${H - 6}`}
            fill="rgba(26,255,110,0.05)"
          />
          <Polygon
            points={`${tDerX},${topY + 11} ${pad + sw - 4},${H - 6} ${tipX + 4},${H - 6}`}
            fill="rgba(26,255,110,0.05)"
          />
        </Svg>
      </View>
      {/* Leyenda */}
      <View style={{ flexDirection: 'row', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
        {[
          { color: AC, label: 'Alto >100dB' },
          { color: AM, label: 'Medio 85-100dB' },
          { color: PU, label: 'Bajo <85dB' },
        ].map((l) => (
          <View key={l.label} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <View style={{ width: 10, height: 3, borderRadius: 2, backgroundColor: l.color }} />
            <Text style={{ fontSize: 9, color: T2 }}>{l.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

// ── Prediagnóstico item ────────────────────────────────
function PredItem({
  status,
  title,
  porq,
  paraq,
  como,
}: {
  status: 'ok' | 'warn' | 'bad'
  title: string
  porq: string
  paraq: string
  como: string
}) {
  const [open, setOpen] = useState(false)
  const colors = { ok: AC, warn: AM, bad: RD }
  const bgs = { ok: C.ac2, warn: C.am2, bad: C.rd2 }
  const color = colors[status]
  const bg = bgs[status]

  return (
    <View
      style={{
        backgroundColor: C.glass,
        borderWidth: 0.5,
        borderColor: BR,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 8,
      }}
    >
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        style={{
          padding: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
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
        <Text style={{ fontSize: 13, fontWeight: '600', color, flex: 1 }}>{title}</Text>
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
            { label: '¿Por qué?', text: porq },
            { label: '¿Para qué importa?', text: paraq },
            { label: '¿Cómo resolverlo?', text: como },
          ].map(({ label, text }) => (
            <View key={label}>
              <Text
                style={{
                  fontSize: 9,
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

// ── MAIN SCREEN ────────────────────────────────────────
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

  // ── Calculated diag ────────────────────────────────
  const L = parseFloat(largo) || 15
  const A = parseFloat(ancho) || 10
  const H = parseFloat(alto) || 5
  const Cap = parseInt(cap, 10) || 100

  const diag = calcRT60(
    L,
    A,
    H,
    Cap,
    MAT_TECHO[selTecho]?.alpha ?? 0.06,
    MAT_PAREDES[selPared]?.alpha ?? 0.03,
    MAT_PISO[selPiso]?.alpha ?? 0.02,
    MAT_VENTANALES[selVent]?.alpha ?? 0.08
  )

  const buildPredItems = () => {
    const items: React.ComponentProps<typeof PredItem>[] = []
    const { rt60f, eco, vol } = diag
    const relacion = Math.max(L, A) / Math.min(L, A)
    const volPP = vol / Cap

    // RT60
    if (rt60f < 0.5)
      items.push({
        status: 'warn',
        title: 'RT60 muy bajo — sala sorda',
        porq: `RT60 de ${rt60f.toFixed(1)}s indica que la sala absorbe demasiado.`,
        paraq: 'La música sonará apagada sin presencia. Las voces perderán naturalidad.',
        como: 'Reducir tratamiento acústico o agregar superficies reflectantes controladas.',
      })
    else if (rt60f < 0.9)
      items.push({
        status: 'ok',
        title: 'RT60 óptimo para voz hablada',
        porq: `RT60 de ${rt60f.toFixed(1)}s ideal para habla y predicación.`,
        paraq: 'Excelente inteligibilidad. El público comprenderá con claridad.',
        como: 'Mantener la configuración actual. Verificar tratamiento homogéneo.',
      })
    else if (rt60f < 1.3)
      items.push({
        status: 'warn',
        title: 'RT60 moderado — ajuste necesario',
        porq: `RT60 de ${rt60f.toFixed(1)}s genera reverberación audible.`,
        paraq: 'Inteligibilidad reducida. La música sonará densa en medios.',
        como: 'Cortar 200–400Hz en voces. Reducir volumen 3–4dB. Agregar alfombras o cortinas.',
      })
    else
      items.push({
        status: 'bad',
        title: 'RT60 crítico — sala muy reverberante',
        porq: `RT60 de ${rt60f.toFixed(1)}s excesivo para amplificación.`,
        paraq: 'El sonido se acumulará. Pérdida total de inteligibilidad en volúmenes altos.',
        como: 'Tratamiento acústico urgente: paneles, alfombra, cortinas. Reducir volumen del PA.',
      })

    // Eco
    if (eco > 80)
      items.push({
        status: 'bad',
        title: 'Eco de pared trasera audible',
        porq: `Eco de ${eco}ms perceptible como repetición separada.`,
        paraq: 'Destruye la inteligibilidad y la imagen estéreo.',
        como: 'Panel absorbente en pared trasera. Reducir ganancia de TOPs. Considerar delay speakers.',
      })
    else if (eco > 50)
      items.push({
        status: 'warn',
        title: 'Eco de pared trasera leve',
        porq: `Eco de ${eco}ms en el umbral de percepción.`,
        paraq: 'Con volumen alto puede volverse molesto.',
        como: 'Material absorbente (cortina gruesa) en la pared trasera.',
      })
    else
      items.push({
        status: 'ok',
        title: 'Eco de pared trasera controlado',
        porq: `Eco de ${eco}ms — bajo el umbral de percepción (40ms).`,
        paraq: 'El sonido reflejado llega dentro del tiempo de integración del oído.',
        como: 'No se requiere tratamiento. Mantener configuración actual.',
      })

    // Proporciones
    if (relacion > 2.5)
      items.push({
        status: 'bad',
        title: 'Relación largo/ancho problemática',
        porq: `Relación ${relacion.toFixed(1)}:1 genera modos axiales graves fuertes.`,
        paraq: 'Acumulación de bajos en frecuencias de resonancia. Sonido irregular.',
        como: 'Material absorbente de graves en paredes cortas. EQ correctivo en sub-graves.',
      })
    else if (relacion < 1.3)
      items.push({
        status: 'warn',
        title: 'Sala casi cuadrada — modos complejos',
        porq: `Proporción ${relacion.toFixed(1)}:1 — modos coincidentes que se amplifican.`,
        paraq: 'Puntos de alta y baja presión sonora irregulares.',
        como: 'Tratamiento asimétrico. Difusores en paredes paralelas.',
      })
    else
      items.push({
        status: 'ok',
        title: 'Proporciones de sala adecuadas',
        porq: `Relación ${relacion.toFixed(1)}:1 dentro del rango recomendado.`,
        paraq: 'Los modos se distribuyen uniformemente. Buenas condiciones base.',
        como: 'Optimizar con tratamiento puntual en zonas de reflexión temprana.',
      })

    // Volumen por persona
    if (volPP < 3)
      items.push({
        status: 'warn',
        title: 'Poco volumen por persona',
        porq: `${volPP.toFixed(1)} m³ por persona — absorción con sala llena será alta.`,
        paraq: 'Con sala llena el RT60 bajará considerablemente.',
        como: 'Calibrar con sala llena. Prever +2 a +4dB en agudos cuando haya público.',
      })
    else
      items.push({
        status: 'ok',
        title: 'Volumen acústico por persona correcto',
        porq: `${volPP.toFixed(1)} m³ por persona — buena relación espacial.`,
        paraq: 'La absorción del público no alterará drásticamente las condiciones.',
        como: 'Hacer ajustes finos con sala llena.',
      })

    return items
  }

  // ── Navigation ─────────────────────────────────────
  const goNext = () => {
    if (step === 0) {
      if (!nombre.trim()) {
        Alert.alert('Nombre', 'Ingresá el nombre del recinto')
        return
      }
      setStep(1)
    } else if (step === 1) {
      setStep(2)
    } else {
      // Save and go back
      const roomData: RoomData = {
        nombre: nombre || 'Recinto',
        largo: L,
        ancho: A,
        alto: H,
        cap: Cap,
        matTecho: MAT_TECHO[selTecho]?.alpha ?? 0.06,
        matParedes: MAT_PAREDES[selPared]?.alpha ?? 0.03,
        matPiso: MAT_PISO[selPiso]?.alpha ?? 0.02,
        matVentanales: MAT_VENTANALES[selVent]?.alpha ?? 0.08,
        rt60Empty: diag.rt60e,
        rt60Full: diag.rt60f,
        eco: diag.eco,
        vol: diag.vol,
      }
      setRoom(roomData)
      saveScene(nombre)
      router.back()
    }
  }

  const goBack = () => {
    if (step > 0) setStep(step - 1)
    else router.back()
  }

  // ── Shared styles ──────────────────────────────────
  const inputStyle = {
    backgroundColor: C.glass,
    borderWidth: 0.5,
    borderColor: BR,
    borderRadius: 11,
    padding: 11,
    color: TX,
    fontSize: 14,
    fontFamily: 'System',
  } as const

  const selBtn = (active: boolean, color = AC) =>
    ({
      backgroundColor: active ? `${color}18` : C.glass,
      borderWidth: active ? 1 : 0.5,
      borderColor: active ? `${color}40` : BR,
      borderRadius: 10,
      padding: 11,
      marginBottom: 7,
    }) as const

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 18, paddingTop: 24, paddingBottom: 120 }}
    >
      {/* Header */}
      <Text
        style={{
          fontFamily: 'serif',
          fontSize: 32,
          fontWeight: '300',
          color: TX,
          letterSpacing: -1,
          marginBottom: 4,
          lineHeight: 34,
        }}
      >
        Room{'\n'}
        <Text style={{ color: AC }}>Scan</Text>
      </Text>
      <Text style={{ fontSize: 12, color: T2, marginBottom: 20 }}>
        Diagnóstico acústico completo
      </Text>

      {/* Steps indicator */}
      <View style={{ flexDirection: 'row', gap: 5, marginBottom: 22 }}>
        {[0, 1, 2].map((i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 2.5,
              borderRadius: 2,
              backgroundColor: i < step ? AC : i === step ? AC : BR,
              opacity: i < step ? 1 : i === step ? 1 : 0.3,
              shadowColor: i <= step ? AC : 'transparent',
              shadowRadius: i <= step ? 4 : 0,
              shadowOpacity: 0.5,
            }}
          />
        ))}
      </View>

      {/* ── STEP 0: Dimensiones ── */}
      {step === 0 && (
        <View>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Nombre del recinto
          </Text>
          <TextInput
            style={{ ...inputStyle, marginBottom: 14 }}
            placeholder="Ej: Iglesia Central"
            placeholderTextColor={T3}
            value={nombre}
            onChangeText={setNombre}
          />

          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Dimensiones
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 }}>
            {[
              { label: 'Largo (mt)', value: largo, set: setLargo },
              { label: 'Ancho (mt)', value: ancho, set: setAncho },
              { label: 'Altura máx. (mt)', value: alto, set: setAlto },
              { label: 'Capacidad (pers.)', value: cap, set: setCap },
            ].map(({ label, value, set }) => (
              <View key={label} style={{ width: '47%' }}>
                <Text style={{ fontSize: 9, color: T2, marginBottom: 4 }}>{label}</Text>
                <TextInput
                  style={inputStyle}
                  value={value}
                  onChangeText={set}
                  keyboardType="numeric"
                  placeholderTextColor={T3}
                />
              </View>
            ))}
          </View>

          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Tipo de techo
          </Text>
          {MAT_TECHO.map((m, i) => (
            <TouchableOpacity key={i} onPress={() => setSelTecho(i)} style={selBtn(selTecho === i)}>
              <Text style={{ fontSize: 12, fontWeight: '600', color: selTecho === i ? AC : TX }}>
                {m.label}
              </Text>
              <Text style={{ fontSize: 10, color: T2, marginTop: 1 }}>{m.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── STEP 1: Materiales ── */}
      {step === 1 && (
        <View>
          <Text
            style={{
              fontSize: 10,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Material de paredes
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {MAT_PAREDES.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelPared(i)}
                style={{
                  ...selBtn(selPared === i),
                  width: '47%',
                  marginBottom: 0,
                }}
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
              fontSize: 10,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            Material de piso
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 14 }}>
            {MAT_PISO.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelPiso(i)}
                style={{
                  ...selBtn(selPiso === i),
                  width: '47%',
                  marginBottom: 0,
                }}
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
              fontSize: 10,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            ¿Ventanales laterales?
          </Text>
          <View style={{ flexDirection: 'row', gap: 7 }}>
            {MAT_VENTANALES.map((m, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => setSelVent(i)}
                style={{ ...selBtn(selVent === i), flex: 1, marginBottom: 0 }}
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
        </View>
      )}

      {/* ── STEP 2: Diagnóstico ── */}
      {step === 2 && (
        <View>
          {/* Métricas */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
            {[
              { label: 'RT60 vacío', value: diag.rt60e.toFixed(1), unit: 'seg', color: AC },
              {
                label: 'RT60 público',
                value: diag.rt60f.toFixed(1),
                unit: 'seg',
                color: diag.rt60f > 1.2 ? RD : diag.rt60f > 0.8 ? AM : AC,
              },
              {
                label: 'Eco pared',
                value: String(diag.eco),
                unit: 'ms',
                color: diag.eco > 80 ? RD : diag.eco > 50 ? AM : BL,
              },
              { label: 'Volumen', value: String(diag.vol), unit: 'm³', color: PU },
            ].map(({ label, value, unit, color }) => (
              <View
                key={label}
                style={{
                  width: '47%',
                  backgroundColor: C.glass,
                  borderRadius: 12,
                  borderWidth: 0.5,
                  borderColor: BR,
                  padding: 13,
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '700',
                    color: T3,
                    letterSpacing: 1,
                    textTransform: 'uppercase',
                    marginBottom: 5,
                  }}
                >
                  {label}
                </Text>
                <Text style={{ fontSize: 20, fontWeight: '700', color, lineHeight: 22 }}>
                  {value}
                </Text>
                <Text style={{ fontSize: 10, color: T3, marginTop: 2 }}>{unit}</Text>
              </View>
            ))}
          </View>

          {/* SPL Map */}
          <SPLMap L={L} A={A} />

          {/* Prediagnóstico */}
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              color: T3,
              letterSpacing: 1.2,
              textTransform: 'uppercase',
              marginBottom: 10,
              marginTop: 4,
            }}
          >
            Prediagnóstico acústico
          </Text>
          {buildPredItems().map((item, i) => (
            <PredItem key={i} {...item} />
          ))}

          {/* Guardar */}
          <TouchableOpacity
            onPress={() => saveScene(nombre)}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 6,
              alignSelf: 'flex-start',
              marginTop: 4,
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
        </View>
      )}

      {/* ── Buttons ── */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 24 }}>
        {step > 0 && (
          <TouchableOpacity
            onPress={goBack}
            style={{
              paddingHorizontal: 18,
              paddingVertical: 13,
              borderRadius: 13,
              borderWidth: 0.5,
              borderColor: BR,
              backgroundColor: C.glass,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '500', color: TX }}>Atrás</Text>
          </TouchableOpacity>
        )}
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
