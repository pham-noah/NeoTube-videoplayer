const twColors = require('tailwindcss/colors')
const plugin = require('tailwindcss/plugin')

/*
 * One copy of the theme, shared by all three bundlers: the app (Metro +
 * NativeWind), the Electron renderer and the extension (both Vite). They each
 * had their own `theme.extend`, which is how the desktop renderer and the
 * extension ended up with stock Tailwind colours and no `accent` family at all --
 * no accent and no glass on two of the four platforms.
 *
 * Every family below reads from a CSS variable, and the variables default to the
 * stock Tailwind hex, so a shell that never overrides them looks exactly as it
 * did before. Applying an accent means writing `--nou-*` (lib/accent-vars.ts).
 */

// Families whose hue follows the user's accent. Keep in sync with lib/tw-colors.ts.
const dynamicFamilies = ['zinc', 'gray', 'slate', 'indigo', 'blue', 'sky']

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ')

const dynamicColors = Object.fromEntries(
  dynamicFamilies.map((family) => [
    family,
    Object.fromEntries(
      Object.keys(twColors[family]).map((shade) => [shade, `rgb(var(--nou-${family}-${shade}) / <alpha-value>)`]),
    ),
  ]),
)

const defaultVars = Object.fromEntries(
  dynamicFamilies.flatMap((family) =>
    Object.entries(twColors[family]).map(([shade, hex]) => [`--nou-${family}-${shade}`, channels(hex)]),
  ),
)

const colors = {
  ...dynamicColors,
  // The user's accent. The accent palette (lib/accent.ts) lands in the indigo
  // family, so this is the same scale under a name that says what it is:
  // bg-accent-600, text-accent-300, border-accent-500/40.
  accent: dynamicColors.indigo,
}

// Mirrors glassRadius in lib/glass-tokens.ts.
const borderRadius = {
  card: '24px',
  sheet: '28px',
  bar: '32px',
  chip: '12px',
  field: '14px',
}

// Type scale from the design spec (designs/neotube-ui-refresh/01-tokens.md).
// Weights are applied at the call site (font-semibold / font-medium) because
// NativeWind maps fontSize to RN style and drops the tuple's fontWeight.
const fontSize = {
  display: ['28px', { lineHeight: '34px' }],
  title: ['20px', { lineHeight: '26px' }],
  headline: ['17px', { lineHeight: '22px' }],
  body: ['15px', { lineHeight: '20px' }],
  label: ['13px', { lineHeight: '18px' }],
  caption: ['11px', { lineHeight: '14px', letterSpacing: '0.08em' }],
}

// Spacing roles: 4pt grid, six names. New or touched code uses these instead of
// ad-hoc px-4/py-4/gap-8 values.
const spacing = {
  gutter: '16px',
  sheetPad: '20px',
  rowY: '12px',
  cardPad: '16px',
  labelGap: '8px',
  sectionGap: '28px',
}

// The stock values, so a shell that never writes the variables still renders.
const plugins = [plugin(({ addBase }) => addBase({ ':root': defaultVars }))]

module.exports = { dynamicFamilies, channels, colors, borderRadius, fontSize, spacing, plugins }
