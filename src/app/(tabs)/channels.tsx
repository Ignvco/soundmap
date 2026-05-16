import { type ChannelData } from '@/constants/channels-data';
import { C } from '@/constants/theme';
import { useAppStore } from '@/store/app';
import React, { useState } from 'react';
import { ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';

const AC = C.ac,
  BG = C.bg,
  SF = C.bg2,
  BR = C.br2
const TX = C.tx,
  T2 = C.t2,
  T3 = C.t3,
  RD = C.rd

const TYPE_COLOR: Record<string, string> = {
  voz: '#60a5fa',
  inst: '#1aff6e',
  fx: '#fbbf24',
  perc: '#a78bfa',
}

let _nextId = 100

export default function ChannelsScreen() {
  const { channels, addChannel, removeChannel } = useAppStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  // Form state
  const [fNombre, setFNombre] = useState('')
  const [fSrc, setFSrc] = useState('')
  const [fTipo, setFTipo] = useState<ChannelData['tipo']>('voz')
  const [fPhantom, setFPhantom] = useState(false)
  const [fLow, setFLow] = useState('0 dB')
  const [fLowMid, setFLowMid] = useState('0 dB')
  const [fHighMid, setFHighMid] = useState('0 dB')
  const [fHigh, setFHigh] = useState('0 dB')
  const [fNota, setFNota] = useState('')

  const selCh = selectedId !== null ? (channels.find((c) => c.id === selectedId) ?? null) : null

  const handleAdd = () => {
    if (!fNombre.trim()) return
    addChannel({
      id: _nextId++,
      num: `CH ${channels.length + 1}`,
      nombre: fNombre.trim(),
      src: fSrc.trim() || '—',
      phantom: fPhantom,
      tipo: fTipo,
      pan: 'Centro',
      fader: '0 dB',
      eq: { low: fLow, lowMid: fLowMid, highMid: fHighMid, high: fHigh },
      nota: fNota.trim() || '—',
    })
    setShowForm(false)
    setFNombre('')
    setFSrc('')
    setFTipo('voz')
    setFPhantom(false)
    setFLow('0 dB')
    setFLowMid('0 dB')
    setFHighMid('0 dB')
    setFHigh('0 dB')
    setFNota('')
  }

  const inputStyle = {
    backgroundColor: C.glass,
    borderWidth: 0.5,
    borderColor: BR,
    borderRadius: 9,
    padding: 9,
    color: TX,
    fontSize: 12,
    fontFamily: 'System',
  } as const

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: 100 }}
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 }}>
        <Text
          style={{
            fontSize: 22,
            fontWeight: '800',
            color: TX,
            letterSpacing: -0.5,
            marginBottom: 4,
          }}
        >
          Canal por Canal
        </Text>
        <Text style={{ fontSize: 11, color: T3, marginBottom: 16 }}>
          Mixer SL2442FX · {channels.length} canales · Tocar para ver EQ
        </Text>

        {/* Add button */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => setShowForm(!showForm)}
            style={{
              paddingHorizontal: 14,
              paddingVertical: 7,
              borderRadius: 20,
              borderWidth: 0.5,
              borderColor: showForm ? 'rgba(26,255,110,0.25)' : BR,
              backgroundColor: showForm ? C.ac2 : 'transparent',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: showForm ? AC : T2 }}>
              {showForm ? '✕ Cancelar' : '+ Agregar canal'}
            </Text>
          </TouchableOpacity>
          <Text style={{ fontSize: 10, color: T3, marginLeft: 'auto' }}>Tocar para ver EQ</Text>
        </View>
      </View>

      {/* ── ADD FORM ── */}
      {showForm && (
        <View
          style={{
            marginHorizontal: 14,
            marginBottom: 12,
            backgroundColor: C.glass2,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: BR,
            padding: 14,
          }}
        >
          <Text style={{ fontSize: 12, fontWeight: '700', color: TX, marginBottom: 12 }}>
            Nuevo canal
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: T2, marginBottom: 4 }}>Nombre</Text>
              <TextInput
                style={inputStyle}
                placeholder="Ej: Guitarra 3"
                placeholderTextColor={T3}
                value={fNombre}
                onChangeText={setFNombre}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: T2, marginBottom: 4 }}>Fuente</Text>
              <TextInput
                style={inputStyle}
                placeholder="Ej: SM57, DI Box"
                placeholderTextColor={T3}
                value={fSrc}
                onChangeText={setFSrc}
              />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            {[
              { label: 'LOW 80Hz', v: fLow, set: setFLow },
              { label: 'LOW-MID', v: fLowMid, set: setFLowMid },
              { label: 'HIGH-MID', v: fHighMid, set: setFHighMid },
              { label: 'HIGH 12kHz', v: fHigh, set: setFHigh },
            ].map(({ label, v, set }) => (
              <View key={label} style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, color: T2, marginBottom: 3 }}>{label}</Text>
                <TextInput
                  style={{ ...inputStyle, padding: 7 }}
                  placeholder="0 dB"
                  placeholderTextColor={T3}
                  value={v}
                  onChangeText={set}
                />
              </View>
            ))}
          </View>

          {/* Tipo */}
          <Text style={{ fontSize: 9, color: T2, marginBottom: 6 }}>Tipo de señal</Text>
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 10 }}>
            {(['voz', 'inst', 'fx', 'perc'] as ChannelData['tipo'][]).map((t) => (
              <TouchableOpacity
                key={t}
                onPress={() => setFTipo(t)}
                style={{
                  flex: 1,
                  padding: 6,
                  borderRadius: 8,
                  borderWidth: 0.5,
                  borderColor: fTipo === t ? `${TYPE_COLOR[t]}40` : BR,
                  backgroundColor: fTipo === t ? `${TYPE_COLOR[t]}15` : 'transparent',
                  alignItems: 'center',
                }}
              >
                <Text
                  style={{
                    fontSize: 9,
                    fontWeight: '700',
                    color: fTipo === t ? TYPE_COLOR[t] : T2,
                    textAlign: 'center',
                  }}
                >
                  {t.toUpperCase()}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Phantom */}
          <TouchableOpacity
            onPress={() => setFPhantom(!fPhantom)}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}
          >
            <View
              style={{
                width: 18,
                height: 18,
                borderRadius: 4,
                borderWidth: 1,
                borderColor: fPhantom ? RD : BR,
                backgroundColor: fPhantom ? C.rd2 : 'transparent',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {fPhantom && <Text style={{ fontSize: 10, color: RD, fontWeight: '800' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 11, color: T2 }}>Phantom 48V</Text>
            {fPhantom && (
              <View
                style={{
                  paddingHorizontal: 6,
                  paddingVertical: 2,
                  borderRadius: 8,
                  backgroundColor: C.rd2,
                  borderWidth: 0.5,
                  borderColor: 'rgba(255,77,77,0.2)',
                }}
              >
                <Text style={{ fontSize: 8, fontWeight: '700', color: RD }}>ACTIVO</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Nota */}
          <Text style={{ fontSize: 9, color: T2, marginBottom: 4 }}>Notas de operación</Text>
          <TextInput
            style={{ ...inputStyle, minHeight: 60, textAlignVertical: 'top', marginBottom: 12 }}
            placeholder="Notas específicas del canal..."
            placeholderTextColor={T3}
            multiline
            value={fNota}
            onChangeText={setFNota}
          />

          {/* Buttons */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={() => setShowForm(false)}
              style={{
                paddingHorizontal: 16,
                paddingVertical: 11,
                borderRadius: 11,
                borderWidth: 0.5,
                borderColor: BR,
                backgroundColor: C.glass,
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: TX }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={{
                flex: 1,
                paddingVertical: 11,
                borderRadius: 11,
                backgroundColor: AC,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#000' }}>Agregar canal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DETAIL ── */}
      {selCh && (
        <View
          style={{
            marginHorizontal: 14,
            marginBottom: 8,
            backgroundColor: C.ac3,
            borderRadius: 16,
            borderWidth: 0.5,
            borderColor: 'rgba(26,255,110,0.18)',
            padding: 14,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: AC, flex: 1 }}>
              {selCh.num} — {selCh.nombre}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedId(null)}
              style={{
                width: 22,
                height: 22,
                borderRadius: 6,
                backgroundColor: C.glass,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 11, color: T3 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {[
            { k: 'Fuente', v: selCh.src },
            { k: 'Phantom 48V', v: selCh.phantom ? 'SÍ — obligatorio' : 'No' },
            { k: 'Pan', v: selCh.pan },
            { k: 'Fader ref.', v: selCh.fader },
            { k: 'LOW 80Hz', v: selCh.eq.low },
            { k: 'LOW-MID', v: selCh.eq.lowMid },
            { k: 'HIGH-MID', v: selCh.eq.highMid },
            { k: 'HIGH 12kHz', v: selCh.eq.high },
          ].map(({ k, v }) => (
            <View
              key={k}
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                paddingVertical: 4,
                borderBottomWidth: 0.5,
                borderBottomColor: 'rgba(26,255,110,0.08)',
              }}
            >
              <Text style={{ fontSize: 11, color: T2 }}>{k}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: TX }}>{v}</Text>
            </View>
          ))}
          <Text
            style={{ fontSize: 10, color: T2, marginTop: 8, fontStyle: 'italic', lineHeight: 15 }}
          >
            {selCh.nota}
          </Text>
        </View>
      )}

      {/* ── CHANNEL LIST ── */}
      <View style={{ paddingHorizontal: 14 }}>
        {channels.map((ch) => {
          const color = TYPE_COLOR[ch.tipo] ?? AC
          const isSel = selectedId === ch.id
          return (
            <TouchableOpacity
              key={ch.id}
              onPress={() => setSelectedId(isSel ? null : ch.id)}
              style={{
                backgroundColor: isSel ? `${color}08` : C.glass,
                borderRadius: 12,
                borderWidth: 0.5,
                borderColor: isSel ? `${color}30` : BR,
                borderLeftWidth: 2.5,
                borderLeftColor: color,
                padding: 13,
                marginBottom: 7,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 11,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: T3, width: 34 }}>{ch.num}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isSel ? color : TX }}>
                  {ch.nombre}
                </Text>
                <Text style={{ fontSize: 10, color: T2, marginTop: 1 }}>{ch.src}</Text>
              </View>
              {ch.phantom && (
                <View
                  style={{
                    paddingHorizontal: 5,
                    paddingVertical: 2,
                    borderRadius: 8,
                    backgroundColor: C.rd2,
                    borderWidth: 0.5,
                    borderColor: 'rgba(255,77,77,0.2)',
                  }}
                >
                  <Text style={{ fontSize: 8, fontWeight: '700', color: RD }}>48V</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => {
                  if (selectedId === ch.id) setSelectedId(null)
                  removeChannel(ch.id)
                }}
                style={{ padding: 4, borderRadius: 6 }}
              >
                <Text style={{ fontSize: 13, color: T3 }}>✕</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )
        })}
      </View>
    </ScrollView>
  )
}
