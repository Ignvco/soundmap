import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { CHANNELS_DATA, type ChannelData } from '@/constants/channels-data'
import { diagnosRoom } from '@/lib/audio/acoustics'

// ─── Tipos base ───────────────────────────────────────────

export type SystemType = 'active' | 'passive' | 'hybrid'

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

// ─── DSP con configuración completa ──────────────────────

export interface DSPOutput {
  id:          string   // 'A' | 'B' | 'C' | 'D' | 'E' | 'F'
  label:       string   // 'TOPs IZQ' | 'TOPs DER' | 'SUBs IZQ' etc.
  destino:     string   // qué parlante va conectado
  gainDb:      number   // gain de salida
  delayMs:     number   // delay en ms
  hpfHz:       number   // high-pass filter
  lpfHz:       number   // low-pass filter
  limiterDb:   number   // limitador dBu
  eqBands:     DSPEQBand[]
}

export interface DSPEQBand {
  hz:    number
  db:    number
  q:     number
  tipo:  'peak' | 'hpf' | 'lpf' | 'shelf_high' | 'shelf_low'
}

export interface DSPConfig {
  dspId:       string   // id del DSP en gear-database
  nombre:      string   // 'DCX2496 Principal' etc.
  crossoverHz: number
  tipo:        'linkwitz_riley' | 'butterworth' | 'bessel'
  pendiente:   24 | 18 | 12 | 48   // dB/oct
  outputs:     DSPOutput[]
}

// ─── Amplificador con config ──────────────────────────────

export interface AmpConfig {
  ampId:        string
  nombre:       string
  canales:      number   // 1 | 2 | 4
  wattsPerCh:   number
  ohmsPerCh:    number
  modo:         'stereo' | 'bridge' | 'parallel'
  destinoCH1:   string   // qué parlante va al CH1
  destinoCH2:   string
  gainCH1:      number   // 0-100%
  gainCH2:      number
}

// ─── Gear Selection extendida ─────────────────────────────

export interface GearSelection {
  // TOPs
  tops:        string[]    // múltiples tops (antes solo 'top')
  topQty:      number      // cantidad por lado

  // SUBs
  subs:        string[]
  subQty:      number

  // Sistema
  systemType:  SystemType  // 'active' | 'passive' | 'hybrid'

  // Para sistema pasivo/híbrido
  amps:        AmpConfig[]  // múltiples amplificadores

  // DSP
  dsps:        DSPConfig[]  // múltiples DSP con config completa

  // Mixer
  mixer:       string

  // Monitores
  monitores:   string[]
  monitorQty:  number

  // Micrófonos
  mics:        string[]

  // Legacy (compatibilidad)
  top:         string
  sub:         string
  amp:         string
  dsp:         string
}

// ─── Preset ───────────────────────────────────────────────

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

// ─── Escenario guardado ───────────────────────────────────

export interface SavedScene {
  id:      number
  nombre:  string
  fecha:   string
  room:    RoomData
  gear:    GearSelection
  preset:  SystemPreset
  channels: ChannelData[]
}

// ─── Store interface ──────────────────────────────────────

interface AppStore {
  room:            RoomData | null
  setRoom:         (r: RoomData) => void

  gear:            GearSelection
  setGear:         (g: Partial<GearSelection>) => void
  setSystemType:   (t: SystemType) => void

  // DSP
  addDSP:          (d: DSPConfig) => void
  updateDSP:       (id: string, d: Partial<DSPConfig>) => void
  removeDSP:       (id: string) => void

  // Amplificadores
  addAmp:          (a: AmpConfig) => void
  updateAmp:       (id: string, a: Partial<AmpConfig>) => void
  removeAmp:       (id: string) => void

  // Presets
  allPresets:      SystemPreset[]
  activePreset:    SystemPreset | null
  setActivePreset: (p: SystemPreset) => void
  addPreset:       (p: SystemPreset) => void

  // Channels
  channels:        ChannelData[]
  addChannel:      (ch: ChannelData) => void
  removeChannel:   (id: number) => void
  resetChannels:   () => void

