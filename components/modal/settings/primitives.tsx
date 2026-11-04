import { ActivityIndicator, Platform, Pressable, Switch, View, useColorScheme } from 'react-native'
import { clsx, isWeb, nIf } from '@/lib/utils'
import { NouText } from '../../NouText'
import MaterialIcons, { type MaterialIconsIconName } from '@react-native-vector-icons/material-icons'
import { useTwColor } from '@/lib/theme'

export const sectionLabelCls =
  'mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-500'
export const iconWrapCls =
  'h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-950'

export const SettingsSection: React.FC<React.PropsWithChildren<{ label?: string }>> = ({ label, children }) => {
  return (
    <View>
      {label ? <NouText className={sectionLabelCls}>{label}</NouText> : null}
      {children}
    </View>
  )
}

export const SettingsToggleRow: React.FC<{
  label: string
  description?: string
  icon: MaterialIconsIconName
  value: boolean
  onPress: () => void
  isLast?: boolean
}> = ({ label, description, icon, value, onPress, isLast = false }) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  return (
    <Pressable
      onPress={onPress}
      className={clsx(
        'flex-row items-center gap-3 px-4 py-4 active:bg-zinc-200/80 dark:active:bg-zinc-800/80',
        !isLast && 'border-b-2 border-zinc-100 dark:border-zinc-950',
      )}
    >
      <View className={iconWrapCls}>
        <MaterialIcons name={icon} color={isDark ? tw('zinc-300') : tw('slate-600')} size={18} />
      </View>
      <View className="flex-1">
        <NouText className="font-medium">{label}</NouText>
        {nIf(
          !!description,
          <NouText className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{description}</NouText>,
        )}
      </View>
      <View {...(isWeb ? { onClick: (e: any) => e.stopPropagation() } : {})}>
        <Switch
          value={value}
          onValueChange={onPress}
          trackColor={{ false: tw('zinc-600'), true: tw('blue-700') }}
          thumbColor={value ? tw('blue-50') : tw('zinc-100')}
          {...Platform.select({
            web: {
              activeThumbColor: tw('blue-50'),
            },
          })}
        />
      </View>
    </Pressable>
  )
}

export const SettingsActionRow: React.FC<{
  label: string
  description?: string
  icon: MaterialIconsIconName
  onPress: () => void
  isLast?: boolean
  loading?: boolean
  disabled?: boolean
}> = ({ label, description, icon, onPress, isLast = false, loading = false, disabled = false }) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  const isDisabled = disabled || loading
  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      className={clsx(
        'flex-row items-center gap-3 px-4 py-4 active:bg-zinc-200/80 dark:active:bg-zinc-800/80',
        isDisabled && 'opacity-70',
        !isLast && 'border-b-2 border-zinc-100 dark:border-zinc-950',
      )}
    >
      <View className={iconWrapCls}>
        <MaterialIcons name={icon} color={isDark ? tw('zinc-300') : tw('slate-600')} size={18} />
      </View>
      <View className="flex-1">
        <NouText className="font-medium">{label}</NouText>
        {description ? (
          <NouText className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{description}</NouText>
        ) : null}
      </View>
      {loading ? (
        <ActivityIndicator color={isDark ? tw('zinc-300') : tw('slate-600')} />
      ) : (
        <MaterialIcons name="chevron-right" color={isDark ? tw('zinc-500') : tw('zinc-600')} size={20} />
      )}
    </Pressable>
  )
}
