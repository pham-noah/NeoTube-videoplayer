import { useCallback, useEffect } from 'react'
import { AppState, Linking, ScrollView, View } from 'react-native'
import { t } from 'i18next'
import { useValue } from '@legendapp/state/react'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '@/components/NouText'
import { NouButton } from '@/components/button/NouButton'
import { BaseModal } from '@/components/modal/BaseModal'
import { formatSize, type AppRelease } from '@/lib/app-update'
import NouTubeViewModule from '@/modules/nou-tube-view'
import { parseNotes } from '@/lib/notes-blocks'
import { useTwColor } from '@/lib/theme'
import { surfaceCls } from '@/lib/colors'
import {
  adoptDownloadedUpdate,
  cancelUpdateDownload,
  installUpdateDownload,
  startUpdateDownload,
  updateDownload$,
} from '@/states/update-download'

/*
 * The result of an update check: a version jump the user agrees to, a download
 * with a progress bar, then Android's own installer.
 *
 * Before 0.3.0 the button opened the APK URL in a browser and left the rest to
 * the user -- find the file, allow the browser as an install source, tap through
 * the installer. Downloading here instead makes the progress visible, makes
 * cancel actually stop the transfer, and hands the finished file straight to the
 * package installer through this app's FileProvider (lib/update-install.ts).
 *
 * The transfer itself is not this component's: it lives in states/update-download,
 * so closing the sheet -- or walking back to the feed -- does not lose it. This
 * renders whatever that store is doing.
 */

/* Android's channel for a finished download. A tap reopens the app on About,
 * which finds the cached package and offers to install it. */
export const UPDATE_CHANNEL = 'updates'
export const UPDATE_NOTIFICATION_ID = 20260

