// The app-side contract for the desktop main-process bridge.
//
// MainInterface is derived in desktop/src/main/ipc/main.ts (`typeof interfaces`),
// so the app cannot import it without pulling the entire Electron main process --
// and electron, electron-updater, socks-proxy-agent, @electron-toolkit/utils --
// into the app's TypeScript program, where none of them resolve. Those errors do
// not belong to the app and they made an app typecheck impossible.
//
// Until that contract lives in a module both sides can import (the fix: declare
// the IPC surface here or in a neutral module and have desktop type its
// `interfaces` object against it, so drift fails desktop's own typecheck), this
// stands in.
//
// Consequence, stated plainly: `mainClient.<method>(...)` calls are NOT checked
// for existence or arity. Every other file in the app is fully checked.
export interface MainInterface {
  [method: string]: (...args: any[]) => any
}

// Mirrors the type of the same name in desktop/src/main/lib/auto-update.ts.
export interface UpdateCheckResult {
  status: 'update-available' | 'update-not-available' | 'error' | string
  version?: string
  [key: string]: unknown
}
