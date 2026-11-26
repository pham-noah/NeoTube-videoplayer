# NeoTube 0.3.1

0.3.0 could download its own update and then fail at the last step: the download
finished, the sheet offered "Install", and the installer answered "No downloaded
package at file:///…/cache/updates/NeoTube-0.3.0.apk" even though the file was
there.

Two defects sat behind that message, both in the hand-off rather than the
transfer. The path expo-file-system reports is a `file://` URI, and the native
installer opened it as a plain filesystem path, which never exists — so the file
it had just written was reported missing. Behind that, the `FileProvider` every
`content://` hand-off depends on was referenced in the code but never declared in
the module manifest, so even a correct path would have thrown on the way out.

Both are fixed: the installer takes the path out of the URI, and the provider is
declared with `@xml/file_paths`, which limits it to `cache/updates` and the app's
files directory. Android's "allow this app to install packages" prompt is now the
only step left to the user: the sheet opens that setting, and comes back to finish
the install by itself once the permission is on.

Everything else is 0.3.0: upstream 0.7.11, the settings search that finds pages,
the update check that answers where you tapped it, the version card that copies
the version, and the notices above an empty feed.

## Note on this build

Signed with the same release key as 0.2.0 and the 0.3.0 build, so it installs over
either.

## Checksums

    sha256  a01deb83bf233f2c21cf6735b78f569fe55702865f70ee8363b178fba8e7900e
    size    65,263,949 bytes (62 MB)
    arch    arm64-v8a
    build   dev.neotube.app, versionCode 9104

## About

NeoTube is a fork of [NouTube](https://github.com/nonbili/NouTube), and this
repository is the published copy.
