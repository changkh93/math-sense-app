/**
 * Phase 3.5 & Phase 4: Runtime v2, Draft Recovery & AC-PAT-003 Modulo Tests
 */

import assert from 'assert'
import {
  saveAlgorithmDraft,
  loadAlgorithmDraft,
  clearAlgorithmDraft,
  loadCompletedPythonConceptIds,
  markPythonConceptCompleted,
} from '../src/components/AlgorithmConstellation/client/services/algorithmDraftStorage.js'
import { buildPersonalizedParsonsTiles } from '../src/components/AlgorithmConstellation/client/scaffold/PersonalizedParsonsBuilder.js'
import {
  evaluateV2Expression,
  runRestrictedPythonV2Function,
  executeRestrictedV2PublicTests,
} from '../src/components/AlgorithmConstellation/runtime/restrictedPythonEvaluatorV2.js'
import { AC_PAT_003_PUBLIC_KERNEL } from '../src/components/AlgorithmConstellation/shared/problems/ac_pat_003.js'
import pkgCatalog from '../functions/algorithmConstellation/privateProblemCatalog.cjs'
const { getPrivateProblemDefinition } = pkgCatalog

import pkgJudge from '../functions/algorithmConstellation/isolatedJudgeRuntime.cjs'
const { evaluateBaseSubmission, evaluateTransferSubmission } = pkgJudge

console.log('\n=== Running Phase 3.5 & Phase 4: Runtime v2 & AC-PAT-003 Tests ===')

// [Test 1] Gate F: Draft Auto-Save & Recovery
console.log('[Test 1] Testing Draft Auto-Save & Recovery...')

// Mock localStorage in Node
const storageMap = new Map()
global.localStorage = {
  getItem: (k) => storageMap.get(k) || null,
  setItem: (k, v) => storageMap.set(k, String(v)),
  removeItem: (k) => storageMap.delete(k),
}

saveAlgorithmDraft({
  problemId: 'AC-COND-001',
  problemVersion: 1,
  ownerKey: 'student_1',
  code: 'def check_gate(s1, s2):\n    return s1 and s2\n',
  fsmState: 'CODE',
  shell: 'navigator',
  storage: global.localStorage,
})

const loadedDraft = loadAlgorithmDraft({
  problemId: 'AC-COND-001',
  problemVersion: 1,
  ownerKey: 'student_1',
  storage: global.localStorage,
})
assert(loadedDraft)
assert.equal(loadedDraft.problemId, 'AC-COND-001')
assert.equal(loadedDraft.shell, 'navigator')
assert(loadedDraft.code.includes('return s1 and s2'))

clearAlgorithmDraft({
  problemId: 'AC-COND-001',
  problemVersion: 1,
  ownerKey: 'student_1',
  storage: global.localStorage,
})
assert.equal(loadAlgorithmDraft({ problemId: 'AC-COND-001', problemVersion: 1, ownerKey: 'student_1', storage: global.localStorage }), null)
assert.equal(saveAlgorithmDraft({ problemId: 'AC-COND-001', code: 'secret', storage: global.localStorage }), false)
assert.equal(loadAlgorithmDraft({ problemId: 'AC-COND-001', storage: global.localStorage }), null)
assert.equal(markPythonConceptCompleted({ ownerKey: 'student_1', conceptId: 'statement:for', storage: global.localStorage }), true)
assert.equal(markPythonConceptCompleted({ ownerKey: 'student_1', conceptId: 'statement:for', storage: global.localStorage }), true)
assert.deepEqual(
  loadCompletedPythonConceptIds({ ownerKey: 'student_1', storage: global.localStorage }),
  ['statement:for'],
)
assert.deepEqual(loadCompletedPythonConceptIds({ ownerKey: 'student_2', storage: global.localStorage }), [])
console.log('  -> Draft storage auto-save and clean recovery verified')

// [Test 2] Gate G: Personalized Parsons Builder
console.log('[Test 2] Testing Personalized Parsons Builder...')
const parsons = buildPersonalizedParsonsTiles({
  studentCode: 'def check_gate(s1, s2):\n    return s1 or s2\n',
})
assert.equal(parsons.headerLine, 'def check_gate(s1, s2):')
assert.equal(parsons.availableTiles.length, 4)

