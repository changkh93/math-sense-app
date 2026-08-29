import assert from 'assert'
import { getPrivateProblemDefinition } from '../functions/algorithmConstellation/problems/index.cjs'
import { evaluateAuthoritativeSubmission } from '../functions/algorithmConstellation/algorithmAuthoritativeJudge.cjs'
import { PUBLIC_KERNELS } from '../src/components/AlgorithmConstellation/shared/problems/index.js'
import { validateProblemKernelSchema } from '../src/components/AlgorithmConstellation/shared/contracts/problemKernelSchema.js'

console.log('\n=== Running 12 Capability Prototypes Verification ===')

const PROTOTYPE_IDS = [
  'AC-COND-001',
  'AC-COND-002',
  'AC-PAT-003',
  'AC-PAT-004',
  'AC-SEQ-005',
  'AC-NAV-005',
  'AC-NAV-006',
  'AC-CODE-FIRST-ERROR-01',
  'AC-STR-REVERSE-01',
  'AC-SET-UNIQUE-01',
  'AC-SORT-MIN-01',
  'AC-ENUM-PAIR-01',
]

const TRANSFER_CODE_MAP = {
  'AC-COND-001': `def can_exit(suit_ready, oxygen_ok):\n    return bool(suit_ready and oxygen_ok)\ndef check_gate_3(s1, s2, s3):\n    return bool(s1 and s2 and s3)\n`,
  'AC-COND-002': `def can_refuel(at_station, tanker_connected):\n    return bool(at_station or tanker_connected)\n`,
  'AC-PAT-003': `def check_cooling(time):\n    return time % 4 == 1\n`,
  'AC-PAT-004': `def shield_charging(time):\n    return time % 5 < 3\n`,
  'AC-SEQ-005': `def collect_crystals(ores):\n    total = 0\n    for x in ores:\n        if x > 0:\n            total += x\n    return total\n`,
  'AC-NAV-005': `from collections import deque\ndef process_cargo(cargo_list):\n    q = deque(cargo_list)\n    res = []\n    while q:\n        res.append(q.popleft())\n    return res\n`,
  'AC-NAV-006': `from collections import deque\ndef virus_spread_steps(grid, start, target):\n    if start[0] == target[0] and start[1] == target[1]:\n        return 0\n    rows = len(grid)\n    cols = len(grid[0])\n    queue = deque([(start[0], start[1], 0)])\n    visited = {(start[0], start[1])}\n    while queue:\n        r, c, dist = queue.popleft()\n        if r == target[0] and c == target[1]:\n            return dist\n        for dr, dc in [(-1, 0), (1, 0), (0, -1), (0, 1)]:\n            nr = r + dr\n            nc = c + dc\n            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == 0:\n                if (nr, nc) not in visited:\n                    visited.add((nr, nc))\n                    queue.append((nr, nc, dist + 1))\n    return -1\n`,
  'AC-CODE-FIRST-ERROR-01': `def find_first_overload(loads, threshold):\n    for i in range(len(loads)):\n        if loads[i] > threshold:\n            return i\n    return -1\n`,
  'AC-STR-REVERSE-01': `def mirror_encode(word):\n    return word[::-1]\n`,
  'AC-SET-UNIQUE-01': `def count_unique_planets(planets):\n    return len(set(planets))\n`,
  'AC-SORT-MIN-01': `def move_max_to_end(cargos):\n    if not cargos: return []\n    max_idx = 0\n    for i in range(len(cargos)):\n        if cargos[i] > cargos[max_idx]:\n            max_idx = i\n    last = len(cargos) - 1\n    cargos[last], cargos[max_idx] = cargos[max_idx], cargos[last]\n    return cargos\n`,
  'AC-ENUM-PAIR-01': `def find_pair_diff(capsules, target):\n    n = len(capsules)\n    for i in range(n):\n        for j in range(n):\n            if i != j and capsules[j] - capsules[i] == target:\n                return [i, j]\n    return []\n`,
}

for (const pid of PROTOTYPE_IDS) {
  console.log(`[Prototype Verification] Testing ${pid}...`)
  const kernel = PUBLIC_KERNELS[pid]
  assert.ok(kernel, `Public kernel for ${pid} must be registered`)
  assert.deepEqual(validateProblemKernelSchema(kernel), [], `${pid} must use the canonical public kernel contract`)
  assert.equal(kernel.id, pid)
  assert.ok(!/return\s+(?:len\(set\(|\w+\[::?-1\]|\[?i\s*,\s*j\]?)/.test(kernel.modes.code.starterCode), `${pid} starter code must not contain a complete answer`)

  const privateDef = getPrivateProblemDefinition(pid, 1)
  assert.ok(privateDef, `Private definition for ${pid} must be registered`)

  const uChallenge = privateDef.understandingChallenges?.[0]
  const understandingAnswer = uChallenge
    ? {
        challengeId: uChallenge.challengeId,
        type: uChallenge.type,
        answers: Object.fromEntries(
          uChallenge.questions.map((q) => [q.id, q.expected !== undefined ? q.expected : q.answer])
        ),
      }
    : null

  // 1. Official Solution Evaluation
  const officialEval = evaluateAuthoritativeSubmission({
    problemId: pid,
    problemVersion: 1,
    studentPythonCode: privateDef.officialSolutionCode,
    entryFunction: privateDef.entryFunction,
    publicTests: kernel.assessment.publicTests,
    understandingAnswer,
    transferPythonCode: TRANSFER_CODE_MAP[pid] || privateDef.transferMasterSet?.[0]?.officialSolutionCode,
  })

  assert.equal(officialEval.stars, 3, `${pid} official solution must achieve 3 stars`)
  assert.equal(officialEval.resultStar, true)
  assert.equal(officialEval.publicPassed, true)
  assert.equal(officialEval.hiddenPassed, true)
  assert.equal(officialEval.understandingPassed, true)
  assert.equal(officialEval.transferPassed, true)

  // 2. Intended Wrong Fixture Isolation
  for (const wrong of privateDef.intendedWrongFixtures || []) {
    const wrongEval = evaluateAuthoritativeSubmission({
      problemId: pid,
      problemVersion: 1,
      studentPythonCode: wrong.code,
      entryFunction: privateDef.entryFunction,
      publicTests: kernel.assessment.publicTests,
    })
    assert.equal(
      wrongEval.resultStar,
      false,
      `${pid} wrong fixture '${wrong.label}' MUST NOT pass result star`
    )
  }

  console.log(`  -> [PASS] ${pid} 3-Star Official Solution & Wrong Fixtures Verified 100%`)
}

console.log('\n=== All 12 Capability Prototypes Passed Authoritative Server Judge 100%! ===\n')
