// The rule and its exceptions live in lib/h264ify.ts; this only installs it.
import { makeSupportChecker } from '@/lib/h264ify'

export function installH264ify() {
  try {
    const videoElem = document.createElement('video')
    const origCanPlayType = videoElem.canPlayType.bind(videoElem)
    ;(HTMLVideoElement.prototype as any).canPlayType = makeSupportChecker(origCanPlayType)
  } catch (e) {}

  try {
    const mse: any = (window as any).MediaSource
    if (mse && typeof mse.isTypeSupported === 'function') {
      const origIsTypeSupported = mse.isTypeSupported.bind(mse)
      mse.isTypeSupported = makeSupportChecker(origIsTypeSupported)
    }
  } catch (e) {}
}
