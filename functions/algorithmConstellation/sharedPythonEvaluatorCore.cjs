/**
 * Shared Safe Restricted Python AST Evaluator Core (CommonJS Export)
 * Mirrors src/components/AlgorithmConstellation/runtime/sharedPythonEvaluatorCore.js
 */

const MAX_STEPS = 100_000
const MAX_SOURCE_LENGTH = 16_000

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

class SafePythonInterpreter {
  constructor(source, entryFunction, args = {}, options = {}) {
    this.source = source
    this.entryFunction = entryFunction
    this.args = args
    this.steps = 0
    this.maxSteps = options.maxSteps || MAX_STEPS
    this.onStep = options.onStep || null
    this.globalEnv = {
      True: true,
      False: false,
      None: null,
      len: (obj) => (obj ? obj.length : 0),
      sum: (list) => (Array.isArray(list) ? list.reduce((a, b) => a + b, 0) : 0),
      abs: (x) => Math.abs(x),
      bool: (x) => isPythonTruthy(x),
      list: (x) => (Array.isArray(x) ? [...x] : Array.from(x || [])),
      deque: (iter) => (Array.isArray(iter) ? [...iter] : iter ? Array.from(iter) : []),
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

    // List literal: [1, 2, 3] or []
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const inner = trimmed.slice(1, -1).trim()
      if (!inner) return []
      return this.splitArguments(inner).map((item) => this.evaluateExpression(item, env))
    }

    // Set / Tuple literal: {(0, 0)} or (0, 0, 0)
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const inner = trimmed.slice(1, -1).trim()
      const s = new Set()
      if (inner) {
        this.splitArguments(inner).forEach((item) => {
          const val = this.evaluateExpression(item, env)
          s.add(typeof val === 'object' ? JSON.stringify(val) : val)
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
      for (const part of orParts) {
        const val = this.evaluateExpression(part, env)
        if (isPythonTruthy(val)) return val
      }
      return this.evaluateExpression(orParts[orParts.length - 1], env)
    }

    // Boolean binary operators: 'and'
    const andParts = this.splitTopLevel(trimmed, 'and')
    if (andParts.length > 1) {
      for (const part of andParts) {
        const val = this.evaluateExpression(part, env)
        if (!isPythonTruthy(val)) return val
      }
      return this.evaluateExpression(andParts[andParts.length - 1], env)
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
        const obj = env[objName] || this.globalEnv[objName]
        if (obj) {
          if (Array.isArray(obj)) {
            if (methodName === 'popleft') return obj.shift()
            if (methodName === 'pop') return obj.pop()
            if (methodName === 'append') {
              obj.push(rawArgs[0])
              return null
            }
          }
          if (obj instanceof Set) {
            if (methodName === 'add') {
              const arg = rawArgs[0]
              obj.add(typeof arg === 'object' ? JSON.stringify(arg) : arg)
              return null
            }
          }
        }
      }

      const fn = env[target] || this.globalEnv[target]
      if (typeof fn === 'function') {
        return fn(...rawArgs)
      }
    }

    // Subscript / Indexing: list[idx] or obj[a][b]
    const indexMatch = trimmed.match(/^([A-Za-z0-9_]+)((?:\[[^\]]+\])+)$/)
    if (indexMatch) {
      const [, varName, bracketChain] = indexMatch
      let current = env[varName] || this.globalEnv[varName]
      const brackets = bracketChain.match(/\[([^\]]+)\]/g) || []
      for (const bracket of brackets) {
        if (current === undefined || current === null) return undefined
        const idxExpr = bracket.slice(1, -1)
        const idx = this.evaluateExpression(idxExpr, env)
        current = current[idx]
      }
      return current
    }

    // Variable lookup
    if (Object.hasOwn(env, trimmed)) return env[trimmed]
    if (Object.hasOwn(this.globalEnv, trimmed)) return this.globalEnv[trimmed]

    return null
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

    const rawLines = this.source.split('\n')
    const lines = []
    let insideFn = false
    let fnIndent = 0

