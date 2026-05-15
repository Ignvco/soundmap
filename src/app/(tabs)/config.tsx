import { useAppStore } from '@/store/app';
import { EQVisual } from '@components/config/EQVisual';
import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

const AC = '#1aff6e'
const BG = '#06060a'
const SF = '#111118'
const BR = 'rgba(255,255,255,0.07)'
const TX = '#f0f0f0'
const T2 = '#8888a0'
const T3 = '#44445a'

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

  const TABS: { key: Section; label: string }[] = [
    { key: 'presets', label: 'Presets' },
    { key: 'eq', label: 'EQ' },
    { key: 'backup', label: 'Backup' },
    { key: 'arranque', label: 'Arranque' },
  ]

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, paddingTop: 60 }}
    >
      <Text
        style={{ fontSize: 22, fontWeight: '800', color: TX, marginBottom: 4, letterSpacing: -0.5 }}
      >
        Config Engine
      </Text>
      {activePreset && (
        <Text
          style={{
            fontSize: 10,
            color: AC,
            fontWeight: '700',
            marginBottom: 16,
            letterSpacing: 0.5,
          }}
        >
          ● {activePreset.nombre}
        </Text>
      )}

      {/* Tabs */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 16, flexWrap: 'wrap' }}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            onPress={() => setSection(t.key)}
            style={{
              paddingHorizontal: 12,
              paddingVertical: 6,
              borderRadius: 20,
              borderWidth: section === t.key ? 1 : 0.5,
              borderColor: section === t.key ? AC : BR,
              backgroundColor: section === t.key ? 'rgba(26,255,110,0.08)' : 'transparent',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: section === t.key ? AC : T2 }}>
              {t.label}
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
                backgroundColor: SF,
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: BR,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, color: T2 }}>
                Completá el Room Scan para generar presets
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
                  backgroundColor: isActive ? 'rgba(26,255,110,0.06)' : SF,
                  borderRadius: 14,
                  borderWidth: isActive ? 1 : 0.5,
                  borderColor: isActive ? 'rgba(26,255,110,0.35)' : BR,
                  borderLeftWidth: isActive ? 2.5 : 0.5,
                  borderLeftColor: isActive ? AC : BR,
                  padding: 14,
                }}
              >
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: '700',
                    color: isActive ? AC : TX,
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
                      borderBottomColor: isActive ? 'rgba(26,255,110,0.12)' : BR,
                    }}
                  >
                    <Text style={{ fontSize: 11, color: T2 }}>{row.k}</Text>
                    <Text style={{ fontSize: 11, fontWeight: '600', color: isActive ? AC : TX }}>
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
        <Text style={{ fontSize: 12, color: T2, marginTop: 12 }}>
          Seleccioná un preset primero.
        </Text>
      )}

      {/* BACKUP */}
      {section === 'backup' && (
        <View>
          <View
            style={{
              backgroundColor: 'rgba(251,191,36,0.07)',
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: 'rgba(251,191,36,0.2)',
              padding: 12,
              marginBottom: 14,
            }}
          >
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#fbbf24' }}>
              ⚠ Protocolo de emergencia
            </Text>
          </View>
          {BACKUP_STEPS.map((s, i) => (
            <View
              key={i}
              style={{
                flexDirection: 'row',
                gap: 10,
                paddingVertical: 9,
                borderBottomWidth: 0.5,
                borderBottomColor: BR,
              }}
            >
              <View
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  backgroundColor: SF,
                  borderWidth: 0.5,
                  borderColor: BR,
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                <Text style={{ fontSize: 9, fontWeight: '700', color: T2 }}>{i + 1}</Text>
              </View>
              <Text style={{ fontSize: 12, color: T2, flex: 1 }}>{s}</Text>
            </View>
          ))}
        </View>
      )}

      {/* ARRANQUE */}
      {section === 'arranque' &&
        ARRANQUE_STEPS.map((s, i) => (
          <View
            key={i}
            style={{
              flexDirection: 'row',
              gap: 10,
              paddingVertical: 9,
              borderBottomWidth: 0.5,
              borderBottomColor: BR,
            }}
          >
            <View
              style={{
                width: 20,
                height: 20,
                borderRadius: 10,
                backgroundColor: AC,
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <Text style={{ fontSize: 9, fontWeight: '800', color: '#000' }}>{i + 1}</Text>
            </View>
            <Text style={{ fontSize: 12, color: T2, flex: 1 }}>{s}</Text>
          </View>
        ))}
    </ScrollView>
  )
}