  // Scenes
  scenes:          SavedScene[]
  saveScene:       (nombre: string) => void
  loadScene:       (id: number) => void   // FIX punto 6
  deleteScene:     (id: number) => void

  // Room Scan → genera presets automáticamente
  applyRoomScan:   (room: RoomData) => void

  // Config automática DSP desde Room Scan (punto 9)
  generateDSPConfig: () => void
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

// ─── DSP por defecto (DCX2496) ────────────────────────────

const DEFAULT_DSP_CONFIG: DSPConfig = {
  dspId:       'dcx2496',
  nombre:      'DCX2496 Principal',
  crossoverHz: 80,
  tipo:        'linkwitz_riley',
  pendiente:   24,
  outputs: [
    {
      id: 'A', label: 'TOPs IZQ', destino: 'RCF 912-A IZQ',
      gainDb: 0, delayMs: 0, hpfHz: 80, lpfHz: 20000, limiterDb: 18,
      eqBands: [
        { hz: 180,  db: -1.5, q: 1.4, tipo: 'peak' },
        { hz: 300,  db: -2,   q: 1.2, tipo: 'peak' },
        { hz: 2500, db: 1,    q: 1.5, tipo: 'peak' },
        { hz: 8000, db: -1,   q: 0,   tipo: 'shelf_high' },
      ],
    },
    {
      id: 'B', label: 'TOPs DER', destino: 'RCF 912-A DER',
      gainDb: 0, delayMs: 0, hpfHz: 80, lpfHz: 20000, limiterDb: 18,
      eqBands: [
        { hz: 180,  db: -1.5, q: 1.4, tipo: 'peak' },
        { hz: 300,  db: -2,   q: 1.2, tipo: 'peak' },
        { hz: 2500, db: 1,    q: 1.5, tipo: 'peak' },
        { hz: 8000, db: -1,   q: 0,   tipo: 'shelf_high' },
      ],
    },
    {
      id: 'C', label: 'SUBs IZQ', destino: 'AIR18 IZQ',
      gainDb: -3, delayMs: 0, hpfHz: 35, lpfHz: 80, limiterDb: 18,
      eqBands: [
        { hz: 55,  db: 2,    q: 1.4, tipo: 'peak' },
        { hz: 80,  db: -1.5, q: 1.8, tipo: 'peak' },
        { hz: 100, db: -2,   q: 2.0, tipo: 'peak' },
      ],
    },
    {
      id: 'D', label: 'SUBs DER', destino: 'AIR18 DER',
      gainDb: -3, delayMs: 0, hpfHz: 35, lpfHz: 80, limiterDb: 18,
      eqBands: [
        { hz: 55,  db: 2,    q: 1.4, tipo: 'peak' },
        { hz: 80,  db: -1.5, q: 1.8, tipo: 'peak' },
        { hz: 100, db: -2,   q: 2.0, tipo: 'peak' },
      ],
    },
  ],
}

// ─── Amp por defecto ──────────────────────────────────────

const DEFAULT_AMP: AmpConfig = {
  ampId: 'gemp800', nombre: 'Gemini P-800 (Backup)',
  canales: 2, wattsPerCh: 250, ohmsPerCh: 8,
  modo: 'stereo',
  destinoCH1: 'PV215 IZQ', destinoCH2: 'PV215 DER',
  gainCH1: 75, gainCH2: 75,
}

// ─── Generador de presets desde Room Scan ─────────────────

function generatePresetsFromRoom(room: RoomData): SystemPreset[] {
  const diag   = diagnosRoom(room)
  const rt     = diag.rt60Full
  const xover  = rt > 1.5 ? 100 : rt > 1.0 ? 90 : 80
  const subNiv = rt > 1.5 ? -6  : rt > 1.0 ? -4 : -3
  const hShelf = rt < 0.5 ?  1  : rt > 1.3 ? -3 : -1
  const delay  = diag.delaySubsMs
  const short  = room.nombre.substring(0, 10).trim()

  return [
    { id: `${short}-A`,  nombre: `${short} BASE A`,          crossoverHz: xover, nivelTopsDb: 0,   nivelSubsDb: subNiv,     highShelfDb: hShelf,     vidrios: false, escenario: 'pared_larga', delaySubsMs: delay },
    { id: `${short}-Av`, nombre: `${short} BASE A · Vidrios`, crossoverHz: xover, nivelTopsDb: 0,   nivelSubsDb: subNiv - 3, highShelfDb: hShelf - 2, vidrios: true,  escenario: 'pared_larga', delaySubsMs: delay },
    { id: `${short}-B`,  nombre: `${short} BASE B`,          crossoverHz: xover, nivelTopsDb: 1.5, nivelSubsDb: subNiv + 1, highShelfDb: hShelf,     vidrios: false, escenario: 'pared_corta', delaySubsMs: delay },
    { id: `${short}-Bv`, nombre: `${short} BASE B · Vidrios`, crossoverHz: xover, nivelTopsDb: 1.5, nivelSubsDb: subNiv - 2, highShelfDb: hShelf - 2, vidrios: true,  escenario: 'pared_corta', delaySubsMs: delay },
    { id: 'bkA',         nombre: 'PV215 BACKUP A',           crossoverHz: 100,   nivelTopsDb: 0,   nivelSubsDb: -3,         highShelfDb: -1,         vidrios: false, escenario: 'pared_larga', delaySubsMs: 0 },
    { id: 'bkB',         nombre: 'PV215 BACKUP B',           crossoverHz: 100,   nivelTopsDb: 1.5, nivelSubsDb: -2,         highShelfDb: -2,         vidrios: false, escenario: 'pared_corta', delaySubsMs: 0 },
  ]
}

// ─── Generador de config DSP desde Room Scan (punto 9) ────

function generateDSPFromRoom(room: RoomData, currentDSPs: DSPConfig[]): DSPConfig[] {
  const diag   = diagnosRoom(room)
  const rt     = diag.rt60Full
  const xover  = rt > 1.5 ? 100 : rt > 1.0 ? 90 : 80
  const hShelf = rt < 0.5 ?  1  : rt > 1.3 ? -3 : -1
  const subGain= rt > 1.5 ? -6  : rt > 1.0 ? -4 : -3

  return currentDSPs.map((dsp) => ({
    ...dsp,
    crossoverHz: xover,
    outputs: dsp.outputs.map((out) => {
      const isSub = out.label.toLowerCase().includes('sub')
      const isTop = out.label.toLowerCase().includes('top')
      return {
        ...out,
        hpfHz:  isSub ? 35   : xover,
        lpfHz:  isSub ? xover: 20000,
        gainDb: isSub ? subGain : 0,
        delayMs: isSub ? diag.delaySubsMs : 0,
        eqBands: isTop
          ? [
              { hz: 180,  db: -1.5,    q: 1.4, tipo: 'peak'       as const },
              { hz: 300,  db: rt > 1.2 ? -2.5 : -2, q: 1.2, tipo: 'peak' as const },
              { hz: 2500, db: 1,       q: 1.5, tipo: 'peak'       as const },
              { hz: 8000, db: hShelf,  q: 0,   tipo: 'shelf_high' as const },
            ]
          : isSub
          ? [
              { hz: 55,  db: rt > 1.5 ? 1 : 2, q: 1.4, tipo: 'peak' as const },
              { hz: 80,  db: -1.5,              q: 1.8, tipo: 'peak' as const },
              { hz: 100, db: -2,                q: 2.0, tipo: 'peak' as const },
            ]
          : out.eqBands,
      }
    }),
  }))
}

// ─── GEAR por defecto ─────────────────────────────────────

const DEFAULT_GEAR: GearSelection = {
  tops:       ['rcf912'],
  topQty:     1,
  subs:       ['air18'],
  subQty:     1,
  systemType: 'active',
  amps:       [DEFAULT_AMP],
  dsps:       [DEFAULT_DSP_CONFIG],
  mixer:      'sl2442',
  monitores:  [],
  monitorQty: 0,
  mics:       ['sm48', 'beta58', 'sm58', 'sm58', 'sm58', 'at2020'],
  // Legacy
  top:  'rcf912',
  sub:  'air18',
  amp:  'gemp800',
  dsp:  'dcx2496',
}

// ─── STORE ────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      room:    null,
      setRoom: (r) => set({ room: r }),

