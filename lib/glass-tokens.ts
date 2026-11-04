import { type ViewStyle } from 'react-native'

// One source of truth for the native glass material. The YouTube side
// (lib/glass-css.ts) uses the same recipe in CSS: translucent fill, a faint top
// gloss, an inset rim, accent wash. Change the look here and there together.

export type Scheme = 'light' | 'dark'
export type RGBA = [number, number, number, number]
type Shadow = Exclude<NonNullable<ViewStyle['boxShadow']>, string>

// Corner radii shared by Tailwind (rounded-card / rounded-sheet / rounded-bar)
// and the components below.
export const glassRadius = { card: 24, sheet: 28, bar: 32 } as const

const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

export const toRgba = ([r, g, b, a]: RGBA) => `rgba(${r},${g},${b},${a})`

/** `hex` at `alpha`, laid over `base` (which may itself be translucent). */
export const mixOver = (base: RGBA, hex: string, alpha: number): RGBA => {
  const [r, g, b] = hexToRgb(hex)
  const a = alpha + base[3] * (1 - alpha)
  const channel = (top: number, bottom: number) => Math.round((top * alpha + bottom * base[3] * (1 - alpha)) / a)
  return [channel(r, base[0]), channel(g, base[1]), channel(b, base[2]), Math.round(a * 1000) / 1000]
}

/** Pure in (scheme, accent) and there are only eight combinations, so every
 *  surface can share one object each instead of rebuilding the gradients and
 *  shadow arrays on each of its renders. */
const tokenCache = new Map<string, ReturnType<typeof buildGlassTokens>>()

export const getGlassTokens = (scheme: Scheme, accent: string) => {
  const key = `${scheme}:${accent}`
  let tokens = tokenCache.get(key)
  if (!tokens) {
    tokens = buildGlassTokens(scheme, accent)
    tokenCache.set(key, tokens)
  }
  return tokens
}

const buildGlassTokens = (scheme: Scheme, accent: string) => {
  const dark = scheme === 'dark'
  const base: RGBA = dark ? [14, 17, 28, 0.5] : [255, 255, 255, 0.55]
  const rim: Shadow = [
    // Light catching the top edge, then a hairline all the way round.
    {
      inset: true,
      offsetX: 0,
      offsetY: 1,
      blurRadius: 0,
      color: dark ? 'rgba(255,255,255,0.34)' : 'rgba(255,255,255,0.95)',
    },
    {
      inset: true,
      offsetX: 0,
      offsetY: 0,
      blurRadius: 0,
      spreadDistance: 1,
      color: dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.08)',
    },
  ]
  return {
    /** Fill of a blurred surface: neutral glass with the accent washed in. */
    fill: toRgba(mixOver(base, accent, dark ? 0.12 : 0.08)),
    /** The same surface when transparency is off: opaque, still accent-tinted. */
    solid: toRgba(mixOver(dark ? [21, 24, 38, 1] : [244, 246, 251, 1], accent, dark ? 0.22 : 0.1)),
    gloss: dark
      ? 'linear-gradient(180deg, rgba(255,255,255,0.14), rgba(255,255,255,0) 55%)'
      : 'linear-gradient(180deg, rgba(255,255,255,0.7), rgba(255,255,255,0) 55%)',
    rim,
    blurTint: dark ? ('dark' as const) : ('light' as const),
    /**
     * The material for platforms with no blur (Android -- see GlassSurface): the
     * fill has to do the job a blur does on iOS. At the blurred alpha the page
     * behind a sheet reads straight through it -- body text stays legible
     * through the panel, which looks broken rather than frosted. More body, a
     * slightly wider gloss band and a brighter top edge keep it a layer instead
     * of a solid panel: still translucent, no page text readable through it.
     */
    frost: {
      // Same body in both schemes: page text behind a sheet is light-on-dark in
      // one and dark-on-light in the other, and both need the same suppression.
      fill: toRgba(mixOver([base[0], base[1], base[2], 0.95], accent, dark ? 0.1 : 0.07)),
      gloss: dark
        ? 'linear-gradient(180deg, rgba(255,255,255,0.1), rgba(255,255,255,0) 42%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.5), rgba(255,255,255,0) 42%)',
      rim: [
        {
          inset: true,
          offsetX: 0,
          offsetY: 1,
          blurRadius: 0,
          color: dark ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.95)',
        },
        {
          inset: true,
          offsetX: 0,
          offsetY: 0,
          blurRadius: 0,
          spreadDistance: 1,
          color: dark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
        },
      ] as Shadow,
    },
    /**
     * The same recipe for the floating header bar. A bar only has to make its own
     * icons readable and it hugs the screen edge, so it keeps more of the page
     * showing through than a sheet, which has to hide the text behind it.
     */
    frostBar: {
      fill: toRgba(mixOver([base[0], base[1], base[2], 0.84], accent, dark ? 0.1 : 0.07)),
      gloss: dark
        ? 'linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0) 60%)'
        : 'linear-gradient(180deg, rgba(255,255,255,0.6), rgba(255,255,255,0) 60%)',
      rim,
    },
    /** Cards that sit on a glass sheet: flat, no blur (there can be many). */
    card: {
      fill: dark ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.6)',
      rim: [
        {
          inset: true,
          offsetX: 0,
          offsetY: 0,
          blurRadius: 0,
          spreadDistance: 1,
          color: dark ? 'rgba(255,255,255,0.1)' : 'rgba(15,23,42,0.06)',
        },
      ] as Shadow,
    },
  }
}
