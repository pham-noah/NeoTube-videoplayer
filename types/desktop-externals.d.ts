// Declaration shims for type surfaces that are genuinely not part of this
// program.
//
// tsconfig.json excludes desktop/ and extension/ (each has its own tsconfig), so
// modules that only exist for the desktop shell are unresolvable here. A few
// shared files still name them for types only:
//
//   electron                      MainPageContent.tsx (WebviewTag, Electron.Event,
//                                 Electron.Input) -- an `import type`, so nothing
//                                 is loaded at runtime and the Electron webview
//                                 branch is isWeb-gated.
//   @electron-toolkit/preload     content/types.ts (ElectronAPI)
//   react-dom                     components/menu/NouMenu.tsx (createPortal)
//
// These are deliberately permissive. A previous revision shaped them precisely
// and that was worse, not better: a concrete-but-wrong shape propagates into
// every use site (`webview.getTitle()` on `{}`) and buries the app's real type
// errors in noise. `any` here is honest -- the real shapes are a desktop concern
// that this program cannot see.
//
// The clean fix for the electron entries is to stop type-importing desktop
// modules from shared app code (the architectural item in the audit). The clean
// fix for react-dom is @types/react-dom as a devDependency, which needs a
// lockfile regeneration (`bun link && bun install`) that cannot be done here.
declare module 'electron' {
  export type WebviewTag = any
}

declare module '@electron-toolkit/preload' {
  export type ElectronAPI = any
}

declare module 'react-dom' {
  import type { ReactNode, ReactPortal } from 'react'
  export function createPortal(
    children: ReactNode,
    container: Element | DocumentFragment,
    key?: string | null,
  ): ReactPortal
}

declare namespace Electron {
  type Event = any
  type Input = any
}

