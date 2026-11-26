import { StyleSheet } from 'nativewind'
import { Platform } from 'react-native'
import { twColors, type DynamicPalette, type TwColor } from './tw-colors'

// Wallpaper-based dynamic color (Material You) is Android 12+ only.
export const isDynamicColorAvailable = false

export const getDynamicPalette = (): DynamicPalette | null => null

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))

/*
 * Accent themes apply on every platform, so this is the same as the Android one.
 *
 * Not on web, though: there the Tailwind CSS is compiled ahead of time and only
 * reads the variables, and NativeWind's runtime compiler (`registerCompiled`)
 * throws "Stylesheet.registerCompiled is not available on web" -- which is how the
 * web bundle died on mount even after the export itself started working. The web
 * build writes the same palette into `--nou-*` through lib/accent-vars.ts
 * (applyAccentVars, called beside this from app/_layout.tsx).
 */
export const applyPalette = (palette: DynamicPalette | null) => {
  if (Platform.OS === 'web') return
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
