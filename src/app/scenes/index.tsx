// ════════════════════════════════════════════════════════
// scenes/index.tsx — Gestión dinámica de escenarios (punto 6)
// Cargar un escenario actualiza TODOS los módulos
// ════════════════════════════════════════════════════════

import React, { useState } from 'react'
import {
  Alert, ScrollView, Text, TouchableOpacity, View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useAppStore } from '@/store/app'
import { GEAR_DB } from '@/constants/gear-database'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, RD = C.rd, BL = C.bl, AM = C.am

export default function ScenesScreen() {
  const { scenes, loadScene, deleteScene, activePreset } = useAppStore()
  const router = useRouter()
  const [loadedId, setLoadedId] = useState<number | null>(null)

  const handleLoad = (id: number, nombre: string) => {
    Alert.alert(
      `Cargar "${nombre}"`,
      'Esto reemplazará el Room Scan, Gear Builder, Config Engine y Canales actuales con los datos de este escenario.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cargar escenario',
          onPress: () => {
            loadScene(id)
            setLoadedId(id)
            // Volver al home para que se reflejen los cambios
            router.back()
          },
        },
      ],
    )
  }

  const handleDelete = (id: number, nombre: string) => {
    Alert.alert(`Eliminar "${nombre}"`, '¿Eliminar este escenario?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteScene(id) },
    ])
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, paddingTop: 20, paddingBottom: 100 }}
    >
      <Text style={{ fontSize: 9, fontWeight: '700', color: T3, letterSpacing: 1.4, textTransform: 'uppercase', marginBottom: 12 }}>
        {scenes.length} escenario{scenes.length !== 1 ? 's' : ''} guardado{scenes.length !== 1 ? 's' : ''}
      </Text>

      {/* Escenario activo */}
      {activePreset && (
        <View style={{ backgroundColor: C.ac3, borderRadius: 12, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.18)', padding: 12, marginBottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: AC, shadowColor: AC, shadowRadius: 4, shadowOpacity: 0.8 }} />
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 10, color: T3, letterSpacing: 0.8, marginBottom: 1 }}>ACTIVO AHORA</Text>
            <Text style={{ fontSize: 12, fontWeight: '700', color: AC }}>{activePreset.nombre}</Text>
          </View>
        </View>
      )}

      {scenes.length === 0 ? (
        <View style={{ paddingVertical: 48, alignItems: 'center', backgroundColor: C.glass, borderRadius: 16, borderWidth: 0.5, borderColor: BR }}>
          <Text style={{ fontSize: 28, marginBottom: 10 }}>🗂</Text>
          <Text style={{ fontSize: 12, color: T2 }}>No hay escenarios guardados</Text>
          <Text style={{ fontSize: 11, color: T3, marginTop: 4 }}>Completá un Room Scan y guardá</Text>
        </View>
      ) : (
        scenes.map((scene) => {
          const topItem = GEAR_DB.find((g) => g.id === (scene.gear.tops?.[0] ?? scene.gear.top))
          const subItem = GEAR_DB.find((g) => g.id === (scene.gear.subs?.[0] ?? scene.gear.sub))
          const isLoaded = loadedId === scene.id

          return (
            <View
              key={scene.id}
              style={{
                backgroundColor: C.glass, borderRadius: 20,
                borderWidth: isLoaded ? 1 : 0.5,
                borderColor: isLoaded ? 'rgba(26,255,110,0.35)' : BR,
                padding: 16, marginBottom: 10,
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 8 }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: isLoaded ? AC : TX, marginBottom: 2 }}>
                    {scene.nombre}
                    {isLoaded && <Text style={{ fontSize: 10, color: AC }}> ✓ cargado</Text>}
                  </Text>
                  <Text style={{ fontSize: 10, color: T2 }}>
                    {scene.fecha} · {scene.room.largo}×{scene.room.ancho}×{scene.room.alto}mt · {scene.room.cap} personas
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 6, marginLeft: 8 }}>
                  {/* CARGAR — aplica en todos los módulos */}
                  <TouchableOpacity
                    onPress={() => handleLoad(scene.id, scene.nombre)}
                    style={{ paddingHorizontal: 10, paddingVertical: 6, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.3)' }}
                  >
                    <Text style={{ fontSize: 10, fontWeight: '700', color: AC }}>Cargar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => handleDelete(scene.id, scene.nombre)}
                    style={{ padding: 6, borderRadius: 8, backgroundColor: C.rd2, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)' }}
                  >
                    <Text style={{ fontSize: 12, color: RD }}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Tags */}
              <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.18)' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>RT60: {scene.room.rt60Full.toFixed(1)}s</Text>
                </View>
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.bl2, borderWidth: 0.5, borderColor: 'rgba(96,165,250,0.18)' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: BL }}>Eco: {scene.room.eco}ms</Text>
                </View>
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.pu2, borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.18)' }}>
                  <Text style={{ fontSize: 9, fontWeight: '700', color: C.pu }}>{scene.preset.nombre}</Text>
                </View>
                {topItem && (
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.glass2, borderWidth: 0.5, borderColor: BR }}>
                    <Text style={{ fontSize: 9, fontWeight: '600', color: T2 }}>{topItem.name.split(' ').slice(0, 3).join(' ')}</Text>
                  </View>
                )}
              </View>

              {/* Métricas del preset del escenario */}
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[
                  { k: 'Crossover',  v: `${scene.preset.crossoverHz} Hz` },
                  { k: 'TOPs',       v: `${scene.preset.nivelTopsDb >= 0 ? '+' : ''}${scene.preset.nivelTopsDb} dB` },
                  { k: 'SUBs',       v: `${scene.preset.nivelSubsDb} dB` },
                  { k: 'Canales',    v: `${scene.channels?.length ?? 0}` },
                ].map(({ k, v }) => (
                  <View key={k} style={{ flex: 1, backgroundColor: '#080810', borderRadius: 8, padding: 8, borderWidth: 0.5, borderColor: BR }}>
                    <Text style={{ fontSize: 7, color: T3, letterSpacing: 0.6, textTransform: 'uppercase', marginBottom: 2 }}>{k}</Text>
                    <Text style={{ fontSize: 12, fontWeight: '700', color: AC }}>{v}</Text>
                  </View>
                ))}
              </View>

              {/* Lo que se va a cargar */}
              <View style={{ marginTop: 10, backgroundColor: C.glass2, borderRadius: 8, padding: 9, borderWidth: 0.5, borderColor: BR }}>
                <Text style={{ fontSize: 9, color: T3, letterSpacing: 0.8, marginBottom: 5 }}>Al cargar se actualizarán:</Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
                  {['Room Scan', 'Gear Builder', 'Config Engine', 'Canales', 'Presets'].map((m) => (
                    <View key={m} style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 20, backgroundColor: C.glass, borderWidth: 0.5, borderColor: BR }}>
                      <Text style={{ fontSize: 9, color: T2 }}>{m}</Text>
                    </View>
                  ))}
                </View>
              </View>
            </View>
          )
        })
      )}
    </ScrollView>
  )
}
