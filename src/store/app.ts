import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CHANNELS_DATA, type ChannelData } from '@/constants/channels-data'
import { diagnosRoom } from '@/lib/audio/acoustics'

// ─── Types ────────────────────────────────────────────────
export interface RoomData {
  nombre:        string
  largo:         number
  ancho:         number
  alto:          number
  cap:           number
  matTecho:      number
  matParedes:    number
  matPiso:       number
  matVentanales: number
  rt60Empty:     number
  rt60Full:      number
  eco:           number
  vol:           number
}

export interface GearSelection {
  top:       string
  sub:       string
  amp:       string
  dsp:       string
  mixer:     string
  mics:      string[]
  monitores: string[]
}

export interface SystemPreset {
  id:          string
  nombre:      string
  crossoverHz: number
  nivelTopsDb: number
  nivelSubsDb: number
  highShelfDb: number
  vidrios:     boolean
  escenario:   'pared_larga' | 'pared_corta'
  delaySubsMs: number
}

export interface SavedScene {
  id:     number
  nombre: string
  fecha:  string
  room:   RoomData
  gear:   GearSelection
  preset: SystemPreset
}

interface AppStore {
  room:            RoomData | null
  setRoom:         (r: RoomData) => void

  gear:            GearSelection
  setGear:         (g: Partial<GearSelection>) => void

  allPresets:      SystemPreset[]
  activePreset:    SystemPreset | null
  setActivePreset: (p: SystemPreset) => void
  addPreset:       (p: SystemPreset) => void

  channels:        ChannelData[]
  addChannel:      (ch: ChannelData) => void
  removeChannel:   (id: number) => void
  resetChannels:   () => void

  scenes:          SavedScene[]
  saveScene:       (nombre: string) => void
  deleteScene:     (id: number) => void

  // Acción clave: Room Scan completo actualiza presets automáticamente
  applyRoomScan:   (room: RoomData) => void
}

// ─── Presets por defecto ──────────────────────────────────
const DEFAULT_PRESETS: SystemPreset[] = [
  { id: 'A',   nombre: 'RCF BASE A',     crossoverHz: 80,  nivelTopsDb: 0,   nivelSubsDb: -3, highShelfDb: -1, vidrios: false, escenario: 'pared_larga', delaySubsMs: 0 },
  { id: 'Av2', nombre: 'RCF BASE A v2',  crossoverHz: 80,  nivelTopsDb: 0,   nivelSubsDb: -6, highShelfDb: -3, vidrios: true,  escenario: 'pared_larga', delaySubsMs: 0 },
  { id: 'B',   nombre: 'RCF BASE B',     crossoverHz: 80,  nivelTopsDb: 1.5, nivelSubsDb: -2, highShelfDb: -2, vidrios: false, escenario: 'pared_corta', delaySubsMs: 0 },
  { id: 'Bv2', nombre: 'RCF BASE B v2',  crossoverHz: 80,  nivelTopsDb: 1.5, nivelSubsDb: -5, highShelfDb: -4, vidrios: true,  escenario: 'pared_corta', delaySubsMs: 0 },
  { id: 'bkA', nombre: 'PV215 BACKUP A', crossoverHz: 100, nivelTopsDb: 0,   nivelSubsDb: -3, highShelfDb: -1, vidrios: false, escenario: 'pared_larga', delaySubsMs: 0 },
  { id: 'bkB', nombre: 'PV215 BACKUP B', crossoverHz: 100, nivelTopsDb: 1.5, nivelSubsDb: -2, highShelfDb: -2, vidrios: false, escenario: 'pared_corta', delaySubsMs: 0 },
]

