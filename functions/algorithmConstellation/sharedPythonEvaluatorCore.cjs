/**
 * Shared Safe Restricted Python AST Evaluator Core
 * Single source of truth for evaluation semantics across:
 * 1. Client Web Worker (Local RUN & Trace generation)
 * 2. Server Authoritative Judge (Hidden test suite evaluation)
 *
 * Supported Grammar:
 * - Literals (int, float, bool, str, list, tuple, set)
 * - from collections import deque (popleft, pop, append)
 * - Variables & Assignments (a = 0, (r, c) = (0, 0), total += x, -=, *=)
 * - Operators (+, -, *, //, /, %, and, or, not, ==, !=, <, <=, >, >=, in, not in)
 * - Chained Comparisons (0 <= nr < rows)
 * - Subscripts (list[i], grid[r][c])
 * - Built-in helpers (len, sum, abs, bool, list, deque, set.add)
 * - Control flow: if / elif / else, while, for ... in ... (with tuple destructuring)
 * - Early return
 * - Fail-closed step limit (MAX_STEPS bounded)
 */

const MAX_STEPS = 100_000
const MAX_SOURCE_LENGTH = 16_000
const MAX_TRACE_EVENTS = 1_500

function evaluatorError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function isPythonTruthy(val) {
  if (val === null || val === undefined || val === false || val === 0 || val === '') return false
  if (Array.isArray(val) && val.length === 0) return false
  if (val instanceof Set && val.size === 0) return false
  return true
}

function matchesExpected(actual, expected) {
  if (Array.isArray(actual) && Array.isArray(expected)) {
    return JSON.stringify(actual) === JSON.stringify(expected)
  }
  return actual === expected
}

const FORBIDDEN_SOURCE = /(?:\b(?:os|sys|subprocess|shutil|socket|http|urllib|requests|pickle|shelve|eval|exec|compile|open|file|input|globals|locals|getattr|setattr|delattr|breakpoint|globalThis|window|document|process)\b|__)/

const ALLOWED_IMPORT = /^from\s+collections\s+import\s+deque\s*$/

function assertSupportedImports(source) {
  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if ((line.startsWith('import ') || line.startsWith('from ')) && !ALLOWED_IMPORT.test(line)) {
      throw evaluatorError('UNSUPPORTED_SYNTAX', '현재 미션에서는 from collections import deque 외의 import를 사용할 수 없습니다.')
    }
  }
}

function countDelimBalance(str) {
  let count = 0
  let insideStr = false
  let strChar = ''
  for (let idx = 0; idx < str.length; idx++) {
    const ch = str[idx]
    if ((ch === '"' || ch === "'") && (idx === 0 || str[idx - 1] !== '\\')) {
      if (!insideStr) {
        insideStr = true
        strChar = ch
      } else if (strChar === ch) {
        insideStr = false
      }
    }
    if (!insideStr) {
      if (ch === '(' || ch === '[' || ch === '{') count++
      else if (ch === ')' || ch === ']' || ch === '}') count--
    }
  }
  return count
}

class SafePythonInterpreter {
  constructor(source, entryFunction, args = {}, options = {}) {
    this.source = source
    this.entryFunction = entryFunction
    this.args = typeof structuredClone === 'function' ? structuredClone(args) : JSON.parse(JSON.stringify(args || {}))
    this.steps = 0
    this.maxSteps = Math.max(1, Math.min(options.maxSteps ?? MAX_STEPS, MAX_STEPS))
    this.onStep = options.onStep || null
    this.onTrace = options.onTrace || null
    this.maxTraceEvents = Math.max(1, Math.min(options.maxTraceEvents ?? MAX_TRACE_EVENTS, MAX_TRACE_EVENTS))
    this.traceEvents = []
    this.currentStatement = null
    this.currentSourceLine = null
    this.blockLineNumbers = new WeakMap()
    this.globalEnv = {
      True: true,
      False: false,
      None: null,
      len: (obj) => {
        if (Array.isArray(obj) || typeof obj === 'string') return obj.length
        if (obj instanceof Set) return obj.size
        throw evaluatorError('TYPE_ERROR', 'len()은 목록, 문자열, 집합에만 사용할 수 있습니다.')
      },
      sum: (list) => {
        if (!Array.isArray(list)) throw evaluatorError('TYPE_ERROR', 'sum()은 목록에만 사용할 수 있습니다.')
        return list.reduce((a, b) => a + b, 0)
      },
      abs: (x) => Math.abs(x),
      bool: (x) => isPythonTruthy(x),
      list: (x) => (Array.isArray(x) ? [...x] : Array.from(x || [])),
      deque: (iter) => (Array.isArray(iter) ? [...iter] : iter ? Array.from(iter) : []),
      range: (...args) => {
        let start = 0
        let stop = 0
        let step = 1
        if (args.length === 1) {
          stop = args[0]
        } else if (args.length === 2) {
          start = args[0]
          stop = args[1]
        } else if (args.length >= 3) {
          start = args[0]
          stop = args[1]
          step = args[2]
        }
        if (step === 0) throw evaluatorError('VALUE_ERROR', 'range()의 step은 0이 될 수 없습니다.')
        const estimatedSize = step > 0
          ? Math.max(0, Math.ceil((stop - start) / step))
          : Math.max(0, Math.ceil((start - stop) / Math.abs(step)))
        if (!Number.isFinite(estimatedSize) || estimatedSize > this.maxSteps) {
          throw evaluatorError('LIMIT_EXCEEDED', `range()가 허용된 항목 수(${this.maxSteps})를 초과합니다.`)
        }
        const result = []
        if (step > 0) {
          for (let i = start; i < stop; i += step) result.push(i)
        } else {
          for (let i = start; i > stop; i += step) result.push(i)
        }
        return result
      },
      set: (iter) => {
        if (!iter) return new Set()
        const s = new Set()
        const items = Array.isArray(iter) ? iter : (typeof iter === 'string' ? iter.split('') : Array.from(iter))
        items.forEach((item) => s.add(typeof item === 'object' && item !== null ? JSON.stringify(item) : item))
        return s
      },
      min: (...args) => {
        if (args.length === 1 && (Array.isArray(args[0]) || args[0] instanceof Set)) {
          const arr = Array.from(args[0])
          if (arr.length === 0) throw evaluatorError('VALUE_ERROR', 'min()의 인자가 비어 있습니다.')
          return Math.min(...arr)
        }
        if (args.length >= 2) return Math.min(...args)
        throw evaluatorError('TYPE_ERROR', 'min() 인자가 올바르지 않습니다.')
      },
      max: (...args) => {
        if (args.length === 1 && (Array.isArray(args[0]) || args[0] instanceof Set)) {
          const arr = Array.from(args[0])
          if (arr.length === 0) throw evaluatorError('VALUE_ERROR', 'max()의 인자가 비어 있습니다.')
          return Math.max(...arr)
        }
        if (args.length >= 2) return Math.max(...args)
        throw evaluatorError('TYPE_ERROR', 'max() 인자가 올바르지 않습니다.')
      },
      sorted: (iter, reverse = false) => {
        const arr = Array.from(iter || [])
        arr.sort((a, b) => {
          if (typeof a === 'number' && typeof b === 'number') return reverse ? b - a : a - b
          return reverse ? String(b).localeCompare(String(a)) : String(a).localeCompare(String(b))
        })
        return arr
      },
    }
  }

