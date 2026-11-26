import { Linking, ScrollView, View } from 'react-native'
import { t } from 'i18next'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '@/components/NouText'
import { NouButton } from '@/components/button/NouButton'
import { BaseModal } from '@/components/modal/BaseModal'
import { formatSize, type AppRelease } from '@/lib/app-update'
import { parseNotes } from '@/lib/notes-blocks'
import { useTwColor } from '@/lib/theme'
import { surfaceCls } from '@/lib/colors'

/*
 * The result of an update check, when there is something to install. Kairn's
 * updater puts the release notes in front of the download rather than firing an
 * install from a toast, because a version jump is a thing a person agrees to.
 *
 * The download itself goes through the browser: the app has no installer of its
 * own, and handing an APK to Android's package installer needs a FileProvider
 * and the install-packages permission, which would be a second downloader in
 * the app just for updates.
 */
export const UpdateSheet: React.FC<{
  release: AppRelease
  currentVersion: string
  onClose: () => void
}> = ({ release, currentVersion, onClose }) => {
  const tw = useTwColor()
  const size = formatSize(release.apkSize)
  const downloadUrl = release.apkUrl || release.page
  const notes = parseNotes(release.notes)

  const open = () => {
    void Linking.openURL(downloadUrl)
    onClose()
  }

  return (
    <BaseModal onClose={onClose}>
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
                  {block.type === 'bullet' ? `• ${block.text}` : block.text}
                </NouText>
              ))
            ) : (
              <NouText className="text-body leading-6 text-zinc-800 dark:text-zinc-200">
                {t('update.noNotes')}
              </NouText>
            )}
          </View>
        </ScrollView>

        <View className="flex-row gap-3 px-4 pb-4">
          <NouButton variant="outline" className="flex-1" onPress={onClose}>
            {t('update.later')}
          </NouButton>
          <NouButton className="flex-1" onPress={open}>
            {release.apkUrl ? t('update.get') : t('update.openPage')}
          </NouButton>
        </View>
      </View>
    </BaseModal>
  )
}
