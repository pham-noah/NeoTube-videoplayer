import { Animated, PanResponder, Pressable, View } from 'react-native'
import { type ReactNode, useMemo, useRef, useState } from 'react'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { NouText } from '../NouText'
import { hapticPress } from '@/lib/haptics'

const ACTION_WIDTH = 88
const TRIGGER_DISTANCE = 56

/*
 * Swipe a row to the left to run one action -- remove, for every list in the
 * app. The action runs on release, not on a tap afterwards: the undo toast is
 * already the confirmation, and a row that stays open needs a close affordance
 * the lists do not have.
 *
 * PanResponder rather than a gesture-handler Swipeable: this needs to work in
 * the web build too, and a horizontal drag that only claims the responder once
 * it is clearly horizontal leaves the FlatList's vertical scroll alone.
 */
export const SwipeRow: React.FC<{
  children: ReactNode
  label: string
  onSwipe?: () => void
  enabled?: boolean
}> = ({ children, label, onSwipe, enabled = true }) => {
  // A state cell, not a ref: the animated value is created once but read during
  // every render, and reading a ref during render is what the refs rule forbids.
  const [translateX] = useState(() => new Animated.Value(0))
  const [dragging, setDragging] = useState(false)
  const fired = useRef(false)

  // These callbacks run inside the gesture loop, never during render, so the
  // refs rule's heuristic does not apply here.
  const responder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, gesture) =>
          enabled && Boolean(onSwipe) && gesture.dx < -14 && Math.abs(gesture.dx) > Math.abs(gesture.dy) * 1.6,
        onPanResponderGrant: () => setDragging(true),
        onPanResponderMove: (_, gesture) => {
          const next = Math.max(-ACTION_WIDTH, Math.min(0, gesture.dx))
          translateX.setValue(next)
          if (next <= -TRIGGER_DISTANCE && !fired.current) {
            fired.current = true
            hapticPress()
          } else if (next > -TRIGGER_DISTANCE) {
            fired.current = false
          }
        },
        onPanResponderRelease: () => {
          const shouldRun = fired.current
          fired.current = false
          setDragging(false)
          Animated.timing(translateX, { toValue: 0, duration: 140, useNativeDriver: true }).start()
          if (shouldRun) onSwipe?.()
        },
        onPanResponderTerminate: () => {
          fired.current = false
          setDragging(false)
          Animated.timing(translateX, { toValue: 0, duration: 140, useNativeDriver: true }).start()
        },
      }),
    [enabled, onSwipe, translateX],
  )

  if (!enabled || !onSwipe) {
    return <View>{children}</View>
  }

  return (
    <View className="overflow-hidden">
      {/* The panel exists only while a drag is in flight: row surfaces are
          translucent, so a permanently-mounted red plate showed through at rest. */}
      {dragging ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={label}
          onPress={() => onSwipe()}
          className="absolute inset-y-0 right-0 w-[88px] items-center justify-center bg-red-600"
        >
          <MaterialIcons name="delete-outline" size={22} color="#fff" />
          <NouText className="mt-0.5 text-[11px] font-medium text-white" numberOfLines={1}>
            {label}
          </NouText>
        </Pressable>
      ) : null}
      <Animated.View
        className="bg-white dark:bg-zinc-900"
        style={{ transform: [{ translateX }] }}
        {...responder.panHandlers}
      >
        {children}
      </Animated.View>
    </View>
  )
}
