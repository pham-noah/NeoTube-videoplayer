import type { UseIncomingShareResult } from 'expo-sharing'

// expo-sharing's hook throws "Receiving share payloads is not supported on web."
// as soon as it is called, and the home screen calls it unconditionally, so the
// web bundle could not render at all. There is no share extension on web either,
// so the same empty result the iOS guard returns is the whole implementation.
const empty: UseIncomingShareResult = {
  sharedPayloads: [],
  resolvedSharedPayloads: [],
  isResolving: false,
  error: null,
  clearSharedPayloads: () => {},
  refreshSharePayloads: async () => {},
}

export function useIncomingShare(): UseIncomingShareResult {
  return empty
}
