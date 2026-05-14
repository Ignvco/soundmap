import { purchasePro, restorePurchases } from '@/lib/revenue';
import React, { useState } from 'react';
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from 'react-native';

interface PaywallProps {
  onClose: () => void
  feature: string
}

const PRO_FEATURES = [
  { icon: '⚙️', name: 'Config Engine', desc: '6 presets DCX2496 generados automáticamente' },
  { icon: '🎚️', name: 'Canal por Canal', desc: 'EQ por instrumento para los 13 canales' },
  { icon: '🚨', name: 'Protocolo de backup', desc: 'Emergencia en 5 minutos con Gemini + PV215' },
  { icon: '📄', name: 'Manual Export', desc: 'PDF completo + link compartible con tu equipo' },
  {
    icon: '🤖',
    name: 'Manual generado por IA',
    desc: 'Texto personalizado con Claude para tu recinto',
  },
]

export function Paywall({ onClose, feature }: PaywallProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePurchase = async () => {
    setLoading(true)
    setError(null)
    try {
      const ok = await purchasePro()
      if (ok) onClose()
    } catch {
      setError('No se pudo procesar el pago. Intentá de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async () => {
    setLoading(true)
    try {
      const ok = await restorePurchases()
      if (ok) onClose()
      else setError('No se encontraron compras anteriores.')
    } catch {
      setError('Error al restaurar.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 24, paddingTop: 60 }}
    >
      <View
        style={{
          backgroundColor: '#f8f0ff',
          borderRadius: 20,
          paddingHorizontal: 12,
          paddingVertical: 4,
          alignSelf: 'flex-start',
          marginBottom: 16,
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: '700', color: '#6030a0' }}>PRO</Text>
      </View>

      <Text
        style={{
          fontSize: 26,
          fontWeight: '900',
          color: '#111110',
          letterSpacing: -0.5,
          marginBottom: 8,
        }}
      >
        Desbloqueá {feature}
      </Text>
      <Text style={{ fontSize: 15, color: '#6b6b68', marginBottom: 32, lineHeight: 22 }}>
        Configuración profesional completa para tu sistema de audio.
      </Text>

      {PRO_FEATURES.map((f) => (
        <View
          key={f.name}
          style={{ flexDirection: 'row', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              backgroundColor: '#f8f0ff',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <Text style={{ fontSize: 18 }}>{f.icon}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 14, fontWeight: '600', marginBottom: 2 }}>{f.name}</Text>
            <Text style={{ fontSize: 12, color: '#9b9b98', lineHeight: 18 }}>{f.desc}</Text>
          </View>
        </View>
      ))}

      {error && (
        <Text style={{ color: '#C00020', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>
          {error}
        </Text>
      )}

      <TouchableOpacity
        onPress={handlePurchase}
        disabled={loading}
        style={{
          backgroundColor: '#6030a0',
          borderRadius: 12,
          padding: 16,
          alignItems: 'center',
          marginBottom: 12,
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={{ fontSize: 16, fontWeight: '700', color: '#fff' }}>
            SoundMap Pro — $4.99/mes
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        onPress={handleRestore}
        disabled={loading}
        style={{ alignItems: 'center', padding: 12 }}
      >
        <Text style={{ fontSize: 13, color: '#9b9b98' }}>Restaurar compra anterior</Text>
      </TouchableOpacity>

      <Text style={{ fontSize: 11, color: '#9b9b98', textAlign: 'center', marginTop: 8 }}>
        Se renueva automáticamente. Cancelá cuando quieras desde Ajustes.
      </Text>
    </ScrollView>
  )
}
