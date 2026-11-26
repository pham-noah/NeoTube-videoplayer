import { useValue } from '@legendapp/state/react'
import { Pressable, View } from 'react-native'
import { t } from 'i18next'
import { settings$, type SettingsSnapshot } from '@/states/settings'
import { changedSettings, humanizeSettingKey, SETTINGS_DEFAULTS } from '@/lib/settings-defaults'
import { NouText } from '../../NouText'
import { EmptyState } from '../../row/EmptyState'
import { dividerCls, text } from '@/lib/colors'
import { hapticTick } from '@/lib/haptics'
import { clsx } from '@/lib/utils'

/**
 * Settings are spread over eight screens, so "what did I change?" had no
 * answer short of walking all of them. This lists exactly the keys that
 * differ from lib/settings-defaults.ts, each resettable on its own — the
 * per-section reset the audit asked for, done generically.
 */
export const SettingsChangedContent = () => {
  const snapshot = useValue(settings$) as unknown as SettingsSnapshot
  const changed = changedSettings(snapshot)

  if (!changed.length) {
    return (
      <EmptyState
        icon="check-circle-outline"
        title={t('settings.changedNone')}
        hint={t('settings.changedNoneHint')}
      />
    )
  }

  const reset = (key: keyof SettingsSnapshot) => {
    hapticTick()
    const fallback = SETTINGS_DEFAULTS[key]
    if (fallback === undefined) return
    ;(settings$[key] as { set: (value: unknown) => void }).set(fallback)
  }

  const describe = (value: unknown) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'boolean') return value ? t('common.on', 'On') : t('common.off', 'Off')
    if (typeof value === 'string') return value || '—'
    if (typeof value === 'number') return String(value)
    return JSON.stringify(value)
  }

  return (
    <View>
      <NouText className={clsx('mb-2 px-1 text-label', text.secondary)}>
        {t('settings.changedHint', { count: changed.length })}
      </NouText>
      <View className="overflow-hidden rounded-card bg-white dark:bg-zinc-900">
        {changed.map((key, index) => (
          <View
            key={String(key)}
            className={clsx('flex-row items-center gap-3 px-gutter py-rowY', index < changed.length - 1 && dividerCls)}
          >
            <View className="flex-1">
              <NouText className="text-headline font-semibold">{humanizeSettingKey(String(key))}</NouText>
              <NouText className={clsx('mt-1 text-label', text.secondary)} numberOfLines={1}>
                {describe(snapshot[key])}
              </NouText>
            </View>
            <Pressable
              onPress={() => reset(key)}
              accessibilityRole="button"
              accessibilityLabel={`${t('settings.resetOne')}: ${humanizeSettingKey(String(key))}`}
              className="rounded-full bg-black/[0.05] px-3 py-1.5 active:opacity-70 dark:bg-white/[0.08]"
            >
              <NouText className="text-label font-semibold text-teal-700 dark:text-teal-400">
                {t('settings.resetOne')}
              </NouText>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  )
}