  tick(context = {}) {
    this.steps++
    if (this.steps > this.maxSteps) {
      throw evaluatorError('LIMIT_EXCEEDED', `허용되지 않는 스텝 한도(최대 실행 단계 수)(${this.maxSteps})를 초과했습니다 (무한 루프 방지).`)
    }
    if (this.onStep) {
      this.onStep(this.steps, context)
    }
  }

  snapshotValue(value, depth = 0) {
    if (depth > 4) return '[depth-limited]'
    if (value instanceof Set) return Array.from(value).slice(0, 100).map((item) => this.snapshotValue(item, depth + 1))
    if (Array.isArray(value)) return value.slice(0, 100).map((item) => this.snapshotValue(item, depth + 1))
    if (value && typeof value === 'object') {
      return Object.fromEntries(Object.entries(value).slice(0, 100).map(([key, item]) => [key, this.snapshotValue(item, depth + 1)]))
    }
    if (typeof value === 'string' && value.length > 500) return `${value.slice(0, 500)}…`
    return value
  }

  sourceSpanFor(statementText = '', sourceLineHint = null) {
    const target = String(statementText).trim()
    const sourceLines = this.source.split('\n')
    const hintedIndex = Number.isInteger(sourceLineHint) ? sourceLineHint - 1 : -1
    const index = hintedIndex >= 0 && hintedIndex < sourceLines.length
      ? hintedIndex
      : sourceLines.findIndex((line) => line.trim() === target)
    if (index < 0) return { startLine: null, startColumn: null, endLine: null, endColumn: null }
    return {
      startLine: index + 1,
      startColumn: Math.max(1, sourceLines[index].search(/\S/) + 1),
      endLine: index + 1,
      endColumn: sourceLines[index].length + 1,
    }
  }

  emitTrace(eventType, { stateDiff = [], worldDiff = {}, metadata = {}, statementText, sourceLineHint } = {}) {
    if (this.traceEvents.length >= this.maxTraceEvents) {
      if (this.traceEvents[this.traceEvents.length - 1]?.eventType !== 'trace-truncated') {
        this.traceEvents.push({
          traceSchemaVersion: 2,
          eventId: `evt_${this.traceEvents.length}`,
          runtimeStepIndex: this.steps,
          eventType: 'trace-truncated',
          statementId: null,
          sourceSpan: { startLine: null, startColumn: null, endLine: null, endColumn: null },
          sourceLine: null,
          frame: { frameId: 'frame_0', functionName: this.entryFunction, callDepth: 0 },
          stateDiff: [],
          worldDiff: {},
          metadata: { reason: 'max-trace-events' },
        })
      }
      return
    }

    const statement = statementText || this.currentStatement || ''
    const sourceSpan = this.sourceSpanFor(statement, sourceLineHint ?? this.currentSourceLine)
    const event = {
      traceSchemaVersion: 2,
      eventId: `evt_${this.traceEvents.length}`,
      runtimeStepIndex: this.steps,
      eventType,
      statementId: sourceSpan.startLine ? `stmt_${this.entryFunction}_${sourceSpan.startLine}` : null,
      sourceSpan,
      sourceLine: sourceSpan.startLine,
      frame: { frameId: 'frame_0', functionName: this.entryFunction, callDepth: 0 },
      stateDiff: this.snapshotValue(stateDiff),
      worldDiff: this.snapshotValue(worldDiff),
      metadata: this.snapshotValue(metadata),
    }
    this.traceEvents.push(event)
    this.onTrace?.(event)
  }

  evaluateExpression(expr, env) {
    this.tick({ type: 'EXPR', expr })
    const trimmed = expr.trim()
    if (!trimmed) return null

    // Literals
    if (trimmed === 'True') return true
    if (trimmed === 'False') return false
    if (trimmed === 'None') return null
    if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10)
    if (/^-?\d+\.\d+$/.test(trimmed)) return parseFloat(trimmed)

