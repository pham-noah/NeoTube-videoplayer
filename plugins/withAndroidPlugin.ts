import { ConfigPlugin, withGradleProperties, withMainActivity } from '@expo/config-plugins'
import { withAndroidManifest, withAppBuildGradle } from '@expo/config-plugins/build/plugins/android-plugins.js'

// React Native seeds DisplayMetricsHolder from the *application* context
// (ReactRootView.init, ReactHostImpl.onConfigurationChanged), which always
// reports the default display. When the activity runs on a secondary display --
// an external monitor in desktop mode -- the density it records is the phone's,
// not the monitor's. PixelUtil derives every dp/sp -> px conversion from those
// metrics, so all text (icon fonts included) rasterises at the wrong scale while
// Fabric lays out at the correct one. Re-point the holder at this activity's
// display once React Native has initialised it.
//
// The same hooks also tell the native module which display we are on, so JS can
// mirror desktop mode onto the YouTube user agent.
const DESKTOP_MODE_ANCHOR = 'com.facebook.react.uimanager.DisplayMetricsHolder.setWindowDisplayMetrics(activityMetrics)'
const DESKTOP_MODE_NOTIFY = `    expo.modules.noutubeview.nouController.updateDesktopMode(this)`
const DISPLAY_METRICS_FIX = `
  private fun syncDisplayMetricsToCurrentDisplay() {
    val activityMetrics = resources.displayMetrics
    val screenMetrics = android.util.DisplayMetrics()
    screenMetrics.setTo(activityMetrics)
    try {
      @Suppress("DEPRECATION")
      (getSystemService(android.content.Context.WINDOW_SERVICE) as android.view.WindowManager)
        .defaultDisplay
        .getRealMetrics(screenMetrics)
    } catch (e: Exception) {
      // Non-visual context; the copy made above is a good enough fallback.
    }
    // getRealMetrics() reports real pixel bounds but the *default* display's
    // density, so keep its bounds and take the density from this activity.
    screenMetrics.density = activityMetrics.density
    screenMetrics.densityDpi = activityMetrics.densityDpi
    @Suppress("DEPRECATION")
    screenMetrics.scaledDensity = activityMetrics.scaledDensity
    screenMetrics.xdpi = activityMetrics.xdpi
    screenMetrics.ydpi = activityMetrics.ydpi
    com.facebook.react.uimanager.DisplayMetricsHolder.setScreenDisplayMetrics(screenMetrics)
    ${DESKTOP_MODE_ANCHOR}
${DESKTOP_MODE_NOTIFY}
  }

  override fun onResume() {
    super.onResume()
    syncDisplayMetricsToCurrentDisplay()
  }

  override fun onConfigurationChanged(newConfig: android.content.res.Configuration) {
    super.onConfigurationChanged(newConfig)
    syncDisplayMetricsToCurrentDisplay()
    window?.decorView?.requestLayout()
  }

  override fun onWindowFocusChanged(hasFocus: Boolean) {
    super.onWindowFocusChanged(hasFocus)
    if (hasFocus) {
      syncDisplayMetricsToCurrentDisplay()
    }
  }
`

// A deep link that arrives while the activity is being recreated -- the task is
// alive but its activity was destroyed, which is what happens when a link is
// tapped in another app while NouTube sits in the background on its media
// service -- is delivered as onNewIntent before the React root has mounted, so
// no JS listener exists yet to catch the `url` event. getIntent() is the only
// carrier left, and Android keeps that pointing at the task's *original* launch
// intent unless we update it here.
const NEW_INTENT_FIX = `
  override fun onNewIntent(intent: android.content.Intent) {
    setIntent(intent)
    super.onNewIntent(intent)
  }
`

const withDeepLinkIntentFix: ConfigPlugin = (config) =>
  withMainActivity(config, (config) => {
    if (config.modResults.language !== 'kt') {
      throw new Error('withDeepLinkIntentFix expects a Kotlin MainActivity')
    }
    if (config.modResults.contents.includes('override fun onNewIntent')) {
      return config
    }
    const anchor = 'class MainActivity : ReactActivity() {'
    if (!config.modResults.contents.includes(anchor)) {
      throw new Error('withDeepLinkIntentFix could not find the MainActivity class declaration')
    }
    config.modResults.contents = config.modResults.contents.replace(anchor, `${anchor}\n${NEW_INTENT_FIX}`)
    return config
  })

