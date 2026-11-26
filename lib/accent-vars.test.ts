import { describe, expect, it } from 'bun:test'
import { accents, getAccentPalette } from './accent'
import { ACCENT_STYLE_ID, accentStyleSheet, applyAccentVars, radixAccent, radixAccents } from './accent-vars'

const channels = (hex: string) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')

const declaration = (css: string, name: string) => new RegExp(`--nou-${name}:\\s*([^;}]+)`).exec(css)?.[1]?.trim()

describe('accent variables (desktop, extension, web)', () => {
  for (const accent of accents) {
    const palette = getAccentPalette(accent)
    const css = accentStyleSheet(accent)
    const light = css.slice(css.indexOf(':root'), css.indexOf('.dark'))
    const dark = css.slice(css.indexOf('.dark'))

    it(`${accent}: defines every colour family twice, once per scheme`, () => {
      for (const name of Object.keys(palette.light)) {
        expect(declaration(light, name)).toBe(channels(palette.light[name as keyof typeof palette.light]))
        expect(declaration(dark, name)).toBe(channels(palette.dark[name as keyof typeof palette.dark]))
      }
    })

    it(`${accent}: writes rgb channel triples the browser can consume`, () => {
      const values = [...css.matchAll(/--nou-[a-z]+-\d+:\s*([^;}]+)/g)].map((match) => match[1].trim())
      expect(values.length).toBeGreaterThan(0)
      for (const value of values) {
        expect(value).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/)
      }
    })

    it(`${accent}: the two schemes are not the same text`, () => {
      // The dark remap moves the neutrals and keeps the accent family; if the two
      // blocks ever came out identical, the .dark rule would be doing nothing.
      expect(dark.replace('.dark', '')).not.toBe(light.replace(':root', ''))
    })
  }

  it('gives each accent its own sheet', () => {
    const sheets = new Set(accents.map((accent) => accentStyleSheet(accent)))
    expect(sheets.size).toBe(accents.length)
  })

  it('falls back to the default accent for an unknown value', () => {
    expect(accentStyleSheet('nonsense')).toBe(accentStyleSheet('aurora'))
    expect(radixAccent('nonsense')).toBe(radixAccent('aurora'))
  })

  it('maps every accent onto a distinct Radix palette', () => {
    const names = accents.map((accent) => radixAccents[accent])
    expect(new Set(names).size).toBe(accents.length)
    for (const name of names) expect(name).toBeTruthy()
  })

  it('does nothing without a document (native, tests)', () => {
    expect(typeof document).toBe('undefined')
    expect(() => applyAccentVars('crimson')).not.toThrow()
    expect(ACCENT_STYLE_ID).toBe('nou-accent-vars')
  })
})
