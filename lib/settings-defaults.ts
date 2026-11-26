import type { SettingsSnapshot } from '@/states/settings'

/*
 * The values `settings$` starts with, so "reset" does not mean "delete the app
 * data and start over". Only plain values live here — `setLanguage`, `home`
 * and friends are behaviour on the store, not settings the user picked.
 *
 * Kept apart from states/settings.ts so a test can assert that every key here
 * is a real setting, and so the store's initialiser stays readable.
 */
/**
 * Every key whose value differs from the default. Used by the "Changed from
 * defaults" page so the user can see what they actually configured instead of
 * hunting through eight screens.
 */
export const changedSettings = (current: Partial<SettingsSnapshot>): (keyof SettingsSnapshot)[] =>
  (Object.keys(SETTINGS_DEFAULTS) as (keyof SettingsSnapshot)[]).filter(
    (key) => JSON.stringify(current[key] ?? null) !== JSON.stringify(SETTINGS_DEFAULTS[key]),
  )

/** `autoHideHeader` -> `Auto hide header`, for keys with no translated label. */
export const humanizeSettingKey = (key: string): string => {
  const words = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .toLowerCase()
    .split(' ')
    .filter(Boolean)
  return words.map((word, index) => (index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word)).join(' ')
}

export const SETTINGS_DEFAULTS: Partial<SettingsSnapshot> = {
  language: null,
  home: 'yt',
  autoHideHeader: false,
  autoHideSidebar: false,
  doubleTapToToggleHeader: false,
  translateComments: false,
  translationTargetLanguage: null,
  hideToolbarWhenScrolled: false,
  headerPosition: 'top',
  feedsEnabled: true,
  checkUpdates: false,
  feedNotificationsEnabled: false,
  feedPosts: false,
  hideShorts: true,
  hideShortsInNavbar: false,
  hideMixPlaylist: false,
  keepHistory: true,
  replaceWatchNavigation: false,
  forceLandscape: false,
  miniPlayer: false,
  miniPlayerPosition: { x: 1, y: 1 },
  pictureInPicture: false,
  preferH264: false,
  clickbaitThumbnail: 'default',
  playbackRate: 1,
  playbackQuality: 'auto',
  disableAutoplay: false,
  restoreOnStart: false,
  pullToRefreshEnabled: true,
  sponsorBlock: true,
  blockAds: true,
  discordPresence: false,
  showDislikes: false,
  showOriginalVideoTitle: false,
  useSystemCaptionStyle: false,
  showBackButtonInHeader: false,
  showForwardButtonInHeader: false,
  showHomeButtonInHeader: false,
  showHistoryButtonInHeader: true,
  showReloadButtonInHeader: false,
  showPlaybackSpeedControl: false,
  showPlaybackQualityControl: false,
  showSleepTimerButtonInHeader: false,
  showLibraryButtonInHeader: true,
  showStarButtonInHeader: true,
  showMediaNotificationPrevButton: true,
  showMediaNotificationNextButton: true,
  showMediaNotificationRewindButton: true,
  showMediaNotificationForwardButton: true,
  showMediaNotificationSpeedButton: false,
  showMediaNotificationCloseButton: false,
  userAgent: '',
  desktopMode: false,
  desktopModeYT: false,
  defaultZoom: 100,
  librarySort: 'newest',
  libraryFolderId: null,
  theme: null,
  dynamicColor: false,
  accent: 'aurora',
  glassTheme: true,
  reduceEffects: false,
  proxyEnabled: false,
  proxyType: 'http',
  proxyHost: '',
  proxyPort: '',
}
