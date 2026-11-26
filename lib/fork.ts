// Everything that differs between NeoTube and upstream NouTube lives here, so
// merging upstream changes stays small.
export const FORK = {
  appName: 'NeoTube',
  upstreamUrl: 'https://github.com/nonbili/NouTube',
  // Your fork's published GitHub URL, e.g. https://github.com/you/NeoTube. Set
  // it at build time to build against another fork; it also names the
  // repository the update check asks for, so an empty value would both hide the
  // links and leave the updater with nothing to read.
  //
  // This is the public repository that carries the releases, not the private
  // development one: an unauthenticated release check on a private repository
  // answers 404, and the app would decide it is up to date forever.
  repoUrl: (process.env.EXPO_PUBLIC_NEOTUBE_REPO || 'https://github.com/pham-noah/NeoTube-videoplayer').replace(/\/+$/, ''),
  // Where "made by" points. Kept apart from repoUrl because the fork's owner and
  // the person who wrote the app are not always the same account.
  ownerUrl: 'https://github.com/pham-noah',
  // Sync talks to a backend. Upstream's belongs to its developer and is not
  // reachable from NeoTube: turn this on only after pointing the app at your own
  // (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_NEOTUBE_API_HOST).
  syncEnabled: process.env.EXPO_PUBLIC_NEOTUBE_SYNC === '1',
}