      gear:    DEFAULT_GEAR,
      setGear: (g) => set((s) => ({
        gear: {
          ...s.gear,
          ...g,
          // Sync legacy fields
          top: g.tops?.[0]  ?? g.top  ?? s.gear.tops[0]  ?? s.gear.top,
          sub: g.subs?.[0]  ?? g.sub  ?? s.gear.subs[0]  ?? s.gear.sub,
          amp: g.amps?.[0]?.ampId ?? g.amp ?? s.gear.amp,
          dsp: g.dsps?.[0]?.dspId ?? g.dsp ?? s.gear.dsp,
        },
      })),

      setSystemType: (t) => set((s) => ({
        gear: { ...s.gear, systemType: t },
      })),

      // DSP
      addDSP: (d) => set((s) => ({
        gear: { ...s.gear, dsps: [...s.gear.dsps, d] },
      })),
      updateDSP: (id, d) => set((s) => ({
        gear: {
          ...s.gear,
          dsps: s.gear.dsps.map((x) => x.dspId === id ? { ...x, ...d } : x),
        },
      })),
      removeDSP: (id) => set((s) => ({
        gear: { ...s.gear, dsps: s.gear.dsps.filter((x) => x.dspId !== id) },
      })),

      // Amps
      addAmp: (a) => set((s) => ({
        gear: { ...s.gear, amps: [...s.gear.amps, a] },
      })),
      updateAmp: (id, a) => set((s) => ({
        gear: {
          ...s.gear,
          amps: s.gear.amps.map((x) => x.ampId === id ? { ...x, ...a } : x),
        },
      })),
      removeAmp: (id) => set((s) => ({
        gear: { ...s.gear, amps: s.gear.amps.filter((x) => x.ampId !== id) },
      })),

