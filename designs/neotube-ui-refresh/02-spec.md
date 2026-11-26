# NeoTube refresh — implementation spec

Mockups: `mockups.html` (open locally) · per-screen PNGs `00-…`–`05-….png` · tokens in
`01-tokens.md` · current-state evidence in `current-ui/`.

Order of work: **tokens → shared primitives → four screens**. Nothing here changes app
behaviour except where a state is missing (empty states), which is called out per screen.

---

## 0. Tokens — 3 files

### `lib/colors.ts`

Add next to `surfaceCls` (exact strings from `01-tokens.md` §1.2): `barCls`,
`dividerCls`, `scrim`, `text` roles. Keep `surfaceCls` as is — every settings card already
uses it, and the token change is a class change inside it, not a rename.

```ts
export const dividerCls = 'border-b border-black/[0.06] dark:border-white/[0.08]'
export const scrim = { dark: 'rgba(3,6,16,0.62)', light: 'rgba(15,23,42,0.28)' } as const
export const text = {
  primary: 'text-zinc-900 dark:text-zinc-100',
  secondary: 'text-zinc-600 dark:text-zinc-400',
  tertiary: 'text-zinc-500 dark:text-zinc-400',
  onAccent: 'text-white',
} as const
```

`scrim` has to be read at render time (it is an inline style, not a class), so expose it
through `getGlassTokens()` instead if a component cannot import the constant cleanly:

```ts
// lib/glass-tokens.ts, inside buildGlassTokens return
scrim: dark ? 'rgba(3,6,16,0.62)' : 'rgba(15,23,42,0.28)',
shadowBar: dark ? [{ offsetX: 0, offsetY: 6, blurRadius: 20, color: 'rgba(0,0,0,0.35)' }]
               : [{ offsetX: 0, offsetY: 4, blurRadius: 14, color: 'rgba(15,23,42,0.10)' }],
shadowSheet: dark ? [{ offsetX: 0, offsetY: 18, blurRadius: 48, color: 'rgba(0,0,0,0.45)' }]
                 : [{ offsetX: 0, offsetY: 12, blurRadius: 32, color: 'rgba(15,23,42,0.14)' }],
```

Both are 8-combination cached already, so adding two keys costs nothing.

### `tailwind.config.js`

`theme.extend.fontSize` = the six steps from `01-tokens.md` §2, plus
`borderRadius: { chip: '12px', field: '14px' }` (card/sheet/bar stay).

### `components/NouText.tsx`

`resolveTextClass('text-body text-zinc-900', 'dark:text-zinc-100', className)`. This one
line moves every untyped `<NouText>` from RN's 14 px to 15/20. Expect two or three tight
layouts afterwards (`lib/text-class.test.ts` covers the resolver, not the size).

---

## 1. Shared primitives (build before the screens)

### `components/EmptyState.tsx` — new

Extracted from `FeatureEmptyState`-style markup in `FeedModal.tsx` (the icon/title/body/
actions block already there; lift it out, do not rewrite it).

```tsx
type Props = { icon: MaterialIconsIconName; title: string; body: string
  actions?: { label: string; onPress: () => void; tone?: 'accent' | 'plain' }[]
  tone?: 'neutral' | 'danger' }
```

- icon chip 52×52 radius 18, `bg-accent-500/14 text-accent-300`; `danger` → `red-500/14`.
- title `text-headline`, body `text-label text-tertiary`, centred, max width 260.
- Centred in the surface with `justify-center`, vertical padding 40. Inside a `FlatList`,
  pass through `ListEmptyComponent` — the list still has to scroll if it has a header.

### `components/Skeleton.tsx` — new

`<Skeleton w h r />` = a `View` on `bg-white/[0.09]`, shimmer via a reanimated
`withRepeat` opacity 0.55→1 (1.4 s, `ease.standard`). `SkeletonRow` mirrors `FeedItem`'s
row rhythm (thumb 128×72 + two lines). Gate on `settings$.reduceEffects`: static at 0.7
opacity, no animation.

### `components/picker/GlassSwitch.tsx` — new

