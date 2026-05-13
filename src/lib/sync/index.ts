import { supabase } from '@/lib/supabase';
import { database } from '@db/index';
import { synchronize } from '@nozbe/watermelondb/sync';

export async function syncDatabase(): Promise<void> {
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return // No sincronizar si no hay sesión

  await synchronize({
    database,

    pullChanges: async ({ lastPulledAt }) => {
      const { data, error } = await supabase.functions.invoke('sync-pull', {
        body: { lastPulledAt, userId: session.user.id },
      })
      if (error) throw error
      return data as { changes: object; timestamp: number }
    },

    pushChanges: async ({ changes, lastPulledAt }) => {
      const { error } = await supabase.functions.invoke('sync-push', {
        body: { changes, lastPulledAt, userId: session.user.id },
      })
      if (error) throw error
    },

    migrationsEnabledAtVersion: 1,
  })
}

// Llamar cuando la app vuelve al foreground o al guardar cambios importantes
export async function trySyncInBackground(): Promise<void> {
  try {
    await syncDatabase()
  } catch (e) {
    // Sync falló (sin internet) — no es error crítico, continuar offline
    console.warn('Sync failed, continuing offline', e)
  }
}
