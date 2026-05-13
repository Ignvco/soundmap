import type { GearSystem, SystemPreset } from '@/types/audio';
import type { RoomData } from '@/types/room';
import { getCrossoverHz } from './crossover';

export function generatePresets(gear: GearSystem, room: RoomData): SystemPreset[] {
  const xover = getCrossoverHz(gear)
  const escA = room.largo >= room.ancho
  const profA = escA ? room.ancho : room.largo // profundidad en config A
  const profB = escA ? room.largo : room.ancho // profundidad en config B
  const nombreTop = gear.top.nombre.split(' ').slice(0, 3).join(' ')

  // Más nivel cuando la sala es más profunda
  const extraLevelB = profB > 12 ? 1.5 : 0

  return [
    {
      id: 'A',
      nombre: `${nombreTop} BASE A`,
      escenario: escA ? 'pared_larga' : 'pared_corta',
      vidrios: false,
      crossoverHz: xover,
      nivelTopsDb: 0,
      nivelSubsDb: -3,
      highShelfDb: 0,
      esBackup: false,
    },
    {
      id: 'Av2',
      nombre: `${nombreTop} BASE A v2`,
      escenario: escA ? 'pared_larga' : 'pared_corta',
      vidrios: true,
      crossoverHz: xover,
      nivelTopsDb: 0,
      nivelSubsDb: -6,
      highShelfDb: -1.5,
      esBackup: false,
    },
    {
      id: 'B',
      nombre: `${nombreTop} BASE B`,
      escenario: escA ? 'pared_corta' : 'pared_larga',
      vidrios: false,
      crossoverHz: xover,
      nivelTopsDb: extraLevelB,
      nivelSubsDb: -2,
      highShelfDb: extraLevelB > 0 ? -0.5 : 0,
      esBackup: false,
    },
    {
      id: 'Bv2',
      nombre: `${nombreTop} BASE B v2`,
      escenario: escA ? 'pared_corta' : 'pared_larga',
      vidrios: true,
      crossoverHz: xover,
      nivelTopsDb: extraLevelB,
      nivelSubsDb: -5,
      highShelfDb: -2.5,
      esBackup: false,
    },
  ]
}
