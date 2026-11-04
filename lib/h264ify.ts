/**
 * The h264ify rule (https://github.com/erkserkserkserks/h264ify, MIT), kept pure
 * so the interesting part is testable: claim the browser cannot play VP8/VP9/
 * AV1/WebM so YouTube serves H.264, which Android decodes in hardware.
 *
 * Video only. The rewrite exists to pick a *video* codec, and an audio mime type
 * is not a candidate for it: YouTube's usual audio here is `audio/webm; codecs=
 * "opus"`, which contains "webm" and used to be rejected along with the video
 * formats. Answering "cannot play" for the page's audio is what takes the sound
 * away while the picture carries on, so audio types are passed straight through.
 */
const DISALLOWED = ['vp8', 'vp9', 'av01']

export const codecRejected = (type: string) => {
  if (type.startsWith('audio/')) {
    return false
  }
  // The bare container carries no codec marker to match on.
  if (type.startsWith('video/webm')) {
    return true
  }
  return DISALLOWED.some((unsupported) => type.includes(unsupported))
}

/**
 * Wraps `canPlayType` / `MediaSource.isTypeSupported`. Both answer "not
 * supported" with an empty string when the argument is missing, which is what
 * the original does and what YouTube's feature detection expects.
 */
export const makeSupportChecker =
  <T extends string | boolean>(original: (type: string) => T) =>
  (type?: string): T | '' => {
    if (type === undefined) {
      return ''
    }
    return codecRejected(type) ? '' : original(type)
  }
