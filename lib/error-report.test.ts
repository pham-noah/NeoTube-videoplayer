import { describe, expect, it } from 'bun:test'
import { formatErrorReport } from './error-report'

describe('formatErrorReport', () => {
  it('leads with the app and platform so a pasted crash is self-describing', () => {
    const report = formatErrorReport(new Error('boom'), undefined, { app: 'NeoTube', platform: 'android' })
    expect(report.split('\n')[0]).toBe('## NeoTube android')
    expect(report).toContain('Error: boom')
  })

  it('carries the component stack when React supplies one', () => {
    const report = formatErrorReport(new Error('boom'), { componentStack: '\n  in Header\n  in App' })
    expect(report).toContain('Component stack:')
    expect(report).toContain('in Header')
  })

  it('does not print the stack twice when it already starts with the message', () => {
    const error = new Error('boom')
    const report = formatErrorReport(error)
    expect(report.split('Error: boom').length - 1).toBe(1)
  })

  it('survives a thrown value that is not an Error', () => {
    expect(formatErrorReport('just a string')).toContain('just a string')
    expect(formatErrorReport({ code: 7 })).toContain('{"code":7}')
    expect(formatErrorReport(undefined)).toContain('Unknown error')
  })
})
