import { beforeEach, describe, expect, it, mock } from 'bun:test'

/*
 * The sync client is built on first use, not at import time (see ./client).
 * That is what keeps a launch with sync switched off from constructing a client
 * -- and, before the `import.meta.env` guard, from throwing on web at all.
 *
 * `createClient` is stubbed here so the assertion is about *when* it is called,
 * which is the whole behaviour under test.
 */
const created: unknown[][] = []
mock.module('@supabase/supabase-js', () => ({
  createClient: (...args: unknown[]) => {
    created.push(args)
    return { tag: 'client' }
  },
}))

describe('supabase client', () => {
  beforeEach(() => {
    created.length = 0
  })

  it('builds no client when the module is imported', async () => {
    await import('./client')
    expect(created).toHaveLength(0)
  })

  it('builds one client on first use and reuses it', async () => {
    const modulePath = `./client?fresh=${Date.now()}`
    const { getSupabase } = await import(modulePath)
    expect(created).toHaveLength(0)

    const first = getSupabase()
    const second = getSupabase()

    expect(created).toHaveLength(1)
    expect(second).toBe(first)
  })

  it('falls back to inert credentials when the Vite env is absent', async () => {
    const { getSupabase } = await import(`./client?env=${Date.now()}`)
    void getSupabase()
    expect(created[0]).toEqual(['https://sync.invalid', 'unset'])
  })
})
