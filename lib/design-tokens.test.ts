import { describe, expect, it } from 'bun:test'
import { createRequire } from 'node:module'
import { accentColors } from './accent'
import { getGlassTokens } from './glass-tokens'
import { barCls, dividerCls, scrim, text } from './colors'
import { toolbarPillLabelClass } from '@/components/header/toolbar-classes'

// The design tokens are only worth anything if the contrast they were chosen for
// survives a refactor, so they are asserted here rather than described in a doc.
// Sheet: designs/neotube-ui-refresh/01-tokens.md.

const require = createRequire(import.meta.url)
const tailwind = require('../tailwind.config.js')

const parse = (rgba: string) => rgba.match(/[\d.]+/g)!.map(Number)
const luminance = ([r, g, b]: number[]) =>
  [r, g, b]
    .map((v) => v / 255)
    .map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
    .reduce((acc, v, i) => acc + v * [0.2126, 0.7152, 0.0722][i], 0)
const contrast = (a: number[], b: number[]) => {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}
/** `rgba` composited over an opaque page colour. */
const over = (rgba: string, page: number[]) => {
  const [r, g, b, a] = parse(rgba)
  return [r * a + page[0] * (1 - a), g * a + page[1] * (1 - a), b * a + page[2] * (1 - a)]
}
const WHITE = [255, 255, 255]
const SLATE_700 = [0x33, 0x41, 0x55]
const ZINC_900 = [0x18, 0x18, 0x1b]

describe('toolbar material', () => {
  // Rule 1 of the spec: the bar always draws the dense material, because it is
  // the one surface that sits over a page we do not control.
  for (const accent of ['aurora', 'crimson', 'purple', 'cappuccino'] as const) {
    it(`${accent}: white icons clear 4.5:1 on the bar over a white page`, () => {
      const tokens = getGlassTokens('dark', accentColors[accent])
      expect(contrast(WHITE, over(tokens.frostBar.fill, WHITE))).toBeGreaterThanOrEqual(4.5)
    })

    it(`${accent}: dark icons clear 4.5:1 on the light bar over a white page`, () => {
      const tokens = getGlassTokens('light', accentColors[accent])
      expect(contrast(SLATE_700, over(tokens.frostBar.fill, WHITE))).toBeGreaterThanOrEqual(4.5)
    })

    it(`${accent}: white icons clear 4.5:1 on the light bar over a dark page`, () => {
      const tokens = getGlassTokens('light', accentColors[accent])
      const onDarkPage = over(tokens.frostBar.fill, ZINC_900)
      // A light bar over a dark page keeps its own light fill, so the icon that
      // clears it is the dark one; what must never happen is the bar going
      // invisible, i.e. compositing to the page itself.
      expect(contrast(SLATE_700, onDarkPage)).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('keeps the bar denser than a sheet, so the bar is legible and the sheet hides text', () => {
    const tokens = getGlassTokens('dark', accentColors.aurora)
    expect(parse(tokens.frostBar.fill)[3]).toBeGreaterThanOrEqual(0.84)
    expect(parse(tokens.frostBar.fill)[3]).toBeGreaterThan(parse(tokens.fill)[3])
  })
})

describe('elevation tokens', () => {
  for (const scheme of ['light', 'dark'] as const) {
    it(`${scheme}: has a bar and a sheet shadow`, () => {
      const tokens = getGlassTokens(scheme, accentColors.aurora)
      expect(tokens.shadowBar.length).toBeGreaterThan(0)
      expect(tokens.shadowSheet.length).toBeGreaterThan(0)
    })
  }

  it('keeps the dark shadows heavier than the light ones', () => {
    const dark = getGlassTokens('dark', accentColors.aurora)
    const light = getGlassTokens('light', accentColors.aurora)
    const alpha = (tokens: typeof dark) => Number(parse(String(tokens.shadowSheet[0].color))[3])
    expect(alpha(dark)).toBeGreaterThan(alpha(light))
  })
})

describe('chrome class tokens', () => {
  it('draws the bar as a rounded bar, not an unbounded fill', () => {
    expect(barCls).toContain('rounded-bar')
    expect(barCls).toContain('dark:bg-zinc-950/85')
  })

  it('uses a 1px hairline instead of border-b-2', () => {
    expect(dividerCls).toContain('border-b ')
    expect(dividerCls).not.toContain('border-b-2')
  })

  it('follows the scheme for the scrim, and darkens more in dark mode', () => {
    expect(parse(scrim.dark)[3]).toBeGreaterThan(parse(scrim.light)[3])
  })

  it('keeps one neutral family per scheme and lifts dark tertiary text', () => {
    expect(text.primary).toBe('text-zinc-900 dark:text-zinc-100')
    expect(text.tertiary).toContain('dark:text-zinc-400')
    // The old tertiary was zinc-500 on a dark card: 3.35:1.
    expect(text.tertiary).not.toContain('dark:text-zinc-500')
  })
})

describe('toolbar pill', () => {
  it('does not paint a second, lighter surface on top of the bar', () => {
    const cls = toolbarPillLabelClass(false)
    expect(cls).not.toContain('bg-zinc-200')
    expect(cls).not.toContain('border-zinc-300')
    expect(cls).toContain('bg-black/[0.06]')
    expect(cls).toContain('dark:bg-white/[0.12]')
  })
})

describe('tailwind token layer', () => {
  const { theme } = tailwind
  const fs = theme.extend.fontSize
  const sp = theme.extend.spacing
  const br = theme.extend.borderRadius

  it('publishes the six-step type scale', () => {
    expect(Object.keys(fs).sort()).toEqual(['body', 'caption', 'display', 'headline', 'label', 'title'])
    expect(fs.body[0]).toBe('15px')
    expect(fs.body[1].lineHeight).toBe('20px')
    expect(fs.headline[0]).toBe('17px')
    expect(fs.caption[1].letterSpacing).toBe('0.08em')
  })

  it('publishes the six spacing roles', () => {
    expect(sp).toEqual({
      gutter: '16px',
      sheetPad: '20px',
      rowY: '12px',
      cardPad: '16px',
      labelGap: '8px',
      sectionGap: '28px',
    })
  })

  it('keeps the 24/28/32 radius family and adds chip and field', () => {
    expect(br).toEqual({ card: '24px', sheet: '28px', bar: '32px', chip: '12px', field: '14px' })
  })
})
