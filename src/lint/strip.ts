import type { Language } from './types.ts'

/**
 * Blank out comments, keeping string contents, total length and line breaks, so that
 * offsets and line numbers still match the original source. A light tokenizer, not a parser.
 */
export function stripComments(source: string, language: Language): string {
  const out: string[] = []
  const n = source.length
  let i = 0
  const blank = (ch: string) => (ch === '\n' || ch === '\r' ? ch : ' ')

  while (i < n) {
    const c = source[i]!
    const c2 = source[i + 1]

    if (language === 'js' && c === '/' && c2 === '/') {
      while (i < n && source[i] !== '\n') out.push(blank(source[i++]!))
      continue
    }
    if (language === 'js' && c === '/' && c2 === '*') {
      out.push(' ', ' ')
      i += 2
      while (i < n && !(source[i] === '*' && source[i + 1] === '/')) out.push(blank(source[i++]!))
      if (i < n) {
        out.push(' ', ' ')
        i += 2
      }
      continue
    }
    if (language === 'py' && c === '#') {
      while (i < n && source[i] !== '\n') out.push(blank(source[i++]!))
      continue
    }

    if (c === '"' || c === "'" || c === '`') {
      // Python triple-quoted strings
      const triple = language === 'py' && c !== '`' && source.startsWith(c.repeat(3), i)
      const closer = triple ? c.repeat(3) : c
      out.push(closer)
      i += closer.length
      while (i < n) {
        if (source[i] === '\\' && i + 1 < n) {
          out.push(source[i]!, source[i + 1]!)
          i += 2
          continue
        }
        if (source.startsWith(closer, i)) {
          out.push(closer)
          i += closer.length
          break
        }
        // A single-quoted string does not span lines (except JS template literals).
        if (!triple && c !== '`' && source[i] === '\n') break
        out.push(source[i]!)
        i++
      }
      continue
    }

    out.push(c)
    i++
  }
  return out.join('')
}

/** 1-based line number of a character offset. */
export function lineOf(text: string, offset: number): number {
  let line = 1
  for (let i = 0; i < offset && i < text.length; i++) if (text[i] === '\n') line++
  return line
}

/**
 * Given the offset of an opening "(" return the text between it and its matching ")",
 * skipping over strings. Returns null if unbalanced.
 */
export function callArgs(code: string, openParen: number): string | null {
  let depth = 0
  for (let i = openParen; i < code.length; i++) {
    const c = code[i]!
    if (c === '"' || c === "'" || c === '`') {
      i++
      while (i < code.length && code[i] !== c) {
        if (code[i] === '\\') i++
        i++
      }
      continue
    }
    if (c === '(') depth++
    else if (c === ')') {
      depth--
      if (depth === 0) return code.slice(openParen + 1, i)
    }
  }
  return null
}
