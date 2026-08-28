/**
 * Test Suite: Wave-Based Problem Expansion Verification
 * Validates all 6 problem archetypes across:
 * 1. Public Problem Kernel Schema Invariants (Zero Leaks, DeepFreeze)
 * 2. Modular Private Problem Catalog Definitions
 * 3. Authoritative Judge Execution for Official Solutions (3-Star Mastery)
 * 4. Intended Wrong Fixture Contracts (Must fail hidden test groups)
 * 5. Fresh Transfer Evaluations
 */

import assert from 'node:assert/strict'
import { validateProblemKernel } from '../src/components/AlgorithmConstellation/shared/contracts/problemKernelSchema.js'
import { evaluateAuthoritativeSubmission } from '../functions/algorithmConstellation/algorithmAuthoritativeJudge.cjs'
import { getPrivateProblemDefinition, listRegisteredProblemIds } from '../functions/algorithmConstellation/privateProblemCatalog.cjs'

import { AC_COND_001 } from '../src/components/AlgorithmConstellation/shared/problems/ac_cond_001.js'
import { AC_COND_002 } from '../src/components/AlgorithmConstellation/shared/problems/ac_cond_002.js'
import { AC_PAT_003_PUBLIC_KERNEL } from '../src/components/AlgorithmConstellation/shared/problems/ac_pat_003.js'
import { AC_PAT_004 } from '../src/components/AlgorithmConstellation/shared/problems/ac_pat_004.js'
import { AC_SEQ_005 } from '../src/components/AlgorithmConstellation/shared/problems/ac_seq_005.js'
import { AC_NAV_005 } from '../src/components/AlgorithmConstellation/shared/problems/ac_nav_005.js'
import { AC_NAV_006 } from '../src/components/AlgorithmConstellation/shared/problems/ac_nav_006.js'

console.log('=== Running Wave-Based Problem Expansion Verification ===')

const ALL_PUBLIC_KERNELS = [
  AC_COND_001,
  AC_COND_002,
  AC_PAT_003_PUBLIC_KERNEL,
  AC_PAT_004,
  AC_SEQ_005,
  AC_NAV_005,
  AC_NAV_006,
]

// [Test 1] Verify Public Problem Kernel Schemas and Zero-Leak Invariant
console.log('[Test 1] Validating all 7 Public Problem Kernels...')
for (const kernel of ALL_PUBLIC_KERNELS) {
  const errors = validateProblemKernel(kernel)
  assert.deepEqual(errors, [], `Kernel ${kernel.id} must have 0 schema errors`)
  assert.equal(kernel.modes?.code?.solutionCode, undefined, `${kernel.id} must not leak solutionCode`)
  assert.equal(kernel.assessment?.hiddenTests, undefined, `${kernel.id} must not leak hiddenTests`)
  console.log(`  -> Kernel ${kernel.id} (${kernel.identity.studentTitle}) schema valid & deeply frozen`)
}

// [Test 2] Verify Modular Private Catalog Registration
console.log('[Test 2] Validating Modular Private Problem Catalog...')
const registeredIds = listRegisteredProblemIds()
assert.equal(registeredIds.length >= 7, true, 'All 7 problem definitions registered')

for (const kernel of ALL_PUBLIC_KERNELS) {
  const privateDef = getPrivateProblemDefinition(kernel.id, 1)
  assert.equal(privateDef.problemId, kernel.id)
  assert.equal(typeof privateDef.officialSolutionCode, 'string')
  assert.equal(Array.isArray(privateDef.hiddenTests), true)
  assert.equal(privateDef.hiddenTests.length >= 3, true)
  assert.equal(Array.isArray(privateDef.intendedWrongSolutions), true)
  assert.equal(privateDef.intendedWrongSolutions.length >= 2, true)
}
console.log('  -> All 6 private definitions properly isolated and configured')

// [Test 3] Judge Official Solutions & Transfers for All 6 Problems
console.log('[Test 3] Evaluating Official Solutions & Fresh Transfers in Authoritative Judge...')

