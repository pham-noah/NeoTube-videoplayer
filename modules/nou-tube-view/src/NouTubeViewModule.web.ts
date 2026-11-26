import { registerWebModule, NativeModule } from 'expo'

class NouTubeViewModule extends NativeModule {
  setSettings() {}

  setPortraitLock() {}

  setScrollTracking() {}

  extractTakeoutCsvFiles() {
    throw new Error('extractTakeoutCsvFiles is only available on Android')
  }

  async setSleepTimer() {
    throw new Error('sleep timer is only available on Android')
  }

  async clearSleepTimer() {
    throw new Error('sleep timer is only available on Android')
  }

  async getSleepTimerRemainingMs() {
    return null
  }

  getSystemCaptionStyle() {
    return null
  }

  canInstallApk() {
    return false
  }

  openInstallSettings() {}

  async installApk() {
    throw new Error('installApk is only available on Android')
  }
}

export default registerWebModule(NouTubeViewModule, 'NouTubeViewModule')
