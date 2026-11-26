# NeoTube 0.3.0

The second published build, and the first one where the app can fetch and
install its own update. Everything upstream NouTube shipped in 0.7.11 is folded
in — forty-two commits, merged rather than transplanted, so the fork's own
interface survives the merge instead of being rebuilt on top of it.

## The update that installs itself

"Check for updates" still compares this repository's newest release against the
version you are running, but the APK no longer goes to a browser. The download
runs inside the app with a progress bar and a cancel that stops the transfer
rather than hiding it; the finished file is handed to Android's package
installer, so it is a normal install rather than a tap through a file manager.
If the app has not been allowed to install packages yet, it says so and opens
the setting that fixes it. A download that fails or arrives truncated keeps its
reason and offers a retry.

The row also stays put: leave the sheet, come back, and the transfer you
started is still there with its progress.

## Settings that admit where a setting lives

The search field used to find settings and nothing else. It now finds the pages
too — About, the changelog, sync, and the update check — so typing "version"
lands on the About page instead of reporting that nothing matches. Results read
their section and their page from the translations, which is what stopped a row
whose section and page share a name from printing the same word twice.

The version card in the About page copies what a bug report wants: tapping it
puts `NeoTube v0.3.0` on the clipboard and answers with a check beside the
number. The update check reports its result in place — "Checked just now — you
have v0.3.0, the newest release" — instead of a toast that disappears while you
are reading it.

## The first screen

A fresh install lands on YouTube's own cookie wall, and answering it is the
only way to see a recommendation. NeoTube now says that above the page and
answers it for you: rejecting is enough, since the feed works either way, and
the notice goes away and stays away. The same card covers the other empty
state, when YouTube has recommendations to give but watch history is off, and
links straight to the history setting that fills the page.

None of this needs a second app: the card is the app's, and the page beneath it
keeps its own state.

## Upstream 0.7.11

YouTube Music's "media next" no longer empties itself into the app's queue, a
feed preview no longer writes itself into your watch history, TLS checks are
enforced again, and a yt-dlp initialisation error is reported instead of being
swallowed. The header toolbar is configurable: every button can be shown,
hidden or moved into the menu, and the bar can be reordered — long-pressing the
header opens that editor.

## How this one was built

`scripts/build-release.mjs` builds a signed release in one command from a
short-path mirror, then audits what it produced: version name and code, ABI,
and the signing certificate compared against the published key. Two builds of
the same tree produce the same bytes, which is how the checksum below can be
quoted at all.

## Note on this build

Signed with the project's own release key, the same one that signed 0.2.0, so it
installs over 0.2.0 without uninstalling.

## Checksums

    sha256  ab8aa5d8965826361273c1e619ab61f9d28aeb06de60c67a69ec407259be6a84
    size    65,263,101 bytes
    arch    arm64-v8a
    build   dev.neotube.app, versionCode 9004

## About

NeoTube is a fork of [NouTube](https://github.com/nonbili/NouTube), and this
repository is the published copy. It plays YouTube without the ads and keeps the
audio going when the screen is off.
