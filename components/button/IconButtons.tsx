import { colors } from '@/lib/colors'
import AntDesign from '@react-native-vector-icons/ant-design'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import MaterialCommunityIcons from '@react-native-vector-icons/material-design-icons'
import { type ComponentProps, type ElementType } from 'react'
import { Pressable, useColorScheme } from 'react-native'
import { useTwColor } from '@/lib/theme'
import { hapticTick } from '@/lib/haptics'

type IconButtonProps<T extends ElementType> = Omit<ComponentProps<T>, 'style' | 'onPress'> & Omit<ComponentProps<typeof Pressable>, 'children'>

/*
 * Every icon in the app goes through these three. They share one press
 * treatment -- a rounded wash behind the glyph -- because an icon that changes
 * nothing on touch reads as a dead button until the screen catches up, and the
 * wash shows the target while it does it. One tick for all of them: a control
 * that moved, not a thing that happened.
 */
const buttonCls = 'h-11 w-11 items-center justify-center rounded-full active:bg-black/[0.08] dark:active:bg-white/[0.12]'

const withTick = <T,>(handler: T) =>
  typeof handler === 'function'
    ? (...args: unknown[]) => {
        hapticTick()
        return (handler as (...a: unknown[]) => unknown)(...args)
      }
    : handler

export const AntButton = ({ color, name, size = 24, style, onPress, ...props }: IconButtonProps<typeof AntDesign>) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'

  return (
    <Pressable
      className={buttonCls}
      style={(state) => (typeof style === 'function' ? style(state) : style)}
      onPress={withTick(onPress) as typeof onPress}
      {...props}
    >
      <AntDesign name={name} size={size} color={color ?? (isDark ? tw(colors.icon) : tw(colors.iconLightStrong))} />
    </Pressable>
  )
}

export const MaterialButton = ({ color, name, size = 24, style, onPress, ...props }: IconButtonProps<typeof MaterialIcons>) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'

  return (
    <Pressable
      className={buttonCls}
      style={(state) => (typeof style === 'function' ? style(state) : style)}
      onPress={withTick(onPress) as typeof onPress}
      {...props}
    >
      <MaterialIcons name={name} size={size} color={color ?? (isDark ? tw(colors.icon) : tw(colors.iconLightStrong))} />
    </Pressable>
  )
}

export const MaterialCommunityButton = ({ color, name, size = 24, style, onPress, ...props }: IconButtonProps<typeof MaterialCommunityIcons>) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'

  return (
    <Pressable
      className={buttonCls}
      style={(state) => (typeof style === 'function' ? style(state) : style)}
      onPress={withTick(onPress) as typeof onPress}
      {...props}
    >
      <MaterialCommunityIcons name={name} size={size} color={color ?? (isDark ? tw(colors.icon) : tw(colors.iconLightStrong))} />
    </Pressable>
  )
}