// 1. AC-COND-001 (Two Safety Switches)
const defCond1 = getPrivateProblemDefinition('AC-COND-001', 1)
const resCond1 = evaluateAuthoritativeSubmission({
  problemId: 'AC-COND-001',
  problemVersion: 1,
  studentPythonCode: defCond1.officialSolutionCode,
  entryFunction: 'check_gate',
  understandingAnswer: {
    challengeId: 'uc_cond_01',
    type: 'truth_table_completion',
    answers: { q1: false, q2: true },
  },
  transferPythonCode: `def can_exit(suit_ready, oxygen_ok):\n    return bool(suit_ready and oxygen_ok)\ndef check_gate_3(s1, s2, s3):\n    return bool(s1 and s2 and s3)\n`,
  publicTests: AC_COND_001.assessment.publicTests,
})
assert.equal(resCond1.stars, 3)

// 2. AC-COND-002 (Lifeboat Boarding)
const defCond2 = getPrivateProblemDefinition('AC-COND-002', 1)
const resCond2 = evaluateAuthoritativeSubmission({
  problemId: 'AC-COND-002',
  problemVersion: 1,
  studentPythonCode: defCond2.officialSolutionCode,
  entryFunction: 'can_board',
  understandingAnswer: {
    challengeId: 'uc_cond_02_01',
    type: 'truth_table_completion',
    answers: { q1: true, q2: false },
  },
  transferPythonCode: `def can_refuel(at_station, tanker_connected):\n    return bool(at_station or tanker_connected)\n`,
  publicTests: AC_COND_002.assessment.publicTests,
})
assert.equal(resCond2.stars, 3)

// 3. AC-PAT-003 (Frozen Signal Bridge)
const defPat3 = getPrivateProblemDefinition('AC-PAT-003', 1)
const resPat3 = evaluateAuthoritativeSubmission({
  problemId: 'AC-PAT-003',
  problemVersion: 1,
  studentPythonCode: defPat3.officialSolutionCode,
  entryFunction: 'check_bridge',
  understandingAnswer: {
    challengeId: 'uc_pat_01',
    type: 'modulo_cycle_prediction',
    answers: { q1: true, q2: false },
  },
  transferPythonCode: `def check_cooling(time):\n    return time % 4 == 1\n`,
  publicTests: AC_PAT_003_PUBLIC_KERNEL.assessment.publicTests,
})
assert.equal(resPat3.stars, 3)

// 4. AC-PAT-004 (Rotating Beacon)
const defPat4 = getPrivateProblemDefinition('AC-PAT-004', 1)
const resPat4 = evaluateAuthoritativeSubmission({
  problemId: 'AC-PAT-004',
  problemVersion: 1,
  studentPythonCode: defPat4.officialSolutionCode,
  entryFunction: 'beacon_light',
  understandingAnswer: {
    challengeId: 'uc_pat_04_01',
    type: 'modulo_interval_prediction',
    answers: { q1: true, q2: false },
  },
  transferPythonCode: `def shield_charging(time):\n    return time % 5 < 3\n`,
  publicTests: AC_PAT_004.assessment.publicTests,
})
assert.equal(resPat4.stars, 3)

// 5. AC-SEQ-005 (Energy Capsule Accumulator)
const defSeq5 = getPrivateProblemDefinition('AC-SEQ-005', 1)
const resSeq5 = evaluateAuthoritativeSubmission({
  problemId: 'AC-SEQ-005',
  problemVersion: 1,
  studentPythonCode: defSeq5.officialSolutionCode,
  entryFunction: 'collect_energy',
  understandingAnswer: {
    challengeId: 'uc_seq_05_01',
    type: 'accumulator_trace_prediction',
    answers: { q1: false, q2: true },
  },
  transferPythonCode: `def collect_crystals(ores):\n    total = 0\n    for x in ores:\n        if x > 0:\n            total += x\n    return total\n`,
  publicTests: AC_SEQ_005.assessment.publicTests,
})
assert.equal(resSeq5.stars, 3)