    // String literals: 'foo' or "foo"
    const strMatch = trimmed.match(/^(['"])(.*)\1$/)
    if (strMatch) return strMatch[2]

    // Ternary expression: A if COND else B
    const ternaryMatch = trimmed.match(/^(.+?)\s+if\s+(.+?)\s+else\s+(.+)$/)
    if (ternaryMatch) {
      const [, exprTrue, cond, exprFalse] = ternaryMatch
      const isTrue = isPythonTruthy(this.evaluateExpression(cond, env))
      return isTrue ? this.evaluateExpression(exprTrue, env) : this.evaluateExpression(exprFalse, env)
    }

    // Top-level comma-separated tuple expression (e.g. cargos[1], cargos[0] or a, b)
    const topLevelArgs = this.splitArguments(trimmed)
    if (topLevelArgs.length > 1) {
      return topLevelArgs.map((item) => this.evaluateExpression(item, env))
    }

    // List literal: [1, 2, 3] or []
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return []
      return this.splitArguments(inner).map((item) => this.evaluateExpression(item, env))
    }

    // Set / Dict / Tuple literal: {(0, 0)}, {'k': v} or (0, 0, 0)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim()
      if (inner.includes(':')) {
        const obj = {}
        if (inner) {
          this.splitArguments(inner).forEach((pair) => {
            const colonIdx = pair.indexOf(':')
            if (colonIdx !== -1) {
              const k = this.evaluateExpression(pair.slice(0, colonIdx).trim(), env)
              const v = this.evaluateExpression(pair.slice(colonIdx + 1).trim(), env)
              obj[k] = v
            }
          })
        }
        return obj
      }
      const s = new Set()
      if (inner) {
        this.splitArguments(inner).forEach((item) => {
          const val = this.evaluateExpression(item, env)
          s.add(typeof val === 'object' && val !== null ? JSON.stringify(val) : val)
        })
      }
      return s
    }
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return []
      const parts = this.splitArguments(inner)
      if (parts.length === 1 && !inner.endsWith(',')) {
        return this.evaluateExpression(parts[0], env)
      }
      return parts.map((item) => this.evaluateExpression(item, env))
    }

    // Boolean binary operators: 'or' (lowest precedence)
    const orParts = this.splitTopLevel(trimmed, 'or')
    if (orParts.length > 1) {
      let lastValue = null
      for (const part of orParts) {
        lastValue = this.evaluateExpression(part, env)
        if (isPythonTruthy(lastValue)) return lastValue
      }
      return lastValue
    }

    // Boolean binary operators: 'and'
    const andParts = this.splitTopLevel(trimmed, 'and')
    if (andParts.length > 1) {
      let lastValue = null
      for (const part of andParts) {
        lastValue = this.evaluateExpression(part, env)
        if (!isPythonTruthy(lastValue)) return lastValue
      }
      return lastValue
    }

    // Boolean unary: 'not'
    if (trimmed.startsWith('not ')) {
      return !isPythonTruthy(this.evaluateExpression(trimmed.slice(4), env))
    }

    // Comparisons: Chained comparisons (e.g. 0 <= nr < rows)
    const chainedMatch = trimmed.match(/^(.+?)\s*(<=|<|>=|>|==|!=)\s*(.+?)\s*(<=|<|>=|>|==|!=)\s*(.+)$/)
    if (chainedMatch) {
      const [, leftExpr, op1, midExpr, op2, rightExpr] = chainedMatch
      const res1 = this.evaluateExpression(`${leftExpr} ${op1} ${midExpr}`, env)
      const res2 = this.evaluateExpression(`${midExpr} ${op2} ${rightExpr}`, env)
      return Boolean(res1) && Boolean(res2)
    }

