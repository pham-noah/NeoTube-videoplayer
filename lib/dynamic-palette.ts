import { StyleSheet } from 'nativewind'
import { twColors, type DynamicPalette, type TwColor } from './tw-colors'

// Wallpaper-based dynamic color (Material You) is Android 12+ only.
export const isDynamicColorAvailable = false

export const getDynamicPalette = (): DynamicPalette | null => null

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

// Accent themes apply on every platform, so this is the same as the Android one.
export const applyPalette = (palette: DynamicPalette | null) => {
  const { light, dark } = palette ?? { light: twColors, dark: twColors }
  StyleSheet.registerCompiled({
    rootVariables: Object.fromEntries(
      (Object.keys(twColors) as TwColor[]).map((name) => [
        `--nou-${name}`,
        { light: channels(light[name]), dark: channels(dark[name]) },
      ]),
    ),
  } as any)
}
