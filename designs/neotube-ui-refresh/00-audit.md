# NeoTube UI/UX refresh — audit

Evidence: real device frames extracted from `store-assets/app-preview/captures/*.mp4`
(1206×2622, Android), copied into `current-ui/`, plus the source under
`app/`, `components/`, `lib/`. Nothing in this folder changes production code.

## What NeoTube is, structurally

NeoTube is a WebView shell around YouTube, not a native UI over an API. Two layers are
visible on every screen and they never agree:

| Layer | Owner | Look today |
| --- | --- | --- |
| The page (watch page, YouTube home, YouTube Music) | YouTube's own CSS, patched by `lib/glass-css.ts` (forced dark + glass bars) | YouTube markup wearing NeoTube's glass recipe; YouTube's own light theme when the injection is not applied |
| Native chrome: toolbar, drawer, sheets, modals, toasts | `components/**` + `lib/glass-tokens.ts` | Liquid Glass on iOS/web, an opaque "frost" fallback on Android, plus a stock iOS-settings look in Settings |

So the design problem is not "make it prettier". It is: **the native chrome has to be
unmistakably NeoTube and legible on top of a page it does not control.**

## Screen inventory (as built)

1. **Watch / home** — YouTube page + floating toolbar (`components/header/NouHeader.tsx`):
   library, feeds, playback-speed pill, quality pill, sleep timer, queue, star, overflow.
   Below it, YouTube's own expanded description panel (title, channel, stats, description,
   chapters) — page content, not native, and left alone today.
2. **Speed / quality picker** — centred card, 12 buttons in a 3×4 grid.
3. **Feeds** (`components/modal/FeedModal.tsx`) — left drawer, channel dropdown + gear,
   rows of `FeedItem` (avatar, channel name, relative time, overflow, 152×85 thumbnail, title).
4. **Library** (`components/modal/LibraryModal.tsx`) — left drawer, segmented
   Videos/Channels/Playlists, folder + button, bookmark rows.
5. **History** (`components/modal/HistoryModal.tsx`) — left drawer, title + "Clear" pill, rows.
6. **Settings** (`components/modal/SettingsTree.tsx`, 11 sub-pages) — home groups
   YouTube / NeoTube / Tools, then cards of nav rows. Appearance holds theme, accent, and
   ~20 toolbar/notification toggles. Blocklist holds two input+list cards.
7. **Tools / Transfer / Sync / Changelog** — same settings card language.

## Current tokens (as coded)

- Radii: `card 24` / `sheet 28` / `bar 32` (`lib/glass-tokens.ts` ↔ `tailwind.config.js`).
- Glass: `fill` (blurred, accent-washed 8–12 %), `frost` (no-blur Android, 0.95 alpha),
  `frostBar` (0.84), `card` (flat, 0.07 alpha dark), inset rim shadows.
- Accent: 4 seeds (`#4f9dff` Aurora, `#e0314b` Crimson, `#8b5cf6` Purple, `#a67c5b`
  Cappuccino) remapped over the indigo/blue/sky families; neutrals take the seed's hue at
  chroma 6 (`lib/accent.ts`). Status colours are deliberately outside the palette.
- Type: no scale. RN default 14 px body, `text-sm` 14 px descriptions, `text-xs` 12 px,
  section labels `text-[11px] uppercase tracking-[0.18em]`, feed titles 14 px at
  `leading-6` (24 px line height).
- Spacing: ad-hoc. `px-4 py-4` rows, `gap-3`, `gap-8` between settings sections.
- Dividers: `border-b-2` (2 px) in `zinc-100` / `zinc-950`.
- Icon chips: 40×40, `rounded-2xl`, `bg-zinc-100 dark:bg-zinc-950` (a black chip on a
  black page).

## Top 5 problems

**1. The toolbar's contrast is decided by the page, not by the app.**
`headerControlColor` picks the icon colour from the colour *scheme*
(`colors.iconLight = slate-700`, `colors.icon = slate-100`), and the bar itself draws no
surface and no scrim. Measured against what is actually behind it:

| Behind the bar | Icon colour | Contrast |
| --- | --- | --- |
| a white page, light scheme | `slate-700` #334155 | 10.35:1 |
| the video frame it floats over | `slate-700` | **1.55:1** |
| a light page, dark scheme | `slate-100` #f1f5f9 | **1.10:1** |

