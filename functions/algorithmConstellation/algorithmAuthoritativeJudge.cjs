/**
 * Backward-compatible assessment facade for contract tests and migration code.
 * Execution delegates to the same fail-closed restricted evaluator as production.
 */

const { getPrivateProblemDefinition, getTransferChallenges } = require('./privateProblemCatalog.cjs')
const {
  runRestrictedPythonFunction,
  runTestSuiteWithBudget,
  MAX_CUMULATIVE_STEPS,
} = require('./isolatedJudgeRuntime.cjs')

function executePythonFunction(pythonCode, functionName, args = {}) {
  return runRestrictedPythonFunction(pythonCode, functionName, args)
}

function evaluateAuthoritativeSubmission({
  problemId,
  problemVersion = 1,
  studentPythonCode,
  entryFunction = 'check_gate',
  understandingAnswer = null,
  transferPythonCode = null,
  publicTests = [],
}) {
  const definition = getPrivateProblemDefinition(problemId, problemVersion)
  let cumulativeStepsUsed = 0

  // 1. Evaluate Public Tests with budget
  const publicRes = runTestSuiteWithBudget(publicTests || [], studentPythonCode, entryFunction, {
    maxCumulativeSteps: MAX_CUMULATIVE_STEPS,
  })
  cumulativeStepsUsed += publicRes.cumulativeStepsUsed

  // 2. Evaluate Hidden Tests with remaining budget
  const remainingBudget = Math.max(0, MAX_CUMULATIVE_STEPS - cumulativeStepsUsed)
  const hiddenRes = runTestSuiteWithBudget(definition.hiddenTests, studentPythonCode, definition.entryFunction, {
    maxCumulativeSteps: remainingBudget,
  })
  cumulativeStepsUsed += hiddenRes.cumulativeStepsUsed

  const groupResults = {}
  for (const item of hiddenRes.results) {
    const groupName = item.test.group || 'default'
    groupResults[groupName] ||= { group: groupName, total: 0, passed: 0 }
    groupResults[groupName].total += 1
    if (item.passed) {
      groupResults[groupName].passed += 1
    }
  }

  // 3. Evaluate Understanding
  let understandingPassed = false
  if (understandingAnswer && definition.understandingChallenges?.length > 0) {
    const matchingChallenge = definition.understandingChallenges.find(
      (c) => c.challengeId === understandingAnswer.challengeId || c.type === understandingAnswer.type
    )
    if (matchingChallenge) {
      understandingPassed = matchingChallenge.questions.every((q) => {
        return understandingAnswer.answers?.[q.id] === q.expected
      })
    }
  }

  // 4. Evaluate Transfer with remaining budget
  let transferPassed = false
  const transferChallenges = getTransferChallenges(definition)
  if (transferPythonCode && transferChallenges.length > 0) {
    let allTransferOk = true
    for (const challenge of transferChallenges) {
      const transferBudget = Math.max(0, MAX_CUMULATIVE_STEPS - cumulativeStepsUsed)
      if (transferBudget === 0) {
        allTransferOk = false
        break
      }
      const tcRes = runTestSuiteWithBudget(challenge.testCases, transferPythonCode, challenge.entryFunction, {
        maxCumulativeSteps: transferBudget,
      })
      cumulativeStepsUsed += tcRes.cumulativeStepsUsed
      if (!tcRes.allPassed) {
        allTransferOk = false
        break
      }
    }
    transferPassed = allTransferOk
  }

  const publicPassed = publicRes.allPassed
  const hiddenPassed = hiddenRes.allPassed
  const star1 = publicPassed && hiddenPassed
  const star2 = star1 && understandingPassed
  const star3 = star2 && transferPassed
  return {
    problemId,
    problemVersion,
    stars: star3 ? 3 : star2 ? 2 : star1 ? 1 : 0,
    starDetails: {
      star1_result: star1,
      star2_understanding: star2,
      star3_transfer: star3,
    },
    resultStar: star1,
    publicPassed,
    hiddenPassed,
    understandingPassed,
    transferPassed,
    cumulativeStepsUsed,
    testGroupSummaries: Object.values(groupResults),
  }
}

module.exports = { executePythonFunction, evaluateAuthoritativeSubmission }
