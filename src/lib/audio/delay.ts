// Velocidad del sonido: 343 m/s → 2.915 ms/metro
const MS_PER_METER = 2.915

export function calcDelay(
  distanciaTop: number, // metros al punto de escucha
  distanciaSub: number // metros al punto de escucha
): number {
  const diff = distanciaSub - distanciaTop
  if (diff <= 0) return 0
  return Math.round(diff * MS_PER_METER * 10) / 10
}

// Posición A (sobre subs): delay ≈ 0ms
// Posición B (trípodes): medir con cinta y calcular
export function getDelayLabel(posicion: 'sobre_subs' | 'tripodes', delayMs: number): string {
  if (posicion === 'sobre_subs') return '~0 ms (Posición A — sobre los subs)'
  return `${delayMs} ms (Posición B — medir con cinta)`
}
