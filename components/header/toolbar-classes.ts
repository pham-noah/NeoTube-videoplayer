import { clsx, isWeb } from '@/lib/utils'

// NativeWind evaluates `lg:` (>=1024px) against the window on native too, so a
// wide tablet matches it just like a desktop window does. The `lg:` variants
// here only make sense for the desktop vertical sidebar; leaving them unguarded
// made `lg:w-full` stretch the playback pill across the whole toolbar row on
// tablets, pushing every other button out of view. Always gate them on isWeb.

export const toolbarPillPressableClass = (web = isWeb) =>
  clsx('h-11 min-w-11 px-1 items-center justify-center shrink-0', web && 'lg:w-full lg:min-w-0 lg:px-0')

// The pill sits on the bar, and the bar already makes it opaque enough, so the
// pill only needs to read as a control: it used to carry its own
// zinc-200/zinc-300 fill, which is a second, conflicting surface on top of the
// bar and is what made it look like an empty box over a white page.
export const toolbarPillLabelClass = (web = isWeb) =>
  clsx(
    'max-w-full px-2 py-1 rounded-full border border-black/[0.06] bg-black/[0.06] dark:border-white/10 dark:bg-white/[0.12]',
    web && 'lg:px-1.5',
  )
