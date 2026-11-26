import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { ActivityIndicator, View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Theme } from '@radix-ui/themes'
import { Toaster } from 'react-hot-toast'
import { useValue } from '@legendapp/state/react'
import { settings$ } from '@/states/settings'
import { useSnapshot } from '../useSnapshot'
import { useProjection } from './useProjection'
import { useOpenRequestedUrls } from './useOpenRequestedUrls'
import { applyColorScheme, getSystemColorScheme } from './appearance'
import { applyAccentVars, radixAccent } from '@/lib/accent-vars'
import { applyLanguage } from '../../lib/i18n-browser'
import { clsx, nIf } from '../../lib/ui'

type SnapshotState = ReturnType<typeof useSnapshot>

const SnapshotContext = createContext<SnapshotState | null>(null)

export function useAppSnapshot() {
  const state = useContext(SnapshotContext)
  if (!state) {
    throw new Error('useAppSnapshot must be used inside AppShell')
  }
  return state
}

const iconFonts = ['MaterialIcons-Regular', 'MaterialDesignIcons', 'AntDesign']

const useIconFontsReady = () => {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let mounted = true
    void Promise.all(iconFonts.map((font) => document.fonts.load(`16px "${font}"`)))
      .catch(() => undefined)
      .then(() => {
        if (mounted) {
          setReady(true)
        }
      })
    return () => {
      mounted = false
    }
  }, [])

  return ready
}

/*
 * Every extension page renders the app's own components, so every one of them
 * needs what the app's root provides: the theme, the observables projected from
 * the background's durable state, and somewhere for a navigation to go.
 */
export const AppShell: React.FC<{ children: ReactNode; className?: string }> = ({ children, className }) => {
  const state = useSnapshot()
  const { snapshot, setError } = state
  const onError = useCallback((message: string) => setError(message), [setError])

  const projectionReady = useProjection(snapshot, onError)
  useOpenRequestedUrls()
  const iconFontsReady = useIconFontsReady()

  const theme = useValue(settings$.theme)
  const language = useValue(settings$.language)
  // Radix used to be told "gray" here, so the extension's own pages had none of
  // the fork's accent; the accent also has to reach Tailwind, which reads it from
  // the --nou-* variables (lib/accent-vars.ts).
  const accent = useValue(settings$.accent)

  useEffect(() => {
    applyColorScheme(theme ?? null)
  }, [theme])

  useEffect(() => {
    applyAccentVars(accent)
  }, [accent])

  useEffect(() => {
    applyLanguage(language ?? null)
  }, [language])

  return (
    <SnapshotContext.Provider value={state}>
      <SafeAreaProvider>
        <Theme className="h-screen" appearance={theme ?? getSystemColorScheme()} accentColor={radixAccent(accent)} grayColor="slate">
          <View className={clsx('h-full bg-zinc-100 dark:bg-gray-950', className)}>
            {nIf(projectionReady && iconFontsReady, children)}
            {nIf(
              !projectionReady || !iconFontsReady,
              <View className="h-full items-center justify-center">
                <ActivityIndicator />
              </View>,
            )}
          </View>
          <Toaster position="bottom-right" />
        </Theme>
      </SafeAreaProvider>
    </SnapshotContext.Provider>
  )
}
