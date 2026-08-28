/**
 * Backward-compatible assessment facade for contract tests and migration code.
 * Execution delegates to the same fail-closed restricted evaluator as production.
 */

const { getPrivateProblemDefinition } = require('./privateProblemCatalog.cjs')
const { runRestrictedPythonFunction } = require('./isolatedJudgeRuntime.cjs')

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
  const publicPassed = (publicTests || []).every((test) => {
    const result = executePythonFunction(studentPythonCode, entryFunction, test.inputs)
    return result.ok && result.result === test.expected
  })
  const groupResults = {}
  let hiddenPassed = true
  for (const test of definition.hiddenTests) {
    groupResults[test.group] ||= { group: test.group, total: 0, passed: 0 }
    groupResults[test.group].total += 1
    const result = executePythonFunction(studentPythonCode, entryFunction, test.inputs)
    if (result.ok && result.result === test.expected) groupResults[test.group].passed += 1
    else hiddenPassed = false
  }

  const understandingPassed = Boolean(
    understandingAnswer?.type === 'truth_table_completion' &&
    understandingAnswer.answers?.s1_true_s2_true === true &&
    understandingAnswer.answers?.s1_true_s2_false === false
  )
  const transferPassed = Boolean(transferPythonCode) && definition.transferMasterSet.every((challenge) =>
    challenge.testCases.every((test) => {
      const result = executePythonFunction(transferPythonCode, challenge.entryFunction, test.inputs)
      return result.ok && result.result === test.expected
    })
  )
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
    publicPassed,
    hiddenPassed,
    understandingPassed,
    transferPassed,
    testGroupSummaries: Object.values(groupResults),
  }
}

module.exports = { executePythonFunction, evaluateAuthoritativeSubmission }
