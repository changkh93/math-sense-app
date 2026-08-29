/**
 * Restricted, fail-closed server judge runtime.
 * Evaluates student Python submissions for Algorithm Constellation missions (AC-COND, AC-PAT, AC-SEQ, AC-NAV).
 *
 * Invariants:
 * 1. ZERO dynamic JavaScript generation (eval, new Function, vm.runInContext forbidden).
 * 2. Deterministic step counter (MAX_STEPS bounded) to eliminate infinite loops.
 * 3. Structured return values matching Python semantics (Boolean, Integer, List, Tuple).
 */

const { getPrivateProblemDefinition, getTransferChallenges } = require('./privateProblemCatalog.cjs')
const {
  SafePythonInterpreter,
  runRestrictedPythonFunction,
  FORBIDDEN_SOURCE,
  matchesExpected,
  evaluatorError,
} = require('./sharedPythonEvaluatorCore.cjs')

const MAX_CUMULATIVE_STEPS = 200_000

function runTestSuiteWithBudget(tests, code, entryFunction, limits = {}) {
  const maxCumulativeSteps = limits.maxCumulativeSteps ?? MAX_CUMULATIVE_STEPS
  let cumulativeStepsUsed = 0
  const results = []
  let allPassed = true
  let firstFailureMessage = null

  for (const test of tests) {
    if (cumulativeStepsUsed >= maxCumulativeSteps) {
      allPassed = false
      if (!firstFailureMessage) {
        firstFailureMessage = `전체 테스트 누적 스텝 예산(${maxCumulativeSteps})을 초과했습니다.`
      }
      results.push({ test, passed: false, error: firstFailureMessage, stepsExecuted: 0 })
      break
    }

    const remainingSteps = Math.max(1, maxCumulativeSteps - cumulativeStepsUsed)
    const res = runRestrictedPythonFunction(code, entryFunction, test.inputs, { maxSteps: remainingSteps })
    if (res.stepsExecuted) {
      cumulativeStepsUsed += res.stepsExecuted
    }

    const passed = res.ok && matchesExpected(res.result, test.expected)
    if (passed) {
      results.push({ test, passed: true, result: res.result, stepsExecuted: res.stepsExecuted || 0 })
    } else {
      allPassed = false
      if (!firstFailureMessage) {
        firstFailureMessage = res.error || `입력값에 대한 실행 결과가 예상과 다릅니다.`
      }
      results.push({ test, passed: false, error: firstFailureMessage, stepsExecuted: res.stepsExecuted || 0 })
    }
  }

  return {
    allPassed,
    firstFailureMessage: allPassed ? null : firstFailureMessage,
    cumulativeStepsUsed,
    results,
  }
}

function evaluateBaseSubmission(problemId, problemVersion, code, limits = {}) {
  if (!code || typeof code !== 'string') {
    return { passed: false, resultStar: false, error: '유효한 코드가 아닙니다.', testGroups: [], cumulativeStepsUsed: 0 }
  }
  if (FORBIDDEN_SOURCE.test(code)) {
    return { passed: false, resultStar: false, error: '보안 정책상 허용되지 않는 구문이 포함되어 있습니다.', testGroups: [], cumulativeStepsUsed: 0 }
  }

  const definition = getPrivateProblemDefinition(problemId, problemVersion)
  const suiteRes = runTestSuiteWithBudget(definition.hiddenTests, code, definition.entryFunction, limits)

  const groupResults = {}
  for (const item of suiteRes.results) {
    const groupName = item.test.group || 'default'
    groupResults[groupName] ||= { group: groupName, total: 0, passed: 0 }
    groupResults[groupName].total += 1
    if (item.passed) {
      groupResults[groupName].passed += 1
    }
  }

  return {
    passed: suiteRes.allPassed,
    status: suiteRes.allPassed ? 'passed' : 'failed',
    resultStar: suiteRes.allPassed,
    error: suiteRes.firstFailureMessage,
    cumulativeStepsUsed: suiteRes.cumulativeStepsUsed,
    testGroups: Object.values(groupResults),
  }
}

function evaluateTransferSubmission(problemId, problemVersion, challengeId, transferCode, limits = {}) {
  const definition = getPrivateProblemDefinition(problemId, problemVersion)
  const challenge = getTransferChallenges(definition).find((c) => c.transferChallengeId === challengeId)
  if (!challenge) {
    throw evaluatorError('INVALID_ARGUMENT', `Transfer challenge ${challengeId} not found`)
  }

  const suiteRes = runTestSuiteWithBudget(challenge.testCases, transferCode, challenge.entryFunction, limits)

  return {
    passed: suiteRes.allPassed,
    status: suiteRes.allPassed ? 'passed' : 'failed',
    error: suiteRes.firstFailureMessage,
    cumulativeStepsUsed: suiteRes.cumulativeStepsUsed,
  }
}

module.exports = {
  runRestrictedPythonFunction,
  runTestSuiteWithBudget,
  evaluateBaseSubmission,
  evaluateTransferSubmission,
  SafePythonInterpreter,
  MAX_CUMULATIVE_STEPS,
}
