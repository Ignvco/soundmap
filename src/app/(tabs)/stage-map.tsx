import { useAppStore } from '@/store/app';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

const AC = '#1aff6e',
  BG = '#06060a',
  SF = '#111118'
const BR = 'rgba(255,255,255,0.07)',
  TX = '#f0f0f0',
  T2 = '#8888a0',
  T3 = '#44445a'
const AM = '#fbbf24'

type Esc = '15mt' | '10mt'
type Pos = 'sobre' | 'tripodes'

function MapSVG({ esc, pos }: { esc: Esc; pos: Pos }) {
  const W = 340,
    H = 210
  const isLong = esc === '15mt'
  const sw = isLong ? 285 : 195,
    sh = isLong ? 158 : 192
  const sx = (W - sw) / 2,
    sy = 14
  const tipX = sx + sw / 2
  const tIzqX = sx + 38,
    tDerX = sx + sw - 38
  const topY = isLong ? 74 : 80
  const subY = sy + sh - 28

  return (
    <Svg width={W} height={H}>
      <Rect width={W} height={H} fill="#06060a" />
      <Rect
        x={sx}
        y={sy}
        width={sw}
        height={sh}
        fill="#111118"
        stroke="rgba(255,255,255,0.08)"
        strokeWidth={0.5}
        rx={6}
      />
      <Rect
        x={sx}
        y={sy}
        width={sw}
        height={sh * 0.2}
        fill="rgba(26,255,110,0.03)"
        stroke="rgba(26,255,110,0.07)"
        strokeWidth={0.5}
      />
      <SvgText
        x={tipX}
        y={sy + sh * 0.12}
        textAnchor="middle"
        fill={T3}
        fontSize={8}
        fontFamily="Inter"
      >
        ESCENARIO · {isLong ? '15' : '10'}mt
      </SvgText>
      <SvgText
        x={tipX}
        y={sy + sh * 0.65}
        textAnchor="middle"
        fill="rgba(255,255,255,0.07)"
        fontSize={10}
        fontFamily="Inter"
      >
        PÚBLICO
      </SvgText>
      <Polygon
        points={`${tIzqX},${topY + 10} ${sx + 14},${subY + 16} ${tipX - 5},${subY + 16}`}
        fill="rgba(26,255,110,0.05)"
      />
      <Polygon
        points={`${tDerX},${topY + 10} ${sx + sw - 14},${subY + 16} ${tipX + 5},${subY + 16}`}
        fill="rgba(26,255,110,0.05)"
      />
      <Rect
        x={tipX - 22}
        y={subY - 7}
        width={44}
        height={22}
        rx={5}
        fill="#0e0e1a"
        stroke={AM}
        strokeWidth={1.2}
      />
      <SvgText
        x={tipX}
        y={subY + 7}
        textAnchor="middle"
        fill={AM}
        fontSize={7}
        fontWeight="600"
        fontFamily="Inter"
      >
        AIR18×2
      </SvgText>
      {pos === 'sobre' ? (
        <>
          <Rect
            x={tIzqX - 13}
            y={topY - 4}
            width={26}
            height={18}
            rx={4}
            fill="#0e0e1a"
            stroke={AC}
            strokeWidth={1.5}
          />
          <Circle cx={tIzqX} cy={topY + 5} r={4} fill="none" stroke={AC} strokeWidth={1} />
          <Rect
            x={tDerX - 13}
            y={topY - 4}
            width={26}
            height={18}
            rx={4}
            fill="#0e0e1a"
            stroke={AC}
            strokeWidth={1.5}
          />
          <Circle cx={tDerX} cy={topY + 5} r={4} fill="none" stroke={AC} strokeWidth={1} />
        </>
      ) : (
        <>
          <Line
            x1={tIzqX}
            y1={sy + 50}
            x2={tIzqX}
            y2={sy + 70}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5}
          />
          <Rect
            x={tIzqX - 13}
            y={topY - 10}
            width={26}
            height={16}
            rx={4}
            fill="#0e0e1a"
            stroke={AC}
            strokeWidth={1.5}
          />
          <Line
            x1={tDerX}
            y1={sy + 50}
            x2={tDerX}
            y2={sy + 70}
            stroke="rgba(255,255,255,0.15)"
            strokeWidth={1.5}
          />
          <Rect
            x={tDerX - 13}
            y={topY - 10}
            width={26}
            height={16}
            rx={4}
            fill="#0e0e1a"
            stroke={AC}
            strokeWidth={1.5}
          />
        </>
      )}
      <SvgText
        x={tIzqX}
        y={topY - 17}
        textAnchor="middle"
        fill={AC}
        fontSize={7}
        fontWeight="700"
        fontFamily="Inter"
      >
        RCF
      </SvgText>
      <SvgText
        x={tDerX}
        y={topY - 17}
        textAnchor="middle"
        fill={AC}
        fontSize={7}
        fontWeight="700"
        fontFamily="Inter"
      >
        RCF
      </SvgText>
    </Svg>
  )
}

export default function StageMapScreen() {
  const [esc, setEsc] = useState<Esc>('15mt')
  const [pos, setPos] = useState<Pos>('sobre')
  const { activePreset } = useAppStore()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          color: TX,
          marginBottom: 16,
          letterSpacing: -0.5,
        }}
      >
        Stage Map
      </Text>

      <View
        style={{
          backgroundColor: SF,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: BR,
          overflow: 'hidden',
          marginBottom: 10,
        }}
      >
        <MapSVG esc={esc} pos={pos} />
        <View
          style={{
            padding: 10,
            flexDirection: 'row',
            gap: 6,
            flexWrap: 'wrap',
            borderTopWidth: 0.5,
            borderTopColor: BR,
          }}
        >
          {(['15mt', '10mt'] as Esc[]).map((e) => (
            <TouchableOpacity
              key={e}
              onPress={() => setEsc(e)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: esc === e ? 'rgba(26,255,110,0.3)' : BR,
                backgroundColor: esc === e ? 'rgba(26,255,110,0.08)' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: esc === e ? AC : T2 }}>
                Esc. {e}
              </Text>
            </TouchableOpacity>
          ))}
          {(['sobre', 'tripodes'] as Pos[]).map((p) => (
            <TouchableOpacity
              key={p}
              onPress={() => setPos(p)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 5,
                borderRadius: 20,
                borderWidth: 0.5,
                borderColor: pos === p ? 'rgba(26,255,110,0.3)' : BR,
                backgroundColor: pos === p ? 'rgba(26,255,110,0.08)' : 'transparent',
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: '600', color: pos === p ? AC : T2 }}>
                {p === 'sobre' ? 'Sobre subs' : 'Trípodes'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      <View style={{ flexDirection: 'row', gap: 8 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: SF,
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: BR,
            padding: 12,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              color: T3,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Tilt TOPs
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: AC }}>
            {esc === '15mt' ? '10°–15°' : '8°–12°'}
          </Text>
        </View>
        <View
          style={{
            flex: 1,
            backgroundColor: SF,
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: BR,
            padding: 12,
          }}
        >
          <Text
            style={{
              fontSize: 9,
              color: T3,
              letterSpacing: 1,
              textTransform: 'uppercase',
              marginBottom: 4,
            }}
          >
            Crossover
          </Text>
          <Text style={{ fontSize: 15, fontWeight: '700', color: AC }}>
            {activePreset?.crossoverHz ?? 80} Hz LR24
          </Text>
        </View>
      </View>
    </ScrollView>
  )
}
