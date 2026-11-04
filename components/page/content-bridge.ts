import { ui$ } from '@/states/ui'
import { settings$ } from '@/states/settings'
import { isWeb } from '@/lib/utils'
import { getSystemCaptionStyle } from '@/lib/system-captions'
import type { WebviewTag } from 'electron'

export const YOUTUBE_HOSTS = [
  'm.youtube.com',
  'music.youtube.com',
  'www.youtube.com',
  'youtube.com',
  'youtu.be',
]

export const executeQuietly = (webview: WebviewTag | null, script: string) => {
  try {
    void webview?.executeJavaScript(script).catch?.(() => undefined)
  } catch {}
}

/* Tells the page which half of the split watch view it is, so it can hand over
 * the links the other half owns (see content/split-view.ts). */
export const splitRolePrelude = (enabled: boolean, role: 'browse' | 'player', mini = false) =>
  enabled ? `window.NouTubeRole = ${JSON.stringify(role)};window.NouTubeNativeMini = ${mini};` : ''

export const getContentSettingsSnapshot = () => {
  const {
    sponsorBlock,
    blockAds,
    playbackRate,
    playbackQuality,
    disableAutoplay,
    miniPlayer,
    pictureInPicture,
    showDislikes,
    showOriginalVideoTitle,
    doubleTapToToggleHeader,
    translateComments,
    translationTargetLanguage,
    replaceWatchNavigation,
    useSystemCaptionStyle,
  } = settings$.get()
  return {
    sponsorBlock,
    blockAds,
    playbackRate,
    playbackQuality,
    disableAutoplay,
    miniPlayer,
    pictureInPicture,
    showDislikes,
    showOriginalVideoTitle,
    doubleTapToToggleHeader,
    translateComments: !isWeb && translateComments && Boolean(translationTargetLanguage),
    replaceWatchNavigation,
    captionStyle: useSystemCaptionStyle ? getSystemCaptionStyle() : null,
  }
}

export const onScroll = ({
  dy,
  y,
  autoHideHeader,
  hideToolbarWhenScrolled,
}: {
  dy?: number
  y?: number
  autoHideHeader: boolean
  hideToolbarWhenScrolled: boolean
}) => {
  if (hideToolbarWhenScrolled && typeof y === 'number') {
    ui$.headerShown.set(y <= 0)
    return
  }

  if (!autoHideHeader || typeof dy !== 'number') {
    return
  }

  const headerHeight = ui$.headerHeight.get()
  const headerShown = ui$.headerShown.get()
  if (Math.abs(dy) <= headerHeight / 2) {
    return
  }
  if (dy < 0 && headerShown) {
    ui$.headerShown.set(false)
  } else if (dy > 0 && !headerShown) {
    ui$.headerShown.set(true)
  }
}

let restored = false

export const markRestored = () => {
  restored = true
}

export const hasRestored = () => restored

export function restoreLastPlaying(webview: any) {
  if (webview && settings$.restoreOnStart.get() && !restored) {
    restored = true
    webview.executeJavaScript('window.NouTube.restoreLastPlaying()')
  }
}
