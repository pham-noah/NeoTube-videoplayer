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

// Settings cards and list groups: translucent, so they read as glass resting on
// the sheet behind them. No blur (there can be many on one screen). One copy
// here replaces the per-file 'overflow-hidden rounded-[24px] bg-white
// dark:bg-zinc-900' constants. rounded-card is 24px (see tailwind.config.js).
export const surfaceCls =
  'overflow-hidden rounded-card border border-black/5 bg-white/60 dark:border-white/10 dark:bg-white/[0.07]'
