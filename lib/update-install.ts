import type { AppRelease } from '@/lib/app-update'

/*
 * The update download, as a state machine the sheet can render and a test can
 * drive.
 *
 * Until 0.3.0 "Get the update" opened the release page in a browser, which left
 * the user to find the APK, allow the browser as an install source and install
 * it by hand -- and the browser's own downloads are outside this app's
 * FileProvider, so it could not offer to finish the job. The download now
 * happens here: progress in the sheet, a file in the app's cache, and one intent
 * into Android's package installer.
 *
 * Failure is a state, not an exception: a dropped connection, a truncated file
 * and a cancelled download all land in the sheet as text plus a retry button.
 */

export type UpdateDownload =
  | { status: 'idle' }
  | { status: 'downloading'; received: number; total: number | null; fraction: number | null }
  | { status: 'verifying' }
  /* `blocked`: the file is fine, but Android has not been told this app may
   * install packages. The sheet shows "allow installs" and re-runs install. */
  | { status: 'blocked'; path: string }
  | { status: 'ready'; path: string }
  | { status: 'cancelled' }
  | { status: 'failed'; message: string }

/* Where a downloaded package waits between the download and the installer. The
 * app's cache directory is inside its FileProvider (see file_paths.xml), so the
 * installer can read the file without any storage permission. */
export const UPDATE_DIR = (cacheDirectory: string | null | undefined) => `${cacheDirectory ?? ''}updates/`

/* A release APK is never smaller than this; a few kilobytes here means the
 * server answered with an error page or the connection died mid-body. */
const MIN_PLAUSIBLE_BYTES = 1024 * 1024

export const apkFileName = (release: AppRelease) => `NeoTube-${release.version}.apk`

type Downloader = {
  downloadAsync(): Promise<{ uri?: string; status?: number; headers?: Record<string, string> } | undefined>
  cancelAsync(): Promise<void>
}

export type UpdateInstaller = {
  /* Starts a download, reporting progress as it goes. Resolves with the final
   * state; the caller renders it and, on 'ready', calls install. */
  download(release: AppRelease, onProgress: (state: UpdateDownload) => void): Promise<UpdateDownload>
  cancel(): Promise<void>
  /* Hands a downloaded package to the system installer. Returns 'blocked' and
   * opens the install-source settings when Android has not allowed it yet. */
  install(path: string): Promise<UpdateDownload>
  isRunning(): boolean
  /* The already-downloaded package for this release, or null. */
  findDownloaded(release: AppRelease): Promise<string | null>
}

export type UpdateInstallerDeps = {
  /* The directory a finished package waits in, from the platform (cacheDirectory
   * on Android). */
  cacheDirectory: string | null | undefined
  /* Just the three calls this needs, so a test can answer without expo. */
  fileSystem: {
    makeDirectoryAsync: (dir: string, options?: { intermediates?: boolean }) => Promise<unknown>
    deleteAsync: (path: string, options?: { idempotent?: boolean }) => Promise<unknown>
    /* FileInfo carries `size` when the file exists, so no options are needed. */
    getInfoAsync: (path: string) => Promise<{ exists: boolean; size?: number }>
  }
  createDownloadResumable: (
    url: string,
    path: string,
    options: Record<string, unknown>,
    onProgress: (event: { totalBytesWritten: number; totalBytesExpectedToWrite: number }) => void,
  ) => Downloader
  natives: {
    canInstallApk: () => boolean
    openInstallSettings: () => void
    installApk: (path: string) => Promise<boolean>
  }
}