// 6. AC-NAV-005 (Signal Deque Queue)
const defNav5 = getPrivateProblemDefinition('AC-NAV-005', 1)
const resNav5 = evaluateAuthoritativeSubmission({
  problemId: 'AC-NAV-005',
  problemVersion: 1,
  studentPythonCode: defNav5.officialSolutionCode,
  entryFunction: 'process_signals',
  understandingAnswer: {
    challengeId: 'uc_nav_05_01',
    type: 'queue_fifo_prediction',
    answers: { q1: true, q2: true },
  },
  transferPythonCode: `from collections import deque\ndef process_cargo(cargo_list):\n    q = deque(cargo_list)\n    res = []\n    while q:\n        res.append(q.popleft())\n    return res\n`,
  publicTests: AC_NAV_005.assessment.publicTests,
})
assert.equal(resNav5.stars, 3)

// 7. AC-NAV-006 (Grid BFS Shortest Path)
const defNav6 = getPrivateProblemDefinition('AC-NAV-006', 1)
const resNav6 = evaluateAuthoritativeSubmission({
  problemId: 'AC-NAV-006',
  problemVersion: 1,
  studentPythonCode: defNav6.officialSolutionCode,
  entryFunction: 'shortest_path',
  understandingAnswer: {
    challengeId: 'uc_nav_06_01',
    type: 'bfs_visited_prediction',
    answers: { q1: true, q2: true },
  },
  transferPythonCode: `from collections import deque\n\ndef virus_spread_steps(grid, start, target):\n    if start[0] == target[0] and start[1] == target[1]:\n        return 0\n    rows = len(grid)\n    cols = len(grid[0])\n    queue = deque([(start[0], start[1], 0)])\n    visited = {(start[0], start[1])}\n    while queue:\n        r, c, dist = queue.popleft()\n        if r == target[0] and c == target[1]:\n            return dist\n        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:\n            nr = r + dr\n            nc = c + dc\n            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:\n                if (nr, nc) not in visited:\n                    visited.add((nr, nc))\n                    queue.append((nr, nc, dist + 1))\n    return -1\n`,
  publicTests: AC_NAV_006.assessment.publicTests,
})
assert.equal(resNav6.stars, 3)
console.log('  -> All 7 official solutions & fresh transfers passed 3 stars (100%)')

// [Test 4] Verify Intended Wrong Solutions Fail as Contracted
console.log('[Test 4] Validating Intended Wrong Fixture Contracts...')
for (const kernel of ALL_PUBLIC_KERNELS) {
  const def = getPrivateProblemDefinition(kernel.id, 1)
  const definedGroups = new Set(def.hiddenTests.map((t) => t.group))

  for (const wrong of def.intendedWrongSolutions) {
    if (wrong.expectedFailureGroup) {
      assert.ok(
        definedGroups.has(wrong.expectedFailureGroup),
        `Catalog error: expectedFailureGroup "${wrong.expectedFailureGroup}" declared in wrong solution ${wrong.id} does not exist in hiddenTests for ${kernel.id}`
      )
    }

    const res = evaluateAuthoritativeSubmission({
      problemId: kernel.id,
      problemVersion: 1,
      studentPythonCode: wrong.code,
      entryFunction: def.entryFunction,
      publicTests: kernel.assessment.publicTests,
    })

    assert.equal(res.resultStar, false, `Wrong fixture ${wrong.id} for ${kernel.id} MUST NOT achieve resultStar`)
    assert.equal(res.hiddenPassed, false, `Wrong fixture ${wrong.id} for ${kernel.id} MUST fail hidden tests`)

    if (wrong.expectedFailureGroup) {
      const failedGroup = res.testGroupSummaries.find((g) => g.group === wrong.expectedFailureGroup)
      assert.ok(failedGroup, `Group summary for "${wrong.expectedFailureGroup}" must exist in results for ${kernel.id}`)
      assert.ok(
        failedGroup.passed < failedGroup.total,
        `Wrong fixture ${wrong.id} for ${kernel.id} MUST fail in group "${wrong.expectedFailureGroup}" (passed ${failedGroup.passed}/${failedGroup.total})`
      )
    }
  }
}
console.log('  -> All intended wrong fixtures caught by authoritative test suites with failure group isolation')

console.log('\n=== Wave-Based Problem Expansion Verification 100% Passed ===\n')
