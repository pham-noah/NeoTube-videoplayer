import { useEffect, useState } from 'react'
import { Animated, Easing, View, useColorScheme } from 'react-native'
import { useValue } from '@legendapp/state/react'
import { settings$ } from '@/states/settings'
import { clsx } from '@/lib/utils'

/*
 * One switch for both platforms. RN's native Switch draws the platform control
 * -- blue track on Android, iOS green -- so the app's own accent never showed up
 * on the one control that turns its features on, and the two platforms looked
 * like two apps. This is the same material as the rest of the chrome.
 *
 * Presentational on purpose: the row that holds it is the touch target and
 * carries role="switch", so a tap anywhere on the row toggles it and the thumb
 * can never disagree with the row's state. No press handler here, therefore no
 * double toggle when the row is pressed.
 */
export const GlassSwitch: React.FC<{ value: boolean }> = ({ value }) => {
  const dark = useColorScheme() !== 'light'
  const reduce = useValue(settings$.reduceEffects)
  const [progress] = useState(() => new Animated.Value(value ? 1 : 0))

  useEffect(() => {
    if (reduce) {
      progress.setValue(value ? 1 : 0)
      return
    }
    Animated.timing(progress, {
      toValue: value ? 1 : 0,
      duration: 180,
      easing: Easing.bezier(0.32, 0.72, 0, 1),
      useNativeDriver: true,
    }).start()
  }, [value, reduce, progress])

  // 46x28 track with a 24px thumb: 2px inset either side, so the thumb travels
  // 46 - 24 - 4 = 18px.
  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [0, 18] })

  return (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={clsx(
        'h-7 w-[46px] justify-center rounded-full border p-0.5',
        value
          ? 'border-accent-700/40 bg-accent-600'
          : dark
            ? 'border-white/10 bg-zinc-700'
            : 'border-black/10 bg-zinc-300',
      )}
    >
      <Animated.View
        style={{ transform: [{ translateX }] }}
        className={clsx(
          'h-6 w-6 rounded-full',
          // The thumb is white in both schemes: on the accent fill it reads as
          // the "on" side, and on a dark track it is the only light object.
          'bg-white',
        )}
      />
    </View>
  )
}
