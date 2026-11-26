# NeoTube polish pass — 2026-11-25

Every item from the ranked UI/UX/QoL audit, in the order it was ranked.

## Bugs, and UI that was lying

- **"History button in toolbar" did nothing.** `NouHeader` rendered History
  unconditionally while the setting defaulted to `false`. The setting is now
  honoured, the default is `true`, and a one-time `settingsVersion` migration
  turns it on for existing installs — flipping the default alone would have
  removed the only History entry point for everyone who had stored `false`.
- **No error boundary.** Any throw in the theme, i18n or settings layer gave a
  blank screen. `app/_layout.tsx` is now wrapped in one that shows the message,
  copies the report, and restarts. It reads no theme tokens on purpose: the
  theme layer is one of the things that can throw.
- **Crash on an empty pinned-script list.** `nIf()` takes a node, so its JSX is
  built whether the guard passes or not: `pinnedScripts[0].name` threw for any
  session with no script pinned to the header.
- **`Clear` and `Open URL`** were hardcoded English; both go through i18n now.
- **Queue "Clear"** wiped the queue on one tap with no confirm and no undo. It now
  arms on the first tap, runs on the second, and is undoable from the toast.
- **History "Clear"** cleared both YouTube and YouTube Music while only showing
  one; it now clears what the list shows, and is undoable.
- **Toasts overlapped.** `Toast` and `UndoToast` were two components absolutely
  positioned in the same corner, so an undo and a plain message drawn together
  landed on top of each other. One `ToastHost` now renders both queues.

## Interaction

- **Press feedback** on every icon button (a wash while held), plus a haptic tick.
- **Swipe to remove** on History, Queue and Bookmarks, with the undo toast as the
  confirmation. `PanResponder`, not gesture-handler, so it works in the desktop
  renderer too and a vertical scroll is never stolen.
- **Long-press** opens a bottom sheet with the row's actions, mirroring the
  existing overflow menu instead of duplicating it.
- **Empty states** for Library, History, Queue and failed searches — one
  component, so all four answer the same way.
- **Toolbar crowding**: optional leading controls collapse into the overflow menu
  instead of the old `gap-0` trick that put up to seventeen glyphs shoulder to
  shoulder. History, Library and the page actions stay on the bar.

## Search

- **Settings search** across all 103 labels: `lib/settings-index.ts` carries the
  index, `searchSettings` scores label hits above keyword hits, and each result
  says which page it lives on. A test asserts every indexed label and section
  still exists in `en.json`.
- **Library search** filters the current tab, hides folders while searching (a
  folder is a place to look, not a thing to find), and keeps the folder view
  unsearched.
- **History search** over the visible home's history.

## Consistency

- `ToolsModal` used the old indigo `NouSwitch` while every settings row used
  `GlassSwitch`; it uses the shared one, with the same switch role and state.
- The web default theme was forced to dark. It now follows the system and the
  theme setting, which exists for exactly this.
- Accessibility labels and roles on the header controls, list rows, feed rows,
  the settings back/search buttons and the sheet's close button.

## Known, not fixed here

- The Expo web preview (`bun run web`) cannot boot: it has no Radix `Theme`
  provider, so the first menu throws, and `lib/main-client.ts` expects
  `window.electron`, which only the Electron preload supplies. The desktop
  renderer (`desktop/`, Vite) mounts its own `Theme` and is unaffected. This was
  broken before this pass.
- 44 lint warnings remain, all pre-existing classes (`set-state-in-effect`,
  exhaustive-deps); the count is down from 47.

Verified: `bun run typecheck` clean, `bun test` 521 pass / 16 skip / 0 fail,
`bunx expo lint` 0 errors.

## Addendum: run on an emulator (2026-11-26)

Built a x86_64 debug APK from a short-path copy of the tree (`C:\nt`, because
MAX_PATH on `F:\App Projects\...` breaks the reanimated CMake build) and drove
it on `neotube_35` (Android 15, Pixel 6) through Metro. Confirmed by screenshot:
the main page boots with no crash, the toolbar collapses optional leading
controls into the overflow menu, the History toggle hides and restores its
icon, settings search opens and typing "glass" finds *Liquid Glass theme* and
jumps to Appearance, and the History and Library sheets show their empty states.

Running it turned up three things static checks could not:

- **A red sliver on every row.** `SwipeRow` mounted its action plate
  unconditionally behind a translucent row surface, so 88px of red showed at
  rest. The plate now exists only while a drag is in flight.
