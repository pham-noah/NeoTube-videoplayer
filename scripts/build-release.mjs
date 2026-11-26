#!/usr/bin/env bun
/**
 * NeoTube release build — one command, from any state.
 *
 *   bun scripts/build-release.mjs            # sync, build, verify, copy to ../release
 *   bun scripts/build-release.mjs --clean    # throw the mirror away first (proves from scratch)
 *   bun scripts/build-release.mjs --verify-only path/to/app.apk
 *
 * Why this exists, in three lines:
 *
 *  1. The tree cannot be built where it lives. `android/app/.cxx` puts ninja's
 *     object paths for the react-native codegen sources over Windows' 260
 *     character limit (LongPathsEnabled is 0 and needs admin to change), so the
 *     build runs from a short-path mirror with CMake staged outside the project.
 *  2. `android/` and `keystore.properties` are git-ignored, so a fresh mirror has
 *     neither: the mirror keeps `android/` and this script copies the keystore in
 *     and proves the signer afterwards.
 *  3. The version the APK ships comes from the *generated* `android/app/build.gradle`,
 *     not from `package.json`. A bump that skipped `expo prebuild` ships the old
 *     number under a new tag, so the two lines are mirrored here and the built
 *     artefact is read back with aapt2.
 *
 * Nothing in this script is a project decision. Every edit it applies lands in the
 * mirror only; the tracked tree is never modified.
 */

import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dir, '..')
const DEFAULTS = {
  mirror: 'C:/nt',
  staging: 'C:/b',
  out: path.resolve(ROOT, '..', 'release'),
}

/** Certificate of the key that has signed every published build. An APK that does
 *  not match it cannot install over a shipped copy, so it is checked, not assumed. */
const RELEASE_CERT_SHA256 = 'b9445bef8c830ccff4bcb4eb86ece37f1517f7e6c5a45078e6af692530caebc4'

const APK_NAME = (versionName) => `NeoTube-${versionName}-arm64-v8a.apk`

// ---------------------------------------------------------------- plumbing

const log = (msg = '') => process.stdout.write(`${msg}\n`)
const step = (msg) => log(`\n== ${msg}`)

function die(msg) {
  log(`\nFAILED: ${msg}`)
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  // 64 MB, not the default 1 MB: robocopy and gradle both print more than that on
// a real build, and an ENOBUFS here surfaces as "exited null" with no message.
const res = spawnSync(cmd, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts })
  if (res.status !== 0) {
    die(
      `${cmd} ${args.join(' ')} exited ${res.status}${res.error ? ` (${res.error.message})` : ''}\n${res.stdout ?? ''}\n${res.stderr ?? ''}`,
    )
  }
  return res.stdout ?? ''
}

function which(exe) {
  const res = spawnSync(process.platform === 'win32' ? 'where' : 'which', [exe], { encoding: 'utf8' })
  if (res.status !== 0) return null
  return (res.stdout ?? '').split(/\r?\n/).filter(Boolean)[0] ?? null
}

function parseArgs(argv) {
  const opts = { ...DEFAULTS, clean: false, purge: true, bundle: true, prebuild: true, verifyOnly: null, expectCert: RELEASE_CERT_SHA256 }
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i]
    // Both `--flag value` and `--flag=value`; a path with spaces is the common case.
    const value = () => (arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[++i])
    if (arg === '--clean') opts.clean = true
    else if (arg === '--no-bundle') opts.bundle = false
    else if (arg === '--no-prebuild') opts.prebuild = false
    else if (arg === '--no-purge') opts.purge = false
    else if (arg === '--help' || arg === '-h') { printHelp(); process.exit(0) }
    else if (arg === '--mirror' || arg.startsWith('--mirror=')) opts.mirror = path.resolve(value())
    else if (arg === '--staging' || arg.startsWith('--staging=')) opts.staging = path.resolve(value())
    else if (arg === '--out' || arg.startsWith('--out=')) opts.out = path.resolve(value())
    else if (arg === '--expect-cert' || arg.startsWith('--expect-cert=')) opts.expectCert = value().toLowerCase()
    else if (arg === '--verify-only' || arg.startsWith('--verify-only=')) opts.verifyOnly = path.resolve(value())
    else if (arg === '--print-toolchain') opts.printToolchain = true
    else die(`unknown argument: ${arg} (try --help)`)
  }
  return opts
}

