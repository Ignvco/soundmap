import type { CrossoverConfig, GearSystem } from '@/types/audio';

// Los RCF bajan bien hasta 55Hz → crossover a 80Hz
// Las PV215 son ineficientes <100Hz → crossover a 100Hz
export function getCrossoverHz(gear: GearSystem): number {
  const activeTopBrands = ['RCF', 'QSC', 'JBL', 'Yamaha']
  const isActiveTOP = activeTopBrands.some((b) =>
    gear.top.marca.toUpperCase().includes(b.toUpperCase())
  )
  return isActiveTOP ? 80 : 100
}

export function buildCrossoverConfig(gear: GearSystem): CrossoverConfig {
  const hz = getCrossoverHz(gear)
  return {
    hz,
    tipo: 'LR24',
    outA: { funcion: 'HPF', hz, equipo: gear.top.nombre },
    outB: { funcion: 'HPF', hz, equipo: gear.top.nombre },
    outC: { funcion: 'LPF', hz, equipo: gear.sub.nombre },
    outD: { funcion: 'LPF', hz, equipo: gear.sub.nombre },
  }
}
