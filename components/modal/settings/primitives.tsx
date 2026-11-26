import { ActivityIndicator, Pressable, View, useColorScheme } from 'react-native'
import { clsx, nIf } from '@/lib/utils'
import { NouText } from '../../NouText'
import MaterialIcons, { type MaterialIconsIconName } from '@react-native-vector-icons/material-icons'
import { useTwColor } from '@/lib/theme'
import { dividerCls, text } from '@/lib/colors'
import { GlassSwitch } from '../../glass/GlassSwitch'

// Section label is the caption step of the type scale (11/14, +0.08em,
// uppercase). 0.18em tracking on 11px opened the word up until it read as
// letter-spaced noise; 0.08em keeps it a label. dark:text-zinc-400 clears 4.5:1
// on a card, zinc-500 did not.
export const sectionLabelCls = 'mb-2 px-1 text-caption font-semibold uppercase text-zinc-600 dark:text-zinc-400'
// 36px chip at radius 12. At 40px/radius 16 it carried the same visual weight as
// the row title next to it, and zinc-950 on a black sheet drew a black square on
// black.
export const iconWrapCls = 'h-9 w-9 items-center justify-center rounded-chip bg-black/[0.04] dark:bg-white/[0.06]'

// The row is the touch target (56dp minimum) and, for toggles, it is also the
// switch: role and state live here so assistive tech announces the row once as
// "label, switch, on" instead of a row plus a nested control that could toggle
// twice. Dividers are the 1px hairline token, not border-b-2.
const rowCls = (isLast: boolean, disabled = false) =>
  clsx(
    'flex-row items-center gap-3 px-gutter py-rowY min-h-14 active:bg-black/[0.04] dark:active:bg-white/[0.06]',
    !isLast && dividerCls,
    disabled && 'opacity-70',
  )

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
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      accessibilityHint={description}
      className={rowCls(isLast)}
    >
      <View className={iconWrapCls}>
        <MaterialIcons name={icon} color={isDark ? tw('zinc-300') : tw('slate-600')} size={18} />
      </View>
      <View className="flex-1">
        <NouText className="text-headline font-semibold">{label}</NouText>
        {nIf(
          !!description,
          <NouText className={clsx('mt-1 text-label', text.secondary)}>{description}</NouText>,
        )}
      </View>
      <GlassSwitch value={value} />
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
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={description}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      className={rowCls(isLast, isDisabled)}
    >
      <View className={iconWrapCls}>
        <MaterialIcons name={icon} color={isDark ? tw('zinc-300') : tw('slate-600')} size={18} />
      </View>
      <View className="flex-1">
        <NouText className="text-headline font-semibold">{label}</NouText>
        {description ? (
          <NouText className={clsx('mt-1 text-label', text.secondary)}>{description}</NouText>
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
