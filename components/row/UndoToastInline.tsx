import { useValue } from '@legendapp/state/react'
import { Pressable, View, useColorScheme } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { t } from 'i18next'
import { NouText } from '../NouText'
import { getToastColors } from '@/lib/toast-theme'
import { runUndoAction, undoToasts$ } from '@/states/undo-toast'
import { hapticTick } from '@/lib/haptics'

/*
 * Undo toasts have to be drawn in the same native window as the sheet that
 * raised them. BaseModal is a real RN `Modal` on Android — its own window — so
 * the app-level ToastHost paints *behind* the sheet and only a sliver of the
 * undo bar shows under the rounded corner, where the Undo button can't be hit.
 * Deletions all happen inside sheets, so the toast belongs inside them too.
 */
export const UndoToastInline = () => {
  const undoToasts = useValue(undoToasts$)
  const insets = useSafeAreaInsets()
  const colorScheme = useColorScheme()
  const toastColors = getToastColors(colorScheme !== 'light')

  if (!undoToasts.length) {
    return null
  }

  return (
    <View
      pointerEvents="box-none"
      className="absolute inset-x-0 items-center px-4"
      // Clear the app's floating bottom toolbar and the gesture bar: sitting at
      // the very bottom clipped the chip's text against the screen edge.
      style={{ bottom: Math.max(insets.bottom, 12) + 64 }}
    >
      <View pointerEvents="box-none" className="w-full gap-2">
        {undoToasts.map((toast) => (
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
              hitSlop={12}
              className="ml-4 px-3 py-2"
            >
              <NouText className="font-semibold" style={{ color: toastColors.accent }}>
                {t('buttons.undo')}
              </NouText>
            </Pressable>
          </View>
        ))}
      </View>
    </View>
  )
}
