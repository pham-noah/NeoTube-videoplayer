import { createClient } from '@supabase/supabase-js'
import { browser } from 'wxt/browser'

/*
 * Replaces `@/lib/supabase/client`. The web client keeps its session in
 * localStorage, which the background service worker does not have; this one uses
 * `browser.storage.local`, so the session survives the worker being torn down
 * and is visible to the extension pages as well.
 */
const storage = {
  getItem: async (key: string) => {
    const stored = await browser.storage.local.get(key)
    const value = (stored as Record<string, unknown>)[key]
    return typeof value === 'string' ? value : null
  },
  setItem: async (key: string, value: string) => {
    await browser.storage.local.set({ [key]: value })
  },
  removeItem: async (key: string) => {
    await browser.storage.local.remove(key)
  },
}

export const supabase = createClient(
  // Sync is opt-in and needs your own backend (see PRIVACY.md). With these
  // unset the client is inert: it has nowhere to send anything.
  (import.meta.env as any).VITE_SUPABASE_URL || 'https://sync.invalid',
  (import.meta.env as any).VITE_SUPABASE_ANON_KEY || 'unset',
  {
    auth: {
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
)
