import { createClient, type SupabaseClient } from '@supabase/supabase-js'

// `import.meta.env` only exists in the Vite/Electron build of this file's
// consumer; under Metro (Expo web, static render) it is undefined and reading
// `.VITE_SUPABASE_URL` off it crashed the whole web bundle. Sync is off by
// default, so fall back to the inert values either way.
const env = (import.meta as { env?: Record<string, string | undefined> }).env ?? {}

let client: SupabaseClient | null = null

/**
 * The sync client, built on first use.
 *
 * `createClient` probes storage and wires auth listeners as it is constructed,
 * so building it at import time paid that cost on every launch -- including the
 * fork's default build, where `FORK.syncEnabled` is false and no sync path ever
 * runs. Reaching it through here keeps the client (and the storage it touches)
 * out of a launch that does not sync.
 */
export const getSupabase = (): SupabaseClient =>
  (client ??= createClient(env.VITE_SUPABASE_URL || 'https://sync.invalid', env.VITE_SUPABASE_ANON_KEY || 'unset'))
