// https://github.com/ai/nanoid#react-native
import 'react-native-get-random-values'
import { nanoid } from 'nanoid'
import { ReactNode } from 'react'
import { Platform } from 'react-native'

export const isWeb = typeof document != 'undefined'
export const isIos = Platform.OS === 'ios'
export const isAndroid = Platform.OS === 'android'

/*
 * `isWeb` is true for the Electron renderer, the extension and the plain browser
 * build alike -- they are all react-native-web documents. Only the renderer has
 * `window.electron`, so reading `window.electron.process.platform` under `isWeb`
 * threw "Cannot read properties of undefined (reading 'process')" on mount in the
 * browser build. Ask for the desktop platform explicitly instead.
 */
export const desktopPlatform = (): string | undefined =>
  typeof window === 'undefined' ? undefined : (window as { electron?: { process?: { platform?: string } } }).electron?.process?.platform

export const clsx = (...classes: Array<string | boolean | undefined>) => classes.filter(Boolean).join(' ')

// In react-native, writing {condition && <Cmp/>} triggers `A text node cannot be a child of a <View>` warning.
export const nIf = (condition: any, node: ReactNode) => (condition ? node : null)

export function genId(size = 16) {
  return nanoid(size)
}
