import { View, Pressable, useColorScheme } from 'react-native'
import { memo, useState } from 'react'
import { Bookmark, removeBookmark } from '@/states/bookmarks'
import { tabs$ } from '@/states/tabs'
import { ui$, updateUrl } from '@/states/ui'
import { NouText } from '../NouText'
import { isWeb, isIos } from '@/lib/utils'
import { getPageType, getVideoThumbnail } from '@/lib/page'
import { NouMenu, type Item } from '../menu/NouMenu'
import { t } from 'i18next'
import { MaterialButton } from '../button/IconButtons'
import { share } from '@/lib/share'
import { RetryImage } from '../image/RetryImage'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { useTwColor } from '@/lib/theme'
import { RowActionSheet } from '../row/RowActionSheet'
import { SwipeRow } from '../row/SwipeRow'
import { hapticTick } from '@/lib/haptics'

/* https://www.youtube.com/watch?v=<id> */
function getThumbnail(url: string) {
  try {
    const id = new URL(url).searchParams.get('v')
    return id ? getVideoThumbnail(id) : undefined
  } catch {
    return undefined
  }
}

const blurhash =
  '|rF?hV%2WCj[ayj[a|j[az_NaeWBj@ayfRayfQfQM{M|azj[azf6fQfQfQIpWXofj[ayj[j[fQayWCoeoeaya}j[ayfQa{oLj?j[WVj[ayayj[fQoff7azayj[ayj[j[ayofayayayj[fQj[ayayj[ayfjj[j[ayjuayj['

export const BookmarkItem: React.FC<{
  bookmark: Bookmark
  /** Set while the Library is in selection mode: taps toggle instead of opening. */
  selecting?: boolean
  selected?: boolean
  onToggleSelect?: (url: string) => void
  /** Long press while selecting: take everything between here and the first pick. */
  onRangeSelect?: () => void
}> = memo(({ bookmark, selecting, selected, onToggleSelect, onRangeSelect }) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  const onPress = () => {
    if (selecting) {
      hapticTick()
      onToggleSelect?.(bookmark.url)
      return
    }
    updateUrl(bookmark.url)
    ui$.assign({ libraryModalOpen: false })
  }

  const [actionsOpen, setActionsOpen] = useState(false)

  // Long press starts a selection when the list offers one. The kebab still
  // opens the old action sheet, so nothing became unreachable.
  const onLongPress = () => {
    if (selecting && onRangeSelect) {
      onRangeSelect()
      return
    }
    if (onToggleSelect) {
      onToggleSelect(bookmark.url)
      return
    }
    setActionsOpen(true)
  }

  const pageType = getPageType(bookmark.url)
  const round = pageType?.type === 'channel'
  const square = round || pageType?.home === 'yt-music'

  const menuItems: Item[] = [
    ...(isWeb
      ? [
          {
            label: t('menus.openInNewTab'),
            icon: <MaterialIcons name="open-in-new" size={18} color={isDark ? tw('zinc-300') : tw('slate-600')} />,
            handler: () => {
              tabs$.openTab(bookmark.url)
              ui$.assign({ libraryModalOpen: false })
            },
          },
        ]
      : []),
    {
      label: t('menus.edit'),
      icon: <MaterialIcons name="edit" size={18} color={isDark ? tw('zinc-300') : tw('slate-600')} />,
      systemImage: 'pencil',
      handler: () => ui$.bookmarkModalBookmark.set(bookmark),
    },
    {
      label: t('menus.moveTo'),
      icon: <MaterialIcons name="drive-file-move-outline" size={18} color={isDark ? tw('zinc-300') : tw('slate-600')} />,
      systemImage: 'folder',
      handler: () => ui$.moveBookmarkModalBookmark.set(bookmark),
    },
    {
      label: t('menus.share'),
      icon: <MaterialIcons name="share" size={18} color={isDark ? tw('zinc-300') : tw('slate-600')} />,
      systemImage: 'square.and.arrow.up',
      handler: () => share(bookmark.url),
    },
    {
      label: t('menus.remove'),
      icon: <MaterialIcons name="delete-outline" size={18} color={isDark ? tw('zinc-300') : tw('slate-600')} />,
      systemImage: 'trash',
      handler: () => removeBookmark(bookmark),
    },
  ]

  const thumbnailWidth = square ? 48 : isWeb ? 160 : 112
  const thumbnailHeight = square ? 48 : isWeb ? 90 : 63

  return (
    <SwipeRow label={t('menus.remove')} onSwipe={() => removeBookmark(bookmark)}>
      <View className={selected ? 'flex-row items-start px-2 py-2 bg-teal-500/10' : 'flex-row items-start px-2 py-2'}>
        <Pressable
          style={{ width: thumbnailWidth }}
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityRole={selecting ? 'checkbox' : 'button'}
          accessibilityLabel={bookmark.title}
          accessibilityState={selecting ? { checked: !!selected } : undefined}
          accessibilityHint={selecting ? undefined : t('a11y.rowActions')}
        >
          <RetryImage
            source={bookmark.json?.thumbnail || getThumbnail(bookmark.url)}
            contentFit="cover"
            placeholder={{ blurhash }}
            style={{ height: thumbnailHeight, borderRadius: round ? 24 : 8 }}
          />
          {selecting ? (
            <View
              className={
                selected
                  ? 'absolute left-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-teal-600'
                  : 'absolute left-1 top-1 h-6 w-6 items-center justify-center rounded-full bg-black/45'
              }
            >
              <MaterialIcons name={selected ? 'check' : 'radio-button-unchecked'} size={16} color="#fff" />
            </View>
          ) : null}
        </Pressable>
        <Pressable
          className="flex-1 ml-3"
          onPress={onPress}
          onLongPress={onLongPress}
          accessibilityRole={selecting ? 'checkbox' : 'button'}
          accessibilityLabel={bookmark.title}
          accessibilityState={selecting ? { checked: !!selected } : undefined}
          accessibilityHint={selecting ? undefined : t('a11y.rowActions')}
        >
          <NouText className="leading-5" numberOfLines={isWeb ? 4 : 3} ellipsizeMode="tail">
            {bookmark.title}
          </NouText>
        </Pressable>
        <View>
          <NouMenu
            trigger={isWeb ? <MaterialButton name="more-vert" size={20} /> : isIos ? 'ellipsis' : 'filled.MoreVert'}
            items={menuItems}
          />
        </View>
      </View>
      <RowActionSheet open={actionsOpen} onClose={() => setActionsOpen(false)} title={bookmark.title} items={menuItems} />
    </SwipeRow>
  )
})

BookmarkItem.displayName = 'BookmarkItem'
