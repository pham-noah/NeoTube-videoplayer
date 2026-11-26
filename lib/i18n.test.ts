import { describe, expect, it } from 'bun:test'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { t } from 'i18next'
import { i18nLanguageNativeNames, supportedI18nLanguages, toBcp47Locale } from './i18n'
import './i18n'

const repoRoot = join(import.meta.dir, '..')
const localesDir = join(repoRoot, 'locales')

const readLocale = (locale: string): Record<string, unknown> =>
  JSON.parse(readFileSync(join(localesDir, `${locale}.json`), 'utf8'))

const flatten = (value: unknown, prefix = '', out: Record<string, string> = {}) => {
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    const path = prefix ? `${prefix}.${key}` : key
    if (child && typeof child === 'object' && !Array.isArray(child)) flatten(child, path, out)
    else out[path] = String(child)
  }
  return out
}

const localeFiles = readdirSync(localesDir)
  .filter((name) => name.endsWith('.json'))
  .map((name) => name.replace(/\.json$/, ''))
  .sort()

/*
 * The strings this fork added on top of upstream. They are the ones that make
 * NeoTube NeoTube (the accent picker, the glass switch, the fork's About block),
 * so a new one landing in en.json alone is how the app ends up English-only in
 * every other language -- which is what it was before this list existed.
 */
const forkKeys = [
  'settings.accent.label',
  'settings.accent.hint',
  'settings.accent.aurora',
  'settings.accent.crimson',
  'settings.accent.purple',
  'settings.accent.cappuccino',
  'settings.glass.label',
  'settings.glass.hint',
  'settings.reduceEffects.label',
  'settings.reduceEffects.hint',
  'settings.feedPosts',
  'settings.feedPostsDescription',
  'feeds.communityPost',
  'about.upstream',
  'about.license',
  'about.licenseHint',
  'about.supportUpstream',
  'a11y.library',
  'a11y.back',
  'a11y.forward',
  'a11y.home',
  'a11y.more',
  'a11y.rowActions',
  'error.title',
  'error.body',
  'error.copy',
  'error.copied',
  'error.retry',
  'error.reload',
  'empty.library',
  'empty.libraryHint',
  'empty.history',
  'empty.historyHint',
  'empty.queue',
  'empty.queueHint',
  'empty.search',
  'search.placeholder',
  'settings.searchPlaceholder',
  'settings.searchEmpty',
  'settings.searchHint',
  'modals.clearQueueConfirm',
  'modals.clearQueueBody',
  'history.removed',
  'queue.removed',
  'queue.cleared',
  'menus.moveUp',
  'menus.moveDown',
  'menus.playNext',
  'library.newFolder',
]

describe('i18n', () => {
  it('does not HTML-escape interpolated user content', () => {
    expect(t('bookmarks.moved', { lng: 'en', folder: "Dad's & Rock" })).toBe("Moved to Dad's & Rock")
  })

  it('translates every string this fork added, in every locale it ships', () => {
    const missing: string[] = []
    for (const locale of localeFiles) {
      const strings = flatten(readLocale(locale))
      for (const key of forkKeys) {
        if (!strings[key]?.trim()) missing.push(`${locale}: ${key}`)
      }
    }
    expect(missing).toEqual([])
  })

  it('offers no language it has no strings for', () => {
    // locales/ja.json shipped as {} for its whole history while `ja` was listed
    // as supported, so the picker offered a language that read as English.
    const emptyOrAbsent = supportedI18nLanguages.filter((language) => {
      if (!localeFiles.includes(language)) return true
      return Object.keys(flatten(readLocale(language))).length === 0
    })
    expect(emptyOrAbsent).toEqual([])
  })

  it('names every language it offers', () => {
    for (const language of supportedI18nLanguages) {
      expect(i18nLanguageNativeNames[language]?.trim()).toBeTruthy()
    }
  })

  it('keeps the OS-level locale list and the app-level one in step', () => {
    // app.config.ts is read as text: it is loaded by Expo's config loader, not by
    // the app, so importing it here would drag a second copy of that machinery in.
    const config = readFileSync(join(repoRoot, 'app.config.ts'), 'utf8')
    const declared = /supportedLocales:\s*\[([^\]]*)\]/.exec(config)?.[1]
    expect(declared).toBeTruthy()
    const osLocales = (declared ?? '')
      .split(',')
      .map((entry) => entry.trim().replace(/^['"]|['"]$/g, ''))
      .filter(Boolean)
      .map((tag) => tag.replace('-', '_'))
      .sort()
    expect(osLocales).toEqual([...supportedI18nLanguages].sort())
  })

  it('has a BCP-47 tag for every language it offers', () => {
    for (const language of supportedI18nLanguages) {
      expect(toBcp47Locale(language)).toMatch(/^[a-z]{2}(-[A-Za-z]{2,4})?$/)
    }
  })
})

