import { describe, expect, test } from 'bun:test'
import { groupHistoryByDay } from './history-group'
import type { History } from '@/states/history'

const now = new Date(2026, 10, 26, 15, 0, 0) // Thu 26 Nov 2026, 15:00 local

function entry(id: string, when: Date): History {
  return {
    id,
    videoId: id,
    url: `https://www.youtube.com/watch?v=${id}`,
    title: id,
    duration: 60,
    current: 0,
    updatedAt: when.getTime(),
  }
}

const local = (day: number, hour = 12) => new Date(2026, 10, day, hour, 0, 0)

describe('groupHistoryByDay', () => {
  test('buckets by calendar day, not by rolling 24 hours', () => {
    const sections = groupHistoryByDay(
      [entry('a', local(26, 9)), entry('b', local(25, 23)), entry('c', local(22)), entry('d', local(1))],
      now,
    )
    expect(sections.map((s) => s.key)).toEqual(['today', 'yesterday', 'thisWeek', 'older'])
    expect(sections[0].data.map((x) => x.id)).toEqual(['a'])
    expect(sections[1].data.map((x) => x.id)).toEqual(['b'])
    expect(sections[2].data.map((x) => x.id)).toEqual(['c'])
    expect(sections[3].data.map((x) => x.id)).toEqual(['d'])
  })

  test('drops empty sections instead of rendering bare headers', () => {
    const sections = groupHistoryByDay([entry('a', local(26))], now)
    expect(sections).toHaveLength(1)
    expect(sections[0].key).toBe('today')
  })

  test('keeps entries from a backwards clock in the first section', () => {
    const sections = groupHistoryByDay([entry('future', local(28))], now)
    expect(sections[0].key).toBe('today')
  })

  test('preserves the incoming order inside a bucket', () => {
    const sections = groupHistoryByDay([entry('first', local(26, 14)), entry('second', local(26, 8))], now)
    expect(sections[0].data.map((x) => x.id)).toEqual(['first', 'second'])
  })

  test('returns nothing for an empty history', () => {
    expect(groupHistoryByDay([], now)).toEqual([])
  })
})
