import { Pressable, View } from 'react-native'
import { t } from 'i18next'
import { useValue } from '@legendapp/state/react'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '@/components/NouText'
import { formatSize } from '@/lib/app-update'
import { updateDownload$ } from '@/states/update-download'

/*
 * A download does not belong to the sheet that started it. Pinned under the
 * settings header it keeps reporting while the user reads other pages, and it
 * is the reason the transfer now lives in states/update-download instead of
 * UpdateSheet's own state: closing the sheet used to leave a 60 MB download
 * running with nothing on screen to say so.
 */
export const UpdateProgressRow: React.FC<{ onPress: () => void }> = ({ onPress }) => {
  const release = useValue(updateDownload$.release)
  const state = useValue(updateDownload$.state)

  if (!release) {
    return null
  }

  const downloading = state.status === 'downloading'
  const verifying = state.status === 'verifying'
  const ready = state.status === 'ready'
  if (!downloading && !verifying && !ready) {
    return null
  }

  const percent = state.status === 'downloading' ? Math.round((state.fraction ?? 0) * 100) : null

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t('update.downloading', { version: release.version })}
      className="mx-3 mb-2 rounded-2xl border border-zinc-200 px-4 py-3 dark:border-zinc-800"
    >
      <View className="flex-row items-center gap-3">
        <MaterialIcons name={ready ? 'check-circle' : 'system-update'} size={18} color="#14b8a6" />
        <View className="flex-1">
          <View className="flex-row items-center justify-between gap-3">
            <NouText className="flex-1 text-label font-medium" numberOfLines={1}>
              {ready ? t('update.installReady', { version: release.version }) : t('update.downloading', { version: release.version })}
            </NouText>
            <NouText className="text-label tabular-nums text-zinc-600 dark:text-zinc-400">
              {state.status === 'downloading'
                ? state.fraction === null
                  ? formatSize(state.received)
                  : `${percent}%`
                : verifying
                  ? t('update.verifying')
                  : t('update.install')}
            </NouText>
          </View>
          {downloading ? (
            <View className="mt-2 h-1 w-full overflow-hidden rounded-chip bg-zinc-200 dark:bg-zinc-800">
              <View className="h-full rounded-chip bg-teal-500" style={{ width: `${percent ?? 0}%` }} />
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  )
}
