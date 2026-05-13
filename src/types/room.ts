export type MaterialParedes = 'ladrillo' | 'hormigon' | 'madera' | 'tratado'
export type MaterialPiso = 'cemento' | 'madera' | 'alfombra' | 'ceramica'
export type MaterialTecho = 'madera' | 'hormigon' | 'panel' | 'tratado'
export type TipoTecho = 'triangular' | 'plano' | 'curvo' | 'irregular'
export type Ventanales = 'no' | 'parcial' | 'completo'
export type Tratamiento = 'ninguno' | 'parcial' | 'completo'
export type UsoRecinto = 'iglesia' | 'teatro' | 'evento' | 'ensayo'

export interface RoomData {
  id?: string
  nombre: string
  largo: number
  ancho: number
  alto: number
  capacidad: number
  uso: UsoRecinto
  techo: TipoTecho
  materialParedes: MaterialParedes
  materialPiso: MaterialPiso
  materialTecho: MaterialTecho
  ventanales: Ventanales
  tratamiento: Tratamiento
}

export interface AcousticDiagnosis {
  rt60Empty: number
  rt60Full: number
  ecoMs: number
  reflexion: 'muy_alta' | 'alta' | 'media' | 'baja'
  problemas: string[]
  recomendacion: string
}
