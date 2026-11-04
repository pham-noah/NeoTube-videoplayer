import { describe, expect, it } from 'bun:test'
import { codecRejected, makeSupportChecker } from './h264ify'

describe('codecRejected', () => {
  it('never rejects audio, whatever container it is in', () => {
    // The regression this exists for: audio/webm is what YouTube serves when
    // Opus is available, and rejecting it left the video playing silently.
    expect(codecRejected('audio/webm; codecs="opus"')).toBe(false)
    expect(codecRejected('audio/webm')).toBe(false)
    expect(codecRejected('audio/mp4; codecs="mp4a.40.2"')).toBe(false)
    expect(codecRejected('audio/mp4')).toBe(false)
  })

  it('rejects the video codecs h264ify exists to avoid', () => {
    expect(codecRejected('video/webm; codecs="vp9"')).toBe(true)
    expect(codecRejected('video/webm; codecs="vp8"')).toBe(true)
    expect(codecRejected('video/mp4; codecs="av01.0.05M.08"')).toBe(true)
    expect(codecRejected('video/webm')).toBe(true)
  })

  it('keeps H.264, which is the point', () => {
    expect(codecRejected('video/mp4; codecs="avc1.42E01E"')).toBe(false)
    expect(codecRejected('video/mp4')).toBe(false)
  })
})

describe('makeSupportChecker', () => {
  const always = (value: string | boolean) => (_type: string) => value

  it('answers for the wrapped function when the type is allowed', () => {
    const isTypeSupported = makeSupportChecker(always(true) as (type: string) => boolean)
    expect(isTypeSupported('video/mp4; codecs="avc1.42E01E"')).toBe(true)
  })

  it('answers empty string for a type it refuses', () => {
    const canPlay = makeSupportChecker((() => 'probably') as (type: string) => string)
    expect(canPlay('video/webm; codecs="vp9"')).toBe('')
  })

  it('answers empty string with no argument, like the original', () => {
    const canPlay = makeSupportChecker((() => 'probably') as (type: string) => string)
    expect(canPlay()).toBe('')
  })
})