    for (const line of rawLines) {
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
      }
    }

    if (!insideFn && !rawLines.some((l) => l.includes(`def ${this.entryFunction}`))) {
      throw evaluatorError('FUNCTION_NOT_FOUND', `함수 ${this.entryFunction} 정의를 찾을 수 없습니다.`)
    }

    const env = { ...this.args }
    const res = this.runBlock(lines, env)
    return { ok: true, result: res.returnValue !== undefined ? res.returnValue : null }
  }

  runBlock(lines, env) {
    let i = 0
    while (i < lines.length) {
      this.tick({ type: 'STATEMENT', line: lines[i], env: { ...env } })
      const line = lines[i]
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed === 'pass') {
        i++
        continue
      }

      // Return statement
      if (trimmed.startsWith('return')) {
        const retExpr = trimmed.slice(6).trim()
        const retVal = retExpr ? this.evaluateExpression(retExpr, env) : null
        return { returned: true, returnValue: retVal }
      }

      // Augmented assignment: total += energy
      const augMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*(\+=|-=|\*=)\s*(.+)$/)
      if (augMatch) {
        const [, varName, op, expr] = augMatch
        const delta = this.evaluateExpression(expr, env)
        if (op === '+=') env[varName] = (env[varName] || 0) + delta
        else if (op === '-=') env[varName] = (env[varName] || 0) - delta
        else if (op === '*=') env[varName] = (env[varName] || 0) * delta
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
              env[name] = val[idx]
            })
          }
        } else {
          env[cleanTarget] = val
        }
        i++
        continue
      }

      // If / Else structure
      if (trimmed.startsWith('if ')) {
        const condMatch = trimmed.match(/^if\s+(.+):$/)
        if (condMatch) {
          const condExpr = condMatch[1]
          const isTrue = isPythonTruthy(this.evaluateExpression(condExpr, env))

          const currentIndent = line.search(/\S/)
          const ifBody = []
          i++
          while (i < lines.length) {
            const nextTrimmed = lines[i].trim()
            if (!nextTrimmed) {
              i++
              continue
            }
            const nextIndent = lines[i].search(/\S/)
            if (nextIndent <= currentIndent) break
            ifBody.push(lines[i].slice(currentIndent + 4))
            i++
          }

          if (isTrue) {
            const blockRes = this.runBlock(ifBody, env)
            if (blockRes?.returned) return blockRes
          }
          continue
        }
      }

      // While loop
      if (trimmed.startsWith('while ')) {
        const whileMatch = trimmed.match(/^while\s+(.+):$/)
        if (whileMatch) {
          const condExpr = whileMatch[1]
          const currentIndent = line.search(/\S/)
          const whileBody = []
          i++
          while (i < lines.length) {
            const nextTrimmed = lines[i].trim()
            if (!nextTrimmed) {
              i++
              continue
            }
            const nextIndent = lines[i].search(/\S/)
            if (nextIndent <= currentIndent) break
            whileBody.push(lines[i].slice(currentIndent + 4))
            i++
          }

          while (isPythonTruthy(this.evaluateExpression(condExpr, env))) {
            this.tick({ type: 'LOOP_WHILE', cond: condExpr, env: { ...env } })
            const blockRes = this.runBlock(whileBody, env)
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
          const seq = this.evaluateExpression(seqExpr, env)
          const currentIndent = line.search(/\S/)
          const forBody = []
          i++
          while (i < lines.length) {
            const nextTrimmed = lines[i].trim()
            if (!nextTrimmed) {
              i++
              continue
            }
            const nextIndent = lines[i].search(/\S/)
            if (nextIndent <= currentIndent) break
            forBody.push(lines[i].slice(currentIndent + 4))
            i++
          }

          if (Array.isArray(seq)) {
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
              const blockRes = this.runBlock(forBody, env)
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

function runRestrictedPythonFunction(pythonCode, entryFunction, args = {}, options = {}) {
  try {
    const interpreter = new SafePythonInterpreter(pythonCode, entryFunction, args, options)
    return interpreter.execute()
  } catch (err) {
    return { ok: false, error: err.message || '실행 오류', code: err.code }
  }
}

module.exports = {
  MAX_STEPS,
  MAX_SOURCE_LENGTH,
  FORBIDDEN_SOURCE,
  evaluatorError,
  isPythonTruthy,
  matchesExpected,
  SafePythonInterpreter,
  runRestrictedPythonFunction,
}
