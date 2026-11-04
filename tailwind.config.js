const twColors = require("tailwindcss/colors");
const plugin = require("tailwindcss/plugin");

// Families that follow the wallpaper on Android (Material You). They read from
// CSS variables defaulting to the stock Tailwind colors; lib/theme.ts overrides
// them at runtime. Keep in sync with lib/tw-colors.ts.
const dynamicFamilies = ["zinc", "gray", "slate", "indigo", "blue", "sky"];

const channels = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(" ");

const dynamicColors = Object.fromEntries(
  dynamicFamilies.map((family) => [
    family,
    Object.fromEntries(
      Object.keys(twColors[family]).map((shade) => [shade, `rgb(var(--nou-${family}-${shade}) / <alpha-value>)`]),
    ),
  ]),
);

const defaultVars = Object.fromEntries(
  dynamicFamilies.flatMap((family) =>
    Object.entries(twColors[family]).map(([shade, hex]) => [`--nou-${family}-${shade}`, channels(hex)]),
  ),
);

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
      colors: {
        ...dynamicColors,
        // The user's accent. The accent palette (lib/accent.ts) lands in the
        // indigo family, so this is the same scale under a name that says what
        // it is: bg-accent-600, text-accent-300, border-accent-500/40.
        accent: dynamicColors.indigo,
      },
      // Mirrors glassRadius in lib/glass-tokens.ts.
      borderRadius: {
        card: "24px",
        sheet: "28px",
        bar: "32px",
      },
    },
  },
  plugins: [plugin(({ addBase }) => addBase({ ":root": defaultVars }))],
};
