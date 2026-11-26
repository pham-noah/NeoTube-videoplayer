import { emit } from './utils'

/*
 * YouTube's two walls in front of a feed, reported to the shell so it can say
 * what is happening in words rather than leaving an empty page.
 *
 * A fresh install lands on YouTube's cookie sheet, which is a webview dialog
 * that swallows its own taps and says nothing the app can read. Declining it
 * leaves the home feed empty -- also indistinguishable, from the outside, from a
 * page that failed to load. Both look like "the app is broken", so the shell gets
 * a plain description of which one it is looking at.
 */

const CONSENT_SELECTORS = [
  'ytd-consent-bump-v2-renderer',
  'yt-consent-bump-v2-renderer',
  'ytm-consent-bump-v2-renderer',
  '.consent-bump-v2-lightbox',
]

const FEED_ITEM_SELECTORS = [
  'ytd-rich-item-renderer',
  'ytd-rich-grid-row',
  'ytm-video-with-context-renderer',
  'ytd-video-renderer',
  'ytm-rich-item-renderer',
]

const ACCEPT_LABELS = /^(accept all|allow all|agree|i agree|accept the use of cookies and data|すべて同意|전체 동의)$/i
const REJECT_LABELS = /^(reject all|decline all|no thanks|only necessary|necessary only|すべて拒否)$/i

export type ConsentChoice = 'accept' | 'reject'

const consentElement = () => {
  for (const selector of CONSENT_SELECTORS) {
    const element = document.querySelector<HTMLElement>(selector)
    if (element) {
      return element
    }
  }
  return null
}

const FEED_PREFIXES = ['/feed', '/results', '/@', '/channel', '/user', '/playlist']
const isFeedPage = () => location.pathname === '/' || FEED_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))

const feedHasItems = () => FEED_ITEM_SELECTORS.some((selector) => document.querySelector(selector))

/* YouTube ships the same two buttons under a dozen labels across locales; the
 * aria-label is the only stable handle, and on mobile it is the only text node
 * the dialog has. */
const findConsentButton = (choice: ConsentChoice): HTMLElement | null => {
  const pattern = choice === 'accept' ? ACCEPT_LABELS : REJECT_LABELS
  const root = consentElement() || document
  const candidates = Array.from(
    root.querySelectorAll<HTMLElement>('button, tp-yt-paper-button, yt-button-shape button, [role="button"]'),
  )
  for (const candidate of candidates) {
    const label = (candidate.getAttribute('aria-label') || candidate.textContent || '').trim()
    if (pattern.test(label)) {
      return candidate
    }
  }
  return null
}

export function chooseConsent(choice: ConsentChoice): boolean {
  const button = findConsentButton(choice)
  if (!button) {
    // Not found by label: at least put the dialog where the user can see it.
    consentElement()?.scrollIntoView({ block: 'center', behavior: 'smooth' })
    return false
  }
  button.click()
  return true
}

export function installFeedGate() {
  let last = ''
  let settledAt = 0
  // The shell clears its copy of this on every navigation, so an unchanged
  // state still has to be said again -- otherwise the note vanishes on reload.
  let lastEmitAt = 0

  const report = () => {
    const consent = Boolean(consentElement())
    const onFeed = isFeedPage()
    const items = onFeed && !consent && feedHasItems()
    if (consent) {
      // A dialog is a definite answer; the feed behind it is not being read.
      settledAt = 0
    } else if (!settledAt) {
      settledAt = Date.now()
    }
    // YouTube paints the grid a beat after the page says it loaded, and an empty
    // feed that fills in a second later would flash a warning.
    const waiting = !consent && onFeed && !items && Date.now() - settledAt < 5000
    const state = { consent, empty: onFeed && !consent && !items && !waiting }
    const key = `${state.consent}:${state.empty}`
    if (key !== last || Date.now() - lastEmitAt > 4000) {
      last = key
      lastEmitAt = Date.now()
      emit('feed-gate', state)
    }
  }

  report()
  const timer = setInterval(report, 1000)
  // Content scripts outlive the page: a route change starts the countdown again.
  window.addEventListener('popstate', () => {
    settledAt = 0
    last = ''
    report()
  })
  document.addEventListener('yt-navigate-finish', () => {
    settledAt = 0
    last = ''
    report()
  })
  window.addEventListener('beforeunload', () => clearInterval(timer))
}