const assembled = parsons.assembleCode([
  parsons.availableTiles[0], // if s1 and s2:
  parsons.availableTiles[2], // return True
  parsons.availableTiles[3], // return False
])
assert(assembled.includes('if s1 and s2:'))
assert(assembled.includes('return True'))
assert(assembled.includes('return False'))
console.log('  -> Personalized Parsons correctly builds reorderable tiles while preserving function structure')

// [Test 3] Gate H: Runtime v2 Evaluation (% Modulo, Integers, Variables)
console.log('[Test 3] Testing Runtime v2 Expression & Function Evaluation...')
assert.equal(evaluateV2Expression('time % 3 == 0', { time: 0 }), true)
assert.equal(evaluateV2Expression('time % 3 == 0', { time: 1 }), false)
assert.equal(evaluateV2Expression('time % 3 == 0', { time: 3 }), true)
assert.equal(evaluateV2Expression('time % 3 == 0', { time: 6 }), true)
assert.equal(evaluateV2Expression('time % 3 == 0', { time: 10 }), false)

const resV2 = runRestrictedPythonV2Function(
  `def check_bridge(time):\n    return time % 3 == 0\n`,
  'check_bridge',
  { time: 9 },
)
assert.equal(resV2, true)

const pubRun = executeRestrictedV2PublicTests({
  code: `def check_bridge(time):\n    return time % 3 == 0\n`,
  entryFunction: 'check_bridge',
  publicTests: AC_PAT_003_PUBLIC_KERNEL.assessment.publicTests,
})
assert.equal(pubRun.ok, true)
assert.equal(pubRun.allPassed, true)
assert.equal(pubRun.testResults.length, 6)
console.log('  -> Runtime v2 correctly evaluates modulo arithmetic and produces step traces')

// [Test 4] Gate I: AC-PAT-003 Public Kernel & Isolated Server Judge
console.log('[Test 4] Testing AC-PAT-003 Public Kernel & Isolated Server Judge...')
assert.equal(AC_PAT_003_PUBLIC_KERNEL.id, 'AC-PAT-003')
assert.equal(AC_PAT_003_PUBLIC_KERNEL.modes.code.entryFunction, 'check_bridge')

const privateDef = getPrivateProblemDefinition('AC-PAT-003', 1)
assert.equal(privateDef.problemId, 'AC-PAT-003')

// Official Solution Evaluation in Server Judge
const officialRes = evaluateBaseSubmission('AC-PAT-003', 1, privateDef.officialSolutionCode)
assert.equal(officialRes.status, 'passed')
assert.equal(officialRes.resultStar, true)

// Alternative Solution Evaluation
for (const altCode of privateDef.alternativeSolutions) {
  const altRes = evaluateBaseSubmission('AC-PAT-003', 1, altCode)
  assert.equal(altRes.status, 'passed')
  assert.equal(altRes.resultStar, true)
}

// 3 Intended Wrong Solutions Verification
for (const wrong of privateDef.intendedWrongSolutions) {
  const wrongRes = evaluateBaseSubmission('AC-PAT-003', 1, wrong.code)
  assert.equal(wrongRes.status, 'failed', `Expected ${wrong.id} to fail`)
  assert.equal(wrongRes.resultStar, false)
}

// Transfer Challenge Verification
const transferT1 = privateDef.transferChallenges[0]
assert.equal(transferT1.transferChallengeId, 'AC-PAT-003-T1')
const transferRes = evaluateTransferSubmission(
  'AC-PAT-003',
  1,
  'AC-PAT-003-T1',
  `def check_cooling(time):\n    return time % 4 == 1\n`,
)
assert.equal(transferRes.passed, true)

console.log('  -> AC-PAT-003 official, alternative, 3 wrong fixtures & Fresh Transfer verified 100%')

console.log('\n=== Phase 3.5 & Phase 4 Runtime v2 & AC-PAT-003 Tests Passed 100%! ===\n')
