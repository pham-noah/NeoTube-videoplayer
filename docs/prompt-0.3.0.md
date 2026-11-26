# Prompt for the 0.3.0 session

Paste everything below into a fresh Hermes session.

---

You are working on **NeoTube**, an Android YouTube front-end forked from
NouTube, on this machine.

**Repo under work:** `F:\App Projects\NeoTube\neotube` (git origin
`pham-noah/NeoTube`, **private**, branch `main`, HEAD `4caa866`).
**Public/published copy:** `F:\App Projects\NeoTube\public` (git
`pham-noah/NeoTube-videoplayer`, branch `main`, tag `v0.2.0` at `697ae51`).
Source lives in dev and is snapshotted there for each release; `android/` is
gitignored in both, so it is regenerated rather than tracked.

## Where things stand

`0.2.0` shipped on 2026-11-26 as versionCode `89` (APK reports `8904`),
arm64-v8a, signed with the project key, released at
https://github.com/pham-noah/NeoTube-videoplayer/releases/tag/v0.2.0 and
announced in the `neotube-videoplayer` Discord channel. It was installed and
exercised on the emulator: feed loads, About reads v0.2.0, the release check
against the public repo answers correctly.

## Mission: 0.3.0, in this order

1. **Write the build down before touching features.** A release build cannot
   run from `F:\...` (Windows `LongPathsEnabled=0`; ninja fails on the
   reanimated/gesture-handler codegen object paths). Today it only works in a
   short-path mirror with CMake staged outside the project. Turn that into
   `scripts/` — one command, documented — so the next release isn't an hour of
   archaeology. Verify by running it from a clean state.
2. **Merge upstream `nonbili/NouTube`.** Local `upstream/main` is `v0.7.11`,
   we are **32 commits behind**, merge base `v0.7.8`. It carries fixes for
   YouTube Music "media next" polluting the app queue, feed previews landing in
   watch history, restored TLS checks, yt-dlp init errors reported to the user,
   and a configurable/ordered toolbar. That toolbar work collides with this
   fork's header and its queue-drag reorder — resolve deliberately, then prove
   the header, the queue drag and the player on a device.
3. **Make the updater an installer.** Today "Get the update" opens the APK URL
   in a browser. Download it in-app with progress, declare a `FileProvider`,
   request `REQUEST_INSTALL_PACKAGES`, and hand the file to the system installer
   with a notification — Kairn already does exactly this; read its
   implementation first. Prove it end-to-end, including cancellation and a
   failed download.
4. **Get CI publishing.** `.github/workflows/build.yml` builds on a `v*` tag and
   then dies at `apksigner` because `ALIAS`, `KEY_STORE_PASSWORD`,
   `KEY_PASSWORD` and `SIGNING_KEY` are unset on `pham-noah/NeoTube-videoplayer`.
   Those are secrets Noah must add — ask him once, then confirm a tag publishes
   without a local build. Note the existing CI trap: signing silently fell back
   to a garbage keystore, so always verify the published asset's certificate,
   never the exit code alone.

Do not start anything from the 0.4.0 list (dead web target, accent/glass on
desktop + extension, 48 lint warnings, glass-CSS drift guard, the 16 never-run
sync tests) unless Noah says so.

## Building and releasing

- `bun run bundle` regenerates `assets/scripts/main.bjs` (gitignored, 180 KB);
  the release build needs it.
- Build: mirror the tree to `C:\nt`, copy `keystore.properties` in (gitignored),
  and keep this local-only edit in `C:\nt\android\app\build.gradle`:
  `externalNativeBuild { cmake { buildStagingDirectory = file("C:/b") } }`.
  Then `assembleFullRelease -PreactNativeArchitectures=arm64-v8a` with
  `JAVA_HOME="C:/Program Files/Android/Android Studio/jbr"` and
  `ANDROID_HOME=C:/Users/Noah/AppData/Local/Android/Sdk`. ~14 minutes.
  Artifact: `android/app/build/outputs/apk/full/release/app-full-arm64-v8a-release.apk`.
  **Never commit that staging line into the published tree.**
- Keystore: `F:\App Projects\NeoTube\keys\neotube-release.jks`, alias `neotube`,
  password in the repo's `keystore.properties`. Never print either value.
  Release certificate SHA-256 is `b9445bef8c830ccff4bcb4eb86ece37f1517f7e6c5a45078e6af692530caebc4`
  — an APK that doesn't match it cannot install over a shipped build.
- Verify: `aapt2 dump badging` for `versionName`/`versionCode`/`native-code`,
  `apksigner verify --print-certs` for the digest, `sha256sum` on the exact
  bytes you publish, and a real install + launch on `emulator-5554`.
- Gates: `bun run typecheck`, `bun test` (579 tests, 0 fail at 0.2.0),
  `bunx expo lint` (48 warnings, 0 errors). Clear output means the check ran —
  several of these tools print nothing when clean.

## Rules

- Do not release, tag, bump a version, or push a live change to the public repo
  unless Noah asks. When he does ask for a release, it ships with its Discord
  post to `neotube-videoplayer` (channel id `1570067164507938876`) — one message,
  no second question.
- Never claim a UI change works because it typechecks. Prove it on the device:
  drive it with `adb shell input`, dump `uiautomator` when the coordinates are
  uncertain, screenshot, and look at the screenshot.
- State plainly what is proven and what was never run. Retract wrong claims
  immediately and say so.
- Known false alarms on this stack: the dev build can sit on a black screen for
  one relaunch after Metro restarts; the LogBox banner overlays the bottom of
  the screen and has been mistaken for a missing control (`adb shell input tap
  1043 2208` dismisses it); `adb` screenshots downscale to 540×1200, so multiply
  vision coordinates by 2.
- The emulator currently has the **release** APK (`dev.neotube.app`), not a
  debug build — reinstall the debug APK before any Metro session.
- `C:\neo` junction, `C:\nt`, and AVD `neotube_35` must not be deleted without
  explicit approval.

## Definition of done for 0.3.0

`0.3.0` = versionCode `90` (`9004`), built by the new script, merging upstream
cleanly with the fork's UI intact, an updater that installs its own download,
and a tag that publishes through CI without a local build — each of those
proven by a command whose output you can quote back, plus a device pass over
the header, queue, player and About.
