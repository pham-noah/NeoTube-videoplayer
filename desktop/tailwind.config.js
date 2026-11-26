/**
 * The Electron renderer draws the app's own components, so it needs the theme
 * they were written against: the accent family, the `--nou-*` colour variables
 * (lib/accent-vars.ts writes those at runtime) and the type and spacing scales.
 * Without the shared fragment `bg-accent-600` resolved to nothing here, and the
 * app's own surfaces fell back to stock Tailwind greys with no accent at all.
 *
 * @type {import('tailwindcss').Config}
 */
const palette = require('../tailwind.palette')

module.exports = {
  darkMode: 'class',
  content: ['../components/**/*.{js,jsx,ts,tsx}', '../lib/colors.ts', 'src/renderer/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: palette.colors,
      borderRadius: palette.borderRadius,
      fontSize: palette.fontSize,
      spacing: palette.spacing,
    },
  },
  plugins: palette.plugins,
}
