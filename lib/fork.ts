// Everything that differs between NeoTube and upstream NouTube lives here, so
// merging upstream changes stays small.
export const FORK = {
  appName: 'NeoTube',
  upstreamUrl: 'https://github.com/nonbili/NouTube',
  // Your fork's GitHub URL, e.g. https://github.com/you/NeoTube. Set it at build
  // time; the About and Changelog screens use it, and hide the links when empty.
  repoUrl: (process.env.EXPO_PUBLIC_NEOTUBE_REPO || '').replace(/\/+$/, ''),
  // Sync talks to a backend. Upstream's belongs to its developer and is not
  // reachable from NeoTube: turn this on only after pointing the app at your own
  // (EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY, EXPO_PUBLIC_NEOTUBE_API_HOST).
  syncEnabled: process.env.EXPO_PUBLIC_NEOTUBE_SYNC === '1',
}
