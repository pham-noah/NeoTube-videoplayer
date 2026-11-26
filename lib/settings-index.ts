import type { SettingsPage } from '@/components/modal/SettingsTree'

/*
 * Settings had 103 labels behind eleven pages and no way to look for one: the
 * only route to "glass" was to guess that it lives under Appearance.
 *
 * The index is written out rather than scraped from the rows, because the rows
 * are ordinary TSX in five different components -- rendering them at query time
 * to find them is not possible, and importing a second copy of the page tree to
 * inspect it would cost more than the list does. A row that is added to a page
 * and missing here is caught by lib/settings-index.test.ts.
 */
export type SettingsEntry = {
  /* Which page the row is on. */
  page: SettingsPage
  /* The label as the row shows it. */
  labelKey: string
  /* The section heading above the row, shown as the result's subtitle, so a hit
   * on "Reload button" reads as Appearance > Toolbar buttons. */
  sectionKey?: string
  /* Extra words people look for that are not in the label itself. */
  keywords?: string[]
}

export const settingsIndex: SettingsEntry[] = [
  // Root: the pages themselves, so searching "proxy" can also offer the page
  // that holds it when the row names it differently.
  { page: 'content', labelKey: 'settings.preferences', keywords: ['youtube'] },
  { page: 'blocklist', labelKey: 'settings.blocklist.label', keywords: ['channel', 'filter'] },
  { page: 'styles', labelKey: 'settings.userStyles.label', keywords: ['css'] },
  { page: 'preferences', labelKey: 'settings.preferences', keywords: ['app'] },
  { page: 'appearance', labelKey: 'settings.appearance', keywords: ['theme', 'dark', 'light'] },
  { page: 'transfer', labelKey: 'settings.transfer', keywords: ['import', 'export', 'backup'] },
  { page: 'tools', labelKey: 'settings.tools', keywords: ['download', 'cookie', 'yt-dlp'] },

  // YouTube
  { page: 'content', labelKey: 'settings.hideShorts', sectionKey: 'settings.preferencesDistractionFree', keywords: ['shorts'] },
  { page: 'content', labelKey: 'settings.blockAds.label', sectionKey: 'settings.preferencesContent', keywords: ['ads', 'adblock'] },
  { page: 'content', labelKey: 'settings.disableAutoplay', sectionKey: 'settings.preferencesPlayback', keywords: ['autoplay'] },
  { page: 'content', labelKey: 'settings.preferH264', sectionKey: 'settings.preferencesPlayback', keywords: ['codec', 'video'] },
  { page: 'content', labelKey: 'settings.miniPlayer', sectionKey: 'settings.preferencesPlayback', keywords: ['mini'] },
  { page: 'content', labelKey: 'settings.pictureInPicture', sectionKey: 'settings.preferencesPlayback', keywords: ['pip'] },
  { page: 'content', labelKey: 'settings.showOriginalVideoTitle', sectionKey: 'settings.preferencesPlayback', keywords: ['title'] },
  { page: 'content', labelKey: 'settings.showDislikes', sectionKey: 'settings.preferencesPlayback', keywords: ['dislike', 'rating'] },
  { page: 'content', labelKey: 'settings.systemCaptionStyle.label', sectionKey: 'settings.preferencesPlayback', keywords: ['captions', 'subtitles'] },
  { page: 'content', labelKey: 'settings.systemCaptionStyle.openSystemSettings', sectionKey: 'settings.preferencesPlayback' },
  { page: 'content', labelKey: 'settings.zoom.label', sectionKey: 'settings.zoom.label', keywords: ['scale', 'size'] },
  { page: 'content', labelKey: 'settings.preferencesComments', sectionKey: 'settings.preferencesComments', keywords: ['comments'] },

  // App preferences
  { page: 'preferences', labelKey: 'settings.restoreOnStart', sectionKey: 'settings.preferencesGeneral' },
  { page: 'preferences', labelKey: 'settings.pullToRefresh', sectionKey: 'settings.preferencesGeneral', keywords: ['refresh'] },
  { page: 'preferences', labelKey: 'settings.watchHistory', sectionKey: 'settings.preferencesGeneral', keywords: ['history'] },
  { page: 'preferences', labelKey: 'settings.replaceWatchNavigation', sectionKey: 'settings.preferencesGeneral' },
  { page: 'preferences', labelKey: 'settings.forceLandscape', sectionKey: 'settings.preferencesGeneral', keywords: ['rotation', 'orientation'] },
  { page: 'preferences', labelKey: 'settings.proxy.label', sectionKey: 'settings.proxy.label', keywords: ['proxy', 'network'] },
  { page: 'preferences', labelKey: 'settings.proxy.enabled', sectionKey: 'settings.proxy.label', keywords: ['proxy'] },

  // Appearance
  { page: 'appearance', labelKey: 'settings.theme.label', sectionKey: 'settings.theme.label', keywords: ['dark', 'light', 'system'] },
  { page: 'appearance', labelKey: 'settings.language.label', sectionKey: 'settings.language.label', keywords: ['locale'] },
  { page: 'appearance', labelKey: 'settings.glass.label', sectionKey: 'settings.glass.label', keywords: ['blur', 'translucent'] },
  { page: 'appearance', labelKey: 'settings.reduceEffects.label', sectionKey: 'settings.reduceEffects.label', keywords: ['animation', 'motion'] },
  { page: 'appearance', labelKey: 'settings.dynamicColor.label', sectionKey: 'settings.dynamicColor.label', keywords: ['android', 'material you'] },
  { page: 'appearance', labelKey: 'settings.autoHideHeader', sectionKey: 'settings.toolbar', keywords: ['header', 'toolbar'] },
  { page: 'appearance', labelKey: 'settings.doubleTapToToggleHeader', sectionKey: 'settings.toolbar', keywords: ['header'] },
  { page: 'appearance', labelKey: 'settings.hideToolbarWhenScrolled', sectionKey: 'settings.toolbar', keywords: ['header'] },
  { page: 'appearance', labelKey: 'settings.showLibraryButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['bookmark', 'library'] },
  { page: 'appearance', labelKey: 'settings.showStarButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['star'] },
  { page: 'appearance', labelKey: 'settings.showHomeButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['home'] },
  { page: 'appearance', labelKey: 'settings.showBackButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['back'] },
  { page: 'appearance', labelKey: 'settings.showForwardButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['forward'] },
  { page: 'appearance', labelKey: 'settings.showReloadButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['reload', 'refresh'] },
  { page: 'appearance', labelKey: 'settings.showHistoryButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['history'] },
  { page: 'appearance', labelKey: 'settings.showSleepTimerButtonInHeader', sectionKey: 'settings.toolbarButtons', keywords: ['sleep', 'timer'] },
  { page: 'appearance', labelKey: 'settings.channelsFeed', sectionKey: 'settings.toolbarButtons', keywords: ['feed'] },
  { page: 'appearance', labelKey: 'settings.feedPosts', sectionKey: 'settings.toolbarButtons', keywords: ['community', 'posts'] },
  { page: 'appearance', labelKey: 'settings.showMediaNotificationPrevButton', sectionKey: 'settings.mediaNotificationButtons', keywords: ['notification'] },
  { page: 'appearance', labelKey: 'settings.showMediaNotificationNextButton', sectionKey: 'settings.mediaNotificationButtons', keywords: ['notification'] },
  { page: 'appearance', labelKey: 'settings.showMediaNotificationRewindButton', sectionKey: 'settings.mediaNotificationButtons', keywords: ['notification'] },
  { page: 'appearance', labelKey: 'settings.showMediaNotificationForwardButton', sectionKey: 'settings.mediaNotificationButtons', keywords: ['notification'] },
  { page: 'appearance', labelKey: 'settings.showMediaNotificationSpeedButton', sectionKey: 'settings.mediaNotificationButtons', keywords: ['notification'] },
  { page: 'appearance', labelKey: 'settings.showMediaNotificationCloseButton', sectionKey: 'settings.mediaNotificationButtons', keywords: ['notification'] },
  { page: 'appearance', labelKey: 'settings.autoHideSidebar', sectionKey: 'settings.sidebar', keywords: ['sidebar'] },

  // Tools
  { page: 'home', labelKey: 'settings.resetAll', keywords: ['default', 'defaults', 'restore', 'factory'] },
  { page: 'changed', labelKey: 'settings.changed', keywords: ['changed', 'modified', 'custom', 'differs'] },

  // Tools
  { page: 'tools', labelKey: 'settings.webview.clearLabel', sectionKey: 'settings.tools', keywords: ['webview', 'clear'] },
  { page: 'tools', labelKey: 'settings.injectCookie', sectionKey: 'settings.tools', keywords: ['cookie', 'login'] },
  { page: 'tools', labelKey: 'settings.userAgent.title', sectionKey: 'settings.tools', keywords: ['user agent'] },
  { page: 'tools', labelKey: 'buttons.updateYtDlp', sectionKey: 'settings.tools', keywords: ['yt-dlp', 'update'] },
  { page: 'tools', labelKey: 'sleepTimer.label', sectionKey: 'settings.tools', keywords: ['sleep', 'timer'] },

  // Transfer
  { page: 'transfer', labelKey: 'settings.importList', sectionKey: 'buttons.import', keywords: ['import', 'subscriptions'] },
  { page: 'transfer', labelKey: 'settings.importTakeout', sectionKey: 'buttons.import', keywords: ['import', 'takeout'] },
  { page: 'transfer', labelKey: 'settings.importSettings', sectionKey: 'buttons.import', keywords: ['import'] },
  { page: 'transfer', labelKey: 'settings.exportLabel', sectionKey: 'buttons.export', keywords: ['export'] },
  { page: 'transfer', labelKey: 'settings.exportSettings', sectionKey: 'buttons.export', keywords: ['export'] },
  { page: 'transfer', labelKey: 'settings.feedNotifications', sectionKey: 'buttons.export', keywords: ['notification'] },
]

/* Case- and accent-insensitive: "Länder" and "lander" both have to find the
 * language row, and the device keyboard is not always the one the label uses. */
const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()

export const searchSettings = (query: string, translate: (key: string) => string): SettingsEntry[] => {
  const needle = fold(query.trim())
  if (!needle) {
    return []
  }
  const words = needle.split(/\s+/).filter(Boolean)

  return settingsIndex
    .map((entry) => {
      const haystack = fold(
        [translate(entry.labelKey), entry.sectionKey ? translate(entry.sectionKey) : '', ...(entry.keywords ?? [])].join(' '),
      )
      const label = fold(translate(entry.labelKey))
      // A match on the label outranks a match on a keyword; both beat a match
      // that only hits the section heading.
      const score = label.includes(needle) ? 0 : words.every((word) => haystack.includes(word)) ? 1 : 2
      return { entry, score }
    })
    .filter((hit) => hit.score < 2)
    .sort((a, b) => a.score - b.score)
    .map((hit) => hit.entry)
}
