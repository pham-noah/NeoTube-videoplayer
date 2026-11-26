import { describe, expect, test } from 'bun:test'
import { apkFileName, createUpdateInstaller, type UpdateDownload } from './update-install'
import type { AppRelease } from './app-update'

/*
 * The download is the part of the updater that cannot be exercised by tapping
 * around: a dropped connection, a truncated body and a cancel all have to land
 * in the sheet as different states. These drive the state machine with a fake
 * file system and fake natives, so the branches are proven without a phone.
 */

const release = (overrides: Partial<AppRelease> = {}): AppRelease => ({
  version: '0.3.0',
  page: 'https://example.test/releases/tag/v0.3.0',
  notes: '',
  apkUrl: 'https://example.test/NeoTube-0.3.0.apk',
  apkSize: 5_000_000,
  ...overrides,
})

const fakeFs = (size: number | (() => number) = 5_000_000) => {
  const calls: string[] = []
  return {
    calls,
    cacheDirectory: 'file:///cache/',
    makeDirectoryAsync: async (dir: string) => void calls.push(`mkdir ${dir}`),
    deleteAsync: async (path: string) => void calls.push(`rm ${path}`),
    getInfoAsync: async () => ({ exists: true, uri: 'file:///cache/updates/x.apk', size: typeof size === 'function' ? size() : size }),
  }
}