46×28 track, radius 999, 22 px thumb, `bg-accent-600` when on, `bg-white/[0.14]` +
`inset ring white/10` when off, 180 ms thumb translate. Replace the RN `Switch` in
`components/modal/settings/primitives.tsx` (`SettingsToggleRow`), `SettingsBlocklistContent`,
and any `ToolsModal` toggle. Keep `accessibilityRole="switch"` + `accessibilityState`.

### `components/picker/Segmented.tsx` — restyle in place

Track: `bg-white/[0.06] dark:bg-white/[0.06]`, inset ring `white/[0.09]`, radius 16.
Thumb: `bg-accent-600` + `shadow` when selected, label `text-white`; unselected label
`text-zinc-600 dark:text-zinc-400`. Remove the `!isIos && rounded-l-lg` special-case —
with an accent fill the platform asymmetry reads as a bug.

---

## 2. Screen — Watch + toolbar

Files: `components/header/NouHeader.tsx` (structure + colours),
`components/header/toolbar-classes.ts` (pill classes), `components/header/header-animation.*`
(bar height), `lib/glass-css.ts` only if the injected page needs to yield space.

**Bar.** One container, three zones:

```tsx
<View style={{ borderRadius: 27, backgroundColor: tokens.frostBar.fill, ...tokens.frostBar.rim, boxShadow: tokens.shadowBar }}
      className="absolute left-3 right-3 h-[54px] flex-row items-center px-2 gap-1.5">
  {/* nav: back / forward / home / reload (each 40×40) */}
  {/* context: favicon + page title, flex-1, text-[13px] */}
  {/* actions: rate pill, quality pill, star, overflow (each 40×40) */}
</View>
```

- `frostBar` (0.84–0.86) is required here, **not** `fill`: 10.2:1 over a white page, and the
  same number over the video, because the material no longer depends on what is behind it
  (today the icons range 10.35:1 → 1.55:1 → 1.10:1; audit §1). On Android there is no blur,
  so `frostBar.fill` is already opaque enough; on iOS/web the blur does the rest.
- Icon colour becomes scheme-only (`onAccent`-like white on dark glass, `zinc-900` on
  light), not `colors.iconLight`. `headerControlColor` currently flips to `slate-700` for a
  light *scheme*; the bar is always its own surface, so it must flip on the bar's material,
  which is the same signal — keep the variable, change its value to `zinc-900`/`zinc-100`.
- `toolbarPillLabelClass` → `bg-black/[0.06] dark:bg-white/[0.12]`, `text-[12px] font-semibold`,
  no border. Selected (e.g. quality `4K` set) → `bg-accent-600 text-white`.
- Gap 16 → 6 within zones, 8 between zones; every hit target stays ≥40 px (currently
  `h-11 min-w-11`, keep that).
- `autoHideHeader` / `hideToolbarWhenScrolled`: animate the *bar container* height 54→0 and
  translateY −8 at 180 ms; keep the existing scroll listener, only change the target.

**Info sheet (optional, separate from the bar).** The panel under the video in
`mockups.html` §01 is YouTube's own expanded description panel — page content, not a native
sheet. Restyling it is therefore a `lib/glass-css.ts` job (the same file that already skins
`ytm-header-bar`, `ytm-pivot-bar-renderer`, `ytm-media-item`), and it is the one piece of
this pack that can break when YouTube changes its markup. Keep it out of the first PR; if it
is done, use the recipe below and keep every declaration `!important` and layout-neutral, as
the file's header comment requires:

- Surface: the sheet recipe in CSS — `--nt-fill` at ~0.96 alpha, inset rim, `--nt-lift`
  shadow, 28 px on the top corners; a scrim of `rgba(3,6,16,.62)` behind the panel.
- Header: 3 px × 22 px accent bar, title `text-title`, close 34×34.
- Stats: three chips (`text-label`, `bg-white/[0.07]`, radius 999) instead of a bordered
  3-column grid.
- Description: `rounded-2xl bg-white/[0.055] ring-1 ring-white/[0.09]`, `text-body`,
  3-line clamp + "Read more" in `text-accent-300`.
- Chapters: 150×84 thumbs at `rounded-chip` (12) with a duration badge; horizontal scroll.