Same bar, same icons, three completely different answers, because the wallpaper picks them.
The speed/quality pills are `bg-zinc-200/80 border-zinc-300` with `zinc-500` labels —
**3.88:1** on their own fill, under 4.5:1 for 12 px text. This is the primary navigation and
its legibility is a property of the page.
Note on provenance: `lib/glass-css.ts` normally forces the page to a dark glass theme, which
hides this most of the time. It still breaks whenever the page paints its own light surface
(`glassTheme` off, first paint before the injection lands, YouTube's own search/shorts
surfaces). The store recordings in `current-ui/` show the page without the injection, which
is precisely the case the bar has to survive.

**2. The material exists in the page but not in the chrome; surfaces read as gaps.**
`lib/glass-css.ts` gives YouTube's own bars fill + gloss + inset rim + lift, so the *page*
looks designed. The native chrome has none of that on the main screen, and where it does have
cards the token works against it: `bg-white/[0.07]` on a `#000` page, separated by
`border-b-2 border-zinc-950` — on black that is not a hairline, it is a gap, so the card's
edges disappear (`before-appearance.png`, `before-blocklist.png`). The drawer has the mirror
problem: its Android frost is deliberately near-opaque (0.95, no blur), but the scrim behind
it is `bg-zinc-300/50`, which over a white page is an **11 % dim** — so the panel reads as a
cut in the screen rather than a layer. The proposed scrim dims by 26 %. Nothing here is a
missing redesign; it is three surfaces whose material is invisible in the state they ship in.


**3. Settings reads as stock iOS, not NeoTube.**
One card holds six toggle rows separated by 2 px `zinc-950` dividers (on black that is a
gap, not a hairline); icon chips are black-on-black with 18 px grey glyphs; switches are
RN's native `Switch` with `blue-700` tracks. The accent users deliberately pick is
almost nowhere: no swatch on the Appearance nav row, no accent in section labels, and the
colour picker sits below twenty unrelated toggles (`SettingsModalTabSettings.tsx:1050`),
so the app's headline feature is the hardest thing to find. Navigation naming collides
too: two distinct pages are both called "Preferences", one YouTube-side and one app-side.

**4. Feeds rows repeat identity and lose hierarchy.**
Every row carries channel avatar + channel name + relative time + overflow
(`FeedItem.tsx`), even when the list is already filtered to one channel — so 40 % of the
row height is repeated metadata. The 152×85 thumbnail with radius 10 and a 14 px/24 px
3-line title puts an 85 px image next to ~72 px of loose text; nothing in the row says
"new since you last looked". There is no date grouping, so "11 hours ago / 2 days ago /
4 days ago" is the only temporal signal, repeated per row.

**5. Native surfaces have no empty, loading or error language.**
`LibraryModal` and `HistoryModal` render a `FlatList` with no `ListEmptyComponent` — a
first-run user opens Library and sees a blank panel with three tabs
(`before-library-drawer.png`, and the History drawer likewise). Feeds is the only surface
with real empty states (icon + title + body + actions, `FeedModal.tsx:242-290`) and they
are the model to copy. Loading is a bare `ActivityIndicator` on a blank surface; images
have blurhash placeholders but no skeleton row, so lists pop from nothing to full.

### Secondary (listed, not mocked)

- Speed picker: 12 equal buttons for a value used by touch every day; a 6-up grid plus
  slider would halve the target area and show the current rate in the title.
- `Segmented` uses `zinc-200` track + `zinc-50` thumb, which is invisible on a light
  page and flat on a dark one; the selected tab carries no accent.
- Toasts are themed twice (`lib/toast.ts`, `lib/toast.android.ts`, `lib/toast-theme.ts`)
  and differ between platforms.
- `text-zinc-500 dark:text-gray-400` mixes two neutral families in the same element
  (`FeedItem.tsx`), so the accent remap produces slightly different hues on each side.

## What is already right (keep it)

- `lib/glass-tokens.ts` is a genuinely good idea: one recipe, eight scheme×accent
  combinations, cached, shared with the injected CSS. The refresh extends it rather than
  replacing it.
- The 24/28/32 radius family reads as one product across sheets and cards.
- Accent seeds are tasteful and the HCT remap keeps neutrals tinted — the material is
  there, it is just not visible enough on screen.
- Feeds' empty states and the settings `sectionLabel` + nav-row pattern are worth
  promoting into shared primitives.
