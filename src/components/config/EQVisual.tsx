import type { SystemPreset } from '@/types/audio';
import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Line, Rect, Text as SvgText } from 'react-native-svg';

interface EQBand {
  freq: string
  db: number
}
interface Props {
  preset: SystemPreset
  topName: string
}

function getEQTops(preset: SystemPreset): EQBand[] {
  return [
    { freq: '80Hz', db: 0 },
    { freq: '200Hz', db: -1.5 },
    { freq: '350Hz', db: preset.escenario === 'pared_corta' ? -1.5 : -1 },
    { freq: '800Hz', db: 0 },
    { freq: '3kHz', db: 0.5 },
    { freq: '10kHz', db: preset.highShelfDb },
  ]
}
function getEQSubs(preset: SystemPreset): EQBand[] {
  return [
    { freq: '35Hz', db: 0 },
    { freq: '55Hz', db: preset.vidrios ? 1.5 : 2 },
    { freq: '70Hz', db: 0 },
    { freq: '80Hz', db: -1.5 },
  ]
}

function EQChart({ bands, title }: { bands: EQBand[]; title: string }) {
  const W = 320,
    H = 88,
    PAD = 14
  const barW = (W - PAD * 2) / bands.length - 4
  const midY = H * 0.52,
    scale = (H * 0.38) / 3

  return (
    <View style={{ marginBottom: 16 }}>
      <Text
        style={{
          fontSize: 10,
          fontWeight: '700',
          color: '#44445a',
          letterSpacing: 0.8,
          textTransform: 'uppercase',
          marginBottom: 6,
        }}
      >
        {title}
      </Text>
      <View
        style={{
          backgroundColor: '#111118',
          borderRadius: 10,
          borderWidth: 0.5,
          borderColor: 'rgba(255,255,255,0.07)',
          overflow: 'hidden',
        }}
      >
        <Svg width={W} height={H}>
          <Line
            x1={PAD}
            y1={midY}
            x2={W - PAD}
            y2={midY}
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={1}
          />
          {bands.map((band, i) => {
            const x = PAD + i * ((W - PAD * 2) / bands.length) + 2
            const barH = Math.abs(band.db) * scale
            const isUp = band.db > 0,
              isZero = band.db === 0
            const color = isZero ? 'rgba(255,255,255,0.1)' : isUp ? '#1aff6e' : '#ff4d4d'
            return (
              <React.Fragment key={i}>
                <Rect
                  x={x}
                  y={isZero ? midY - 2 : isUp ? midY - barH : midY}
                  width={barW}
                  height={isZero ? 4 : Math.max(barH, 3)}
                  fill={color}
                  rx={2}
                  opacity={0.85}
                />
                <SvgText x={x + barW / 2} y={H - 4} textAnchor="middle" fill="#44445a" fontSize={7}>
                  {band.freq}
                </SvgText>
                {band.db !== 0 && (
                  <SvgText
                    x={x + barW / 2}
                    y={isUp ? midY - barH - 2 : midY + barH + 8}
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
      <EQChart bands={getEQTops(preset)} title={`EQ TOPs — ${topName}`} />
      <EQChart bands={getEQSubs(preset)} title="EQ SUBs" />
      {[
        { k: 'Limitador', v: '+18 dBu — siempre activo', c: '#ff4d4d' },
        { k: 'Panel trasero RCF', v: 'FLAT + sensibilidad máxima', c: '#ff4d4d' },
        { k: 'Delay SUBs', v: 'Distancia (mt) × 2.915 ms', c: '#60a5fa' },
      ].map((row) => (
        <View
          key={row.k}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            paddingVertical: 5,
            borderBottomWidth: 0.5,
            borderBottomColor: 'rgba(255,255,255,0.07)',
          }}
        >
          <Text style={{ fontSize: 11, color: '#8888a0' }}>{row.k}</Text>
          <Text style={{ fontSize: 11, fontWeight: '600', color: row.c }}>{row.v}</Text>
        </View>
      ))}
    </View>
  )
}
