import { useCallback, useEffect, useRef } from 'react'
import { useValue, useObserveEffect } from '@legendapp/state/react'
import { ui$ } from '@/states/ui'
import { tabs$, type Tab } from '@/states/tabs'
import { settings$ } from '@/states/settings'
import { ObservableHint } from '@legendapp/state'
import { mainClient } from '@/lib/main-client'
import { buildUserScriptSources, userScriptsInvalidationSource } from '@/lib/user-styles'
import { getUserStylesSnapshot, userStyles$ } from '@/states/user-styles'
import { blocklist$, getBlocklistSnapshot } from '@/states/blocklist'
import { handleShortcuts } from '@/desktop/src/renderer/lib/shortcuts'
import { NouTubeView } from '@/modules/nou-tube-view'
import { StyleSheet, View } from 'react-native'
import { GoogleLoginNotice } from './GoogleLoginNotice'
import { executeQuietly, getContentSettingsSnapshot, YOUTUBE_HOSTS } from './content-bridge'
import type { WebviewTag } from 'electron'

/* One Electron webview per tab: the desktop shell keeps every tab alive and
 * swaps visibility, which is why the listeners are all registered per element. */
export const DesktopTabView: React.FC<{
  tab: Tab
  index: number
  isActive: boolean
  contentJs: string
  userAgent: string
  onMessage: (type: string, data: any) => void
  buildPrelude: () => string
}> = ({ tab, index, isActive, contentJs, userAgent, onMessage, buildPrelude }) => {
  const webviewRef = useRef<WebviewTag>(null)
  const readyRef = useRef(false)
  const initialUrlRef = useRef(tab.pageUrl || tab.url)
  const lastRequestedUrlRef = useRef(tab.url)
  const hideShorts = useValue(settings$.hideShorts)
  const preferH264 = useValue(settings$.preferH264)
  const clickbaitThumbnail = useValue(settings$.clickbaitThumbnail)

  const syncUserStylesToWebview = useCallback(() => {
    if (!readyRef.current) return
    const snapshot = getUserStylesSnapshot()
    const value = JSON.stringify(snapshot)
    executeQuietly(webviewRef.current, `window.NouTube?.setUserStyles?.(${value})`)
    // Scripts enabled since the page loaded still need their first run; the
    // invalidation stands down anything still pending from the previous set,
    // and the in-page guard keeps what already ran from running twice.
    executeQuietly(webviewRef.current, userScriptsInvalidationSource)
    for (const source of buildUserScriptSources(snapshot)) {
      executeQuietly(webviewRef.current, source)
    }
  }, [])

  const syncBlocklistToWebview = useCallback(() => {
    if (!readyRef.current) return
    const snapshot = getBlocklistSnapshot()
    const value = JSON.stringify(snapshot)
    executeQuietly(webviewRef.current, `window.NouTube?.setBlocklist?.(${value})`)
    void mainClient.setBlocklist(snapshot)
  }, [])

  const syncSettingsToWebview = useCallback(() => {
    if (!readyRef.current) return
    const settings = getContentSettingsSnapshot()
    const value = JSON.stringify(settings)
    executeQuietly(
      webviewRef.current,
      `localStorage.setItem('nou:settings', '${value}'); window.NouTube?.setSettings?.(${value})`,
    )
  }, [])

  const toggleShorts = useCallback((hide?: boolean) => {
    if (!readyRef.current) return
    executeQuietly(webviewRef.current, hide ? 'window.NouTube?.hideShorts?.()' : 'window.NouTube?.showShorts?.()')
  }, [])

  const refreshCanGoBack = useCallback(() => {
    const webview = webviewRef.current
    if (!webview) return
    try {
      const canGoBack = webview.canGoBack()
      tabs$.setTabCanGoBack(Boolean(canGoBack), index)
    } catch {}
  }, [index])

  useEffect(() => {
    if (!isActive || !webviewRef.current) {
      return
    }
    ui$.webview.set(ObservableHint.opaque(webviewRef.current))
    ui$.pageUrl.set(tab.pageUrl || tab.url)
    refreshCanGoBack()
  }, [isActive, refreshCanGoBack, tab.pageUrl, tab.url])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview || !tab.url) {
      return
    }
    if (lastRequestedUrlRef.current === tab.url) {
      return
    }
    lastRequestedUrlRef.current = tab.url
    try {
      if (webview.getURL() === tab.url) {
        return
      }
    } catch {}
    webview.src = tab.url
  }, [tab.url])

  useEffect(() => {
    const webview = webviewRef.current
    if (!webview) {
      return
    }

    const onDomReady = () => {
      readyRef.current = true
      if (isActive) {
        ui$.webview.set(ObservableHint.opaque(webview))
      }
      // Bridged on the webview we just injected into, so background tabs get
      // the keyboard and paste listeners too.
      executeQuietly(
        webview,
        `window.isAndroid = false;\n${buildPrelude()}\n${contentJs}\n;window.NouTube?.bridgeShortcuts?.()`,
      )
      // One call per script: a malformed script must not take the others, or
      // the content bundle above, down with it.
      for (const source of buildUserScriptSources(getUserStylesSnapshot())) {
        executeQuietly(webview, source)
      }
      toggleShorts(hideShorts)
      syncUserStylesToWebview()
      syncBlocklistToWebview()
      syncSettingsToWebview()
      refreshCanGoBack()
    }
    const onStartLoading = () => tabs$.setTabLoading(true, index)
    const onStopLoading = () => tabs$.setTabLoading(false, index)
    const onNavigate = (e: { url: string }) => {
      try {
        const { host } = new URL(e.url)
        void mainClient.toggleInterception(YOUTUBE_HOSTS.includes(host))
        tabs$.setTabPageUrl(e.url, index)
        if (isActive) {
          ui$.pageUrl.set(e.url)
        }
      } catch {
        tabs$.setTabPageUrl(e.url, index)
      }
      refreshCanGoBack()
    }
    const onIpcMessage = (e: { channel: string; args: any[] }) =>
      // Tabs play independently, so the Discord presence has to know which one this came from.
      onMessage(e.channel, e.channel === 'playback' ? { ...e.args[0], source: tab.id } : e.args[0])
    const onFavicon = (e: { favicons: string[] }) => {
      tabs$.setTabMeta({ title: webview.getTitle(), icon: e.favicons.at(-1) }, index)
    }
    const onTitle = (e: { title: string }) => {
      tabs$.setTabMeta({ title: e.title || webview.getTitle() }, index)
    }
    const onInput = ((e: Electron.Event & { input: Electron.Input }) => {
      if (e.input.type === 'keyDown') {
        handleShortcuts(e.input)
      }
    }) as unknown as (e: Event) => void

    webview.addEventListener('dom-ready', onDomReady)
    webview.addEventListener('did-start-loading', onStartLoading)
    webview.addEventListener('did-stop-loading', onStopLoading)
    webview.addEventListener('did-finish-load', onStopLoading)
    webview.addEventListener('did-fail-load', onStopLoading)
    webview.addEventListener('did-fail-provisional-load', onStopLoading)
    webview.addEventListener('did-navigate', onNavigate)
    webview.addEventListener('did-navigate-in-page', onNavigate)
    webview.addEventListener('ipc-message', onIpcMessage)
    webview.addEventListener('page-favicon-updated', onFavicon)
    webview.addEventListener('page-title-updated', onTitle)
    webview.addEventListener('before-input-event', onInput)

    return () => {
      webview.removeEventListener('dom-ready', onDomReady)
      webview.removeEventListener('did-start-loading', onStartLoading)
      webview.removeEventListener('did-stop-loading', onStopLoading)
      webview.removeEventListener('did-finish-load', onStopLoading)
      webview.removeEventListener('did-fail-load', onStopLoading)
      webview.removeEventListener('did-fail-provisional-load', onStopLoading)
      webview.removeEventListener('did-navigate', onNavigate)
      webview.removeEventListener('did-navigate-in-page', onNavigate)
      webview.removeEventListener('ipc-message', onIpcMessage)
      webview.removeEventListener('page-favicon-updated', onFavicon)
      webview.removeEventListener('page-title-updated', onTitle)
      webview.removeEventListener('before-input-event', onInput)
    }
  }, [
    buildPrelude,
    contentJs,
    hideShorts,
    index,
    isActive,
    onMessage,
    refreshCanGoBack,
    syncBlocklistToWebview,
    syncSettingsToWebview,
    syncUserStylesToWebview,
    toggleShorts,
  ])

  useObserveEffect(settings$.hideShorts, ({ value }) => toggleShorts(value))
  useObserveEffect(settings$.sponsorBlock, () => syncSettingsToWebview())
  useObserveEffect(settings$.blockAds, () => syncSettingsToWebview())
  useObserveEffect(settings$.playbackRate, () => syncSettingsToWebview())
  useObserveEffect(settings$.playbackQuality, () => syncSettingsToWebview())
  useObserveEffect(settings$.disableAutoplay, () => syncSettingsToWebview())
  useObserveEffect(settings$.miniPlayer, () => syncSettingsToWebview())
  useObserveEffect(settings$.pictureInPicture, () => syncSettingsToWebview())
  useObserveEffect(settings$.showDislikes, () => syncSettingsToWebview())
  useObserveEffect(settings$.showOriginalVideoTitle, () => syncSettingsToWebview())
  useObserveEffect(settings$.doubleTapToToggleHeader, () => syncSettingsToWebview())
  useObserveEffect(userStyles$, () => syncUserStylesToWebview())
  useObserveEffect(settings$.accent, () => syncUserStylesToWebview())
  useObserveEffect(settings$.glassTheme, () => syncUserStylesToWebview())
  useObserveEffect(settings$.reduceEffects, () => syncUserStylesToWebview())
  useObserveEffect(blocklist$, () => syncBlocklistToWebview())

  useEffect(() => {
    if (!readyRef.current) return
    executeQuietly(
      webviewRef.current,
      `window.NouTubePreferH264 = ${preferH264 ? 'true' : 'false'}; window.NouTubeClickbaitThumbnail = ${JSON.stringify(clickbaitThumbnail)}; document.location.reload()`,
    )
  }, [clickbaitThumbnail, preferH264])

  return (
    <View
      pointerEvents={isActive ? 'auto' : 'none'}
      style={[StyleSheet.absoluteFill, { opacity: isActive ? 1 : 0, zIndex: isActive ? 1 : 0 }]}
    >
      <GoogleLoginNotice url={tab.pageUrl || tab.url} />
      <NouTubeView
        ref={webviewRef}
        style={{ flex: 1 }}
        src={initialUrlRef.current}
        useragent={userAgent}
        partition="persist:webview"
        allowpopups="true"
      />
    </View>
  )
}
