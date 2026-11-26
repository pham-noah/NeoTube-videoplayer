import { observable } from '@legendapp/state'
import { syncObservable } from '@legendapp/state/sync'
import { ObservablePersistMMKV } from '@legendapp/state/persist-plugins/mmkv'
import { Bookmark } from './bookmarks'

interface Store {
  bookmarks: Bookmark[]
  /** Url of the queue video that was played most recently. */
  lastPlayedUrl: string
  /** Whether that video played to the end, so the queue should resume after it. */
  lastPlayedEnded: boolean
  urls: () => Set<string>
  size: () => number
  toggleBookmark: (bookmark: Bookmark) => void
  addBookmark: (bookmark: Bookmark) => void
  moveUp: (index: number) => void
  moveDown: (index: number) => void
  /** Drag-and-drop lands anywhere, not one row at a time. */
  move: (from: number, to: number) => void
  markPlaying: (url: string) => void
  markEnded: (url: string) => void
}

export const queue$ = observable<Store>({
  bookmarks: [],
  lastPlayedUrl: '',
  lastPlayedEnded: false,
  urls: (): Set<string> => {
    return new Set(queue$.bookmarks.get().map((x) => x.url))
  },
  size: (): number => {
    return queue$.urls().size
  },
  toggleBookmark: (bookmark) => {
    if (queue$.urls().has(bookmark.url)) {
      const filtered = queue$.bookmarks.get().filter((x) => x.url != bookmark.url)
      queue$.bookmarks.set(filtered)
    } else {
      queue$.bookmarks.unshift(bookmark)
    }
  },
  addBookmark: (bookmark) => {
    if (!queue$.urls().has(bookmark.url)) {
      queue$.bookmarks.push(bookmark)
    }
  },
  markPlaying: (url) => {
    if (!url) return
    queue$.lastPlayedUrl.set(url)
    queue$.lastPlayedEnded.set(false)
  },
  markEnded: (url) => {
    if (!url) return
    queue$.lastPlayedUrl.set(url)
    queue$.lastPlayedEnded.set(true)
  },
  moveUp: (index) => {
    const bookmarks = [...queue$.bookmarks.get()]
    if (index <= 0 || index >= bookmarks.length) return
    const temp = bookmarks[index]
    bookmarks[index] = bookmarks[index - 1]
    bookmarks[index - 1] = temp
    queue$.bookmarks.set(bookmarks)
  },
  move: (from, to) => {
    const bookmarks = [...queue$.bookmarks.get()]
    if (from === to || from < 0 || to < 0 || from >= bookmarks.length || to >= bookmarks.length) return
    const [moved] = bookmarks.splice(from, 1)
    bookmarks.splice(to, 0, moved)
    queue$.bookmarks.set(bookmarks)
  },
  moveDown: (index) => {
    const bookmarks = [...queue$.bookmarks.get()]
    if (index < 0 || index >= bookmarks.length - 1) return
    const temp = bookmarks[index]
    bookmarks[index] = bookmarks[index + 1]
    bookmarks[index + 1] = temp
    queue$.bookmarks.set(bookmarks)
  },
})

syncObservable(queue$, {
  persist: {
    name: 'queue',
    plugin: ObservablePersistMMKV,
  },
})
