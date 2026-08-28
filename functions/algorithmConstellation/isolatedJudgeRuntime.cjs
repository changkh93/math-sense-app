/**
 * Restricted, fail-closed judge for the Phase 2 boolean-condition slice.
 *
 * This is intentionally NOT a general Python runtime. It accepts only the tiny,
 * documented subset needed by AC-COND-001 and rejects everything else. A future
 * general judge must use a separately isolated, pinned Python service and must
 * never fall back to generated JavaScript.
 */

const { getPrivateProblemDefinition } = require('./privateProblemCatalog.cjs')

const MAX_SOURCE_LENGTH = 8_000
const MAX_EXPRESSION_TOKENS = 200
const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/
const FORBIDDEN_SOURCE = /(?:\b(?:import|from|class|lambda|yield|await|async|exec|eval|compile|open|globals|locals|getattr|setattr|delattr|breakpoint)\b|__|[.`'"\[\]{};])/u

function judgeError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function tokenizeExpression(source) {
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
    if (word) {
      tokens.push(word[0])
      index += word[0].length
      continue
    }
    throw judgeError('UNSUPPORTED_SYNTAX', `지원하지 않는 표현식 기호가 있습니다: ${rest[0]}`)
  }

  if (tokens.length > MAX_EXPRESSION_TOKENS) {
    throw judgeError('LIMIT_EXCEEDED', '표현식이 허용된 복잡도를 초과했습니다.')
  }
  return tokens
}

function evaluateBooleanExpression(source, environment) {
  const tokens = tokenizeExpression(source)
  let cursor = 0
  const peek = () => tokens[cursor]
  const consume = (expected) => {
    const token = tokens[cursor]
    if (expected && token !== expected) {
      throw judgeError('UNSUPPORTED_SYNTAX', `예상한 토큰 ${expected} 대신 ${token || '끝'}을 만났습니다.`)
    }
    cursor++
    return token
  }

  function parsePrimary() {
    const token = peek()
    if (token === '(') {
      consume('(')
      const value = parseConditional()
      consume(')')
      return value
    }
    if (token === 'True') {
      consume()
      return true
    }
    if (token === 'False' || token === 'None') {
      consume()
      return false
    }
    if (/^\d+$/.test(token || '')) {
      consume()
      return parseInt(token, 10)
    }
    if (token === 'bool') {
      consume('bool')
      consume('(')
      const value = parseConditional()
      consume(')')
      return Boolean(value)
    }
    if (IDENTIFIER.test(token || '') && Object.hasOwn(environment, token)) {
      consume()
      return environment[token]
    }
    throw judgeError('UNSUPPORTED_SYNTAX', `허용되지 않은 이름 또는 표현식입니다: ${token || '끝'}`)
  }

  function parseModulo() {
    let value = parsePrimary()
    while (peek() === '%' || peek() === '//') {
      const op = consume()
      const right = parsePrimary()
      if (op === '%') {
        value = Number(value) % Number(right)
      } else if (op === '//') {
        value = Math.floor(Number(value) / Number(right))
      }
    }
    return value
  }

  function parseNot() {
    if (peek() === 'not') {
      consume('not')
      return !Boolean(parseNot())
    }
    return parseModulo()
  }

  function parseComparison() {
    let value = parseNot()
    if (peek() === '==' || peek() === '!=' || peek() === '<' || peek() === '<=' || peek() === '>' || peek() === '>=') {
      const operator = consume()
      const right = parseNot()
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

  function parseAnd() {
    let value = parseComparison()
    while (peek() === 'and') {
      consume('and')
      const right = parseComparison()
      value = Boolean(value) && Boolean(right)
    }
    return value
  }

  function parseOr() {
    let value = parseAnd()
    while (peek() === 'or') {
      consume('or')
      const right = parseAnd()
      value = Boolean(value) || Boolean(right)
    }
    return value
  }

  function parseConditional() {
    const whenTrue = parseOr()
    if (peek() !== 'if') return whenTrue
    consume('if')
    const condition = parseOr()
    consume('else')
    const whenFalse = parseConditional()
    return Boolean(condition) ? whenTrue : whenFalse
  }

  const result = parseConditional()
  if (cursor !== tokens.length) {
    throw judgeError('UNSUPPORTED_SYNTAX', `해석하지 못한 토큰이 남았습니다: ${tokens[cursor]}`)
  }
  return result
}

function normalizeFunctionLines(pythonCode, functionName) {
  if (typeof pythonCode !== 'string' || !pythonCode.trim()) {
    throw judgeError('INVALID_SOURCE', 'Source code must be a non-empty string')
  }
  if (pythonCode.length > MAX_SOURCE_LENGTH) {
    throw judgeError('LIMIT_EXCEEDED', `Source code exceeds ${MAX_SOURCE_LENGTH} characters`)
  }
  const codeWithoutComments = pythonCode.replace(/#.*$/gm, '')
  if (!IDENTIFIER.test(functionName) || FORBIDDEN_SOURCE.test(codeWithoutComments)) {
    throw judgeError('UNSUPPORTED_SYNTAX', '허용되지 않은 Python 문법이 포함되어 있습니다.')
  }

  const rawLines = pythonCode.replace(/\r\n?/g, '\n').split('\n')
  const signatureIndex = rawLines.findIndex((line) => line.trim().startsWith(`def ${functionName}(`))
  if (signatureIndex < 0) {
    throw judgeError('FUNCTION_NOT_FOUND', `Function ${functionName} not found in submission`)
  }

  const signature = rawLines[signatureIndex].trim().match(/^def\s+([A-Za-z_][A-Za-z0-9_]*)\s*\(([^)]*)\)\s*:\s*$/)
  if (!signature || signature[1] !== functionName) {
    throw judgeError('UNSUPPORTED_SYNTAX', '함수 선언 형식을 확인해 주세요.')
  }

  const parameterNames = signature[2].split(',').map((item) => item.trim()).filter(Boolean)
  if (parameterNames.some((name) => !IDENTIFIER.test(name)) || new Set(parameterNames).size !== parameterNames.length) {
    throw judgeError('UNSUPPORTED_SYNTAX', '함수 매개변수 형식을 확인해 주세요.')
  }

  const lines = []
  for (let index = signatureIndex + 1; index < rawLines.length; index++) {
    const raw = rawLines[index]
    if (!raw.trim() || raw.trim().startsWith('#')) continue
    const indentText = raw.match(/^\s*/)[0]
    if (indentText.includes('\t')) throw judgeError('UNSUPPORTED_SYNTAX', '탭 대신 공백 들여쓰기를 사용해 주세요.')
    const indent = indentText.length
    if (indent === 0) break
    lines.push({ indent, text: raw.trim() })
  }
  if (lines.length === 0) throw judgeError('UNSUPPORTED_SYNTAX', '함수 본문이 비어 있습니다.')
  return { parameterNames, lines }
}

function findNextAtOrBelow(lines, start, indent) {
  let index = start
  while (index < lines.length && lines[index].indent > indent) index++
  return index
}

function executeBlock(lines, start, indent, environment) {
  let index = start
  while (index < lines.length) {
    const line = lines[index]
    if (line.indent < indent) break
    if (line.indent > indent) throw judgeError('UNSUPPORTED_SYNTAX', '올바르지 않은 들여쓰기입니다.')

    if (line.text.startsWith('return ')) {
      return { returned: true, value: evaluateBooleanExpression(line.text.slice(7), environment), nextIndex: index + 1 }
    }

    const inlineIf = line.text.match(/^if\s+(.+):\s*return\s+(.+)$/)
    if (inlineIf) {
      if (Boolean(evaluateBooleanExpression(inlineIf[1], environment))) {
        return { returned: true, value: evaluateBooleanExpression(inlineIf[2], environment), nextIndex: index + 1 }
      }
      index++
      continue
    }

    const ifMatch = line.text.match(/^if\s+(.+):$/)
    if (ifMatch) {
      const branchStart = index + 1
      if (branchStart >= lines.length || lines[branchStart].indent <= indent) {
        throw judgeError('UNSUPPORTED_SYNTAX', 'if 블록의 본문이 필요합니다.')
      }
      const branchEnd = findNextAtOrBelow(lines, branchStart, indent)
      let nextIndex = branchEnd
      let elseStart = -1
      let elseEnd = branchEnd
      if (branchEnd < lines.length && lines[branchEnd].indent === indent && lines[branchEnd].text === 'else:') {
        elseStart = branchEnd + 1
        if (elseStart >= lines.length || lines[elseStart].indent <= indent) {
          throw judgeError('UNSUPPORTED_SYNTAX', 'else 블록의 본문이 필요합니다.')
        }
        elseEnd = findNextAtOrBelow(lines, elseStart, indent)
        nextIndex = elseEnd
      }

      const condition = Boolean(evaluateBooleanExpression(ifMatch[1], environment))
      const chosenStart = condition ? branchStart : elseStart
      const chosenEnd = condition ? branchEnd : elseEnd
      if (chosenStart >= 0) {
        const branchResult = executeBlock(lines.slice(0, chosenEnd), chosenStart, lines[chosenStart].indent, environment)
        if (branchResult.returned) return { ...branchResult, nextIndex }
      }
      index = nextIndex
      continue
    }

    if (line.text === 'pass') {
      index++
      continue
    }
    if (line.text === 'else:' || line.text.startsWith('elif ')) break
    throw judgeError('UNSUPPORTED_SYNTAX', `현재 단계에서 지원하지 않는 문장입니다: ${line.text}`)
  }
  return { returned: false, value: null, nextIndex: index }
}

function runRestrictedPythonFunction(pythonCode, functionName, args = {}) {
  try {
    const { parameterNames, lines } = normalizeFunctionLines(pythonCode, functionName)
    const environment = {}
    for (const parameterName of parameterNames) {
      if (!Object.hasOwn(args, parameterName)) {
        return { ok: false, error: `Missing argument: ${parameterName}`, code: 'INVALID_ARGUMENTS' }
      }
      environment[parameterName] = args[parameterName]
    }
    const result = executeBlock(lines, 0, lines[0].indent, environment)
    return { ok: true, result: result.returned ? result.value : null }
  } catch (error) {
    return { ok: false, error: error?.message || 'Restricted evaluator failed', code: error?.code || 'RUNTIME_ERROR' }
  }
}

function evaluateBaseSubmission(problemId, problemVersion, studentPythonCode) {
  let definition
  try {
    definition = getPrivateProblemDefinition(problemId, problemVersion)
  } catch (error) {
    throw judgeError('JUDGE_UNAVAILABLE', `Problem definition unavailable: ${error.message}`)
  }
  const entryFunction = definition.entryFunction || 'check_gate'
  let publicPassed = true
  for (const test of definition.publicTests || []) {
    const result = runRestrictedPythonFunction(studentPythonCode, entryFunction, test.inputs)
    if (!result.ok || result.result !== test.expected) {
      publicPassed = false
      break
    }
  }

  let hiddenPassed = true
  const groupResults = {}
  for (const test of definition.hiddenTests || []) {
    if (!groupResults[test.group]) groupResults[test.group] = { group: test.group, total: 0, passed: 0 }
    groupResults[test.group].total++
    const result = runRestrictedPythonFunction(studentPythonCode, entryFunction, test.inputs)
    if (result.ok && result.result === test.expected) groupResults[test.group].passed++
    else hiddenPassed = false
  }

  const resultStar = Boolean(publicPassed && hiddenPassed)
  return {
    status: resultStar ? 'passed' : 'failed',
    resultStar,
    publicPassed,
    hiddenPassed,
    testGroups: Object.values(groupResults),
  }
}

function evaluateTransferSubmission(problemId, problemVersion, transferChallengeId, studentTransferCode) {
  const definition = getPrivateProblemDefinition(problemId, problemVersion)
  const challenge = (definition.transferChallenges || []).find((item) => item.transferChallengeId === transferChallengeId)
  if (!challenge) throw judgeError('JUDGE_UNAVAILABLE', `Transfer challenge ${transferChallengeId} not found`)
  const passed = challenge.testCases.every((test) => {
    const result = runRestrictedPythonFunction(studentTransferCode, challenge.entryFunction, test.inputs)
    return result.ok && result.result === test.expected
  })
  return { transferChallengeId, passed }
}

module.exports = {
  evaluateBooleanExpression,
  runRestrictedPythonFunction,
  evaluateBaseSubmission,
  evaluateTransferSubmission,
}
