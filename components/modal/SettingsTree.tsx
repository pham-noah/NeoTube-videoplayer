import { Pressable, ScrollView, View, useColorScheme } from 'react-native'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { clsx, isWeb, nIf } from '@/lib/utils'
import { useValue } from '@legendapp/state/react'
import { auth$ } from '@/states/auth'
import { settings$, type SettingsSnapshot } from '@/states/settings'
import { t } from 'i18next'
import { capitalize } from 'es-toolkit'
import MaterialIcons, { type MaterialIconsIconName } from '@react-native-vector-icons/material-icons'
import { queryClient } from '@/lib/query/client'
import { FORK } from '@/lib/fork'
import { surfaceCls } from '@/lib/colors'
import { canCheckForUpdates, checkForAppUpdate, type AppRelease } from '@/lib/app-update'
import { UpdateSheet } from '@/components/modal/settings/UpdateSheet'
import { getReleaseFeedQuery } from '@/lib/query/changelog'
import { mainClient } from '@/lib/main-client'
import { showToast } from '@/lib/toast'
import { NouText } from '../NouText'
import { NouLink } from '../link/NouLink'
import { SettingsModalTabSync } from './SettingsModalTabSync'
import {
  SettingsActionRow,
  SettingsAppearanceContent,
  SettingsPreferencesContent,
  SettingsToolsContent,
  SettingsTransferContent,
  SettingsYouTubeContent,
} from './SettingsModalTabSettings'
import { SettingsChangelogContent } from './SettingsModalTabChangelog'
import { SettingsUserStylesContent } from './SettingsUserStylesContent'
import { UpdateProgressRow } from './settings/UpdateProgressRow'
import { SettingsBlocklistContent } from './SettingsBlocklistContent'
import { ResetSettingsRow } from './settings/ResetSettingsRow'
import { SettingsToggleRow } from './settings/primitives'
import { SettingsChangedContent } from './settings/SettingsChanged'
import { changedSettings } from '@/lib/settings-defaults'
import { useTwColor } from '@/lib/theme'
import { FAQ_URL } from '@/lib/help'
import { SearchField } from '../row/SearchField'
import { EmptyState } from '../row/EmptyState'
import { searchSettings } from '@/lib/settings-index'
import { setStringAsync as copyToClipboard } from 'expo-clipboard'
import { hapticSuccess, hapticTick } from '@/lib/haptics'
import { SettingsScrollContext, useSettingsScrollView } from './settings-scroll'

const repo = FORK.repoUrl
// Upstream's developer, shown as credit, not NeoTube's.
const donateLinks = [
  { label: 'GitHub Sponsors', detail: 'github.com/sponsors/rnons', url: 'https://github.com/sponsors/rnons' },
  { label: 'Liberapay', detail: 'liberapay.com/rnons', url: 'https://liberapay.com/rnons' },
  { label: 'PayPal', detail: 'paypal.me/nonbili', url: 'https://paypal.me/nonbili' },
  { label: 'Stripe', detail: 'donate.stripe.com', url: 'https://donate.stripe.com/cNiaEXbunbcS0oTa9P48000' },
]
// Imported above for this file's own use, and re-exported so the extension
// (which imports it from here) keeps working while only one copy of the string
// exists, in lib/colors.
export { surfaceCls }
export const sectionLabelCls = 'mb-2 px-1 text-[11px] uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-500'
export const iconWrapCls = 'h-10 w-10 items-center justify-center rounded-2xl bg-zinc-100 dark:bg-zinc-950'

export type SettingsPage =
  | 'home'
  | 'content'
  | 'preferences'
  | 'appearance'
  | 'blocklist'
  | 'styles'
  | 'tools'
  | 'transfer'
  | 'sync'
  | 'about'
  | 'changelog'
  | 'changed'

export const SettingsSection: React.FC<React.PropsWithChildren<{ label?: string }>> = ({ label, children }) => {
  return (
    <View>
      {label ? <NouText className={sectionLabelCls}>{label}</NouText> : null}
      {children}
    </View>
  )
}

