import { View, Pressable, FlatList } from 'react-native'
import { useRef, useState } from 'react'
import { NouText } from '../NouText'
import { nIf } from '@/lib/utils'
import { useValue } from '@legendapp/state/react'
import { QueueItem } from '../queue/QueueItem'
import { queue$ } from '@/states/queue'
import { usePlayingQueueIndex } from '@/lib/queue'
import { ui$ } from '@/states/ui'
import { BaseModal } from './BaseModal'
import { t } from 'i18next'
import { EmptyState } from '../row/EmptyState'
import { showUndoToast } from '@/states/undo-toast'
import { hapticError } from '@/lib/haptics'

export const QueueModal = () => {
  const queueModalOpen = useValue(ui$.queueModalOpen)
  const { playingIndex, size } = usePlayingQueueIndex()
  const queue = useValue(queue$.bookmarks)
  // Clearing the queue is the one action in the app that used to delete a lot
  // with a single tap and no way back. One tap arms it, the second runs it, and
  // the toast can still undo it.
  const [clearArmed, setClearArmed] = useState(false)
  // Dragging a row to the edge scrolls the list, so the list has to know where
  // it currently is: FlatList's scrollToOffset is absolute, not relative.
  const listRef = useRef<FlatList<(typeof queue)[number]>>(null)
  const scrollOffset = useRef(0)
  const nudge = (direction: 1 | -1) => {
    const offset = Math.max(0, scrollOffset.current + direction * 24)
    // The row adds this to the finger's travel when it works out where to drop:
    // the list moving under a still finger is the same as the finger moving.
    const applied = offset - scrollOffset.current
    scrollOffset.current = offset
    listRef.current?.scrollToOffset({ offset, animated: false })
    return applied
  }

  const close = () => {
    setClearArmed(false)
    ui$.queueModalOpen.set(false)
  }

  const clear = () => {
    if (!clearArmed) {
      setClearArmed(true)
      hapticError()
      return
    }
    const snapshot = queue$.bookmarks.peek()
    queue$.bookmarks.set([])
    setClearArmed(false)
    ui$.queueModalOpen.set(false)
    showUndoToast(t('queue.cleared'), () => queue$.bookmarks.set(snapshot))
  }

  return nIf(
    queueModalOpen,
    <BaseModal onClose={close}>
      <View className="mt-3 mb-4 px-4 flex-row items-center justify-between">
        <View className="flex-row items-baseline">
          <NouText className="font-medium text-lg">{t('modals.queue')}</NouText>
          {nIf(size > 0, <NouText className="text-sm text-gray-400 pl-4">
            {playingIndex + 1} / {size}
          </NouText>)}
        </View>
        {nIf(size > 0, <Pressable
          onPress={clear}
          accessibilityRole="button"
          accessibilityLabel={clearArmed ? t('modals.clearQueueBody') : t('buttons.clear')}
          accessibilityState={{ expanded: clearArmed }}
          className={
            clearArmed
              ? 'rounded-full bg-red-600 px-4 py-1.5 active:opacity-80'
              : 'rounded-full border border-gray-600 px-4 py-1.5 active:bg-black/[0.05] dark:active:bg-white/[0.08]'
          }
        >
          <NouText className={clearArmed ? 'text-white text-sm' : 'text-center text-sm'}>
            {clearArmed ? t('modals.clearQueueConfirm') : t('buttons.clear')}
          </NouText>
        </Pressable>)}
      </View>
      {nIf(clearArmed, <View className="mb-3 px-4">
        <NouText className="text-xs leading-5 text-gray-400">{t('modals.clearQueueBody')}</NouText>
      </View>)}
      <FlatList
        ref={listRef}
        onScroll={(event) => {
          scrollOffset.current = event.nativeEvent.contentOffset.y
        }}
        scrollEventThrottle={16}
        data={queue}
        keyExtractor={(item) => item.url}
        renderItem={({ item, index }) => (
          <QueueItem
            bookmark={item}
            playing={playingIndex === index}
            index={index}
            total={size}
            onReorder={(from, to) => queue$.move(from, to)}
            onDragScroll={nudge}
          />
        )}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
        ListEmptyComponent={
          <EmptyState
            icon="playlist-play"
            title={t('empty.queue')}
            hint={t('empty.queueHint')}
            actionLabel={t('empty.browse')}
            onAction={close}
          />
        }
      />
    </BaseModal>,
  )
}
