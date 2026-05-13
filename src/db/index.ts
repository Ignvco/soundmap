import { Database } from '@nozbe/watermelondb';
import SQLiteAdapter from '@nozbe/watermelondb/adapters/sqlite';
import { Preset } from './models/Preset';
import { Room } from './models/Room';
import { schema } from './schema';

const adapter = new SQLiteAdapter({
  schema,
  jsi: true,
  onSetUpError: (error) => console.error('DB setup error', error),
})

export const database = new Database({
  adapter,
  modelClasses: [Room, Preset],
})
