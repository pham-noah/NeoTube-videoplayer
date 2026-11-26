import { useValue } from '@legendapp/state/react'
import { useEffect } from 'react'
import { AppState, Pressable, View, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { t } from 'i18next'
import { NouText } from './NouText'
import { getToastColors } from '@/lib/toast-theme'
import { dismissToast, toasts$ } from '@/states/toast'
import { pruneExpiredUndoToasts, runUndoAction, undoToasts$ } from '@/states/undo-toast'
import { hapticTick } from '@/lib/haptics'
import { openModalCount$ } from '@/states/ui'

/*
 * One host for both kinds of message. They used to be two components mounted in
 * the same corner, each absolute at the bottom of the screen, so an undo toast
 * and a plain toast arriving together drew on top of each other.
 */
export const ToastHost = () => {
  const toasts = useValue(toasts$)
  const undoToasts = useValue(undoToasts$)
  // A sheet paints its own copy of these above itself; drawing them here too
  // left a second, unreachable chip peeking out under the sheet.
  const sheetOpen = useValue(openModalCount$) > 0
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const toastColors = getToastColors(colorScheme !== 'light')

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        pruneExpiredUndoToasts()
      }
    })
    return () => subscription.remove()
  }, [])

  if (!toasts.length && (!undoToasts.length || sheetOpen)) {
    return null
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-0 z-[1000] items-center justify-end px-4"
      // Gesture navigation reports a bottom inset of 0 and still draws its pill
      // over the last 40-odd dp, so the toast needs a floor of its own.
      style={{ paddingBottom: Math.max(insets.bottom, 44) }}
    >
      <View pointerEvents="box-none" className="w-full max-w-[420px] gap-2">
        {(sheetOpen ? [] : undoToasts).map((toast) => (
          <View
            key={toast.id}
            accessibilityLiveRegion="polite"
            className="flex-row items-center rounded-xl px-4 py-3 shadow-xl"
            style={{ backgroundColor: toastColors.background }}
          >
            <NouText
              pointerEvents="none"
              className="min-w-0 flex-1"
              style={{ color: toastColors.text }}
              numberOfLines={2}
            >
              {toast.message}
            </NouText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('buttons.undo')}
              onPress={() => {
                hapticTick()
                runUndoAction(toast.id)
              }}
              hitSlop={8}
              className="ml-4 px-2 py-1"
            >
              <NouText className="font-semibold" style={{ color: toastColors.accent }}>
                {t('buttons.undo')}
              </NouText>
            </Pressable>
          </View>
        ))}
        {toasts.map((toast) => (
          <Pressable
            key={toast.id}
            accessibilityLiveRegion="polite"
            accessibilityRole={toast.onPress ? 'button' : undefined}
            onPress={() => {
              dismissToast(toast.id)
              toast.onPress?.()
            }}
            className="rounded-xl px-4 py-3 shadow-xl"
            style={{ backgroundColor: toastColors.background }}
          >
            <NouText style={{ color: toastColors.text }} numberOfLines={3}>
              {toast.message}
            </NouText>
          </Pressable>
        ))}
      </View>
    </View>
  )
}