- **The undo toast was unreachable.** `BaseModal` is a native `Modal` window, so
  the app-level `ToastHost` painted behind the sheet — only a clipped sliver
  showed and its Undo button could not be hit. `UndoToastInline` now renders
  inside the sheet (as its last child) and `ToastHost` skips undo toasts while
  a sheet is open (`openModalCount$`), so there is exactly one chip.
- Its chip was also clipped by the screen edge; it now clears the floating
  bottom toolbar.

Swipe → remove → Undo → row restored is verified on the device. So are the
bookmark flow (star → the video appears in Library → Videos with the title and
thumbnail from the page) and the row action sheet on a saved row.

Two more fixes came out of that round:

- A second full-height sheet opened from inside the first one (long press on a
  row) read as a panel clipped by its parent. `BaseModal` now takes
  `presentation="bottom"`, a compact card with a solid surface, and the action
  sheet uses it. Its `flex-1` ScrollView also collapsed inside a content-sized
  card and cut the last action off; it no longer grows, only shrinks.
- That card's `max-h-[76%]` had no parent height to resolve against, so the
  card clipped rather than scrolled; the cap is now computed from the window.

The dev-build LogBox banner sits over the bottom of any sheet in debug builds —
it hid the last action row in the screenshots and is absent from a release APK.

Not exercised: queue clear/reorder, PiP, and haptics (nothing to feel from a
screenshot).

## Third pass — 2026-11-26

Eight more items from the audit, in the same file set.

- **Android back now closes a sheet.** `BaseModal` with `useNativeModal={false}`
  is only a `View`; back went to the activity, so the second press quit the app
  while the sheet was still on screen. `BaseModal` registers a
  `hardwareBackPress` handler whenever it is not a native modal and calls
  `onRequestClose || onClose`. Registered last, so the newest sheet takes it.
- **Load failures surface with a retry.** The native view already emitted
  `load-error` / `load-error-cleared`; `MainPageContent` keeps one record per
  webview and only renders the foreground one, with a `canReload` guard so a
  failed POST is not replayed as a GET.
- **Thumbnails pulse while they load.** `RetryImage` draws an absolutely
  positioned placeholder under the image with a slow opacity loop; it stops on
  load, and the retry chip still appears if the fetch fails.
- **Selection got thicker.** The Library header gains select-all/deselect-all,
  and long-pressing a second row selects the span between it and the first pick
  (`onRangeSelect` in `BookmarkItem`, `selectRangeTo` in `LibraryModal`). A
  selection tap also ticks haptics.
- **Sort and folder persist.** They moved out of component state into
  `states/settings.ts` (`librarySort`, `libraryFolderId`), so closing the sheet
  or restarting the app no longer resets the view. The folder is derived from
  the live folder list, so a folder deleted elsewhere drops back to the root
  instead of showing an empty pane.
- **Queue drag scrolls itself.** `QueueItem` reports when a drag sits in the top
  or bottom margin; `QueueModal` nudges its `FlatList` 24 px per tick using an
  absolute offset it tracks from `onScroll` (`scrollToOffset` is not relative).
- **Settings show what you changed.** New `settings.changedHint` page lists every
  key that differs from `SETTINGS_DEFAULTS`, with the current value and a
  per-key reset — the generic form of the per-section reset the audit asked for.
  `changedSettings` / `humanizeSettingKey` live in `lib/settings-defaults.ts` and
  are unit-tested (`lib/settings-defaults.test.ts`).
- **Sheets are isolated for screen readers.** `BaseModal` marks its surface as a
  modal view so TalkBack does not walk the screen behind it.

Verified on the emulator (`neotube_35`, dev build against Metro):

- Back closes the Library and leaves the app running.
- Select-all picks every row; long-pressing a second row picks the range
  ("2 selected").
- Delete → Undo restores *both* rows of a batch delete. This was open from the
  last pass: those taps had landed after the 5 s window, and the dev-only LogBox
  banner sits over the chip and swallows taps. Re-run with the banner dismissed
  and a longer window, the button works; the 5 s window is restored in the
  shipped code.
- Sort survives a force-stop: "Oldest first" is still checked after relaunch.
- The "Changed from defaults" row counts live changes, the page lists them with
  their values, per-key reset empties it, and the empty state appears.

Not exercised: queue drag and its edge autoscroll (nothing reachable fills the
queue — run later, see below), and TalkBack behaviour of the modal isolation.

The page error card was exercised by firing the message the native view emits
from `onReceivedError` through the same handler the view's own event feeds:
the card appears with the description and a Retry, and Retry clears it and
navigates (YouTube answered "Video unavailable" for the fake id). A real
main-frame failure could not be staged on a dev build, because the bundle
itself comes over the network — cutting wifi kills the app before the page can
fail — and tapping a related video is a same-document route change that never
reaches `onReceivedError`.

