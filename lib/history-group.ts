import type { History } from '@/states/history'

export interface HistorySection {
  key: string
  titleKey: string
  data: History[]
}

/* Midnight of `now`, so "Today" means the calendar day and not the last 24h. */
function startOfDay(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
}

/*
 * History arrived as one flat list ordered by recency, which is fine for five
 * entries and unreadable for a hundred — the only way to tell yesterday from
 * last month was to read timestamps that are not shown. Day headers are the
 * cheapest way to make that scannable, and they cost no stored data.
 */
export function groupHistoryByDay(items: History[], now = new Date()): HistorySection[] {
  const today = startOfDay(now)
  const yesterday = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))
  const weekAgo = startOfDay(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6))

  const sections: HistorySection[] = [
    { key: 'today', titleKey: 'history.today', data: [] },
    { key: 'yesterday', titleKey: 'history.yesterday', data: [] },
    { key: 'thisWeek', titleKey: 'history.thisWeek', data: [] },
    { key: 'older', titleKey: 'history.older', data: [] },
  ]

  for (const item of items) {
    // A clock that moved backwards (or a restored backup) can leave entries in
    // the future; they belong at the top, not in a section of their own.
    if (item.updatedAt >= today) sections[0].data.push(item)
    else if (item.updatedAt >= yesterday) sections[1].data.push(item)
    else if (item.updatedAt >= weekAgo) sections[2].data.push(item)
    else sections[3].data.push(item)
  }

  // Empty headers for days with nothing in them are noise.
  return sections.filter((section) => section.data.length > 0)
}
