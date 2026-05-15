import { generateManualText } from '@/lib/claude/manual-generator';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/app';
import { diagnosRoom } from '@audio/acoustics';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';

const AC = '#1aff6e',
  BG = '#06060a',
  SF = '#111118'
const BR = 'rgba(255,255,255,0.07)',
  TX = '#f0f0f0',
  T2 = '#8888a0'

const SECTIONS = [
  'Diagnóstico acústico completo',
  'Stage Map frontal + planta',
  'Especificaciones del equipamiento',
  'DCX2496 — presets del sistema',
  'Canal por canal — 13 canales',
  'Protocolo backup de emergencia',
  'Troubleshooting completo',
]

export default function ExportScreen() {
  const { room, gear, allPresets } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [manualUrl, setManualUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = async () => {
    if (!room || !gear) {
      setError('Completá el Room Scan y el Gear Builder primero.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const diag = diagnosRoom(room)
      const content = generateManualText(room, gear, diag, allPresets)
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const { data, error: fnError } = await supabase.functions.invoke('generate-pdf', {
        body: { room, gear, presets: allPresets, content, userId: session?.user.id ?? 'anonymous' },
      })
      if (fnError) throw fnError
      setManualUrl((data as { url: string }).url)
    } catch {
      setError('Error al generar. Verificá la conexión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text
        style={{ fontSize: 22, fontWeight: '800', color: TX, marginBottom: 4, letterSpacing: -0.5 }}
      >
        Manual Export
      </Text>
      <Text style={{ fontSize: 11, color: T2, marginBottom: 20 }}>
        Manual completo de tu sistema · Gratuito
      </Text>

      <View
        style={{
          backgroundColor: SF,
          borderRadius: 16,
          borderWidth: 0.5,
          borderColor: BR,
          padding: 16,
          marginBottom: 14,
        }}
      >
        <Text style={{ fontSize: 14, fontWeight: '700', color: TX, marginBottom: 4 }}>
          Manual de Audio — SoundMap
        </Text>
        <Text style={{ fontSize: 10, color: T2, marginBottom: 12 }}>by LevelPro Audio</Text>
        {SECTIONS.map((s) => (
          <View
            key={s}
            style={{
              flexDirection: 'row',
              gap: 7,
              paddingVertical: 4,
              borderBottomWidth: 0.5,
              borderBottomColor: BR,
            }}
          >
            <Text style={{ color: AC, fontSize: 12 }}>✓</Text>
            <Text style={{ fontSize: 11, color: T2 }}>{s}</Text>
          </View>
        ))}
      </View>

      {error && <Text style={{ color: '#ff4d4d', fontSize: 12, marginBottom: 10 }}>{error}</Text>}

      {manualUrl ? (
        <View style={{ gap: 8 }}>
          <View
            style={{
              backgroundColor: 'rgba(26,255,110,0.06)',
              borderRadius: 12,
              borderWidth: 0.5,
              borderColor: 'rgba(26,255,110,0.2)',
              padding: 12,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: AC, marginBottom: 4 }}>
              ✓ Manual generado
            </Text>
            <Text style={{ fontSize: 10, color: T2 }}>{manualUrl}</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL(manualUrl)}
            style={{ backgroundColor: AC, borderRadius: 12, padding: 14, alignItems: 'center' }}
          >
            <Text style={{ color: '#000', fontWeight: '700', fontSize: 14 }}>Abrir manual ↗</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading}
          style={{
            backgroundColor: AC,
            borderRadius: 12,
            padding: 15,
            alignItems: 'center',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator color="#000" />
              <Text style={{ color: '#000', fontWeight: '700' }}>Generando...</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#000' }}>Generar manual ↗</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}
