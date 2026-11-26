import { describe, expect, it } from 'bun:test'
import { parseNotes } from '@/lib/notes-blocks'

describe('parseNotes', () => {
  it('keeps headings, bullets and paragraphs apart', () => {
    const notes = ['# 1.1.11', '', 'A release about the bar.', '', '- first fix', '- second fix'].join('\n')
    expect(parseNotes(notes)).toEqual([
      { type: 'heading', text: '1.1.11' },
      { type: 'paragraph', text: 'A release about the bar.' },
      { type: 'bullet', text: 'first fix' },
      { type: 'bullet', text: 'second fix' },
    ])
  })

  it('drops inline markers and keeps the text of a link', () => {
    expect(parseNotes('The **row** is `cut`, see [the issue](https://example.com).')).toEqual([
      { type: 'paragraph', text: 'The row is cut, see the issue.' },
    ])
  })

  it('joins a wrapped paragraph instead of making one block per line', () => {
    expect(parseNotes('One line\nthat continues.')).toEqual([
      { type: 'paragraph', text: 'One line that continues.' },
    ])
  })

  it('handles CRLF notes and ignores rules', () => {
    expect(parseNotes('Intro\r\n\r\n---\r\n\r\nOutro')).toEqual([
      { type: 'paragraph', text: 'Intro' },
      { type: 'paragraph', text: 'Outro' },
    ])
  })

  it('returns nothing for empty notes', () => {
    expect(parseNotes('')).toEqual([])
    expect(parseNotes('\n\n  \n')).toEqual([])
  })
})
