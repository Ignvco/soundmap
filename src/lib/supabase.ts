import { createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const supabaseUrl     = process.env.EXPO_PUBLIC_SUPABASE_URL     ?? ''
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

// Storage seguro por plataforma
const getStorage = () => {
  if (Platform.OS === 'web') return undefined
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return require('@react-native-async-storage/async-storage').default
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage:          getStorage(),
    autoRefreshToken: true,
    persistSession:   true,
    detectSessionInUrl: false,
  },
})

// Auto-refresh solo en nativo
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') {
      supabase.auth.startAutoRefresh()
    } else {
      supabase.auth.stopAutoRefresh()
    }
  })
}