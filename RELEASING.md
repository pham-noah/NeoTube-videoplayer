# Releasing NeoTube

What a release needs, in the order it bites. Everything here was checked against the tree it
sits in; where a step depends on an account or a key, that is called out.

## 1. Signing — the one thing that must change before publishing

`android/app/build.gradle` signs every release build with the **Android debug key**
(`debug.keystore`, password `android`) unless a release keystore is configured. Debug signing
is fine for sideloading onto your own phone and unusable for publishing:

- Play Store rejects a debug-signed upload;
- anyone can build an "update" that installs over your release;
- F-Droid builds and signs its own, so the store listing is the only real distribution channel.

Generate a release key **once** and keep it out of the repository:

```bash
keytool -genkeypair -v -keystore neotube-release.jks \
  -alias neotube -keyalg RSA -keysize 4096 -validity 10000
```

This repository already has one: `F:/App Projects/NeoTube/keys/neotube-release.jks` (alias
`neotube`, 4096-bit RSA, valid 10000 days), with `keystore.properties` at the repository root
pointing at it. Both are outside git. **Back up the `.jks` and the password now** — losing them
means this package id can never be updated again.

```properties
storeFile=/absolute/path/to/neotube-release.jks
storePassword=…
keyAlias=neotube
keyPassword=…
```

Both the Gradle config and `plugins/withAndroidPlugin.ts` read it: with the file present the
release build is signed with that key, without it the debug key stands in. Losing this file or
the `.jks` means you can never publish an update to that package id again — back both up
somewhere that is not this machine.

Three things about that wiring that cost time to get right, all verified on a real build:

- The file lives at the **repository root**; Gradle reads it as `../keystore.properties`
  because `rootProject` for `android/app/build.gradle` is `android/`.
- The `release` signing config must be declared **inside** the `signingConfigs {}` block. Put it
  anywhere later in `android {}` and the build fails with *"Could not get unknown property
  'release' for SigningConfig container"*, because `buildTypes` resolves it first.
- Gradle does **not** treat `keystore.properties` as a task input. Add it after a build already
  produced a debug-signed APK and `:app:packageFullRelease` stays `UP-TO-DATE`, silently handing
  back the old artifact. Delete `android/app/build/outputs/apk/full/release/*.apk` (or bump
  `versionCode`, which a release does anyway) after switching keys.

Verify what actually signed a build by comparing certificate digests, never file sizes:

```bash
JAVA="$JAVA_HOME/bin/java.exe"
JAR=$(ls -d "$ANDROID_HOME"/build-tools/*/lib/apksigner.jar | tail -1)
"$JAVA" -jar "$JAR" verify --print-certs app-full-arm64-v8a-release.apk | grep -i 'SHA-256'
```

The first release signed with this key will **not** install over any earlier build of
`dev.neotube.app`, because every one of them was debug-signed: uninstall first, and expect the
same on any device that ran a debug build. Releases after it upgrade normally.

## 2. Version

`package.json` is the source of truth for Android *and* iOS:

```json
"version": "0.7.4",     // versionName
"versionCode": 84,      // versionCode, must increase for every upload
"buildNumber": 6        // iOS CFBundleVersion
```

`app.config.ts` reads all three, and `expo prebuild` writes them into
`android/app/build.gradle`. **The Gradle values are what the APK actually ships**, so after
bumping `package.json` either re-run prebuild or mirror the two lines
(`versionCode`/`versionName`) into `android/app/build.gradle` — this repository was publishing
`0.7.1` / `8102` from a `0.7.4` / `84` tree until those two lines were corrected. The build
below prints the version, so check it rather than trusting either file alone:

```bash
BT=$(ls -d "$ANDROID_HOME"/build-tools/* | tail -1)
"$BT/aapt" dump badging android/app/build/outputs/apk/full/release/*.apk | grep '^package'
```

Bump `versionCode` for every upload, including an upload that only fixes the previous upload.

## 3. Build

```bash
build-neotube.bat assembleFullRelease -PreactNativeArchitectures=arm64-v8a
```

Produces `android/app/build/outputs/apk/full/release/app-full-arm64-v8a-release.apk`. `full`
includes the non-free dependencies; `foss` is the F-Droid variant. Splits are per-ABI, so ship
the `arm64-v8a` APK and say so — a `arm64-v8a`-only build will not install on a 32-bit device.

