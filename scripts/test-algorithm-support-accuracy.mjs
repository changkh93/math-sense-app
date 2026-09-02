import assert from 'node:assert/strict'
import { PUBLIC_KERNELS } from '../src/components/AlgorithmConstellation/shared/problems/index.js'
import { CONSTELLATION_0_SCAFFOLDS } from '../src/components/AlgorithmConstellation/client/scaffold/constellation0Scaffolds.js'
import { getScaffoldByLevel } from '../src/components/AlgorithmConstellation/client/scaffold/scaffoldGraph.js'
import { matchRuleBasedMisconception } from '../src/components/AlgorithmConstellation/shared/taxonomy/ruleBasedMisconceptionMatcher.js'
import { executeRestrictedPublicTests } from '../src/components/AlgorithmConstellation/runtime/restrictedPythonEvaluator.js'
// Test-only access: production support must never import the private catalog.
import { getPrivateProblemDefinition } from '../functions/algorithmConstellation/privateProblemCatalog.cjs'

function run(problemId, code, tests) {
  const kernel = PUBLIC_KERNELS[problemId]
  return executeRestrictedPublicTests({
    code, entryFunction: kernel.modes.code.entryFunction,
    publicTests: tests || kernel.assessment.diagnosticTests || kernel.assessment.publicTests,
  })
}

let verifiedExamples = 0
let verifiedCases = 0
assert.equal(Object.keys(CONSTELLATION_0_SCAFFOLDS).length, 10)
for (const kernel of Object.values(PUBLIC_KERNELS)) {
  for (let level = 1; level <= 6; level++) {
    const scaffold = getScaffoldByLevel(level, kernel.id)
    assert.equal(scaffold?.level, level, `${kernel.id}: missing scaffold ${level}`)
    assert(scaffold.content || scaffold.parsonsBlocks?.length || scaffold.solutionExplanation)
    if (kernel.id !== 'AC-COND-001') {
      assert(!JSON.stringify(scaffold).includes('두 스위치'), `${kernel.id}: unrelated switch guide`)
    }
  }

  const rescue = getScaffoldByLevel(6, kernel.id)
  if (kernel.curriculum?.constellationId === 'constellation-0') {
    assert(rescue.solutionCode, `${kernel.id}: C0 needs a complete, executable recovery example`)
    assert(rescue.solutionCode.startsWith(kernel.modes.code.starterCode.match(/^def .+:$/m)[0]))
  }
  if (rescue.solutionCode) {
    const privateDefinition = getPrivateProblemDefinition(kernel.id, kernel.version)
    const cases = [...kernel.assessment.publicTests, ...privateDefinition.hiddenTests]
    const result = run(kernel.id, rescue.solutionCode, cases)
    assert(result.allPassed, `${kernel.id}: recovery example fails ${JSON.stringify(result.testResults.filter((t) => !t.passed))}`)
    verifiedExamples++
    verifiedCases += cases.length
  }

  // Correct booleans, numbers, strings and collections must never be diagnosed
  // as incomplete (or as another mission's misconception).
  const definition = getPrivateProblemDefinition(kernel.id, kernel.version)
  const result = run(kernel.id, definition.officialSolutionCode)
  assert(result.allPassed, `${kernel.id}: official fixture must pass`)
  assert.equal(matchRuleBasedMisconception({ problemId: kernel.id, testResults: result.testResults }), null)
}

const diagnostic = (problemId, code) => matchRuleBasedMisconception({ problemId, testResults: run(problemId, code).testResults })
assert.equal(diagnostic('AC-EXP-LOOP-06', 'def repeat_pulse(times, step_energy):\n    return 0'), null)
assert.equal(diagnostic('AC-EXP-LOOP-06', 'def repeat_pulse(times, step_energy):\n    return 8'), null)
assert.equal(diagnostic('AC-EXP-LOOP-06', 'def repeat_pulse(times, step_energy):\n    pass').misconceptionCode, 'MISSING-RETURN-01')
const partialReturn = diagnostic('AC-EXP-LOOP-06', 'def repeat_pulse(times, step_energy):\n    if times == 4:\n        return 8')
assert.equal(partialReturn.misconceptionCode, 'MISSING-RETURN-01')
assert(!partialReturn.guidance.includes('pass'), 'A return missing on one branch is not evidence of pass')
for (const actual of [0, 8, false, '', [], {}, undefined]) {
  assert.equal(matchRuleBasedMisconception({ testResults: [{ actual, expected: 9, passed: false }] }), null)
}
assert.equal(matchRuleBasedMisconception({ testResults: [{ actual: null, expected: null, passed: true }] }), null)
assert.equal(matchRuleBasedMisconception({ testResults: [{ actual: null, expected: 8, error: 'TypeError', passed: false }] }), null)

// The same input name does not make a four-second beacon a three-second bridge.
assert.equal(diagnostic('AC-PAT-003', 'def check_bridge(time):\n    return time % 2 == 0').misconceptionCode, 'PAT-CYCLE-01')
assert.equal(diagnostic('AC-PAT-004', 'def beacon_light(time):\n    return time % 2 == 0'), null)
assert.equal(diagnostic('AC-COND-001', 'def check_gate(s1, s2):\n    return s1 or s2').misconceptionCode, 'COND-AND-OR-01')

// Dynamic help uses this problem's examples and function, without treating
// observation frames as copyable algorithm steps or inventing function bodies.
const dynamicId = 'AC-COND-NOT-13'
assert(getScaffoldByLevel(1, dynamicId).content.includes(PUBLIC_KERNELS[dynamicId].modes.code.entryFunction))
assert(getScaffoldByLevel(2, dynamicId).content.includes('True'))
assert(getScaffoldByLevel(6, dynamicId).solutionExplanation.includes(PUBLIC_KERNELS[dynamicId].modes.explore.lensConfig.ruleStatement))
assert(!getScaffoldByLevel(5, dynamicId).parsonsBlocks.some((block) => block.includes('def ') || block.includes('return 결과')))
assert.equal(getScaffoldByLevel(1, 'unknown-problem'), null)
assert.equal(getScaffoldByLevel(1), null)

console.log(`Support accuracy passed: ${Object.keys(PUBLIC_KERNELS).length} missions × 6 tiers; ${verifiedExamples} recovery programs / ${verifiedCases} public and hidden cases; return and mission-scoped diagnostics.`)
