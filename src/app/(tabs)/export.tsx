import { generateManualText } from '@/lib/claude/manual-generator';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/store/app';
import { diagnosRoom } from '@audio/acoustics';
import React, { useState } from 'react';
import { ActivityIndicator, Linking, ScrollView, Text, TouchableOpacity, View } from 'react-native';

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
      // Diagnóstico y texto generados localmente — sin IA
      const diag = diagnosRoom(room)
      const content = generateManualText(room, gear, diag, allPresets)

      // Subir a Supabase Storage via Edge Function
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const { data, error: fnError } = await supabase.functions.invoke('generate-pdf', {
        body: {
          room,
          gear,
          presets: allPresets,
          content,
          userId: session?.user.id ?? 'anonymous',
        },
      })
      if (fnError) throw fnError
      setManualUrl((data as { url: string }).url)
    } catch {
      setError('Error al generar el manual. Verificá la conexión a internet.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', marginBottom: 4 }}>Manual Export</Text>
      <Text style={{ fontSize: 13, color: '#9b9b98', marginBottom: 24 }}>
        Manual completo de tu sistema · Gratuito
      </Text>

      <View
        style={{
          backgroundColor: '#f7f7f5',
          borderRadius: 12,
          borderWidth: 0.5,
          borderColor: '#e8e8e4',
          padding: 16,
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 15, fontWeight: '600', marginBottom: 4 }}>
          Manual de Audio — {room?.nombre ?? 'Tu iglesia'}
        </Text>
        <Text style={{ fontSize: 11, color: '#9b9b98', marginBottom: 12 }}>
          SoundMap by LevelPro
        </Text>
        {SECTIONS.map((s) => (
          <View
            key={s}
            style={{
              flexDirection: 'row',
              gap: 8,
              paddingVertical: 4,
              borderBottomWidth: 0.5,
              borderBottomColor: '#e8e8e4',
            }}
          >
            <Text style={{ color: '#1a7a3c', fontSize: 13 }}>✓</Text>
            <Text style={{ fontSize: 12, color: '#6b6b68' }}>{s}</Text>
          </View>
        ))}
      </View>

      {error && <Text style={{ color: '#C00020', fontSize: 13, marginBottom: 12 }}>{error}</Text>}

      {manualUrl ? (
        <View style={{ gap: 10 }}>
          <View
            style={{
              backgroundColor: '#f0faf4',
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: '#b8e8c8',
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#1a7a3c', marginBottom: 4 }}>
              ✓ Manual generado correctamente
            </Text>
            <Text style={{ fontSize: 11, color: '#6b6b68', lineHeight: 18 }}>{manualUrl}</Text>
          </View>
          <TouchableOpacity
            onPress={() => Linking.openURL(manualUrl)}
            style={{
              backgroundColor: '#1a7a3c',
              borderRadius: 10,
              padding: 14,
              alignItems: 'center',
            }}
          >
            <Text style={{ color: '#fff', fontWeight: '600', fontSize: 15 }}>Abrir manual ↗</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setManualUrl(null)}
            style={{ alignItems: 'center', padding: 10 }}
          >
            <Text style={{ fontSize: 13, color: '#9b9b98' }}>Regenerar</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          onPress={handleGenerate}
          disabled={loading}
          style={{
            backgroundColor: '#C00020',
            borderRadius: 12,
            padding: 16,
            alignItems: 'center',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center' }}>
              <ActivityIndicator color="#fff" />
              <Text style={{ color: '#fff', fontWeight: '600' }}>Generando...</Text>
            </View>
          ) : (
            <Text style={{ fontSize: 15, fontWeight: '700', color: '#fff' }}>Generar manual ↗</Text>
          )}
        </TouchableOpacity>
      )}
    </ScrollView>
  )
}
