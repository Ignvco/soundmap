import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class Room extends Model {
  static table = 'rooms'

  @text('name') declare nombre: string
  @field('largo') declare largo: number
  @field('ancho') declare ancho: number
  @field('alto') declare alto: number
  @field('capacidad') declare capacidad: number
  @text('material_paredes') declare materialParedes: string
  @text('material_piso') declare materialPiso: string
  @text('material_techo') declare materialTecho: string
  @field('tiene_ventanales') declare tieneVentanales: boolean
  @field('rt60_estimado') declare rt60Estimado: number
  @readonly @date('created_at') declare createdAt: Date
  @readonly @date('updated_at') declare updatedAt: Date
}
