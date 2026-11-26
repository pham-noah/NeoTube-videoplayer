import type { ThemeProps } from '@radix-ui/themes'
import { getAccentPalette, normalizeAccent, type Accent } from './accent'
import type { DynamicPalette } from './tw-colors'

/*
 * The accent, on the platforms that are a browser.
 *
 * Native gets its palette through NativeWind (lib/dynamic-palette.ts ->
 * applyPalette, called from app/_layout.tsx). The Electron renderer, the
 * extension and the app's own web build are DOM documents: their Tailwind CSS is
 * compiled ahead of time by Vite, so the colours are `rgb(var(--nou-*)` and the
 * only thing that has to happen at runtime is writing those variables. That is
 * what this module does, from the same getAccentPalette() the native path uses --
 * one palette definition, three shells.
 */

/**
 * Radix Themes names its palettes, and `<Theme accentColor>` only accepts those
 * names. Each accent maps to the preset nearest its seed (the hex in brackets is
 * Radix's step 9), so anything Radix draws itself follows the same colour the
 * app's own surfaces do:
 *
 *   aurora #4f9dff -> blue   #0090ff
 *   crimson #e0314b -> ruby  #e54666   (crimson's own preset is pinker)
 *   purple #8b5cf6 -> violet #6e56cf
 *   cappuccino #a67c5b -> brown #ad7f58
 */
export const radixAccents: Record<Accent, NonNullable<ThemeProps['accentColor']>> = {
  aurora: 'blue',
  crimson: 'ruby',
  purple: 'violet',
  cappuccino: 'brown',
}

export const radixAccent = (accent: unknown): NonNullable<ThemeProps['accentColor']> => radixAccents[normalizeAccent(accent)]

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')

const declarations = (palette: Record<string, string>) =>
  Object.entries(palette)
    .map(([name, hex]) => `--nou-${name}: ${channels(hex)};`)
    .join('')

/**
 * The `--nou-*` variables for one accent, for both schemes.
 *
 * Both blocks are emitted rather than just the current one: `:root` is the light
 * scheme and `.dark` is the class the shells toggle on <html>, so flipping the
 * theme re-tints without this being re-run (and `.dark` comes second because the
 * two selectors have the same specificity and the later rule wins).
 */
export const accentStyleSheet = (accent: unknown): string => {
  const palette: DynamicPalette = getAccentPalette(normalizeAccent(accent))
  return `:root{${declarations(palette.light)}}\n.dark{${declarations(palette.dark)}}`
}

export const ACCENT_STYLE_ID = 'nou-accent-vars'

/**
 * Writes (or updates) the accent variables into the document. Safe to call from
 * code that also runs on native: with no document it does nothing.
 */
export const applyAccentVars = (accent: unknown): void => {
  if (typeof document === 'undefined') return
  const css = accentStyleSheet(accent)
  let style = document.getElementById(ACCENT_STYLE_ID) as HTMLStyleElement | null
  if (!style) {
    style = document.createElement('style')
    style.id = ACCENT_STYLE_ID
    document.head.appendChild(style)
  }
  // Cheap idempotence: re-writing the same text on every render would make the
  // browser re-parse the rule and invalidate every colour on the page.
  if (style.textContent !== css) style.textContent = css
}