const withSecondaryDisplayMetricsFix: ConfigPlugin = (config) =>
  withMainActivity(config, (config) => {
    if (config.modResults.language !== 'kt') {
      throw new Error('withSecondaryDisplayMetricsFix expects a Kotlin MainActivity')
    }
    if (config.modResults.contents.includes('nouController.updateDesktopMode')) {
      return config
    }
    if (config.modResults.contents.includes('syncDisplayMetricsToCurrentDisplay')) {
      // A prebuild from before desktop mode reached JS: the metrics fix is
      // already there, only the notification is missing.
      if (!config.modResults.contents.includes(DESKTOP_MODE_ANCHOR)) {
        throw new Error('withSecondaryDisplayMetricsFix could not upgrade the existing fix; run expo prebuild --clean')
      }
      config.modResults.contents = config.modResults.contents.replace(
        DESKTOP_MODE_ANCHOR,
        `${DESKTOP_MODE_ANCHOR}\n${DESKTOP_MODE_NOTIFY}`,
      )
      return config
    }
    const anchor = 'class MainActivity : ReactActivity() {'
    if (!config.modResults.contents.includes(anchor)) {
      throw new Error('withSecondaryDisplayMetricsFix could not find the MainActivity class declaration')
    }
    config.modResults.contents = config.modResults.contents.replace(anchor, `${anchor}\n${DISPLAY_METRICS_FIX}`)
    return config
  })

// Android WebView does not implement the browser Picture-in-Picture API, so the
// activity callbacks are forwarded to the module that owns it
// (NouPictureInPicture) and the page shrinks itself to the video.
const PICTURE_IN_PICTURE = `
  override fun onPictureInPictureModeChanged(inPictureInPicture: Boolean, newConfig: android.content.res.Configuration) {
    super.onPictureInPictureModeChanged(inPictureInPicture, newConfig)
    expo.modules.noutubeview.NouPictureInPicture.onModeChanged(this, inPictureInPicture)
  }

  override fun onUserLeaveHint() {
    super.onUserLeaveHint()
    expo.modules.noutubeview.NouPictureInPicture.onUserLeaveHint(this)
  }
`

const withPictureInPicture: ConfigPlugin = (config) => {
  config = withAndroidManifest(config, (config) => {
    const activity = config.modResults.manifest.application?.[0]?.activity?.find(
      (activity) => activity.$['android:name'] === '.MainActivity',
    )
    if (activity) {
      activity.$['android:supportsPictureInPicture'] = 'true'
      activity.$['android:resizeableActivity'] = 'true'
    }
    return config
  })
  return withMainActivity(config, (config) => {
    const existing = /\n  \/\/ @generated begin noutube-pip[\s\S]*?\/\/ @generated end noutube-pip\n/
    config.modResults.contents = config.modResults.contents.replace(existing, '')
    const anchor = 'class MainActivity : ReactActivity() {'
    if (config.modResults.language !== 'kt' || !config.modResults.contents.includes(anchor)) {
      throw new Error('withPictureInPicture expects a Kotlin MainActivity')
    }
    config.modResults.contents = config.modResults.contents.replace(
      anchor,
      anchor + '\n  // @generated begin noutube-pip' + PICTURE_IN_PICTURE + '  // @generated end noutube-pip\n',
    )
    return config
  })
}