export const SettingsNavRow: React.FC<{
  title: string
  description: string
  icon: MaterialIconsIconName
  meta?: string
  onPress: () => void
  isLast?: boolean
}> = ({ title, description, icon, meta, onPress, isLast = false }) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  return (
    <Pressable
      onPress={onPress}
      className={clsx(
        'flex-row items-center gap-3 px-4 py-4 active:bg-zinc-200/80 dark:active:bg-zinc-800/80',
        !isLast && 'border-b-2 border-zinc-100 dark:border-zinc-950',
      )}
    >
      <View className={iconWrapCls}>
        <MaterialIcons name={icon} color={isDark ? tw('zinc-300') : tw('slate-600')} size={18} />
      </View>
      <View className="flex-1">
        <View className="flex-row items-center gap-2">
          <NouText className="flex-1 font-medium">{title}</NouText>
          {meta ? (
            <NouText className="text-xs uppercase tracking-[0.16em] text-zinc-600 dark:text-zinc-500">{meta}</NouText>
          ) : null}
        </View>
        <NouText className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{description}</NouText>
      </View>
      <MaterialIcons name="chevron-right" color={isDark ? tw('zinc-500') : tw('zinc-600')} size={20} />
    </Pressable>
  )
}

export const SettingsExternalRow: React.FC<{
  title: string
  detail: string
  href: string
  icon?: MaterialIconsIconName
  isLast?: boolean
}> = ({ title, detail, href, icon = 'open-in-new', isLast = false }) => {
  const tw = useTwColor()
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  return (
    <NouLink href={href}>
      <View
        className={clsx(
          'flex-row items-center gap-3 px-4 py-4',
          !isLast && 'border-b-2 border-zinc-100 dark:border-zinc-950',
        )}
      >
        <View className={iconWrapCls}>
          <MaterialIcons name={icon} color={isDark ? tw('zinc-300') : tw('slate-600')} size={18} />
        </View>
        <View className="flex-1">
          <NouText className="font-medium">{title}</NouText>
          <NouText className="mt-1 text-sm leading-5 text-zinc-600 dark:text-zinc-400">{detail}</NouText>
        </View>
        <MaterialIcons name="chevron-right" color={isDark ? tw('zinc-500') : tw('zinc-600')} size={20} />
      </View>
    </NouLink>
  )
}

function formatPlanLabel(plan?: string) {
  return plan ? capitalize(plan) : 'Free'
}

export interface SettingsTreeHandle {
  /* Pops one page, or reports that the tree is already at its root and the
   * host has to decide what a back press means. */
  back: () => boolean
}

/*
 * The settings pages and the stack that walks between them, with no opinion on
 * what contains them: the app mounts this inside SettingsModal, the browser
 * extension mounts it as its options page.
 */
export const SettingsTree = forwardRef<
  SettingsTreeHandle,
  {
    version: string
    /* Rendered at the root, where there is no page to go back to. A page that
     * is nothing but settings has nowhere to go, and passes nothing. */
    onExit?: () => void
    /* Signing in is the one thing a host can own: the browser extension goes
     * through its background rather than the web login this page links to. */
    renderSync?: () => React.ReactNode
    /* Downloads, cookies, proxy and other shell-owned tools do not have an
     * extension counterpart. */
    showShellTools?: boolean
    /* Opens on this page with the root underneath it, so back still leaves
     * settings rather than the app. */
    initialPage?: SettingsPage
  }
