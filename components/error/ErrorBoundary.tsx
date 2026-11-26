/*
 * The last line of defence: a render-time throw anywhere under the root used to
 * leave a blank screen with no way out but force-stopping the app. This keeps
 * the message, the stack and a restart button on screen instead.
 *
 * It deliberately uses plain React Native views with inline colours: the theme
 * layer (NativeWind vars, the accent palette) is one of the things that can be
 * broken when this renders, so the crash screen cannot depend on it.
 */
import { Component, type ErrorInfo, type ReactNode } from 'react'
import { DevSettings, Platform, Pressable, ScrollView, Text, View } from 'react-native'
import { setStringAsync } from 'expo-clipboard'
import { t } from 'i18next'
import { FORK } from '@/lib/fork'
import { formatErrorReport } from '@/lib/error-report'
import { hapticSuccess } from '@/lib/haptics'

interface Props {
  children: ReactNode
}

interface State {
  error: unknown
  info?: ErrorInfo
  copied: boolean
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, copied: false }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[NeoTube] render error', error, info.componentStack)
    this.setState({ info })
  }

  private report = () =>
    formatErrorReport(this.state.error, this.state.info, {
      app: FORK.appName,
      platform: Platform.OS,
    })

  private copy = async () => {
    try {
      await setStringAsync(this.report())
      hapticSuccess()
      this.setState({ copied: true })
    } catch {
      this.setState({ copied: false })
    }
  }

  private retry = () => this.setState({ error: null, info: undefined, copied: false })

  private restart = () => {
    try {
      if (Platform.OS === 'web') {
        globalThis.location?.reload()
      } else {
        DevSettings.reload()
      }
    } catch {
      this.retry()
    }
  }

  render() {
    const { error, copied } = this.state
    if (!error) return this.props.children

    const detail = this.report()

    return (
      <View style={{ flex: 1, backgroundColor: '#09090b', paddingTop: 56, paddingHorizontal: 20 }}>
        <Text style={{ color: '#fafafa', fontSize: 20, fontWeight: '600' }}>{t('error.title')}</Text>
        <Text style={{ color: '#a1a1aa', fontSize: 14, lineHeight: 20, marginTop: 8 }}>{t('error.body')}</Text>

        <ScrollView
          style={{ marginTop: 16, borderRadius: 14, backgroundColor: '#18181b', maxHeight: 260 }}
          contentContainerStyle={{ padding: 12 }}
        >
          <Text selectable style={{ color: '#d4d4d8', fontSize: 12, fontFamily: 'monospace' }}>
            {detail}
          </Text>
        </ScrollView>

        <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
          <Pressable
            onPress={this.copy}
            accessibilityRole="button"
            accessibilityLabel={t('error.copy')}
            style={{ flex: 1, borderRadius: 999, borderWidth: 1, borderColor: '#3f3f46', paddingVertical: 12 }}
          >
            <Text style={{ color: '#fafafa', fontSize: 14, textAlign: 'center' }}>{copied ? t('error.copied') : t('error.copy')}</Text>
          </Pressable>
          <Pressable
            onPress={this.restart}
            accessibilityRole="button"
            accessibilityLabel={t('error.reload')}
            style={{ flex: 1, borderRadius: 999, backgroundColor: '#fafafa', paddingVertical: 12 }}
          >
            <Text style={{ color: '#09090b', fontSize: 14, fontWeight: '600', textAlign: 'center' }}>{t('error.reload')}</Text>
          </Pressable>
        </View>

        <Pressable onPress={this.retry} accessibilityRole="button" accessibilityLabel={t('error.retry')} style={{ paddingVertical: 14 }}>
          <Text style={{ color: '#a1a1aa', fontSize: 13, textAlign: 'center' }}>{t('error.retry')}</Text>
        </Pressable>
      </View>
    )
  }
}
