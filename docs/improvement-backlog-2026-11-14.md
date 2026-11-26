# NeoTube — codebase audit and prioritized improvement backlog

Date: 2026-11-14 · Repo: `pham-noah/NeoTube` (private) · Audited commit: `main` @ `c78732f`
("Merge remote-tracking branch 'upstream/main' into consolidate-20261111"). The working tree was
clean and 0/0 against `origin/main` when the audit started; the gates in §3 were run against that
commit, which is why every finding cites it rather than `HEAD`.

Scope: this document only. **No application code was changed.** Everything below was run against
the tree at that commit; the commands and their real output are in "Verified state".

---

## 1. What NeoTube is, and what it is built from

NeoTube is a fork of [NouTube](https://github.com/nonbili/NouTube) (AGPL-3.0) that wraps
`m.youtube.com` / `music.youtube.com` in a WebView, blocks ads, keeps playback alive in the
background, and adds its own library/feeds/downloads on top. The fork's contribution is a look:
Liquid Glass surfaces, one accent colour in four palettes (Aurora / Crimson / Purple /
Cappuccino), and its own iconography.

| Layer | What it is |
| --- | --- |
| App shell | Expo SDK 58 / React Native 0.88 / React 19.3, `expo-router` (typed routes, static web output) |
| Language | TypeScript 6.0 (`tsc --noEmit` over `tsconfig.typecheck.json`), Bun 1.4 as package manager, bundler-for-content-script and test runner |
| Styling | NativeWind 4 + Tailwind 3; `@radix-ui/themes` and custom CSS in the desktop and extension shells |
| State | `@legendapp/state` 3 (observables + MMKV persistence on native, IndexedDB on web/extension) |
| Data | `@tanstack/react-query`, `cheerio` + `fast-xml-parser` for the feed reader, `papaparse`, `jszip` |
| Injected side | `content/` → bundled by Bun to `assets/scripts/main.bjs` (180 KB) and executed inside the WebView: ad blocking, player hooks, SponsorBlock, h264ify, Split View, glass CSS |
| Platforms | Android (primary — signed APK, arm64-only), iOS (untested here; needs an Apple team), desktop (Electron, `desktop/`), browser extension (WXT/Vite, `extension/`), web/PWA (`web.output: 'static'`) |
| Fork-specific code | `lib/fork.ts`, `lib/accent.ts`, `lib/glass-css.ts`, `lib/glass-tokens.ts`, `components/glass/`, the `neotube-glass` user style in `states/user-styles.ts`, `plugins/with{Android,Ios}Plugin.ts` |
| i18n | `react-i18next`, 17 locale files under `locales/` |
| Sync | Supabase (`lib/supabase/`), **disabled by default** in the fork (`FORK.syncEnabled` is false unless `EXPO_PUBLIC_NEOTUBE_SYNC=1`) |

NeoTube numbers its own versions from 0.1.0 (`package.json`: version `0.1.0`, versionCode `88`,
buildNumber `9`), independently of the upstream NouTube tags (`v0.7.x`) that still exist in
history.

## 2. How to run it

```bash
bun install                     # hoisted linker, see bunfig.toml
bun run bundle                  # rebuild the injected content script -> assets/scripts/main.bjs
bun start                       # Expo dev server (pick a platform)
bun run android                 # expo run:android --variant fullDebug  (needs JDK 17 + SDK)
bun run web                     # expo start --web          <-- currently broken, see F1
bun run ios                     # expo run:ios             (needs EXPO_APPLE_TEAM_ID)

# gates (all three run in CI, .github/workflows/test.yml)
bun test
bunx tsc --noEmit -p tsconfig.typecheck.json
bunx expo lint

# sync suite against a local Supabase stack
bun run test:sync:local
```

Android release build — the wrapper does the content-script rebuild, Gradle discovery and
`JAVA_HOME`/`ANDROID_HOME` detection for you:

```bash
build-neotube.bat assembleFullRelease    # standalone signed APK
build-neotube.bat assembleFullDebug      # ~20 s, JS from Metro
```

Other targets: `cd extension && bun run build:all` (WXT, Chrome + Firefox), `cd desktop && bun run
build` (electron-vite). Release procedure and signing: [RELEASING.md](../RELEASING.md).

## 3. Verified state

Everything in this table was executed on 2026-11-14 in `F:\App Projects\NeoTube\neotube`.

| Check | Command | Result |
| --- | --- | --- |
| Unit/integration tests | `bun test` | **460 pass, 16 skip, 0 fail**, 1053 assertions, 61 files, 35 s |
| Typecheck | `bunx tsc --noEmit -p tsconfig.typecheck.json` | **clean**, exit 0 |
| Lint | `bunx expo lint` | **0 errors, 47 warnings** |
| Content-script bundle | `bun run bundle` | **OK**, 63 modules → `main.bjs` 180.0 KB in 381 ms |
| Web export (PWA) | `bunx expo export -p web` | **FAILS**, exit 1 — `Cannot read properties of undefined (reading 'VITE_SUPABASE_URL')` |
| Web dev server | `bun run web` → `http://localhost:8083` | **FAILS to render** — "Server Error: window is not defined" in the static-render path |
| Android build | not run in this audit | toolchain is present (JDK/SDK) but a Gradle build was out of scope; the tree already ships `release/NeoTube-0.1.0-arm64-v8a.apk` |
| GitHub releases / tags | `gh api repos/pham-noah/NeoTube/releases`, `/tags` | **0 releases, 0 tags** |
| Upstream drift | `git fetch upstream && git rev-list --left-right --count upstream/main...main` | **1 behind** (`6994de8 android: respect landscape navigation bar safe-area insets`), 547 ahead (fork history is re-anchored) |
| Open issues | `gh issue list` | 1 — #4 "Upstream NouTube has conflicting changes" (auto-filed 2026-11-09, now stale: the merge landed, only that 1 commit remains) |

The 16 skipped tests are the Supabase sync suite (`test/sync-local/`); they only run under
`bun run test:sync:local` with a local stack, and CI does not run them.

`TODO` / `FIXME` / `HACK` / `XXX` markers in `app/ lib/ components/ content/ states/ modules/`:
**zero**. The codebase documents itself with prose comments instead — unusually clean on that
axis, and the reason the findings below are about behaviour rather than litter.

### Concurrent work in this checkout

This audit shares `F:\App Projects\NeoTube\neotube` with two other board cards that were spawned at
the same moment (design `t_89c7369d`, implementation `t_8edd2e49`). Everything above describes
**HEAD `c78732f`**, which is what the gates were run against. While the audit was running, the
implementation card patched two files in the working tree (uncommitted, not touched by this
document): `lib/supabase/client.ts` now guards `import.meta.env`, and
`desktop/src/renderer/lib/shortcuts.ts` now reads `globalThis.window?.electron?.process?.platform`
instead of `window.electron`. That is roughly half of **F1** — the export crash — done ahead of
this report; the `window is not defined` half in the web dev server and the `web.output` decision
still stand. `designs/` is the design card's output.


## 4. Findings

Each item below is reproduced from a real run or a real file read; the file:line is the thing to
open.

### F1 — The web/PWA target does not render at all (two separate SSR-path crashes)

`app.config.ts:55` sets `web.output: 'static'`, so Expo renders the app to HTML in Node before
serving or exporting it. Two module-scope browser/edge assumptions break that path:

- `lib/supabase/client.ts:4` — `import.meta.env.VITE_SUPABASE_URL`. `import.meta.env` is a Vite
  (extension) construct; in Metro's Node render bundle it is `undefined`, so the module throws on
  import. Reached from `MainPage` → `app/index.tsx`, which is why the export fails at
  `index.tsx`.
- `bun run web` fails even earlier with `window is not defined` (thrown while resolving the
  `index.tsx` module graph, on top of a wall of `[legend-state] MMKV failed to parse …` lines
  from the native-only persist plugin being loaded under Node).

Consequence: neither `expo export -p web` nor the web dev server produces a working page. The
Electron and extension shells are unaffected (they bundle with electron-vite / WXT instead), but
the "web" script in `package.json` is advertised and does not work.

### F2 — The fork's look stops at the shell: desktop and extension still render upstream's grey theme

The accent system (`lib/accent.ts`, `lib/glass-tokens.ts`, `components/glass/`) is wired into the
native shell and into the injected YouTube CSS (through the `neotube-glass` user style in
`states/user-styles.ts:145-151`, re-synced on accent change from
`components/page/MainPageContent.tsx:783-786` — that part works). Neither auxiliary shell reads it:

- `desktop/src/renderer/main.tsx:90` — `<Theme … accentColor="gray" grayColor="slate">`
- `extension/components/native/AppShell.tsx:77` — same hard-coded `accentColor="gray"`

So on desktop and in the extension's own popup/tab/options surfaces, NeoTube has no accent and no
glass; those platforms look exactly like upstream NouTube. The glass material is also only used by
9 of 67 `.tsx` files in `components/` + `app/` (header, modals, page-load error) — list rows,
pickers and toolbars are still plain surfaces.

### F3 — Every fork-specific string is English-only, and one locale file is empty

`settings.accent.*` (6 new keys: label, hint, aurora, crimson, purple, cappuccino) exists only in
`locales/en.json`. Against `en.json`'s 434 keys, measured per file:

| locale | keys | missing | notes |
| --- | --- | --- | --- |
| de | 230 | **206** | |
| es | 397 | 47 | |
| fr / it / pl / pt_BR / ru | 411–413 | 31 | |
| gl | 393 | 41 | |
| id | 381 | 61 | |
| tr | 403 | 41 | |
| uk | 320 | 122 | |
| zh_Hans | 383 | 61 | |
| pt | 189 | 253 | |
| vi | 150 | 288 | |
| zh_Hant | 110 | 325 | |
| **ja** | **0** | **434** | file is literally `{}` |
| en | 434 | 0 | |

`app.config.ts:84` still advertises all 17 locales, so the language picker offers 日本語 and every
other locale a UI that is partly or wholly English. `ja.json` being `{}` means Japanese gets no
translation at all while appearing as a supported language.

### F4 — Nothing is published: 0 releases, 0 tags, and the README points at the empty tab

`README.md:13-18` tells a visitor to "take the `.apk` from this repository's Releases tab". That
tab is empty (`gh api …/releases --jq length` → 0; `/tags` → 0). `.github/workflows/build.yml`
only runs `on: push: tags: v*`, and no `v*` tag has ever been pushed — so CI has never produced an
APK for this fork. The only artefact is local: `release/NeoTube-0.1.0-arm64-v8a.apk` (75.7 MB,
2026-11-04). Related: the changelog body that workflow uploads is
`metadata/en-US/changelogs/${VERSION_CODE}04.txt` = `8804.txt`, whose content is upstream's
0.7.8 note ("Fix a crash on startup in Android release builds"), not NeoTube 0.1.0's.

### F5 — The in-app update check can never find anything

`lib/changelog-feed.ts:3` builds the feed URL as `${FORK.repoUrl}/releases.atom`, and
`lib/fork.ts:8` fills `FORK.repoUrl` from `EXPO_PUBLIC_NEOTUBE_REPO` at build time. With 0
releases (F4) the atom feed is empty, so Settings → About/Changelog links either vanish (no env
set) or show a feed that can never announce an update — while `README.md:17-18` promises "updates
are manual unless you add the release feed under Settings".

### F6 — Dead files

Confirmed by repo-wide import search (platform-suffixed files like `*.native.ts`, `*.web.ts` and
`plugins/*.ts`, which are resolved by name from config, were excluded from the check):

- `components/icon/Icons.tsx` — `IconYouTube` and `IconYouTubeMusic` are exported and imported
  nowhere; the app uses `@react-native-vector-icons/*` and `assets/images/` instead.
- `components/modal/FeedEditorSheet.tsx` — `FeedEditorSheet` has no importer at all, and it
  accounts for 6 of the 47 lint warnings.

### F7 — 47 lint warnings, 0 errors — and the biggest group is a React 19 behaviour class

`bunx expo lint`: 47 problems (0 errors). By rule: `react-hooks/set-state-in-effect` **14**,
`react-hooks/refs` **10**, `@typescript-eslint/no-unused-vars` **8**,
`react-hooks/exhaustive-deps` **5**, `rules-of-hooks` 1, `immutability` 1,
`no-require-imports` 1, `array-type` 1. The `set-state-in-effect` cluster (Settings modals:
`FeedModal`, `SettingsModalTabSettings`, `SleepTimerModal`, `CookieModal`, …) is the React 19
"derived state in an effect" pattern: it costs an extra render pass per open and is the class of
bug that shows up as a flash of stale content. `components/page/desktop-tab-view.tsx:242` reads
`initialUrlRef.current` during render, which React 19 flags as unsafe.

### F8 — No error boundary anywhere

`grep -rn "componentDidCatch\|ErrorBoundary" app components lib` → nothing. A JS throw in the
shell (or in a modal body) unmounts the tree and leaves the user on a blank screen with no way to
recover or report. Upstream's own most recent mobile note (`metadata/en-US/changelogs/8804.txt`)
is "Fix a crash on startup in Android release builds" — the failure mode this would have caught
and exported.

### F9 — The sync stack is compiled in while switched off

`FORK.syncEnabled` defaults to false and the Settings tab is hidden accordingly
(`components/modal/SettingsTree.tsx:312`), but the module graph still loads it:
`components/page/MainPage.tsx:3` and `components/page/MainPageContent.tsx:22` import the Supabase
client and syncer unconditionally. That is what makes F1's crash reachable at all — a fork that
ships without sync still pays for it in bundle size, module-init time and one broken platform.

### F10 — The glass CSS is tied to YouTube's markup with no guard

`lib/glass-css.ts` (172 lines) styles `ytm-mobile-topbar-renderer`, `ytm-header-bar`,
`ytm-pivot-bar-renderer`, `ytm-chip-cloud-chip-renderer` … and its own comments say the selectors
"may need adjusting when it changes" (`README.md:7` repeats it). When Google renames one of those
tags, the injected sheet silently stops matching: no error, no log, just an un-glassed UI that
looks like the feature was never built. `lib/glass-tokens.test.ts` and `lib/accent.test.ts` cover
the palette maths (contrast, tones) but nothing asserts that the injected selectors still hit
something in a live page.

### F11 — `android/` is generated and hand-patched, and the traps are only in prose

`README.md:42-50` documents three failure modes that each cost "an afternoon": `expo prebuild`
rewriting `gradle.properties` / `app/build.gradle` (arch list, signing config, arm64 splits),
`-Pandroid.injected.build.abi` silently producing no APK, and configuration-cache being
impossible because the `react {}` block runs a process at configure time. Today the knowledge
lives in two markdown files and `plugins/withAndroidPlugin.ts`; a fresh `expo prebuild --clean`
still needs a human to re-check the result.

### F12 — The web shell forces dark mode

`states/settings.ts:368` — `theme: isWeb ? 'dark' : null`. On web the app ignores the system
colour scheme by default, which is also the one place where `GlassSurface` would render real blur
(browsers support `backdrop-filter`). Light-mode glass tokens are built and never used on that
platform.

### F13 — Project-root clutter outside the repo

`F:\App Projects\NeoTube\` holds `neotube.patch` (3.5 MB — a stale export of changes that are now
commits), `NeoTube-upstream-merge-arm64.apk` (75.7 MB, 2026-10-18) and `build-x86.sh`, none of
them referenced by the repo. Inside the repo, `backup/pre-graft-20261018` is the only other
branch and its graft is long since anchored. Low value, cheap to clear, and it hides which APK is
the current one.

## 5. Backlog

Effort: **S** ≤ half a day, **M** a day or two, **L** more than that. Risk = chance of touching
something that already works (or of needing a device/account). Score = impact (1-5) ÷ effort
points (S=1, M=2, L=3), the ranking used below.

| # | Item | Why it matters | Effort | Risk | Score | Touches |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | **Localize the fork's own strings and repair the locale files** (F3) | 6 keys × 16 locales is a couple of hours; today the one thing that is unambiguously NeoTube (the accent picker) is English everywhere, and `ja` is empty while offered in the menu | S | Low — JSON only, `lib/i18n.test.ts` stays green | **4.0** | `locales/*.json`, `app.config.ts:84`, `lib/i18n.ts` |
| 2 | **Bring the accent + glass to desktop and the extension shell** (F2) | The fork's whole identity is missing on 2 of its 4 platforms; both are one `<Theme accentColor=…>` away from the palette | M | Low-med — Radix theme tokens vs `lib/accent.ts` mapping needs one decision | **2.5** | `desktop/src/renderer/main.tsx:90`, `extension/components/native/AppShell.tsx:77`, `lib/accent.ts`, `lib/glass-tokens.ts`, `desktop/src/renderer/global.css` |
| 3 | **Fix the dead web target: SPA output + no module-scope browser globals** (F1, F9) | The advertised `bun run web` and `expo export -p web` both fail; the same fix removes the sync stack from a fork that doesn't use it | M | Med — `web.output: 'single'` changes how the web build is served; needs a manual pass over the browser UI | **2.0** | `app.config.ts:53-57`, `lib/supabase/client.ts:4`, `components/page/MainPage.tsx:3`, `components/page/MainPageContent.tsx:22`, `states/indexeddb.ts` |
| 4 | **Delete the two dead files** (F6) | Zero-risk cleanup that also deletes 6 lint warnings and an unused 4 KB of surface area | S | None | **2.0** | `components/icon/Icons.tsx`, `components/modal/FeedEditorSheet.tsx` |
| 5 | **Add a root error boundary with "copy crash details"** (F8) | Turns a blank screen into a recoverable, reportable state — the exact class of bug the last upstream release fixed | S | Low — wraps `app/_layout.tsx` | **2.0** | `app/_layout.tsx`, new `components/error/ErrorBoundary.tsx` |
| 6 | **Stop forcing dark on web** (F12) | One line; makes the light glass tokens real and respects the OS | S | Low | **2.0** | `states/settings.ts:368` |
| 7 | **Publish the first tagged release so CI builds it** (F4, F5) | README points at an empty Releases tab, CI has never run, and the update check cannot work until a release exists | S | Med — first release on a new package id, signing/versionCode/changelog body must be right | **1.5** | `README.md:13-18`, `.github/workflows/build.yml`, `package.json`, `metadata/en-US/changelogs/`, `release/` |
| 8 | **Guard the glass CSS against YouTube markup drift** (F10) | The signature feature can vanish silently; a probe that logs/reports "these selectors matched nothing" turns it into a bug report | M | Low — additive, dev-time only | **1.5** | `lib/glass-css.ts`, `content/css.ts`, `content/noutube.ts` |
| 9 | **Clear the 47 lint warnings, starting with `set-state-in-effect`** (F7) | 14 of them are a real React 19 anti-pattern (extra render per modal open); clearing them keeps the gate meaningful | M | Low-med — touched modals need a device pass | **1.0** | `components/modal/*`, `components/page/{PlayerFrame,desktop-tab-view,MainPageContent}.tsx`, `components/header/NouHeader.tsx` |
| 10 | **Write the `prebuild` step down as a script** (F11) | `expo prebuild --clean` + a documented post-patch, so a regeneration is one command instead of a checklist | L | Med — verifies against a real Gradle build | **1.0** | `scripts/`, `plugins/withAndroidPlugin.ts`, `android/gradle.properties`, `android/app/build.gradle` |
| 11 | **Decide the sync suite's fate: wire it into CI or drop it** (F3-adjacent, 16 skips) | 16 tests that never run are 16 tests that rot; either a Supabase service container in `test.yml` or delete the stack with F9 | M | Low | **1.0** | `test/sync-local/`, `scripts/test-sync-local.ts`, `.github/workflows/test.yml` |
| 12 | **Extend the glass material past the chrome** (F2, second half) | Only 9 of 67 `.tsx` use it; list rows, pickers and toolbars are the screens a user stares at | M | Med — visual regression across many screens | **1.0** | `components/glass/`, `components/feed/`, `components/bookmark/`, `components/picker/`, `tailwind.config.js` |
| 13 | **Clear the project-root clutter and the stale backup branch** (F13) | 79 MB of unreferenced artefacts next to the repo; makes "which APK is current" ambiguous | S | None | **1.0** | `F:\App Projects\NeoTube\` (outside git), `backup/pre-graft-20261018` |

### Ranked order (by score)

1. Localize the fork's own strings (4.0)
2. Accent + glass on desktop and extension (2.5)
3. Fix the dead web target (2.0)
4. Delete the two dead files (2.0)
5. Root error boundary (2.0)
6. Stop forcing dark on web (2.0)
7. Publish the first tagged release (1.5)
8. Guard the glass CSS against markup drift (1.5)
9. Clear the lint warnings (1.0)
10. Script the prebuild step (1.0)
11. Decide the sync suite's fate (1.0)
12. Extend the glass material past the chrome (1.0)
13. Clear root clutter + stale branch (1.0)

### Do these three first

1. **#1 Localize the fork's strings (S).** Cheapest visible win in the list: the accent picker is
   the fork's own feature and it is English in all 16 other languages, while `ja.json` ships as
   `{}` and is still offered. Fixing the 6 keys is hours of JSON; emptying `ja` from the supported
   list (or filling it) is one line.
2. **#2 Accent + glass on desktop and extension (M).** Both shells hard-code
   `accentColor="gray"`, so two of the four platforms show none of what makes NeoTube NeoTube. The
   palettes already exist in `lib/accent.ts`; this is mostly mapping them onto Radix tokens plus a
   pass over the two shells' CSS.
3. **#3 Fix the dead web target (M).** The only outright broken platform: `bun run web` and
   `expo export -p web` both fail today. Doing it together with #9's `FORK.syncEnabled` gating
   removes the module-scope Supabase crash instead of patching around it.

Deliberately **not** in the top three: the release work (#7). It has high user impact — the README
sells an artefact that does not exist — but publishing is a decision, not a chore, and it should
follow #1–#3 so the first tagged build is the good one.

### Sequencing note

#3 and #11 pull in opposite directions on the same code: if the sync stack is deleted (one option
under #11), #3 shrinks to the `web.output` change plus the `window`-on-SSR problem. Decide the sync
question first if either is picked up.

## 6. What was not verified

- **Android runtime.** No device/emulator session in this audit, so F2/F12/F1-level visual claims
  on Android come from reading `GlassSurface`/`settings` rather than from a running build. A
  `build-neotube.bat assembleFullDebug` + emulator pass would close that gap.
- **iOS.** Needs `EXPO_APPLE_TEAM_ID` and the app-group registration called out in
  `app.config.ts:87-98`; not attempted.
- **Desktop and extension builds.** Neither `cd desktop && bun run build` nor
  `cd extension && bun run build:all` was run here; the F2 finding is from source, not from a
  screenshot of a built shell.
- **The 16 sync tests.** They need a local Supabase stack (`bun run test:sync:local`); not started.
