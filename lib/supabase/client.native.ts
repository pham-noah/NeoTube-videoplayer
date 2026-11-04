import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://sync.invalid',
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'unset',
  {
    auth: {
      // https://github.com/supabase/supabase-js/issues/870#issuecomment-1746699664
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  },
)