      // Presets
      allPresets:      DEFAULT_PRESETS,
      activePreset:    DEFAULT_PRESETS[0] ?? null,
      setActivePreset: (p) => set({ activePreset: p }),
      addPreset:       (p) => set((s) => ({ allPresets: [...s.allPresets, p] })),

      // Channels
      channels:      CHANNELS_DATA,
      addChannel:    (ch) => set((s) => ({ channels: [...s.channels, ch] })),
      removeChannel: (id) => set((s) => ({ channels: s.channels.filter((c) => c.id !== id) })),
      resetChannels: () => set({ channels: CHANNELS_DATA }),

      // Scenes
      scenes:  [],
      saveScene: (nombre) => {
        const { room, gear, activePreset, scenes, channels } = get()
        if (!room || !activePreset) return
        set({
          scenes: [...scenes, {
            id:     Date.now(),
            nombre: nombre || room.nombre,
            fecha:  new Date().toLocaleDateString('es-CL'),
            room, gear, preset: activePreset, channels,
          }],
        })
      },

      // FIX punto 6 — cargar escenario en TODOS los módulos
      loadScene: (id) => {
        const { scenes } = get()
        const scene = scenes.find((s) => s.id === id)
        if (!scene) return
        set({
          room:         scene.room,
          gear:         scene.gear,
          activePreset: scene.preset,
          channels:     scene.channels,
        })
      },

      deleteScene: (id) => set((s) => ({ scenes: s.scenes.filter((sc) => sc.id !== id) })),

      // Room Scan → presets automáticos
      applyRoomScan: (room) => {
        const { gear } = get()
        const newPresets   = generatePresetsFromRoom(room)
        const newDSPs      = generateDSPFromRoom(room, gear.dsps)
        const firstPreset  = newPresets[0] ?? DEFAULT_PRESETS[0] ?? null
        set({
          room,
          allPresets:   newPresets,
          activePreset: firstPreset,
          gear:         { ...gear, dsps: newDSPs },
        })
      },

      // Punto 9 — generar config DSP desde Room Scan en cualquier momento
      generateDSPConfig: () => {
        const { room, gear } = get()
        if (!room) return
        const newDSPs = generateDSPFromRoom(room, gear.dsps)
        set({ gear: { ...gear, dsps: newDSPs } })
      },
    }),
    {
      name:    'soundmap-store-v3',
      storage: createJSONStorage(() => AsyncStorage),
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
