import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { filterCompletionOptionsByPrefix } from '../src/components/PythonWorld/studioCompletion.js'
import { alignCodeTraceLineKeys } from '../src/utils/codeTraceDiffUtils.js'

const source = readFileSync(new URL('../src/components/Space/CodeTracePlayer.jsx', import.meta.url), 'utf8')
const errorBoundarySource = readFileSync(new URL('../src/components/ErrorBoundary.jsx', import.meta.url), 'utf8')
const viteConfigSource = readFileSync(new URL('../vite.config.js', import.meta.url), 'utf8')

assert.match(
  source,
  /\.\.\.studioCompletion\(\(\) => CODE_TRACE_COMPLETION_PROJECT, \{ strictPrefix: true \}\)/,
  'CODE TRACE should reuse the Code Studio Python completion engine with strict prefix matching',
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
assert.match(
  source,
  /className="code-trace-split-handle"[\s\S]*role="separator"/,
  'answer and student panes should expose a draggable, keyboard-accessible width separator',
)
assert.match(
  source,
  /studentPanelDetached \? 'is-detached' : ''/,
  'the student editor should support a detached resizable panel mode',
)
assert.match(
  source,
  /className="code-trace-student-toolbar" onPointerDown=\{startFloatingPanelMove\}/,
  'the detached student panel title bar should support pointer dragging',
)
assert.match(
  source,
  /startFloatingPanelResize[\s\S]*data-direction=\{direction\}/,
  'the detached student panel should expose explicit resize handles on every edge and corner',
)
assert.match(
  source,
  /studentPanelExpanded \? '창 크기로 복원' : '전체 화면'/,
  'the detached student panel should expose clear maximize and restore controls',
)
assert.match(
  source,
  /fillAvailableHeight=\{studentPanelDetached\}/,
  'the editor should fill the available height whenever the student panel is detached and resized',
)
assert.match(
  source,
  /flex: fillAvailableHeight \? '1 1 0' : undefined[\s\S]*maxHeight: fillAvailableHeight \? 'none'/,
  'detached editor height must grow with the floating panel instead of keeping the normal 720px cap',
)
assert.match(
  source,
  /ResizeObserver[\s\S]*requestMeasure/,
  'CodeMirror should remeasure itself while the floating panel changes size',
)
assert.match(
  source,
  /\.code-trace-answer-gutter[\s\S]*position: sticky;[\s\S]*left: 0;/,
  'answer line numbers should remain fixed during horizontal scrolling',
)
assert.match(
  errorBoundarySource,
  /STALE_CHUNK_RELOAD_COOLDOWN_MS[\s\S]*Date\.now\(\) - lastReloadAt/,
  'a later Vite outdated-dependency error for the same lazy module should be allowed to recover',
)
assert.doesNotMatch(
  errorBoundarySource,
  /if \(!sessionStorage\.getItem\(key\)\)/,
  'lazy-module recovery must not be permanently disabled for the rest of the browser session',
)
assert.match(
  viteConfigSource,
  /dedupe:\s*\['react', 'react-dom'\]/,
  'Vite must not optimize the app with React copies from nested video projects',
)
assert.match(
  viteConfigSource,
  /'react-dom\/client'/,
  'the root ReactDOM client entry should be eagerly optimized before lazy CODE TRACE loading',
)
const completionSource = readFileSync(new URL('../src/components/PythonWorld/studioCompletion.js', import.meta.url), 'utf8')
assert.match(
  completionSource,
  /options = filterCompletionOptionsByPrefix\(options, typed\)/,
  'strict completion should reject fuzzy and substring-only candidates',
)
assert.match(
  completionSource,
  /validFor: strictPrefix\s*\? text => text === typed/,
  'strict completion should refresh after each edit instead of reusing fuzzy-filtered candidates',
)

const prefixOptions = [
  { label: 'running' },
  { label: 'RuntimeWarning' },
  { label: 'round' },
]
assert.deepEqual(
  filterCompletionOptionsByPrefix(prefixOptions, 'runn').map(option => option.label),
  ['running'],
  '`runn` should keep `running` and reject fuzzy `RuntimeWarning`/`round` matches',
)
assert.deepEqual(
  filterCompletionOptionsByPrefix(prefixOptions, 'Runn'),
  [],
  'prefix matching should respect Python identifier casing and order',
)

const repeatedBlankLineKeys = [
  'score', '', 'round', '', 'lives', '', 'wanted', '', 'round_time', '',
  'safe_zone', '', 'blit_score', 'blit_round', 'blit_lives', 'draw_wanted', '',
  'draw_safe_zone', '', 'pause_game', '', 'reset_game',
]
const oneEditedLineKeys = [...repeatedBlankLineKeys]
oneEditedLineKeys[4] = 'lives_with_different_string'

const editedPairs = alignCodeTraceLineKeys(repeatedBlankLineKeys, oneEditedLineKeys)
assert.deepEqual(
  editedPairs.find(pair => pair.answerIndex === 4),
  { answerIndex: 4, studentIndex: 4 },
  'one edited line should stay paired instead of becoming a missing+extra pair',
)
assert.deepEqual(
  editedPairs.find(pair => pair.answerIndex === 15),
  { answerIndex: 15, studentIndex: 15 },
  'repeated blank lines must not make a later correct draw line appear missing',
)

const oneMissingLineKeys = repeatedBlankLineKeys.filter((_, index) => index !== 12)
const missingPairs = alignCodeTraceLineKeys(repeatedBlankLineKeys, oneMissingLineKeys)
assert.deepEqual(
  missingPairs.find(pair => pair.answerIndex === 12),
  { answerIndex: 12, studentIndex: -1 },
  'a truly omitted line should still be reported as missing',
)
assert.deepEqual(
  missingPairs.find(pair => pair.answerIndex === 15),
  { answerIndex: 15, studentIndex: 14 },
  'alignment should recover after a truly omitted line',
)

console.log('code trace editor contract tests passed')
