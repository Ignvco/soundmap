import { CHANNELS_DATA } from '@/constants/channels-data';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

const AC = '#1aff6e'
const BG = '#06060a'
const SF = '#111118'
const BR = 'rgba(255,255,255,0.07)'
const TX = '#f0f0f0'
const T2 = '#8888a0'
const T3 = '#44445a'
const TYPE_COLOR: Record<string, string> = {
  voz: '#60a5fa',
  inst: '#1aff6e',
  fx: '#fbbf24',
}

export default function ChannelsScreen() {
  const [selected, setSelected] = useState<number | null>(null)
  // ch declarado FUERA del JSX — evita error de sintaxis
  const ch = selected !== null ? CHANNELS_DATA[selected] : null

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text
        style={{ fontSize: 22, fontWeight: '800', color: TX, marginBottom: 4, letterSpacing: -0.5 }}
      >
        Canal por Canal
      </Text>
      <Text style={{ fontSize: 11, color: T3, marginBottom: 18 }}>
        Mixer SL2442FX · {CHANNELS_DATA.length} canales · Tocar para ver EQ
      </Text>

      {/* Grid de canales */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
        {CHANNELS_DATA.map((item, i) => {
          const isSel = selected === i
          const borderColor = TYPE_COLOR[item.tipo] ?? AC
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelected(isSel ? null : i)}
              style={{
                width: '47%',
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: isSel ? AC : BR,
                borderLeftWidth: 2.5,
                borderLeftColor: borderColor,
                padding: 12,
                backgroundColor: isSel ? 'rgba(26,255,110,0.05)' : SF,
              }}
            >
              <Text style={{ fontSize: 9, color: T3, marginBottom: 3 }}>{item.num}</Text>
              <Text
                style={{ fontSize: 12, fontWeight: '600', marginBottom: 2, color: isSel ? AC : TX }}
              >
                {item.nombre}
              </Text>
              <Text style={{ fontSize: 10, color: T2 }}>{item.src}</Text>
              {item.phantom && (
                <View
                  style={{
                    marginTop: 5,
                    backgroundColor: 'rgba(255,77,77,0.1)',
                    borderRadius: 8,
                    paddingHorizontal: 5,
                    paddingVertical: 1,
                    alignSelf: 'flex-start',
                    borderWidth: 0.5,
                    borderColor: 'rgba(255,77,77,0.2)',
                  }}
                >
                  <Text style={{ fontSize: 8, fontWeight: '700', color: '#ff4d4d' }}>48V</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Detalle — ch declarado arriba, sin IIFE */}
      {ch !== null && ch !== undefined && (
        <View
          style={{
            backgroundColor: 'rgba(26,255,110,0.05)',
            borderRadius: 14,
            borderWidth: 0.5,
            borderColor: 'rgba(26,255,110,0.18)',
            padding: 14,
            marginBottom: 8,
          }}
        >
          <Text style={{ fontSize: 13, fontWeight: '700', color: AC, marginBottom: 10 }}>
            {ch.num} — {ch.nombre}
          </Text>
          {[
            { k: 'Fuente', v: ch.src },
            { k: 'Phantom 48V', v: ch.phantom ? 'SÍ — obligatorio' : 'No' },
            { k: 'Pan', v: ch.pan },
            { k: 'Fader ref.', v: ch.fader },
            { k: 'LOW 80Hz', v: ch.eq.low },
            { k: 'LOW-MID', v: ch.eq.lowMid },
            { k: 'HIGH-MID', v: ch.eq.highMid },
            { k: 'HIGH 12kHz', v: ch.eq.high },
          ].map((row) => (
            <View
              key={row.k}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 4,
                borderBottomWidth: 0.5,
                borderBottomColor: 'rgba(26,255,110,0.1)',
              }}
            >
              <Text style={{ fontSize: 11, color: T2 }}>{row.k}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: TX }}>{row.v}</Text>
            </View>
          ))}
          <Text
            style={{ fontSize: 10, color: T2, marginTop: 8, fontStyle: 'italic', lineHeight: 16 }}
          >
            {ch.nota}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
