import { describe, expect, it } from 'bun:test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { searchSettings, settingsIndex } from './settings-index'

const en = JSON.parse(readFileSync(join(import.meta.dir, '..', 'locales', 'en.json'), 'utf8'))

const lookup = (key: string) => {
  const value = key.split('.').reduce<any>((node, part) => (node == null ? undefined : node[part]), en)
  return typeof value === 'string' ? value : ''
}

describe('settings index', () => {
  it('only points at labels that exist', () => {
    const missing = settingsIndex.filter((entry) => !lookup(entry.labelKey)).map((entry) => entry.labelKey)
    expect(missing).toEqual([])
  })

  it('only points at sections that exist', () => {
    const missing = settingsIndex
      .filter((entry) => entry.sectionKey && !lookup(entry.sectionKey))
      .map((entry) => entry.sectionKey!)
    expect(missing).toEqual([])
  })

  it('finds a row by a word in its label', () => {
    const hits = searchSettings('glass', lookup)
    expect(hits.length).toBeGreaterThan(0)
    expect(hits[0].page).toBe('appearance')
  })

  it('finds a row by a keyword its label never uses', () => {
    expect(searchSettings('dark', lookup).some((hit) => hit.labelKey === 'settings.theme.label')).toBe(true)
    expect(searchSettings('pip', lookup).some((hit) => hit.labelKey === 'settings.pictureInPicture')).toBe(true)
  })

  it('ignores case and accents', () => {
    expect(searchSettings('THEME', lookup)[0]?.labelKey).toBe('settings.theme.label')
    expect(searchSettings('youtube', lookup).length).toBeGreaterThan(0)
  })

  it('returns nothing for an empty query', () => {
    expect(searchSettings('   ', lookup)).toEqual([])
  })
})
