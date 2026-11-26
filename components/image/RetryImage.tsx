import MaterialIcons from '@react-native-vector-icons/material-icons'
import { Image, type ImageProps, type ImageSource } from 'expo-image'
import { memo, useEffect, useMemo, useRef, useState } from 'react'
import { Animated, Pressable, View } from 'react-native'

function isUriImageSource(source: ImageProps['source']): source is ImageSource & { uri: string } {
  return Boolean(source && typeof source === 'object' && !Array.isArray(source) && 'uri' in source && source.uri)
}

function withRetryToken(source: ImageProps['source'], retryKey: number): ImageProps['source'] {
  if (!retryKey || !source) {
    return source
  }

  if (typeof source === 'string') {
    return appendRetryToken(source, retryKey)
  }

  if (typeof source === 'number' || Array.isArray(source)) {
    return source
  }

  if (!isUriImageSource(source)) {
    return source
  }

  return {
    ...source,
    uri: appendRetryToken(source.uri, retryKey),
    cacheKey: source.cacheKey ? `${source.cacheKey}:${retryKey}` : undefined,
  } satisfies ImageSource
}

function appendRetryToken(uri: string, retryKey: number) {
  try {
    const url = new URL(uri)
    url.searchParams.set('reload', `${retryKey}`)
    return url.toString()
  } catch {
    const suffix = uri.includes('?') ? '&' : '?'
    return `${uri}${suffix}reload=${retryKey}`
  }
}

function canRetrySource(source: ImageProps['source']) {
  if (!source) {
    return false
  }
  if (typeof source === 'string') {
    return source.startsWith('http://') || source.startsWith('https://')
  }
  if (typeof source === 'number' || Array.isArray(source)) {
    return false
  }
  return isUriImageSource(source) && (source.uri.startsWith('http://') || source.uri.startsWith('https://'))
}

export const RetryImage: React.FC<ImageProps> = memo(({ cachePolicy, onError, onLoad, recyclingKey, ...props }) => {
  const { source } = props
  const [retryKey, setRetryKey] = useState(0)
  const [failed, setFailed] = useState(false)
  const [autoRetried, setAutoRetried] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const retryable = canRetrySource(source)

  // Most thumbnails arrive with no blurhash, so without this the row has a hole
  // where the picture goes and the picture then pops in. A slow pulse reads as
  // "coming" rather than "broken".
  const pulse = useRef(new Animated.Value(0.55)).current
  useEffect(() => {
    if (loaded) return
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.55, duration: 700, useNativeDriver: true }),
      ]),
    )
    loop.start()
    return () => loop.stop()
  }, [loaded, pulse])

  useEffect(() => {
    setRetryKey(0)
    setFailed(false)
    setAutoRetried(false)
    setLoaded(false)
  }, [source])

  const resolvedSource = useMemo(() => withRetryToken(source, retryKey), [source, retryKey])

  const retry = () => {
    if (!retryable) {
      return
    }
    setFailed(false)
    setRetryKey((value) => value + 1)
  }

  return (
    <View>
      {/* Absolutely positioned: the image still decides the box, so every
          caller keeps the size it asked for. */}
      {!loaded ? (
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: pulse },
            props.style as never,
          ]}
          className="bg-zinc-200 dark:bg-zinc-800"
        />
      ) : null}
      <Image
        {...props}
        source={resolvedSource}
        cachePolicy={retryKey > 0 ? 'none' : cachePolicy}
        recyclingKey={recyclingKey ? `${recyclingKey}:${retryKey}` : `${retryKey}`}
        onError={(event) => {
          onError?.(event)
          if (retryable && !autoRetried) {
            setAutoRetried(true)
            setRetryKey((value) => value + 1)
            return
          }
          setFailed(true)
        }}
        onLoad={(event) => {
          setLoaded(true)
          setFailed(false)
          onLoad?.(event)
        }}
      />
      {failed && retryable ? (
        <Pressable
          onPress={retry}
          className="absolute bottom-2 right-2 h-8 w-8 items-center justify-center rounded-full bg-black/75"
          hitSlop={8}
        >
          <MaterialIcons name="refresh" color="white" size={16} />
        </Pressable>
      ) : null}
    </View>
  )
})

RetryImage.displayName = 'RetryImage'
