import { useEffect, useState, type ReactNode } from 'react'
import {
  AccessibilityInfo,
  Platform,
  StyleSheet,
  View,
  useColorScheme,
  type StyleProp,
  type ViewStyle,
} from 'react-native'
import { BlurView } from 'expo-blur'
import { useValue } from '@legendapp/state/react'
import { settings$ } from '@/states/settings'
import { accentColors } from '@/lib/accent'
import { getGlassTokens, glassRadius } from '@/lib/glass-tokens'

/*
 * The Liquid Glass look for native screens. A surface is two layers: a blur
 * (iOS and web) and one view carrying the translucent fill, the top gloss and the
 * inset rim -- all three are style props on that one view, so a surface costs two
 * layers, not five. On Android there is no blur here: expo-blur needs a
 * BlurTargetView in the same window, which a Modal is not, so Android gets the
 * fill alone -- but a heavier one (tokens.frost): at the blurred alpha the page
 * behind a sheet stays readable through it, which reads as broken rather than
 * frosted. With "reduce transparency" on (iOS), the opaque tinted fill is used
 * instead and the blur is dropped.
 *
 * The material comes from lib/glass-tokens.ts, which mirrors lib/glass-css.ts.
 */
const useReduceTransparency = () => {
  const [reduce, setReduce] = useState(false)
  useEffect(() => {
    if (Platform.OS !== 'ios') return
    AccessibilityInfo.isReduceTransparencyEnabled().then(setReduce)
    const subscription = AccessibilityInfo.addEventListener('reduceTransparencyChanged', setReduce)
    return () => subscription.remove()
  }, [])
  return reduce
}

const useGlass = () => {
  const scheme = useColorScheme() === 'light' ? 'light' : 'dark'
  const accent = accentColors[useValue(settings$.accent)]
  // The user's own "reduce effects" joins the OS reduce-transparency setting:
  // both mean the same thing here -- skip the blur, use the opaque tinted fill.
  const reduce = useReduceTransparency() || useValue(settings$.reduceEffects)
  return { tokens: getGlassTokens(scheme, accent), reduce }
}

export const GlassBackdrop: React.FC<{
  intensity?: number
  /** A sheet has to hide the page text behind it; a bar lets more of the page through. */
  variant?: 'sheet' | 'bar'
  style?: StyleProp<ViewStyle>
}> = ({ intensity = 45, variant = 'sheet', style }) => {
  const { tokens, reduce } = useGlass()
  const blurred = Platform.OS !== 'android' && !reduce
  const material = blurred ? tokens : variant === 'bar' ? tokens.frostBar : tokens.frost
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, style, { overflow: 'hidden' }]}>
      {blurred ? <BlurView intensity={intensity} tint={tokens.blurTint} style={StyleSheet.absoluteFill} /> : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          style,
          {
            backgroundColor: reduce ? tokens.solid : material.fill,
            experimental_backgroundImage: reduce ? undefined : material.gloss,
            boxShadow: material.rim,
          },
        ]}
      />
    </View>
  )
}

export const GlassSurface: React.FC<{
  // Optional on purpose: the call sites that use GlassSurface purely as a
  // full-bleed backdrop pass no children (BaseFullScreenModal, FeedModal,
  // SettingsModal, FeedEditorSheet, PageLoadError). GlassCard below still
  // requires them.
  children?: ReactNode
  className?: string
  radius?: number
  style?: StyleProp<ViewStyle>
  intensity?: number
}> = ({ children, className, radius = 0, style, intensity }) => (
  <View className={className} style={[{ borderRadius: radius, overflow: 'hidden' }, style]}>
    <GlassBackdrop intensity={intensity} style={{ borderRadius: radius }} />
    {children}
  </View>
)

/** A card resting on a glass sheet: flat translucent fill and a hairline, no blur. */
export const GlassCard: React.FC<{
  children: ReactNode
  className?: string
  radius?: number
  style?: StyleProp<ViewStyle>
}> = ({ children, className, radius = glassRadius.card, style }) => {
  const { tokens } = useGlass()
  return (
    <View
      className={className}
      style={[
        { borderRadius: radius, overflow: 'hidden', backgroundColor: tokens.card.fill, boxShadow: tokens.card.rim },
        style,
      ]}
    >
      {children}
    </View>
  )
}
