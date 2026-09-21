// A bounded lexer for masking literals, not a Python expression evaluator.
// Complex replacement fields fail closed rather than exposing literal fragments.
export function readCoachString(source, start, prefix = '') {
  const quoteAt = start + prefix.length, quote = source[quoteAt]
  const width = source.slice(quoteAt, quoteAt + 3) === quote.repeat(3) ? 3 : 1
  const formatted = /f/i.test(prefix)
  let i = quoteAt + width, depth = 0
  while (i < source.length) {
    const c = source[i]
    if (formatted && depth > 0) {
      // Quoted/nested f-strings, comments and escapes need a full Python parser.
      if (c === '"' || c === "'" || c === '#' || c === '\\') return null
      if (c === '{') depth++
      if (c === '}') depth--
      if (width === 1 && c === '\n') return null
      i++; continue
    }
    if (c === '\\') {
      if (formatted && /[{}]/.test(source[i + 1] || '')) return null
      i += 2; continue
    }
    if (source.slice(i, i + width) === quote.repeat(width)) return { end: i + width, closed: true, formatted }
    if (width === 1 && c === '\n') return { end: i, closed: false, formatted }
    if (formatted && (c === '{' || c === '}')) {
      if (source[i + 1] === c) { i += 2; continue }
      if (c === '}') return null
      depth = 1
    }
    i++
  }
  return depth ? null : { end: source.length, closed: false, formatted }
}
