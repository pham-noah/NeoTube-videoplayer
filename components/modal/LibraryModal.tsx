import { useValue } from '@legendapp/state/react'
import { BaseModal } from './BaseModal'
import { ui$ } from '@/states/ui'
import { NouText } from '../NouText'
import { bookmarks$ } from '@/states/bookmarks'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { getPageType } from '@/lib/page'
import { BookmarkItem } from '../bookmark/BookmarkItem'
import { Segmented } from '../picker/Segmented'
import { FlatList, Pressable, View } from 'react-native'
import { clsx, isWeb } from '@/lib/utils'
import { MaterialButton, MaterialCommunityButton } from '../button/IconButtons'
import { Folder, folders$, newFolder } from '@/states/folders'
import { FolderItem } from '../folder/FolderItem'
import { sortBy } from 'es-toolkit'
import { t } from 'i18next'
import { useActivePageUrl } from '@/lib/hooks/useActivePageUrl'
import { SearchField } from '../row/SearchField'
import { EmptyState } from '../row/EmptyState'
import { NouMenu, type Item } from '../menu/NouMenu'
import MaterialIcons from '@react-native-vector-icons/material-icons'
import { RowActionSheet } from '../row/RowActionSheet'
import { showUndoToast } from '@/states/undo-toast'
import { sortBookmarks, type LibrarySort } from '@/lib/library-sort'
import { settings$ } from '@/states/settings'

const tabsYT = [
  { label: t('library.videos'), value: 'watch' },
  { label: t('library.channels'), value: 'channel' },
  { label: t('library.playlists'), value: 'playlist' },
]
const tabsYTMusic = [
  { label: t('library.songs'), value: 'm-watch' },
  { label: t('library.artists'), value: 'm-channel' },
  { label: t('library.playlists'), value: 'm-playlist' },
]

const matches = (query: string, title?: string) => !query || (title ?? '').toLowerCase().includes(query)

const SORT_LABELS: Record<LibrarySort, string> = {
  newest: 'library.sortNewest',
  oldest: 'library.sortOldest',
  title: 'library.sortTitle',
}

