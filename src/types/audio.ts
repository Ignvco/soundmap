export interface GearItem {
  id: string
  nombre: string
  marca: string
  tipo: 'top' | 'sub' | 'amp' | 'dsp' | 'mixer' | 'mic'
  activo: boolean
  potenciaW: number
  maxSpl: number
  specs: string
}

export interface GearSystem {
  top: GearItem
  sub: GearItem
  amp?: GearItem
  dsp: GearItem
  mixer: GearItem
  mics: GearItem[]
}

export interface CrossoverConfig {
  hz: number
  tipo: string
  outA: { funcion: string; hz: number; equipo: string }
  outB: { funcion: string; hz: number; equipo: string }
  outC: { funcion: string; hz: number; equipo: string }
  outD: { funcion: string; hz: number; equipo: string }
}

export interface SystemPreset {
  id: string
  nombre: string
  escenario: 'pared_larga' | 'pared_corta'
  vidrios: boolean
  crossoverHz: number
  nivelTopsDb: number
  nivelSubsDb: number
  highShelfDb: number
  esBackup: boolean
}

export interface EQBand {
  freq: number
  gain: number
  q?: number
  tipo: 'peak' | 'hpf' | 'lpf' | 'shelf_high' | 'shelf_low'
}