export const UpdateSheet: React.FC<{
  release: AppRelease
  currentVersion: string
  onClose: () => void
}> = ({ release, currentVersion, onClose }) => {
  const tw = useTwColor()
  const size = formatSize(release.apkSize)
  const notes = parseNotes(release.notes)
  const state = useValue(updateDownload$.state)
  // Another release's download in flight would render its numbers under this
  // version's notes; only claim progress that belongs to this release.
  const own = useValue(updateDownload$.release)?.version === release.version
  const current = own ? state : ({ status: 'idle' } as const)

  /* A package downloaded in an earlier visit is still in the cache, so offer it
   * instead of fetching the release again. */
  useEffect(() => {
    if (release.apkUrl) {
      void adoptDownloadedUpdate(release)
    }
  }, [release])

  const install = useCallback(
    async (path: string) => {
      const result = await installUpdateDownload(path)
      if (result.status === 'ready') {
        NouTubeViewModule.postNotification?.(
          UPDATE_CHANNEL,
          t('update.notificationChannel'),
          UPDATE_NOTIFICATION_ID,
          t('update.downloadedTitle'),
          t('update.downloadedHint', { version: release.version }),
        )
      }
    },
    [release.version],
  )

  /* "Allow installs" leaves the app for Android's settings; coming back means
   * the permission was granted, so retry the install instead of asking for the
   * same tap again. */
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return
      const latest = updateDownload$.state.peek()
      if (latest.status === 'blocked') void install(latest.path)
    })
    return () => subscription.remove()
  }, [install])

  const busy = current.status === 'downloading' || current.status === 'verifying'
  const downloaded = current.status === 'ready' || current.status === 'blocked'

  return (
    <BaseModal onClose={busy ? () => undefined : onClose}>
      <View className="flex-1">
        <View className="flex-row items-center gap-3 px-4 pt-2 pb-4">
          <View className="h-11 w-11 items-center justify-center rounded-chip bg-indigo-100 dark:bg-indigo-500/20">
            <MaterialIcons name="system-update" size={22} color={tw('indigo-600')} />
          </View>
          <View className="flex-1">
            <NouText className="text-title font-semibold">{t('update.available')}</NouText>
            <NouText className="mt-1 text-label text-zinc-600 dark:text-zinc-400">
              {t('update.fromTo', { current: currentVersion, next: release.version })}
            </NouText>
          </View>
        </View>

        <ScrollView className="flex-1 px-4" contentContainerClassName="pb-4">
          {size ? (
            <NouText className="mb-3 text-label uppercase tracking-[0.08em] text-zinc-600 dark:text-zinc-400">
              {t('update.size', { size })}
            </NouText>
          ) : null}
          <View className={`${surfaceCls} px-4 py-4`}>
            <NouText className="mb-2 text-caption font-semibold uppercase text-zinc-600 dark:text-zinc-400">
              {t('update.notes')}
            </NouText>
            {notes.length ? (
              notes.map((block, index) => (
                <NouText
                  key={index}
                  className={
                    block.type === 'heading'
                      ? 'mt-3 mb-1 text-headline font-semibold'
                      : block.type === 'bullet'
                        ? 'mb-1 pl-4 text-body leading-6 text-zinc-800 dark:text-zinc-200'
                        : 'mb-2 text-body leading-6 text-zinc-800 dark:text-zinc-200'
                  }
                >
                  {block.type === 'bullet' ? `\u2022 ${block.text}` : block.text}
                </NouText>
              ))
            ) : (
              <NouText className="text-body leading-6 text-zinc-800 dark:text-zinc-200">
                {t('update.noNotes')}
              </NouText>
            )}
          </View>
        </ScrollView>

        {current.status === 'downloading' ? (
          <View className="px-4 pb-2">
            <View className="h-1.5 w-full overflow-hidden rounded-chip bg-zinc-200 dark:bg-zinc-800">
              <View
                className="h-full rounded-chip bg-teal-500"
                style={{ width: `${Math.round((current.fraction ?? 0) * 100)}%` }}
              />
            </View>
            <View className="mt-2 flex-row items-center justify-between gap-3">
              <NouText className="flex-1 text-label text-zinc-600 dark:text-zinc-400">
                {t('update.downloading', { version: release.version })}
              </NouText>
              <NouText className="text-label tabular-nums text-zinc-600 dark:text-zinc-400">
                {current.fraction === null ? formatSize(current.received) : `${Math.round(current.fraction * 100)}%`}
              </NouText>
            </View>
          </View>
        ) : null}

        {current.status === 'verifying' ? (
          <NouText className="px-4 pb-2 text-label text-zinc-600 dark:text-zinc-400">{t('update.verifying')}</NouText>
        ) : null}

        {current.status === 'failed' ? (
          <View className="flex-row items-start gap-2 px-4 pb-2">
            <MaterialIcons name="error-outline" size={18} color={tw('gray-500')} />
            <NouText className="flex-1 text-label text-red-600 dark:text-red-400">{current.message}</NouText>
          </View>
        ) : null}

        {current.status === 'blocked' ? (
          <View className="flex-row items-start gap-2 px-4 pb-2">
            <MaterialIcons name="info-outline" size={18} color={tw('gray-600')} />
            <NouText className="flex-1 text-label text-zinc-700 dark:text-zinc-300">
              {t('update.allowInstalls', { app: 'NeoTube' })}
            </NouText>
          </View>
        ) : null}

        <View className="flex-row gap-3 px-4 pb-4">
          {busy ? (
            <NouButton variant="outline" className="flex-1" onPress={() => void cancelUpdateDownload()}>
              {t('update.cancel')}
            </NouButton>
          ) : (
            <NouButton variant="outline" className="flex-1" onPress={onClose}>
              {t('update.later')}
            </NouButton>
          )}

          {!release.apkUrl ? (
            <NouButton className="flex-1" onPress={() => void Linking.openURL(release.page)}>
              {t('update.openPage')}
            </NouButton>
          ) : busy ? null : (
            <NouButton
              className="flex-1"
              onPress={() => {
                if (downloaded) {
                  // blocked: the settings screen has already opened once; going
                  // back through install() is what re-asks the permission.
                  void install(current.path)
                  return
                }
                void startUpdateDownload(release)
              }}
            >
              {current.status === 'blocked'
                ? t('update.allowInstallsAction')
                : downloaded
                  ? t('update.install')
                  : current.status === 'failed' || current.status === 'cancelled'
                    ? t('update.retry')
                    : t('update.get')}
            </NouButton>
          )}
        </View>
      </View>
    </BaseModal>
  )
}
