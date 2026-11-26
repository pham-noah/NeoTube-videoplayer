import { describe, expect, it } from 'bun:test'
import {
  isNewer,
  parseRelease,
  formatSize,
  repoSlug,
  checkForAppUpdate,
  type FetchLike,
} from '@/lib/app-update'

const response = (status: number, body: unknown) =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  }) as unknown as Response

const latest = {
  tag_name: 'v1.4.0',
  html_url: 'https://github.com/pham-noah/NeoTube/releases/tag/v1.4.0',
  body: '  Adds a queue.\n',
  assets: [
    { name: 'notes.txt', browser_download_url: 'https://example.com/notes.txt', size: 10 },
    { name: 'NeoTube-1.4.0.apk', browser_download_url: 'https://example.com/app.apk', size: 24_000_000 },
  ],
}

describe('isNewer', () => {
  it('compares numerically, not as text', () => {
    expect(isNewer('1.10.0', '1.9.0')).toBe(true)
    expect(isNewer('1.9.0', '1.10.0')).toBe(false)
  })

  it('treats a missing segment as zero', () => {
    expect(isNewer('2', '2.0.0')).toBe(false)
    expect(isNewer('2.0.1', '2')).toBe(true)
  })

  it('ignores a leading v and surrounding space', () => {
    expect(isNewer(' v1.2.4 ', '1.2.3')).toBe(true)
  })

  it('never claims an equal version is newer', () => {
    expect(isNewer('1.2.3', '1.2.3')).toBe(false)
  })

  it('returns false for a tag it cannot read', () => {
    expect(isNewer('nightly-2026-11-26', '1.2.3')).toBe(false)
    expect(isNewer('', '1.2.3')).toBe(false)
  })
})

describe('parseRelease', () => {
  it('reads the version, page, notes and the Android package', () => {
    expect(parseRelease(latest)).toEqual({
      version: '1.4.0',
      page: 'https://github.com/pham-noah/NeoTube/releases/tag/v1.4.0',
      notes: 'Adds a queue.',
      apkUrl: 'https://example.com/app.apk',
      apkSize: 24_000_000,
    })
  })

  it('leaves the package empty when the release has none', () => {
    const release = parseRelease({ ...latest, assets: [] })
    expect(release?.apkUrl).toBe(null)
    expect(release?.apkSize).toBe(null)
  })

  it('rejects a payload with no tag or page', () => {
    expect(parseRelease({ body: 'x' })).toBe(null)
    expect(parseRelease({ tag_name: 'v1.0.0' })).toBe(null)
    expect(parseRelease(null)).toBe(null)
  })
})

describe('formatSize', () => {
  it('prints one decimal below ten megabytes and whole numbers above', () => {
    expect(formatSize(4_500_000)).toBe('4.3 MB')
    expect(formatSize(24_000_000)).toBe('23 MB')
  })

  it('prints nothing when the size is unknown', () => {
    expect(formatSize(null)).toBe('')
    expect(formatSize(0)).toBe('')
  })
})

describe('repoSlug', () => {
  it('pulls owner and name out of a repository URL', () => {
    expect(repoSlug('https://github.com/pham-noah/NeoTube')).toBe('pham-noah/NeoTube')
    expect(repoSlug('https://github.com/pham-noah/NeoTube.git')).toBe('pham-noah/NeoTube')
    expect(repoSlug('https://github.com/pham-noah/NeoTube/')).toBe('pham-noah/NeoTube')
  })

  it('returns empty for anything that is not a GitHub URL', () => {
    expect(repoSlug('')).toBe('')
    expect(repoSlug('https://gitlab.com/a/b')).toBe('')
  })
})

describe('checkForAppUpdate', () => {
  const ask = (fetchImpl: FetchLike, currentVersion = '1.3.0', timeoutMs?: number) =>
    checkForAppUpdate({ currentVersion, repo: 'https://github.com/pham-noah/NeoTube', fetchImpl, timeoutMs })

  it('reports an available release when the tag is newer', async () => {
    const result = await ask(async () => response(200, latest))
    expect(result.status).toBe('available')
    expect(result.status === 'available' && result.release.version).toBe('1.4.0')
  })

  it('reports current when the running build is the newest', async () => {
    const result = await ask(async () => response(200, latest), '1.4.0')
    expect(result.status).toBe('current')
  })

  it('treats a 404 as "nothing published yet" rather than a failure', async () => {
    const result = await ask(async () => response(404, { message: 'Not Found' }))
    expect(result.status).toBe('no-release')
  })

  it('reports the status code when GitHub refuses', async () => {
    const result = await ask(async () => response(403, {}))
    expect(result).toEqual({ status: 'failed', message: 'HTTP 403' })
  })

  it('reports a network error instead of throwing', async () => {
    const result = await ask(async () => {
      throw new Error('Network request failed')
    })
    expect(result).toEqual({ status: 'failed', message: 'Network request failed' })
  })

  it('gives up when the request hangs', async () => {
    const result = await ask(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new Error('Aborted')))
        }),
      '1.3.0',
      50,
    )
    expect(result.status).toBe('failed')
  })

  it('asks the API for the latest release of the configured repository', async () => {
    let seen = ''
    await ask(async (url) => {
      seen = String(url)
      return response(200, latest)
    })
    expect(seen).toBe('https://api.github.com/repos/pham-noah/NeoTube/releases/latest')
  })
})
