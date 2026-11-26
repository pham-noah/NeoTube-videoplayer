/*
 * Haptics, through expo-haptics when the native module is in the build and as a
 * no-op when it is not. A binary built before this module existed would throw on
 * the require, and a button that vibrates is not worth crashing over, so every
 * entry point here is best-effort.
 */
type HapticsModule = {
  selectionAsync: () => Promise<void>
  impactAsync: (style: unknown) => Promise<void>
  notificationAsync: (type: unknown) => Promise<void>
  ImpactFeedbackStyle: { Light: unknown; Medium: unknown }
  NotificationFeedbackType: { Success: unknown; Warning: unknown; Error: unknown }
}

let module: HapticsModule | null | undefined

const getModule = (): HapticsModule | null => {
  if (module === undefined) {
    try {
      module = require('expo-haptics') as HapticsModule
    } catch {
      module = null
    }
  }
  return module
}

const run = (call: (haptics: HapticsModule) => Promise<void>) => {
  const haptics = getModule()
  if (!haptics) return
  try {
    void call(haptics).catch(() => undefined)
  } catch {
    module = null
  }
}

/* A move: a row selected, a tab switched, a toggle flipped. */
export const hapticTick = () => run((haptics) => haptics.selectionAsync())

/* A press with weight behind it: save, delete, send. */
export const hapticPress = () => run((haptics) => haptics.impactAsync(haptics.ImpactFeedbackStyle.Light))

/* Something finished, or refused. */
export const hapticSuccess = () => run((haptics) => haptics.notificationAsync(haptics.NotificationFeedbackType.Success))

export const hapticError = () => run((haptics) => haptics.notificationAsync(haptics.NotificationFeedbackType.Error))
