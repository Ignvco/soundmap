import { useAppStore } from '@/store/app';
import type { MaterialParedes, MaterialPiso, RoomData } from '@/types/room';
import { diagnosRoom } from '@audio/acoustics';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const STEPS = ['Dimensiones', 'Materiales', 'Diagnóstico']
const AC = '#C00020'
const BORDER = '#e8e8e4'

export default function RoomScanScreen() {
  const router = useRouter()
  const setRoom = useAppStore((s) => s.setRoom)
  const [step, setStep] = useState(0)
  const [room, setRoom_] = useState<Partial<RoomData>>({
    largo: 15,
    ancho: 10,
    alto: 5,
    capacidad: 100,
    uso: 'iglesia',
    techo: 'triangular',
    materialParedes: 'ladrillo',
    materialPiso: 'cemento',
    materialTecho: 'madera',
    ventanales: 'parcial',
    tratamiento: 'ninguno',
    nombre: 'Mi iglesia',
  })

  const diag = step === 2 && room.largo ? diagnosRoom(room as RoomData) : null

  const update = (key: keyof RoomData, val: unknown) =>
    setRoom_((prev) => ({ ...prev, [key]: val }))

  const handleFinish = () => {
    if (room.largo) setRoom(room as RoomData)
    router.back()
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#fff' }}
      contentContainerStyle={{ padding: 16 }}
    >
      {/* Step indicator */}
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: 24 }}>
        {STEPS.map((s, i) => (
          <View
            key={i}
            style={{
              flex: 1,
              height: 3,
              borderRadius: 2,
              backgroundColor: i <= step ? AC : '#f0f0ec',
            }}
          />
        ))}
      </View>

      <Text
        style={{
          fontSize: 11,
          color: '#9b9b98',
          textTransform: 'uppercase',
          letterSpacing: 0.8,
          marginBottom: 4,
        }}
      >
        {step + 1} / {STEPS.length} — {STEPS[step]}
      </Text>

      {/* PASO 1: Dimensiones */}
      {step === 0 && (
        <View style={{ gap: 14, marginTop: 8 }}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(
              [
                { key: 'largo', label: 'Largo (mt)' },
                { key: 'ancho', label: 'Ancho (mt)' },
              ] as const
            ).map((f) => (
              <View key={f.key} style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6b6b68', marginBottom: 4 }}>{f.label}</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(room[f.key] ?? '')}
                  onChangeText={(v) => update(f.key, parseFloat(v) || 0)}
                  style={{
                    borderWidth: 0.5,
                    borderColor: BORDER,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 15,
                  }}
                />
              </View>
            ))}
          </View>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            {(
              [
                { key: 'alto', label: 'Altura máx.' },
                { key: 'capacidad', label: 'Capacidad' },
              ] as const
            ).map((f) => (
              <View key={f.key} style={{ flex: 1 }}>
                <Text style={{ fontSize: 12, color: '#6b6b68', marginBottom: 4 }}>{f.label}</Text>
                <TextInput
                  keyboardType="numeric"
                  value={String(room[f.key] ?? '')}
                  onChangeText={(v) => update(f.key, parseFloat(v) || 0)}
                  style={{
                    borderWidth: 0.5,
                    borderColor: BORDER,
                    borderRadius: 8,
                    padding: 10,
                    fontSize: 15,
                  }}
                />
              </View>
            ))}
          </View>
        </View>
      )}

      {/* PASO 2: Materiales */}
      {step === 1 && (
        <View style={{ gap: 16, marginTop: 8 }}>
          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b6b68', marginBottom: 8 }}>
              Paredes
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(['ladrillo', 'hormigon', 'madera', 'tratado'] as MaterialParedes[]).map((opt) => {
                const sel = room.materialParedes === opt
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => update('materialParedes', opt)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: sel ? 1.5 : 0.5,
                      borderColor: sel ? AC : BORDER,
                      backgroundColor: sel ? '#fff0f0' : '#fff',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: sel ? AC : '#3a3a38',
                        textTransform: 'capitalize',
                      }}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>

          <View>
            <Text style={{ fontSize: 12, fontWeight: '600', color: '#6b6b68', marginBottom: 8 }}>
              Piso
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {(['cemento', 'madera', 'alfombra', 'ceramica'] as MaterialPiso[]).map((opt) => {
                const sel = room.materialPiso === opt
                return (
                  <TouchableOpacity
                    key={opt}
                    onPress={() => update('materialPiso', opt)}
                    style={{
                      paddingHorizontal: 14,
                      paddingVertical: 8,
                      borderRadius: 8,
                      borderWidth: sel ? 1.5 : 0.5,
                      borderColor: sel ? AC : BORDER,
                      backgroundColor: sel ? '#fff0f0' : '#fff',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        fontWeight: '500',
                        color: sel ? AC : '#3a3a38',
                        textTransform: 'capitalize',
                      }}
                    >
                      {opt}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        </View>
      )}

      {/* PASO 3: Diagnóstico */}
      {step === 2 && diag && (
        <View style={{ gap: 10, marginTop: 8 }}>
          {[
            { label: 'RT60 sin público', val: `${diag.rt60Empty.toFixed(1)} seg`, color: AC },
            { label: 'RT60 con público', val: `${diag.rt60Full.toFixed(1)} seg`, color: '#7a5800' },
            { label: 'Reflexión', val: diag.reflexion.replace('_', ' '), color: '#111110' },
            { label: 'Eco pared', val: `${diag.ecoMs}ms`, color: diag.ecoMs > 60 ? AC : '#1a7a3c' },
          ].map((row) => (
            <View
              key={row.label}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                padding: 12,
                borderRadius: 10,
                borderWidth: 0.5,
                borderColor: BORDER,
              }}
            >
              <Text style={{ fontSize: 13, color: '#6b6b68' }}>{row.label}</Text>
              <Text style={{ fontSize: 13, fontWeight: '600', color: row.color }}>{row.val}</Text>
            </View>
          ))}
          <View
            style={{
              backgroundColor: '#f0faf4',
              borderRadius: 10,
              borderWidth: 0.5,
              borderColor: '#b8e8c8',
              padding: 14,
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: '#1a7a3c', marginBottom: 4 }}>
              RECOMENDACIÓN
            </Text>
            <Text style={{ fontSize: 13, color: '#3a3a38', lineHeight: 20 }}>
              {diag.recomendacion}
            </Text>
          </View>
          <Text style={{ fontSize: 12, fontWeight: '600', color: '#9b9b98', marginTop: 4 }}>
            Problemas identificados:
          </Text>
          {diag.problemas.map((p, i) => (
            <View key={i} style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
              <Text style={{ color: AC }}>⚠</Text>
              <Text style={{ fontSize: 13, color: '#3a3a38', flex: 1 }}>{p}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Botones de navegación */}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 32 }}>
        {step > 0 && (
          <TouchableOpacity
            onPress={() => setStep((s) => s - 1)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 8,
              borderWidth: 0.5,
              borderColor: '#d0d0c8',
              alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 14, fontWeight: '500' }}>Atrás</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          onPress={() => (step < 2 ? setStep((s) => s + 1) : handleFinish())}
          style={{
            flex: 1,
            padding: 12,
            borderRadius: 8,
            backgroundColor: AC,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#fff' }}>
            {step < 2 ? 'Siguiente' : 'Guardar recinto'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  )
}