**Assets needed:** none new — `RetryImage` + existing blurhash placeholders; a
`--duration-badge` style is CSS only.

---

## 3. Screen — Feeds

Files: `components/modal/FeedModal.tsx`, `components/feed/FeedItem.tsx`,
`components/feed/FeedManageItem.tsx`.

- **Filter chips** replace the channel dropdown (`FeedModal.tsx` header): horizontal
  `ScrollView` of `All` + one chip per channel/folder, selected = `bg-accent-500/18
  text-accent-300 ring-accent-500/45`, unselected = `bg-white/[0.07] text-zinc-400`.
  Keep the existing filter state (`currentFilterLabel`) — this is presentation only.
- **Day grouping**: `SectionList` (or a `FlatList` with sticky headers) over
  `bookmark.created_at`: `Today / Yesterday / This week / Earlier`. Header =
  `text-caption text-tertiary`, sticky. Data layer unchanged; group in `useMemo`.
- **Row** (`FeedItem.tsx`): thumb `128×72 rounded-chip`, title `text-headline` 2 lines,
  meta `text-label text-tertiary` = `relative time · duration` (channel only when the
  filter is `All`), 6 px accent unseen dot when `created_at > lastSeenAt` (new setting,
  default = last app open; if adding the setting is too much for this pass, use
  `created_at > Date.now() - 24h` and note it).
- Remove the per-row overflow `NouMenu` from the row; expose the same actions via
  `onLongPress` on the row (RN `Pressable` supports it; on web keep the current dots).
- Swipe-to-save: `react-native-gesture-handler` is already a dep — `Swipeable` with a
  single right action "Save" (`bg-accent-500/18`, star glyph, 88 px). Not on web.
- Empty state: existing strings (`feeds.emptyTitle*`, `feeds.emptyBody*`,
  `feeds.emptyAction*`) go through `EmptyState`; the "waiting" case keeps `hourglass-empty`
  but as the accent chip, not a bare icon.

---

## 4. Screen — Library (and History) drawer

Files: `components/modal/BaseModal.tsx`, `components/modal/LibraryModal.tsx`,
`components/modal/HistoryModal.tsx`, `components/history/HistoryItem.tsx`,
`components/bookmark/BookmarkItem.tsx`.

- **Scrim** in `BaseModal`: replace `bg-zinc-300/50 dark:bg-gray-600/50` with
  `tokens.scrim` (inline `backgroundColor`). That single line fixes the invisible scrim on
  light pages and the grey haze on dark ones.
- **Panel**: `GlassSurface` with `frost` (not `fill`) so Android and iOS agree; radius
  `0 28 28 0`; width `min(328, 86%)` (today `30rem/max-w-80vw`); `boxShadow: tokens.shadowSheet`;
  border-right `white/[0.12]`.
- **Header**: title `text-title` + count caption (`14 saved · 3 folders`) + accent "New
  folder" glyph button (36×36, `bg-accent-500/16 text-accent-300`). Remove the floating
  `folder-plus-outline` under the segmented control.
- **Rows** (`BookmarkItem`): thumb 96×54 `rounded-[10px]`, title `text-[15px] leading-5`
  2 lines, meta `duration · channel` `text-label text-tertiary`, hairline `dividerCls`
  between rows (not full-bleed — inset 108 px from the left so it starts at the text).
- **Empty state** for both drawers: `EmptyState` with the copy in `mockups.html` §05 —
  new i18n keys `library.emptyTitle`, `library.emptyBody`, `library.emptyAction`,
  `history.emptyTitle`, `history.emptyBody`. This is the one behavioural addition
  (`ListEmptyComponent`); History's "Clear" stays.

---

## 5. Screen — Settings (home + Appearance + Blocklist)

Files: `components/modal/SettingsTree.tsx`, `components/modal/settings/primitives.tsx`,
`components/modal/SettingsModalTabSettings.tsx`, `components/modal/SettingsBlocklistContent.tsx`,
`components/picker/AccentDots.tsx`.

