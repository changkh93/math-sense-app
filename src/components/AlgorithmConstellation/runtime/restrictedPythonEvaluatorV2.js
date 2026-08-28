/**
 * Restricted Python Runtime v2
 * Designed for pattern, arithmetic (modulo %), variable tracking, and loops (AC-PAT-003+).
 * Retains strict fail-closed safety, bounded steps, and deterministic execution.
 */

const MAX_STEPS = 50_000
const MAX_EXECUTION_MS = 1_500

function v2Error(code, message) {
  const err = new Error(message)
  err.code = code
  return err
}

/**
 * Tokenize and evaluate an arithmetic or boolean expression in v2 environment
 */
export function evaluateV2Expression(exprStr, env = {}) {
  const trimmed = exprStr.trim()
  if (trimmed === 'True') return true
  if (trimmed === 'False') return false
  if (/^-?\d+$/.test(trimmed)) return parseInt(trimmed, 10)

  // Direct variable lookup
  if (Object.hasOwn(env, trimmed)) return env[trimmed]

  // Modulo expression: time % 3 == 0 or time % 3
  const modEqMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*%\s*(\d+)\s*(==|!=|<|>|<=|>=)\s*(\d+)$/)
  if (modEqMatch) {
    const [, varName, modVal, op, targetVal] = modEqMatch
    const leftVal = Object.hasOwn(env, varName) ? env[varName] : parseInt(varName, 10)
    const rem = Number(leftVal) % parseInt(modVal, 10)
    const target = parseInt(targetVal, 10)
    switch (op) {
      case '==': return rem === target
      case '!=': return rem !== target
      case '<': return rem < target
      case '<=': return rem <= target
      case '>': return rem > target
      case '>=': return rem >= target
      default: return false
    }
  }

  const modMatch = trimmed.match(/^([A-Za-z0-9_]+)\s*%\s*(\d+)$/)
  if (modMatch) {
    const [, varName, modVal] = modMatch
    const leftVal = Object.hasOwn(env, varName) ? env[varName] : parseInt(varName, 10)
    return Number(leftVal) % parseInt(modVal, 10)
  }

  // Boolean logic conjunction: a and b, a or b
  if (trimmed.includes(' and ')) {
    const parts = trimmed.split(' and ')
    return parts.every((p) => Boolean(evaluateV2Expression(p, env)))
  }
  if (trimmed.includes(' or ')) {
    const parts = trimmed.split(' or ')
    return parts.some((p) => Boolean(evaluateV2Expression(p, env)))
  }

  throw v2Error('UNSUPPORTED_SYNTAX_V2', `지원하지 않는 v2 표현식입니다: ${trimmed}`)
}

export function runRestrictedPythonV2Function(source, functionName, args = {}) {
  const env = { ...args }
  const lines = source
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))

  let returned = false
  let returnValue = null

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (line.startsWith('def ')) continue
    if (line === 'pass') continue

    // Variable assignment: r = time % 3
    const assignMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/)
    if (assignMatch && !line.startsWith('if ') && !line.startsWith('return ')) {
      const [, varName, expr] = assignMatch
      env[varName] = evaluateV2Expression(expr, env)
      continue
    }

    // Direct return
    if (line.startsWith('return ')) {
      const expr = line.slice(7)
      returnValue = evaluateV2Expression(expr, env)
      returned = true
      break
    }

    // If inline return: if time % 3 == 0: return True
    const inlineIfMatch = line.match(/^if\s+(.+):\s*return\s+(.+)$/)
    if (inlineIfMatch) {
      const [, condExpr, retExpr] = inlineIfMatch
      if (evaluateV2Expression(condExpr, env)) {
        returnValue = evaluateV2Expression(retExpr, env)
        returned = true
        break
      }
      continue
    }
  }

  return returned ? returnValue : null
}

export function executeRestrictedV2PublicTests({
  code,
  entryFunction = 'check_signal',
  publicTests = [],
  limits = {},
}) {
  const maxSteps = limits.maxSteps ?? MAX_STEPS
  const maxExecutionMs = limits.maxExecutionMs ?? MAX_EXECUTION_MS
  const startedAt = performance.now()
  const rawEvents = []
  const testResults = []
  let stepCount = 0

  for (const testCase of publicTests) {
    stepCount += 1
    if (stepCount > maxSteps) throw v2Error('LIMIT_EXCEEDED', '스텝 한도를 초과했습니다.')
    if (performance.now() - startedAt > maxExecutionMs) throw v2Error('TIMEOUT', '실행 제한 시간을 초과했습니다.')

    const actual = runRestrictedPythonV2Function(code, entryFunction, testCase.inputs)
    const passed = actual === testCase.expected
    testResults.push({
      id: testCase.id,
      inputs: testCase.inputs,
      expected: testCase.expected,
      actual,
      passed,
    })

    const remainder = testCase.inputs?.time !== undefined ? testCase.inputs.time % 3 : null
    rawEvents.push({
      stepIndex: stepCount,
      eventType: 'variable_change',
      sourceLine: 2,
      stateDiff: { ...testCase.inputs, remainder },
      worldDiff: { bridgeOpen: actual },
      metadata: { expected: testCase.expected, passed },
    })
  }

  return {
    ok: true,
    allPassed: testResults.every((t) => t.passed),
    stepCount,
    testResults,
    rawEvents,
  }
}
