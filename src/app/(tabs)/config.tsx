// Sin imports de RevenueCat — acceso directo a todo
import { useAppStore } from '@/store/app';
import { EQVisual } from '@components/config/EQVisual';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

const AC = '#C00020'
const BORDER = '#e8e8e4'

const BACKUP_STEPS = [
  'Bajar master del mixer a cero',
  'Apagar los TOPs activos',
  'Conectar OUT A/B del DCX → Gemini P-800',
  'Gemini CH1 → PV215 IZQ · CH2 → PV215 DER',
  'Verificar Gemini en modo STEREO',
  'Cargar preset BACKUP en DCX',
  'Encender Gemini P-800 — ganancia 75–80%',
  'Subir master lentamente',
]

const ARRANQUE_STEPS = [
  'Master del mixer a cero (−∞)',
  'Encender mixer',
  'Verificar Phantom 48V activo (CH6)',
  'Encender DCX2496 → cargar preset correcto',
  'Verificar panel trasero RCF: FLAT + sensibilidad máxima',
  'Encender TOPs activos IZQ y DER',
  'Encender SUBs IZQ y DER',
  'Subir master lentamente — prueba de sonido',
]

type Section = 'presets' | 'eq' | 'backup' | 'arranque'

export default function ConfigScreen() {
  const { allPresets, activePreset, setActivePreset, gear } = useAppStore()
  const [section, setSection] = useState<Section>('presets')
  const topName = gear?.top.nombre.split(' ').slice(0, 3).join(' ') ?? 'TOP'

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      {/* Header */}
      <Text style={{ fontSize: 22, fontWeight: '800', color: '#111110', marginBottom: 4 }}>
        Config Engine
      </Text>
      {activePreset && (
        <Text style={{ fontSize: 11, color: AC, fontWeight: '600', marginBottom: 16 }}>
          {activePreset.nombre}
        </Text>
      )}

      {/* Section tabs */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['presets', 'eq', 'backup', 'arranque'] as Section[]).map((s) => (
          <TouchableOpacity
            key={s}
            onPress={() => setSection(s)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              borderWidth: section === s ? 1.5 : 0.5,
              borderColor: section === s ? AC : BORDER,
              backgroundColor: section === s ? '#fff0f0' : '#fff',
            }}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                textTransform: 'capitalize',
                color: section === s ? AC : '#6b6b68',
              }}
            >
              {s}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* PRESETS */}
      {section === 'presets' && (
        <View style={{ gap: 8 }}>
          {allPresets.length === 0 && (
            <View
              style={{
                padding: 20,
                alignItems: 'center',
                backgroundColor: '#f7f7f5',
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: BORDER,
              }}
            >
              <Text style={{ fontSize: 13, color: '#9b9b98', textAlign: 'center' }}>
                Completá el Room Scan primero para generar los presets
              </Text>
            </View>
          )}
          {allPresets.map((preset) => {
            const isActive = activePreset?.id === preset.id
            return (
              <TouchableOpacity
                key={preset.id}
                onPress={() => setActivePreset(preset)}
                style={{
                  backgroundColor: isActive ? '#fff0f0' : '#fff',
                  borderRadius: 12,
                  borderWidth: isActive ? 1.5 : 0.5,
                  borderColor: isActive ? AC : BORDER,
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: '700',
                    color: isActive ? AC : '#111110',
                    marginBottom: 8,
                  }}
                >
                  {preset.nombre}
                </Text>
                {[
                  { k: 'Crossover', v: `${preset.crossoverHz} Hz LR24` },
                  { k: 'TOPs', v: `${preset.nivelTopsDb >= 0 ? '+' : ''}${preset.nivelTopsDb} dB` },
                  { k: 'SUBs', v: `${preset.nivelSubsDb} dB` },
                  { k: 'Vidrios', v: preset.vidrios ? 'Con vidrios' : 'Sin vidrios' },
                ].map((row) => (
                  <View
                    key={row.k}
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      paddingVertical: 3,
                      borderBottomWidth: 0.5,
                      borderBottomColor: isActive ? '#f0b0b0' : BORDER,
                    }}
                  >
                    <Text style={{ fontSize: 12, color: '#6b6b68' }}>{row.k}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '500', color: '#111110' }}>
                      {row.v}
                    </Text>
                  </View>
                ))}
              </TouchableOpacity>
            )
          })}
        </View>
      )}

      {/* EQ */}
      {section === 'eq' && activePreset && <EQVisual preset={activePreset} topName={topName} />}
      {section === 'eq' && !activePreset && (
        <Text style={{ color: '#9b9b98', fontSize: 13, marginTop: 12 }}>
          Seleccioná un preset en la pestaña Presets primero.
        </Text>
      )}

      {/* BACKUP */}
      {section === 'backup' && (
        <View>
          <View
            style={{
              backgroundColor: '#fff7f0',
              borderRadius: 12,
              borderWidth: 0.5,
              borderColor: '#f0c8a0',
              padding: 14,
              marginBottom: 16,
            }}
          >
            <Text style={{ fontSize: 13, fontWeight: '700', color: '#c45000' }}>
              ⚠ Protocolo de emergencia
            </Text>
          </View>
          {BACKUP_STEPS.map((s, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderBottomColor: BORDER,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: '#f0f0ec',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#9b9b98' }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#3a3a38', flex: 1 }}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ARRANQUE */}
      {section === 'arranque' && (
        <View>
          {ARRANQUE_STEPS.map((s, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: 12,
                paddingVertical: 10,
                borderBottomWidth: 0.5,
                borderBottomColor: BORDER,
              }}
            >
              <View
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 11,
                  backgroundColor: AC,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#fff' }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 13, color: '#3a3a38', flex: 1 }}>{s}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  )
}
