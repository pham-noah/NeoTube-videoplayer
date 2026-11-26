import { observable } from '@legendapp/state'

/*
 * What the content script found in front of the feed (content/feed-gate.ts).
 *
 * Two different dead ends look the same from the app's side: YouTube asking
 * about cookies, and a home feed that has nothing to show because watch history
 * is off. Both used to render as a blank page, which reads as a broken app.
 */
export interface FeedGate {
  /* YouTube's cookie sheet is open in the page and waiting for an answer. */
  consent: boolean
  /* The page is a feed, it painted nothing, and no dialog explains why. */
  empty: boolean
  /* The user said "not now" to the consent card for this page load. */
  dismissed: boolean
}

export const feedGate$ = observable<FeedGate>({ consent: false, empty: false, dismissed: false })

export const setFeedGate = (gate: { consent?: boolean; empty?: boolean }) => {
  feedGate$.consent.set(Boolean(gate?.consent))
  // A dialog appearing is a new situation; an earlier dismissal does not carry
  // over to it.
  feedGate$.empty.set(Boolean(gate?.empty) && !gate?.consent)
  if (gate?.consent) {
    feedGate$.dismissed.set(false)
  }
}

export const dismissFeedGate = () => feedGate$.dismissed.set(true)

export const resetFeedGate = () => feedGate$.set({ consent: false, empty: false, dismissed: false })
