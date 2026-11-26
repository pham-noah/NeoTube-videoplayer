# NeoTube 0.2.0

The first published build. NeoTube plays YouTube without the ads and keeps the
audio going when the screen is off; this release is the first one cut from the
fork after three passes over the interface, so most of what follows is a
description of the app rather than a changelog against an earlier download.

## The list screens

History is grouped by day, so "yesterday" is a heading instead of a timestamp
you have to decode. The Library sorts by name, date or size, selects several
items at once, and moves them together. Both have a search field that filters as
you type. Swiping a row offers its actions — download, queue, remove — and every
removal keeps an Undo in reach for five seconds, inside the sheet that did it.

## The queue

Rows drag to reorder, and the list scrolls under your finger while you drag, so
a queue longer than the screen can still be rearranged in one gesture. Clearing
the queue asks twice and can be undone.

## Settings

One search field covers every setting, including the ones nested inside a page.
A "Changed from defaults" page lists only what you have touched and resets a
whole section at once. Each row shows its current value, so a setting you came
back to change is readable without opening it.

## When a page fails to load

A page that fails says what failed, keeps the reason it was given, and offers
Retry — instead of a blank frame that looks like the app has hung.

## About and updates

About shows the version, the credit, and where the source lives: this
repository, its issue tracker, and the project it grew out of. "Check for
updates" asks this repository for its newest release, compares the numbers, and
shows the release notes before handing the APK to your browser to download. It
is opt-in and runs once per visit.

## Languages

Sixteen locales: English, German, Spanish, French, Galician, Indonesian,
Italian, Polish, Portuguese (both variants), Russian, Turkish, Ukrainian,
Vietnamese, and Chinese in both scripts.

## Note on this build

Signed with the project's own release key, so it installs over any earlier
build of the same application id.
