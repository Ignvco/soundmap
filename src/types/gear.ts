export type GearCategory = 'tops' | 'subs' | 'amps' | 'dsp' | 'mixer' | 'mics'

export interface GearDBItem {
  id: string
  nombre: string
  marca: string
  categoria: GearCategory
  specs: string
  emoji: string
  activo: boolean
  potenciaW: number
  maxSpl: number
}

export interface SelectedGear {
  tops: string // gear ID
  subs: string
  amps: string
  dsp: string
  mixer: string
  mics: string[]
}
