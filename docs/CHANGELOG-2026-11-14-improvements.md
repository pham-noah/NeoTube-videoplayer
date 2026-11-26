# NeoTube 0.1.x — unreleased changes

Date: 2026-11-14 · Branch: `neotube-improvements`, cut from `main` @ `3bf368e` (the audit commit;
`main` was at `1a96d2a` when this was merged) · Version unchanged
(`0.1.0`, versionCode 88) — no bump, tag or release was made.

This entry covers the top three items of `docs/improvement-backlog-2026-11-14.md` plus the design
tokens from `designs/neotube-ui-refresh/01-tokens.md`. One commit per item; the design-token work
landed earlier on the same branch (`64a5669`).

## 1. The fork's own strings now exist in every language it ships (backlog #1, F3)

- 17 fork strings translated into 15 locales — 255 strings: the accent picker (label, hint and the
  four palette names), the glass switch, reduce-effects, the community-post feed strings, and the
  AGPL / upstream attribution in About. Before this, all of them fell back to English outside
  `en.json`, including the accent picker, which is the fork's most visible own feature.
- `ja` is withdrawn rather than faked: `locales/ja.json` was literally `{}` for its entire history
  while the picker offered 日本語. Removed from `app.config.ts`, `supportedI18nLanguages`, the native
  name map and the resource bundle.
- `lib/i18n.test.ts` is now a gate: every locale must carry every fork key, every offered language
  must have strings and a native name, and `app.config.ts`'s `supportedLocales` must match the app's
  own list (the drift that let `ja` be offered at all).

**Deferred:** a real Japanese translation (needs a speaker); the remaining upstream strings still
missing in `de` (206), `pt` (253), `vi` (288), `zh_Hant` (325), `uk` (122) and the 31–61 gaps in the
rest. Those fall back to English as before; the new test stops the *fork's* strings from regressing.

## 2. Accent + glass reach the desktop and extension shells (backlog #2, F2)

- The root cause was one level down from the hard-coded `<Theme accentColor="gray">`: the Electron
  renderer and the extension each had an empty `theme.extend`, so `bg-accent-600` and the `--nou-*`
  variables the app's components are written against were **not in their CSS at all** (measured on
  the old config: 0 occurrences of `bg-accent-600`, `rounded-chip`, `rounded-field` in the built
  desktop stylesheet).
- `tailwind.palette.js` is now the single theme all three bundlers require. Defaults are the stock
  Tailwind hex, so nothing changes until an accent is written.
- `lib/accent-vars.ts` writes `:root` + `.dark` `--nou-*` blocks from `getAccentPalette()` — the same
  palette the native path uses. Both shells now pass a Radix accent
  (aurora→blue, crimson→ruby, purple→violet, cappuccino→brown) instead of `gray`, and re-write the
  variables when the accent changes. The app's own web build writes them too, beside `applyPalette`.
- Glass itself needed no work on those platforms (the components already draw `GlassSurface`, and
  `expo-blur` maps to `backdrop-filter` on web) — the missing piece was always the accent variables.

**Deferred:** a live screenshot of the Electron window and of the extension popup. Both bundles build
(`bun run build` in each) and the emitted CSS carries the accent, but neither was driven by a human
here: the extension popup needs the background service worker for its settings projection, and the
Electron renderer needs its preload bridge.

## 3. The web target works (backlog #3, F1 + F9)

- `web.output: 'single'` — an SPA, because static output rendered every route to HTML in Node and the
  entry graph assumes a browser. `bunx expo export -p web` went from exit 1 to a finished export.
- Two more mount-time crashes found by actually loading the export: NativeWind's
  `StyleSheet.registerCompiled` ("not available on web") and three `window.electron.process.platform`
  reads under `isWeb` (which is true for the browser too). Both fixed; the served build now reaches
  the page with no uncaught error and writes its accent style sheet.
- The Supabase client is built lazily (`getSupabase()`) and MainPage only registers the auth listener
  when `FORK.syncEnabled`, so a default build no longer constructs a sync client it never uses.
- `cd extension && bun run build` also works for the first time on a Windows checkout: its `rootDir`
  came from `resolve()` with backslashes while Vite ids use forward slashes, so every `@/` rewrite
  and module replacement silently missed.

**Deferred / not fixed:** the web page still renders an empty root. Nothing throws any more, but the
browsing surface is the native/Electron WebView, which has no web implementation, so there is no
document surface to draw. Making the web target a usable PWA is a design decision (iframe host?
YouTube embed restrictions?) rather than a bug fix — flagged, not attempted.

## 4. Design tokens (design pack `01-tokens.md`)

Committed earlier on this branch as `64a5669`: the six-step type scale and six spacing roles in
Tailwind, `barCls` / `dividerCls` / `scrim` / text roles in `lib/colors.ts`, `shadowBar` /
`shadowSheet` in `lib/glass-tokens.ts`, `frostBar` at 0.84 alpha for the toolbar (3.45:1 → 10.2:1
icon contrast over a light page), `GlassSwitch` replacing RN's native switch, an accent-filled
segmented control, 36px icon chips, 1px dividers and 0.08em section labels. `lib/design-tokens.test.ts`
asserts the composited contrasts.

## Gates

| Check | Result |
| --- | --- |
| `bun test` | 524 pass, 16 skip, 0 fail |
| `bunx tsc --noEmit -p tsconfig.typecheck.json` | clean |
| `bunx tsc --noEmit -p desktop/tsconfig.web.json` | clean |
| `cd extension && bunx tsc --noEmit` | clean |
| `bunx expo export -p web` | exit 0 |
| `cd desktop && bun run build` | OK |
| `cd extension && bun run build` | OK (chrome-mv3) |
| `bunx expo lint` | 0 errors, 47 warnings (unchanged from the audit) |

Not run: the Android build (`build-neotube.bat`), and the 16 skipped sync tests (they need the local
Supabase stack). Version, tags and releases untouched.
