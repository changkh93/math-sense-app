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

// Constellation 2 is now gate-ready (8 core published >= 6, anchor AC-PAT-003 published)
const const2CoreProblems = ALGORITHM_EDITORIAL_CATALOG
  .filter((e) => e.constellationId === 'constellation-2' && e.routeRole === 'core')
  .map((e) => e.problemId)

// Constellation 3 is now strictly gated
const gatedConstellation3 = getConstellationAccess(3, [], ALGORITHM_EDITORIAL_CATALOG)
assert.equal(gatedConstellation3.accessible, false, 'Constellation 3 is now strictly gated since Constellation 2 has 8 published Core missions')
assert.equal(gatedConstellation3.mode, 'gated')

// If 5 core completed -> NOT unlocked
assert.equal(isConstellationUnlocked(3, const2CoreProblems.slice(0, 5), ALGORITHM_EDITORIAL_CATALOG), false)
// If 6 core completed without anchor AC-PAT-003 -> NOT unlocked
const sixCoreWithoutPat003 = const2CoreProblems.filter((id) => id !== 'AC-PAT-003').slice(0, 6)
assert.equal(isConstellationUnlocked(3, sixCoreWithoutPat003, ALGORITHM_EDITORIAL_CATALOG), false)
// If anchor AC-PAT-003 + 5 other core (6 total) -> UNLOCKED
const sixCoreWithAnchor = ['AC-PAT-003', ...const2CoreProblems.filter((id) => id !== 'AC-PAT-003').slice(0, 5)]
assert.equal(isConstellationUnlocked(3, sixCoreWithAnchor, ALGORITHM_EDITORIAL_CATALOG), true)

// Grandfathered access for Constellation 3 (e.g. AC-SEQ-005)
const grandfatheredConst3 = getConstellationAccess(3, ['AC-SEQ-005'], ALGORITHM_EDITORIAL_CATALOG)
assert.equal(grandfatheredConst3.accessible, true)
assert.equal(grandfatheredConst3.mode, 'grandfathered')

// Constellation 4 previous gate (Constellation 3) is now fully ready -> gated
assert.equal(getConstellationAccess(4, [], ALGORITHM_EDITORIAL_CATALOG).mode, 'gated')
assert.equal(getConstellationAccess(4, [], ALGORITHM_EDITORIAL_CATALOG).accessible, false)
// Constellation 9 previous gate (Constellation 8) is now fully ready and C9 is published -> gated
assert.equal(getConstellationAccess(9, [], ALGORITHM_EDITORIAL_CATALOG).mode, 'gated')
assert.equal(getConstellationAccess(9, [], ALGORITHM_EDITORIAL_CATALOG).accessible, false)

// A fresh student, including one who just completed #3, must not skip to C8.
const firstThreeCompleted = ['AC-EXP-SEQ-01', 'AC-EXP-VAR-02', 'AC-EXP-STEP-03']
for (const completed of [[], firstThreeCompleted]) {
  assert.equal(getConstellationAccess(0, completed, ALGORITHM_EDITORIAL_CATALOG).accessible, true)
  for (const constellation of CONSTELLATIONS.slice(1)) {
    assert.equal(
      getConstellationAccess(constellation.number, completed, ALGORITHM_EDITORIAL_CATALOG).accessible,
      false,
      `Completing only the first three missions must not open ${constellation.id}`,
    )
  }
}

// If C7's release is incomplete (missing anchor 71), C8 stays unavailable:
const missingC7AnchorCatalog = ALGORITHM_EDITORIAL_CATALOG.map((entry) => (
  entry.problemId === 'AC-STACK-BOX-71' ? { ...entry, status: 'draft' } : entry
))
const incompleteReleaseAccess = getConstellationAccess(8, firstThreeCompleted, missingC7AnchorCatalog)
assert.equal(incompleteReleaseAccess.accessible, false)
assert.equal(incompleteReleaseAccess.mode, 'unavailable')
assert.equal(incompleteReleaseAccess.reason, 'previous-release-incomplete')

// With C7 fully published, C8 is gated (not unavailable):
for (const completed of [firstThreeCompleted, ['AC-NAV-005']]) {
  const access = getConstellationAccess(8, completed, ALGORITHM_EDITORIAL_CATALOG)
  assert.equal(access.accessible, false)
  assert.equal(access.mode, 'gated')
}

assert.equal(getConstellationAccess(8, ['AC-NAV-006'], ALGORITHM_EDITORIAL_CATALOG).mode, 'grandfathered')
assert.equal(getConstellationAccess(8, ['AC-NAV-006'], ALGORITHM_EDITORIAL_CATALOG).accessible, true)

// Once C7 is published, C8 opens through the normal six-Core + anchor gate.
const releasedC7Catalog = ALGORITHM_EDITORIAL_CATALOG.map((entry) => (
  entry.constellationId === 'constellation-7' ? { ...entry, status: 'published' } : entry
))
const test3C7CoreIds = releasedC7Catalog
  .filter((entry) => entry.constellationId === 'constellation-7' && entry.routeRole === 'core')
  .map((entry) => entry.problemId)
const c7SixWithAnchor = ['AC-STACK-BOX-71', 'AC-NAV-005', ...test3C7CoreIds.filter((id) => id !== 'AC-STACK-BOX-71' && id !== 'AC-NAV-005').slice(0, 4)]
assert.equal(getConstellationAccess(8, c7SixWithAnchor, releasedC7Catalog).accessible, true)
assert.equal(getConstellationAccess(8, c7SixWithAnchor, releasedC7Catalog).mode, 'gated')
assert.equal(getConstellationAccess(8, c7SixWithAnchor.slice(0, 5), releasedC7Catalog).accessible, false)
assert.equal(getConstellationAccess(8, test3C7CoreIds.filter((id) => id !== 'AC-NAV-005'), releasedC7Catalog).accessible, false)
assert.equal(getConstellationAccess(8, test3C7CoreIds.filter((id) => id !== 'AC-STACK-BOX-71'), releasedC7Catalog).accessible, false)
const missingC7NavAnchorCatalog = releasedC7Catalog.map((entry) => (
  entry.problemId === 'AC-NAV-005' ? { ...entry, status: 'draft' } : entry
))
assert.equal(getConstellationAccess(8, c7SixWithAnchor, missingC7NavAnchorCatalog).accessible, false)
console.log('  -> [PASS] Unlock Gating strictly verified (Required Anchors + 6/8 Core + Grandfathered Protection)')

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

// [Test 11] Constellation 2 C2-A and C2-B curriculum contract
console.log('[Test 11] Validating Constellation 2 C2-A and C2-B missions and staged gate...')
const c2PublishedCore = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-2' && entry.routeRole === 'core' && entry.status === 'published'
)
assert.deepEqual(
  c2PublishedCore.map((entry) => entry.problemId),
  [
    'AC-PAT-003',
    'AC-PAT-004',
    'AC-PAT-EVEN-23',
    'AC-PAT-DIGIT-24',
    'AC-PAT-REVNUM-25',
    'AC-PAT-DIVISOR-26',
    'AC-PAT-PRIME-27',
    'AC-PAT-GCD-28',
  ]
)

assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-EVEN-23').prerequisites,
  ['AC-PAT-003']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-DIGIT-24').prerequisites,
  ['AC-PAT-003', 'AC-CODE-FIRST-ERROR-01']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-REVNUM-25').prerequisites,
  ['AC-PAT-DIGIT-24', 'AC-EXP-WHILE-07']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-DIVISOR-26').prerequisites,
  ['AC-PAT-003', 'AC-EXP-LOOP-06', 'AC-CODE-FIRST-ERROR-01']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-PRIME-27').prerequisites,
  ['AC-PAT-DIVISOR-26', 'AC-EXP-BOUND-05']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-GCD-28').prerequisites,
  ['AC-PAT-DIVISOR-26', 'AC-EXP-WHILE-07', 'AC-PAT-DIGIT-24', 'AC-EXP-SWAP-04']
)

assert.equal(
  isMissionPrerequisitesMet('AC-PAT-REVNUM-25', ['AC-PAT-DIGIT-24'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet(
    'AC-PAT-REVNUM-25',
    ['AC-PAT-DIGIT-24', 'AC-EXP-WHILE-07'],
    ALGORITHM_EDITORIAL_CATALOG
  ),
  true
)
assert.equal(
  isMissionPrerequisitesMet('AC-PAT-DIVISOR-26', ['AC-PAT-003'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet(
    'AC-PAT-DIVISOR-26',
    ['AC-PAT-003', 'AC-EXP-LOOP-06', 'AC-CODE-FIRST-ERROR-01'],
    ALGORITHM_EDITORIAL_CATALOG
  ),
  true
)
assert.equal(
  isMissionPrerequisitesMet('AC-PAT-GCD-28', ['AC-PAT-DIVISOR-26', 'AC-EXP-WHILE-07'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet(
    'AC-PAT-GCD-28',
    ['AC-PAT-DIVISOR-26', 'AC-EXP-WHILE-07', 'AC-PAT-DIGIT-24', 'AC-EXP-SWAP-04'],
    ALGORITHM_EDITORIAL_CATALOG
  ),
  true
)

assert.equal(
  getConstellationAccess(3, [], ALGORITHM_EDITORIAL_CATALOG).mode,
  'gated',
  'Constellation 3 must be strictly gated now that Constellation 2 has 8 Core missions published'
)
console.log('  -> [PASS] C2-A and C2-B prerequisites and strict 6/8 gate verified')

// [Test 12] Constellation 2 Branch Missions (CALENDAR-29, PRIME-REV-30)
console.log('[Test 12] Validating Constellation 2 Branch Missions (CALENDAR-29, PRIME-REV-30)...')
const c2BranchProblemIds = ['AC-PAT-CALENDAR-29', 'AC-PAT-PRIME-REV-30']
for (const branchId of c2BranchProblemIds) {
  const entry = ALGORITHM_EDITORIAL_CATALOG.find((e) => e.problemId === branchId)
  assert.ok(entry, `Missing catalog entry for ${branchId}`)
  assert.equal(entry.routeRole, 'branch', `${branchId} must have routeRole: branch`)
  assert.equal(entry.status, 'published', `${branchId} must have status: published`)
}

assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-CALENDAR-29').prerequisites,
  ['AC-PAT-003']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-PAT-PRIME-REV-30').prerequisites,
  ['AC-PAT-PRIME-27', 'AC-CODE-FIRST-ERROR-01']
)

assert.equal(
  isMissionPrerequisitesMet('AC-PAT-CALENDAR-29', [], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet('AC-PAT-CALENDAR-29', ['AC-PAT-003'], ALGORITHM_EDITORIAL_CATALOG),
  true
)
assert.equal(
  isMissionPrerequisitesMet('AC-PAT-PRIME-REV-30', ['AC-PAT-PRIME-27'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet(
    'AC-PAT-PRIME-REV-30',
    ['AC-PAT-PRIME-27', 'AC-CODE-FIRST-ERROR-01'],
    ALGORITHM_EDITORIAL_CATALOG
  ),
  true
)

// Branch completions do NOT affect the minimum core unlock requirement
const sixCoreWithoutBranches = [
  'AC-PAT-003',
  'AC-PAT-004',
  'AC-PAT-EVEN-23',
  'AC-PAT-DIGIT-24',
  'AC-PAT-REVNUM-25',
  'AC-PAT-DIVISOR-26',
]
const sixCoreWithBranches = [
  ...sixCoreWithoutBranches,
  ...c2BranchProblemIds,
]
const fiveCoreWithBranches = [
  ...sixCoreWithoutBranches.slice(0, 5),
  ...c2BranchProblemIds,
]
assert.equal(
  isConstellationUnlocked(3, fiveCoreWithBranches, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'C2 Branch completions must not substitute for a missing sixth Core mission'
)
assert.equal(
  isConstellationUnlocked(3, sixCoreWithBranches, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'C2 Branch completion must not block an otherwise valid six-Core unlock'
)
console.log('  -> [PASS] Constellation 2 Branch Missions 29~30 prerequisites and gate isolation verified')

// [Test 13] Constellation 3 (31~38) Curriculum & Full Core Gate Contracts
console.log('[Test 13] Validating Constellation 3 (31~38) missions and full Core unlock gate...')
const c3Published = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-3' && entry.routeRole === 'core' && entry.status === 'published'
)
assert.deepEqual(
  c3Published.map((entry) => entry.problemId),
  [
    'AC-SEQ-005',
    'AC-SEQ-MINMAX-32',
    'AC-SEQ-COUNT-33',
    'AC-SEQ-ADJACENT-34',
    'AC-SEQ-RUNNING-35',
    'AC-STR-REVERSE-01',
    'AC-STR-PALIN-37',
    'AC-SEQ-ROTATE-38',
  ]
)

// Prerequisites check
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SEQ-005').prerequisites,
  ['AC-CODE-FIRST-ERROR-01', 'AC-EXP-LOOP-06', 'AC-COND-ELIF-14']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SEQ-MINMAX-32').prerequisites,
  ['AC-SEQ-005', 'AC-EXP-BOUND-05']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SEQ-COUNT-33').prerequisites,
  ['AC-SEQ-005', 'AC-COND-RANGE-15']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SEQ-ADJACENT-34').prerequisites,
  ['AC-SEQ-MINMAX-32', 'AC-EXP-SWAP-04']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SEQ-RUNNING-35').prerequisites,
  ['AC-SEQ-005']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-STR-REVERSE-01').prerequisites,
  ['AC-SEQ-005']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-STR-PALIN-37').prerequisites,
  ['AC-STR-REVERSE-01']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SEQ-ROTATE-38').prerequisites,
  ['AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01']
)

// Mission prerequisite locking
assert.equal(
  isMissionPrerequisitesMet('AC-SEQ-RUNNING-35', [], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet('AC-SEQ-RUNNING-35', ['AC-SEQ-005'], ALGORITHM_EDITORIAL_CATALOG),
  true
)
assert.equal(
  isMissionPrerequisitesMet('AC-STR-PALIN-37', [], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet('AC-STR-PALIN-37', ['AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG),
  true
)
assert.equal(
  isMissionPrerequisitesMet('AC-SEQ-ROTATE-38', ['AC-SEQ-RUNNING-35'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet('AC-SEQ-ROTATE-38', ['AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet('AC-SEQ-ROTATE-38', ['AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG),
  true
)

// Constellation 4 unlock tests: Required Anchors (31 and 36) + at least 6 of 8 Core missions
const c3CoreMissions = [
  'AC-SEQ-005',
  'AC-SEQ-MINMAX-32',
  'AC-SEQ-COUNT-33',
  'AC-SEQ-ADJACENT-34',
  'AC-SEQ-RUNNING-35',
  'AC-STR-REVERSE-01',
  'AC-STR-PALIN-37',
  'AC-SEQ-ROTATE-38',
]

// 5 Core with both anchors -> locked
const fiveCoreWithBothAnchors = [
  'AC-SEQ-005',
  'AC-STR-REVERSE-01',
  'AC-SEQ-MINMAX-32',
  'AC-SEQ-COUNT-33',
  'AC-SEQ-ADJACENT-34',
]
assert.equal(
  isConstellationUnlocked(4, fiveCoreWithBothAnchors, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 4 must be locked when fewer than 6 Core missions are completed'
)

// 6 Core missing Anchor 31 -> locked
const sixCoreMissingAnchor31 = [
  'AC-SEQ-MINMAX-32',
  'AC-SEQ-COUNT-33',
  'AC-SEQ-ADJACENT-34',
  'AC-SEQ-RUNNING-35',
  'AC-STR-REVERSE-01',
  'AC-STR-PALIN-37',
]
assert.equal(
  isConstellationUnlocked(4, sixCoreMissingAnchor31, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 4 must be locked if required Anchor AC-SEQ-005 is missing'
)

// 6 Core missing Anchor 36 (replace index 5 with index 6) -> locked if 36 is missing
const sixCoreMissingAnchor36 = [
  'AC-SEQ-005',
  'AC-SEQ-MINMAX-32',
  'AC-SEQ-COUNT-33',
  'AC-SEQ-ADJACENT-34',
  'AC-SEQ-RUNNING-35',
  'AC-STR-PALIN-37', // 37 instead of 36
]
assert.equal(
  isConstellationUnlocked(4, sixCoreMissingAnchor36, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 4 must be locked if required Anchor AC-STR-REVERSE-01 is missing'
)

// 6 Core with both anchors (31 and 36) -> unlocked
const sixCoreWithBothAnchors = [
  'AC-SEQ-005',
  'AC-SEQ-MINMAX-32',
  'AC-SEQ-COUNT-33',
  'AC-SEQ-ADJACENT-34',
  'AC-SEQ-RUNNING-35',
  'AC-STR-REVERSE-01',
]
assert.equal(
  isConstellationUnlocked(4, sixCoreWithBothAnchors, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 4 must unlock when both required Anchors (31 and 36) and 6 Core missions are completed'
)

console.log('  -> [PASS] Constellation 3 (31~38) prerequisites and Constellation 4 full Core unlock gate verified')

// [Test 14] Constellation 3 Branch Missions (39·40) Curriculum & Gate Isolation Contracts
console.log('[Test 14] Validating Constellation 3 Branch Missions (39·40) and gate isolation...')
const c3AllPublished = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-3' && entry.status === 'published'
)
assert.deepEqual(
  c3AllPublished.map((entry) => entry.problemId),
  [
    'AC-SEQ-005',
    'AC-SEQ-MINMAX-32',
    'AC-SEQ-COUNT-33',
    'AC-SEQ-ADJACENT-34',
    'AC-SEQ-RUNNING-35',
    'AC-STR-REVERSE-01',
    'AC-STR-PALIN-37',
    'AC-SEQ-ROTATE-38',
    'AC-STR-COMPRESS-39',
    'AC-STR-PATTERN-40',
  ],
  'Constellation 3 must have all 10 (8 Core + 2 Branch) problems published'
)

// Branch prerequisites check
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-STR-COMPRESS-39').prerequisites,
  ['AC-SEQ-ADJACENT-34', 'AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-STR-PATTERN-40').prerequisites,
  ['AC-SEQ-COUNT-33', 'AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01']
)

// Mission prerequisite locking for Branch 39 & 40
assert.equal(
  isMissionPrerequisitesMet('AC-STR-COMPRESS-39', ['AC-SEQ-ADJACENT-34', 'AC-SEQ-RUNNING-35'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet('AC-STR-COMPRESS-39', ['AC-SEQ-ADJACENT-34', 'AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG),
  true
)
assert.equal(
  isMissionPrerequisitesMet('AC-STR-PATTERN-40', ['AC-SEQ-COUNT-33', 'AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG),
  false
)
assert.equal(
  isMissionPrerequisitesMet('AC-STR-PATTERN-40', ['AC-SEQ-COUNT-33', 'AC-SEQ-RUNNING-35', 'AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG),
  true
)

// Branch completion isolation: completing Branch 39 and 40 must NOT contribute to Core 6/8 unlock gate
const c3FiveCoreWithBranches = [
  'AC-SEQ-005',
  'AC-STR-REVERSE-01',
  'AC-SEQ-MINMAX-32',
  'AC-SEQ-COUNT-33',
  'AC-SEQ-ADJACENT-34',
  'AC-STR-COMPRESS-39', // Branch
  'AC-STR-PATTERN-40',  // Branch
]
assert.equal(
  isConstellationUnlocked(4, c3FiveCoreWithBranches, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Completing Branch missions must NOT bypass the Core 6/8 unlock requirement for Constellation 4'
)

const c3SixCoreWithBranches = [
  'AC-SEQ-005',
  'AC-STR-REVERSE-01',
  'AC-SEQ-MINMAX-32',
  'AC-SEQ-COUNT-33',
  'AC-SEQ-ADJACENT-34',
  'AC-SEQ-RUNNING-35',
  'AC-STR-COMPRESS-39', // Branch
  'AC-STR-PATTERN-40',  // Branch
]
assert.equal(
  isConstellationUnlocked(4, c3SixCoreWithBranches, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Completing 6 Core missions with required anchors must unlock Constellation 4 regardless of Branch state'
)

console.log('  -> [PASS] Constellation 3 Branch Missions (39·40) prerequisites and gate isolation verified')

// [Test 15] Constellation 4 Set & Dictionary Foundations (41~48) Curriculum & Gate Contracts
console.log('[Test 15] Validating Constellation 4 Set & Dictionary Foundations (41~48) and gate isolation...')
const c4Published = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-4' && entry.status === 'published'
)
assert.deepEqual(
  c4Published.map((entry) => entry.problemId),
  [
    'AC-SET-UNIQUE-01',
    'AC-SET-MEMBERSHIP-42',
    'AC-SET-INTERSECT-43',
    'AC-DICT-FREQ-44',
    'AC-DICT-MODE-45',
    'AC-DICT-STOCK-46',
    'AC-DICT-TWOSUM-47',
    'AC-DICT-ONESHOT-48',
    'AC-DICT-ANAGRAM-49',
    'AC-DICT-BUG-50',
  ],
  'Constellation 4 must be complete: 8 published Core problems (41~48) + 2 published Branch problems (49~50)'
)

// Prerequisites checks
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SET-UNIQUE-01').prerequisites,
  ['AC-SEQ-005']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SET-MEMBERSHIP-42').prerequisites,
  ['AC-SET-UNIQUE-01']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-SET-INTERSECT-43').prerequisites,
  ['AC-SET-MEMBERSHIP-42']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-DICT-FREQ-44').prerequisites,
  ['AC-SET-MEMBERSHIP-42']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-DICT-MODE-45').prerequisites,
  ['AC-DICT-FREQ-44']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-DICT-STOCK-46').prerequisites,
  ['AC-DICT-FREQ-44']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-DICT-TWOSUM-47').prerequisites,
  ['AC-DICT-STOCK-46', 'AC-STR-REVERSE-01']
)
assert.deepEqual(
  ALGORITHM_EDITORIAL_CATALOG.find((entry) => entry.problemId === 'AC-DICT-ONESHOT-48').prerequisites,
  ['AC-DICT-TWOSUM-47', 'AC-SET-INTERSECT-43']
)

// Mission prerequisite locking for 42 ~ 48
assert.equal(isMissionPrerequisitesMet('AC-SET-MEMBERSHIP-42', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-SET-MEMBERSHIP-42', ['AC-SET-UNIQUE-01'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-SET-INTERSECT-43', ['AC-SET-UNIQUE-01'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-SET-INTERSECT-43', ['AC-SET-MEMBERSHIP-42'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-DICT-FREQ-44', ['AC-SET-UNIQUE-01'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DICT-FREQ-44', ['AC-SET-MEMBERSHIP-42'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-DICT-MODE-45', ['AC-SET-MEMBERSHIP-42'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DICT-MODE-45', ['AC-DICT-FREQ-44'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-DICT-STOCK-46', ['AC-SET-MEMBERSHIP-42'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DICT-STOCK-46', ['AC-DICT-FREQ-44'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-DICT-TWOSUM-47', ['AC-DICT-STOCK-46'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DICT-TWOSUM-47', ['AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DICT-TWOSUM-47', ['AC-DICT-STOCK-46', 'AC-STR-REVERSE-01'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-DICT-ONESHOT-48', ['AC-DICT-TWOSUM-47'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DICT-ONESHOT-48', ['AC-SET-INTERSECT-43'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DICT-ONESHOT-48', ['AC-DICT-TWOSUM-47', 'AC-SET-INTERSECT-43'], ALGORITHM_EDITORIAL_CATALOG), true)

// Constellation 5 unlock gating:
// 1. Core 5/8 completed (41~45) -> Constellation 5 remains locked
const c4FiveCore = [
  'AC-SET-UNIQUE-01',
  'AC-SET-MEMBERSHIP-42',
  'AC-SET-INTERSECT-43',
  'AC-DICT-FREQ-44',
  'AC-DICT-MODE-45',
]
assert.equal(
  isConstellationUnlocked(5, c4FiveCore, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 5 must remain locked when only 5 Core missions of Constellation 4 are completed'
)

// 2. Core 6/8 completed (41~46) + Required Anchor 41 -> Constellation 5 unlocked (grandfathered progression preserved)!
const c4SixCore = [
  'AC-SET-UNIQUE-01',
  'AC-SET-MEMBERSHIP-42',
  'AC-SET-INTERSECT-43',
  'AC-DICT-FREQ-44',
  'AC-DICT-MODE-45',
  'AC-DICT-STOCK-46',
]
assert.equal(
  isConstellationUnlocked(5, c4SixCore, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 5 must unlock when 6 Core missions of Constellation 4 are completed including required anchor 41'
)

// 3. Full Core 8/8 completed (41~48) + Required Anchor 41 -> Constellation 5 remains unlocked
const c4EightCore = [
  ...c4SixCore,
  'AC-DICT-TWOSUM-47',
  'AC-DICT-ONESHOT-48',
]
assert.equal(
  isConstellationUnlocked(5, c4EightCore, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 5 must remain unlocked when all 8 Core missions of Constellation 4 are completed'
)

console.log('  -> [PASS] Constellation 4 (41~48) Set & Dictionary prerequisites and Core 8/8 unlock verified')

// [Test 16] Constellation 4 Branch Missions (49·50) Curriculum & Gate Isolation Contracts
console.log('[Test 16] Validating Constellation 4 Branch Missions (49·50) and gate isolation...')
const c4PublishedCores = c4Published.filter((entry) => entry.routeRole === 'core')
const c4PublishedBranches = c4Published.filter((entry) => entry.routeRole === 'branch')
assert.equal(c4PublishedCores.length, 8, 'Constellation 4 must keep exactly 8 published Core problems (41~48)')
assert.equal(c4PublishedBranches.length, 2, 'Constellation 4 must have exactly 2 published Branch problems (49~50)')
assert.deepEqual(
  c4PublishedBranches.map((entry) => entry.problemId),
  ['AC-DICT-ANAGRAM-49', 'AC-DICT-BUG-50'],
  'Constellation 4 Branch missions must be exactly 49 and 50'
)
for (const branch of c4PublishedBranches) {
  assert.equal(branch.lensId, 'state-transition', 'Branch 49·50 must reuse the existing state-transition lens')
  assert.equal(branch.learningRole, 'review', 'Branch 49·50 must be review missions')
  assert.deepEqual(
    PUBLIC_KERNELS[branch.problemId].curriculum.prerequisites,
    branch.prerequisites,
    'Branch kernel and catalog prerequisites must stay synchronized'
  )
}

// Branch 49: locked until 44 is complete.
assert.equal(isMissionPrerequisitesMet('AC-DICT-ANAGRAM-49', [], ALGORITHM_EDITORIAL_CATALOG), false, '49 must be locked with no prerequisites completed')
assert.equal(isMissionPrerequisitesMet('AC-DICT-ANAGRAM-49', ['AC-DICT-FREQ-44'], ALGORITHM_EDITORIAL_CATALOG), true, '49 must unlock once 44 is complete')

// Branch 50: locked until BOTH 44 and AC-CODE-FIRST-ERROR-01 are complete.
assert.equal(isMissionPrerequisitesMet('AC-DICT-BUG-50', [], ALGORITHM_EDITORIAL_CATALOG), false, '50 must be locked with no prerequisites completed')
assert.equal(isMissionPrerequisitesMet('AC-DICT-BUG-50', ['AC-DICT-FREQ-44'], ALGORITHM_EDITORIAL_CATALOG), false, '50 must stay locked without AC-CODE-FIRST-ERROR-01')
assert.equal(isMissionPrerequisitesMet('AC-DICT-BUG-50', ['AC-CODE-FIRST-ERROR-01'], ALGORITHM_EDITORIAL_CATALOG), false, '50 must stay locked without 44')
assert.equal(
  isMissionPrerequisitesMet('AC-DICT-BUG-50', ['AC-DICT-FREQ-44', 'AC-CODE-FIRST-ERROR-01'], ALGORITHM_EDITORIAL_CATALOG),
  true,
  '50 must unlock once both prerequisites are complete'
)

// Branch completion never gates Constellation 5: getConstellationAccess /
// isConstellationUnlocked aggregate only previous-constellation Core missions
// (routeRole === 'core'). Branch completions neither substitute for nor block
// the 6-Core requirement.
const c4FiveCorePlusBranches = [...c4FiveCore, 'AC-DICT-ANAGRAM-49', 'AC-DICT-BUG-50']
assert.equal(
  isConstellationUnlocked(5, c4FiveCorePlusBranches, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Branch 49·50 completions must not substitute for the 6-Core unlock requirement of Constellation 5'
)
assert.equal(
  isConstellationUnlocked(5, [...c4EightCore, 'AC-DICT-ANAGRAM-49', 'AC-DICT-BUG-50'], ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 5 must stay unlocked when Branch 49·50 complete after the Core requirement is met'
)
const c4AccessBranchesOnly = getConstellationAccess(5, ['AC-DICT-ANAGRAM-49', 'AC-DICT-BUG-50'], ALGORITHM_EDITORIAL_CATALOG)
assert.equal(c4AccessBranchesOnly.accessible, false, 'Branch-only completion must not unlock Constellation 5')
assert.equal(c4AccessBranchesOnly.mode, 'gated', 'Branch-only completion must leave Constellation 5 in gated mode')
const c4AccessWithoutBranches = getConstellationAccess(5, c4EightCore, ALGORITHM_EDITORIAL_CATALOG)
const c4AccessWithBranches = getConstellationAccess(5, [...c4EightCore, 'AC-DICT-ANAGRAM-49', 'AC-DICT-BUG-50'], ALGORITHM_EDITORIAL_CATALOG)
assert.equal(c4AccessWithBranches.accessible, true, 'Constellation 5 must stay accessible after Branch 49·50 completions')
assert.equal(
  c4AccessWithBranches.accessible,
  c4AccessWithoutBranches.accessible,
  'Branch 49·50 completions must not change Constellation 5 accessibility (core-only aggregation regression)'
)

console.log('  -> [PASS] Constellation 4 Branch Missions (49·50) prerequisites and gate isolation verified')

// [Test 17] Constellation 5 Simulation & Search (51~60) Curriculum & Gate Contracts
console.log('[Test 17] Validating Constellation 5 Simulation & Search (51~60) and gate contracts...')
const c5Published = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-5' && entry.status === 'published'
)
assert.deepEqual(
  c5Published.map((entry) => entry.problemId),
  [
    'AC-SIM-ROVER-51',
    'AC-SIM-COMPASS-52',
    'AC-SIM-CLOCK-53',
    'AC-SIM-SWITCH-54',
    'AC-SIM-BELT-55',
    'AC-SORT-MIN-01',
    'AC-SORT-BUBBLE-57',
    'AC-SRCH-LINEAR-58',
    'AC-SRCH-BINARY-59',
    'AC-SRCH-PREFIX-60',
  ],
  'Constellation 5 must be complete: exactly the 10 published problems 51~60'
)
const c5Cores = c5Published.filter((entry) => entry.routeRole === 'core')
const c5Branches = c5Published.filter((entry) => entry.routeRole === 'branch')
assert.equal(c5Cores.length, 8, 'Constellation 5 must have exactly 8 Core problems (51~58)')
assert.equal(c5Branches.length, 2, 'Constellation 5 must have exactly 2 Branch problems (59~60)')
assert.deepEqual(
  c5Branches.map((entry) => entry.problemId),
  ['AC-SRCH-BINARY-59', 'AC-SRCH-PREFIX-60']
)
for (const entry of c5Published) {
  assert.equal(entry.lensId, 'state-transition', 'Constellation 5 problems must all reuse the state-transition lens')
  assert.deepEqual(
    PUBLIC_KERNELS[entry.problemId].curriculum.prerequisites,
    entry.prerequisites,
    'Constellation 5 kernel and catalog prerequisites must stay synchronized'
  )
}

// Registry anchor contract: 51, 54, 56 (v2 fix — was [56] only).
const c5Anchors = CONSTELLATIONS.find((item) => item.id === 'constellation-5').requiredAnchors
assert.deepEqual(
  c5Anchors,
  ['AC-SIM-ROVER-51', 'AC-SIM-SWITCH-54', 'AC-SORT-MIN-01'],
  'Constellation 5 requiredAnchors must be exactly 51, 54, 56'
)

// Prerequisite lock transitions (catalog draft values replaced by final values).
assert.equal(isMissionPrerequisitesMet('AC-SIM-ROVER-51', ['AC-SEQ-005', 'AC-PAT-003'], ALGORITHM_EDITORIAL_CATALOG), false, '51 must stay locked without AC-COND-ELIF-14')
assert.equal(isMissionPrerequisitesMet('AC-SIM-ROVER-51', ['AC-SEQ-005', 'AC-PAT-003', 'AC-COND-ELIF-14'], ALGORITHM_EDITORIAL_CATALOG), true, '51 must unlock with all three prerequisites')
assert.equal(isMissionPrerequisitesMet('AC-SIM-COMPASS-52', ['AC-SIM-ROVER-51'], ALGORITHM_EDITORIAL_CATALOG), false, '52 must stay locked without AC-PAT-003')
assert.equal(isMissionPrerequisitesMet('AC-SIM-COMPASS-52', ['AC-SIM-ROVER-51', 'AC-PAT-003'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-SRCH-BINARY-59', ['AC-SRCH-LINEAR-58', 'AC-EXP-WHILE-07'], ALGORITHM_EDITORIAL_CATALOG), false, '59 must stay locked without AC-PAT-DIGIT-24')
assert.equal(isMissionPrerequisitesMet('AC-SRCH-BINARY-59', ['AC-SRCH-LINEAR-58', 'AC-EXP-WHILE-07', 'AC-PAT-DIGIT-24'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-SRCH-PREFIX-60', ['AC-SEQ-RUNNING-35'], ALGORITHM_EDITORIAL_CATALOG), false, '60 must stay locked without AC-EXP-BOUND-05')
assert.equal(isMissionPrerequisitesMet('AC-SRCH-PREFIX-60', ['AC-SEQ-RUNNING-35', 'AC-EXP-BOUND-05'], ALGORITHM_EDITORIAL_CATALOG), true)

// Constellation 6 unlock (verified via isConstellationUnlocked directly — C6 has no
// published missions so getConstellationAccess(6) always returns 'unavailable'):
const c5CoreIds = c5Cores.map((entry) => entry.problemId)
// 6. Five cores + both branches are NOT enough.
assert.equal(
  isConstellationUnlocked(6, [...c5CoreIds.slice(0, 5), ...c5Branches.map((entry) => entry.problemId)], ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 6 must stay locked with only 5 of 8 Core missions even when both Branches are done'
)
// 7. Seven cores missing one anchor are NOT enough.
const c5SevenCoresMissingAnchor = c5CoreIds.filter((id) => id !== 'AC-SIM-SWITCH-54')
assert.equal(
  isConstellationUnlocked(6, c5SevenCoresMissingAnchor, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 6 must stay locked when required anchor 54 is missing even with 7 Cores done'
)
// 8. All anchors + 6 cores unlock.
const c5SixCoreWithAnchors = ['AC-SIM-ROVER-51', 'AC-SIM-SWITCH-54', 'AC-SORT-MIN-01', 'AC-SIM-COMPASS-52', 'AC-SIM-CLOCK-53', 'AC-SIM-BELT-55']
assert.equal(
  isConstellationUnlocked(6, c5SixCoreWithAnchors, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 6 must unlock with anchors 51·54·56 and Core 6/8'
)
// 9. Completing Branches after Core 8 does not change the unlock state.
const c5AllCoresAndBranches = [...c5CoreIds, ...c5Branches.map((entry) => entry.problemId)]
assert.equal(
  isConstellationUnlocked(6, c5AllCoresAndBranches, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 6 must remain unlocked after Branch 59·60 completions'
)

// 10. Legacy 56 completion survives the prerequisite strengthening (completed-set wins).
assert.deepEqual(
  getMissingPrerequisites('AC-SORT-MIN-01', ['AC-SORT-MIN-01'], ALGORITHM_EDITORIAL_CATALOG),
  [],
  'Students who already completed 56 must keep access after its prerequisites strengthened'
)
assert.deepEqual(
  getMissingPrerequisites('AC-SORT-MIN-01', ['AC-SEQ-MINMAX-32'], ALGORITHM_EDITORIAL_CATALOG),
  ['AC-EXP-SWAP-04'],
  'New students must still complete both strengthened prerequisites for 56'
)

console.log('  -> [PASS] Constellation 5 (51~60) prerequisites, anchors 51·54·56, and Core 6/8 unlock verified')

// [Test 18] Constellation 6 Combinatorial Search (61~70) Curriculum & Gate Contracts
console.log('[Test 18] Validating Constellation 6 Combinatorial Search (61~70) and gate isolation...')
const c6Published = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-6' && entry.status === 'published'
)
assert.deepEqual(
  c6Published.map((entry) => entry.problemId),
  [
    'AC-ENUM-PAIR-01',
    'AC-ENUM-TARGET-62',
    'AC-ENUM-TRIPLE-63',
    'AC-ENUM-COMB-64',
    'AC-ENUM-SUBSET-65',
    'AC-ENUM-KEYPAD-66',
    'AC-ENUM-FILTER-67',
    'AC-ENUM-BEST-68',
    'AC-ENUM-PRUNE-69',
    'AC-ENUM-LOCK-70',
  ],
  'Constellation 6 must have exactly the 10 published problems 61~70'
)
const c6Cores = c6Published.filter((entry) => entry.routeRole === 'core')
const c6Branches = c6Published.filter((entry) => entry.routeRole === 'branch')
assert.equal(c6Cores.length, 8, 'Constellation 6 must have exactly 8 Core problems (61~68)')
assert.equal(c6Branches.length, 2, 'Constellation 6 must have exactly 2 Branch problems (69~70)')
assert.deepEqual(
  c6Branches.map((entry) => entry.problemId),
  ['AC-ENUM-PRUNE-69', 'AC-ENUM-LOCK-70']
)
for (const entry of c6Published) {
  assert.equal(entry.lensId, 'state-transition', 'Constellation 6 problems must all reuse the state-transition lens')
  assert.deepEqual(
    PUBLIC_KERNELS[entry.problemId].curriculum.prerequisites,
    entry.prerequisites,
    'Constellation 6 kernel and catalog prerequisites must stay synchronized'
  )
}

// Registry anchor contract: 61, 65
const c6Anchors = CONSTELLATIONS.find((item) => item.id === 'constellation-6').requiredAnchors
assert.deepEqual(
  c6Anchors,
  ['AC-ENUM-PAIR-01', 'AC-ENUM-SUBSET-65'],
  'Constellation 6 requiredAnchors must be exactly 61, 65'
)

// Prerequisite lock transitions for Constellation 6
assert.equal(isMissionPrerequisitesMet('AC-ENUM-TARGET-62', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-ENUM-TARGET-62', ['AC-ENUM-PAIR-01'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-ENUM-SUBSET-65', ['AC-ENUM-COMB-64'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-ENUM-SUBSET-65', ['AC-ENUM-COMB-64', 'AC-PAT-DIGIT-24'], ALGORITHM_EDITORIAL_CATALOG), true)

// Constellation 7 unlock gating:
const c6CoreIds = c6Cores.map((entry) => entry.problemId)
// 1. Five cores + both branches are NOT enough.
assert.equal(
  isConstellationUnlocked(7, [...c6CoreIds.slice(0, 5), ...c6Branches.map((entry) => entry.problemId)], ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 7 must stay locked with only 5 of 8 Core missions even when both Branches are done'
)
// 2. Seven cores missing required anchor 65 are NOT enough.
const c6SevenCoresMissingAnchor = c6CoreIds.filter((id) => id !== 'AC-ENUM-SUBSET-65')
assert.equal(
  isConstellationUnlocked(7, c6SevenCoresMissingAnchor, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 7 must stay locked when required anchor 65 is missing even with 7 Cores done'
)
// 3. All anchors + 6 cores unlock Constellation 7.
const c6SixCoreWithAnchors = ['AC-ENUM-PAIR-01', 'AC-ENUM-SUBSET-65', 'AC-ENUM-TARGET-62', 'AC-ENUM-TRIPLE-63', 'AC-ENUM-COMB-64', 'AC-ENUM-KEYPAD-66']
assert.equal(
  isConstellationUnlocked(7, c6SixCoreWithAnchors, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 7 must unlock with anchors 61·65 and Core 6/8'
)

console.log('  -> [PASS] Constellation 6 (61~70) prerequisites, anchors 61·65, and Core 6/8 unlock verified')

// [Test 19] Constellation 7 Stacks & Queues (71~80) Curriculum & Gate Contracts
console.log('[Test 19] Validating Constellation 7 Stacks & Queues (71~80) and gate isolation...')
const c7Published = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-7' && entry.status === 'published'
)
assert.deepEqual(
  c7Published.map((entry) => entry.problemId),
  [
    'AC-STACK-BOX-71',
    'AC-STACK-PAREN-72',
    'AC-STACK-UNDO-73',
    'AC-NAV-005',
    'AC-QUEUE-ROBOT-75',
    'AC-QUEUE-ROBIN-76',
    'AC-QUEUE-CARD-77',
    'AC-DEQUE-DOCK-78',
    'AC-STACK-QUEUE-79',
    'AC-QUEUE-POP-80',
  ],
  'Constellation 7 must have exactly the 10 published problems 71~80'
)
const c7Cores = c7Published.filter((entry) => entry.routeRole === 'core')
const c7Branches = c7Published.filter((entry) => entry.routeRole === 'branch')
assert.equal(c7Cores.length, 8, 'Constellation 7 must have exactly 8 Core problems (71~78)')
assert.equal(c7Branches.length, 2, 'Constellation 7 must have exactly 2 Branch problems (79~80)')
assert.deepEqual(
  c7Branches.map((entry) => entry.problemId),
  ['AC-STACK-QUEUE-79', 'AC-QUEUE-POP-80']
)
for (const entry of c7Published) {
  assert.deepEqual(
    PUBLIC_KERNELS[entry.problemId].curriculum.prerequisites,
    entry.prerequisites,
    `Constellation 7 kernel and catalog prerequisites must stay synchronized for ${entry.problemId}`
  )
}

// Registry anchor contract: 71, 74
const c7Anchors = CONSTELLATIONS.find((item) => item.id === 'constellation-7').requiredAnchors
assert.deepEqual(
  c7Anchors,
  ['AC-STACK-BOX-71', 'AC-NAV-005'],
  'Constellation 7 requiredAnchors must be exactly 71, 74'
)

// Prerequisite lock transitions for Constellation 7
assert.equal(isMissionPrerequisitesMet('AC-STACK-BOX-71', ['AC-SEQ-RUNNING-35'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-STACK-BOX-71', ['AC-SEQ-RUNNING-35', 'AC-EXP-WHILE-07'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-STACK-PAREN-72', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-STACK-PAREN-72', ['AC-STACK-BOX-71'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-DEQUE-DOCK-78', ['AC-STACK-BOX-71'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-DEQUE-DOCK-78', ['AC-STACK-BOX-71', 'AC-QUEUE-ROBOT-75'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-QUEUE-POP-80', ['AC-STACK-BOX-71', 'AC-NAV-005'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-QUEUE-POP-80', ['AC-STACK-BOX-71', 'AC-NAV-005', 'AC-CODE-FIRST-ERROR-01'], ALGORITHM_EDITORIAL_CATALOG), true)

// Constellation 8 unlock gating:
const c7CoreIds = c7Cores.map((entry) => entry.problemId)
// 1. Five cores + both branches are NOT enough.
assert.equal(
  isConstellationUnlocked(8, [...c7CoreIds.slice(0, 5), ...c7Branches.map((entry) => entry.problemId)], ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 8 must stay locked with only 5 of 8 Core missions even when both Branches are done'
)
// 2. Seven cores missing required anchor 71 are NOT enough.
const c7SevenCoresMissingAnchor = c7CoreIds.filter((id) => id !== 'AC-STACK-BOX-71')
assert.equal(
  isConstellationUnlocked(8, c7SevenCoresMissingAnchor, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 8 must stay locked when required anchor 71 is missing even with 7 Cores done'
)
// 3. All anchors + 6 cores unlock Constellation 8.
const c7SixCoreWithAnchors = ['AC-STACK-BOX-71', 'AC-NAV-005', 'AC-STACK-PAREN-72', 'AC-STACK-UNDO-73', 'AC-QUEUE-ROBOT-75', 'AC-QUEUE-ROBIN-76']
assert.equal(
  isConstellationUnlocked(8, c7SixCoreWithAnchors, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 8 must unlock with anchors 71·74 and Core 6/8'
)

console.log('  -> [PASS] Constellation 7 (71~80) prerequisites, anchors 71·74, and Core 6/8 unlock verified')

// [Test 20] Constellation 8 Grid Navigation (81~90) Curriculum & Gate Contracts
console.log('[Test 20] Validating Constellation 8 Grid Navigation (81~90) and gate isolation...')
const c8Published = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-8' && entry.status === 'published'
)
assert.deepEqual(
  c8Published.map((entry) => entry.problemId),
  [
    'AC-GRID-NEIGHBOR-81',
    'AC-GRID-BOUND-82',
    'AC-GRID-FLOOD-83',
    'AC-GRID-ISLAND-84',
    'AC-NAV-006',
    'AC-GRID-MULTI-86',
    'AC-GRAPH-ADJ-87',
    'AC-GRAPH-REACH-88',
    'AC-NAV-COMPARE-89',
    'AC-NAV-VISITED-90',
  ],
  'Constellation 8 must have exactly the 10 published problems 81~90'
)
const c8Cores = c8Published.filter((entry) => entry.routeRole === 'core')
const c8Branches = c8Published.filter((entry) => entry.routeRole === 'branch')
assert.equal(c8Cores.length, 8, 'Constellation 8 must have exactly 8 Core problems (81~88)')
assert.equal(c8Branches.length, 2, 'Constellation 8 must have exactly 2 Branch problems (89~90)')
assert.deepEqual(
  c8Branches.map((entry) => entry.problemId),
  ['AC-NAV-COMPARE-89', 'AC-NAV-VISITED-90']
)
for (const entry of c8Published) {
  assert.deepEqual(
    PUBLIC_KERNELS[entry.problemId].curriculum.prerequisites,
    entry.prerequisites,
    `Constellation 8 kernel and catalog prerequisites must stay synchronized for ${entry.problemId}`
  )
}

// Registry anchor contract: 81, 83, 85
const c8Anchors = CONSTELLATIONS.find((item) => item.id === 'constellation-8').requiredAnchors
assert.deepEqual(
  c8Anchors,
  ['AC-GRID-NEIGHBOR-81', 'AC-GRID-FLOOD-83', 'AC-NAV-006'],
  'Constellation 8 requiredAnchors must be exactly 81, 83, 85'
)

// Prerequisite lock transitions for Constellation 8
assert.equal(isMissionPrerequisitesMet('AC-GRID-NEIGHBOR-81', ['AC-SEQ-005'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-GRID-NEIGHBOR-81', ['AC-SEQ-005', 'AC-SEQ-RUNNING-35'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-GRID-BOUND-82', ['AC-GRID-NEIGHBOR-81'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-GRID-BOUND-82', ['AC-GRID-NEIGHBOR-81', 'AC-COND-RANGE-15'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-GRID-FLOOD-83', ['AC-GRID-BOUND-82', 'AC-NAV-005'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-GRID-FLOOD-83', ['AC-GRID-BOUND-82', 'AC-NAV-005', 'AC-SET-MEMBERSHIP-42'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-NAV-006', ['AC-NAV-005'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-NAV-006', ['AC-GRID-FLOOD-83', 'AC-NAV-005'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(
  isMissionPrerequisitesMet('AC-NAV-006', ['AC-NAV-006'], ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Students who completed legacy AC-NAV-006 must retain review access after new prerequisites are added'
)
assert.equal(isMissionPrerequisitesMet('AC-NAV-COMPARE-89', ['AC-NAV-006', 'AC-GRAPH-REACH-88'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-NAV-COMPARE-89', ['AC-NAV-006', 'AC-GRAPH-REACH-88', 'AC-STACK-BOX-71'], ALGORITHM_EDITORIAL_CATALOG), true)
assert.equal(isMissionPrerequisitesMet('AC-NAV-VISITED-90', ['AC-NAV-006', 'AC-GRAPH-REACH-88'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-NAV-VISITED-90', ['AC-NAV-006', 'AC-GRAPH-REACH-88', 'AC-CODE-FIRST-ERROR-01'], ALGORITHM_EDITORIAL_CATALOG), true)

// Constellation 9 unlock gating:
const c8CoreIds = c8Cores.map((entry) => entry.problemId)
// 1. Five cores + both branches are NOT enough.
assert.equal(
  isConstellationUnlocked(9, [...c8CoreIds.slice(0, 5), ...c8Branches.map((entry) => entry.problemId)], ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 9 must stay locked with only 5 of 8 Core missions even when both Branches are done'
)
// 2. Seven cores missing required anchor 81 are NOT enough.
const c8SevenCoresMissingAnchor81 = c8CoreIds.filter((id) => id !== 'AC-GRID-NEIGHBOR-81')
assert.equal(
  isConstellationUnlocked(9, c8SevenCoresMissingAnchor81, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 9 must stay locked when required anchor 81 is missing even with 7 Cores done'
)
// 3. Seven cores missing required anchor 83 are NOT enough.
const c8SevenCoresMissingAnchor83 = c8CoreIds.filter((id) => id !== 'AC-GRID-FLOOD-83')
assert.equal(
  isConstellationUnlocked(9, c8SevenCoresMissingAnchor83, ALGORITHM_EDITORIAL_CATALOG),
  false,
  'Constellation 9 must stay locked when required anchor 83 is missing even with 7 Cores done'
)
// 4. All 3 anchors + 6 cores unlock Constellation 9.
const c8SixCoreWithAnchors = ['AC-GRID-NEIGHBOR-81', 'AC-GRID-FLOOD-83', 'AC-NAV-006', 'AC-GRID-BOUND-82', 'AC-GRID-ISLAND-84', 'AC-GRID-MULTI-86']
assert.equal(
  isConstellationUnlocked(9, c8SixCoreWithAnchors, ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 9 must unlock with anchors 81·83·85 and Core 6/8'
)

// 5. Branch completion (89, 90) does not alter unlock state
assert.equal(
  isConstellationUnlocked(9, [...c8SixCoreWithAnchors, 'AC-NAV-COMPARE-89', 'AC-NAV-VISITED-90'], ALGORITHM_EDITORIAL_CATALOG),
  true,
  'Constellation 9 unlock remains true with branch completions'
)

// 6. Hub getConstellationAccess validation
const accessC8 = getConstellationAccess(8, c7SixCoreWithAnchors, ALGORITHM_EDITORIAL_CATALOG)
assert.equal(accessC8.accessible, true, 'Constellation 8 must be accessible with C7 requirements met')
const legacyC8Access = getConstellationAccess(8, ['AC-NAV-006'], ALGORITHM_EDITORIAL_CATALOG)
assert.deepEqual(
  { accessible: legacyC8Access.accessible, mode: legacyC8Access.mode },
  { accessible: true, mode: 'grandfathered' },
  'Existing AC-NAV-006 completion must grandfather Constellation 8 review access'
)

const accessC9Locked = getConstellationAccess(9, c8SevenCoresMissingAnchor81, ALGORITHM_EDITORIAL_CATALOG)
assert.equal(accessC9Locked.accessible, false, 'Constellation 9 must be locked when anchor 81 is missing')
const accessC9Unlocked = getConstellationAccess(9, c8SixCoreWithAnchors, ALGORITHM_EDITORIAL_CATALOG)
assert.equal(accessC9Unlocked.accessible, true, 'Constellation 9 must be accessible with C8 anchors 81·83·85 and 6 cores')

console.log('  -> [PASS] Constellation 8 (81~90) prerequisites, anchors 81·83·85, and Core 6/8 unlock verified')

// [Test 21] Constellation 9 Strategy & Memory (91~100) Curriculum & Terminal Invariants
console.log('[Test 21] Validating Constellation 9 Strategy & Memory (91~100) and terminal curriculum invariants...')
const c9Published = ALGORITHM_EDITORIAL_CATALOG.filter(
  (entry) => entry.constellationId === 'constellation-9' && entry.status === 'published'
)
assert.deepEqual(
  c9Published.map((entry) => entry.problemId),
  [
    'AC-REC-BASE-91',
    'AC-REC-REPEAT-92',
    'AC-MEMO-CLIMB-01',
    'AC-GREEDY-INTERVAL-94',
    'AC-GREEDY-COIN-95',
    'AC-DP-MAXSUB-96',
    'AC-CAP-DECODE-97',
    'AC-CAP-DISPATCH-98',
    'AC-CAP-RESCUE-99',
    'AC-CAP-AUTOROVER-100',
  ],
  'Constellation 9 must have exactly the 10 published problems 91~100'
)
const c9Cores = c9Published.filter((entry) => entry.routeRole === 'core')
const c9Branches = c9Published.filter((entry) => entry.routeRole === 'branch')
const c9Capstones = c9Published.filter((entry) => entry.routeRole === 'capstone')
assert.equal(c9Cores.length, 4, 'Constellation 9 must have exactly 4 Core problems (91~94)')
assert.equal(c9Branches.length, 2, 'Constellation 9 must have exactly 2 Branch problems (95~96)')
assert.equal(c9Capstones.length, 4, 'Constellation 9 must have exactly 4 Capstone problems (97~100)')

assert.deepEqual(
  c9Cores.map((entry) => entry.problemId),
  ['AC-REC-BASE-91', 'AC-REC-REPEAT-92', 'AC-MEMO-CLIMB-01', 'AC-GREEDY-INTERVAL-94']
)
assert.deepEqual(
  c9Branches.map((entry) => entry.problemId),
  ['AC-GREEDY-COIN-95', 'AC-DP-MAXSUB-96']
)
assert.deepEqual(
  c9Capstones.map((entry) => entry.problemId),
  ['AC-CAP-DECODE-97', 'AC-CAP-DISPATCH-98', 'AC-CAP-RESCUE-99', 'AC-CAP-AUTOROVER-100']
)

for (const entry of c9Published) {
  assert.deepEqual(
    PUBLIC_KERNELS[entry.problemId].curriculum.prerequisites,
    entry.prerequisites,
    `Constellation 9 kernel and catalog prerequisites must stay synchronized for ${entry.problemId}`
  )
}

// Registry anchor contract: 93
const c9Config = CONSTELLATIONS.find((item) => item.id === 'constellation-9')
assert.deepEqual(
  c9Config.requiredAnchors,
  ['AC-MEMO-CLIMB-01'],
  'Constellation 9 requiredAnchors must be exactly AC-MEMO-CLIMB-01 (93)'
)
assert.equal(
  c9Config.minimumCoreToUnlockNext,
  null,
  'Constellation 9 is terminal, minimumCoreToUnlockNext must be null'
)

// Invariant: Capstone problems must NEVER be required as prerequisites for any other problem
const allCatalogPrerequisites = new Set(
  ALGORITHM_EDITORIAL_CATALOG.flatMap((entry) => entry.prerequisites || [])
)
for (const capstone of c9Capstones) {
  assert.equal(
    allCatalogPrerequisites.has(capstone.problemId),
    false,
    `Capstone ${capstone.problemId} must never be a prerequisite for any other problem`
  )
}

// Prerequisite lock transitions for Constellation 9
assert.equal(isMissionPrerequisitesMet('AC-REC-BASE-91', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-REC-BASE-91', ['AC-SEQ-RUNNING-35'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-REC-BASE-91', ['AC-SEQ-RUNNING-35', 'AC-PAT-003'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-REC-REPEAT-92', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-REC-REPEAT-92', ['AC-REC-BASE-91'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-MEMO-CLIMB-01', [], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-MEMO-CLIMB-01', ['AC-REC-REPEAT-92'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-GREEDY-INTERVAL-94', ['AC-SORT-MIN-01'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-GREEDY-INTERVAL-94', ['AC-SORT-MIN-01', 'AC-ENUM-BEST-68'], ALGORITHM_EDITORIAL_CATALOG), true)

// Capstones unlock once their specific cross-constellation prerequisites are met
assert.equal(isMissionPrerequisitesMet('AC-CAP-DECODE-97', ['AC-STR-COMPRESS-39'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-CAP-DECODE-97', ['AC-STR-COMPRESS-39', 'AC-DICT-FREQ-44'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-CAP-DISPATCH-98', ['AC-NAV-005'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-CAP-DISPATCH-98', ['AC-NAV-005', 'AC-SORT-MIN-01'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-CAP-RESCUE-99', ['AC-NAV-006'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-CAP-RESCUE-99', ['AC-NAV-006', 'AC-SRCH-LINEAR-58'], ALGORITHM_EDITORIAL_CATALOG), true)

assert.equal(isMissionPrerequisitesMet('AC-CAP-AUTOROVER-100', ['AC-MEMO-CLIMB-01', 'AC-NAV-006'], ALGORITHM_EDITORIAL_CATALOG), false)
assert.equal(isMissionPrerequisitesMet('AC-CAP-AUTOROVER-100', ['AC-MEMO-CLIMB-01', 'AC-NAV-006', 'AC-SIM-COMPASS-52'], ALGORITHM_EDITORIAL_CATALOG), true)

console.log('  -> [PASS] Constellation 9 (91~100) Strategy & Memory, Capstones, and Terminal Curriculum verified')

console.log('\n=== Gate 0 Curriculum & Contract Tests Passed 100%! ===\n')