    // Comparisons: ==, !=, <=, >=, <, >, not in, in
    const compOps = ['==', '!=', '<=', '>=', '<', '>', ' not in ', ' in ']
    for (const op of compOps) {
      const parts = this.splitTopLevel(trimmed, op.trim(), op)
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0], env)
        const right = this.evaluateExpression(parts[1], env)
        if (['%', '//', '/'].includes(op) && right === 0) {
          throw evaluatorError('ZERO_DIVISION', '0으로 나눌 수 없습니다.')
        }
        const trimmedOp = op.trim()
        if (trimmedOp === '==') return matchesExpected(left, right)
        if (trimmedOp === '!=') return !matchesExpected(left, right)
        if (trimmedOp === '<') return left < right
        if (trimmedOp === '<=') return left <= right
        if (trimmedOp === '>') return left > right
        if (trimmedOp === '>=') return left >= right
        if (trimmedOp === 'in') {
          if (right instanceof Set) return right.has(typeof left === 'object' ? JSON.stringify(left) : left)
          if (Array.isArray(right)) return right.some((r) => matchesExpected(r, left))
          return false
        }
        if (trimmedOp === 'not in') {
          if (right instanceof Set) return !right.has(typeof left === 'object' ? JSON.stringify(left) : left)
          if (Array.isArray(right)) return !right.some((r) => matchesExpected(r, left))
          return true
        }
      }
    }

    // Additive / Subtractive: +, -
    const addParts = this.splitAdditive(trimmed)
    if (addParts.length > 1) {
      let total = this.evaluateExpression(addParts[0].expr, env)
      for (let i = 1; i < addParts.length; i++) {
        const val = this.evaluateExpression(addParts[i].expr, env)
        if (addParts[i].op === '+') {
          if (Array.isArray(total) && Array.isArray(val)) total = [...total, ...val]
          else total = total + val
        } else if (addParts[i].op === '-') {
          total = total - val
        }
      }
      return total
    }

    // Multiplicative / Modulo: %, *, //, /
    const multOps = ['%', '*', '//', '/']
    for (const op of multOps) {
      const parts = this.splitTopLevel(trimmed, op)
      if (parts.length === 2) {
        const left = this.evaluateExpression(parts[0], env)
        const right = this.evaluateExpression(parts[1], env)
        if (['%', '//', '/'].includes(op) && right === 0) {
          throw evaluatorError('ZERO_DIVISION', '0으로 나눌 수 없습니다.')
        }
        if (op === '%') return left % right
        if (op === '*') return left * right
        if (op === '//') return Math.floor(left / right)
        if (op === '/') return left / right
      }
    }

    // Function / Method Calls: fn(...), obj.method(...)
    const callMatch = trimmed.match(/^([A-Za-z0-9_.]+)\((.*)\)$/)
    if (callMatch) {
      const [, target, argsStr] = callMatch
      const rawArgs = argsStr.trim() ? this.splitArguments(argsStr).map((a) => this.evaluateExpression(a, env)) : []

      if (target.includes('.')) {
        const [objName, methodName] = target.split('.')
        const obj = Object.hasOwn(env, objName) ? env[objName] : this.globalEnv[objName]
        if (obj !== undefined && obj !== null) {
          if (Array.isArray(obj)) {
            if (methodName === 'popleft' || methodName === 'pop') {
              const before = this.snapshotValue(obj)
              const result = methodName === 'popleft' ? obj.shift() : obj.pop()
              this.emitTrace('container-mutation', {
                stateDiff: [{ kind: 'mutation', path: objName, before, after: this.snapshotValue(obj) }],
                metadata: { operation: methodName },
              })
              return result
            }
            if (methodName === 'append') {
              const before = this.snapshotValue(obj)
              obj.push(rawArgs[0])
              this.emitTrace('container-mutation', {
                stateDiff: [{ kind: 'mutation', path: objName, before, after: this.snapshotValue(obj) }],
                metadata: { operation: 'append', value: this.snapshotValue(rawArgs[0]) },
              })
              return null
            }
          }
          if (obj instanceof Set) {
            if (methodName === 'add') {
              const arg = rawArgs[0]
              const before = this.snapshotValue(obj)
              obj.add(typeof arg === 'object' ? JSON.stringify(arg) : arg)
              this.emitTrace('container-mutation', {
                stateDiff: [{ kind: 'mutation', path: objName, before, after: this.snapshotValue(obj) }],
                metadata: { operation: 'set.add', value: this.snapshotValue(arg) },
              })
              return null
            }
          }
        }
        throw evaluatorError('UNSUPPORTED_SYNTAX', `지원하지 않는 메서드 호출입니다: ${target}`)
      }

      const fn = Object.hasOwn(env, target) ? env[target] : this.globalEnv[target]
      if (typeof fn === 'function') {
        return fn(...rawArgs)
      }
      throw evaluatorError('NAME_ERROR', `정의되지 않은 함수입니다: ${target}`)
    }

    // Subscript / Indexing / Slicing: list[idx], str[start:end:step], 'STR'[::-1], or obj[a][b]
    const indexMatch = trimmed.match(/^((?:['"][^'"]*['"]|[A-Za-z0-9_]+|\([^)]+\)))((?:\[[^\]]+\])+)$/)
    if (indexMatch) {
      const [, baseExpr, bracketChain] = indexMatch
      let current = null
      if (/^['"].*['"]$/.test(baseExpr)) {
        current = baseExpr.slice(1, -1)
      } else {
        current = Object.hasOwn(env, baseExpr) ? env[baseExpr] : this.globalEnv[baseExpr]
      }
      if (current === undefined || current === null) {
        throw evaluatorError('NAME_ERROR', `정의되지 않은 값입니다: ${baseExpr}`)
      }
      const brackets = bracketChain.match(/\[([^\]]+)\]/g) || []
      for (const bracket of brackets) {
        if (current === undefined || current === null) {
          throw evaluatorError('INDEX_ERROR', '존재하지 않는 값에 인덱스를 사용할 수 없습니다.')
        }
        const inner = bracket.slice(1, -1).trim()
        if (inner.includes(':')) {
          const sliceParts = inner.split(':').map((p) => p.trim())
          const isStr = typeof current === 'string'
          const arr = isStr ? current.split('') : Array.from(current || [])
          const start = sliceParts[0] ? this.evaluateExpression(sliceParts[0], env) : null
          const end = sliceParts[1] ? this.evaluateExpression(sliceParts[1], env) : null
          const step = sliceParts.length > 2 && sliceParts[2] ? this.evaluateExpression(sliceParts[2], env) : 1
          if (step === 0) throw evaluatorError('VALUE_ERROR', 'slice step은 0이 될 수 없습니다.')

          if (step === -1 && start === null && end === null) {
            const reversed = [...arr].reverse()
            current = isStr ? reversed.join('') : reversed
          } else {
            const effectiveStart = start === null ? (step > 0 ? 0 : arr.length - 1) : (start < 0 ? arr.length + start : start)
            const effectiveEnd = end === null ? (step > 0 ? arr.length : -1) : (end < 0 ? arr.length + end : end)
            const sliced = []
            if (step > 0) {
              for (let idx = effectiveStart; idx < effectiveEnd && idx < arr.length; idx += step) {
                if (idx >= 0) sliced.push(arr[idx])
              }
            } else {
              for (let idx = effectiveStart; idx > effectiveEnd && idx >= 0; idx += step) {
                if (idx < arr.length) sliced.push(arr[idx])
              }
            }
            current = isStr ? sliced.join('') : sliced
          }
        } else {
          const idx = this.evaluateExpression(inner, env)
          if (typeof current === 'string' || Array.isArray(current)) {
            const resolvedIdx = idx < 0 ? current.length + idx : idx
            current = current[resolvedIdx]
          } else {
            current = current[idx]
          }
        }
      }
      return current
    }

    // Variable lookup
    if (Object.hasOwn(env, trimmed)) return env[trimmed]
    if (Object.hasOwn(this.globalEnv, trimmed)) return this.globalEnv[trimmed]

    throw evaluatorError('NAME_ERROR', `정의되지 않았거나 지원하지 않는 표현식입니다: ${trimmed}`)
  }

  splitTopLevel(source, keyword, literal = null) {
    const target = (literal || keyword).trim()
    const isWord = /^[a-zA-Z]/.test(target)
    let depth = 0
    let insideStr = false
    let strChar = ''

    for (let i = 0; i < source.length; i++) {
      const ch = source[i]
      if ((ch === '"' || ch === "'") && (i === 0 || source[i - 1] !== '\\')) {
        if (!insideStr) {
          insideStr = true
          strChar = ch
        } else if (strChar === ch) {
          insideStr = false
        }
      }
      if (!insideStr) {
        if (ch === '(' || ch === '[' || ch === '{') depth++
        else if (ch === ')' || ch === ']' || ch === '}') depth--
        else if (depth === 0) {
          if (source.startsWith(target, i)) {
            if (isWord) {
              const prev = i > 0 ? source[i - 1] : ' '
              const next = i + target.length < source.length ? source[i + target.length] : ' '
              if (/[\s(),[\]{}]/.test(prev) && /[\s(),[\]{}]/.test(next)) {
                return [source.slice(0, i).trim(), source.slice(i + target.length).trim()]
              }
            } else {
              return [source.slice(0, i).trim(), source.slice(i + target.length).trim()]
            }
          }
        }
      }
    }
    return [source]
  }

  splitAdditive(source) {
    const parts = []
    let depth = 0
    let insideStr = false
    let strChar = ''
    let lastIdx = 0
    let currentOp = '+'

    for (let i = 0; i < source.length; i++) {
      const ch = source[i]
      if ((ch === '"' || ch === "'") && (i === 0 || source[i - 1] !== '\\')) {
        if (!insideStr) {
          insideStr = true
          strChar = ch
        } else if (strChar === ch) {
          insideStr = false
        }
      }
      if (!insideStr) {
        if (ch === '(' || ch === '[' || ch === '{') depth++
        else if (ch === ')' || ch === ']' || ch === '}') depth--
        else if (depth === 0 && (ch === '+' || ch === '-') && i > 0 && source[i - 1] !== 'e' && source[i - 1] !== 'E') {
          const prevStr = source.slice(lastIdx, i).trim()
          if (prevStr.length > 0) {
            parts.push({ op: currentOp, expr: prevStr })
            currentOp = ch
            lastIdx = i + 1
          }
        }
      }
    }
    const rem = source.slice(lastIdx).trim()
    if (rem) parts.push({ op: currentOp, expr: rem })
    return parts
  }

  splitArguments(argsStr) {
    const args = []
    let depth = 0
    let insideStr = false
    let strChar = ''
    let lastIdx = 0

    for (let i = 0; i < argsStr.length; i++) {
      const ch = argsStr[i]
      if ((ch === '"' || ch === "'") && (i === 0 || argsStr[i - 1] !== '\\')) {
        if (!insideStr) {
          insideStr = true
          strChar = ch
        } else if (strChar === ch) {
          insideStr = false
        }
      }
      if (!insideStr) {
        if (ch === '(' || ch === '[' || ch === '{') depth++
        else if (ch === ')' || ch === ']' || ch === '}') depth--
        else if (depth === 0 && ch === ',') {
          args.push(argsStr.slice(lastIdx, i).trim())
          lastIdx = i + 1
        }
      }
    }
    const rem = argsStr.slice(lastIdx).trim()
    if (rem) args.push(rem)
    return args
  }

  execute() {
    if (!this.source || typeof this.source !== 'string') {
      throw evaluatorError('INVALID_SOURCE', '유효한 Python 코드가 아닙니다.')
    }
    if (this.source.length > MAX_SOURCE_LENGTH) {
      throw evaluatorError('LIMIT_EXCEEDED', '코드 크기가 허용 한도를 초과했습니다.')
    }
    if (FORBIDDEN_SOURCE.test(this.source)) {
      throw evaluatorError('UNSUPPORTED_SYNTAX', '지원하지 않는 Python 문장 또는 식별자가 포함되어 있습니다.')
    }
    assertSupportedImports(this.source)

    const rawLines = this.source.split('\n')
    const lines = []
    const lineNumbers = []
    let insideFn = false
    let fnIndent = 0

    for (let rawIndex = 0; rawIndex < rawLines.length; rawIndex++) {
      const line = rawLines[rawIndex]
      if (line.trim().startsWith('#') || !line.trim()) continue
      if (line.trim().startsWith('from ') || line.trim().startsWith('import ')) continue

      const defMatch = line.match(/^(\s*)def\s+([A-Za-z0-9_]+)\s*\((.*)\):/)
      if (defMatch) {
        const [, indent, fnName] = defMatch
        if (fnName === this.entryFunction) {
          insideFn = true
          fnIndent = indent.length
          continue
        }
      }
      if (insideFn) {
        const currentIndent = line.search(/\S/)
        if (currentIndent <= fnIndent && currentIndent !== -1) {
          break
        }
        lines.push(line.slice(fnIndent + 4))
        lineNumbers.push(rawIndex + 1)
      }
    }

    if (!insideFn && !rawLines.some((l) => l.includes(`def ${this.entryFunction}`))) {
      throw evaluatorError('FUNCTION_NOT_FOUND', `함수 ${this.entryFunction} 정의를 찾을 수 없습니다.`)
    }

    const env = { ...this.args }
    const res = this.runBlock(lines, env, lineNumbers)
    return {
      ok: true,
      result: res.returnValue !== undefined ? res.returnValue : null,
      stepsExecuted: this.steps,
      traceEvents: this.traceEvents,
    }
  }

  get stepCount() {
    return this.steps
  }

  collectBlock(lines, startIndex, parentIndent) {
    const body = []
    const bodyLineNumbers = []
    const sourceLineNumbers = this.blockLineNumbers.get(lines) || []
    let idx = startIndex
    let blockBaseIndent = -1

    for (let k = startIndex; k < lines.length; k++) {
      const t = lines[k].trim()
      if (t && !t.startsWith('#')) {
        const ind = lines[k].search(/\S/)
        if (ind > parentIndent) {
          blockBaseIndent = ind
        }
        break
      }
    }

    if (blockBaseIndent === -1) {
      return { body: [], nextIndex: startIndex }
    }

    while (idx < lines.length) {
      const rawLine = lines[idx]
      const trimmed = rawLine.trim()
      if (!trimmed) {
        body.push('')
        bodyLineNumbers.push(sourceLineNumbers[idx] ?? null)
        idx++
        continue
      }
      if (trimmed.startsWith('#')) {
        body.push(rawLine)
        bodyLineNumbers.push(sourceLineNumbers[idx] ?? null)
        idx++
        continue
      }
      const currentIndent = rawLine.search(/\S/)
      if (currentIndent <= parentIndent) {
        break
      }
      const stripped = rawLine.startsWith(' '.repeat(blockBaseIndent))
        ? rawLine.slice(blockBaseIndent)
        : rawLine.trimStart()
      body.push(stripped)
      bodyLineNumbers.push(sourceLineNumbers[idx] ?? null)
      idx++
    }

    this.blockLineNumbers.set(body, bodyLineNumbers)
    return { body, nextIndex: idx }
  }

  runBlock(lines, env, lineNumbers = null) {
    if (lineNumbers) this.blockLineNumbers.set(lines, lineNumbers)
    const sourceLineNumbers = this.blockLineNumbers.get(lines) || []
    let i = 0
    while (i < lines.length) {
      const statementIndex = i
      let line = lines[i]
      let trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed === 'pass') {
        i++
        continue
      }

      // Check if statement has unclosed delimiters (parentheses, brackets, braces)
      if (!trimmed.startsWith('if ') && !trimmed.startsWith('for ') && !trimmed.startsWith('while ') && !trimmed.startsWith('def ')) {
        let depth = countDelimBalance(line)
        while (depth > 0 && i + 1 < lines.length) {
          i++
          line += ' ' + lines[i]
          depth += countDelimBalance(lines[i])
        }
        trimmed = line.trim()
      }

      this.tick({ type: 'STATEMENT', line, env: { ...env } })
      this.currentStatement = line
      this.currentSourceLine = sourceLineNumbers[statementIndex] ?? null
      this.emitTrace('statement-enter', {
        statementText: line,
        metadata: { statementKind: trimmed.split(/\s|\(/)[0] },
      })

      // Return statement
      if (trimmed.startsWith('return')) {
        const retExpr = trimmed.slice(6).trim()
        const retVal = retExpr ? this.evaluateExpression(retExpr, env) : null
        this.emitTrace('function-return', { metadata: { value: this.snapshotValue(retVal) } })
        return { returned: true, returnValue: retVal }
      }

      // Augmented assignment: total += energy
      const augMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*(\+=|-=|\*=)\s*(.+)$/)
      if (augMatch) {
        const [, varName, op, expr] = augMatch
        const before = this.snapshotValue(env[varName])
        const delta = this.evaluateExpression(expr, env)
        if (op === '+=') env[varName] = (env[varName] || 0) + delta
        else if (op === '-=') env[varName] = (env[varName] || 0) - delta
        else if (op === '*=') env[varName] = (env[varName] || 0) * delta
        this.emitTrace('assignment', {
          stateDiff: [{ kind: 'write', path: varName, before, after: this.snapshotValue(env[varName]) }],
          metadata: { operator: op },
        })
        i++
        continue
      }

      // Index assignment: items[i] = val, grid[r][c] = val, or items[i], items[j] = items[j], items[i]
      const idxAssignMatch = trimmed.match(/^([A-Za-z0-9_]+\[.+\](?:\s*,\s*[A-Za-z0-9_]+\[.+\])*)\s*=\s*(.+)$/)
      if (idxAssignMatch && !trimmed.startsWith('if ') && !trimmed.startsWith('while ') && !trimmed.startsWith('for ')) {
        const [, targetsStr, expr] = idxAssignMatch
        const val = this.evaluateExpression(expr, env)
        const targets = targetsStr.split(',').map((t) => t.trim())
        const values = targets.length > 1 && Array.isArray(val) ? val : [val]

        targets.forEach((target, tIdx) => {
          const match = target.match(/^([A-Za-z0-9_]+)((?:\[[^\]]+\])+)$/)
          if (match) {
            const [, varName, bracketChain] = match
            const targetObj = Object.hasOwn(env, varName) ? env[varName] : this.globalEnv[varName]
            if (targetObj === undefined || targetObj === null) {
              throw evaluatorError('NAME_ERROR', `정의되지 않은 변수입니다: ${varName}`)
            }
            const brackets = bracketChain.match(/\[([^\]]+)\]/g) || []
            let curr = targetObj
            for (let b = 0; b < brackets.length - 1; b++) {
              const idx = this.evaluateExpression(brackets[b].slice(1, -1), env)
              curr = curr[idx]
            }
            const finalIdx = this.evaluateExpression(brackets[brackets.length - 1].slice(1, -1), env)
            const assignVal = values[tIdx]
            const before = this.snapshotValue(curr[finalIdx])
            curr[finalIdx] = assignVal
            this.emitTrace('container-mutation', {
              stateDiff: [{ kind: 'mutation', path: `${varName}[${finalIdx}]`, before, after: this.snapshotValue(assignVal) }],
              metadata: { operation: 'index-assignment' },
            })
          }
        })
        i++
        continue
      }

      // Variable assignment: total = 0, queue = deque(...), (r, c) = (0, 0)
      const assignMatch = trimmed.match(/^([A-Za-z0-9_,\s()]+)\s*=\s*(.+)$/)
      if (assignMatch && !trimmed.startsWith('if ') && !trimmed.startsWith('while ') && !trimmed.startsWith('for ')) {
        const [, target, expr] = assignMatch
        const val = this.evaluateExpression(expr, env)
        const cleanTarget = target.trim().replace(/^\(/, '').replace(/\)$/, '')
        if (cleanTarget.includes(',')) {
          const names = cleanTarget.split(',').map((n) => n.trim())
          if (Array.isArray(val)) {
            names.forEach((name, idx) => {
              const before = this.snapshotValue(env[name])
              env[name] = val[idx]
              this.emitTrace('assignment', {
                stateDiff: [{ kind: 'write', path: name, before, after: this.snapshotValue(env[name]) }],
              })
            })
          }
        } else {
          const before = this.snapshotValue(env[cleanTarget])
          env[cleanTarget] = val
          this.emitTrace('assignment', {
            stateDiff: [{ kind: 'write', path: cleanTarget, before, after: this.snapshotValue(val) }],
          })
        }
        i++
        continue
      }

      // If / Elif / Else compound or single-line statement
      if (trimmed.startsWith('if ')) {
        const singleLineIf = trimmed.match(/^if\s+(.+?):\s*(\S.*)$/)
        if (singleLineIf) {
          const [, condExpr, stmt] = singleLineIf
          const conditionResult = isPythonTruthy(this.evaluateExpression(condExpr, env))
          this.emitTrace('branch-decision', {
            metadata: { condition: condExpr, result: conditionResult, selectedBranch: conditionResult ? 'if' : 'none' },
          })
          if (conditionResult) {
            const inlineBlock = [stmt]
            const stmtRes = this.runBlock(inlineBlock, env, [this.currentSourceLine])
            if (stmtRes?.returned) return stmtRes
          }
          i++
          continue
        }

        const currentIndent = line.search(/\S/)
        const branches = []

        const ifMatch = trimmed.match(/^if\s+(.+):$/)
        if (ifMatch) {
          const ifCond = ifMatch[1]
          const ifBlock = this.collectBlock(lines, i + 1, currentIndent)
          branches.push({ type: 'if', condExpr: ifCond, body: ifBlock.body })
          i = ifBlock.nextIndex

          while (i < lines.length) {
            const nextRaw = lines[i]
            const nextTrimmed = nextRaw.trim()
            if (!nextTrimmed || nextTrimmed.startsWith('#')) {
              i++
              continue
            }
            const nextIndent = nextRaw.search(/\S/)
            if (nextIndent !== currentIndent) {
              break
            }
            if (nextTrimmed.startsWith('elif ')) {
              const elifMatch = nextTrimmed.match(/^elif\s+(.+):$/)
              if (elifMatch) {
                const elifBlock = this.collectBlock(lines, i + 1, currentIndent)
                branches.push({ type: 'elif', condExpr: elifMatch[1], body: elifBlock.body })
                i = elifBlock.nextIndex
                continue
              }
              break
            } else if (nextTrimmed === 'else:' || nextTrimmed.startsWith('else:')) {
              const elseBlock = this.collectBlock(lines, i + 1, currentIndent)
              branches.push({ type: 'else', condExpr: null, body: elseBlock.body })
              i = elseBlock.nextIndex
              break
            } else {
              break
            }
          }

          let branchExecuted = false
          for (const branch of branches) {
            if (branch.type === 'if' || branch.type === 'elif') {
              const isTrue = isPythonTruthy(this.evaluateExpression(branch.condExpr, env))
              this.emitTrace('branch-decision', {
                metadata: { condition: branch.condExpr, result: isTrue, selectedBranch: isTrue ? branch.type : null },
              })
              if (isTrue) {
                branchExecuted = true
                const blockRes = this.runBlock(branch.body, env)
                if (blockRes?.returned) return blockRes
                break
              }
            } else if (branch.type === 'else') {
              if (!branchExecuted) {
                branchExecuted = true
                const blockRes = this.runBlock(branch.body, env)
                if (blockRes?.returned) return blockRes
              }
              break
            }
          }
          continue
        }
      }

      // While loop
      if (trimmed.startsWith('while ')) {
        const whileMatch = trimmed.match(/^while\s+(.+):$/)
        if (whileMatch) {
          const condExpr = whileMatch[1]
          const loopSourceLine = sourceLineNumbers[i] ?? this.currentSourceLine
          const currentIndent = line.search(/\S/)
          const whileBlock = this.collectBlock(lines, i + 1, currentIndent)
          i = whileBlock.nextIndex

          while (isPythonTruthy(this.evaluateExpression(condExpr, env))) {
            this.tick({ type: 'LOOP_WHILE', cond: condExpr, env: { ...env } })
            this.emitTrace('loop-iteration', {
              statementText: line,
              sourceLineHint: loopSourceLine,
              metadata: { loopType: 'while', condition: condExpr },
            })
            const blockRes = this.runBlock(whileBlock.body, env)
            if (blockRes?.returned) return blockRes
          }
          continue
        }
      }

      // For loop: for item in sequence: or for dr, dc in [(-1, 0), (1, 0)...]:
      if (trimmed.startsWith('for ')) {
        const forMatch = trimmed.match(/^for\s+([A-Za-z0-9_,\s()]+)\s+in\s+(.+):$/)
        if (forMatch) {
          const [, iterVar, seqExpr] = forMatch
          const loopSourceLine = sourceLineNumbers[i] ?? this.currentSourceLine
          const currentIndent = line.search(/\S/)
          const forBlock = this.collectBlock(lines, i + 1, currentIndent)
          i = forBlock.nextIndex

          const seq = this.evaluateExpression(seqExpr, env)
          if (seq && (Array.isArray(seq) || typeof seq === 'string' || typeof seq[Symbol.iterator] === 'function')) {
            const cleanVar = iterVar.trim().replace(/^\(/, '').replace(/\)$/, '')
            const isTuple = cleanVar.includes(',')
            const varNames = cleanVar.split(',').map((n) => n.trim())

            for (const item of seq) {
              this.tick({ type: 'LOOP_FOR', item, env: { ...env } })
              if (isTuple && Array.isArray(item)) {
                varNames.forEach((n, idx) => {
                  env[n] = item[idx]
                })
              } else {
                env[cleanVar] = item
              }
              this.emitTrace('loop-iteration', {
                statementText: line,
                sourceLineHint: loopSourceLine,
                stateDiff: varNames.map((name) => ({ kind: 'write', path: name, before: null, after: this.snapshotValue(env[name]) })),
                metadata: { loopType: 'for', item: this.snapshotValue(item) },
              })
              const blockRes = this.runBlock(forBlock.body, env)
              if (blockRes?.returned) return blockRes
            }
          }
          continue
        }
      }

      // Standalone expressions / method calls
      this.evaluateExpression(trimmed, env)
      i++
    }
    return { returned: false }
  }
}

