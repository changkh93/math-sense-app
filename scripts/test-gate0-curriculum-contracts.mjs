import assert from 'assert'
import { CONSTELLATIONS, getConstellationAccess, isConstellationUnlocked } from '../src/components/AlgorithmConstellation/shared/catalog/constellationRegistry.js'
import { ALGORITHM_EDITORIAL_CATALOG } from '../src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js'
import { PYTHON_CONCEPT_REGISTRY } from '../src/components/AlgorithmConstellation/shared/python/pythonConceptRegistry.js'
import { EVIDENCE_PRIMITIVES, buildEvidenceFromTrace } from '../src/components/AlgorithmConstellation/shared/evidence/evidencePrimitives.js'
import { PUBLIC_KERNELS } from '../src/components/AlgorithmConstellation/shared/problems/index.js'

console.log('\n=== Running LUMI Core 100 Curriculum & Gate 0 Contract Tests ===')

// [Test 1] 100 Problems Distribution (76 Core + 20 Branch + 4 Capstone)
console.log('[Test 1] Validating Exact 76 Core + 20 Branch + 4 Capstone Distribution...')
assert.equal(ALGORITHM_EDITORIAL_CATALOG.length, 100, 'Catalog MUST have exactly 100 problems')

const coreCount = ALGORITHM_EDITORIAL_CATALOG.filter((p) => p.routeRole === 'core').length
const branchCount = ALGORITHM_EDITORIAL_CATALOG.filter((p) => p.routeRole === 'branch').length
const capstoneCount = ALGORITHM_EDITORIAL_CATALOG.filter((p) => p.routeRole === 'capstone').length

assert.equal(coreCount, 76, 'Core count must be exactly 76')
assert.equal(branchCount, 20, 'Branch count must be exactly 20')
assert.equal(capstoneCount, 4, 'Capstone count must be exactly 4')
console.log(`  -> [PASS] Distribution strictly verified: ${coreCount} Core + ${branchCount} Branch + ${capstoneCount} Capstone = 100`)

// [Test 2] Catalog Order & Stable ID Uniqueness
console.log('[Test 2] Validating Contiguous catalogOrder (1..100) and Problem ID Uniqueness...')
const orderSet = new Set()
const idSet = new Set()

ALGORITHM_EDITORIAL_CATALOG.forEach((item, index) => {
  assert.equal(item.catalogOrder, index + 1, `catalogOrder must be sequential 1-indexed at position ${index}`)
  assert.ok(!orderSet.has(item.catalogOrder), `Duplicate catalogOrder: ${item.catalogOrder}`)
  assert.ok(!idSet.has(item.problemId), `Duplicate problemId: ${item.problemId}`)
  orderSet.add(item.catalogOrder)
  idSet.add(item.problemId)

  assert.ok(item.provenance, `Problem ${item.problemId} must have provenance`)
  assert.ok(['original', 'inspired', 'licensed-adaptation'].includes(item.provenance.sourceType))
  assert.ok(['original', 'reference-only', 'licensed'].includes(item.provenance.rightsStatus))
})
console.log('  -> [PASS] 100 unique stable IDs and contiguous 1..100 catalogOrder verified')

// [Test 3] 10 Constellations Structure & Required Anchors
console.log('[Test 3] Validating 10 Constellations and Unlock Gating (Required Anchors + 6/8 Core)...')
assert.equal(CONSTELLATIONS.length, 10, 'Must have exactly 10 Constellations (0..9)')

// Constellation 0 is always unlocked
assert.equal(isConstellationUnlocked(0, []), true)

// Constellation 1 requires Constellation 0's 3 required anchors ('AC-EXP-SEQ-01', 'AC-EXP-LOOP-06', 'AC-CODE-FIRST-ERROR-01') and at least 6 core problems
const const0CoreProblems = ALGORITHM_EDITORIAL_CATALOG
  .filter((e) => e.constellationId === 'constellation-0' && e.routeRole === 'core')
  .map((e) => e.problemId)

