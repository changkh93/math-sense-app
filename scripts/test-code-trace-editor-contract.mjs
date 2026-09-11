import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../src/components/Space/CodeTracePlayer.jsx', import.meta.url), 'utf8')

assert.match(
  source,
  /\.\.\.studioCompletion\(\(\) => CODE_TRACE_COMPLETION_PROJECT\)/,
  'CODE TRACE should reuse the Code Studio Python completion engine',
)
assert.match(
  source,
  /closeBrackets\(\)/,
  'CODE TRACE should enable automatic closing for parentheses, brackets, braces, and quotes',
)
assert.match(
  source,
  /acceptCompletion\(view\) \|\| insertStringSuggestion\(view\) \|\| indentMore\(view\)/,
  'Tab should accept autocomplete before falling back to the trace string helper or indentation',
)
assert.match(
  source,
  /\.\.\.closeBracketsKeymap/,
  'paired bracket deletion and navigation key bindings should be installed',
)

console.log('code trace editor contract tests passed')
