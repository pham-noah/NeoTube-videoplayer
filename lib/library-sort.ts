import type { Bookmark } from '@/states/bookmarks'

export type LibrarySort = 'newest' | 'oldest' | 'title'

const when = (bookmark: Bookmark) => {
  // MMKV round-trips a Date as a string, so never trust the declared type here.
  const time = new Date(bookmark.created_at as unknown as string | number).getTime()
  return Number.isNaN(time) ? 0 : time
}

/*
 * The Library only ever showed one order: whatever the store happened to hold.
 * Folders sort by name, so a folder sitting above a list sorted by title looked
 * like a sorting bug — sort the two separately and the tabs stay coherent.
 */
export function sortBookmarks(items: Bookmark[], sort: LibrarySort): Bookmark[] {
  if (sort === 'newest' && isDescending(items)) return items

  const copy = [...items]
  if (sort === 'title') {
    return copy.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', undefined, { sensitivity: 'base', numeric: true }))
  }
  copy.sort((a, b) => when(a) - when(b))
  return sort === 'newest' ? copy.reverse() : copy
}

function isDescending(items: Bookmark[]) {
  for (let i = 1; i < items.length; i++) {
    if (when(items[i - 1]) < when(items[i])) return false
  }
  return true
}