function printHelp() {
  log(`NeoTube release build

  bun scripts/build-release.mjs [options]

  --clean             delete the mirror first (a build from nothing, ~20 min)
  --no-bundle         skip \`bun run bundle\` (only when assets/scripts/main.bjs is fresh)
  --no-prebuild       reuse android/ from the source tree instead of regenerating it
--no-purge          copy over an existing mirror without deleting extras (a warm
                    mirror's build outputs are long enough paths that robocopy's
                    purge step fails on them; a clean mirror is still the default)
  --mirror=<dir>      short-path build tree (default ${DEFAULTS.mirror}; must stay short)
  --staging=<dir>     CMake staging dir (default ${DEFAULTS.staging})
  --out=<dir>         where the verified APK is copied (default ${DEFAULTS.out})
  --verify-only=<apk> verify an existing APK and exit — used on published assets too
  --print-toolchain   print the JDK, SDK and build-tools it would use, then exit
  --expect-cert=<hex> signer SHA-256 to require (default: the published release key)

  Env: JAVA_HOME, ANDROID_HOME (detected from the usual install locations if unset).`)
}

// ---------------------------------------------------------------- toolchain

// React Native's Android build wants a JDK 17 or 21 toolchain. A machine whose
// JAVA_HOME points at a newer JDK (this one had JDK 25) fails deep inside AGP
// with a message about class file versions, so the version is checked here and a
// newer JAVA_HOME is skipped in favour of Android Studio's bundled JBR.
function javaMajorVersion(dir) {
  const release = path.join(dir, 'release')
  if (!fs.existsSync(release)) return null
  const match = /JAVA_VERSION="(\d+)/.exec(fs.readFileSync(release, 'utf8'))
  return match ? Number(match[1]) : null
}

function findJavaHome() {
  const javaBin = process.platform === 'win32' ? 'java.exe' : 'java'
  const candidates = [
    process.env.JAVA_HOME,
    'C:/Program Files/Android/Android Studio/jbr',
    'C:/Program Files/Java/jbr',
  ].filter(Boolean)
  const rejected = []
  for (const dir of candidates) {
    if (!fs.existsSync(path.join(dir, 'bin', javaBin))) continue
    const major = javaMajorVersion(dir)
    if (major !== null && (major < 17 || major > 21)) {
      rejected.push(`${dir} (Java ${major})`)
      continue
    }
    return dir
  }
  die(
    rejected.length
      ? `no JDK 17-21 found; skipped ${rejected.join(', ')}. Set JAVA_HOME to Android Studio's jbr.`
      : "no JDK found: set JAVA_HOME (Android Studio's jbr is fine)",
  )
}

function findAndroidHome() {
  const candidates = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    path.join(os.homedir(), 'AppData/Local/Android/Sdk'),
    path.join(os.homedir(), 'Android/Sdk'),
  ].filter(Boolean)
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'build-tools'))) return dir
  }
  die('no Android SDK found: set ANDROID_HOME')
}

function newestBuildTools(androidHome) {
  const base = path.join(androidHome, 'build-tools')
  const versions = fs
    .readdirSync(base)
    .filter((v) => /^\d+\.\d+\.\d+$/.test(v))
    .sort((a, b) => {
      const pa = a.split('.').map(Number)
      const pb = b.split('.').map(Number)
      for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] - pb[i]
      return 0
    })
  if (!versions.length) die(`no build-tools under ${base}`)
  return path.join(base, versions.at(-1))
}

// ---------------------------------------------------------------- verify

