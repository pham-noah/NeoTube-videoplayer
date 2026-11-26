import 'ts-node/register'

import { ExpoConfig } from 'expo/config'
import { version, versionCode, buildNumber } from './package.json'

const intentFilters = [
  {
    autoVerify: false,
    action: 'VIEW',
    data: ['youtube.com', 'm.youtube.com', 'music.youtube.com', 'www.youtube.com', 'youtu.be'].map((host) => ({
      scheme: 'https',
      host,
    })),
    category: ['BROWSABLE', 'DEFAULT'],
  },
]

module.exports = ({ config }: { config: ExpoConfig }) => {
  return {
    name: 'NeoTube',
    slug: 'neotube',
    version,
    // Portrait baseline. The watch page is exempted at runtime so the player's
    // rotate-to-fullscreen keeps working -- see setPortraitLock in
    // modules/nou-tube-view.
    orientation: 'portrait',
    icon: './assets/images/icon.png',
    scheme: 'noutube',
    userInterfaceStyle: 'automatic',
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'dev.neotube.app',
      // Your Apple Developer team, for iOS builds only (EXPO_APPLE_TEAM_ID).
      appleTeamId: process.env.EXPO_APPLE_TEAM_ID,
      buildNumber,
      infoPlist: {
        // The player keeps going with the screen off and on the lock screen.
        UIBackgroundModes: ['audio'],
        NSMicrophoneUsageDescription: 'Voice search on YouTube uses the microphone.',
        // Only standard HTTPS, so builds skip the export compliance prompt.
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      versionCode,
      permissions: ['RECORD_AUDIO', 'MODIFY_AUDIO_SETTINGS', 'POST_NOTIFICATIONS', 'WAKE_LOCK'],
      adaptiveIcon: {
        foregroundImage: './assets/images/adaptive-icon.png',
        backgroundColor: '#0b0d14',
      },
      predictiveBackGestureEnabled: false,
      package: 'dev.neotube.app',
      intentFilters,
    },
    web: {
      bundler: 'metro',
      // 'single' (SPA), not 'static': static output renders every route to HTML
      // in Node first, and this app's entry graph assumes a browser (the WebView
      // shell, expo-sharing, `window.electron`). Both `expo export -p web` and
      // `expo start --web` failed on the server render, so the advertised web
      // target produced nothing. An SPA renders in the browser where those
      // globals exist; nothing here is crawlable HTML anyway.
      output: 'single',
      favicon: './assets/images/favicon.png',
    },
    plugins: [
      './plugins/withAndroidPlugin.ts',
      './plugins/withIosPlugin.ts',
      'expo-router',
      'expo-background-task',
      'expo-notifications',
      [
        'expo-splash-screen',
        {
          image: './assets/images/splash-icon.png',
          imageWidth: 200,
          resizeMode: 'contain',
          backgroundColor: '#0b0d14',
          dark: {
            image: './assets/images/splash-icon.png',
            backgroundColor: '#0b0d14',
          },
        },
      ],
      'expo-asset',
      'expo-font',
      'expo-status-bar',
      'expo-image',
      [
        'expo-localization',
        {
          supportedLocales: ['en', 'de', 'es', 'fr', 'gl', 'id', 'it', 'pl', 'pt', 'pt-BR', 'ru', 'tr', 'uk', 'vi', 'zh-Hans', 'zh-Hant'],
        },
      ],
      [
        'expo-sharing',
        {
          // No ios entry: the share extension needs the app group
          // group.jp.nonbili.noutube registered with the Apple team before it
          // can be signed. Until then lib/incoming-share.ios.ts stands in.
          android: {
            enabled: true,
            singleShareMimeTypes: ['text/*'],
          },
        },
      ],
      'expo-web-browser',
    ],
    experiments: {
      typedRoutes: true,
    },
  }
}