const requiredAnchors = ['AC-EXP-SEQ-01', 'AC-EXP-LOOP-06', 'AC-CODE-FIRST-ERROR-01']

// If only 5 core problems completed -> NOT unlocked
assert.equal(isConstellationUnlocked(1, const0CoreProblems.slice(0, 5), ALGORITHM_EDITORIAL_CATALOG), false)
// If 6 core problems completed but LOOP anchor missing -> NOT unlocked
const sixCoreWithoutLoop = const0CoreProblems.filter((id) => id !== 'AC-EXP-LOOP-06').slice(0, 6)
assert.equal(isConstellationUnlocked(1, sixCoreWithoutLoop, ALGORITHM_EDITORIAL_CATALOG), false)
// If all 3 required anchors + 3 other core completed (6 total) -> UNLOCKED
const sixCoreWithAllAnchors = [
  ...requiredAnchors,
  ...const0CoreProblems.filter((id) => !requiredAnchors.includes(id)).slice(0, 3),
]
assert.equal(isConstellationUnlocked(1, sixCoreWithAllAnchors, ALGORITHM_EDITORIAL_CATALOG), true)

// Staged access: Constellation 0 is now gate-ready (8 core published >= 6, 3 anchors published)
const gatedConstellation1 = getConstellationAccess(1, [], ALGORITHM_EDITORIAL_CATALOG)
assert.equal(gatedConstellation1.accessible, false, 'Constellation 1 is now strictly gated since Constellation 0 has 8 published Core missions')
assert.equal(gatedConstellation1.mode, 'gated')

// Unlocked student gets access in gated mode
const unlockedAccess = getConstellationAccess(1, sixCoreWithAllAnchors, ALGORITHM_EDITORIAL_CATALOG)
assert.equal(unlockedAccess.accessible, true)
assert.equal(unlockedAccess.mode, 'gated')

// Grandfathered access: Student with existing progress in Constellation 1 stays accessible
const grandfatheredAccess = getConstellationAccess(1, ['AC-COND-001'], ALGORITHM_EDITORIAL_CATALOG)
assert.equal(grandfatheredAccess.accessible, true)
assert.equal(grandfatheredAccess.mode, 'grandfathered')

// Constellation 4 still has unachievable previous gate -> early-access
assert.equal(getConstellationAccess(4, [], ALGORITHM_EDITORIAL_CATALOG).mode, 'early-access')
// Constellation 9 is unavailable
assert.equal(getConstellationAccess(9, [], ALGORITHM_EDITORIAL_CATALOG).mode, 'unavailable')
console.log('  -> [PASS] Unlock Gating strictly verified (3 Required Anchors + 6/8 Core + Grandfathered Protection)')

// [Test 4] Python Concept Registry & Canonical First Encounter
console.log('[Test 4] Validating Python Concept Registry & First Encounter Schema...')
const requiredConcepts = ['operator:modulo', 'builtin:set', 'class:deque', 'builtin:range', 'syntax:slicing']
for (const cid of requiredConcepts) {
  const c = PYTHON_CONCEPT_REGISTRY[cid]
  assert.ok(c, `Missing required concept: ${cid}`)
  assert.ok(c.displayName)
  assert.ok(c.why)
  assert.ok(c.tinyExample)
  assert.ok(c.syntaxExample)
  assert.ok(c.predictionCheck)
  assert.ok(c.predictionCheck.expected)
}
for (const kernel of Object.values(PUBLIC_KERNELS)) {
  for (const conceptId of [
    ...(kernel.pythonConcepts?.requires || []),
    ...(kernel.pythonConcepts?.introduces || []),
  ]) {
    assert.ok(PYTHON_CONCEPT_REGISTRY[conceptId], `${kernel.id} references an unexplained Python concept: ${conceptId}`)
  }
}