function sha256(file) {
  const hash = crypto.createHash('sha256')
  hash.update(fs.readFileSync(file))
  return hash.digest('hex')
}

/** Read what the file itself says. This is the arbiter — never package.json. */
function inspectApk(apk, toolchain) {
  if (!fs.existsSync(apk)) die(`no APK at ${apk}`)
  const aapt2 = path.join(toolchain.buildTools, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2')
  const badging = run(aapt2, ['dump', 'badging', apk])

  const pkg = badging.match(/^package: name='([^']+)' versionCode='(\d+)' versionName='([^']*)'/m)
  if (!pkg) die(`could not read package info from ${apk}`)
  const nativeCode = badging.match(/^native-code: (.+)$/m)?.[1].replace(/'/g, '') ?? '(none)'
  const sdk = badging.match(/^(?:sdkVersion|minSdkVersion):'(\d+)'/m)?.[1] ?? '?'

  const apksignerJar = path.join(toolchain.buildTools, 'lib', 'apksigner.jar')
  const java = path.join(toolchain.javaHome, 'bin', process.platform === 'win32' ? 'java.exe' : 'java')
  const certs = run(java, ['-jar', apksignerJar, 'verify', '--print-certs', apk])
  // apksigner words this as "Signer #1 certificate …" on older build-tools and
  // "V2 Signer: certificate …" on newer ones; take either.
  const signer = certs.match(/(?:Signer #1|V\d+ Signer): certificate SHA-256 digest: ([0-9a-f]+)/i)?.[1].toLowerCase()
  if (!signer) die(`could not read the signer of ${apk}\n${certs}`)

  return {
    apk,
    file: path.basename(apk),
    packageName: pkg[1],
    versionCode: Number(pkg[2]),
    versionName: pkg[3],
    nativeCode,
    minSdk: sdk,
    signer,
    bytes: fs.statSync(apk).size,
    sha256: sha256(apk),
  }
}

function reportApk(info, expectCert) {
  log(`  file        ${info.file}`)
  log(`  package     ${info.packageName}`)
  log(`  version     ${info.versionName} (versionCode ${info.versionCode})`)
  log(`  abi         ${info.nativeCode}   minSdk ${info.minSdk}`)
  log(`  bytes       ${info.bytes}`)
  log(`  sha256      ${info.sha256}`)
  log(`  signer      ${info.signer}`)
  const ok = info.signer === expectCert
  log(`  signer ok   ${ok ? 'yes — matches the published release key' : `NO — expected ${expectCert}`}`)
  return ok
}

// ---------------------------------------------------------------- mirror

const MIRROR_EXCLUDES = [
  '.git',
  '.gradle',
  'android\\build',
  'android\\app\\build',
  'android\\app\\.cxx', // CMake state belongs to the mirror; copying it across is slower and worth nothing
  // `bun link` leaves these as symlinks to this checkout. Copied as symlinks they point
  // back at the long path the mirror exists to avoid; the build resolves none of them.
  'node_modules\\noutube',
  'node_modules\\noutube-desktop',
  'node_modules\\noutube-extension',
]

function syncMirror(opts) {
  step(`mirroring ${ROOT} -> ${opts.mirror}`)
  fs.mkdirSync(opts.mirror, { recursive: true })
  // /MIR keeps the mirror an exact copy (stale files deleted); excluded dirs are left
  // alone, which is what lets the native build cache survive between runs.
  const res = spawnSync(
    'robocopy',
    [ROOT, opts.mirror, opts.purge ? '/MIR' : '/E', '/XJ', '/R:1', '/W:1', '/MT:16', '/NFL', '/NDL', '/NJH', '/NJS', '/NP',
      '/XD', ...MIRROR_EXCLUDES],
    // Robocopy lists every file it touches on a warm mirror -- tens of thousands
    // of lines. The default 1 MB stdout buffer overflows, and an ENOBUFS comes back
    // as "status null", which reads like robocopy crashed.
    { encoding: 'utf8', maxBuffer: 128 * 1024 * 1024 },
  )
  // robocopy: 0 = nothing to do, 1..7 = files copied, >=8 = failure.
  if (res.status === null || res.status >= 8) {
    if (res.error) {
      die(`robocopy could not run: ${res.error.message}`)
    }
    // The one failure a warm mirror actually hits: a binary the previous build
    // left running (`node_modules/.bin/expo.exe`, a lightningcss `.node`) is held
    // open by something outside this script, so it cannot be overwritten. If the
    // file is already sitting in the mirror, the copy is a no-op and the build is
    // unaffected -- but only then. Anything genuinely missing is still fatal.
    // [^\r\n]+ and not (.+?)\s*$: robocopy separates lines with CRLF, and \s
    // spans it, so the lazy capture walked into the following "*EXTRA File" line
    // and every locked file looked missing under a nonsense relative path.
    const locked = [...(res.stdout ?? '').matchAll(/ERROR \d+ \(0x[0-9a-f]+\) Copying File ([^\r\n]+)/gi)]
      .map((match) => match[1].replace(/\s+$/, ''))
    const missing = []
    for (const source of locked) {
      const relative = path.relative(ROOT, source)
      if (!relative.startsWith('..') && !fs.existsSync(path.join(opts.mirror, relative))) {
        missing.push(relative)
      }
    }
    if (!locked.length || missing.length) {
      die(
        `robocopy failed (${res.status}) and ${missing.length ? `could not copy ${missing.join(', ')}` : 'printed no file errors'}: ${res.stderr ?? ''}`,
      )
    }
    log(`  ${locked.length} file(s) locked by another process, already present in the mirror:`)
    for (const source of locked) log(`    ${path.relative(ROOT, source)}`)
  }
  for (const required of ['package.json', 'android/app/build.gradle', 'node_modules', 'assets']) {
    if (!fs.existsSync(path.join(opts.mirror, required))) {
      die(`mirror is missing ${required} — does ${ROOT} look complete?`)
    }
  }
  log('  ok')
}

function installKeystore(opts) {
  step('installing keystore.properties')
  const src = path.join(ROOT, 'keystore.properties')
  if (!fs.existsSync(src)) die(`${src} is missing — the build would silently fall back to the debug key`)
  fs.copyFileSync(src, path.join(opts.mirror, 'keystore.properties'))

  const props = Object.fromEntries(
    fs.readFileSync(src, 'utf8').split(/\r?\n/).filter((l) => l.includes('=') && !l.trim().startsWith('#'))
      .map((l) => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
  )
  for (const key of ['storeFile', 'storePassword', 'keyAlias', 'keyPassword']) {
    if (!props[key]) die(`keystore.properties has no ${key}`)
  }
  if (!fs.existsSync(props.storeFile)) die(`keystore.properties storeFile does not exist: ${props.storeFile}`)
  log(`  ok — alias ${props.keyAlias}, key ${path.basename(props.storeFile)}`)
}

/**
 * android/ is generated and gitignored. Regenerating it here is what CI does, and
 * it keeps a stale or merge-contaminated project -- a build.gradle left over from
 * a conflict, an ABI list that no longer matches -- out of the release.
 */
function prebuildAndroid(opts, toolchain) {
  if (!opts.prebuild) {
    log('  skipped (--no-prebuild)')
    return
  }
  step('generating android/ with expo prebuild')
  const env = { ...process.env, ANDROID_HOME: toolchain.androidHome, ANDROID_SDK_ROOT: toolchain.androidHome }
  const res = spawnSync('bun', ['x', 'expo', 'prebuild', '-p', 'android', '--clean', '--no-install'], {
    cwd: opts.mirror,
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
  })
  if (res.status !== 0) die('`expo prebuild` failed')
  log('  ok')
}

/** The generated gradle is what stamps the APK. Mirror package.json into it. */
function syncVersion(opts) {
  step('syncing version into the generated Gradle project')
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'))
  const file = path.join(opts.mirror, 'android/app/build.gradle')
  let text = fs.readFileSync(file, 'utf8')
  const before = text.match(/versionCode (\d+)[\s\S]{0,80}versionName "([^"]*)"/)
  text = text.replace(/^(\s*)versionCode \d+$/m, `$1versionCode ${pkg.versionCode}`)
  text = text.replace(/^(\s*)versionName "[^"]*"$/m, `$1versionName "${pkg.version}"`)
  fs.writeFileSync(file, text)
  if (!before) die('could not find versionCode/versionName in android/app/build.gradle')
  if (before[1] !== String(pkg.versionCode) || before[2] !== pkg.version) {
    log(`  gradle said ${before[2]} (${before[1]}), package.json says ${pkg.version} (${pkg.versionCode}) — mirrored`)
    log('  NOTE: the tracked tree\'s generated android/ is stale; run `bun expo prebuild -p android` if you care about it')
  } else {
    log(`  ok — ${pkg.version} (${pkg.versionCode})`)
  }
  if (pkg.versionCode < 84) log(`  WARNING: versionCode ${pkg.versionCode} is lower than a published build`)
}

/** Gradle's react {} block shells out to `node`; a PATH without it fails the build late. */
function pinNode(opts) {
  const node = which('node')
  if (!node) die('node is not on PATH (needed for the react-native Gradle block)')
  const file = path.join(opts.mirror, 'android/app/build.gradle')
  const pinned = node.replace(/\\/g, '/')
  const text = fs.readFileSync(file, 'utf8')
  const next = text.replace(/(["'])node\1(, *)/g, (m, q, rest) => `"${pinned}"${rest}`)
  if (next !== text) fs.writeFileSync(file, next)
  log(`  node pinned at ${pinned}${next !== text ? '' : ' (already)'}`)
}

/** CMake staging outside the 260-character wall. Mirror-only edit. */
function stageCmake(opts) {
  step('placing CMake staging outside the project')
  const file = path.join(opts.mirror, 'android/app/build.gradle')
  let text = fs.readFileSync(file, 'utf8')
  if (text.includes('buildStagingDirectory')) {
    log('  ok — already staged')
    return
  }
  const anchor = /^(\s*)buildToolsVersion rootProject\.ext\.buildToolsVersion$/m
  if (!anchor.test(text)) die('could not find the buildToolsVersion anchor in android/app/build.gradle')
  const block = [
    '    // Local build-host workaround, not a project decision: the default CMake staging',
    '    // directory lives under android/app/.cxx, which pushes ninja object paths for the',
    '    // react-native codegen sources past Windows\' 260-character limit on this machine',
    '    // (LongPathsEnabled is 0 and enabling it needs admin). Staging elsewhere shortens',
    '    // the prefix enough to build.',
    '    externalNativeBuild {',
    '        cmake {',
    `            buildStagingDirectory = file("${opts.staging.replace(/\\/g, '/')}")`,
    '        }',
    '    }',
    '',
  ].join('\n')
  text = text.replace(anchor, `${block}$1buildToolsVersion rootProject.ext.buildToolsVersion`)
  fs.writeFileSync(file, text)
  fs.mkdirSync(opts.staging, { recursive: true })
  log(`  ok — staging at ${opts.staging}`)
}

function buildBundle(opts) {
  step('bundling the injected content script')
  const res = spawnSync('bun', ['run', 'bundle'], { cwd: opts.mirror, stdio: 'inherit', shell: process.platform === 'win32' })
  if (res.status !== 0) die('`bun run bundle` failed')
  const out = path.join(opts.mirror, 'assets/scripts/main.bjs')
  if (!fs.existsSync(out)) die(`${out} was not produced`)
  const size = fs.statSync(out).size
  if (size < 50_000) die(`${out} is only ${size} bytes — that is not a bundle`)
  log(`  ok — main.bjs ${size} bytes`)
}

function gradeBuild(opts, toolchain) {
  step('building app-full-arm64-v8a-release.apk (about 14 minutes)')
  const logDir = path.join(opts.out, 'logs')
  fs.mkdirSync(logDir, { recursive: true })
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const logFile = path.join(logDir, `build-${stamp}.log`)
  log(`  log ${logFile}`)

  const gradlew = path.join(opts.mirror, 'android', process.platform === 'win32' ? 'gradlew.bat' : 'gradlew')
  const env = {
    ...process.env,
    JAVA_HOME: toolchain.javaHome,
    ANDROID_HOME: toolchain.androidHome,
    ANDROID_SDK_ROOT: toolchain.androidHome,
    PATH: [path.dirname(which('node') ?? ''), path.join(toolchain.javaHome, 'bin'), process.env.PATH].join(path.delimiter),
  }
  const fd = fs.openSync(logFile, 'w')
  const child = spawn(
    gradlew,
    ['assembleFullRelease', '-PreactNativeArchitectures=arm64-v8a', '--console=plain'],
    { cwd: path.join(opts.mirror, 'android'), env, shell: process.platform === 'win32', stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const echo = (chunk) => {
    fs.writeSync(fd, chunk)
    for (const line of String(chunk).split(/\r?\n/)) {
      if (/^> Task :app:(package|assemble|merge)|^BUILD |^FAILURE|^> Task :react-native.*:|error:|^What went wrong/.test(line)) log(`  ${line.trim()}`)
    }
  }
  child.stdout.on('data', echo)
  child.stderr.on('data', echo)

  return new Promise((resolve) => {
    child.on('close', (code) => {
      fs.closeSync(fd)
      if (code !== 0) die(`gradle exited ${code} — see ${logFile}`)
      resolve()
    })
  })
}

// ---------------------------------------------------------------- main

async function main() {
  const opts = parseArgs(process.argv.slice(2))
  const toolchain = { javaHome: findJavaHome(), androidHome: findAndroidHome() }
  toolchain.buildTools = newestBuildTools(toolchain.androidHome)

  if (opts.printToolchain) {
    log(`java       ${toolchain.javaHome}`)
    log(`android    ${toolchain.androidHome}`)
    log(`buildTools ${toolchain.buildTools}`)
    return
  }

  if (opts.verifyOnly) {
    step(`verifying ${opts.verifyOnly}`)
    const ok = reportApk(inspectApk(opts.verifyOnly, toolchain), opts.expectCert)
    if (!ok) die('signer does not match the published release key')
    return
  }

  log(`NeoTube release build`)
  log(`  source   ${ROOT}`)
  log(`  mirror   ${opts.mirror}`)
  log(`  staging  ${opts.staging}`)
  log(`  out      ${opts.out}`)
  log(`  java     ${toolchain.javaHome}`)

  if (opts.clean) {
    step(`deleting the mirror ${opts.mirror}`)
    fs.rmSync(opts.mirror, { recursive: true, force: true })
    log('  ok')
  }

  syncMirror(opts)
  installKeystore(opts)
  prebuildAndroid(opts, toolchain)
  syncVersion(opts)
  pinNode(opts)
  stageCmake(opts)
  if (opts.bundle) buildBundle(opts)
  await gradeBuild(opts, toolchain)

  step('verifying the artefact the build produced')
  const built = path.join(
    opts.mirror,
    'android/app/build/outputs/apk/full/release/app-full-arm64-v8a-release.apk',
  )
  const info = inspectApk(built, toolchain)
  const ok = reportApk(info, opts.expectCert)
  if (!ok) die('the build is not signed with the release key — do not publish it')

  const dest = path.join(opts.out, APK_NAME(info.versionName))
  fs.mkdirSync(opts.out, { recursive: true })
  fs.copyFileSync(built, dest)
  const destHash = sha256(dest)
  if (destHash !== info.sha256) die('copy differs from the build — check the disk')
  log(`\n  copied      ${dest}`)
  log(`  identical   yes (sha256 ${destHash.slice(0, 16)}…)`)
  log(`\nNext: install it, then publish.`)
}

main()
