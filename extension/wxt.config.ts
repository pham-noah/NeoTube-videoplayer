import { defineConfig } from 'wxt'
import { resolve } from 'node:path'
import react from '@vitejs/plugin-react'
import reactNativeWeb from 'vite-plugin-react-native-web'
import type { Plugin } from 'vite'

const extensionDir = process.cwd()
// Vite reports ids with forward slashes on every platform, while resolve() gives
// backslashes on Windows. Comparing the two unnormalised meant `id.startsWith`
// and every `appReplacements` lookup below silently missed on Windows: app
// modules resolved through WXT's own `@` (so `@/lib/feeder` became
// extension/lib/feeder and the build died), and the app's own data layer was
// bundled instead of the extension's seams. Normalise once, here.
const rootDir = resolve(extensionDir, '..').replaceAll('\\', '/')
const forward = (path: string) => path.replaceAll('\\', '/')

/*
 * WXT owns the `@` alias and points it at this directory, but the content
 * bundle and the shared lib/ it pulls in are written against the app's `@`,
 * which is the repo root. Rewriting the specifier before resolution leaves
 * both meanings intact instead of fighting over one alias.
 */
const rewriteRootAliases = {
  name: 'noutube-rewrite-root-aliases',
  enforce: 'pre' as const,
  transform(code: string, id: string) {
    if (!id.startsWith(rootDir) || id.includes('node_modules')) {
      return
    }
    return code.replaceAll("'@/", "'noutube-root/").replaceAll('"@/', '"noutube-root/')
  },
}

/*
 * The app's data layer assumes a phone or an Electron renderer. These are the
 * seams where the extension takes over: persistence, the Supabase client, the
 * main-process bridge, the react-native helpers and the toaster.
 *
 * Matched on the resolved file rather than the specifier, because the app
 * reaches these modules through both `@/lib/...` and relative paths, and an
 * alias only ever sees the specifier.
 */
const persistMemory = forward(resolve(extensionDir, 'lib/app/persist-memory.ts'))
const appReplacements = new Map([
  [forward(resolve(rootDir, 'states/indexeddb.ts')), persistMemory],
  [forward(resolve(rootDir, 'lib/supabase/client.ts')), forward(resolve(extensionDir, 'lib/app/supabase-client.ts'))],
  [forward(resolve(rootDir, 'lib/main-client.ts')), forward(resolve(extensionDir, 'lib/app/main-client.ts'))],
  [forward(resolve(rootDir, 'lib/utils.ts')), forward(resolve(extensionDir, 'lib/app/utils.ts'))],
  [forward(resolve(rootDir, 'lib/toast.ts')), forward(resolve(extensionDir, 'lib/app/toast.ts'))],
])

/*
 * Copied from the desktop renderer: Expo Font's web server context imports
 * node:async_hooks, which a browser bundle cannot resolve. The extension only
 * needs the package's no-op context; browser font loading stays unchanged.
 */
const expoFontBrowserContext = (): Plugin => ({
  name: 'expo-font-browser-context',
  enforce: 'pre',
  resolveId(source, importer) {
    if (source === './serverContext' && importer?.replace(/\\/g, '/').includes('/expo-font/build/')) {
      return resolve(importer, '../serverContext.js')
    }
    return null
  },
})

/*
 * Copied from the desktop renderer: react-native-css-interop declares
 * `"sideEffects": false`, so Rollup drops the require() that registers
 * View/Text/etc. into the interop registry and every className is silently lost.
 */
const keepCssInteropSideEffects = (): Plugin => ({
  name: 'keep-css-interop-side-effects',
  enforce: 'pre',
  async resolveId(source, importer, options) {
    if (importer?.includes('react-native-css-interop') || source.includes('react-native-css-interop')) {
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      if (resolved?.id.includes('react-native-css-interop')) {
        return { ...resolved, moduleSideEffects: true }
      }
      return resolved
    }
    return null
  },
})

const replaceAppModules = {
  name: 'noutube-app-replacements',
  enforce: 'pre' as const,
  async resolveId(this: any, source: string, importer: string | undefined, options: any) {
    if (source === '@legendapp/state/persist-plugins/mmkv') {
      return persistMemory
    }
    const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
    const replacement = resolved && appReplacements.get(resolved.id)
    return replacement ? { ...resolved, id: replacement } : resolved
  },
}

export default defineConfig({
  // The react module pulls @vitejs/plugin-react 6, which wants Vite 8; the repo
  // is on Vite 7, so the plugin is wired up directly instead.
  vite: () => ({
    define: {
      // The app's components branch on it through expo's platform helpers.
      'process.env.EXPO_OS': JSON.stringify('web'),
    },
    plugins: [
      rewriteRootAliases,
      replaceAppModules,
      expoFontBrowserContext(),
      keepCssInteropSideEffects(),
      react({
        babel: {
          // NativeWind resolves `className` on react-native components through
          // its own JSX runtime.
          plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic', importSource: 'nativewind' }]],
        },
      }),
      reactNativeWeb(),
    ],
    resolve: {
      alias: {
        'noutube-root': rootDir,
        'expo-modules-core-polyfill': resolve(rootDir, 'node_modules/expo-modules-core/src/polyfill/index.web.ts'),
      },
    },
  }),
  // AMO reviewers must be able to rebuild the submission from the sources zip,
  // so it carries every root directory the extension imports plus the
  // workspace manifests `bun install` needs to honor bun.lock.
  zip: {
    sourcesRoot: rootDir,
    includeSources: [
      'package.json',
      'bun.lock',
      'bunfig.toml',
      'tsconfig.json',
      'tailwind.config.js',
      'nativewind-env.d.ts',
      'desktop/package.json',
      'assets/images/**',
      'components/**',
      'content/**',
      'lib/**',
      'locales/**',
      'modules/**',
      'states/**',
      'extension/**',
    ],
  },
  manifest: ({ browser }) => ({
    name: 'NeoTube',
    description: 'Make YouTube yours with cleaner browsing, enhanced playback, personalized feeds, bookmarks, and powerful customization tools.',
    icons: { 16: 'icon/16.png', 32: 'icon/32.png', 48: 'icon/48.png', 128: 'icon/128.png' },
    permissions: ['storage', 'userScripts', 'alarms', 'identity', 'contextMenus'],
    host_permissions: [
      'https://www.youtube.com/*',
      'https://m.youtube.com/*',
      'https://music.youtube.com/*',
      'https://www.youtube-nocookie.com/*',
      'https://a.inks.page/*',
      'https://noutube.inks.page/*',
    ],
    browser_specific_settings:
      browser === 'firefox'
        ? ({
            gecko: {
              id: 'browser-extension@noutube.nonbili.jp',
              strict_min_version: '140.0',
              data_collection_permissions: { required: ['none'] },
            },
          } as any)
        : undefined,
  }),
})
