import { describe, expect, test } from 'bun:test'
import { dropIndex } from './queue-drag'

const ROW = 84

describe('dropIndex', () => {
  test('a small wobble stays put', () => {
    expect(dropIndex({ from: 2, dy: 20, count: 10, rowHeight: ROW })).toBe(2)
    expect(dropIndex({ from: 2, dy: -20, count: 10, rowHeight: ROW })).toBe(2)
  })

  test('dragging down past a half row moves one down', () => {
    expect(dropIndex({ from: 2, dy: ROW * 0.6, count: 10, rowHeight: ROW })).toBe(3)
    expect(dropIndex({ from: 2, dy: ROW * 3, count: 10, rowHeight: ROW })).toBe(5)
  })

  test('dragging up moves up', () => {
    expect(dropIndex({ from: 5, dy: -ROW * 2.4, count: 10, rowHeight: ROW })).toBe(3)
  })

  test('autoscroll counts as travel', () => {
    // The finger held still at the bottom edge while the list scrolled three rows.
    expect(dropIndex({ from: 1, dy: 0, scrollTravel: ROW * 3, count: 10, rowHeight: ROW })).toBe(4)
    // …and scrollTravel cancels out a drag that went the other way.
    expect(dropIndex({ from: 4, dy: -ROW * 2, scrollTravel: ROW, count: 10, rowHeight: ROW })).toBe(3)
  })

  test('clamped to the list', () => {
    expect(dropIndex({ from: 1, dy: ROW * 99, count: 10, rowHeight: ROW })).toBe(9)
    expect(dropIndex({ from: 1, dy: -ROW * 99, count: 10, rowHeight: ROW })).toBe(0)
    expect(dropIndex({ from: 0, dy: 0, count: 0, rowHeight: ROW })).toBe(0)
  })
})