export const LibraryModal = () => {
  const libraryModalOpen = useValue(ui$.libraryModalOpen)
  const activePageUrl = useActivePageUrl()
  const isYTMusic = activePageUrl.includes('music.youtube.com')
  const home = isYTMusic ? 'yt-music' : 'yt'
  const folders = useValue(folders$.folders)
  const bookmarks = useValue(bookmarks$.bookmarks)
  // Deleting a bookmark flags it rather than replacing the array, so the array
  // keeps its identity and a memo keyed on it never recomputes. updatedAt is the
  // store's own change signal -- read it so the list re-filters.
  const bookmarksUpdatedAt = useValue(bookmarks$.updatedAt)

  const [tabIndex, setTabIndex] = useState(0)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  const [moveSheetOpen, setMoveSheetOpen] = useState(false)

  // Sort order and the open folder live in settings, not in this component:
  // closing the sheet used to throw both away, so the library never felt like
  // it was set up the way you left it.
  const sort = useValue(settings$.librarySort) as LibrarySort
  const setSort = (value: LibrarySort) => settings$.librarySort.set(value)
  const currentFolderId = useValue(settings$.libraryFolderId)
  const setCurrentFolder = (folder?: Folder) => settings$.libraryFolderId.set(folder?.id ?? null)

  const tabs = isYTMusic ? tabsYTMusic : tabsYT
  const currentTab = tabs[tabIndex]

  const filteredFolders = useMemo(
    () =>
      sortBy(
        folders.filter((x) => !x.json.deleted && x.json.tab === currentTab.value),
        ['name'],
      ),
    [folders, currentTab.value],
  )

  // Derived from the live folders, so a folder deleted elsewhere just drops the
  // view back to the root instead of showing an empty pane.
  const selectedFolder = filteredFolders.find((x) => x.id === currentFolderId)

  const types = [['podcast', 'shorts', 'watch'], ['channel'], ['playlist']][tabIndex]
  const filteredBookmarks = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const inView = bookmarks.filter((x) => {
      if (x.json.deleted || (selectedFolder ? (x.json.folder || '') !== selectedFolder.id : x.json.folder)) {
        return false
      }
      const pageType = getPageType(x.url)
      return pageType?.home === home && types.includes(pageType?.type) && matches(needle, x.title)
    })
    return sortBookmarks(inView, sort)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookmarks, bookmarksUpdatedAt, home, tabIndex, selectedFolder, query, sort])

  // A search hides folders: folders are a place to look, not a thing to find.
  const searching = query.trim().length > 0
  const visibleItems = useMemo(
    () => [
      ...(searching ? [] : filteredFolders.map((folder) => ({ type: 'folder' as const, folder }))),
      ...filteredBookmarks.map((bookmark) => ({ type: 'bookmark' as const, bookmark })),
    ],
    [searching, filteredFolders, filteredBookmarks],
  )

  useEffect(() => {
    ui$.libraryModalTab.set(currentTab.value)
  }, [currentTab.value])

  // A selection belongs to the list it was made in.
  useEffect(() => {
    setSelected([])
  }, [tabIndex, query, currentFolderId, libraryModalOpen])

  const toggle = useCallback((url: string) => {
    setSelected((current) => (current.includes(url) ? current.filter((x) => x !== url) : [...current, url]))
  }, [])

  // Long-pressing a second row takes everything between it and the first pick.
  // Touch has no shift key, and this is the gesture people already expect.
  const selectRangeTo = useCallback(
    (url: string) => {
      setSelected((current) => {
        const anchor = current[0]
        if (!anchor) return [url]
        const from = filteredBookmarks.findIndex((x) => x.url === anchor)
        const to = filteredBookmarks.findIndex((x) => x.url === url)
        if (from < 0 || to < 0) return current
        const [start, end] = from <= to ? [from, to] : [to, from]
        return filteredBookmarks.slice(start, end + 1).map((x) => x.url)
      })
    },
    [filteredBookmarks],
  )

  const idsFor = useCallback(
    (urls: string[]) => {
      const byUrl = new Map(bookmarks.map((x) => [x.url, x.id]))
      return urls.map((url) => byUrl.get(url)).filter((id): id is string => !!id)
    },
    [bookmarks],
  )

  const removeSelected = () => {
    const ids = idsFor(selected)
    if (!ids.length) return
    ids.forEach((id) => bookmarks$.removeById(id))
    setSelected([])
    showUndoToast(t('library.removedCount', { count: ids.length }), () => bookmarks$.restoreByIds(ids))
  }

  const moveSelected = (folderId?: string) => {
    const ids = idsFor(selected)
    if (!ids.length) return
    // Undo has to know where each one came from: a folder can hold some of them
    // and the root the others.
    const previous = ids.map((id) => ({ id, folder: bookmarks.find((x) => x.id === id)?.json.folder }))
    ids.forEach((id) => bookmarks$.moveToFolder(id, folderId))
    setSelected([])
    setMoveSheetOpen(false)
    showUndoToast(t('library.movedCount', { count: ids.length }), () =>
      previous.forEach((entry) => bookmarks$.moveToFolder(entry.id, entry.folder)),
    )
  }

  const moveItems: Item[] = [
    {
      label: t('folders.none'),
      icon: <MaterialIcons name="folder-off" size={18} color="#71717a" />,
      handler: () => moveSelected(undefined),
    },
    ...filteredFolders.map((folder) => ({
      label: folder.name,
      icon: <MaterialIcons name="folder" size={18} color="#71717a" />,
      handler: () => moveSelected(folder.id),
    })),
  ]

  if (!libraryModalOpen) return null

  const showSearch = filteredFolders.length + filteredBookmarks.length > 0 || searching
  const selecting = selected.length > 0
  const allSelected = filteredBookmarks.length > 0 && filteredBookmarks.every((x) => selected.includes(x.url))
  const toggleAll = () => setSelected(allSelected ? [] : filteredBookmarks.map((x) => x.url))

  const sortIcon = (mode: LibrarySort) => (
    <MaterialIcons
      name={sort === mode ? 'check-circle' : 'radio-button-unchecked'}
      size={18}
      color={sort === mode ? '#0d9488' : '#71717a'}
    />
  )

  const sortItems: Item[] = [
    { label: t(SORT_LABELS.newest), icon: sortIcon('newest'), handler: () => setSort('newest') },
    { label: t(SORT_LABELS.oldest), icon: sortIcon('oldest'), handler: () => setSort('oldest') },
    { label: t(SORT_LABELS.title), icon: sortIcon('title'), handler: () => setSort('title') },
  ]

  return (
    <BaseModal onClose={() => ui$.libraryModalOpen.set(false)} useNativeModal={false}>
      {selecting ? (
        <View className={clsx('mb-4 flex-row items-center gap-1 px-2', isWeb && 'mt-4')}>
          <MaterialButton
            name="close"
            size={20}
            accessibilityRole="button"
            accessibilityLabel={t('buttons.cancel')}
            onPress={() => setSelected([])}
          />
          <NouText className="flex-1 text-sm" numberOfLines={1}>
            {t('library.selected', { count: selected.length })}
          </NouText>
          <MaterialButton
            name={allSelected ? 'deselect' : 'select-all'}
            size={20}
            accessibilityRole="button"
            accessibilityLabel={allSelected ? t('a11y.deselectAll') : t('a11y.selectAll')}
            onPress={toggleAll}
          />
          <MaterialButton
            name="drive-file-move-outline"
            size={20}
            accessibilityRole="button"
            accessibilityLabel={t('menus.moveTo')}
            onPress={() => setMoveSheetOpen(true)}
          />
          <MaterialButton
            name="delete-outline"
            size={20}
            accessibilityRole="button"
            accessibilityLabel={t('menus.remove')}
            onPress={removeSelected}
          />
        </View>
      ) : (
        <View className={clsx('px-2 flex-row justify-between items-center mb-4', isWeb && 'mt-4')}>
          {isWeb ? <NouText /> : null}
          <Segmented
            options={tabs.map((x) => x.label)}
            selectedIndex={tabIndex}
            onChange={(index) => {
              setCurrentFolder(undefined)
              setQuery('')
              setTabIndex(index)
            }}
          />
          <View className="flex-row items-center">
            <NouMenu trigger={<MaterialCommunityButton name="sort-variant" size={20} />} items={sortItems} />
            <MaterialCommunityButton
              name="folder-plus-outline"
              size={20}
              accessibilityRole="button"
              accessibilityLabel={t('library.newFolder', 'New folder')}
              onPress={() => ui$.folderModalFolder.set(newFolder(currentTab.value))}
            />
          </View>
        </View>
      )}
      {selectedFolder !== undefined ? (
        <>
          <View className="flex-row items-center gap-2 mb-2">
            <MaterialButton
              name="arrow-back"
              size={20}
              accessibilityRole="button"
              accessibilityLabel={t('a11y.back')}
              onPress={() => setCurrentFolder(undefined)}
            />
            <NouText className="flex-1">{selectedFolder.name}</NouText>
          </View>
          <FlatList
            data={filteredBookmarks}
            keyExtractor={(item) => item.url}
            renderItem={({ item }) => (
              <BookmarkItem
                bookmark={item}
                selecting={selecting}
                selected={selected.includes(item.url)}
                onToggleSelect={toggle}
                onRangeSelect={() => selectRangeTo(item.url)}
              />
            )}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            ListEmptyComponent={
              <EmptyState
                icon="folder-open"
                title={t('empty.library')}
                hint={t('empty.libraryHint')}
                actionLabel={t('empty.browse')}
                onAction={() => ui$.libraryModalOpen.set(false)}
              />
            }
          />
        </>
      ) : (
        <>
          {showSearch ? <SearchField value={query} onChangeText={setQuery} /> : null}
          <FlatList
            data={visibleItems}
            keyExtractor={(item) => (item.type === 'folder' ? `folder-${item.folder.id}` : `bookmark-${item.bookmark.url}`)}
            renderItem={({ item }) =>
              item.type === 'folder' ? (
                <FolderItem folder={item.folder} onPress={() => setCurrentFolder(item.folder)} />
              ) : (
                <BookmarkItem
                  bookmark={item.bookmark}
                  selecting={selecting}
                  selected={selected.includes(item.bookmark.url)}
                  onToggleSelect={toggle}
                  onRangeSelect={() => selectRangeTo(item.bookmark.url)}
                />
              )
            }
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            keyboardShouldPersistTaps="handled"
            ListEmptyComponent={
              searching ? (
                <EmptyState
                  icon="search-off"
                  title={t('empty.search', { query: query.trim() })}
                  actionLabel={t('empty.clearSearch')}
                  onAction={() => setQuery('')}
                />
              ) : (
                <EmptyState
                  icon="bookmark-border"
                  title={t('empty.library')}
                  hint={t('empty.libraryHint')}
                  actionLabel={t('empty.browse')}
                  onAction={() => ui$.libraryModalOpen.set(false)}
                />
              )
            }
          />
        </>
      )}
      <RowActionSheet
        open={moveSheetOpen}
        onClose={() => setMoveSheetOpen(false)}
        title={t('menus.moveTo')}
        items={moveItems}
      />
    </BaseModal>
  )
}
