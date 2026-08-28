/**
 * Restricted, fail-closed server judge runtime.
 * Evaluates student Python submissions for Algorithm Constellation missions (AC-COND, AC-PAT, AC-SEQ, AC-NAV).
 *
 * Invariants:
 * 1. ZERO dynamic JavaScript generation (eval, new Function, vm.runInContext forbidden).
 * 2. Deterministic step counter (MAX_STEPS bounded) to eliminate infinite loops.
 * 3. Structured return values matching Python semantics (Boolean, Integer, List, Tuple).
 */

const { getPrivateProblemDefinition } = require('./privateProblemCatalog.cjs')
const {
  SafePythonInterpreter,
  runRestrictedPythonFunction,
  FORBIDDEN_SOURCE,
  matchesExpected,
  evaluatorError,
} = require('./sharedPythonEvaluatorCore.cjs')

function evaluateBaseSubmission(problemId, problemVersion, code) {
  if (!code || typeof code !== 'string') {
    return { passed: false, resultStar: false, error: '유효한 코드가 아닙니다.', testGroups: [] }
  }
  if (FORBIDDEN_SOURCE.test(code)) {
    return { passed: false, resultStar: false, error: '보안 정책상 허용되지 않는 구문이 포함되어 있습니다.', testGroups: [] }
  }

  const definition = getPrivateProblemDefinition(problemId, problemVersion)
  const groupResults = {}
  let allPassed = true
  let firstFailureMessage = null

  for (const test of definition.hiddenTests) {
    const res = runRestrictedPythonFunction(code, definition.entryFunction, test.inputs)
    groupResults[test.group] ||= { group: test.group, total: 0, passed: 0 }
    groupResults[test.group].total += 1
    if (res.ok && matchesExpected(res.result, test.expected)) {
      groupResults[test.group].passed += 1
    } else {
      allPassed = false
      if (!firstFailureMessage) {
        firstFailureMessage = res.error || `입력값에 대한 실행 결과가 예상과 다릅니다.`
      }
    }
  }

  return {
    passed: allPassed,
    status: allPassed ? 'passed' : 'failed',
    resultStar: allPassed,
    error: allPassed ? null : firstFailureMessage,
    testGroups: Object.values(groupResults),
  }
}

function evaluateTransferSubmission(problemId, problemVersion, challengeId, transferCode) {
  const definition = getPrivateProblemDefinition(problemId, problemVersion)
  const challenge = definition.transferMasterSet.find((c) => c.transferChallengeId === challengeId)
  if (!challenge) {
    throw evaluatorError('INVALID_ARGUMENT', `Transfer challenge ${challengeId} not found`)
  }

  let allPassed = true
  let firstFailureMessage = null
  for (const test of challenge.testCases) {
    const res = runRestrictedPythonFunction(transferCode, challenge.entryFunction, test.inputs)
    if (!res.ok || !matchesExpected(res.result, test.expected)) {
      allPassed = false
      firstFailureMessage = res.error || `전이 문제 테스트를 통과하지 못했습니다.`
      break
    }
  }

  return {
    passed: allPassed,
    status: allPassed ? 'passed' : 'failed',
    error: allPassed ? null : firstFailureMessage,
  }
}

module.exports = {
  runRestrictedPythonFunction,
  evaluateBaseSubmission,
  evaluateTransferSubmission,
  SafePythonInterpreter,
}
