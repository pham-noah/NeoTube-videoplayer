# NeoTube visual language v2 — tokens

The system is an **extension of what already ships**, not a replacement: same glass recipe,
same 24/28/32 radius family, same four accent seeds, same Tailwind + NativeWind plumbing.
What changes is that each choice gets a name, a place in code, and a measured contrast.

Design thesis, one line: **a glass instrument panel over YouTube.** The page inside stays
YouTube's; every pixel NeoTube draws is its own material, legible on white and on black.

---

## 1. Colour

### 1.1 Keep (already correct)

| Role | Token | Dark | Light | Note |
| --- | --- | --- | --- | --- |
| Accent | `accent-*` (indigo family) | seed remap | seed remap | `lib/accent.ts`; do not introduce a second accent path |
| Neutral surface families | `zinc` / `gray` / `slate` | seed hue, chroma 6 | same | keep |
| Danger / success | `status.danger` / `status.success` | `#f87171` / `#86efac` | `#dc2626` / `#16a34a` | unchanged, stays outside the accent |
| Card fill | `surfaceCls` | `bg-white/[0.07]` | `bg-white/60` | keep |

### 1.2 Add — semantic chrome tokens

New block in `lib/colors.ts`, next to `surfaceCls`:

```ts
// The bar is the one surface that sits over a page we do not control, so it needs
// its own opaque-enough material: at the sheet's 0.56 alpha, white icons land on a
// mid grey over a light page and read at 3.45:1. At 0.84 they read at 10.2:1.
export const barCls =
  'rounded-bar border border-white/10 bg-zinc-900/85 dark:border-white/10 dark:bg-zinc-950/80'

// 1px hairline instead of border-b-2: 2px zinc-950 on black reads as a gap.
export const dividerCls = 'border-b border-black/[0.06] dark:border-white/[0.08]'

// Scrim follows the scheme, not the page: 50% grey over a white page is no scrim.
export const scrim = {
  dark: 'rgba(3, 6, 16, 0.62)',
  light: 'rgba(15, 23, 42, 0.28)',
} as const

// Text roles. One neutral family per side (today text-zinc-500 dark:text-gray-400
// mixes two), and dark secondary/tertiary lifted one step for contrast.
export const text = {
  primary: 'text-zinc-900 dark:text-zinc-100',   // 17.7:1 on white / 14.7:1 on card
  secondary: 'text-zinc-600 dark:text-zinc-400', // 7.7:1 / 6.3:1
  tertiary: 'text-zinc-500 dark:text-zinc-400',  // 4.8:1 / 6.3:1  (was zinc-500 dark = 3.35:1)
  onAccent: 'text-white',
} as const
```

### 1.3 Measured (composited over the page, `lib/glass-tokens.ts` recipe)

Two questions, one answer: the bar has to carry its own material at ≥ 0.84 alpha.

- *If the bar borrowed the sheet's fill* (0.56), white icons would composite over a white
  page to `rgb(128,139,155)` = **3.45:1**. That is why the bar gets `frostBar`, not `fill`.
- *Today the bar has no fill at all*, so its icons take their colour from the scheme and
  their contrast from the page: `slate-700` is 10.35:1 on a white page, **1.55:1** over the
  video frame behind the bar, and `slate-100` in dark scheme on a light page is **1.10:1**.

| Surface (dark scheme) | Composite over white page | White icon/text |
| --- | --- | --- |
| `fill` (alpha 0.56) — today's blurred sheet | `rgb(128,139,155)` | **3.45:1** ✗ |
| `frostBar` (alpha 0.856) | `rgb(56,65,84)` | **10.23:1** ✓ |
| `frostBar` over dark page | `rgb(21,30,49)` | 16.6:1 ✓ |

Light scheme, `frostBar` (alpha 0.856) over a white page: `rgb(243,248,255)`, `slate-700`
icons = 9.7:1 ✓. Over a *dark* page a light bar composites to `rgb(210,216,223)`, `zinc-900`
icons = 12.3:1 ✓.

**Rules that fall out of this:**

1. The toolbar always draws `frostBar` (0.84–0.86 alpha), never `fill` — regardless of the
   blur setting. This is the fix for problem 1: icon contrast stops depending on the page
   (1.55:1 over video today) and becomes 10.2:1 everywhere.
2. A glass surface may be translucent, but any surface carrying text must composite to at
   least 4.5:1 with that text over *both* page extremes. On Android (no blur) that means
   `frost`, which already does this; iOS/web must not use `fill` for text-bearing sheets.
3. Section labels move from `dark:text-zinc-500` (3.35:1) to `dark:text-zinc-400` (6.3:1).
4. Accent as text: `accent-300` on dark (5.85:1 for Aurora), `accent-700` on light (4.4:1
   for the deepened Aurora `#2f79d1`; use `accent-800` for 12–13px accent text on white).

### 1.4 Accent is a material, not a highlight

One accent, four places, everywhere:

| Use | Class / token |
| --- | --- |
| Glass wash | already in `mixOver(base, accent, 0.08–0.12)` — keep |
| Active control (switch on, selected segment, selected chip) | `bg-accent-600` fill, `text-white` |
| Selected/informational glyph, link | `text-accent-600 dark:text-accent-300` |
| One accent mark per sheet | 3×16 px `rounded-full bg-accent-500` next to the sheet title |

Never: accent gradients, accent borders on ordinary cards, accent body text.

