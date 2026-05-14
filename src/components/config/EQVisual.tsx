import type { SystemPreset } from '@/types/audio';
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

interface EQBand {
  freq: string
  db: number
  q?: string
}
interface Props {
  preset: SystemPreset
  topName: string
}

function getEQTops(preset: SystemPreset): EQBand[] {
  return [
    { freq: 'HPF\n80Hz', db: 0 },
    { freq: '200Hz', db: -1.5, q: '1.4' },
    { freq: '350Hz', db: preset.escenario === 'pared_corta' ? -1.5 : -1, q: '1.2' },
    { freq: '800Hz', db: 0 },
    { freq: '3kHz', db: 0.5, q: '1.5' },
    { freq: '6kHz', db: 0 },
    { freq: '10kHz\nShelf', db: preset.highShelfDb },
  ]
}

function getEQSubs(preset: SystemPreset): EQBand[] {
  return [
    { freq: 'HPF\n35Hz', db: 0 },
    { freq: '55Hz', db: preset.vidrios ? 1.5 : 2, q: '1.4' },
    { freq: '70Hz', db: 0 },
    { freq: '80Hz', db: -1.5, q: '1.8' },
    { freq: 'LPF\n80Hz', db: 0 },
  ]
}

function EQChart({ bands, title }: { bands: EQBand[]; title: string }) {
  const W = 320,
    H = 100,
    PAD = 20
  const barW = (W - PAD * 2) / bands.length - 4
  const midY = H * 0.55
  const maxDb = 3
  const scale = (H * 0.4) / maxDb

  return (
    <View style={{ marginBottom: 20 }}>
      <Text
        style={{
          fontSize: 12,
          fontWeight: '600',
          color: '#9b9b98',
          letterSpacing: 0.5,
          textTransform: 'uppercase',
          marginBottom: 8,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: '#f7f7f5',
          borderRadius: 10,
          borderWidth: 0.5,
          borderColor: '#e8e8e4',
          overflow: 'hidden',
        }}
      >
        <Svg width={W} height={H}>
          {/* Línea central */}
          <Line x1={PAD} y1={midY} x2={W - PAD} y2={midY} stroke="#e8e8e4" strokeWidth={1} />
          {bands.map((band, i) => {
            const x = PAD + i * ((W - PAD * 2) / bands.length) + 2
            const barH = Math.abs(band.db) * scale
            const isUp = band.db > 0
            const isZero = band.db === 0
            const color = isZero ? '#d0d0c8' : isUp ? '#1a7a3c' : '#C00020'
            const y = isUp ? midY - barH : midY
            const h = isZero ? 4 : Math.max(barH, 3)
            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={isZero ? midY - 2 : y}
                  width={barW}
                  height={h}
                  fill={color}
                  rx={2}
                  opacity={0.85}
                />
                <SvgText x={x + barW / 2} y={H - 4} textAnchor="middle" fill="#9b9b98" fontSize={7}>
                  {band.freq.split('\n')[0]}
                </SvgText>
                {band.db !== 0 && (
                  <SvgText
                    x={x + barW / 2}
                    y={isUp ? y - 2 : y + h + 8}
                    textAnchor="middle"
                    fill={color}
                    fontSize={8}
                    fontWeight="600"
                  >
                    {band.db > 0 ? '+' : ''}
                    {band.db}
                  </SvgText>
                )}
              </React.Fragment>
            )
          })}
        </Svg>
      </View>
    </View>
  )
}

export function EQVisual({ preset, topName }: Props) {
  return (
    <View>
      <EQChart bands={getEQTops(preset)} title={`EQ — TOPs ${topName}`} />
      <EQChart bands={getEQSubs(preset)} title="EQ — SUBs AIR18" />
      <View
        style={{
          backgroundColor: '#f7f7f5',
          borderRadius: 10,
          borderWidth: 0.5,
          borderColor: '#e8e8e4',
          padding: 12,
          marginBottom: 10,
        }}
      >
        {[
          { k: 'Limitador OUT A/B/C/D', v: '+18 dBu', c: '#C00020' },
          { k: 'Panel trasero RCF', v: 'FLAT + sensibilidad máxima', c: '#C00020' },
          { k: 'Crossover interno AIR18', v: 'Al máximo (bypass)', c: '#C00020' },
          { k: 'Delay TOPs', v: '0.0 ms (referencia)', c: '#111110' },
          { k: 'Delay SUBs', v: 'Medir con cinta × 2.915ms/m', c: '#1a4fa0' },
        ].map((row) => (
          <View
            key={row.k}
            style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              paddingVertical: 4,
              borderBottomWidth: 0.5,
              borderBottomColor: '#e8e8e4',
            }}
          >
            <Text style={{ fontSize: 11, color: '#6b6b68' }}>{row.k}</Text>
            <Text style={{ fontSize: 11, fontWeight: '600', color: row.c }}>{row.v}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
