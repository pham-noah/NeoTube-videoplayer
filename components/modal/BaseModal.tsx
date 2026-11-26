import { clsx, isIos, isWeb } from '@/lib/utils'
import { useEffect } from 'react'
import { openModalCount$ } from '@/states/ui'
import { ReactNode } from 'react'
import { BackHandler, KeyboardAvoidingView, Modal, Pressable, useWindowDimensions, View } from 'react-native'
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context'
import { GlassSurface } from '@/components/glass/GlassSurface'
import { UndoToastInline } from '@/components/row/UndoToastInline'
import { useModalFocusReturn } from '@/lib/hooks/useWebviewFocusReturn'
import { useModal } from '@/lib/hooks/useModal'

const sheetStyle = { borderTopRightRadius: 28, borderBottomRightRadius: 28 }

/*
 * 'sheet' is the full-height browsing sheet the app is built around. 'bottom'
 * is a compact card for short action lists: a second full-height sheet opened
 * from inside the first one reads as a panel clipped by its parent, which is
 * what a long press on a row used to look like.
 */
export type BaseModalPresentation = 'sheet' | 'bottom'

export const BaseModal: React.FC<{
  className?: string
  children: ReactNode
  onClose: () => void
  onRequestClose?: () => void
  useNativeModal?: boolean
  presentation?: BaseModalPresentation
}> = ({ className, children, onClose, onRequestClose, useNativeModal = !isWeb, presentation = 'sheet' }) => {
  useModal(onRequestClose || onClose, isWeb)
  useModalFocusReturn()
  useEffect(() => {
    openModalCount$.set((count) => count + 1)
    return () => openModalCount$.set((count) => Math.max(0, count - 1))
  }, [])

  // A non-native modal is only a View. Android's back button went straight to
  // the activity underneath, so the sheet stayed up and the next press quit the
  // app. Registering last means the newest sheet gets the press first.
  useEffect(() => {
    if (isWeb || useNativeModal) return
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      ;(onRequestClose || onClose)()
      return true
    })
    return () => subscription.remove()
  }, [useNativeModal, onClose, onRequestClose])

  const isBottom = presentation === 'bottom'
  // The card is the only thing anchored to the screen edge, so it has to clear
  // the gesture bar itself; the sheet's SafeAreaView does that for lists.
  const insets = useSafeAreaInsets()
  const { height: windowHeight } = useWindowDimensions()

  const inner = isWeb || isBottom ? (
    children
  ) : (
    <SafeAreaView className="flex-1 max-h-full" edges={['top', 'bottom']}>
      {children}
    </SafeAreaView>
  )

  // A short card gets a solid surface: the sheet's glass is legible at full
  // height, but over a row it reads as a smudge.
  const card = isBottom ? (
    <KeyboardAvoidingView
      behavior={isIos ? 'padding' : undefined}
      className="absolute inset-x-0 bottom-0 px-3"
      style={{ paddingBottom: Math.max(insets.bottom, 8) + 8 }}
    >
      {/* A percentage max-height has no parent height to resolve against here
          (the card is absolutely positioned), so the card used to clip its last
          row instead of scrolling. Cap it against the window instead. */}
      <View
        className="overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-zinc-900"
        style={{ maxHeight: Math.round(windowHeight * 0.62) }}
      >
        {inner}
      </View>
    </KeyboardAvoidingView>
  ) : (
    <KeyboardAvoidingView
      behavior={isIos ? 'padding' : undefined}
      className="absolute top-0 left-0 bottom-0 w-[30rem] max-w-[80vw] flex-1"
    >
      <GlassSurface className="flex-1" style={sheetStyle}>
        {inner}
      </GlassSurface>
    </KeyboardAvoidingView>
  )

  if (!isWeb && useNativeModal) {
    return (
      <Modal transparent visible onRequestClose={onRequestClose || onClose}>
        {/* A Modal is its own native tree; SafeAreaView reads insets from the
            nearest provider in it, so without one the sheet runs under the
            status bar on iOS. */}
        <SafeAreaProvider>
          <View className="flex-1" accessibilityViewIsModal>
            <Pressable className="absolute inset-0 bg-zinc-300/50 dark:bg-gray-600/50" onPress={onClose} />
            {card}
            {/* Last child so it paints over the sheet: a toast mounted at the
                app level is invisible behind a native Modal window. */}
            <UndoToastInline />
          </View>
        </SafeAreaProvider>
      </Modal>
    )
  }

  return (
    <View className={clsx('absolute inset-0 z-10', className)} accessibilityViewIsModal>
      <Pressable className="absolute inset-0 bg-zinc-300/50 dark:bg-gray-600/50" onPress={onClose} />
      {card}
      <UndoToastInline />
    </View>
  )
}