---

## 2. Type

Add to `tailwind.config.js` `theme.extend.fontSize`; RN units are density-independent px.

| Token | Size / line | Weight | Use |
| --- | --- | --- | --- |
| `text-display` | 28 / 34 | 600 | Sheet hero title (rare) |
| `text-title` | 20 / 26 | 600 | Drawer + settings page title |
| `text-headline` | 17 / 22 | 600 | Row title, list item title, card heading |
| `text-body` | 15 / 20 | 400 | Descriptions, body copy, inputs |
| `text-label` | 13 / 18 | 500 | Meta line, secondary row text, chips |
| `text-caption` | 11 / 14 | 600, +0.08em, uppercase | Section labels, group headers |

`components/NouText.tsx` becomes the single entry point:

```tsx
<Text className={resolveTextClass('text-body text-zinc-900', 'dark:text-zinc-100', className)} {...rest} />
```

Retire: RN's implicit 14 px, `text-sm` for descriptions (→ `text-body`), `leading-6` on
14 px feed titles (→ `text-headline`), `tracking-[0.18em]` (→ `0.08em`; 0.18em at 11 px
opens the word up so much it reads as letter-spaced noise).

---

## 3. Spacing

4 pt grid, six named roles — no other values in new or touched code.

| Role | px | Where |
| --- | --- | --- |
| `gutter` | 16 | Screen edges, drawer body |
| `sheetPad` | 20 | Sheet header/top and bottom safe padding |
| `rowY` | 12 | Row vertical padding; row `min-h-[56px]` |
| `cardPad` | 16 | Inside cards (`surfaceCls` containers) |
| `labelGap` | 8 | Section label → its card |
| `sectionGap` | 28 | Between settings groups (today `gap-8` = 32) |

Icon buttons: 40×40 hit area, 22 px glyph. Icon chips (settings rows): 36×36, radius 12
(today 40×40 radius 16 — too big next to a 15 px label).

---

## 4. Radius & elevation

| Token | px | Use |
| --- | --- | --- |
| `rounded-chip` | 12 | Chips, icon chips, thumbnails (today thumbnails are an arbitrary 10) |
| `rounded-field` | 14 | Inputs, search boxes |
| `rounded-card` | 24 | Cards on a sheet (unchanged) |
| `rounded-sheet` | 28 | Sheets, drawers, modals (unchanged) |
| `rounded-bar` | 32 | Toolbar bar, pill groups (unchanged) |
| `rounded-full` | 999 | Pills, switches, avatars, dots |

Add two shadow tokens to `getGlassTokens()`, both already expressed as RN `boxShadow` arrays:

| Token | Dark | Light |
| --- | --- | --- |
| `shadowBar` | `0 6px 20px rgba(0,0,0,0.35)` | `0 4px 14px rgba(15,23,42,0.10)` |
| `shadowSheet` | `0 18px 48px rgba(0,0,0,0.45)` | `0 12px 32px rgba(15,23,42,0.14)` |

The rim does the material work; the shadow only tells the layers apart, which is why the
dark value is heavy and the light value is thin.

---

## 5. Motion

Reanimated 4 is already a dependency. One easing, three durations, four patterns.

| Token | Value |
| --- | --- |
| `ease.standard` | `Easing.bezier(0.32, 0.72, 0, 1)` (iOS-like, fast out, settled) |
| `dur.tap` | 120 ms |
| `dur.state` | 180 ms |
| `dur.sheet` | 260 ms |
| Spring (drag) | `damping 24, stiffness 260, mass 0.9` |

| Pattern | Spec |
| --- | --- |
| Sheet / drawer in | translateX `-24 → 0` (left) or translateY `40 → 0` (bottom), opacity `0 → 1`, `dur.sheet`, scrim `0 → 1` in `dur.state` |
| Sheet out | reverse at `dur.state`, no bounce |
| Bar hide on scroll | height `52 → 0` + translateY `-8`, `dur.state`; show at `dur.tap` |
| Row press | background wash to `white/[0.06]` and scale `0.995` at `dur.tap`, release at `dur.state` |
| Selection change (segment, chip, accent) | accent pill crossfade + 2 px slide, `dur.state` |
| Skeleton | 1.4 s linear shimmer, 12 % → 18 % white, disabled by reduce-motion |

Gate every pattern on `settings$.reduceEffects` **and** `AccessibilityInfo.isReduceMotionEnabled()`;
with either on, all of the above become a `dur.tap` opacity crossfade, no transforms.

---

## 6. What to delete

- `border-b-2` dividers → `dividerCls` (1 px).
- `dark:bg-zinc-950` icon chips → `bg-black/[0.04] dark:bg-white/[0.06]` with the accent on
  the glyph when the row is active.
- The native `Switch` in `components/modal/settings/primitives.tsx` → one styled
  `GlassSwitch` (46×28 track, 24 px thumb, `bg-accent-600` on, `bg-zinc-300 dark:bg-zinc-700`
  off, 1 px rim). Native switches differ between iOS and Android and neither matches the
  glass language; the app already draws its own controls everywhere else.
- `Segmented`'s `zinc-200` track/`zinc-50` thumb → glass track + accent pill.
- `toolbarPillLabelClass`'s `bg-zinc-200/80 border-zinc-300` → `bg-black/[0.06] dark:bg-white/[0.12]`
  on top of the bar (contrast is now the bar's job, not the pill's).
