# What NeoTube talks to

NeoTube has no analytics, crash reporting or advertising code. This is every outside service the app can contact, and when.

| Service | Why | When |
|---|---|---|
| youtube.com, music.youtube.com, ytimg.com | The app is a wrapper around YouTube's own pages. | Always. YouTube sees your IP address and whatever you do on its site. |
| sponsor.ajay.app (SponsorBlock) | Fetch skippable segments for the video you open. Sends the video ID. | On by default. Turn off under Settings. |
| returnyoutubedislikeapi.com | Show dislike counts. Sends the video ID. | Off by default. |
| discord.com | Discord presence and login. | Only if you turn Discord presence on. |
| github.com | Changelog (release feed of the repository set by `EXPO_PUBLIC_NEOTUBE_REPO`). | Only if that repository is set. |
| Sync backend | Sign-in and cloud sync of bookmarks and history. | Off. See below. |

## Sync

NouTube's sync belongs to its developer: a hosted account system, a Supabase project and a paid plan. NeoTube is not connected to it, and the code no longer falls back to it. The Sync screen is hidden unless the app is built with `EXPO_PUBLIC_NEOTUBE_SYNC=1` **and** your own backend is configured (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_NEOTUBE_API_HOST`). The backend's API (`noutube.me`, `users.link`, App Store purchase calls) is not part of this repository, so you would have to build a compatible one. Until then, leave sync off and use Settings > Transfer to move data between devices.

Nothing is sent to NouTube's servers from NeoTube.
