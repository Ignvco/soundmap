import { create } from 'zustand'
import { CHANNELS_DATA, type ChannelData } from '@/constants/channels-data'

// ─── Types ────────────────────────────────────────────────
export interface RoomData {
  nombre:    string
  largo:     number
  ancho:     number
  alto:      number
  cap:       number
  matTecho:  number
  matParedes: number
  matPiso:   number
  matVentanales: number
  rt60Empty: number
  rt60Full:  number
  eco:       number
  vol:       number
}

export interface GearSelection {
  top:       string   // gear id
  sub:       string
  amp:       string
  dsp:       string
  mixer:     string
  mics:      string[]
  monitores: string[]
}

export interface SystemPreset {
  id:           string
  nombre:       string
  crossoverHz:  number
  nivelTopsDb:  number
  nivelSubsDb:  number
  highShelfDb:  number
  vidrios:      boolean
  escenario:    'pared_larga' | 'pared_corta'
  delaySubsMs:  number
}

export interface SavedScene {
  id:        number
  nombre:    string
  fecha:     string
  room:      RoomData
  gear:      GearSelection
  preset:    SystemPreset
}

interface AppStore {
  // Room
  room:          RoomData | null
  setRoom:       (r: RoomData) => void

  // Gear
  gear:          GearSelection
  setGear:       (g: Partial<GearSelection>) => void

  // Presets
  allPresets:    SystemPreset[]
  activePreset:  SystemPreset | null
  setActivePreset: (p: SystemPreset) => void
  addPreset:     (p: SystemPreset) => void

  // Channels
  channels:      ChannelData[]
  addChannel:    (ch: ChannelData) => void
  removeChannel: (id: number) => void

  // Scenes
  scenes:        SavedScene[]
  saveScene:     (nombre: string) => void
  deleteScene:   (id: number) => void
}

// ─── Default presets ─────────────────────────────────────
const DEFAULT_PRESETS: SystemPreset[] = [
  {
    id: 'A',   nombre: 'RCF BASE A',    crossoverHz: 80, nivelTopsDb: 0,   nivelSubsDb: -3, highShelfDb: -1, vidrios: false, escenario: 'pared_larga', delaySubsMs: 0,
  },
  {
    id: 'Av2', nombre: 'RCF BASE A v2', crossoverHz: 80, nivelTopsDb: 0,   nivelSubsDb: -6, highShelfDb: -3, vidrios: true,  escenario: 'pared_larga', delaySubsMs: 0,
  },
  {
    id: 'B',   nombre: 'RCF BASE B',    crossoverHz: 80, nivelTopsDb: 1.5, nivelSubsDb: -2, highShelfDb: -2, vidrios: false, escenario: 'pared_corta', delaySubsMs: 0,
  },
  {
    id: 'Bv2', nombre: 'RCF BASE B v2', crossoverHz: 80, nivelTopsDb: 1.5, nivelSubsDb: -5, highShelfDb: -4, vidrios: true,  escenario: 'pared_corta', delaySubsMs: 0,
  },
  {
    id: 'bkA', nombre: 'PV215 BACKUP A',crossoverHz: 100,nivelTopsDb: 0,   nivelSubsDb: -3, highShelfDb: -1, vidrios: false, escenario: 'pared_larga', delaySubsMs: 0,
  },
  {
    id: 'bkB', nombre: 'PV215 BACKUP B',crossoverHz: 100,nivelTopsDb: 1.5, nivelSubsDb: -2, highShelfDb: -2, vidrios: false, escenario: 'pared_corta', delaySubsMs: 0,
  },
]

// ─── Store ────────────────────────────────────────────────
export const useAppStore = create<AppStore>((set, get) => ({
  room:         null,
  setRoom:      (r) => set({ room: r }),

  gear: {
    top: 'rcf912', sub: 'air18', amp: 'gemp800',
    dsp: 'dcx2496', mixer: 'sl2442',
    mics: ['sm48', 'beta58', 'sm58', 'sm58', 'sm58', 'at2020'],
    monitores: [],
  },
  setGear: (g) => set((s) => ({ gear: { ...s.gear, ...g } })),

  allPresets:    DEFAULT_PRESETS,
  activePreset:  DEFAULT_PRESETS[0] ?? null,
  setActivePreset: (p) => set({ activePreset: p }),
  addPreset: (p) => set((s) => ({ allPresets: [...s.allPresets, p] })),

  channels:      CHANNELS_DATA,
  addChannel:    (ch) => set((s) => ({ channels: [...s.channels, ch] })),
  removeChannel: (id) => set((s) => ({ channels: s.channels.filter((c) => c.id !== id) })),

  scenes:  [],
  saveScene: (nombre) => {
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
}))
