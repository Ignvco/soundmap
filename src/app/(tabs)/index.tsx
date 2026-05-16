import { C } from '@/constants/theme';
import { useAppStore } from '@/store/app';
import { useRouter } from 'expo-router';
import React from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const AC = C.ac,
  BG = C.bg,
  SF = C.bg2,
  BR = C.br2
const TX = C.tx,
  T2 = C.t2,
  T3 = C.t3

export default function HomeScreen() {
  const router = useRouter()
  const { room, activePreset, channels } = useAppStore()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* ── TOPBAR ── */}
      <View
        style={{
          paddingTop: 52,
          paddingHorizontal: 16,
          paddingBottom: 0,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          marginBottom: 22,
        }}
      >
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Image
              source={require('../../../assets/soundmap-logo.png')}
              style={{ height: 26, width: 118, tintColor: '#f0f0f0' }}
              resizeMode="contain"
            />
          </View>
          <Text
            style={{
              fontSize: 8,
              color: T3,
              letterSpacing: 1.8,
              textTransform: 'uppercase',
              marginTop: 2,
            }}
          >
            by LevelPro Audio
          </Text>
        </View>
        <View style={{ flexDirection: 'row', gap: 7, marginTop: 4 }}>
          <TouchableOpacity
            onPress={() => router.push('/troubleshoot' as any)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: C.glass,
              borderWidth: 0.5,
              borderColor: BR,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, color: T2 }}>⚡</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/scenes' as any)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: C.glass,
              borderWidth: 0.5,
              borderColor: BR,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 14, color: T2 }}>🗂</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── HERO — Room Scan ── */}
      <TouchableOpacity
        onPress={() => router.push('/room-scan')}
        style={{
          marginHorizontal: 14,
          marginBottom: 10,
          padding: 20,
          borderRadius: 24,
          backgroundColor: 'rgba(26,255,110,0.04)',
          borderWidth: 0.5,
          borderColor: BR,
        }}
        activeOpacity={0.85}
      >
        {/* tag */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 8 }}>
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: AC,
              shadowColor: AC,
              shadowRadius: 6,
              shadowOpacity: 0.9,
            }}
          />
          <Text
            style={{
              fontSize: 9,
              fontWeight: '700',
              letterSpacing: 1.8,
              color: AC,
              textTransform: 'uppercase',
            }}
          >
            Room Scan
          </Text>
        </View>

        {/* title */}
        <Text
          style={{
            fontFamily: 'serif',
            fontSize: 26,
            fontWeight: '300',
            color: TX,
            letterSpacing: -0.8,
            lineHeight: 28,
            marginBottom: 5,
          }}
        >
          Diagnóstico{'\n'}
          <Text style={{ color: AC }}>acústico</Text>
        </Text>
        <Text style={{ fontSize: 12, color: T2, marginBottom: 16 }}>
          RT60 · SPL Map · Prediagnóstico · 3 pasos
        </Text>

        {/* pills */}
        <View style={{ flexDirection: 'row', gap: 7 }}>
          {['🔍 Iniciar scan', '3 pasos', 'SPL Map'].map((p, i) => (
            <View
              key={i}
              style={{
                paddingHorizontal: 11,
                paddingVertical: 5,
                borderRadius: 20,
                backgroundColor: C.ac2,
                borderWidth: 0.5,
                borderColor: 'rgba(26,255,110,0.2)',
              }}
            >
              <Text style={{ fontSize: 10, fontWeight: '600', color: AC }}>{p}</Text>
            </View>
          ))}
        </View>
      </TouchableOpacity>

      {/* ── BENTO GRID ── */}
      <View style={{ paddingHorizontal: 14, gap: 9 }}>
        {/* row 1 */}
        <View style={{ flexDirection: 'row', gap: 9 }}>
          {/* Gear Builder */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/stage-map')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 20,
              backgroundColor: C.glass,
              borderWidth: 0.5,
              borderColor: BR,
            }}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: C.ac2,
                borderWidth: 0.5,
                borderColor: 'rgba(26,255,110,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 17 }}>🔊</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TX, marginBottom: 3 }}>
              Gear Builder
            </Text>
            <Text style={{ fontSize: 10, color: T2, lineHeight: 14 }}>Parlantes · DSP · Mics</Text>
            <View
              style={{
                marginTop: 8,
                alignSelf: 'flex-start',
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 20,
                backgroundColor: C.ac2,
                borderWidth: 0.5,
                borderColor: 'rgba(26,255,110,0.2)',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>60+ modelos</Text>
            </View>
          </TouchableOpacity>

          {/* Config Engine */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/config')}
            style={{
              flex: 1,
              padding: 16,
              borderRadius: 20,
              backgroundColor: C.glass,
              borderWidth: 0.5,
              borderColor: BR,
            }}
            activeOpacity={0.8}
          >
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: C.pu2,
                borderWidth: 0.5,
                borderColor: 'rgba(167,139,250,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 17 }}>⚙️</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TX, marginBottom: 3 }}>
              Config Engine
            </Text>
            <Text style={{ fontSize: 10, color: T2, lineHeight: 14 }}>EQ · Presets · Delay</Text>
            <View
              style={{
                marginTop: 8,
                alignSelf: 'flex-start',
                paddingHorizontal: 7,
                paddingVertical: 2,
                borderRadius: 20,
                backgroundColor: C.pu2,
                borderWidth: 0.5,
                borderColor: 'rgba(167,139,250,0.2)',
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: C.pu }}>6 presets</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Canal por Canal — full width */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/channels')}
          style={{
            padding: 16,
            borderRadius: 20,
            backgroundColor: C.glass,
            borderWidth: 0.5,
            borderColor: BR,
            flexDirection: 'row',
            alignItems: 'flex-start',
          }}
          activeOpacity={0.8}
        >
          <View style={{ flex: 1 }}>
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 11,
                backgroundColor: C.bl2,
                borderWidth: 0.5,
                borderColor: 'rgba(96,165,250,0.18)',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <Text style={{ fontSize: 17 }}>🎚️</Text>
            </View>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TX, marginBottom: 3 }}>
              Canal por Canal
            </Text>
            <Text style={{ fontSize: 10, color: T2 }}>Configurable · Agregar / quitar canales</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              style={{
                fontFamily: 'serif',
                fontSize: 30,
                fontWeight: '300',
                color: AC,
                lineHeight: 32,
              }}
            >
              {channels.length}
            </Text>
            <Text
              style={{ fontSize: 9, color: T3, letterSpacing: 0.8, textTransform: 'uppercase' }}
            >
              Canales
            </Text>
          </View>
        </TouchableOpacity>

        {/* Stage Map */}
        <TouchableOpacity
          onPress={() => router.push('/(tabs)/stage-map')}
          style={{
            padding: 12,
            borderRadius: 20,
            backgroundColor: C.glass,
            borderWidth: 0.5,
            borderColor: BR,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 12,
          }}
          activeOpacity={0.8}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 11,
              backgroundColor: C.am2,
              borderWidth: 0.5,
              borderColor: 'rgba(251,191,36,0.18)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 17 }}>🗺</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 13, fontWeight: '600', color: TX }}>Stage Map</Text>
            <Text style={{ fontSize: 10, color: T2, marginTop: 2 }}>
              Frontal · Planta · SPL · Cobertura
            </Text>
          </View>
          <Text style={{ color: T3, fontSize: 18 }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* ── SISTEMA ACTIVO ── */}
      <View style={{ marginHorizontal: 14, marginTop: 10 }}>
        <Text
          style={{
            fontSize: 9,
            fontWeight: '700',
            color: T3,
            letterSpacing: 1.4,
            textTransform: 'uppercase',
            marginBottom: 9,
          }}
        >
          Sistema activo
        </Text>
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              backgroundColor: C.ac3,
              borderWidth: 0.5,
              borderColor: 'rgba(26,255,110,0.18)',
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
            <Text style={{ fontSize: 13, fontWeight: '700', color: AC }}>
              {activePreset?.nombre ?? '—'}
            </Text>
            <Text style={{ fontSize: 9, color: T2, marginTop: 2 }}>
              {activePreset
                ? `${activePreset.crossoverHz}Hz · ${activePreset.nivelTopsDb >= 0 ? '+' : ''}${activePreset.nivelTopsDb}dB · ${activePreset.nivelSubsDb}dB`
                : '—'}
            </Text>
          </View>
          <View
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              backgroundColor: C.glass,
              borderWidth: 0.5,
              borderColor: BR,
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
            <Text style={{ fontSize: 13, fontWeight: '700', color: TX }}>
              {room?.nombre ?? '—'}
            </Text>
            <Text style={{ fontSize: 9, color: T2, marginTop: 2 }}>
              {room
                ? `${room.largo}×${room.ancho}×${room.alto}mt · ${room.cap} pers.`
                : 'Completar Room Scan'}
            </Text>
          </View>
        </View>
      </View>
    </ScrollView>
  )
}
