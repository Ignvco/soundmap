import { Model } from '@nozbe/watermelondb';
import { date, field, readonly, text } from '@nozbe/watermelondb/decorators';

export class Preset extends Model {
  static table = 'presets'

  @text('nombre') declare nombre: string
  @text('room_id') declare roomId: string
  @field('crossover_hz') declare crossoverHz: number
  @field('nivel_tops_db') declare nivelTopsDb: number
  @field('nivel_subs_db') declare nivelSubsDb: number
  @field('delay_subs_ms') declare delaySubsMs: number
  @text('eq_json') declare eqJson: string
  @field('tiene_vidrios') declare tieneVidrios: boolean
  @field('es_backup') declare esBackup: boolean
  @readonly @date('updated_at') declare updatedAt: Date
}
