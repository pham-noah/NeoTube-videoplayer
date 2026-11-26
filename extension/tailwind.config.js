/**
 * The extension renders the app's own components too, so it needs the same
 * theme: the accent family, the `--nou-*` colour variables (written at runtime by
 * lib/accent-vars.ts) and the type and spacing scales.
 *
 * @type {import('tailwindcss').Config}
 */
const palette = require('../tailwind.palette')

module.exports = {
  darkMode: 'class',
  content: [
    './entrypoints/**/*.{html,ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../components/**/*.{ts,tsx}',
    '../lib/colors.ts',
  ],
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
