import React, { useState } from 'react'
import {
  ScrollView, Text, TextInput,
  TouchableOpacity, View, Alert,
} from 'react-native'
import { useAppStore } from '@/store/app'
import { C } from '@/constants/theme'
import type { ChannelData } from '@/constants/channels-data'

const AC = C.ac, BG = C.bg, BR = C.br2
const TX = C.tx, T2 = C.t2, T3 = C.t3, RD = C.rd

const TYPE_COLOR: Record<string, string> = {
  voz:  '#60a5fa',
  inst: '#1aff6e',
  fx:   '#fbbf24',
  perc: '#a78bfa',
}
const TYPE_LABEL: Record<string, string> = {
  voz: 'VOZ', inst: 'INST', fx: 'FX', perc: 'PERC',
}

let _nextId = 100

// ── Formulario vacío por defecto ──────────────────────────
const EMPTY_FORM = {
  nombre:  '',
  src:     '',
  tipo:    'voz' as ChannelData['tipo'],
  phantom: false,
  low:     '0 dB',
  lowMid:  '0 dB',
  highMid: '0 dB',
  high:    '0 dB',
  nota:    '',
}

export default function ChannelsScreen() {
  const { channels, addChannel, removeChannel, resetChannels } = useAppStore()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showForm,   setShowForm]   = useState(false)
  const [form,       setForm]       = useState({ ...EMPTY_FORM })
  const [errors,     setErrors]     = useState<Record<string, string>>({})

  const selCh = selectedId !== null
    ? channels.find((c) => c.id === selectedId) ?? null
    : null

  // ── Validación fix mejora #2 ───────────────────────────
  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.nombre.trim())          errs.nombre = 'Requerido'
    if (!form.src.trim())             errs.src    = 'Requerido'
    if (form.nombre.trim().length < 2) errs.nombre = 'Mínimo 2 caracteres'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleAdd = () => {
    if (!validate()) return
    addChannel({
      id:      _nextId++,
      num:     `CH ${channels.length + 1}`,
      nombre:  form.nombre.trim(),
      src:     form.src.trim(),
      phantom: form.phantom,
      tipo:    form.tipo,
      pan:     'Centro',
      fader:   '0 dB',
      eq: {
        low:     form.low,
        lowMid:  form.lowMid,
        highMid: form.highMid,
        high:    form.high,
      },
      nota: form.nota.trim() || '—',
    })
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setShowForm(false)
  }

  const handleCancel = () => {
    setForm({ ...EMPTY_FORM })
    setErrors({})
    setShowForm(false)
  }

  const handleDelete = (id: number) => {
    Alert.alert('Eliminar canal', '¿Eliminás este canal?', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: () => {
          if (selectedId === id) setSelectedId(null)
          removeChannel(id)
        },
      },
    ])
  }

  const iStyle = {
    backgroundColor: C.glass,
    borderWidth: 0.5, borderRadius: 9,
    padding: 10, color: TX, fontSize: 12,
  } as const

  const errStyle = (field: string) => ({
    ...iStyle,
    borderColor: errors[field] ? RD : BR,
  } as const)

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: BG }}
      contentContainerStyle={{ paddingBottom: 100 }}
      keyboardShouldPersistTaps="handled"
    >
      {/* Header */}
      <View style={{ paddingHorizontal: 16, paddingTop: 60, paddingBottom: 12 }}>
        <Text style={{ fontSize: 22, fontWeight: '800', color: TX, letterSpacing: -0.5, marginBottom: 4 }}>
          Canal por Canal
        </Text>
        <Text style={{ fontSize: 11, color: T3, marginBottom: 16 }}>
          Mixer SL2442FX · {channels.length} canales
        </Text>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <TouchableOpacity
            onPress={() => {
              setForm({ ...EMPTY_FORM })
              setErrors({})
              setShowForm(!showForm)
            }}
            style={{
              paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
              borderWidth: 0.5,
              borderColor: showForm ? 'rgba(26,255,110,0.3)' : BR,
              backgroundColor: showForm ? C.ac2 : 'transparent',
            }}
          >
            <Text style={{ fontSize: 11, fontWeight: '700', color: showForm ? AC : T2 }}>
              {showForm ? '✕ Cancelar' : '+ Agregar canal'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() =>
              Alert.alert('Restablecer canales', '¿Volver a los 10 canales originales?', [
                { text: 'Cancelar', style: 'cancel' },
                { text: 'Restablecer', style: 'destructive', onPress: () => { resetChannels(); setSelectedId(null) } },
              ])
            }
            style={{ paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: BR }}
          >
            <Text style={{ fontSize: 11, color: T2 }}>↺ Reset</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* ── FORMULARIO ── */}
      {showForm && (
        <View style={{
          marginHorizontal: 14, marginBottom: 12,
          backgroundColor: C.glass2, borderRadius: 16,
          borderWidth: 0.5, borderColor: BR, padding: 14,
        }}>
          <Text style={{ fontSize: 13, fontWeight: '700', color: TX, marginBottom: 14 }}>Nuevo canal</Text>

          {/* Nombre + Fuente */}
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 10 }}>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: errors.nombre ? RD : T2, marginBottom: 4, fontWeight: errors.nombre ? '700' : '400' }}>
                Nombre {errors.nombre ? `— ${errors.nombre}` : '*'}
              </Text>
              <TextInput
                style={errStyle('nombre')}
                placeholder="Ej: Guitarra 3"
                placeholderTextColor={T3}
                value={form.nombre}
                onChangeText={(v) => { setForm((f) => ({ ...f, nombre: v })); if (errors.nombre) setErrors((e) => ({ ...e, nombre: '' })) }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 9, color: errors.src ? RD : T2, marginBottom: 4, fontWeight: errors.src ? '700' : '400' }}>
                Fuente {errors.src ? `— ${errors.src}` : '*'}
              </Text>
              <TextInput
                style={errStyle('src')}
                placeholder="Ej: SM57, DI Box"
                placeholderTextColor={T3}
                value={form.src}
                onChangeText={(v) => { setForm((f) => ({ ...f, src: v })); if (errors.src) setErrors((e) => ({ ...e, src: '' })) }}
              />
            </View>
          </View>

          {/* EQ bands */}
          <View style={{ flexDirection: 'row', gap: 7, marginBottom: 10 }}>
            {[
              { label: 'LOW 80Hz',   key: 'low'     },
              { label: 'LOW-MID',    key: 'lowMid'  },
              { label: 'HIGH-MID',   key: 'highMid' },
              { label: 'HIGH 12kHz', key: 'high'    },
            ].map(({ label, key }) => (
              <View key={key} style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, color: T2, marginBottom: 3 }}>{label}</Text>
                <TextInput
                  style={{ ...iStyle, borderColor: BR, padding: 8 }}
                  placeholder="0 dB"
                  placeholderTextColor={T3}
                  value={(form as any)[key]}
                  onChangeText={(v) => setForm((f) => ({ ...f, [key]: v }))}
                />
              </View>
            ))}
          </View>

          {/* Tipo */}
          <Text style={{ fontSize: 9, color: T2, marginBottom: 6 }}>Tipo de señal</Text>
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 12 }}>
            {(['voz', 'inst', 'fx', 'perc'] as ChannelData['tipo'][]).map((t) => {
              const tc = TYPE_COLOR[t] ?? AC
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setForm((f) => ({ ...f, tipo: t }))}
                  style={{
                    flex: 1, paddingVertical: 7, borderRadius: 8, alignItems: 'center',
                    borderWidth: form.tipo === t ? 1 : 0.5,
                    borderColor: form.tipo === t ? `${tc}50` : BR,
                    backgroundColor: form.tipo === t ? `${tc}15` : 'transparent',
                  }}
                >
                  <Text style={{ fontSize: 9, fontWeight: '700', color: form.tipo === t ? tc : T2 }}>
                    {TYPE_LABEL[t]}
                  </Text>
                </TouchableOpacity>
              )
            })}
          </View>

          {/* Phantom */}
          <TouchableOpacity
            onPress={() => setForm((f) => ({ ...f, phantom: !f.phantom }))}
            style={{ flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 }}
          >
            <View style={{
              width: 18, height: 18, borderRadius: 4, borderWidth: 1,
              borderColor: form.phantom ? RD : BR,
              backgroundColor: form.phantom ? C.rd2 : 'transparent',
              alignItems: 'center', justifyContent: 'center',
            }}>
              {form.phantom && <Text style={{ fontSize: 10, color: RD, fontWeight: '800' }}>✓</Text>}
            </View>
            <Text style={{ fontSize: 12, color: T2 }}>Phantom 48V</Text>
            {form.phantom && (
              <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8, backgroundColor: C.rd2, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)' }}>
                <Text style={{ fontSize: 8, fontWeight: '700', color: RD }}>ACTIVO — obligatorio para condensadores</Text>
              </View>
            )}
          </TouchableOpacity>

          {/* Notas */}
          <Text style={{ fontSize: 9, color: T2, marginBottom: 4 }}>Notas de operación</Text>
          <TextInput
            style={{ ...iStyle, borderColor: BR, minHeight: 56, textAlignVertical: 'top', marginBottom: 14 }}
            placeholder="Ej: Hablar a 5–10cm. Boost de 2kHz para claridad."
            placeholderTextColor={T3}
            multiline
            value={form.nota}
            onChangeText={(v) => setForm((f) => ({ ...f, nota: v }))}
          />

          {/* Error global */}
          {Object.keys(errors).length > 0 && (
            <View style={{ backgroundColor: C.rd2, borderRadius: 8, padding: 9, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)', marginBottom: 10 }}>
              <Text style={{ fontSize: 11, color: RD }}>
                Completá los campos obligatorios marcados en rojo.
              </Text>
            </View>
          )}

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={handleCancel}
              style={{ paddingHorizontal: 16, paddingVertical: 11, borderRadius: 11, borderWidth: 0.5, borderColor: BR, backgroundColor: C.glass }}
            >
              <Text style={{ fontSize: 12, fontWeight: '500', color: TX }}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleAdd}
              style={{ flex: 1, paddingVertical: 11, borderRadius: 11, backgroundColor: AC, alignItems: 'center' }}
            >
              <Text style={{ fontSize: 12, fontWeight: '700', color: '#000' }}>Agregar canal</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* ── DETALLE CANAL ── */}
      {selCh && (
        <View style={{
          marginHorizontal: 14, marginBottom: 8,
          backgroundColor: C.ac3, borderRadius: 16,
          borderWidth: 0.5, borderColor: 'rgba(26,255,110,0.18)', padding: 14,
        }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={{ fontSize: 13, fontWeight: '700', color: AC, flex: 1 }}>
              {selCh.num} — {selCh.nombre}
            </Text>
            <TouchableOpacity
              onPress={() => setSelectedId(null)}
              style={{ width: 22, height: 22, borderRadius: 6, backgroundColor: C.glass, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ fontSize: 11, color: T3 }}>✕</Text>
            </TouchableOpacity>
          </View>
          {[
            { k: 'Fuente',       v: selCh.src },
            { k: 'Phantom 48V',  v: selCh.phantom ? 'SÍ — obligatorio' : 'No' },
            { k: 'Pan',          v: selCh.pan },
            { k: 'Fader ref.',   v: selCh.fader },
            { k: 'LOW 80Hz',     v: selCh.eq.low },
            { k: 'LOW-MID',      v: selCh.eq.lowMid },
            { k: 'HIGH-MID',     v: selCh.eq.highMid },
            { k: 'HIGH 12kHz',   v: selCh.eq.high },
          ].map(({ k, v }) => (
            <View key={k} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 0.5, borderBottomColor: 'rgba(26,255,110,0.08)' }}>
              <Text style={{ fontSize: 11, color: T2 }}>{k}</Text>
              <Text style={{ fontSize: 11, fontWeight: '600', color: selCh.phantom && k === 'Phantom 48V' ? RD : TX }}>{v}</Text>
            </View>
          ))}
          <Text style={{ fontSize: 10, color: T2, marginTop: 8, fontStyle: 'italic', lineHeight: 15 }}>{selCh.nota}</Text>
        </View>
      )}

      {/* ── LISTA DE CANALES ── */}
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
                borderRadius: 12, borderWidth: 0.5,
                borderColor: isSel ? `${color}30` : BR,
                borderLeftWidth: 2.5, borderLeftColor: color,
                padding: 13, marginBottom: 7,
                flexDirection: 'row', alignItems: 'center', gap: 11,
              }}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 9, fontWeight: '700', color: T3, width: 34 }}>{ch.num}</Text>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: '600', color: isSel ? color : TX }}>{ch.nombre}</Text>
                <Text style={{ fontSize: 10, color: T2, marginTop: 1 }}>{ch.src}</Text>
              </View>
              {ch.phantom && (
                <View style={{ paddingHorizontal: 5, paddingVertical: 2, borderRadius: 8, backgroundColor: C.rd2, borderWidth: 0.5, borderColor: 'rgba(255,77,77,0.2)' }}>
                  <Text style={{ fontSize: 8, fontWeight: '700', color: RD }}>48V</Text>
                </View>
              )}
              <TouchableOpacity
                onPress={() => handleDelete(ch.id)}
                style={{ padding: 5, borderRadius: 6 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
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
