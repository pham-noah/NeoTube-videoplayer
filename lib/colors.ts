import type { TwColor } from './tw-colors'

// Resolve with tw() from useTwColor so they follow the dynamic palette.
export const colors = {
  text: 'slate-100',
  bg: 'zinc-800',
  icon: 'slate-100',
  underlay: 'gray-600',
  iconLight: 'slate-700',
  iconLightStrong: 'slate-900',
  iconMutedLight: 'slate-600',
  iconMutedDark: 'zinc-300',
  iconSubtle: 'zinc-500',
} satisfies Record<string, TwColor>

// Text and icons that sit on a solid accent fill.
export const onAccent = '#ffffff'

// Status colours. Deliberately NOT part of the dynamic families: red and green
// must keep their meaning whatever accent is picked. Same Tailwind scale the
// rest of the app uses, resolved per scheme because red-500 goes muddy on the
// dark surfaces and green-600 is too dark to read there.
export const status = {
  danger: { light: '#dc2626', dark: '#f87171' }, // red-600 / red-400
  success: { light: '#16a34a', dark: '#86efac' }, // green-600 / green-300
} as const

export const statusColor = (role: keyof typeof status, isDark: boolean) => status[role][isDark ? 'dark' : 'light']

// The accent-carrying Tailwind family. Anything that should follow the user's
// accent uses indigo-* (see getAccentPalette); never a literal orange.
export const accentFamily = 'indigo' as const

// ---------------------------------------------------------------------------
// Chrome tokens (designs/neotube-ui-refresh/01-tokens.md §1.2). Everything that
// draws NeoTube's own surface over a page it does not control reads from here,
// so the measured contrast is decided once instead of per component.
// ---------------------------------------------------------------------------

// The toolbar is the one surface that always sits over an unknown page, so it
// gets its own opaque-enough material. At a sheet's alpha, white icons land on
// a mid grey over a light page (~3.4:1); at 0.85 they read at ~10:1.
export const barCls =
  'rounded-bar border border-black/[0.06] bg-zinc-100/85 dark:border-white/10 dark:bg-zinc-950/85'

// Hairline. `border-b-2` on a dark surface reads as a gap between cards, not as
// the seam inside one.
export const dividerCls = 'border-b border-black/[0.06] dark:border-white/[0.08]'

// Scrim follows the scheme, not the page: 50% grey over a white page is no
// scrim at all. Used behind drawers and sheets.
export const scrim = {
  dark: 'rgba(3, 6, 16, 0.62)',
  light: 'rgba(15, 23, 42, 0.28)',
} as const

// Text roles. One neutral family per side -- mixing zinc and gray in one element
// makes the accent remap produce a different hue on each side -- and the dark
// secondary/tertiary lifted a step so they clear 4.5:1 on a card.
export const text = {
  primary: 'text-zinc-900 dark:text-zinc-100',
  secondary: 'text-zinc-600 dark:text-zinc-400',
  tertiary: 'text-zinc-500 dark:text-zinc-400',
  onAccent: 'text-white',
} as const

// Settings cards and list groups: translucent, so they read as glass resting on
// the sheet behind them. No blur (there can be many on one screen). One copy
// here replaces the per-file 'overflow-hidden rounded-[24px] bg-white
// dark:bg-zinc-900' constants. rounded-card is 24px (see tailwind.config.js).
export const surfaceCls =
  'overflow-hidden rounded-card border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/[0.07]'
