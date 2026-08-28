/**
 * Fail-closed evaluator for the introductory boolean-condition mission.
 * It is deliberately a tiny Python subset, not a general Python runtime.
 */

const MAX_SOURCE_LENGTH = 8_000
const MAX_EXPRESSION_TOKENS = 200
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const FORBIDDEN_SOURCE = /(?:\b(?:import|from|class|lambda|yield|await|async|exec|eval|compile|open|globals|locals|getattr|setattr|delattr|breakpoint)\b|__|[.`'"[\]{};])/u

function evaluatorError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function tokenize(source) {
  const tokens = []
  let index = 0
  while (index < source.length) {
    const rest = source.slice(index)
    const whitespace = rest.match(/^\s+/)
    if (whitespace) {
      index += whitespace[0].length
      continue
    }
    const operator = rest.match(/^(==|!=|<=|>=|<|>|%|\/\/|\(|\))/)
    if (operator) {
      tokens.push(operator[1])
      index += operator[1].length
      continue
    }
    const number = rest.match(/^\d+/)
    if (number) {
      tokens.push(number[0])
      index += number[0].length
      continue
    }
    const word = rest.match(/^[A-Za-z_][A-Za-z0-9_]*/)
    if (!word) throw evaluatorError('UNSUPPORTED_SYNTAX', `지원하지 않는 표현식 기호가 있습니다: ${rest[0]}`)
    tokens.push(word[0])
    index += word[0].length
  }
  if (tokens.length > MAX_EXPRESSION_TOKENS) throw evaluatorError('LIMIT_EXCEEDED', '표현식이 너무 복잡합니다.')
  return tokens
}

export function evaluateBooleanExpression(source, environment) {
  const tokens = tokenize(source)
  let cursor = 0
  const peek = () => tokens[cursor]
  const consume = (expected) => {
    const token = tokens[cursor]
    if (expected && token !== expected) throw evaluatorError('UNSUPPORTED_SYNTAX', `${expected} 문법을 확인해 주세요.`)
    cursor += 1
    return token
  }
  function primary() {
    const token = peek()
    if (token === '(') {
      consume('(')
      const value = conditional()
      consume(')')
      return value
    }
    if (token === 'True') { consume(); return true }
    if (token === 'False' || token === 'None') { consume(); return false }
    if (/^\d+$/.test(token || '')) {
      consume()
      return parseInt(token, 10)
    }
    if (token === 'bool') {
      consume('bool'); consume('(')
      const value = conditional()
      consume(')')
      return Boolean(value)
    }
    if (IDENTIFIER.test(token || '') && Object.hasOwn(environment, token)) {
      consume()
      return environment[token]
    }
    throw evaluatorError('UNSUPPORTED_SYNTAX', `허용되지 않은 이름입니다: ${token || '끝'}`)
  }
  function moduloExpression() {
    let value = primary()
    while (peek() === '%' || peek() === '//') {
      const op = consume()
      const right = primary()
      if (op === '%') {
        value = Number(value) % Number(right)
      } else if (op === '//') {
        value = Math.floor(Number(value) / Number(right))
      }
    }
    return value
  }
  function notExpression() {
    if (peek() === 'not') { consume('not'); return !notExpression() }
    return moduloExpression()
  }
  function comparison() {
    let value = notExpression()
    if (peek() === '==' || peek() === '!=' || peek() === '<' || peek() === '<=' || peek() === '>' || peek() === '>=') {
      const operator = consume()
      const right = notExpression()
      switch (operator) {
        case '==': value = value === right; break
        case '!=': value = value !== right; break
        case '<': value = value < right; break
        case '<=': value = value <= right; break
        case '>': value = value > right; break
        case '>=': value = value >= right; break
        default: break
      }
    }
    return value
  }
  function andExpression() {
    let value = comparison()
    while (peek() === 'and') { consume('and'); const right = comparison(); value = Boolean(value) && Boolean(right) }
    return value
  }
  function orExpression() {
    let value = andExpression()
    while (peek() === 'or') { consume('or'); const right = andExpression(); value = Boolean(value) || Boolean(right) }
    return value
  }
  function conditional() {
    const whenTrue = orExpression()
    if (peek() !== 'if') return whenTrue
    consume('if')
    const condition = orExpression()
    consume('else')
    const whenFalse = conditional()
    return condition ? whenTrue : whenFalse
  }
  const result = conditional()
  if (cursor !== tokens.length) throw evaluatorError('UNSUPPORTED_SYNTAX', `해석하지 못한 토큰: ${tokens[cursor]}`)
  return result
}

function readFunction(source, functionName) {
  if (typeof source !== 'string' || !source.trim()) throw evaluatorError('INVALID_SOURCE', '코드를 입력해 주세요.')
  if (source.length > MAX_SOURCE_LENGTH) throw evaluatorError('LIMIT_EXCEEDED', '코드가 너무 깁니다.')
  const codeWithoutComments = source.replace(/#.*$/gm, '')
  if (!IDENTIFIER.test(functionName) || FORBIDDEN_SOURCE.test(codeWithoutComments)) {
    throw evaluatorError('UNSUPPORTED_SYNTAX', '현재 미션에서 지원하지 않는 Python 문법이 포함되어 있습니다.')
  }
  const rawLines = source.replace(/\r\n?/g, '\n').split('\n')
  const signatureIndex = rawLines.findIndex((line) => line.trim().startsWith(`def ${functionName}(`))
  if (signatureIndex < 0) throw evaluatorError('FUNCTION_NOT_FOUND', `${functionName} 함수를 찾지 못했습니다.`)
  const signature = rawLines[signatureIndex].trim().match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*$/)
  if (!signature || signature[1] !== functionName) throw evaluatorError('UNSUPPORTED_SYNTAX', '함수 선언 형식을 확인해 주세요.')
  const parameters = signature[2].split(',').map((item) => item.trim()).filter(Boolean)
  if (parameters.some((name) => !IDENTIFIER.test(name)) || new Set(parameters).size !== parameters.length) {
    throw evaluatorError('UNSUPPORTED_SYNTAX', '매개변수 형식을 확인해 주세요.')
  }
  const lines = []
  for (let index = signatureIndex + 1; index < rawLines.length; index += 1) {
    const raw = rawLines[index]
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const indentation = raw.match(/^\s*/)[0]
    if (indentation.includes('\t')) throw evaluatorError('UNSUPPORTED_SYNTAX', '탭 대신 공백을 사용해 주세요.')
    if (indentation.length === 0) break
    lines.push({ indent: indentation.length, text: raw.trim() })
  }
  if (!lines.length) throw evaluatorError('UNSUPPORTED_SYNTAX', '함수 본문이 비어 있습니다.')
  return { parameters, lines }
}

function nextAtOrBelow(lines, start, indent) {
  let index = start
  while (index < lines.length && lines[index].indent > indent) index += 1
  return index
}

function executeBlock(lines, start, indent, environment) {
  let index = start
  while (index < lines.length) {
    const line = lines[index]
    if (line.indent < indent) break
    if (line.indent > indent) throw evaluatorError('UNSUPPORTED_SYNTAX', '들여쓰기를 확인해 주세요.')
    if (line.text.startsWith('return ')) return { returned: true, value: evaluateBooleanExpression(line.text.slice(7), environment) }
    const inlineIf = line.text.match(/^if\s+(.+):\s*return\s+(.+)$/)
    if (inlineIf) {
      if (evaluateBooleanExpression(inlineIf[1], environment)) {
        return { returned: true, value: evaluateBooleanExpression(inlineIf[2], environment) }
      }
      index += 1
      continue
    }
    const ifMatch = line.text.match(/^if\s+(.+):$/)
    if (ifMatch) {
      const branchStart = index + 1
      if (branchStart >= lines.length || lines[branchStart].indent <= indent) throw evaluatorError('UNSUPPORTED_SYNTAX', 'if 본문이 필요합니다.')
      const branchEnd = nextAtOrBelow(lines, branchStart, indent)
      const hasElse = branchEnd < lines.length && lines[branchEnd].indent === indent && lines[branchEnd].text === 'else:'
      const elseStart = hasElse ? branchEnd + 1 : -1
      if (hasElse && (elseStart >= lines.length || lines[elseStart].indent <= indent)) throw evaluatorError('UNSUPPORTED_SYNTAX', 'else 본문이 필요합니다.')
      const elseEnd = hasElse ? nextAtOrBelow(lines, elseStart, indent) : branchEnd
      const condition = Boolean(evaluateBooleanExpression(ifMatch[1], environment))
      const chosenStart = condition ? branchStart : elseStart
      const chosenEnd = condition ? branchEnd : elseEnd
      if (chosenStart >= 0) {
        const result = executeBlock(lines.slice(0, chosenEnd), chosenStart, lines[chosenStart].indent, environment)
        if (result.returned) return result
      }
      index = hasElse ? elseEnd : branchEnd
      continue
    }
    if (line.text === 'pass') { index += 1; continue }
    if (line.text === 'else:') break
    throw evaluatorError('UNSUPPORTED_SYNTAX', `지원하지 않는 문장입니다: ${line.text}`)
  }
  return { returned: false, value: null }
}

export function runRestrictedPythonFunction(source, functionName, args = {}) {
  const { parameters, lines } = readFunction(source, functionName)
  const environment = {}
  for (const parameter of parameters) {
    if (!Object.hasOwn(args, parameter)) throw evaluatorError('INVALID_ARGUMENTS', `${parameter} 값이 없습니다.`)
    environment[parameter] = args[parameter]
  }
  const result = executeBlock(lines, 0, lines[0].indent, environment)
  return result.returned ? result.value : null
}

export function executeRestrictedPublicTests({ code, entryFunction, publicTests = [], limits = {} }) {
  const maxSteps = limits.maxSteps ?? 50_000
  const maxExecutionMs = limits.maxExecutionMs ?? 1_500
  const startedAt = performance.now()
  const rawEvents = []
  const testResults = []
  let stepCount = 0

  // Detect target entry function if not explicitly provided
  let targetFn = entryFunction
  if (!targetFn) {
    if (code.includes('def check_bridge(')) targetFn = 'check_bridge'
    else if (code.includes('def check_cooling(')) targetFn = 'check_cooling'
    else if (code.includes('def frost_bridge_signal(')) targetFn = 'frost_bridge_signal'
    else targetFn = 'check_gate'
  }

  for (const testCase of publicTests) {
    stepCount += 1
    if (stepCount > maxSteps) throw evaluatorError('LIMIT_EXCEEDED', '스텝 한도를 초과했습니다.')
    if (performance.now() - startedAt > maxExecutionMs) throw evaluatorError('TIMEOUT', '실행 제한 시간을 초과했습니다.')
    const actual = Boolean(runRestrictedPythonFunction(code, targetFn, testCase.inputs))
    const passed = actual === testCase.expected
    testResults.push({ id: testCase.id, inputs: testCase.inputs, expected: testCase.expected, actual, passed })

    const isSignalBridge = Object.hasOwn(testCase.inputs, 'time')
    rawEvents.push({
      stepIndex: stepCount,
      eventType: isSignalBridge ? 'signal_eval' : 'condition_eval',
      sourceLine: 2,
      stateDiff: isSignalBridge
        ? { time: testCase.inputs.time, remainder: (testCase.inputs.time % 3) }
        : { ...testCase.inputs },
      worldDiff: isSignalBridge ? { bridgeOpen: actual } : { gateOpen: actual },
      metadata: { expected: testCase.expected, passed },
    })
  }
  return { ok: true, allPassed: testResults.every((test) => test.passed), stepCount, testResults, rawEvents }
}