## Queue drag, exercised — 2026-11-26

The queue is filled by the injected page, so the drag had never been run. A
throwaway dev-only seed (fifteen rows, removed before this commit) let the
emulator drive it, and it found a real bug straight away.

- **The drop index ignored the autoscroll.** `QueueItem` derived the target row
  from `gesture.dy` alone, but holding the finger in the bottom margin scrolls
  the list underneath it — so a row dragged to the end of a twelve-row list
  landed wherever the finger had travelled, not where it was pointing.
  `QueueModal`'s `nudge` now returns the pixels it actually moved (0 once the
  list bottoms out) and the row accumulates them; the sum is what the index is
  computed from. The arithmetic moved into `lib/queue-drag.ts` as `dropIndex`
  with five tests, because a synthetic swipe is a poor way to check rounding
  and clamping.

What the device showed:

- A 310 px drag moved a row one slot; an 880 px drag moved it four. Rounding
  and the row height line up.
- A drag to the bottom margin and a four-second hold scrolled the list to its
  end and left the row last — with the fix. The same gesture before it put the
  row in the middle of the list and scrambled the order.
- Clearing the queue raised the "Queue cleared / Undo" toast on the main page,
  which is the app-level `ToastHost` path rather than the in-sheet one.

Still unproven: the drag against a *real* queue (these rows were seeded, so a
row's press-to-play and the ⋮ menu were not exercised on queue data), and
haptics.


## About: updates, credits and source — 2026-11-26

The About page now carries the same shape as Kairn's: a version block, an update
check against the app's own GitHub releases, a credit row, and a source-code
group. Everything is hidden rather than duplicated when it cannot work — the
update rows only appear on a native build whose `FORK.repoUrl` names a
repository.

Why GitHub releases and not an app store: NeoTube ships as an APK attached to a
release, so the release list is the only thing that knows what the newest build
is. `lib/app-update.ts` reads `/repos/<slug>/releases/latest`, keeps the tag
without its leading `v`, takes the `.apk` asset's URL and size, and compares
versions numerically (`1.10.0` is newer than `1.9.0`; a missing segment counts as
zero). It is a plain function of (current version, fetched JSON) so the
comparison and the response handling are tested with no network, and the fetch
is injectable for the same reason.

The sheet puts the notes in front of the download rather than installing from a
toast: a version jump is something a person agrees to. Notes are GitHub
markdown, and the app has no renderer, so `lib/notes-blocks.ts` turns them into
headings, paragraphs and bullets and drops the inline marks — a `##` or a pair
of backticks in a dialog reads as a bug, not as emphasis. The download opens in
the browser, because handing an APK to Android's installer needs a FileProvider
and the install permission, which is a second downloader carried by every build
for one screen.

`FORK.repoUrl` now defaults to `pham-noah/NeoTube-videoplayer` instead of empty.
That is the *published* repository, not the private development one: an
unauthenticated release check against a private repository answers 404, so the
phone would decide it is up to date forever. `FORK.ownerUrl` is separate, and
`FORK.ownerUrl` is separate from it: the fork's owner and the person who wrote
the app are not always the same account. `EXPO_PUBLIC_NEOTUBE_REPO` still
overrides the repository, which is how the "update available" path was
exercised below.

Checking is opt-in and once per visit. An update check on every launch is a
request to GitHub nobody asked for, and the About page is where someone goes
when they want to know.

### Exercised on the emulator

- With `EXPO_PUBLIC_NEOTUBE_REPO` pointed at a repository that has releases —
  version 0.1.0 against a real v1.1.11 — "Check for updates" fetched, compared
  and opened the sheet: "You have v0.1.0; v1.1.11 is out.", "6.2 MB · Android
  package", the notes rendered as headings and paragraphs, Later / Get the
  update pinned at the bottom.
- "Get the update" handed the APK URL to the browser.
- "Later" closed the sheet and left the About page as it was, and so did the
  Android back gesture — the sheet is the topmost thing, so back spends itself
  on it rather than on the settings page behind.
- Toggling "Check automatically" on survived a force-stop and relaunch, and
  opening About then opened the sheet by itself without a tap.
- Against the default repository, which has no published release, the check
  raised "No release was found for this repository." and showed no sheet.

Still unproven: an actual install from the downloaded APK (the check stops at
handing the URL to the browser), and rate limiting — GitHub allows 60
unauthenticated requests an hour, which is far more than an opt-in check needs
but would surface as `HTTP 403` in the toast.
