import { useAppStore } from '@/store/app';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import Svg, { Ellipse, Line, Polygon, Rect, Text as SvgText } from 'react-native-svg';

type MapView = 'frontal' | 'planta'
type TOPPos = 'sobre_subs' | 'tripodes'
type Escenario = '15mt' | '10mt'

const AC = '#C00020'
const SUB_COLOR = '#C88000'

export default function StageMapScreen() {
  const room = useAppStore((s) => s.room)
  const gear = useAppStore((s) => s.gear)
  const scheme = useColorScheme()
  const isDark = scheme === 'dark'

  const [view, setView] = useState<MapView>('frontal')
  const [pos, setPos] = useState<TOPPos>('sobre_subs')
  const [esc, setEsc] = useState<Escenario>('15mt')

  const tilt = esc === '15mt' ? '10°–15°' : '8°–12°'
  const delay = pos === 'sobre_subs' ? '~0 ms' : 'Medir con cinta'
  const topName = gear?.top.nombre.split(' ').slice(0, 3).join(' ') ?? 'TOP'
  const subName = gear?.sub.nombre.split(' ').slice(0, 2).join(' ') ?? 'SUB'

  const bg = isDark ? '#1a1a1a' : '#f7f7f5'
  const sala = isDark ? '#222' : '#fff'
  const stg = isDark ? '#2a1f0a' : '#fdf5e6'
  const wall = isDark ? '#2a2010' : '#f0e8d0'
  const win = isDark ? '#0a1a2a' : '#e8f4ff'
  const brd = isDark ? '#333' : '#e0e0d8'
  const lbl = isDark ? '#666' : '#999'

  const W = 340,
    H = 200
  const isLong = esc === '15mt'
  const sw = isLong ? 280 : 190
  const sh = isLong ? 150 : 190
  const sx = (W - sw) / 2,
    sy = 18
  const tipX = sx + sw / 2
  const tIzqX = sx + 36,
    tDerX = sx + sw - 36
  const topY = isLong ? 78 : 82
  const subY = sy + sh - 28

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: isDark ? '#111' : '#fff' }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text
        style={{
          fontSize: 22,
          fontWeight: '800',
          color: isDark ? '#e8e8e0' : '#111110',
          marginBottom: 16,
        }}
      >
        Stage Map
      </Text>

      {/* Selectores */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
        {(['15mt', '10mt'] as Escenario[]).map((e) => (
          <TouchableOpacity
            key={e}
            onPress={() => setEsc(e)}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              alignItems: 'center',
              borderWidth: esc === e ? 1.5 : 0.5,
              borderColor: esc === e ? AC : '#e8e8e4',
              backgroundColor: esc === e ? '#fff0f0' : '#fff',
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '600', color: esc === e ? AC : '#6b6b68' }}>
              Esc. {e}
            </Text>
          </TouchableOpacity>
        ))}
        {(['sobre_subs', 'tripodes'] as TOPPos[]).map((p) => (
          <TouchableOpacity
            key={p}
            onPress={() => setPos(p)}
            style={{
              flex: 1,
              padding: 8,
              borderRadius: 8,
              alignItems: 'center',
              borderWidth: pos === p ? 1.5 : 0.5,
              borderColor: pos === p ? AC : '#e8e8e4',
              backgroundColor: pos === p ? '#fff0f0' : '#fff',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '600', color: pos === p ? AC : '#6b6b68' }}>
              {p === 'sobre_subs' ? 'Sobre subs' : 'Trípodes'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab vista */}
      <View
        style={{
          flexDirection: 'row',
          borderRadius: 8,
          overflow: 'hidden',
          borderWidth: 0.5,
          borderColor: '#e8e8e4',
          marginBottom: 10,
        }}
      >
        {(['frontal', 'planta'] as MapView[]).map((v) => (
          <TouchableOpacity
            key={v}
            onPress={() => setView(v)}
            style={{
              flex: 1,
              padding: 8,
              alignItems: 'center',
              backgroundColor: view === v ? '#fff0f0' : '#fff',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: view === v ? AC : '#6b6b68',
                textTransform: 'capitalize',
              }}
            >
              Vista {v}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* SVG MAP */}
      <View
        style={{
          borderRadius: 12,
          overflow: 'hidden',
          borderWidth: 0.5,
          borderColor: '#e8e8e4',
          marginBottom: 12,
        }}
      >
        <Svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
          <Rect width={W} height={H} fill={bg} />
          <Rect
            x={sx}
            y={sy}
            width={sw}
            height={sh}
            fill={sala}
            stroke={brd}
            strokeWidth={1}
            rx={3}
          />
          <Rect
            x={sx}
            y={sy}
            width={sw}
            height={isLong ? 36 : 28}
            fill={stg}
            stroke={brd}
            strokeWidth={0.5}
            rx={3}
          />
          <SvgText
            x={tipX}
            y={sy + (isLong ? 22 : 18)}
            textAnchor="middle"
            fill={lbl}
            fontSize={8}
            fontWeight="500"
          >
            ESCENARIO
          </SvgText>
          {/* Paredes laterales */}
          <Rect
            x={sx}
            y={sy}
            width={22}
            height={sh * 0.5}
            fill={wall}
            stroke={brd}
            strokeWidth={0.5}
            opacity={0.8}
          />
          <Rect
            x={sx}
            y={sy + sh * 0.5}
            width={22}
            height={sh * 0.5}
            fill={win}
            stroke={brd}
            strokeWidth={0.5}
            opacity={0.8}
          />
          <Rect
            x={sx + sw - 22}
            y={sy}
            width={22}
            height={sh * 0.5}
            fill={wall}
            stroke={brd}
            strokeWidth={0.5}
            opacity={0.8}
          />
          <Rect
            x={sx + sw - 22}
            y={sy + sh * 0.5}
            width={22}
            height={sh * 0.5}
            fill={win}
            stroke={brd}
            strokeWidth={0.5}
            opacity={0.8}
          />
          {/* Público */}
          <SvgText
            x={tipX}
            y={sy + sh * 0.62}
            textAnchor="middle"
            fill={lbl}
            fontSize={9}
            fontWeight="500"
          >
            PÚBLICO
          </SvgText>
          {/* Subs */}
          <Rect
            x={tipX - 20}
            y={subY - 8}
            width={40}
            height={24}
            rx={3}
            fill={sala}
            stroke={SUB_COLOR}
            strokeWidth={1.5}
          />
          <SvgText
            x={tipX}
            y={subY + 8}
            textAnchor="middle"
            fill={SUB_COLOR}
            fontSize={7}
            fontWeight="500"
          >
            {subName}
          </SvgText>
          {/* TOPs */}
          {pos === 'sobre_subs' ? (
            <>
              <Rect
                x={tIzqX - 14}
                y={topY - 4}
                width={28}
                height={20}
                rx={3}
                fill={sala}
                stroke={AC}
                strokeWidth={2}
              />
              <Rect
                x={tDerX - 14}
                y={topY - 4}
                width={28}
                height={20}
                rx={3}
                fill={sala}
                stroke={AC}
                strokeWidth={2}
              />
            </>
          ) : (
            <>
              <Line
                x1={tIzqX}
                y1={sy + 60}
                x2={tIzqX}
                y2={sy + 80}
                stroke="#888"
                strokeWidth={1.5}
              />
              <Rect
                x={tIzqX - 14}
                y={topY - 10}
                width={28}
                height={18}
                rx={3}
                fill={sala}
                stroke={AC}
                strokeWidth={2}
              />
              <Line
                x1={tDerX}
                y1={sy + 60}
                x2={tDerX}
                y2={sy + 80}
                stroke="#888"
                strokeWidth={1.5}
              />
              <Rect
                x={tDerX - 14}
                y={topY - 10}
                width={28}
                height={18}
                rx={3}
                fill={sala}
                stroke={AC}
                strokeWidth={2}
              />
            </>
          )}
          <SvgText
            x={tIzqX}
            y={topY - 8}
            textAnchor="middle"
            fill={AC}
            fontSize={6}
            fontWeight="600"
          >
            {topName}
          </SvgText>
          <SvgText
            x={tDerX}
            y={topY - 8}
            textAnchor="middle"
            fill={AC}
            fontSize={6}
            fontWeight="600"
          >
            {topName}
          </SvgText>
          {/* Coberturas */}
          <Polygon
            points={`${tIzqX},${topY + 8} ${sx + 8},${sy + sh - 10} ${tipX - 5},${sy + sh - 10}`}
            fill={AC}
            fillOpacity={0.08}
          />
          <Polygon
            points={`${tDerX},${topY + 8} ${sx + sw - 8},${sy + sh - 10} ${tipX + 5},${sy + sh - 10}`}
            fill={AC}
            fillOpacity={0.08}
          />
          <Ellipse
            cx={tipX}
            cy={sy + sh * 0.72}
            rx={sw * 0.38}
            ry={sh * 0.2}
            fill={SUB_COLOR}
            fillOpacity={0.07}
          />
        </Svg>
      </View>

      {/* Info cards */}
      {[
        { k: 'Altura tweeter', v: '2.0 – 2.2 mt', c: '#1a7a3c' },
        { k: 'Inclinación (tilt)', v: tilt, c: AC },
        { k: 'SUBs posición', v: 'Centro · en piso', c: '#111110' },
        { k: 'Delay TOPs–SUBs', v: delay, c: '#1a4fa0' },
      ].map((r) => (
        <View
          key={r.k}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            padding: 11,
            borderRadius: 8,
            borderWidth: 0.5,
            borderColor: '#e8e8e4',
            marginBottom: 6,
          }}
        >
          <Text style={{ fontSize: 12, color: '#6b6b68' }}>{r.k}</Text>
          <Text style={{ fontSize: 12, fontWeight: '600', color: r.c }}>{r.v}</Text>
        </View>
      ))}
    </ScrollView>
  )
}
