// No free-text fields cross this boundary. The client encodes code before any
// request; the server accepts only this finite vocabulary and bounded indices.
// This is a lossy diagnostic representation, NEVER executable Python.
import { diagnoseLocalError } from './studioErrorCoachLocal.mjs'
const FINDINGS = Object.freeze(['none', 'constructor-not-called', 'call-missing-argument', 'name-spelling', 'attribute-spelling', 'import-spelling', 'module-spelling', 'name-commented-assignment', 'import-missing-target', 'import-missing-module', 'from-missing-module', 'from-missing-import', 'import-missing-alias', 'import-star-without-from'])
const WORDS = `False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield print input int float str len range list dict set tuple sum max min abs round sorted enumerate zip type open isinstance bool super self ColabTurtlePlus Turtle Screen turtle clearscreen forward backward back left right penup pendown color pencolor fillcolor pensize speed goto circle shape hideturtle showturtle begin_fill end_fill xcor ycor write setheading position setup bgcolor title clear update mainloop done pygame init quit display event time draw image font mixer Rect Surface set_mode set_caption flip get Clock tick load render blit fill KEYDOWN QUIT pandas DataFrame Series read_csv to_csv to_dict head tail columns index loc iloc numpy array arange zeros ones histogram random mean multiply randint seed choice rand randrange shuffle csv reader writer DictReader DictWriter math sqrt floor ceil sin cos pi itertools product permutations combinations groupby fractions Fraction matplotlib pyplot plot scatter hist bar show figure axes xlabel ylabel xticks yticks grid legend xlim ylim axvline axhline text append extend insert remove pop sort reverse count copy split strip replace lower upper startswith endswith find join tkinter Tk Canvas Button PhotoImage config grid create_image create_text itemconfig after after_cancel destroy`.split(' ')
export const STRUCTURE_WORDS = Object.freeze([...new Set(WORDS)])
const SYMBOLS = Object.freeze(['(', ')', '[', ']', '{', '}', ':', ',', '.', ';', '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '@', '\\'])
const TYPES = Object.freeze(['SyntaxError', 'IndentationError', 'TabError', 'NameError', 'UnboundLocalError', 'TypeError', 'AttributeError', 'ImportError', 'ModuleNotFoundError'])
const REASONS = Object.freeze(['syntax', 'unclosed-string', 'unclosed-bracket', 'bracket-mismatch', 'colon', 'comma', 'indent', 'undefined-name', 'unbound-name', 'missing-argument', 'module-call', 'not-callable', 'missing-attribute', 'missing-import', 'missing-module'])
const REASON_TYPES = { syntax: 'SyntaxError', 'unclosed-string': 'SyntaxError', 'unclosed-bracket': 'SyntaxError', 'bracket-mismatch': 'SyntaxError', colon: 'SyntaxError', comma: 'SyntaxError', indent: ['IndentationError', 'TabError'], 'undefined-name': 'NameError', 'unbound-name': 'UnboundLocalError', 'missing-argument': 'TypeError', 'module-call': 'TypeError', 'not-callable': 'TypeError', 'missing-attribute': 'AttributeError', 'missing-import': 'ImportError', 'missing-module': 'ModuleNotFoundError' }
const own = (o, key) => Object.prototype.hasOwnProperty.call(o, key)
const integer = (n, low, high) => Number.isInteger(n) && n >= low && n <= high
const exactKeys = (o, keys) => o && !Array.isArray(o) && Object.keys(o).sort().join(',') === keys.sort().join(',')

function classify(error) {
  const m = error.message || ''
  switch (error.type) {
    case 'SyntaxError': return /unterminated.*string|EOL while scanning string/.test(m) ? 'unclosed-string' : /was never closed/.test(m) ? 'unclosed-bracket' : /unmatched|does not match opening/.test(m) ? 'bracket-mismatch' : /expected ':'/.test(m) ? 'colon' : /Perhaps you forgot a comma/.test(m) ? 'comma' : 'syntax'
    case 'TabError': case 'IndentationError': return 'indent'
    case 'NameError': return /^NameError: name ['"].*['"] is not defined$/.test(m) ? 'undefined-name' : null
    case 'UnboundLocalError': return 'unbound-name'
    case 'TypeError': return /missing \d+ required positional argument/.test(m) ? 'missing-argument' : /'module' object is not callable/.test(m) ? 'module-call' : /object is not callable/.test(m) ? 'not-callable' : null
    case 'AttributeError': return /has no attribute/.test(m) ? 'missing-attribute' : null
    case 'ImportError': return /cannot import name/.test(m) ? 'missing-import' : null
    case 'ModuleNotFoundError': return 'missing-module'
    default: return null // Numeric/value/path-sensitive problems use local help.
  }
}

export function makeStructurePayload(source, error, mode = 'file', localAliases = null) {
  if (typeof source !== 'string' || !source || source.length > 50000 || !error.eligible || !['file', 'notebook'].includes(mode)) return null
  const count = source.split('\n').length
  if (!integer(error.line, 1, count) || (mode === 'notebook' && error.sameFileFrames > 1)) return null
  const reason = classify(error)
  if (!reason) return null
  const names = new Map(), strings = new Map(), numbers = new Map(), rows = [[]]
  const ref = (map, value) => { if (!map.has(value)) map.set(value, map.size + 1); return map.get(value) }
  const nameToken = value => STRUCTURE_WORDS.includes(value) ? ['w', STRUCTURE_WORDS.indexOf(value)] : ['v', ref(names, value)]
  const add = token => rows.at(-1).push(token)
  // Scan the entire source before selecting a window; strings/comments starting
  // outside the window cannot turn into outbound names or raw text.
  for (let i = 0; i < source.length;) {
    const c = source[i]
    if (c === '\n') { rows.push([]); i++; continue }
    if (c === '\r') { i++; continue }
    if (c === ' ' || c === '\t') { let n = 0; while (source[i] === c) { n++; i++ } if (n > 80) return null; add([c === ' ' ? 's' : 't', n]); continue }
    if (c === '#') { while (i < source.length && source[i] !== '\n') i++; continue }
    if (c === '"' || c === "'") {
      const triple = source.slice(i, i + 3) === c.repeat(3), width = triple ? 3 : 1, start = i
      i += width; let closed = false
      while (i < source.length) {
        if (source[i] === '\\') { i += 2; continue }
        if (source.slice(i, i + width) === c.repeat(width)) { i += width; closed = true; break }
        if (!triple && source[i] === '\n') break
        i++
      }
      const raw = source.slice(start, i), n = ref(strings, raw)
      add(['q', n])
      for (let j = 0; j < raw.split('\n').length - 1; j++) rows.push([])
      if (!closed && reason !== 'unclosed-string') return null
      continue
    }
    const name = source.slice(i).match(/^[\p{L}_][\p{L}\p{N}_]*/u)?.[0]
    if (name) {
      // f/r/b strings, dynamic access and reflection cannot be safely interpreted
      // after removing values. Do not guess or send the original as fallback.
      if ((/^(?:r|u|b|f|br|rb|fr|rf)$/i.test(name) && /['"]/.test(source[i + name.length] || '')) || ['eval', 'exec', 'getattr', 'setattr', 'globals', 'locals', '__import__'].includes(name)) return null
      add(nameToken(name)); i += name.length; continue
    }
    const num = source.slice(i).match(/^(?:0[xob][\da-f_]+|(?:\d[\d_]*(?:\.[\d_]*)?|\.\d[\d_]*)(?:e[+-]?\d[\d_]*)?j?)/i)?.[0]
    if (num) { add(['n', ref(numbers, num)]); i += num.length; continue }
    if (SYMBOLS.includes(c)) { add(['p', SYMBOLS.indexOf(c)]); i++; continue }
    return null // Unknown lexical content never becomes a passthrough string.
  }
  const start = Math.max(1, error.line - 8), end = Math.min(count, error.line + 4)
  const target = error.message.match(/(?:name |has no attribute |cannot import name |No module named )['"]([\p{L}_][\p{L}\p{N}_]*)['"]/u)?.[1]
  // No values from the error text: only reference a name already present in code.
  const name = target && (names.has(target) || STRUCTURE_WORDS.includes(target)) ? nameToken(target) : null
  const rule = diagnoseLocalError(error, source, mode)?.ruleId
  const finding = FINDINGS.includes(rule) ? rule : 'none'
  const payload = { version: 2, finding, mode, errorType: error.type, reason, line: error.line, start, rows: rows.slice(start - 1, end), name }
  try {
    const validated = validateStructurePayload(payload)
    // Optional browser-local lookup is NEVER a field of the request payload.
    if (localAliases) for (const [original, index] of names) localAliases[`variable_${index}`] = original
    return validated
  } catch { return null }
}

export function validateStructurePayload(data) {
  if (!exactKeys(data, ['version', 'finding', 'mode', 'errorType', 'reason', 'line', 'start', 'rows', 'name']) || data.version !== 2 || !FINDINGS.includes(data.finding) || !['file', 'notebook'].includes(data.mode) || !TYPES.includes(data.errorType) || !REASONS.includes(data.reason) || ![REASON_TYPES[data.reason]].flat().includes(data.errorType) || !integer(data.start, 1, 100000) || !integer(data.line, data.start, data.start + 12) || !Array.isArray(data.rows) || data.rows.length < 1 || data.rows.length > 13 || data.line >= data.start + data.rows.length) throw new Error('invalid-structure')
  const limits = { w: [0, STRUCTURE_WORDS.length - 1], p: [0, SYMBOLS.length - 1], v: [1, 512], q: [1, 512], n: [1, 512], s: [1, 80], t: [1, 8] }
  const token = t => Array.isArray(t) && t.length === 2 && own(limits, t[0]) && integer(t[1], ...limits[t[0]])
  if (data.rows.some(row => !Array.isArray(row) || row.length > 180 || row.some(t => !token(t))) || data.rows.flat().length > 900 || (data.name !== null && (!token(data.name) || !['w', 'v'].includes(data.name[0])))) throw new Error('invalid-tokens')
  if (JSON.stringify(data).length > 16000) throw new Error('oversized-structure')
  // Clone whitelisted fields, never spread a user-supplied object into upstream.
  return { version: 2, finding: data.finding, mode: data.mode, errorType: data.errorType, reason: data.reason, line: data.line, start: data.start, rows: data.rows.map(r => r.map(t => [t[0], t[1]])), name: data.name && [...data.name] }
}
const renderToken = ([kind, n]) => kind === 'w' ? STRUCTURE_WORDS[n] : kind === 'p' ? SYMBOLS[n] : kind === 'v' ? `variable_${n}` : kind === 'q' ? `"<text_${n}>"` : kind === 'n' ? `number_${n}` : (kind === 's' ? ' ' : '\t').repeat(n)
export function renderStructure(data) {
  const p = validateStructurePayload(data)
  const messages = { syntax: 'invalid syntax', 'unclosed-string': 'unterminated string literal', 'unclosed-bracket': 'opening bracket was never closed', 'bracket-mismatch': 'mismatched brackets', colon: "expected ':'", comma: 'Perhaps you forgot a comma', indent: 'indentation mismatch', 'undefined-name': `name '${p.name ? renderToken(p.name) : 'unknown_name'}' is not defined`, 'unbound-name': 'local variable used before assignment', 'missing-argument': 'missing required positional argument', 'module-call': "'module' object is not callable", 'not-callable': 'object is not callable', 'missing-attribute': `has no attribute '${p.name ? renderToken(p.name) : 'unknown_name'}'`, 'missing-import': 'cannot import requested name', 'missing-module': 'module not found' }
  return { mode: p.mode, preliminaryLocalFinding: p.finding, errorType: p.errorType, error: `${p.errorType}: ${messages[p.reason]}`, line: p.line, snippet: p.rows.map((row, i) => `${p.start + i}: ${row.map(renderToken).join('')}`).join('\n'), transformations: 'Custom names consistently renamed. Comments removed. String/number values replaced by typed placeholders. number_N denotes a numeric literal, NOT an undefined variable. Original spelling and literal values cannot be diagnosed from this representation. Line positions retained; imports outside the excerpt may be missing. This is NOT executable Python.' }
}

// Restore only custom-name aliases in the UI, with a single replacement pass.
// Never send this lookup to the API, telemetry, or browser persistent storage.
export function restoreCoachNames(text, aliases) {
  return String(text).replace(/\bvariable_\d+\b/g, name => own(aliases, name) ? aliases[name] : name)
}