- **Rows**: `SettingsNavRow` / `SettingsActionRow` / `SettingsToggleRow` → `py-3`,
  `gap-3`, icon chip 36×36 `rounded-chip bg-white/[0.07]` (accent glyph when the row is the
  active one), divider `dividerCls` instead of `border-b-2`, description `text-label
  text-secondary`, chevron `zinc-500`. Section label → `text-caption text-zinc-400`
  (6.31:1 vs today's 3.35:1).
- **Appearance**: move the accent block (`AccentDots`, `SettingsModalTabSettings.tsx:1050`)
  directly under a new **toolbar preview** card at the top of the page, above the toggles.
  - Preview = a non-interactive `barCls` strip rendering the current toolbar arrangement
    from the same settings keys (`showBackButtonInHeader` … `showStarButtonInHeader`), with
    dashed 34×34 slots for off controls. Tapping a slot writes the setting — this is the
    "show don't tell" replacement for six description rows, and it needs no new state.
  - Keep the toggle rows below (accessibility + long lists), but retitle them from
    "Show Back button in toolbar" to "Back button" with the section label "Toolbar"
    (`settings.toolbar.*` — add keys; the current strings are sentences because there was
    no grouping).
  - `AccentDots`: swatch 30 px inside a 34 px ring, selected ring `white` 2 px + outer
    `white/18` (today the ring is the accent itself, which vanishes on the aurora swatch).
    Add one preview strip under the swatches: `bg-accent-500/28 → /06` gradient, 40 px,
    caption "Glass, switches and links follow this colour".
  - Theme: three 74 px preview cards (System / Dark / Light) replacing the segmented
    control; selected = 2 px accent ring. Keep the existing `settings.theme` values.
- **Naming**: two pages called "Preferences" (`settings.groupYouTube` →
  `settings.preferencesYouTubeHint`). Rename to **"YouTube page"** and **"App behaviour"**
  (`settings.youtubePreferences`, `settings.appPreferences`); update the Settings home rows
  and both page titles in `pageMeta`.
- **Blocklist**: inputs to `rounded-field` (14) with `bg-white/[0.06] ring-white/10`,
  notes `text-label text-tertiary`, keyword rows on `dividerCls` + `GlassSwitch` +
  trash icon `zinc-500`. Empty copy stays.

**Assets needed:** three 1× preview PNGs are *not* needed — draw the theme cards in CSS/RN
views (`bg-[#0a0c12]`, `bg-gradient-to-b from-[#1a2233] to-[#0b0e16]`, `bg-[#f4f7fd]`).

---

## 6. Motion wiring

`lib/motion.ts` (new, ~30 lines): export `ease.standard`, `dur.*`, and
`useReducedMotion()` = `settings$.reduceEffects || AccessibilityInfo.isReduceMotionEnabled()`.
Every `withTiming` in the touched components reads from it. The four patterns are in
`01-tokens.md` §5; the only ones this pass *requires* are sheet in/out, bar hide, and the
switch thumb.

---

## 7. Verification

```bash
cd "F:/App Projects/NeoTube/neotube"
bun run typecheck        # tsc --noEmit -p tsconfig.typecheck.json
bun run lint
bun test                 # lib/*.test.ts, components/**/*.test.ts
bun run bundle           # content script still builds
```

Manual, on a device or emulator (light page is the case that breaks today):

1. Open a watch page in **light** scheme over a **light** YouTube page — bar icons legible,
   pills legible, bar reads as a layer.
2. Same in **dark** scheme, over a **dark** YouTube page — bar still a layer, no grey haze.
3. Open Library with nothing saved → empty state, not a blank panel. Same for History.
4. Feeds filtered to one channel → channel name appears once, in the chip row.
5. Appearance → change accent to Crimson → toolbar preview, switches, seg, links all follow;
   toggle a toolbar control from the preview and from its row, both stay in sync.
6. `reduceEffects` on → no transforms, only crossfades.

Known risks: `lib/glass-css.ts` selectors track YouTube's markup (unchanged by this pass,
but the sheet restyle must not assume page DOM); `frostBar` on iOS over a *video* frame is
the one case where translucency can still fight legibility — if it does, raise the alpha to
0.9 for the bar only; the `Switch` → `GlassSwitch` swap changes hit areas, so check
`accessibilityRole` and the Android TalkBack pass before shipping.
