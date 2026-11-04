import { Hct, TonalPalette, argbFromHex, hexFromArgb } from '@material/material-color-utilities'
import { twColors, type DynamicPalette, type TwColor } from './tw-colors'

export const accents = ['aurora', 'crimson', 'purple', 'cappuccino'] as const
export type Accent = (typeof accents)[number]

export const accentColors: Record<Accent, string> = {
  aurora: '#4f9dff',
  crimson: '#e0314b',
  purple: '#8b5cf6',
  cappuccino: '#a67c5b',
}

export const normalizeAccent = (value: unknown): Accent =>
  accents.includes(value as Accent) ? (value as Accent) : 'aurora'

const tones = Object.fromEntries(
  Object.entries(twColors).map(([name, hex]) => [name, Hct.fromInt(argbFromHex(hex)).tone]),
) as Record<TwColor, number>

// Same dark-mode neutral remap as lib/dynamic-palette.android.ts.
const darkNeutralTones: [number, number][] = [
  [0, 4],
  [2.5, 6],
  [8.4, 12],
  [15.7, 22],
  [26.9, 30],
  [47.9, 50],
  [85, 80],
  [96.2, 90],
  [100, 98],
]

const remapTone = (tone: number, anchors: [number, number][]) => {
  const i = anchors.findIndex(([from]) => from >= tone)
  if (i <= 0) return anchors[Math.max(i, 0)][1]
  const [x0, y0] = anchors[i - 1]
  const [x1, y1] = anchors[i]
  return y0 + ((tone - x0) * (y1 - y0)) / (x1 - x0)
}

// One accent drives everything: indigo/blue/sky take the seed's hue and chroma,
// the neutral families take its hue at low chroma so surfaces pick up a hint.
export const getAccentPalette = (accent: Accent): DynamicPalette => {
  const seed = Hct.fromInt(argbFromHex(accentColors[accent]))
  const primary = TonalPalette.fromHueAndChroma(seed.hue, seed.chroma)
  const neutral = TonalPalette.fromHueAndChroma(seed.hue, 6)
  const light = {} as Record<TwColor, string>
  const dark = {} as Record<TwColor, string>
  for (const name of Object.keys(twColors) as TwColor[]) {
    const isNeutral = ['zinc', 'gray', 'slate'].includes(name.split('-')[0])
    const palette = isNeutral ? neutral : primary
    light[name] = hexFromArgb(palette.tone(tones[name]))
    dark[name] = isNeutral ? hexFromArgb(palette.tone(remapTone(tones[name], darkNeutralTones))) : light[name]
  }
  return { light, dark }
}
