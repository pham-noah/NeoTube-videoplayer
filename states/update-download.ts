import { AppState } from 'react-native'
import { t } from 'i18next'
import { observable } from '@legendapp/state'
import NouTubeViewModule from '@/modules/nou-tube-view'
import type { AppRelease } from '@/lib/app-update'
import {
  androidUpdateInstaller,
  type UpdateDownload,
  type UpdateInstaller,
} from '@/lib/update-install'

/*
 * The update download, held outside the sheet that starts it.
 *
 * The download used to live in UpdateSheet's own state: closing the sheet, or
 * going back to the feed, dropped the component and with it the progress -- the
 * transfer kept running with nowhere to report to, and the only way to see the
 * result was to reopen About and hope the cache had the file. Everything the
 * transfer needs now lives here, in module scope, so it survives any screen:
 * the sheet renders this state, the settings tree renders a pinned copy of it,
 * and the notification fires whichever of them is on screen.
 */

export interface UpdateDownloadStore {
  release: AppRelease | null
  state: UpdateDownload
  /* Set while the bytes are on their way or being checked, so the pinned card
   * knows to exist without asking the state machine. */
  busy: boolean
  /* Android has not been told this app may install packages; the sheet's
   * button becomes "allow installs" instead of "install". */
  blocked: boolean
}

export const updateDownload$ = observable<UpdateDownloadStore>({
  release: null,
  state: { status: 'idle' },
  busy: false,
  blocked: false,
})

let installer: UpdateInstaller | null = null

/* Built on first use: it requires expo-file-system and the native module, and
 * this module is imported by the settings tree, which the web build renders
 * too. */
const getInstaller = (): UpdateInstaller => {
  installer ??= androidUpdateInstaller()
  return installer
}

const publish = (state: UpdateDownload) => {
  updateDownload$.state.set(state)
  updateDownload$.busy.set(state.status === 'downloading' || state.status === 'verifying')
  updateDownload$.blocked.set(state.status === 'blocked')
}

/* A package from an earlier visit is still in the cache; offering to install it
 * beats downloading sixty megabytes again. */
export const adoptDownloadedUpdate = async (release: AppRelease) => {
  if (updateDownload$.release.get()?.version === release.version && updateDownload$.busy.get()) {
    return
  }
  updateDownload$.release.set(release)
  const path = await getInstaller().findDownloaded(release)
  if (path) {
    publish({ status: 'ready', path })
  } else if (!updateDownload$.busy.get()) {
    publish({ status: 'idle' })
  }
}

export const startUpdateDownload = async (release: AppRelease) => {
  // A second press while the transfer runs must not start a second transfer.
  if (updateDownload$.busy.get()) {
    return
  }
  updateDownload$.release.set(release)
  publish({ status: 'downloading', received: 0, total: release.apkSize, fraction: release.apkSize ? 0 : null })
  const result = await getInstaller().download(release, publish)
  publish(result)
  if (result.status === 'ready' && AppState.currentState !== 'active') {
    // The user left the app while this ran: tell them in the shade rather than
    // letting a finished package sit in a cache they cannot see.
    NouTubeViewModule.postNotification?.(
      'updates',
      t('update.notificationChannel'),
      20260,
      t('update.downloadedTitle'),
      t('update.downloadedHint', { version: release.version }),
    )
  }
}

export const cancelUpdateDownload = async () => {
  await getInstaller().cancel()
  publish({ status: 'cancelled' })
}

export const installUpdateDownload = async (path: string) => {
  const result = await getInstaller().install(path)
  publish(result)
  return result
}

/* The download has finished and nobody has to be looking at it: this is what
 * the notification is for, and a tap on it opens the app on About. */
export const resetUpdateDownload = () => {
  updateDownload$.release.set(null)
  publish({ status: 'idle' })
}
