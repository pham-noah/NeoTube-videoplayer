const palette = require('./tailwind.palette')

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  // lib/colors.ts holds shared class strings (surfaceCls). Tailwind only
  // generates a class it can see in a scanned file, so without it the settings
  // cards silently rendered with no background and RN's default black border.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./lib/colors.ts"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: palette.colors,
      borderRadius: palette.borderRadius,
      fontSize: palette.fontSize,
      spacing: palette.spacing,
    },
  },
  plugins: palette.plugins,
};
