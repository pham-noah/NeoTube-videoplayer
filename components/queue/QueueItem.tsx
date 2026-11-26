import { useColorScheme, View, Pressable, Animated, PanResponder, useWindowDimensions } from 'react-native'
import { memo, useRef, useState } from 'react'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { Bookmark } from '@/states/bookmarks'
import { updateUrl } from '@/states/ui'
import { colors } from '@/lib/colors'
import { NouText } from '../NouText'
import { nIf, isWeb, isIos } from '@/lib/utils'
import { getThumbnail } from '@/lib/page'
import { queue$ } from '@/states/queue'
import { dropIndex } from '@/lib/queue-drag'
import { NouMenu, type Item } from '../menu/NouMenu'
import { MaterialButton } from '../button/IconButtons'

import { t } from 'i18next'
import { share } from '@/lib/share'
import { RetryImage } from '../image/RetryImage'
import { useTwColor } from '@/lib/theme'
import { RowActionSheet } from '../row/RowActionSheet'
import { SwipeRow } from '../row/SwipeRow'
import { showUndoToast } from '@/states/undo-toast'
import { hapticTick } from '@/lib/haptics'

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj['

/** Row height is fixed, which is what lets a drag know how many rows it crossed. */
export const QUEUE_ROW_HEIGHT = 84

/** How close to the screen edge a drag has to get before the list follows it. */
const QUEUE_DRAG_EDGE = 220

export const QueueItem: React.FC<{
  bookmark: Bookmark
  playing: boolean
  index: number
  total: number
  onReorder?: (from: number, to: number) => void
  /** Called while a drag sits in the top or bottom margin, so the list follows.
   * Returns how many pixels the list actually moved. */
  onDragScroll?: (direction: 1 | -1) => number
}> = memo(({ bookmark, playing, index, total, onReorder, onDragScroll }) => {
  const { height: windowHeight } = useWindowDimensions()
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  const iconColor = isDark ? tw('zinc-300') : tw('slate-600')
  const [actionsOpen, setActionsOpen] = useState(false)
  const [dragging, setDragging] = useState(false)
  const translateY = useRef(new Animated.Value(0)).current
  // Pixels the list scrolled while the finger held still at an edge. Without
  // this the drop index ignores everything the autoscroll moved.
  const scrollTravel = useRef(0)

  const onPress = () => {
    updateUrl(bookmark.url)
  }

  // The queue keeps its own ordering, so undo puts back the array it had rather
  // than re-adding the video at the end.
  const remove = () => {
    const snapshot = queue$.bookmarks.peek()
    queue$.toggleBookmark(bookmark)
    showUndoToast(t('queue.removed'), () => queue$.bookmarks.set(snapshot))
  }

  // A PanResponder created once keeps the callbacks and the row's position from
  // the first render, which is wrong the moment the queue reorders under it.
  const latest = useRef({ index, total, onReorder, onDragScroll })
  latest.current = { index, total, onReorder, onDragScroll }

  // Arrows still exist below because a drag cannot be done with a screen
  // reader; the grip is the fast path, the menu is the accessible one.
  const pan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 6,
      onPanResponderGrant: () => {
        scrollTravel.current = 0
        setDragging(true)
        hapticTick()
      },
      onPanResponderMove: (_, gesture) => {
        translateY.setValue(gesture.dy)
        // Dragging past the edge of the screen has to move the list, or a video
        // twenty rows down can never be dragged to the top.
        const { onDragScroll: scroll } = latest.current
        if (!scroll) return
        if (gesture.moveY < QUEUE_DRAG_EDGE) scrollTravel.current += scroll(-1) ?? 0
        else if (gesture.moveY > windowHeight - QUEUE_DRAG_EDGE) scrollTravel.current += scroll(1) ?? 0
      },
      onPanResponderRelease: (_, gesture) => {
        setDragging(false)
        Animated.spring(translateY, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start()
        const { index: from, total: count, onReorder: reorder } = latest.current
        if (!reorder) return
        const target = dropIndex({
          from,
          dy: gesture.dy,
          scrollTravel: scrollTravel.current,
          count,
          rowHeight: QUEUE_ROW_HEIGHT,
        })
        scrollTravel.current = 0
        if (target !== from) reorder(from, target)
      },
      onPanResponderTerminate: () => {
        setDragging(false)
        translateY.setValue(0)
      },
    }),
  ).current

  const menuItems: Item[] = [
    ...(index > 0
      ? [
          {
            label: t('menus.moveUp'),
            icon: <MaterialIcons name="arrow-upward" size={18} color={iconColor} />,
            handler: () => queue$.moveUp(index),
          },
        ]
      : []),
    ...(index < total - 1
      ? [
          {
            label: t('menus.moveDown'),
            icon: <MaterialIcons name="arrow-downward" size={18} color={iconColor} />,
            handler: () => queue$.moveDown(index),
          },
        ]
      : []),
    {
      label: t('menus.share'),
      icon: <MaterialIcons name="share" size={18} color={iconColor} />,
      systemImage: 'square.and.arrow.up',
      handler: () => share(bookmark.url),
    },
    {
      label: t('menus.remove'),
      icon: <MaterialIcons name="delete-outline" size={18} color={iconColor} />,
      systemImage: 'trash',
      handler: remove,
    },
  ]

  return (
    <SwipeRow label={t('menus.remove')} onSwipe={remove}>
      <Animated.View
        style={{
          height: QUEUE_ROW_HEIGHT,
          transform: [{ translateY }],
          zIndex: dragging ? 10 : 0,
          opacity: dragging ? 0.94 : 1,
        }}
      >
        <View className="flex-row my-2 overflow-hidden">
          <View className="flex-row items-center">
            <View className="w-6">{nIf(playing, <MaterialIcons name="play-arrow" color={tw(colors.icon)} size={16} />)}</View>
            <Pressable
              className="w-[120px]"
              onPress={onPress}
              onLongPress={() => setActionsOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={bookmark.title}
              accessibilityHint={t('a11y.rowActions')}
            >
              <RetryImage
                source={bookmark.thumbnail || getThumbnail(bookmark.url)}
                contentFit="cover"
                placeholder={{ blurhash }}
                style={{ height: 67.5, borderRadius: 8 }}
              />
            </Pressable>
          </View>
          <Pressable
            className="flex-1 ml-3"
            onPress={onPress}
            onLongPress={() => setActionsOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={bookmark.title}
            accessibilityHint={t('a11y.rowActions')}
          >
            <NouText className="leading-6" numberOfLines={3} ellipsizeMode="tail">
              {bookmark.title}
            </NouText>
          </Pressable>
          <View
            {...pan.panHandlers}
            style={{ height: QUEUE_ROW_HEIGHT }}
            className="w-11 items-center justify-center"
            accessibilityRole="adjustable"
            accessibilityLabel={t('a11y.reorder')}
            accessibilityHint={t('a11y.dragToReorder')}
            accessibilityActions={[
              { name: 'increment', label: t('menus.moveUp') },
              { name: 'decrement', label: t('menus.moveDown') },
            ]}
            onAccessibilityAction={(event) => {
              const { index: at } = latest.current
              if (event.nativeEvent.actionName === 'increment') queue$.moveUp(at)
              if (event.nativeEvent.actionName === 'decrement') queue$.moveDown(at)
            }}
          >
            <MaterialIcons name="drag-handle" size={22} color={tw(colors.iconSubtle)} />
          </View>
          <NouMenu
            trigger={
              isWeb ? <MaterialButton name="more-vert" size={20} /> : isIos ? 'ellipsis' : 'filled.MoreVert'
            }
            items={menuItems}
          />
        </View>
      </Animated.View>
      <RowActionSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title={bookmark.title} items={menuItems} />
    </SwipeRow>
  )
})

QueueItem.displayName = 'QueueItem'