function projectSemanticTraceToMeaningful(rawEvents = [], maxScenes = 30) {
  if (!Array.isArray(rawEvents) || rawEvents.length === 0) return []

  // 1. Identify critical events
  const meaningful = []
  let lastStateStr = ''

  for (let idx = 0; idx < rawEvents.length; idx++) {
    const ev = rawEvents[idx]
    const type = ev.type || ev.eventType
    const isFirst = idx === 0
    const isLast = idx === rawEvents.length - 1
    const isError = type === 'runtime-error' || type === 'ERROR'
    const isReturn = type === 'function-return' || type === 'RETURN'
    const isDecision = type === 'branch-decision' || type === 'DECISION'
    const isMutation = type === 'container-mutation' || type === 'MUTATION'

    const stateStr = JSON.stringify(ev.env || ev.stateDiff || {})
    const hasStateChange = stateStr !== lastStateStr

    if (isFirst || isLast || isError || isReturn || isDecision || isMutation || hasStateChange) {
      meaningful.push({
        ...ev,
        runtimeStepIndex: ev.runtimeStepIndex ?? ev.step ?? idx,
      })
      lastStateStr = stateStr
    }
  }

  // 2. If meaningful count <= maxScenes, assign sceneIndex and return
  if (meaningful.length <= maxScenes) {
    return meaningful.map((ev, sceneIdx) => ({
      ...ev,
      sceneIndex: sceneIdx,
    }))
  }

  // 3. Compress evenly preserving start, end, and error points
  const compressed = []
  const step = (meaningful.length - 1) / (maxScenes - 1)
  for (let i = 0; i < maxScenes; i++) {
    const pickIdx = Math.min(meaningful.length - 1, Math.round(i * step))
    compressed.push({
      ...meaningful[pickIdx],
      sceneIndex: i,
    })
  }

  return compressed
}

function runRestrictedPythonFunction(pythonCode, entryFunction, args = {}, options = {}) {
  let interpreter = null
  try {
    interpreter = new SafePythonInterpreter(pythonCode, entryFunction, args, options)
    return interpreter.execute()
  } catch (err) {
    interpreter?.emitTrace('runtime-error', {
      metadata: { errorCode: err.code || 'RUNTIME_ERROR', message: err.message || '실행 오류' },
    })
    return {
      ok: false,
      error: err.message || '실행 오류',
      code: err.code,
      stepsExecuted: interpreter ? interpreter.stepCount : 0,
      traceEvents: interpreter?.traceEvents || [],
    }
  }
}

module.exports = {
  SafePythonInterpreter,
  runRestrictedPythonFunction,
  evaluatorError,
  isPythonTruthy,
  matchesExpected,
  FORBIDDEN_SOURCE,
  MAX_STEPS,
}
