import { isWeb } from '@/lib/utils'

/*
 * The update check, against the app's own GitHub releases rather than an
 * app-store or a vendor endpoint: NeoTube ships as an APK attached to a release,
 * so the release list is the only place that knows what the newest build is.
 *
 * Everything here is a plain function of (current version, fetched JSON) so the
 * comparison can be tested without a network, and the fetch itself takes an
 * optional `fetchImpl` for the same reason.
 */

export interface AppRelease {
  /* The tag with any leading "v" removed: "1.2.3". */
  version: string
  /* The release's web page, which is always there. */
  page: string
  /* The release notes as written, or '' when the body was empty. */
  notes: string
  /* The attached Android package, when the release carries one. */
  apkUrl: string | null
  apkSize: number | null
}

export type UpdateResult =
  | { status: 'available'; release: AppRelease }
  /* The newest release is the one running. */
  | { status: 'current' }
  /* The repository answered but has no published release yet. */
  | { status: 'no-release' }
  | { status: 'failed'; message?: string }

/* Just the part of `fetch` this needs, so a test can answer without pretending
 * to be the platform's implementation. */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>

const TAG = /^v?(\d+(?:\.\d+)*)/i

/* "1.10.0" is newer than "1.9.0", which string comparison gets wrong; a missing
 * segment counts as zero, so "2" and "2.0.0" are the same build. Anything
 * without a leading number (a date-tagged or named release) is never newer —
 * guessing at it would nag about a version that may be older. */
export const isNewer = (candidate: string, current: string): boolean => {
  const a = TAG.exec(candidate.trim())
  const b = TAG.exec(current.trim())
  if (!a || !b) {
    return false
  }
  const left = a[1].split('.').map(Number)
  const right = b[1].split('.').map(Number)
  const length = Math.max(left.length, right.length)
  for (let i = 0; i < length; i++) {
    const difference = (left[i] || 0) - (right[i] || 0)
    if (difference !== 0) {
      return difference > 0
    }
  }
  return false
}

export const parseRelease = (json: unknown): AppRelease | null => {
  if (!json || typeof json !== 'object') {
    return null
  }
  const release = json as Record<string, unknown>
  const tag = typeof release.tag_name === 'string' ? release.tag_name.trim() : ''
  const page = typeof release.html_url === 'string' ? release.html_url : ''
  if (!tag || !page) {
    return null
  }
  const assets = Array.isArray(release.assets) ? release.assets : []
  const apk = assets.find((asset) => {
    const name = (asset as Record<string, unknown>)?.name
    return typeof name === 'string' && name.toLowerCase().endsWith('.apk')
  }) as Record<string, unknown> | undefined
  return {
    version: tag.replace(/^v/i, ''),
    page,
    notes: typeof release.body === 'string' ? release.body.trim() : '',
    apkUrl: apk && typeof apk.browser_download_url === 'string' ? apk.browser_download_url : null,
    apkSize: apk && typeof apk.size === 'number' ? apk.size : null,
  }
}

export const formatSize = (bytes: number | null): string => {
  if (!bytes || bytes <= 0) {
    return ''
  }
  const megabytes = bytes / (1024 * 1024)
  return `${megabytes >= 10 ? Math.round(megabytes) : megabytes.toFixed(1)} MB`
}

/* "pham-noah/NeoTube" from a repository URL, which is what the API wants. */
export const repoSlug = (repoUrl: string): string => {
  const match = /github\.com\/([^/]+)\/([^/#?]+)/i.exec(repoUrl)
  return match ? `${match[1]}/${match[2].replace(/\.git$/i, '')}` : ''
}

const TIMEOUT_MS = 8000

/* Native only: the desktop build has its own updater tied to its packaging and
 * the web build has no package to replace. The About screen hides the row when
 * this says no. */
export const canCheckForUpdates = (repoUrl: string): boolean =>
  !isWeb && process.env.EXPO_OS !== 'web' && !!repoSlug(repoUrl)

export const checkForAppUpdate = async ({
  currentVersion,
  repo,
  fetchImpl,
  timeoutMs = TIMEOUT_MS,
}: {
  currentVersion: string
  repo: string
  fetchImpl?: FetchLike
  timeoutMs?: number
}): Promise<UpdateResult> => {
  const slug = repoSlug(repo)
  if (!slug) {
    return { status: 'failed' }
  }
  const doFetch: FetchLike = fetchImpl || fetch
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const response = await doFetch(`https://api.github.com/repos/${slug}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' },
      signal: controller.signal,
    })
    // A repository with no releases answers 404 for this endpoint, which is not
    // a failure the user can do anything about.
    if (response.status === 404) {
      return { status: 'no-release' }
    }
    if (!response.ok) {
      return { status: 'failed', message: `HTTP ${response.status}` }
    }
    const release = parseRelease(await response.json())
    if (!release) {
      return { status: 'failed' }
    }
    return isNewer(release.version, currentVersion) ? { status: 'available', release } : { status: 'current' }
  } catch (error) {
    return { status: 'failed', message: error instanceof Error ? error.message : undefined }
  } finally {
    clearTimeout(timer)
  }
}
