// One MutationObserver for the whole content script, delivering its batches once
// per animation frame.
//
// The page had four separate observers on document.documentElement with
// { childList, subtree } -- main (player + dialogs), blocklist, dislikes and
// author-names. A single mutation batch on a busy feed (a thumbnail appended, a
// comment posted, live chat scrolling) therefore ran four callbacks, each doing
// its own work, with no coordination between them.
//
// The work itself is the same either way. What changes is that one batch is
// collected and delivered ONCE per frame to every consumer, instead of each
// observer firing as often as the DOM moves.
//
// Callers that watch a specific subtree (the fullscreen host, the split-view
// player) keep their own observer -- those are scoped and cheap, and merging them
// here would make them fire for every unrelated change on the page.
type MutationHandler = (records: MutationRecord[]) => void

const handlers = new Set<MutationHandler>()
let observer: MutationObserver | null = null
let pending: MutationRecord[] = []
let frame = 0

function flush() {
  frame = 0
  const records = pending
  pending = []
  for (const handler of handlers) {
    try {
      handler(records)
    } catch (error) {
      // One broken consumer must not stop the others, and the page must keep
      // working regardless.
      console.error('NouScript: mutation handler failed', error)
    }
  }
}

function schedule(records: MutationRecord[]) {
  pending = pending.length ? pending.concat(records) : records
  if (frame) {
    return
  }
  frame = requestAnimationFrame(flush)
}

/**
 * Run `handler` with the mutations collected since the last frame. Returns a
 * function that unregisters it; the observer is disconnected once the last
 * consumer lets go.
 */
export function onDomMutations(handler: MutationHandler) {
  handlers.add(handler)
  if (!observer) {
    observer = new MutationObserver(schedule)
    observer.observe(document.documentElement, { childList: true, subtree: true })
  }
  return () => {
    handlers.delete(handler)
    if (!handlers.size && observer) {
      observer.disconnect()
      observer = null
    }
  }
}