export const createUpdateInstaller = ({ cacheDirectory, fileSystem, createDownloadResumable, natives }: UpdateInstallerDeps): UpdateInstaller => {
  let current: Downloader | null = null
  let cancelled = false

  const clear = (target: string) => {
    void fileSystem.deleteAsync(target, { idempotent: true }).catch(() => undefined)
  }

  const download: UpdateInstaller['download'] = async (release, onProgress) => {
    if (!release.apkUrl) {
      return { status: 'failed', message: 'This release has no Android package attached.' }
    }
    const directory = UPDATE_DIR(cacheDirectory)
    const target = `${directory}${apkFileName(release)}`
    cancelled = false

    try {
      await fileSystem.makeDirectoryAsync(directory, { intermediates: true })
      // A previous attempt may have left a partial file under the same name.
      await fileSystem.deleteAsync(target, { idempotent: true })
    } catch (error) {
      return { status: 'failed', message: message(error) }
    }

    onProgress({ status: 'downloading', received: 0, total: release.apkSize, fraction: release.apkSize ? 0 : null })

    const resumable = createDownloadResumable(release.apkUrl, target, {}, (event) => {
      const total = event.totalBytesExpectedToWrite > 0 ? event.totalBytesExpectedToWrite : null
      onProgress({
        status: 'downloading',
        received: event.totalBytesWritten,
        total,
        fraction: total ? Math.min(1, event.totalBytesWritten / total) : null,
      })
    })
    current = resumable

    try {
      const result = await resumable.downloadAsync()
      if (cancelled) {
        clear(target)
        return { status: 'cancelled' }
      }
      if (!result?.uri || (result.status && (result.status < 200 || result.status >= 300))) {
        clear(target)
        return { status: 'failed', message: result?.status ? `HTTP ${result.status}` : 'The download stopped early.' }
      }
      onProgress({ status: 'verifying' })
      const info = await fileSystem.getInfoAsync(target)
      const size = typeof info.size === 'number' ? info.size : 0
      if (size < MIN_PLAUSIBLE_BYTES) {
        clear(target)
        return { status: 'failed', message: 'The downloaded file is too small to be an APK.' }
      }
      // The release metadata carries the exact byte count, so a truncated body
      // is caught here instead of by the package installer's parse error.
      if (release.apkSize && size !== release.apkSize) {
        clear(target)
        return { status: 'failed', message: `Expected ${release.apkSize} bytes, got ${size}.` }
      }
      return { status: 'ready', path: target }
    } catch (error) {
      clear(target)
      return cancelled ? { status: 'cancelled' } : { status: 'failed', message: message(error) }
    } finally {
      current = null
    }
  }

  const cancel: UpdateInstaller['cancel'] = async () => {
    cancelled = true
    const resumable = current
    current = null
    if (resumable) {
      try {
        await resumable.cancelAsync()
      } catch {
        // The download had already finished; the flag above is what matters.
      }
    }
  }

  const install: UpdateInstaller['install'] = async (path) => {
    try {
      const started = await natives.installApk(path)
      if (!started) {
        natives.openInstallSettings()
        return { status: 'blocked', path }
      }
      return { status: 'ready', path }
    } catch (error) {
      return { status: 'failed', message: message(error) }
    }
  }

  /* A package downloaded in an earlier visit to the sheet is still in the cache,
   * so reopening About offers to install it instead of downloading 60 MB again. */
  const findDownloaded: UpdateInstaller['findDownloaded'] = async (release) => {
    try {
      const info = await fileSystem.getInfoAsync(`${UPDATE_DIR(cacheDirectory)}${apkFileName(release)}`)
      const size = typeof info.size === 'number' ? info.size : 0
      if (info.exists && size >= MIN_PLAUSIBLE_BYTES && (!release.apkSize || size === release.apkSize)) {
        return `${UPDATE_DIR(cacheDirectory)}${apkFileName(release)}`
      }
    } catch {
      // Treat an unreadable cache as empty.
    }
    return null
  }

  return { download, cancel, install, findDownloaded, isRunning: () => current !== null }
}

const message = (error: unknown) => {
  const text = error instanceof Error ? error.message : String(error ?? '')
  return text || 'The download failed.'
}

/*
 * The Android wiring: expo-file-system/legacy for the bytes (the same API
 * lib/main-client.native.ts already uses -- the new File/Directory API has no
 * progress-reporting download) and the app's own native module for the install.
 *
 * Required lazily so this module -- and its state machine -- can be imported by
 * a test, and by the web build, without a native runtime behind it.
 */
export const androidUpdateInstaller = (): UpdateInstaller => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const FileSystem = require('expo-file-system/legacy') as typeof import('expo-file-system/legacy')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const natives = require('@/modules/nou-tube-view').default as typeof import('@/modules/nou-tube-view').default
  return createUpdateInstaller({
    cacheDirectory: FileSystem.cacheDirectory,
    fileSystem: {
      makeDirectoryAsync: (dir, options) => FileSystem.makeDirectoryAsync(dir, options),
      deleteAsync: (target, options) => FileSystem.deleteAsync(target, options),
      getInfoAsync: async (target) => {
        const info = (await FileSystem.getInfoAsync(target)) as { exists: boolean; size?: number }
        return { exists: info.exists, size: info.size }
      },
    },
    createDownloadResumable: (url, target, options, onProgress) =>
      FileSystem.createDownloadResumable(url, target, options, onProgress) as never,
    natives: {
      canInstallApk: () => natives.canInstallApk(),
      openInstallSettings: () => natives.openInstallSettings(),
      installApk: (target) => natives.installApk(target),
    },
  })
}
