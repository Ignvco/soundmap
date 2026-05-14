import { CHANNELS_DATA } from '@/constants/channels-data';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

const AC = '#C00020'
const TYPE_COLOR = { voz: '#1a4fa0', inst: '#1a7a3c', fx: '#7a5800' }

export default function ChannelsScreen() {
  const [selected, setSelected] = useState<number | null>(null)
  const ch = selected !== null ? CHANNELS_DATA[selected] : null

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 4 }}>Canal por Canal</Text>
      <Text style={{ fontSize: 13, color: '#9b9b98', marginBottom: 20 }}>
        Mixer SL2442FX · {CHANNELS_DATA.length} canales · Tocar para ver EQ
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {CHANNELS_DATA.map((item, i) => {
          const isSel = selected === i
          const borderColor = TYPE_COLOR[item.tipo]
          return (
            <TouchableOpacity
              key={i}
              onPress={() => setSelected(isSel ? null : i)}
              style={{
                width: '47%',
                borderRadius: 10,
                borderWidth: 0.5,
                borderColor: isSel ? AC : '#e8e8e4',
                borderLeftWidth: 2.5,
                borderLeftColor: borderColor,
                padding: 12,
                backgroundColor: isSel ? '#fff0f0' : '#fff',
              }}
            >
              <Text style={{ fontSize: 10, color: '#9b9b98', marginBottom: 3 }}>{item.num}</Text>
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: '600',
                  marginBottom: 2,
                  color: isSel ? AC : '#111110',
                }}
              >
                {item.nombre}
              </Text>
              <Text style={{ fontSize: 10, color: '#6b6b68' }}>{item.src}</Text>
              {item.phantom && (
                <View
                  style={{
                    marginTop: 5,
                    backgroundColor: '#fff0f0',
                    borderRadius: 10,
                    paddingHorizontal: 6,
                    paddingVertical: 1,
                    alignSelf: 'flex-start',
                    borderWidth: 0.5,
                    borderColor: '#f0b0b0',
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>48V</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        })}
      </View>

      {ch !== null && ch !== undefined && (
        <View
          style={{
            marginTop: 16,
            backgroundColor: '#fff0f0',
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: '#f0b0b0',
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '700', color: AC, marginBottom: 10 }}>
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
                borderBottomColor: '#f0b0b0',
              }}
            >
              <Text style={{ fontSize: 12, color: '#6b6b68' }}>{row.k}</Text>
              <Text style={{ fontSize: 12, fontWeight: '500', color: '#111110' }}>{row.v}</Text>
            </View>
          ))}
          <Text
            style={{
              fontSize: 11,
              color: '#6b6b68',
              marginTop: 8,
              fontStyle: 'italic',
              lineHeight: 18,
            }}
          >
            {ch.nota}
          </Text>
        </View>
      )}
    </ScrollView>
  )
}
