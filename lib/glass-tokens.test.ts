import { describe, expect, it } from 'bun:test'
import { accentColors, accents } from './accent'
import { getGlassTokens, mixOver, toRgba } from './glass-tokens'

const parse = (rgba: string) => rgba.match(/[\d.]+/g)!.map(Number)
const luminance = ([r, g, b]: number[]) => {
  const [lr, lg, lb] = [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
  return 0.2126 * lr + 0.7152 * lg + 0.0722 * lb
}
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

describe('mixOver', () => {
  it('returns the base when the overlay is fully transparent', () => {
    expect(mixOver([10, 20, 30, 0.5], '#ff0000', 0)).toEqual([10, 20, 30, 0.5])
  })
  it('lands halfway between two opaque colors at 50%', () => {
    expect(mixOver([0, 0, 0, 1], '#ffffff', 0.5)).toEqual([128, 128, 128, 1])
  })
  it('adds opacity when laid over a translucent base', () => {
    const [, , , a] = mixOver([0, 0, 0, 0.5], '#ffffff', 0.5)
    expect(a).toBe(0.75)
  })
  it('formats as a CSS color', () => {
    expect(toRgba([1, 2, 3, 0.5])).toBe('rgba(1,2,3,0.5)')
  })
})

describe('glass tokens', () => {
  for (const accent of accents) {
    for (const scheme of ['light', 'dark'] as const) {
      const tokens = getGlassTokens(scheme, accentColors[accent])

      it(`${accent}/${scheme}: fill stays translucent, the opaque fallback does not`, () => {
        expect(parse(tokens.fill)[3]).toBeLessThan(1)
        expect(parse(tokens.solid)[3]).toBe(1)
      })

      it(`${accent}/${scheme}: text is readable on the opaque fallback`, () => {
        const text = scheme === 'dark' ? [241, 245, 249] : [15, 23, 42]
        expect(contrast(text, parse(tokens.solid).slice(0, 3))).toBeGreaterThanOrEqual(7)
      })
    }
  }

  it('tints the glass differently per accent', () => {
    const fills = new Set(accents.map((a) => getGlassTokens('dark', accentColors[a]).fill))
    expect(fills.size).toBe(accents.length)
  })

  it('hands every surface the same object, so a render allocates nothing', () => {
    const first = getGlassTokens('dark', accentColors.aurora)
    expect(getGlassTokens('dark', accentColors.aurora)).toBe(first)
    // Still one object per (scheme, accent), not one for all of them.
    expect(getGlassTokens('light', accentColors.aurora)).not.toBe(first)
    expect(getGlassTokens('dark', accentColors.crimson)).not.toBe(first)
  })

  describe('frost, the material where blur is unavailable', () => {
    for (const scheme of ['light', 'dark'] as const) {
      const tokens = getGlassTokens(scheme, accentColors.aurora)

      it(`${scheme}: carries more body than the blurred fill, without going opaque`, () => {
        const blurred = parse(tokens.fill)[3]
        const frost = parse(tokens.frost.fill)[3]
        expect(frost).toBeGreaterThan(blurred + 0.2)
        expect(frost).toBeLessThan(1)
      })

      it(`${scheme}: the opaque fallback is still the only fully opaque fill`, () => {
        expect(parse(tokens.solid)[3]).toBe(1)
        expect(parse(tokens.frost.fill)[3]).toBeLessThan(1)
      })
    }

    it('still reads as the user accent', () => {
      const fills = new Set(accents.map((a) => getGlassTokens('dark', accentColors[a]).frost.fill))
      expect(fills.size).toBe(accents.length)
    })

    it('gives the header bar less body than a sheet, but more than the blurred fill', () => {
      for (const scheme of ['light', 'dark'] as const) {
        const tokens = getGlassTokens(scheme, accentColors.aurora)
        const [blurred, bar, sheet] = [tokens.fill, tokens.frostBar.fill, tokens.frost.fill].map((c) => parse(c)[3])
        expect(bar).toBeGreaterThan(blurred)
        expect(bar).toBeLessThan(sheet)
      }
    })
  })
})