Check the artifact itself before shipping it:

```bash
BT=$(ls -d "$ANDROID_HOME"/build-tools/* | tail -1)
"$BT/aapt" dump badging android/app/build/outputs/apk/full/release/app-full-arm64-v8a-release.apk |
  grep -E '^package|sdkVersion|native-code'
```

## 4. Store metadata and changelogs

- `metadata/en-US/` — title, descriptions, screenshots and the app-preview video, in F-Droid's
  layout. `full_description.txt` describes the fork now; re-read it whenever a feature changes.
- `metadata/*/changelogs/<versionCode><abiCode>.txt` — one file per **shipped** version code,
  and the code is the ABI-suffixed one the APK reports, not the base: `8404` is
  `versionCode 84` + `arm64-v8a` (4), following `ext.abiCodes` in `android/app/build.gradle`.
  The series runs `2304…8404`, so a new release needs a new file named from `aapt dump badging`.
- `fastlane-config/ios/` exists for App Store uploads; there is no Android Fastfile, so Play
  uploads are manual.

## 5. Licensing and attribution (AGPL-3.0)

This is a fork of [NouTube](https://github.com/nonbili/NouTube), AGPL-3.0. Publishing binaries
or a hosted version means:

- ship the licence (`LICENSE` is upstream's, unmodified) and keep the upstream notice in
  `README.md` — it is already there, at the bottom, as "Everything below is the original
  NouTube README";
- keep the full corresponding source available, including the `android/` tree and the content
  script the APK embeds (`assets/scripts/main.bjs` is generated from `content/`, and the build
  helper regenerates it);
- do not imply upstream endorses the fork. The package id (`dev.neotube.app`), app name and
  icons are already differentiated; the F-Droid and GitHub badges in the upstream README
  section still point at NouTube's listings, so move that section under a heading that says it
  describes upstream.

## 6. Repository hygiene before the first push

Checked in the current tree: no keystore, `.env`, token or service key is tracked, and none has
ever been committed. Two things to know:

- `.gitignore` covers `.env` and `keystore.properties`; keep both out of every commit.
- The repository used to track upstream's **public Supabase project URL and anon key** in
  `extension/lib/app/supabase-client.ts` and `extension/wxt.config.ts`. Both are gone from the
  working tree. They remain in history, and that is deliberately left alone: they are
  public-by-design values (they ship inside the browser extension), they grant nothing beyond
  public reads on someone else's project, and rewriting history would break every commit hash,
  the `upstream/main` merge base that `upstream-sync.yml` depends on, and every existing tag —
  for a repository that is already pushed to `origin`. Not worth it for a non-secret.

## 7. CI

Four workflows remain, all secret-gated, so a fork runs green without publishing anything:

| Workflow | What it does on a fork |
|---|---|
| `test.yml` | typecheck, `bun test`, lint, Android module unit tests — keep |
| `build.yml` | builds the app, signs with the `SIGNING_*` secrets, uploads artifacts and release assets |
| `upstream-sync.yml` | weekly merge of NouTube into a branch + PR. Needs "Allow GitHub Actions to create and approve pull requests" in Settings → Actions |
| `release-extension.yml` | skips every store step unless the Chrome/Firefox secrets exist |

`release-desktop.yml` and `flatpak-assets.yml` were upstream's desktop channels and have been
removed: they need Apple/Flatpak credentials this fork will never have, and a pipeline that
cannot run is a pipeline that silently rots.

**Known gap, unrelated to the app:** `bunx wxt build` in `extension/` fails today with
*"Could not load extension/lib/feeder (imported by entrypoints/background.ts)"* — an `@/` import
in the extension's background entry that resolves inside `extension/` instead of the repo root.
It fails identically on the pre-change tree, so it is not a regression, but do not publish the
browser extension until it is fixed. The app and content script are unaffected.

## 8. Before you tag

1. `bun run typecheck`, `bun test`, `bunx expo lint` — all green.
2. `build-neotube.bat :nou-tube-view:testFullDebugUnitTest :nou-tube-view:testFossDebugUnitTest`.
3. Install the built APK over the previous release (same signer) and open a video — the smoke
   test that catches a broken content-script bundle.
4. `aapt dump badging` version code and ABI, `apksigner verify --print-certs` signer.
5. Changelog file for the new `versionCode`, description claims re-read, and the release notes
   mention it is a fork of NouTube.
