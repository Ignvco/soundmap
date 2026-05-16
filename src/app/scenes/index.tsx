import React from 'react'
import { ScrollView, Text, TouchableOpacity, View } from 'react-native'
import { useAppStore } from '@/store/app'
import { C } from '@/constants/theme'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, RD = C.rd, BL = C.bl

export default function ScenesScreen() {
  const { scenes, deleteScene } = useAppStore()

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ padding: 16, paddingTop: 60, paddingBottom: 100 }}
    >
      <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 4 }}>
        Escenarios guardados
      </Text>
      <Text style={{ fontSize: 11, color: T3, marginBottom: 20 }}>
        Todos tus diagnósticos y configuraciones
      </Text>

      {scenes.length === 0 ? (
        <View style={{
          paddingVertical: 48, alignItems: 'center',
          backgroundColor: C.glass, borderRadius: 16,
          borderWidth: 0.5, borderColor: BR,
        }}>
          <Text style={{ fontSize: 28, marginBottom: 10 }}>🗂</Text>
          <Text style={{ fontSize: 12, color: T2 }}>No hay escenarios guardados</Text>
          <Text style={{ fontSize: 11, color: T3, marginTop: 4 }}>
            Completá un Room Scan y guardá
          </Text>
        </View>
      ) : (
        scenes.map((scene) => (
          <View
            key={scene.id}
            style={{
              backgroundColor: C.glass, borderRadius: 20,
              borderWidth: 0.5, borderColor: BR,
              padding: 16, marginBottom: 8,
            }}
          >
            {/* Scene gradient overlay illusion */}
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, fontWeight: '700', color: TX, marginBottom: 3 }}>
                  {scene.nombre}
                </Text>
                <Text style={{ fontSize: 10, color: T2, marginBottom: 10 }}>
                  {scene.fecha} · {scene.room.largo}×{scene.room.ancho}×{scene.room.alto}mt · {scene.room.cap} personas
                </Text>
                <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.ac2, borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.18)' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: AC }}>RT60: {scene.room.rt60Full.toFixed(1)}s</Text>
                  </View>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.bl2, borderWidth: 0.5, borderColor: 'rgba(96,165,250,0.18)' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: BL }}>Eco: {scene.room.eco}ms</Text>
                  </View>
                  <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 20, backgroundColor: C.pu2, borderWidth: 0.5, borderColor: 'rgba(167,139,250,0.18)' }}>
                    <Text style={{ fontSize: 9, fontWeight: '700', color: C.pu }}>{scene.preset.nombre}</Text>
                  </View>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => deleteScene(scene.id)}
                style={{ padding: 6, borderRadius: 8, backgroundColor: C.rd2, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)', marginLeft: 8 }}
              >
                <Text style={{ fontSize: 12, color: RD }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Métricas */}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
              {[
                { k: 'Crossover', v: `${scene.preset.crossoverHz} Hz` },
                { k: 'TOPs',      v: `${scene.preset.nivelTopsDb >= 0 ? '+' : ''}${scene.preset.nivelTopsDb} dB` },
                { k: 'SUBs',      v: `${scene.preset.nivelSubsDb} dB` },
              ].map(({ k, v }) => (
                <View
                  key={k}
                  style={{ flex: 1, backgroundColor: '#080810', borderRadius: 8, padding: 8, borderWidth: 0.5, borderColor: BR }}
                >
                  <Text style={{ fontSize: 8, color: T3, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 2 }}>{k}</Text>
                  <Text style={{ fontSize: 12, fontWeight: '700', color: AC }}>{v}</Text>
                </View>
              ))}
            </View>
          </View>
        ))
      )}
    </ScrollView>
  )
}