const withAndroidSigningConfig: ConfigPlugin = (config) => {
  config = withPictureInPicture(config)
  config = withSecondaryDisplayMetricsFix(config)
  config = withDeepLinkIntentFix(config)

  config = withAndroidManifest(config, (config: any) => {
    const app = config.modResults.manifest.application?.[0]
    if (app) {
      app.$['android:extractNativeLibs'] = 'true'
    }
    return config
  })

  // Bump JVM memory: release builds run out of the default 512m Metaspace on
  // CI, failing :app:packageRelease. See workflow run 27182763983.
  config = withGradleProperties(config, (config) => {
    const value = '-Xmx4g -XX:MaxMetaspaceSize=2g'
    const existing = config.modResults.find(
      (item): item is { type: 'property'; key: string; value: string } =>
        item.type === 'property' && item.key === 'org.gradle.jvmargs',
    )
    if (existing) {
      existing.value = value
    } else {
      config.modResults.push({ type: 'property', key: 'org.gradle.jvmargs', value })
    }
    return config
  })

  return withAppBuildGradle(config, (config) => {
    // Release signing: the keystore named by keystore.properties when there is
    // one, the debug key otherwise. Applied before the guard below so an existing
    // /android tree picks it up as well; the match is the template's own text, so
    // running it again is a no-op.
    config.modResults.contents = config.modResults.contents.replace(
      `            // Caution! In production, you need to generate your own keystore file.
            // see https://reactnative.dev/docs/signed-apk-android.
            signingConfig signingConfigs.debug`,
      `            signingConfig keystorePropertiesFile.exists() ? signingConfigs.release : signingConfigs.debug`,
    )
    // Prebuild REUSES /android and applies this mod on every run. Without a guard the
    // injected blocks stack up — a single prebuild too many leaves three copies of
    // splits/abiCodes in build.gradle, and the last copy wins.
    if (config.modResults.contents.includes('// neotube-mods-applied')) return config
    // https://www.reddit.com/r/expo/comments/1j4v323/comment/mit9b2a/
    config.modResults.contents = config.modResults.contents
      // React Native's default debuggableVariants is ["debug"], which no longer
      // matches once this plugin adds the distribution flavors. Without the
      // flavored names the flavored debug build still runs the JS bundling task
      // and loads the bundle from the APK instead of Metro, so there is no fast
      // refresh and every build pays the bundling step.
      .replace(
        'react {',
        `react {
    debuggableVariants = ["fullDebug", "fossDebug"]`,
      )
      .replace(
        'android {',
        `// neotube-mods-applied
// Release signing reads keystore.properties from the repo root, which a fresh
// checkout does not have (see RELEASING.md); the debug key stands in then.
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file("../keystore.properties")
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
ext.abiCodes = [x86:1, x86_64:2, 'armeabi-v7a':3, 'arm64-v8a': 4]

android {
    flavorDimensions "distribution"
    productFlavors {
        full {
            dimension "distribution"
        }
        foss {
            dimension "distribution"
        }
    }`,
      )
      .replace('zh-Hans', 'b+zh+Hans')
      .replace('zh-Hant', 'b+zh+Hant')
      .replace('pt-BR', 'b+pt+BR')
      // Release signing: a keystore named by keystore.properties at the repo root
      // when there is one, the debug key otherwise (see RELEASING.md). It has to
      // be declared in the signingConfigs block, which is evaluated before
      // buildTypes resolves signingConfigs.release.
      .replace(
        'signingConfigs {\n        debug {',
        `signingConfigs {
        release {
            if (keystorePropertiesFile.exists()) {
                storeFile file(keystoreProperties['storeFile'])
                storePassword keystoreProperties['storePassword']
                keyAlias keystoreProperties['keyAlias']
                keyPassword keystoreProperties['keyPassword']
            }
        }
        debug {`,
      )
      // Upstream strips `signingConfig signingConfigs.debug` from the release build
      // type here; this fork keeps a signing config, because an unsigned release
      // APK cannot be installed and removing the line is what produced
      // `app-full-*-release-unsigned.apk` after a fresh prebuild. The debug key
      // stands in when no release keystore is configured (see RELEASING.md).
      .replace(
        /androidResources \{([\s\S]*?)}/,
        `androidResources {$1}
    dependenciesInfo {
        includeInApk = false
        includeInBundle = false
    }
    splits {
        abi {
            reset()
            enable true
            universalApk false
            // reactNativeArchitectures is what decides which ABIs get compiled; without
            // this the include list forces all four and a cold build pays CMake for every
            // one of them even when -PreactNativeArchitectures=arm64-v8a asks for one.
            def wanted = (findProperty('reactNativeArchitectures') ?: '')
                .toString().split(',').collect { it.trim() }.findAll { it }
            def allAbis = project.ext.abiCodes.keySet().collect { it.toString() }
            def selected = wanted ? allAbis.findAll { wanted.contains(it) } : allAbis
            (selected ?: allAbis).each { include it }
        }
    }
    android.applicationVariants.configureEach { variant ->
        variant.outputs.each { output ->
            def baseAbiVersionCode = project.ext.abiCodes.get(output.getFilter(com.android.build.OutputFile.ABI))
            if (baseAbiVersionCode != null) {
                output.versionCodeOverride = (100 * project.android.defaultConfig.versionCode) + baseAbiVersionCode
            }
        }
    }`,
      )

    return config
  })
}

export default withAndroidSigningConfig
