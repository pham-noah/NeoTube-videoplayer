import { describe, expect, it } from 'bun:test'
import { accentColors, accents, getAccentPalette, normalizeAccent } from './accent'

const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}
const contrast = (a: string, b: string) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('accent palettes', () => {
  for (const accent of accents) {
    const palette = getAccentPalette(accent)

    it(`${accent}: white text on solid accent fills is readable`, () => {
      expect(contrast('#ffffff', palette.light['indigo-600'])).toBeGreaterThanOrEqual(4.5)
      expect(contrast('#ffffff', palette.light['indigo-700'])).toBeGreaterThanOrEqual(4.5)
    })

    it(`${accent}: accent text on dark surfaces is readable`, () => {
      expect(contrast(palette.dark['indigo-300'], '#0e111c')).toBeGreaterThanOrEqual(4.5)
      expect(contrast(palette.dark['indigo-400'], '#0e111c')).toBeGreaterThanOrEqual(4.5)
    })

    it(`${accent}: body text on the dark neutrals is readable`, () => {
      expect(contrast(palette.dark['slate-100'], palette.dark['zinc-900'])).toBeGreaterThanOrEqual(7)
    })
  }

  it('gives each accent a different palette', () => {
    const fills = new Set(accents.map((a) => getAccentPalette(a).light['indigo-600']))
    expect(fills.size).toBe(accents.length)
  })

  it('falls back to aurora for unknown values', () => {
    expect(normalizeAccent('orange')).toBe('aurora')
    expect(normalizeAccent(undefined)).toBe('aurora')
    expect(normalizeAccent('crimson')).toBe('crimson')
    expect(Object.keys(accentColors)).toEqual([...accents])
  })
})