const fakeDownloader = (behaviour: 'ok' | 'http-500' | 'throw' | 'cancel') => {
  let onProgress: ((event: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void) | null = null
  const make = (_url: string, _path: string, _opts: unknown, callback: typeof onProgress) => {
    onProgress = callback
    return {
      downloadAsync: async () => {
        onProgress?.({ totalBytesWritten: 2_000_000, totalBytesExpectedToWrite: 5_000_000 })
        if (behaviour === 'throw') {
          throw new Error('Connection reset by peer')
        }
        if (behaviour === 'http-500') {
          return { uri: 'file:///cache/updates/x.apk', status: 500 }
        }
        onProgress?.({ totalBytesWritten: 5_000_000, totalBytesExpectedToWrite: 5_000_000 })
        return { uri: 'file:///cache/updates/x.apk', status: 200 }
      },
      cancelAsync: async () => undefined,
    }
  }
  return make as unknown as typeof import('expo-file-system/legacy').createDownloadResumable
}

const natives = (started = true) => {
  const calls: string[] = []
  return {
    calls,
    canInstallApk: () => started,
    openInstallSettings: () => void calls.push('settings'),
    installApk: async (path: string) => {
      calls.push(`install ${path}`)
      return started
    },
  }
}

describe('the update download', () => {
  test('reports progress and lands on the cached file', async () => {
    const states: UpdateDownload[] = []
    const fs = fakeFs()
    const installer = createUpdateInstaller({
      cacheDirectory: 'file:///cache/',
      fileSystem: fs as never,
      createDownloadResumable: fakeDownloader('ok'),
      natives: natives() as never,
    })
    const result = await installer.download(release(), (state) => states.push(state))

    expect(result).toEqual({ status: 'ready', path: 'file:///cache/updates/NeoTube-0.3.0.apk' })
    expect(states[0]).toEqual({ status: 'downloading', received: 0, total: 5_000_000, fraction: 0 })
    expect(states.some((state) => state.status === 'downloading' && state.fraction === 0.4)).toBe(true)
    expect(states.at(-1)).toEqual({ status: 'verifying' })
    expect(fs.calls).toContain('rm file:///cache/updates/NeoTube-0.3.0.apk')
  })

  test('a server error is a failed state, not a thrown error', async () => {
    const installer = createUpdateInstaller({
      cacheDirectory: 'file:///cache/',
      fileSystem: fakeFs() as never,
      createDownloadResumable: fakeDownloader('http-500'),
      natives: natives() as never,
    })
    expect(await installer.download(release(), () => undefined)).toEqual({ status: 'failed', message: 'HTTP 500' })
  })

  test('a dropped connection reports why and clears the partial file', async () => {
    const fs = fakeFs()
    const installer = createUpdateInstaller({
      cacheDirectory: 'file:///cache/',
      fileSystem: fs as never,
      createDownloadResumable: fakeDownloader('throw'),
      natives: natives() as never,
    })
    const result = await installer.download(release(), () => undefined)
    expect(result).toEqual({ status: 'failed', message: 'Connection reset by peer' })
    expect(fs.calls.filter((call) => call.startsWith('rm')).length).toBe(2)
  })

  test('a truncated body is caught against the size in the release metadata', async () => {
    const installer = createUpdateInstaller({
      cacheDirectory: 'file:///cache/',
      fileSystem: fakeFs(1_200_000) as never,
      createDownloadResumable: fakeDownloader('ok'),
      natives: natives() as never,
    })
    const result = await installer.download(release(), () => undefined)
    expect(result.status).toBe('failed')
    expect(result.status === 'failed' && result.message).toContain('Expected 5000000 bytes, got 1200000')
  })

  test('a body too small to be an APK never reaches the installer', async () => {
    const installer = createUpdateInstaller({
      cacheDirectory: 'file:///cache/',
      fileSystem: fakeFs(2_048) as never,
      createDownloadResumable: fakeDownloader('ok'),
      natives: natives() as never,
    })
    const result = await installer.download(release({ apkSize: null }), () => undefined)
    expect(result).toEqual({ status: 'failed', message: 'The downloaded file is too small to be an APK.' })
  })

  test('cancelling resolves as cancelled rather than as a failure', async () => {
    const fs = fakeFs()
    const installer = createUpdateInstaller({
      cacheDirectory: 'file:///cache/',
      fileSystem: fs as never,
      createDownloadResumable: fakeDownloader('ok'),
      natives: natives() as never,
    })
    const running = installer.download(release(), () => undefined)
    await installer.cancel()
    expect(await running).toEqual({ status: 'cancelled' })
  })

  test('a release with no APK says so instead of downloading the page', async () => {
    const installer = createUpdateInstaller({
      cacheDirectory: 'file:///cache/',
      fileSystem: fakeFs() as never,
      createDownloadResumable: fakeDownloader('ok'),
      natives: natives() as never,
    })
    expect(await installer.download(release({ apkUrl: null }), () => undefined)).toEqual({
      status: 'failed',
      message: 'This release has no Android package attached.',
    })
  })
})

describe('handing the file to the installer', () => {
  test('passes the path to the native installer', async () => {
    const native = natives(true)
    const installer = createUpdateInstaller({ cacheDirectory: null, fileSystem: fakeFs() as never, createDownloadResumable: fakeDownloader('ok'), natives: native as never })
    expect(await installer.install('/cache/updates/NeoTube-0.3.0.apk')).toEqual({
      status: 'ready',
      path: '/cache/updates/NeoTube-0.3.0.apk',
    })
    expect(native.calls).toEqual(['install /cache/updates/NeoTube-0.3.0.apk'])
  })

  test('a blocked install source opens the settings screen instead of failing', async () => {
    const native = natives(false)
    const installer = createUpdateInstaller({ cacheDirectory: null, fileSystem: fakeFs() as never, createDownloadResumable: fakeDownloader('ok'), natives: native as never })
    expect(await installer.install('/cache/updates/NeoTube-0.3.0.apk')).toEqual({
      status: 'blocked',
      path: '/cache/updates/NeoTube-0.3.0.apk',
    })
    expect(native.calls).toEqual(['install /cache/updates/NeoTube-0.3.0.apk', 'settings'])
  })

  test('the file name carries the version so two releases cannot collide', () => {
    expect(apkFileName(release())).toBe('NeoTube-0.3.0.apk')
    expect(apkFileName(release({ version: '0.4.1' }))).toBe('NeoTube-0.4.1.apk')
  })
})
