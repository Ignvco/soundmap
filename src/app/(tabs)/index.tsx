import { useAppStore } from '@/store/app';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const AC = '#1aff6e'
const BG = '#06060a'
const SF = '#111118'
const BR = 'rgba(255,255,255,0.07)'
const TX = '#f0f0f0'
const T2 = '#8888a0'
const T3 = '#44445a'
const PU = '#a78bfa'
const BL = '#60a5fa'
const AM = '#fbbf24'

const MODULES = [
  { id: 'room-scan', name: 'Room Scan', desc: 'Diagnóstico · RT60 · SPL', color: AC },
  { id: 'stage-map', name: 'Stage Map', desc: 'Frontal · Planta · Cobertura', color: BL },
  { id: 'config', name: 'Config Engine', desc: 'EQ · Presets · Delay', color: PU },
  { id: 'channels', name: 'Canal por Canal', desc: '13 canales configurables', color: AC },
  { id: 'export', name: 'Manual Export', desc: 'Link compartible · HTML', color: AM },
]

export default function HomeScreen() {
  const router = useRouter()
  const { room, activePreset } = useAppStore()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 18, paddingTop: 60 }}
    >
      {/* Logo LevelPro */}
      <View style={{ marginBottom: 28 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 4 }}>
          <View
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: AC,
              shadowColor: AC,
              shadowOpacity: 0.8,
              shadowRadius: 8,
            }}
          />
          <Image
            source={require('../../../assets/soundmap-logo.png')}
            style={{ height: 24, width: 120, tintColor: '#f0f0f0' }}
            resizeMode="contain"
          />
        </View>
        <Text
          style={{
            fontSize: 9,
            color: T3,
            letterSpacing: 1.8,
            textTransform: 'uppercase',
            marginLeft: 17,
          }}
        >
          by LevelPro Audio
        </Text>
      </View>

      {/* Estado activo */}
      {activePreset && (
        <View
          style={{
            backgroundColor: 'rgba(26,255,110,0.06)',
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: 'rgba(26,255,110,0.2)',
            padding: 11,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            marginBottom: 14,
          }}
        >
          <View style={{ width: 5, height: 5, borderRadius: 2.5, backgroundColor: AC }} />
          <Text style={{ fontSize: 11, color: AC, fontWeight: '700', flex: 1 }}>
            {activePreset.nombre}
          </Text>
          <Text style={{ fontSize: 10, color: T2 }}>Activo</Text>
        </View>
      )}

      {/* Módulos — Bento Grid */}
      <Text
        style={{
          fontSize: 9,
          color: T3,
          fontWeight: '700',
          letterSpacing: 1.2,
          textTransform: 'uppercase',
          marginBottom: 10,
        }}
      >
        Módulos
      </Text>

      {MODULES.map((m) => (
        <TouchableOpacity
          key={m.id}
          onPress={() => router.push(`/${m.id}` as any)}
          style={{
            backgroundColor: SF,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: BR,
            borderLeftWidth: 2.5,
            borderLeftColor: m.color,
            padding: 14,
            marginBottom: 8,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: `${m.color}18`,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View
              style={{
                width: 16,
                height: 2,
                backgroundColor: m.color,
                marginBottom: 3,
                opacity: 0.8,
              }}
            />
            <View style={{ width: 10, height: 2, backgroundColor: m.color, opacity: 0.5 }} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: TX, marginBottom: 2 }}>
              {m.name}
            </Text>
            <Text style={{ fontSize: 10, color: T2 }}>{m.desc}</Text>
          </View>
          <Text style={{ color: T3, fontSize: 16 }}>›</Text>
        </TouchableOpacity>
      ))}

      {/* Sistema activo */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
        <View
          style={{
            flex: 1,
            backgroundColor: 'rgba(26,255,110,0.05)',
            borderRadius: 12,
            borderWidth: 0.5,
            borderColor: 'rgba(26,255,110,0.15)',
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
            Preset
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: AC }}>
            {activePreset?.nombre ?? 'Sin preset'}
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
            Recinto
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: TX }}>
            {room?.nombre ?? 'Sin Room Scan'}
          </Text>
        </View>
      </View>

      <View
        style={{
          marginTop: 24,
          paddingTop: 16,
          borderTopWidth: 0.5,
          borderTopColor: BR,
          alignItems: 'center',
        }}
      >
        <Text style={{ fontSize: 9, color: T3, letterSpacing: 1.5, textTransform: 'uppercase' }}>
          levelproaudio.com
        </Text>
      </View>
    </ScrollView>
  )
}