>(({ version, onExit, renderSync, showShellTools = true, initialPage }, ref) => {
  const tw = useTwColor()
  const theme = useValue(settings$.theme)
  const { user, plan } = useValue(auth$)
  const colorScheme = useColorScheme()
  const isDark = colorScheme !== 'light'
  const [pageStack, setPageStack] = useState<SettingsPage[]>(() =>
    initialPage && initialPage !== 'home' ? ['home', initialPage] : ['home'],
  )
  const { scroller, scrollViewProps } = useSettingsScrollView()
  const [importingList, setImportingList] = useState(false)
  const [importingTakeout, setImportingTakeout] = useState(false)
  const [updateSupported, setUpdateSupported] = useState(false)
  const [availableRelease, setAvailableRelease] = useState<AppRelease | null>(null)
  const [checkingUpdate, setCheckingUpdate] = useState(false)
  /* What the last check found, left under the row. A toast for "you are up to
   * date" is gone before anybody reads it, and the row is already the thing the
   * user just pressed. */
  const [checkNote, setCheckNote] = useState<string | null>(null)
  /* Tapping the version copies it -- the first thing anyone asks for in a bug
   * report -- and says so in the same place, not through a toast that is gone
   * before it is read. */
  const [versionCopied, setVersionCopied] = useState(false)
  // Search is a page of its own rather than a filter on the current one: the
  // point is to find a row you cannot see, which may live three pages away.
  const [searchOpen, setSearchOpen] = useState(false)
  const [query, setQuery] = useState('')

  const copyVersion = () => {
    void copyToClipboard(`NeoTube v${version}`)
    hapticSuccess()
    setVersionCopied(true)
    setTimeout(() => setVersionCopied(false), 1600)
  }

  const currentPage = pageStack[pageStack.length - 1]
  const canGoBack = pageStack.length > 1
  const themeLabel =
    theme === 'dark'
      ? t('settings.theme.dark')
      : theme === 'light'
        ? t('settings.theme.light')
        : t('settings.theme.system')

  useEffect(() => {
    if (FORK.repoUrl) void queryClient.prefetchQuery(getReleaseFeedQuery())
  }, [])

  useEffect(() => {
    let active = true
    mainClient
      .isUpdateSupported()
      .then((supported) => {
        if (active) setUpdateSupported(supported)
      })
      .catch(() => {
        if (active) setUpdateSupported(false)
      })
    return () => {
      active = false
    }
  }, [])

  const pushPage = useCallback((page: SettingsPage) => {
    setPageStack((stack) => (stack[stack.length - 1] === page ? stack : stack.concat(page)))
  }, [])

  const popPage = useCallback(() => {
    setPageStack((stack) => (stack.length > 1 ? stack.slice(0, -1) : stack))
  }, [])

  useImperativeHandle(
    ref,
    () => ({
      back: () => {
        if (pageStack.length <= 1) {
          return false
        }
        popPage()
        return true
      },
    }),
    [pageStack.length, popPage],
  )

  // Android and iOS have no updater behind mainClient: the desktop build owns
  // that one. The native build reads the fork's own GitHub releases instead,
  // which is the same thing Kairn does, and needs nothing but the repository.
  const nativeUpdate = canCheckForUpdates(FORK.repoUrl)

  const handleCheckForUpdate = useCallback(async () => {
    setCheckingUpdate(true)
    try {
      if (nativeUpdate) {
        const result = await checkForAppUpdate({ currentVersion: version, repo: FORK.repoUrl })
        if (result.status === 'available') {
          setCheckNote(null)
          setAvailableRelease(result.release)
        } else if (result.status === 'current') {
          setCheckNote(t('update.checkedCurrent', { version }))
        } else if (result.status === 'no-release') {
          setCheckNote(t('update.checkedNoReleases'))
        } else {
          setCheckNote(result.message ? `${t('update.checkedFailed')} (${result.message})` : t('update.checkedFailed'))
        }
        return
      }
      const result = await mainClient.checkForUpdate()
      if (result.status === 'available') {
        showToast(t('update.downloading', { version: result.version }))
      } else if (result.status === 'error') {
        showToast(result.message || t('update.error'))
      } else {
        showToast(t('update.upToDate'))
      }
    } catch (e: any) {
      console.error('checkForUpdate failed', e)
      showToast(e.message || t('update.error'))
    } finally {
      setCheckingUpdate(false)
    }
  }, [nativeUpdate, version])

  // Opt-in and once per visit: an update check that runs on every launch is a
  // request to GitHub that the user did not ask for, and the About page is where
  // they go when they want to know.
  const autoCheckUpdates = useValue(settings$.checkUpdates)
  const autoChecked = useRef(false)
  useEffect(() => {
    if (currentPage !== 'about' || !nativeUpdate || !autoCheckUpdates || autoChecked.current) {
      return
    }
    autoChecked.current = true
    void handleCheckForUpdate()
  }, [currentPage, nativeUpdate, autoCheckUpdates, handleCheckForUpdate])

  const settingsSnapshot = useValue(settings$) as unknown as SettingsSnapshot
  const changedCount = changedSettings(settingsSnapshot).length

  const pageMeta = {
    home: { title: t('settings.label') },
    content: { title: t('settings.preferences') },
    preferences: { title: t('settings.preferences') },
    appearance: { title: t('settings.appearance') },
    blocklist: { title: t('settings.blocklist.label') },
    styles: { title: t('settings.userStyles.label') },
    tools: { title: t('settings.tools') },
    transfer: { title: t('settings.transfer') },
    sync: { title: t('sync.label') },
    about: { title: t('about.label') },
    changelog: { title: t('changelog.label') },
    changed: { title: t('settings.changed') },
  } satisfies Record<SettingsPage, { title: string }>

  const renderSearchResults = () => {
    if (!query.trim()) {
      return (
        <View className="pt-6">
          <NouText className="text-center text-sm leading-6 text-zinc-500">{t('settings.searchHint')}</NouText>
        </View>
      )
    }

    const results = searchSettings(query, (key) => t(key))

    if (!results.length) {
      return <EmptyState icon="search-off" title={t('settings.searchEmpty', { query: query.trim() })} />
    }

    return (
      <View className="gap-2">
        {results.map((entry, index) => (
          <Pressable
            key={`${entry.page}-${entry.labelKey}-${index}`}
            onPress={() => {
              hapticTick()
              pushPage(entry.page)
              setQuery('')
              setSearchOpen(false)
            }}
            accessibilityRole="button"
            accessibilityLabel={t(entry.labelKey)}
            accessibilityHint={pageMeta[entry.page].title}
            className="flex-row items-center gap-3 rounded-2xl bg-white px-4 py-3.5 active:bg-zinc-100 dark:bg-zinc-900 dark:active:bg-zinc-800"
          >
            <View className="flex-1">
              <NouText className="font-medium">{t(entry.labelKey)}</NouText>
              <NouText className="mt-0.5 text-xs uppercase tracking-[0.14em] text-zinc-500" numberOfLines={1}>
                {entry.sectionKey && t(entry.sectionKey) !== pageMeta[entry.page].title
                  ? `${pageMeta[entry.page].title} · ${t(entry.sectionKey)}`
                  : pageMeta[entry.page].title}
              </NouText>
            </View>
            <MaterialIcons name="chevron-right" color={isDark ? tw('zinc-500') : tw('zinc-600')} size={20} />
          </Pressable>
        ))}
      </View>
    )
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'home':
        return (
          <View className="gap-8">
            <SettingsSection label={t('settings.groupYouTube')}>
              <View className={surfaceCls}>
                <SettingsNavRow
                  title={t('settings.preferences')}
                  description={t('settings.preferencesYouTubeHint')}
                  icon="tune"
                  onPress={() => pushPage('content')}
                />
                <SettingsNavRow
                  title={t('settings.blocklist.label')}
                  description={t('settings.blocklist.hint')}
                  icon="block"
                  onPress={() => pushPage('blocklist')}
                />
                <SettingsNavRow
                  title={t('settings.userStyles.label')}
                  description={t('settings.userStyles.hint')}
                  icon="brush"
                  onPress={() => pushPage('styles')}
                  isLast
                />
              </View>
            </SettingsSection>

            <SettingsSection label={t('settings.groupNouTube')}>
              <View className={surfaceCls}>
                <SettingsNavRow
                  title={t('settings.preferences')}
                  description={t('settings.preferencesNouTubeHint')}
                  icon="toggle-on"
                  onPress={() => pushPage('preferences')}
                />
                <SettingsNavRow
                  title={t('settings.appearance')}
                  description={t('settings.appearanceHint')}
                  icon="palette"
                  meta={themeLabel}
                  onPress={() => pushPage('appearance')}
                  isLast
                />
              </View>
            </SettingsSection>

            <SettingsSection label={t('settings.tools')}>
              <View className={surfaceCls}>
                {nIf(
                  FORK.syncEnabled,
                  <SettingsNavRow
                    title={t('sync.label')}
                    description={user?.email || t('settings.syncHintShort')}
                    icon="sync"
                    meta={formatPlanLabel(plan)}
                    onPress={() => pushPage('sync')}
                  />,
                )}
                <SettingsNavRow
                  title={t('settings.transfer')}
                  description={t('settings.transferHint')}
                  icon="import-export"
                  onPress={() => pushPage('transfer')}
                  isLast={!showShellTools}
                />
                {nIf(
                  showShellTools,
                  <SettingsNavRow
                    title={t('settings.tools')}
                    description={t('settings.toolsHint')}
                    icon="build"
                    onPress={() => pushPage('tools')}
                    isLast
                  />,
                )}
              </View>
            </SettingsSection>

            <SettingsSection>
              <View className={surfaceCls}>
                <SettingsNavRow
                  title={t('settings.changed')}
                  description={changedCount ? t('settings.changedHint', { count: changedCount }) : t('settings.changedNone')}
                  icon="published-with-changes"
                  meta={changedCount > 0 ? String(changedCount) : undefined}
                  onPress={() => pushPage('changed')}
                />
                <ResetSettingsRow />
              </View>
            </SettingsSection>

            <SettingsSection label={t('about.label')}>
              <View className={surfaceCls}>
                <SettingsNavRow
                  title={t('about.label')}
                  description={t('about.hint')}
                  icon="info-outline"
                  meta={`v${version}`}
                  onPress={() => pushPage('about')}
                />
                {nIf(
                  !!FORK.repoUrl,
                  <SettingsNavRow
                    title={t('changelog.label')}
                    description={t('changelog.hint')}
                    icon="history"
                    onPress={() => pushPage('changelog')}
                    isLast
                  />,
                )}
              </View>
            </SettingsSection>
          </View>
        )

      case 'content':
        return <SettingsYouTubeContent />

      case 'preferences':
        return <SettingsPreferencesContent />

      case 'appearance':
        return <SettingsAppearanceContent />

      case 'blocklist':
        return <SettingsBlocklistContent />

      case 'styles':
        return <SettingsUserStylesContent />

      case 'tools':
        return <SettingsToolsContent />

      case 'transfer':
        return (
          <SettingsTransferContent
            importingList={importingList}
            setImportingList={setImportingList}
            importingTakeout={importingTakeout}
            setImportingTakeout={setImportingTakeout}
          />
        )

      case 'sync':
        return renderSync ? renderSync() : <SettingsModalTabSync />

      case 'changelog':
        return <SettingsChangelogContent />

      case 'changed':
        return <SettingsChangedContent />

      case 'about':
        return (
          <View className="gap-6">
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('about.copyVersion', { version })}
              onPress={copyVersion}
              className="rounded-[28px] bg-white dark:bg-zinc-900 px-5 py-5"
            >
              <NouText className="text-[11px] uppercase tracking-[0.18em] text-zinc-600 dark:text-zinc-500">
                {FORK.appName}
              </NouText>
              <View className="mt-2 flex-row items-center gap-2">
                <NouText className="text-xl font-semibold tracking-tight">v{version}</NouText>
                {versionCopied ? (
                  <MaterialIcons name="check" size={16} color="#14b8a6" />
                ) : (
                  <MaterialIcons name="content-copy" size={14} color={tw('zinc-500')} />
                )}
              </View>
            </Pressable>

            {updateSupported || nativeUpdate ? (
              <SettingsSection label={t('about.updates')}>
                <View className={surfaceCls}>
                  {nIf(
                    nativeUpdate,
                    <SettingsToggleRow
                      label={t('update.auto')}
                      description={t('update.autoHint')}
                      icon="autorenew"
                      value={autoCheckUpdates}
                      onPress={() => settings$.checkUpdates.set(!autoCheckUpdates)}
                    />,
                  )}
                  <SettingsActionRow
                    label={t('update.check')}
                    description={checkNote ?? t('update.checkHint')}
                    icon="system-update"
                    onPress={handleCheckForUpdate}
                    loading={checkingUpdate}
                    isLast
                  />
                </View>
              </SettingsSection>
            ) : null}

            <SettingsSection label={t('about.credit')}>
              <View className={surfaceCls}>
                <SettingsExternalRow
                  title={t('about.madeBy')}
                  detail={FORK.ownerUrl.replace('https://', '')}
                  href={FORK.ownerUrl}
                  icon="person"
                  isLast
                />
              </View>
            </SettingsSection>

            <SettingsSection label={t('about.help')}>
              <View className={surfaceCls}>
                <SettingsExternalRow
                  title={t('about.faq')}
                  detail={t('about.faqHint')}
                  href={FAQ_URL}
                  icon="help-outline"
                  isLast
                />
              </View>
            </SettingsSection>

            <SettingsSection label={t('about.code')}>
              <View className={surfaceCls}>
                <SettingsExternalRow
                  title={t('about.source')}
                  detail={FORK.repoUrl.replace('https://', '')}
                  href={FORK.repoUrl}
                  icon="code"
                />
                <SettingsExternalRow
                  title={t('about.report')}
                  detail={t('about.reportHint')}
                  href={`${FORK.repoUrl}/issues`}
                  icon="bug-report"
                />
                <SettingsExternalRow
                  title={t('about.upstream')}
                  detail="github.com/nonbili/NouTube"
                  href={FORK.upstreamUrl}
                  icon="code"
                  isLast
                />
              </View>
            </SettingsSection>

            <SettingsSection label={t('about.license')}>
              <View className={surfaceCls}>
                <SettingsExternalRow
                  title="AGPL-3.0"
                  detail={t('about.licenseHint')}
                  href={`${FORK.upstreamUrl}/blob/main/LICENSE`}
                  icon="gavel"
                  isLast
                />
              </View>
            </SettingsSection>

            <SettingsSection label={t('about.supportUpstream')}>
              <View className={surfaceCls}>
                {donateLinks.map((item, index) => (
                  <SettingsExternalRow
                    key={item.url}
                    title={item.label}
                    detail={item.detail}
                    href={item.url}
                    isLast={index === donateLinks.length - 1}
                  />
                ))}
              </View>
            </SettingsSection>

            {nIf(
              !!availableRelease,
              <UpdateSheet
                release={availableRelease!}
                currentVersion={version}
                onClose={() => setAvailableRelease(null)}
              />,
            )}
          </View>
        )

      default: {
        // Adding a SettingsPage without a case here is a compile error rather than a blank page.
        const unhandled: never = currentPage
        return unhandled
      }
    }
  }

  const showBackButton = canGoBack || Boolean(onExit)

  return (
    <View className="flex-1">
      <View className="px-3 py-3">
        <View className="flex-row items-center gap-2">
          {showBackButton ? (
            <Pressable
              onPress={() => {
                if (canGoBack) {
                  popPage()
                  return
                }
                onExit?.()
              }}
              accessibilityRole="button"
              accessibilityLabel={canGoBack ? t('a11y.back') : t('menus.close')}
              className="h-11 w-11 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-900"
            >
              <MaterialIcons
                name={canGoBack ? 'arrow-back' : 'close'}
                color={isDark ? 'white' : tw('gray-900')}
                size={22}
              />
            </Pressable>
          ) : null}
          <View className="flex-1">
            <NouText className="text-lg font-semibold">
              {searchOpen ? t('settings.searchPlaceholder') : pageMeta[currentPage].title}
            </NouText>
          </View>
          <Pressable
            onPress={() => {
              hapticTick()
              setQuery('')
              setSearchOpen((open) => !open)
            }}
            accessibilityRole="button"
            accessibilityLabel={searchOpen ? t('menus.close') : t('settings.searchPlaceholder')}
            accessibilityState={{ expanded: searchOpen }}
            className="h-11 w-11 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-900"
          >
            <MaterialIcons name={searchOpen ? 'close' : 'search'} color={isDark ? 'white' : tw('gray-900')} size={22} />
          </Pressable>
        </View>
        {nIf(searchOpen, <View className="mt-2">
          <SearchField value={query} onChangeText={setQuery} placeholder={t('settings.searchPlaceholder')} className="mx-0 mb-0" />
        </View>)}
      </View>

      <UpdateProgressRow onPress={() => pushPage('about')} />

      <SettingsScrollContext.Provider value={scroller}>
        <ScrollView className="flex-1" {...scrollViewProps}>
          <View className={clsx('px-4 py-5', isWeb && 'mx-auto w-full max-w-3xl')}>
            {searchOpen ? renderSearchResults() : renderPage()}
            <View className="h-16" />
          </View>
        </ScrollView>
      </SettingsScrollContext.Provider>
    </View>
  )
})

SettingsTree.displayName = 'SettingsTree'
