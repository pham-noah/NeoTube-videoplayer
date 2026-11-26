import { describe, expect, test } from 'bun:test'
import { sortBookmarks } from './library-sort'
import type { Bookmark } from '@/states/bookmarks'

function bookmark(title: string, iso: string): Bookmark {
  return {
    id: title,
    url: `https://www.youtube.com/watch?v=${title}`,
    title,
    created_at: new Date(iso) as unknown as Date,
    updated_at: new Date(iso) as unknown as Date,
    json: {},
  }
}

const items = [
  bookmark('Banana', '2026-11-20T10:00:00Z'),
  bookmark('apple', '2026-11-22T10:00:00Z'),
  bookmark('Cherry', '2026-11-21T10:00:00Z'),
]

describe('sortBookmarks', () => {
  test('newest first', () => {
    expect(sortBookmarks(items, 'newest').map((x) => x.title)).toEqual(['apple', 'Cherry', 'Banana'])
  })

  test('oldest first', () => {
    expect(sortBookmarks(items, 'oldest').map((x) => x.title)).toEqual(['Banana', 'Cherry', 'apple'])
  })

  test('title ignores case and does not mutate the input', () => {
    const before = items.map((x) => x.title)
    expect(sortBookmarks(items, 'title').map((x) => x.title)).toEqual(['apple', 'Banana', 'Cherry'])
    expect(items.map((x) => x.title)).toEqual(before)
  })

  test('a bookmark with no timestamp sorts last instead of producing NaN', () => {
    const broken = { ...bookmark('Broken', '2026-11-23T10:00:00Z'), created_at: 'not a date' as unknown as Date }
    expect(sortBookmarks([broken, ...items], 'oldest')[0].title).toBe('Broken')
    expect(sortBookmarks([broken, ...items], 'newest').at(-1)?.title).toBe('Broken')
  })
})