const acceleratedPublishedIds = new Set([
  'AC-CODE-FIRST-ERROR-01',
  'AC-STR-REVERSE-01',
  'AC-SET-UNIQUE-01',
  'AC-SORT-MIN-01',
  'AC-ENUM-PAIR-01',
])
for (const entry of ALGORITHM_EDITORIAL_CATALOG.filter((item) => acceleratedPublishedIds.has(item.problemId))) {
  assert.equal(entry.status, 'published')
  assert.equal(entry.entrySupport, 'embedded-foundation')
  assert.ok(PUBLIC_KERNELS[entry.problemId], `${entry.problemId} needs a playable public kernel`)
  const concepts = PUBLIC_KERNELS[entry.problemId].pythonConcepts
  assert.ok((concepts?.requires?.length || 0) + (concepts?.introduces?.length || 0) > 0)
}
console.log('  -> [PASS] Python Concept Registry verified for all core tools')

// [Test 5] 8 Composable Evidence Primitives & Recipe Builder
console.log('[Test 5] Validating 8 Composable Evidence Primitives...')
const traceMock = [
  { runtimeStepIndex: 0, type: 'STATEMENT', line: 'total = 0', env: { total: 0 } },
  { runtimeStepIndex: 1, type: 'STATEMENT', line: 'total += 10', env: { total: 10 } },
  { runtimeStepIndex: 2, eventType: 'branch-decision', statementId: 'stmt_3', metadata: { condition: 'total > 0', result: true, selectedBranch: 'if' } },
]
const evidences = buildEvidenceFromTrace(
  { primitives: [EVIDENCE_PRIMITIVES.SCALAR_SEQUENCE, EVIDENCE_PRIMITIVES.DECISION] },
  traceMock,
  { passed: true }
)
assert.equal(evidences.length, 2)
assert.equal(evidences[0].primitive, EVIDENCE_PRIMITIVES.SCALAR_SEQUENCE)
assert.equal(evidences[1].primitive, EVIDENCE_PRIMITIVES.DECISION)
// [Test 6] Constellation 0 Branch Missions & Non-Gating Contract
console.log('[Test 6] Validating Constellation 0 Branch Missions (EQUIV-09, REVERSE-10)...')
const equivEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-EXP-EQUIV-09')
const reverseEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-EXP-REVERSE-10')
assert.equal(equivEntry.routeRole, 'branch')
assert.equal(reverseEntry.routeRole, 'branch')
assert.equal(equivEntry.learningRole, 'review')
assert.equal(reverseEntry.learningRole, 'review')

// Completing branches must NOT alter the Core 6/8 count for unlocking Constellation 1
const onlyBranchesCompleted = ['AC-EXP-EQUIV-09', 'AC-EXP-REVERSE-10']
assert.equal(isConstellationUnlocked(1, onlyBranchesCompleted, ALGORITHM_EDITORIAL_CATALOG), false)
// Completing 5 core + 2 branches (7 total, but only 5 core) -> still NOT unlocked
const fiveCorePlusBranches = [...const0CoreProblems.slice(0, 5), ...onlyBranchesCompleted]
assert.equal(isConstellationUnlocked(1, fiveCorePlusBranches, ALGORITHM_EDITORIAL_CATALOG), false)
console.log('  -> [PASS] Branch missions validated and confirmed excluded from Core 6/8 gate requirement')

// [Test 7] Generic Mission Prerequisite Locking Contract
console.log('[Test 7] Validating Generic Mission Prerequisite Locking...')
const { getMissingPrerequisites, isMissionPrerequisitesMet } = await import(
  '../src/components/AlgorithmConstellation/shared/catalog/constellationRegistry.js'
)

// EQUIV-09 requires STEP-03, BOUND-05, ERROR-01
assert.deepEqual(
  getMissingPrerequisites('AC-EXP-EQUIV-09', [], ALGORITHM_EDITORIAL_CATALOG),
  ['AC-EXP-STEP-03', 'AC-EXP-BOUND-05', 'AC-CODE-FIRST-ERROR-01']
)
assert.equal(isMissionPrerequisitesMet('AC-EXP-EQUIV-09', [], ALGORITHM_EDITORIAL_CATALOG), false)