// ─── Generador de presets a partir del Room Scan ──────────
// Fix mejora importante #3: presets se actualizan automáticamente
function generatePresetsFromRoom(room: RoomData): SystemPreset[] {
  const diag = diagnosRoom(room)
  const rt   = diag.rt60Full

  // Crossover sugerido según RT60
  // RT60 alto → subir crossover para reducir energía de medios graves en sala
  const xover = rt > 1.5 ? 100 : rt > 1.0 ? 90 : 80

  // Nivel SUBs sugerido: salas muy reverberantes → bajar subs
  const subNivel = rt > 1.5 ? -6 : rt > 1.0 ? -4 : -3

  // High shelf sugerido: salas muertas → levantar altos
  const hShelf  = rt < 0.5 ? 1 : rt > 1.3 ? -3 : -1

  // Delay SUBs sugerido del diagnóstico
  const delay = diag.delaySubsMs

  const roomShort = room.nombre.length > 10
    ? room.nombre.substring(0, 10).trim()
    : room.nombre

  return [
    {
      id: `${roomShort}-A`,
      nombre: `${roomShort} BASE A`,
      crossoverHz: xover, nivelTopsDb: 0, nivelSubsDb: subNivel,
      highShelfDb: hShelf, vidrios: false, escenario: 'pared_larga', delaySubsMs: delay,
    },
    {
      id: `${roomShort}-Av`,
      nombre: `${roomShort} BASE A · Vidrios`,
      crossoverHz: xover, nivelTopsDb: 0, nivelSubsDb: subNivel - 3,
      highShelfDb: hShelf - 2, vidrios: true, escenario: 'pared_larga', delaySubsMs: delay,
    },
    {
      id: `${roomShort}-B`,
      nombre: `${roomShort} BASE B`,
      crossoverHz: xover, nivelTopsDb: 1.5, nivelSubsDb: subNivel + 1,
      highShelfDb: hShelf, vidrios: false, escenario: 'pared_corta', delaySubsMs: delay,
    },
    {
      id: `${roomShort}-Bv`,
      nombre: `${roomShort} BASE B · Vidrios`,
      crossoverHz: xover, nivelTopsDb: 1.5, nivelSubsDb: subNivel - 2,
      highShelfDb: hShelf - 2, vidrios: true, escenario: 'pared_corta', delaySubsMs: delay,
    },
    // Backup siempre igual
    { id: 'bkA', nombre: 'PV215 BACKUP A', crossoverHz: 100, nivelTopsDb: 0,   nivelSubsDb: -3, highShelfDb: -1, vidrios: false, escenario: 'pared_larga', delaySubsMs: 0 },
    { id: 'bkB', nombre: 'PV215 BACKUP B', crossoverHz: 100, nivelTopsDb: 1.5, nivelSubsDb: -2, highShelfDb: -2, vidrios: false, escenario: 'pared_corta', delaySubsMs: 0 },
  ]
}

// ─── Store con persist ────────────────────────────────────
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      room:     null,
      setRoom:  (r) => set({ room: r }),

      gear: {
        top: 'rcf912', sub: 'air18', amp: 'gemp800',
        dsp: 'dcx2496', mixer: 'sl2442',
        mics: ['sm48', 'beta58', 'sm58', 'sm58', 'sm58', 'at2020'],
        monitores: [],
      },
      setGear: (g) => set((s) => ({ gear: { ...s.gear, ...g } })),

      allPresets:      DEFAULT_PRESETS,
      activePreset:    DEFAULT_PRESETS[0] ?? null,
      setActivePreset: (p) => set({ activePreset: p }),
      addPreset:       (p) => set((s) => ({ allPresets: [...s.allPresets, p] })),

      channels:      CHANNELS_DATA,
      addChannel:    (ch) => set((s) => ({ channels: [...s.channels, ch] })),
      removeChannel: (id) => set((s) => ({ channels: s.channels.filter((c) => c.id !== id) })),
      resetChannels: () => set({ channels: CHANNELS_DATA }),

      scenes:      [],
      saveScene:   (nombre) => {
        const { room, gear, activePreset, scenes } = get()
        if (!room || !activePreset) return
        const scene: SavedScene = {
          id:     Date.now(),
          nombre: nombre || room.nombre,
          fecha:  new Date().toLocaleDateString('es-CL'),
          room, gear, preset: activePreset,
        }
        set({ scenes: [...scenes, scene] })
      },
      deleteScene: (id) => set((s) => ({ scenes: s.scenes.filter((sc) => sc.id !== id) })),

      // Fix mejora importante #3 — Room Scan genera presets automáticos
      applyRoomScan: (room) => {
        const newPresets  = generatePresetsFromRoom(room)
        const firstPreset = newPresets[0] ?? DEFAULT_PRESETS[0] ?? null
        set({
          room,
          allPresets:   newPresets,
          activePreset: firstPreset,
        })
      },
    }),
    {
      name:    'soundmap-store-v2',
      storage: createJSONStorage(() => AsyncStorage),
      // Solo persistir lo que importa, no funciones
      partialize: (state) => ({
        room:         state.room,
        gear:         state.gear,
        allPresets:   state.allPresets,
        activePreset: state.activePreset,
        channels:     state.channels,
        scenes:       state.scenes,
      }),
    },
  ),
)
