/*
 * Release notes are GitHub markdown. The app has no markdown renderer and does
 * not need one: notes are headings, paragraphs and bullets, and the rest of the
 * syntax shows up as punctuation noise in a dialog that is about one thing.
 *
 * The blocks keep their shape so the sheet can space a heading apart from a
 * paragraph; inline markers are dropped, a link keeps its label.
 */

export type NoteBlock = { type: 'heading' | 'paragraph' | 'bullet'; text: string }

const stripInline = (line: string): string =>
  line
    // [label](href) -> label; a bare URL is left alone, it is readable as is.
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\*\*|__|`/g, '')
    // A line of underscores or dashes is a rule, not text.
    .replace(/^\s*[-*_]{3,}\s*$/, '')
    .trim()

export const parseNotes = (markdown: string): NoteBlock[] => {
  const blocks: NoteBlock[] = []
  // The paragraph that a following line may still belong to. A blank line, a
  // heading or a bullet ends it, which is how a wrapped paragraph stays one
  // block while two paragraphs stay two.
  let open: NoteBlock | null = null
  for (const raw of markdown.replace(/\r\n/g, '\n').split('\n')) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      open = null
      continue
    }
    const heading = /^(#{1,6})\s+(.*)$/.exec(line)
    if (heading) {
      const text = stripInline(heading[2])
      if (text) {
        blocks.push({ type: 'heading', text })
      }
      open = null
      continue
    }
    const bullet = /^\s*[-*+]\s+(.*)$/.exec(line)
    if (bullet) {
      const text = stripInline(bullet[1])
      if (text) {
        blocks.push({ type: 'bullet', text })
      }
      open = null
      continue
    }
    const text = stripInline(line)
    if (!text) {
      // A rule is a break, not content.
      open = null
      continue
    }
    if (open) {
      open.text = `${open.text} ${text}`
    } else {
      open = { type: 'paragraph', text }
      blocks.push(open)
    }
  }
  return blocks
}