// Partial completion -> still locked
assert.equal(
  isMissionPrerequisitesMet('AC-EXP-EQUIV-09', ['AC-EXP-STEP-03', 'AC-EXP-BOUND-05'], ALGORITHM_EDITORIAL_CATALOG),
  false
)

// Full prerequisite completion -> unlocked
assert.equal(
  isMissionPrerequisitesMet(
    'AC-EXP-EQUIV-09',
    ['AC-EXP-STEP-03', 'AC-EXP-BOUND-05', 'AC-CODE-FIRST-ERROR-01'],
    ALGORITHM_EDITORIAL_CATALOG
  ),
  true
)

// REVERSE-10 requires VAR-02, STEP-03
assert.equal(isMissionPrerequisitesMet('AC-EXP-REVERSE-10', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(
  isMissionPrerequisitesMet('AC-EXP-REVERSE-10', ['AC-EXP-VAR-02', 'AC-EXP-STEP-03'], ALGORITHM_EDITORIAL_CATALOG),
  true
)

// Existing completion remains playable if prerequisite policy changes later.
assert.deepEqual(
  getMissingPrerequisites('AC-EXP-EQUIV-09', ['AC-EXP-EQUIV-09'], ALGORITHM_EDITORIAL_CATALOG),
  []
)

// Verify no circular or mutual prerequisites between EQUIV-09 and REVERSE-10
assert.equal(equivEntry.prerequisites.includes('AC-EXP-REVERSE-10'), false)
assert.equal(reverseEntry.prerequisites.includes('AC-EXP-EQUIV-09'), false)
console.log('  -> [PASS] Generic Prerequisite Locking strictly verified across missions')

// [Test 8] Constellation 1 Core Missions (NOT-13, ELIF-14, RANGE-15) Contract
console.log('[Test 8] Validating Constellation 1 Core Missions (NOT-13, ELIF-14, RANGE-15)...')
const notEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-NOT-13')
const elifEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-ELIF-14')
const rangeEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-RANGE-15')

assert.equal(notEntry.routeRole, 'core')
assert.equal(elifEntry.routeRole, 'core')
assert.equal(rangeEntry.routeRole, 'core')
assert.equal(rangeEntry.learningRole, 'anchor')

assert.deepEqual(notEntry.prerequisites, ['AC-COND-001'])
assert.deepEqual(elifEntry.prerequisites, ['AC-COND-001', 'AC-EXP-BOUND-05'])
assert.deepEqual(rangeEntry.prerequisites, ['AC-COND-002', 'AC-COND-ELIF-14'])

// Student without BOUND-05 cannot open ELIF-14 or RANGE-15
assert.equal(isMissionPrerequisitesMet('AC-COND-ELIF-14', ['AC-COND-001'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-COND-ELIF-14', ['AC-COND-001', 'AC-EXP-BOUND-05'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-COND-RANGE-15', ['AC-COND-002'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-COND-RANGE-15', ['AC-COND-002', 'AC-COND-ELIF-14'], ALGORITHM_EDITORIAL_CATALOG), true)
console.log('  -> [PASS] Constellation 1 Core Missions 13~15 prerequisites and roles verified')

// [Test 9] Constellation 1 Core Missions (CLAMP-16, GRADE-17, COMPLEX-18) Contract
console.log('[Test 9] Validating Constellation 1 Core Missions (CLAMP-16, GRADE-17, COMPLEX-18)...')
const clampEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-CLAMP-16')
const gradeEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-GRADE-17')
const complexEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-COMPLEX-18')

assert.equal(clampEntry.routeRole, 'core')
assert.equal(gradeEntry.routeRole, 'core')
assert.equal(complexEntry.routeRole, 'core')

assert.deepEqual(clampEntry.prerequisites, ['AC-COND-RANGE-15'])
assert.deepEqual(gradeEntry.prerequisites, ['AC-COND-ELIF-14'])
assert.deepEqual(complexEntry.prerequisites, ['AC-COND-002', 'AC-COND-NOT-13'])

assert.equal(isMissionPrerequisitesMet('AC-COND-CLAMP-16', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-COND-CLAMP-16', ['AC-COND-RANGE-15'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-COND-GRADE-17', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-COND-GRADE-17', ['AC-COND-ELIF-14'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-COND-COMPLEX-18', ['AC-COND-002'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-COND-COMPLEX-18', ['AC-COND-002', 'AC-COND-NOT-13'], ALGORITHM_EDITORIAL_CATALOG), true)
console.log('  -> [PASS] Constellation 1 Core Missions 16~18 prerequisites and roles verified')

// [Test 10] Constellation 1 Branch Missions (TOGGLE-19, ORDER-20) Contract & Gate Isolation
console.log('[Test 10] Validating Constellation 1 Branch Missions (TOGGLE-19, ORDER-20)...')
const toggleEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-TOGGLE-19')
const orderEntry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === 'AC-COND-ORDER-20')

assert.equal(toggleEntry.routeRole, 'branch')
assert.equal(toggleEntry.learningRole, 'review')
assert.equal(orderEntry.routeRole, 'branch')
assert.equal(orderEntry.learningRole, 'review')

assert.deepEqual(toggleEntry.prerequisites, [
  'AC-EXP-LOOP-06',
  'AC-CODE-FIRST-ERROR-01',
  'AC-COND-NOT-13',
])
assert.deepEqual(orderEntry.prerequisites, ['AC-COND-GRADE-17'])

assert.equal(isMissionPrerequisitesMet('AC-COND-TOGGLE-19', ['AC-COND-NOT-13'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(
  isMissionPrerequisitesMet(
    'AC-COND-TOGGLE-19',
    ['AC-EXP-LOOP-06', 'AC-CODE-FIRST-ERROR-01', 'AC-COND-NOT-13'],
    ALGORITHM_EDITORIAL_CATALOG
  ),
  true
)

assert.equal(isMissionPrerequisitesMet('AC-COND-ORDER-20', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-COND-ORDER-20', ['AC-COND-GRADE-17'], ALGORITHM_EDITORIAL_CATALOG), true)

// Verify Branch missions do not affect Constellation 2 Unlock Gating
const c1CoreProblemIds = ALGORITHM_EDITORIAL_CATALOG
  .filter((e) => e.constellationId === 'constellation-1' && e.routeRole === 'core')
  .map((e) => e.problemId)
assert.equal(c1CoreProblemIds.length, 8, 'Constellation 1 must have exactly 8 Core missions')
assert.ok(!c1CoreProblemIds.includes('AC-COND-TOGGLE-19'), 'TOGGLE-19 must not be in C1 core problem list')
assert.ok(!c1CoreProblemIds.includes('AC-COND-ORDER-20'), 'ORDER-20 must not be in C1 core problem list')

const c1BranchProblemIds = ['AC-COND-TOGGLE-19', 'AC-COND-ORDER-20']
const c1RequiredAnchors = CONSTELLATIONS[1].requiredAnchors
const c1NonAnchorCoreIds = c1CoreProblemIds.filter((id) => !c1RequiredAnchors.includes(id))
const fiveCoreWithAnchorsAndBranches = [
  ...c1RequiredAnchors,
  ...c1NonAnchorCoreIds.slice(0, 5 - c1RequiredAnchors.length),
  ...c1BranchProblemIds,
]
assert.equal(
  isConstellationUnlocked(2, fiveCoreWithAnchorsAndBranches, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Five C1 Core plus both Branch missions must not unlock Constellation 2'
)
const sixCoreWithAnchorsAndBranches = [
  ...c1RequiredAnchors,
  ...c1NonAnchorCoreIds.slice(0, 6 - c1RequiredAnchors.length),
  ...c1BranchProblemIds,
]
assert.equal(
  isConstellationUnlocked(2, sixCoreWithAnchorsAndBranches, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'C1 Branch completion must not block an otherwise valid six-Core unlock'
)

console.log('  -> [PASS] Constellation 1 Branch Missions 19~20 prerequisites and gate isolation verified')

console.log('\n=== Gate 0 Curriculum & Contract Tests Passed 100%! ===\n')
