import { GEAR_DATABASE } from '@/constants/gear-database';
import type { GearItem, GearSystem, SystemPreset } from '@/types/audio';
import type { SelectedGear } from '@/types/gear';
import type { RoomData } from '@/types/room';
import { generatePresets } from '@audio/presets';
import { create } from 'zustand';

interface AppState {
  room: RoomData | null
  gear: GearSystem | null
  selectedGear: SelectedGear
  activePreset: SystemPreset | null
  allPresets: SystemPreset[]
  setRoom: (room: RoomData) => void
  setSelectedGear: (cat: keyof SelectedGear, id: string | string[]) => void
  setActivePreset: (preset: SystemPreset) => void
  regeneratePresets: () => void
}

const DEFAULT_GEAR: SelectedGear = {
  tops: 'rcf912',
  subs: 'air18',
  amps: 'geminip800',
  dsp: 'dcx2496',
  mixer: 'sl2442',
  mics: ['sm58', 'sm48', 'beta58', 'atcond'],
}

function toGearItem(item: (typeof GEAR_DATABASE)[0], tipo: GearItem['tipo']): GearItem {
  return {
    id: item.id,
    nombre: item.nombre,
    marca: item.marca,
    tipo,
    activo: item.activo,
    potenciaW: item.potenciaW,
    maxSpl: item.maxSpl,
    specs: '',
  }
}

function buildGearSystem(sel: SelectedGear): GearSystem | null {
  const find = (id: string) => GEAR_DATABASE.find((g) => g.id === id)
  const top = find(sel.tops),
    sub = find(sel.subs)
  const dsp = find(sel.dsp),
    mixer = find(sel.mixer)
  if (!top || !sub || !dsp || !mixer) return null
  const amp = find(sel.amps)
  return {
    top: toGearItem(top, 'top'),
    sub: toGearItem(sub, 'sub'),
    dsp: toGearItem(dsp, 'dsp'),
    mixer: toGearItem(mixer, 'mixer'),
    mics: sel.mics
      .map((id) => find(id))
      .filter(Boolean)
      .map((i) => toGearItem(i!, 'mic')),
    ...(amp ? { amp: toGearItem(amp, 'amp') } : {}),
  }
}

export const useAppStore = create<AppState>((set, get) => ({
  room: null,
  gear: buildGearSystem(DEFAULT_GEAR),
  selectedGear: DEFAULT_GEAR,
  activePreset: null,
  allPresets: [],

  setRoom: (room) => {
    const gear = get().gear
    const presets = gear ? generatePresets(gear, room) : []
    set({ room, allPresets: presets, activePreset: presets[0] ?? null })
  },

  setSelectedGear: (cat, id) => {
    const prev = get().selectedGear
    const next = { ...prev, [cat]: id }
    const gear = buildGearSystem(next)
    set({ selectedGear: next, gear })
    get().regeneratePresets()
  },

  setActivePreset: (preset) => set({ activePreset: preset }),

  regeneratePresets: () => {
    const { room, gear } = get()
    if (!room || !gear) return
    const presets = generatePresets(gear, room)
    set({ allPresets: presets, activePreset: presets[0] ?? null })
  },
}))
