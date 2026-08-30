/**
 * LUMI Algorithm Constellation — Authoring Integrity Contracts Validator (v1)
 *
 * Enforces the 10 Publication Invariants across all registered problems.
 */

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { PUBLIC_KERNELS } from '../src/components/AlgorithmConstellation/shared/problems/index.js'
import { PYTHON_CONCEPT_REGISTRY } from '../src/components/AlgorithmConstellation/shared/python/pythonConceptRegistry.js'
import { PROBLEM_SOLVING_PATTERN_REGISTRY } from '../src/components/AlgorithmConstellation/shared/patterns/problemSolvingPatternRegistry.js'
import { ALGORITHM_EDITORIAL_CATALOG } from '../src/components/AlgorithmConstellation/shared/catalog/algorithmEditorialCatalog.js'
import { EVIDENCE_PRIMITIVES } from '../src/components/AlgorithmConstellation/shared/evidence/evidencePrimitives.js'

const require = createRequire(import.meta.url)
const { PRIVATE_PROBLEMS, getPrivateProblemDefinition, getTransferChallenges } = require('../functions/algorithmConstellation/problems/index.cjs')
const { evaluateBaseSubmission, evaluateTransferSubmission, runRestrictedPythonFunction } = require('../functions/algorithmConstellation/isolatedJudgeRuntime.cjs')

// Authoring-bug error classes: these mean the fixture cannot RUN in the
// sandbox at all, so it never exercises the misconception it claims to test
// (e.g. 'is not None' in a fixture for a sandbox without 'is not').
// Step-limit hits (infinite-loop fixtures) and domain runtime errors such as
// a dict KeyError ARE authentic misconception behavior and stay allowed.
const AUTHORING_BUG_ERROR_PATTERNS = [
  /정의되지 않았거나 지원하지 않는 표현식/, // NAME_ERROR: unsupported expression / undefined name
  /지원하지 않는 Python 문장/,             // UNSUPPORTED_SYNTAX: unknown statement
  /지원하지 않는 메서드/,                  // unsupported method call
  /import를 사용할 수 없습니다/,           // forbidden import
  /보안 정책상 허용되지 않는/,             // FORBIDDEN_SOURCE rejection
]

console.log('🧪 Running Authoring Integrity Contracts Validator (10 Invariants)...')

const registeredProblemIds = Object.keys(PUBLIC_KERNELS)
const privateProblemIds = Object.keys(PRIVATE_PROBLEMS).map((key) => key.split('@')[0])
const publishedCatalogProblemIds = ALGORITHM_EDITORIAL_CATALOG.filter((e) => e.status === 'published').map((e) => e.problemId)

function extractParameterNames(code, entryFunction) {
  if (typeof code !== 'string' || typeof entryFunction !== 'string') return null
  const escapedName = entryFunction.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = code.match(new RegExp(`def\\s+${escapedName}\\s*\\(([^)]*)\\)\\s*:`))
  if (!match) return null
  return match[1].split(',').map((item) => item.trim()).filter(Boolean)
}

// Set Parity: All published problems must exist in Public Kernels and Private Problems
assert.deepEqual(
  new Set(registeredProblemIds),
  new Set(privateProblemIds),
  '[Set Parity FAIL] Public kernels and Private problems sets must be identical!'
)
assert.deepEqual(
  new Set(registeredProblemIds),
  new Set(publishedCatalogProblemIds),
  '[Set Parity FAIL] Published catalog and Public kernels sets must be identical!'
)

const catalogMap = new Map(ALGORITHM_EDITORIAL_CATALOG.map((item) => [item.problemId, item]))

for (const problemId of registeredProblemIds) {
  const publicKernel = PUBLIC_KERNELS[problemId]
  assert.ok(publicKernel, `[Invariant 1 FAIL] Public kernel missing for ${problemId}`)
  
  // 1. Public Schema & Invariants
  assert.ok(publicKernel.id === problemId, `[Invariant 1 FAIL] Kernel ID mismatch: ${publicKernel.id} vs ${problemId}`)
  assert.ok(publicKernel.version >= 1, `[Invariant 1 FAIL] Kernel version missing for ${problemId}`)
  assert.ok(publicKernel.modes?.code?.entryFunction, `[Invariant 1 FAIL] Entry function missing in modes.code for ${problemId}`)
  assert.ok(Object.isFrozen(publicKernel), `[Invariant 1 FAIL] Public kernel ${problemId} must be frozen`)

  // Catalog / Public Parity
  const catalogEntry = catalogMap.get(problemId)
  if (catalogEntry) {
    if (publicKernel.modes?.explore?.lensId) {
      assert.equal(
        catalogEntry.lensId,
        publicKernel.modes.explore.lensId,
        `[Lens Parity FAIL] Catalog lensId (${catalogEntry.lensId}) mismatch with Public Kernel (${publicKernel.modes.explore.lensId}) for ${problemId}`
      )
    }
    const catPrereqs = catalogEntry.prerequisites || []
    if (publicKernel.curriculum?.prerequisites) {
      assert.deepEqual(
        catPrereqs,
        publicKernel.curriculum.prerequisites,
        `[Prerequisite Parity FAIL] Catalog prerequisites mismatch for ${problemId}`
      )
    }
    for (const prereqId of catPrereqs) {
      const prereqEntry = catalogMap.get(prereqId)
      assert.ok(prereqEntry, `[Prerequisite Missing FAIL] ${problemId} references unknown prerequisite ${prereqId}`)
      assert.equal(prereqEntry.status, 'published', `[Prerequisite Publication FAIL] Published ${problemId} depends on unpublished ${prereqId}`)
      assert.ok(
        prereqEntry.catalogOrder < catalogEntry.catalogOrder,
        `[Prerequisite Order FAIL] Prerequisite ${prereqId} (order ${prereqEntry.catalogOrder}) must precede ${problemId} (order ${catalogEntry.catalogOrder})`
      )
    }
  }

  const exploreFrames = publicKernel.modes?.explore?.lensConfig?.frames || []
  if (publicKernel.modes?.explore?.lensId === 'state-transition') {
    const lensConfig = publicKernel.modes.explore.lensConfig
    assert.ok(exploreFrames.length >= 1, `[State Transition FAIL] Frames missing for ${problemId}`)
    assert.ok(lensConfig.predictionPrompt, `[State Transition FAIL] predictionPrompt missing for ${problemId}`)
    assert.ok(lensConfig.rulePrompt, `[State Transition FAIL] rulePrompt missing for ${problemId}`)
    assert.ok(lensConfig.ruleStatement, `[State Transition FAIL] ruleStatement missing for ${problemId}`)
    const frameIds = exploreFrames.map((frame) => frame.id)
    assert.equal(new Set(frameIds).size, frameIds.length, `[State Transition FAIL] Duplicate frame id in ${problemId}`)
    for (const frame of exploreFrames) {
      assert.ok(frame.id, `[State Transition FAIL] Frame id missing in ${problemId}`)
      assert.ok(frame.stateAfter && typeof frame.stateAfter === 'object', `[State Transition FAIL] stateAfter missing in ${problemId}:${frame.id}`)
    }
  }
  for (const frame of exploreFrames) {
    if (!Array.isArray(frame.operationOptions)) continue
    assert.ok(frame.operationOptions.length >= 2, `[Choice Frame FAIL] At least two options are required in ${problemId}:${frame.id}`)
    const optionIds = frame.operationOptions.map((option) => option.id)
    assert.equal(new Set(optionIds).size, optionIds.length, `[Choice Frame FAIL] Duplicate option id in ${problemId}:${frame.id}`)
    assert.ok(optionIds.includes(frame.expectedOptionId), `[Choice Frame FAIL] expectedOptionId is missing from options in ${problemId}:${frame.id}`)
    assert.ok(frame.stateAfter && typeof frame.stateAfter === 'object', `[Choice Frame FAIL] Canonical stateAfter missing in ${problemId}:${frame.id}`)
  }

  // 2. Private Isolation & Existence
  const privateDef = getPrivateProblemDefinition(problemId, publicKernel.version)
  assert.ok(privateDef, `[Invariant 2 FAIL] Private definition missing for ${problemId}@v${publicKernel.version}`)
  assert.ok(typeof privateDef.officialSolutionCode === 'string' && privateDef.officialSolutionCode.trim(), `[Invariant 2 FAIL] Official solution code missing for ${problemId}`)
  assert.ok(Array.isArray(privateDef.hiddenTests) && privateDef.hiddenTests.length >= 1, `[Invariant 2 FAIL] Hidden tests missing for ${problemId}`)
  const wrongFixtures = privateDef.intendedWrongFixtures || privateDef.intendedWrongSolutions
  assert.ok(Array.isArray(wrongFixtures), `[Invariant 2 FAIL] intendedWrongFixtures/intendedWrongSolutions must be an array for ${problemId}`)
  assert.ok(Array.isArray(privateDef.understandingChallenges), `[Invariant 2 FAIL] understandingChallenges must be an array for ${problemId}`)
  const transferChallenges = getTransferChallenges(privateDef)
  assert.ok(transferChallenges.length >= 1, `[Invariant 2 FAIL] transfer challenge missing for ${problemId}`)

  // 3. Public/Private Parity
  assert.equal(privateDef.problemId, publicKernel.id, `[Invariant 3 FAIL] Problem ID mismatch between public and private: ${privateDef.problemId} vs ${publicKernel.id}`)
  assert.equal(privateDef.problemVersion ?? privateDef.version, publicKernel.version, `[Invariant 3 FAIL] Problem version mismatch for ${problemId}`)
  assert.equal(privateDef.entryFunction, publicKernel.modes.code.entryFunction, `[Invariant 3 FAIL] Entry function mismatch for ${problemId}`)
  assert.deepEqual(
    extractParameterNames(publicKernel.modes.code.starterCode, privateDef.entryFunction),
    extractParameterNames(privateDef.officialSolutionCode, privateDef.entryFunction),
    `[Invariant 3 FAIL] Public starter and private official signature mismatch for ${problemId}`
  )

  // 4. Wrong Fixture Contract
  for (const fixture of wrongFixtures) {
    const fixtureId = fixture.id || fixture.label
    assert.ok(fixtureId, `[Invariant 4 FAIL] Fixture ID missing in ${problemId}`)
    assert.ok(typeof fixture.code === 'string' && fixture.code.trim(), `[Invariant 4 FAIL] Fixture code missing in ${problemId}:${fixtureId}`)
    const failingGroup = fixture.expectedFailingGroup || fixture.expectedFailureGroup
    assert.ok(failingGroup, `[Invariant 4 FAIL] expectedFailingGroup/expectedFailureGroup missing in ${problemId}:${fixtureId}`)
  }

  // 5. Expected Failure Evidence: intendedWrongFixtures must fail Base Judge and fail on expectedFailingGroup (max 20,000 steps budget)
  for (const fixture of wrongFixtures) {
    const fixtureId = fixture.id || fixture.label
    const wrongResult = evaluateBaseSubmission(problemId, publicKernel.version, fixture.code, { maxCumulativeSteps: 20_000 })
    assert.equal(wrongResult.passed, false, `[Invariant 5 FAIL] Wrong fixture ${fixtureId} unexpectedly PASSED base evaluation!`)
    
    // Check if the expected failing group has at least one failed test
    const failingGroup = fixture.expectedFailingGroup || fixture.expectedFailureGroup
    const failedGroups = new Set((wrongResult.testGroups || []).filter((g) => g.passed < g.total).map((g) => g.group))
    assert.ok(
      failedGroups.has(failingGroup),
      `[Invariant 5 FAIL] Wrong fixture ${fixtureId} did not fail in expected group '${failingGroup}'. Failed groups: ${[...failedGroups].join(', ')}`
    )
  }

  // 5b. Fixture Validity: a wrong fixture must be a wrong ALGORITHM, not
  // broken code. If a hidden test fails with a sandbox grammar/security
  // error, the fixture never exercises its misconception at all — it fails
  // every group for the wrong reason (e.g. 'is not' in AC-DICT-ONESHOT-48).
  // Step-limit and domain runtime errors (KeyError-class) stay allowed.
  for (const fixture of wrongFixtures) {
    const fixtureId = fixture.id || fixture.label
    for (const hiddenTest of privateDef.hiddenTests) {
      const run = runRestrictedPythonFunction(fixture.code, privateDef.entryFunction, hiddenTest.inputs, { maxSteps: 20_000 })
      if (run.ok) continue
      const errorMessage = String(run.error || '')
      const authoringBugPattern = AUTHORING_BUG_ERROR_PATTERNS.find((pattern) => pattern.test(errorMessage))
      assert.ok(
        !authoringBugPattern,
        `[Invariant 5b FAIL] Wrong fixture ${fixtureId} crashes on hidden test group '${hiddenTest.group}' with an authoring error (matched: ${authoringBugPattern?.source}): ${errorMessage}. Fix the fixture to use sandbox-supported grammar so it fails by WRONG ANSWER, not by crash.`
      )
    }
  }

  // 6. Learning Support Coverage (First Encounter & Protocol Repair)
  const reqPy = publicKernel.pythonConcepts?.requires || []
  const introPy = publicKernel.pythonConcepts?.introduces || []
  for (const conceptId of [...reqPy, ...introPy]) {
    const concept = PYTHON_CONCEPT_REGISTRY[conceptId]
    assert.ok(concept, `[Invariant 6 FAIL] Python concept '${conceptId}' referenced in ${problemId} is not in PYTHON_CONCEPT_REGISTRY`)
    assert.ok(concept.why && concept.tinyExample && concept.predictionCheck, `[Invariant 6 FAIL] Concept '${conceptId}' missing required First Encounter fields`)
  }

  const reqPat = publicKernel.thinkingPatterns?.requires || []
  const introPat = publicKernel.thinkingPatterns?.introduces || []
  for (const patternId of [...reqPat, ...introPat]) {
    const pattern = PROBLEM_SOLVING_PATTERN_REGISTRY[patternId]
    assert.ok(pattern, `[Invariant 6 FAIL] Thinking pattern '${patternId}' referenced in ${problemId} is not in PROBLEM_SOLVING_PATTERN_REGISTRY`)
    assert.ok(pattern.why && pattern.tinyExample && pattern.predictionCheck, `[Invariant 6 FAIL] Pattern '${patternId}' missing required First Encounter fields`)
  }

  // 7. Runtime Capability & Official Solution Pass (1-Star Correctness)
  const officialResult = evaluateBaseSubmission(problemId, publicKernel.version, privateDef.officialSolutionCode)
  assert.ok(
    officialResult.passed,
    `[Invariant 7 FAIL] Official solution for ${problemId} failed: ${officialResult.error || JSON.stringify(officialResult)}`
  )

  if (Array.isArray(privateDef.alternativeSolutions)) {
    for (const [altIdx, altCode] of privateDef.alternativeSolutions.entries()) {
      const altResult = evaluateBaseSubmission(problemId, publicKernel.version, altCode)
      assert.ok(altResult.passed, `[Invariant 7 FAIL] Alternative solution #${altIdx + 1} for ${problemId} failed base judge: ${altResult.error}`)
    }
  }

  // 8. Domain-neutral UI & Text (Constellation 0 checks)
  if (['AC-EXP-SEQ-01', 'AC-EXP-VAR-02', 'AC-EXP-STEP-03', 'AC-EXP-SWAP-04', 'AC-EXP-BOUND-05', 'AC-EXP-LOOP-06', 'AC-EXP-WHILE-07'].includes(problemId)) {
    const promptText = JSON.stringify(publicKernel.modes)
    assert.ok(!promptText.includes('스위치'), `[Invariant 8 FAIL] Found domain contamination '스위치' in ${problemId}`)
    assert.ok(!promptText.includes('게이트'), `[Invariant 8 FAIL] Found domain contamination '게이트' in ${problemId}`)
  }

  // 9. Understanding Challenges Contract (2-Star Evidence)
  for (const uc of privateDef.understandingChallenges) {
    assert.ok(uc.challengeId, `[Invariant 9 FAIL] Challenge ID missing in understanding challenge for ${problemId}`)
    assert.ok(Array.isArray(uc.questions) && uc.questions.length >= 1, `[Invariant 9 FAIL] Questions missing in understanding challenge for ${problemId}`)
    for (const q of uc.questions) {
      assert.ok(q.id && (q.text || q.prompt), `[Invariant 9 FAIL] Question id/text missing in ${problemId}:${uc.challengeId}`)
      assert.ok(q.expected !== undefined, `[Invariant 9 FAIL] Expected answer missing in private question ${problemId}:${uc.challengeId}:${q.id}`)
    }
  }

  // 10. Transfer Challenges Contract (3-Star Evidence)
  for (const tc of transferChallenges) {
    assert.ok(tc.transferChallengeId, `[Invariant 10 FAIL] Transfer challenge ID missing in ${problemId}`)
    assert.ok(tc.entryFunction, `[Invariant 10 FAIL] Transfer entry function missing in ${problemId}:${tc.transferChallengeId}`)
    assert.ok(typeof tc.starterCode === 'string' && tc.starterCode.trim(), `[Invariant 10 FAIL] Transfer starter code missing in ${problemId}:${tc.transferChallengeId}`)
    assert.ok(tc.starterCode.includes(`def ${tc.entryFunction}(`), `[Invariant 10 FAIL] Transfer starter signature mismatch in ${problemId}:${tc.transferChallengeId}`)
    assert.ok(Array.isArray(tc.testCases) && tc.testCases.length >= 1, `[Invariant 10 FAIL] Transfer test cases missing in ${problemId}:${tc.transferChallengeId}`)

    // If officialSolutionCode is present (Wave A and new capability kernels), test it
    if (tc.officialSolutionCode) {
      assert.deepEqual(
        extractParameterNames(tc.starterCode, tc.entryFunction),
        extractParameterNames(tc.officialSolutionCode, tc.entryFunction),
        `[Invariant 10 FAIL] Transfer starter and official signature mismatch in ${problemId}:${tc.transferChallengeId}`
      )
      const transferResult = evaluateTransferSubmission(
        problemId,
        publicKernel.version,
        tc.transferChallengeId,
        tc.officialSolutionCode
      )
      assert.ok(transferResult.passed, `[Invariant 10 FAIL] Transfer official solution failed for ${problemId}:${tc.transferChallengeId}`)
    }
  }
}

// 11. Editorial Catalog Consistency
const catalogProblemIds = new Set(ALGORITHM_EDITORIAL_CATALOG.map((p) => p.problemId))
for (const problemId of registeredProblemIds) {
  assert.ok(catalogProblemIds.has(problemId), `Catalog entry missing for registered problem ${problemId}`)
}

const catalogOrderByProblemId = new Map(ALGORITHM_EDITORIAL_CATALOG.map((item) => [item.problemId, item.catalogOrder]))
for (const concept of Object.values(PYTHON_CONCEPT_REGISTRY)) {
  const referencingProblems = registeredProblemIds
    .filter((problemId) => {
      const metadata = PUBLIC_KERNELS[problemId].pythonConcepts || {}
      return [...(metadata.requires || []), ...(metadata.introduces || [])].includes(concept.conceptId)
    })
    .sort((a, b) => catalogOrderByProblemId.get(a) - catalogOrderByProblemId.get(b))
  if (referencingProblems.length > 0) {
    assert.equal(
      concept.canonicalFirstProblemId,
      referencingProblems[0],
      `Concept ${concept.conceptId} must first appear at the earliest catalog problem ${referencingProblems[0]}`
    )
  }
}
for (const pattern of Object.values(PROBLEM_SOLVING_PATTERN_REGISTRY)) {
  const referencingProblems = registeredProblemIds
    .filter((problemId) => {
      const metadata = PUBLIC_KERNELS[problemId].thinkingPatterns || {}
      return [...(metadata.requires || []), ...(metadata.introduces || [])].includes(pattern.patternId)
    })
    .sort((a, b) => catalogOrderByProblemId.get(a) - catalogOrderByProblemId.get(b))
  if (referencingProblems.length > 0) {
    assert.equal(
      pattern.canonicalFirstProblemId,
      referencingProblems[0],
      `Pattern ${pattern.patternId} must first appear at the earliest catalog problem ${referencingProblems[0]}`
    )
  }
}

// 12. Constellation 1 Core (13~15) Domain Contracts
const notPublic = PUBLIC_KERNELS['AC-COND-NOT-13']
const notDiscoveryText = JSON.stringify({ identity: notPublic.identity, observe: notPublic.modes.observe, explore: notPublic.modes.explore })
assert.ok(!/\bnot\b/.test(notDiscoveryText), 'NOT-13 must not expose the not keyword before First Encounter')

const elifPublic = PUBLIC_KERNELS['AC-COND-ELIF-14']
const elifDiscoveryText = JSON.stringify({ identity: elifPublic.identity, observe: elifPublic.modes.observe, explore: elifPublic.modes.explore })
assert.ok(!/\b(?:if|elif|else)\b/.test(elifDiscoveryText), 'ELIF-14 must not expose if/elif/else keywords before First Encounter')

const notPrivate = getPrivateProblemDefinition('AC-COND-NOT-13', 1)
const notInputs = notPrivate.hiddenTests.map((t) => t.inputs.silent_mode)
assert.equal(notInputs.length, 2, 'NOT-13 must use exactly two hidden tests for the complete Boolean input space')
assert.deepEqual(new Set(notInputs), new Set([true, false]), 'NOT-13 hidden tests must cover exactly {true, false}')

const elifPrivate = getPrivateProblemDefinition('AC-COND-ELIF-14', 1)
for (const t of elifPrivate.hiddenTests) {
  assert.ok(t.inputs.danger_score >= 0 && t.inputs.danger_score <= 100, `ELIF-14 input ${t.inputs.danger_score} out of 0..100 range`)
}
for (const tc of elifPrivate.transferMasterSet[0].testCases) {
  assert.ok(tc.inputs.battery >= 0 && tc.inputs.battery <= 100, `ELIF-14 transfer input ${tc.inputs.battery} out of 0..100 range`)
}

const rangePrivate = getPrivateProblemDefinition('AC-COND-RANGE-15', 1)
for (const t of rangePrivate.hiddenTests) {
  assert.ok(t.inputs.min_temp <= t.inputs.max_temp, `RANGE-15 input violation: min_temp > max_temp in (${t.inputs.temp}, ${t.inputs.min_temp}, ${t.inputs.max_temp})`)
}
for (const tc of rangePrivate.transferMasterSet[0].testCases) {
  assert.ok(tc.inputs.start_time <= tc.inputs.end_time, `RANGE-15 transfer input violation: start_time > end_time in (${tc.inputs.current_time}, ${tc.inputs.start_time}, ${tc.inputs.end_time})`)
}

// 13. Constellation 1 Core (16~18) Domain Contracts
const clampPublic = PUBLIC_KERNELS['AC-COND-CLAMP-16']
const clampFirstEncounter = PROBLEM_SOLVING_PATTERN_REGISTRY['pattern:upper-clamp']
const clampStudentFacingText = JSON.stringify({ kernel: clampPublic, firstEncounter: clampFirstEncounter })
assert.ok(!/\bmin\s*\(/.test(clampStudentFacingText), 'CLAMP-16 must not expose min() before it is formally introduced')

const clampPrivate = getPrivateProblemDefinition('AC-COND-CLAMP-16', 1)
for (const t of clampPrivate.hiddenTests) {
  assert.ok(
    Number.isInteger(t.inputs.requested_power) && Number.isInteger(t.inputs.max_power) &&
      t.inputs.requested_power >= 0 && t.inputs.requested_power <= 1000 &&
      t.inputs.max_power >= 0 && t.inputs.max_power <= 1000,
    `CLAMP-16 input violation in (${t.inputs.requested_power}, ${t.inputs.max_power})`
  )
}
const clampPublicCases = new Set(clampPublic.assessment.publicTests.map((t) => JSON.stringify(t.inputs)))
assert.equal(
  clampPrivate.hiddenTests.some((t) => clampPublicCases.has(JSON.stringify(t.inputs))),
  false,
  'CLAMP-16 hidden tests must add unseen evidence instead of repeating public cases'
)
assert.ok(
  clampPrivate.alternativeSolutions.every((code) => !/\bmin\s*\(/.test(code)),
  'CLAMP-16 regression alternatives must not promote the later min() concept'
)
for (const tc of clampPrivate.transferMasterSet[0].testCases) {
  assert.ok(
    Number.isInteger(tc.inputs.current) && Number.isInteger(tc.inputs.charge) && Number.isInteger(tc.inputs.capacity) &&
      tc.inputs.current >= 0 && tc.inputs.current <= tc.inputs.capacity && tc.inputs.capacity <= 1000 &&
      tc.inputs.charge >= 0 && tc.inputs.charge <= 1000,
    `CLAMP-16 transfer input violation in (${tc.inputs.current}, ${tc.inputs.charge}, ${tc.inputs.capacity})`
  )
}

const gradePrivate = getPrivateProblemDefinition('AC-COND-GRADE-17', 1)
const gradeScores = new Set(gradePrivate.hiddenTests.map((t) => t.inputs.score))
assert.equal(gradePrivate.hiddenTests.length, 8, 'GRADE-17 hidden suite must stay at the eight non-redundant boundary cases')
for (const requiredBoundary of [0, 69, 70, 79, 80, 89, 90, 100]) {
  assert.ok(gradeScores.has(requiredBoundary), `GRADE-17 missing required boundary score: ${requiredBoundary}`)
}
assert.ok(
  !/90[\s\S]*80[\s\S]*70/.test(PUBLIC_KERNELS['AC-COND-GRADE-17'].modes.code.starterCode),
  'GRADE-17 starter must not reveal the descending threshold order students are meant to design'
)

const complexPrivate = getPrivateProblemDefinition('AC-COND-COMPLEX-18', 1)
const complexBaseTuples = complexPrivate.hiddenTests.map((t) => `${t.inputs.has_master_key},${t.inputs.has_card},${t.inputs.bio_passed}`)
const expectedBooleanTuples = new Set([
  'false,false,false', 'false,false,true', 'false,true,false', 'false,true,true',
  'true,false,false', 'true,false,true', 'true,true,false', 'true,true,true',
])
assert.equal(complexBaseTuples.length, 8, 'COMPLEX-18 Base hidden suite must contain exactly 8 cases')
assert.equal(new Set(complexBaseTuples).size, 8, 'COMPLEX-18 Base hidden tests must cover all 8 unique Boolean combinations')
assert.deepEqual(new Set(complexBaseTuples), expectedBooleanTuples, 'COMPLEX-18 Base hidden tests must cover the canonical Boolean space')

const complexTransferTuples = complexPrivate.transferMasterSet[0].testCases.map((t) => `${t.inputs.has_commander_override},${t.inputs.fuel_ok},${t.inputs.storm_warning}`)
assert.equal(complexTransferTuples.length, 8, 'COMPLEX-18 Transfer suite must contain exactly 8 cases')
assert.equal(new Set(complexTransferTuples).size, 8, 'COMPLEX-18 Transfer test cases must cover all 8 unique Boolean combinations')
assert.deepEqual(new Set(complexTransferTuples), expectedBooleanTuples, 'COMPLEX-18 Transfer tests must cover the canonical Boolean space')
assert.ok(
  PUBLIC_KERNELS['AC-COND-COMPLEX-18'].pythonConcepts.requires.includes('operator:not'),
  'COMPLEX-18 must declare operator:not because its Fresh Transfer requires negation'
)

// 14. Constellation 1 Branch (19~20) Domain Contracts
const togglePublic = PUBLIC_KERNELS['AC-COND-TOGGLE-19']
assert.ok(!togglePublic.pythonConcepts.requires.includes('container:list-iteration'), 'TOGGLE-19 must not reference unregistered container:list-iteration')
assert.ok(!togglePublic.pythonConcepts.requires.includes('operator:equality'), 'TOGGLE-19 must not reference unintroduced operator:equality')
assert.ok(togglePublic.pythonConcepts.requires.includes('builtin:list'), 'TOGGLE-19 must declare builtin:list')
assert.ok(togglePublic.pythonConcepts.requires.includes('statement:for'), 'TOGGLE-19 must declare statement:for')

const togglePrivate = getPrivateProblemDefinition('AC-COND-TOGGLE-19', 1)
const togglePublicCases = new Set(togglePublic.assessment.publicTests.map((t) => JSON.stringify(t.inputs)))
assert.equal(
  togglePrivate.hiddenTests.some((t) => togglePublicCases.has(JSON.stringify(t.inputs))),
  false,
  'TOGGLE-19 hidden tests must not repeat public cases'
)

for (const t of togglePrivate.hiddenTests) {
  assert.ok(typeof t.inputs.initial_power === 'boolean', 'TOGGLE-19 initial_power must be boolean')
  assert.ok(Array.isArray(t.inputs.toggle_actions) && t.inputs.toggle_actions.length <= 20, 'TOGGLE-19 toggle_actions must be array of max length 20')
  assert.ok(t.inputs.toggle_actions.every((a) => typeof a === 'boolean'), 'TOGGLE-19 toggle_actions must contain only booleans')
}

for (const tc of togglePrivate.transferMasterSet[0].testCases) {
  assert.ok(typeof tc.inputs.shield_on === 'boolean', 'TOGGLE-19 transfer shield_on must be boolean')
  assert.ok(typeof tc.inputs.controls_locked === 'boolean', 'TOGGLE-19 transfer controls_locked must be boolean')
  assert.ok(
    Array.isArray(tc.inputs.commands) && tc.inputs.commands.length <= 20 &&
      tc.inputs.commands.every((c) => typeof c === 'boolean'),
    'TOGGLE-19 transfer commands must contain at most 20 booleans'
  )
}
const toggleTransfer = togglePrivate.transferMasterSet[0]
assert.ok(
  !/==/.test(JSON.stringify({
    description: toggleTransfer.description,
    starterCode: toggleTransfer.starterCode,
    officialSolutionCode: toggleTransfer.officialSolutionCode,
  })),
  'TOGGLE-19 Transfer must not introduce the unregistered == operator'
)

const orderPublic = PUBLIC_KERNELS['AC-COND-ORDER-20']
assert.ok(
  orderPublic.thinkingPatterns.requires.includes('pattern:counterexample-search'),
  'ORDER-20 must declare pattern:counterexample-search as required pattern'
)
assert.ok(
  orderPublic.pythonConcepts.requires.includes('operator:comparison-bound'),
  'ORDER-20 must declare <= boundary comparison because its Fresh Transfer requires it'
)
assert.ok(
  orderPublic.modes.code.starterCode.includes('if amount >= 500:'),
  'ORDER-20 starter code must contain the buggy starter to repair'
)

const orderPrivate = getPrivateProblemDefinition('AC-COND-ORDER-20', 1)
assert.equal(orderPrivate.hiddenTests.length, 6, 'ORDER-20 hidden tests must contain exactly 6 boundary cases')
const orderScores = new Set(orderPrivate.hiddenTests.map((t) => t.inputs.amount))
for (const t of orderPrivate.hiddenTests) {
  assert.ok(
    Number.isInteger(t.inputs.amount) && t.inputs.amount >= 0 && t.inputs.amount <= 10000,
    `ORDER-20 amount out of range: ${t.inputs.amount}`
  )
}
for (const requiredScore of [0, 499, 500, 999, 1000, 10000]) {
  assert.ok(orderScores.has(requiredScore), `ORDER-20 missing required boundary amount: ${requiredScore}`)
}

const orderPublicCases = new Set(orderPublic.assessment.publicTests.map((t) => t.inputs.amount))
assert.equal(
  orderPrivate.hiddenTests.some((t) => orderPublicCases.has(t.inputs.amount)),
  false,
  'ORDER-20 hidden tests must not repeat public cases'
)

assert.notEqual(
  orderPrivate.transferMasterSet[0].entryFunction,
  'classify_radiation_danger',
  'ORDER-20 Transfer must not duplicate GRADE-17 classify_radiation_danger'
)
assert.ok(
  !/radiation/i.test(JSON.stringify(orderPrivate.transferMasterSet[0])),
  'ORDER-20 Transfer must not relabel and reuse the GRADE-17 radiation mission'
)
assert.equal(
  evaluateBaseSubmission('AC-COND-ORDER-20', 1, orderPublic.modes.code.starterCode).passed,
  false,
  'ORDER-20 buggy Base starter must fail until the student repairs branch order'
)
assert.equal(
  evaluateTransferSubmission(
    'AC-COND-ORDER-20',
    1,
    orderPrivate.transferMasterSet[0].transferChallengeId,
    orderPrivate.transferMasterSet[0].starterCode
  ).passed,
  false,
  'ORDER-20 buggy Transfer starter must fail until the student repairs the upper-bound order'
)

for (const tc of orderPrivate.transferMasterSet[0].testCases) {
  assert.ok(
    Number.isInteger(tc.inputs.delay) && tc.inputs.delay >= 0 && tc.inputs.delay <= 100,
    `ORDER-20 transfer delay out of range: ${tc.inputs.delay}`
  )
}
const orderTransferDelays = new Set(orderPrivate.transferMasterSet[0].testCases.map((tc) => tc.inputs.delay))
for (const reqDelay of [0, 5, 6, 20, 21, 100]) {
  assert.ok(orderTransferDelays.has(reqDelay), `ORDER-20 transfer missing required delay boundary: ${reqDelay}`)
}

// 15. Constellation 2 C2-R + C2-A contracts
const c2ProblemIds = ['AC-PAT-003', 'AC-PAT-004', 'AC-PAT-EVEN-23', 'AC-PAT-DIGIT-24', 'AC-PAT-REVNUM-25']
const inputKey = (test) => JSON.stringify(test.inputs)

for (const problemId of c2ProblemIds) {
  const publicKernel = PUBLIC_KERNELS[problemId]
  const privateDef = getPrivateProblemDefinition(problemId, 1)
  const publicInputs = new Set(publicKernel.assessment.publicTests.map(inputKey))
  assert.equal(
    privateDef.hiddenTests.some((test) => publicInputs.has(inputKey(test))),
    false,
    `${problemId} hidden tests must not repeat public inputs`
  )
}

assert.deepEqual(
  PUBLIC_KERNELS['AC-PAT-003'].pythonConcepts.introduces,
  ['operator:modulo', 'operator:equality'],
  'PAT-003 must introduce modulo and equality together'
)
assert.ok(
  PUBLIC_KERNELS['AC-PAT-004'].pythonConcepts.requires.includes('operator:comparison-bound'),
  'PAT-004 must declare its comparison-bound dependency'
)

const c2DomainContracts = [
  { problemId: 'AC-PAT-EVEN-23', field: 'signal_number', min: 0, max: 10_000 },
  { problemId: 'AC-PAT-DIGIT-24', field: 'number', min: 100, max: 999 },
  { problemId: 'AC-PAT-REVNUM-25', field: 'number', min: 0, max: 9_999 },
]
for (const { problemId, field, min, max } of c2DomainContracts) {
  const publicKernel = PUBLIC_KERNELS[problemId]
  const privateDef = getPrivateProblemDefinition(problemId, 1)
  for (const test of [...publicKernel.assessment.publicTests, ...privateDef.hiddenTests]) {
    const value = test.inputs[field]
    assert.ok(Number.isInteger(value) && value >= min && value <= max, `${problemId} ${field} out of range: ${value}`)
  }

  const publicTransfer = publicKernel.assessment.transferChallenges[0]
  const privateTransfer = privateDef.transferMasterSet[0]
  const previewInputs = new Set((publicTransfer.testCases || []).map(inputKey))
  assert.ok(previewInputs.size >= 2, `${problemId} must provide at least two non-authoritative preview cases`)
  assert.equal(
    privateTransfer.testCases.some((test) => previewInputs.has(inputKey(test))),
    false,
    `${problemId} authoritative transfer tests must not repeat client preview inputs`
  )
}

const revnumPrivate = getPrivateProblemDefinition('AC-PAT-REVNUM-25', 1)
assert.ok(
  revnumPrivate.hiddenTests.some((test) => test.inputs.number === 0 && test.expected === 0),
  'REVNUM-25 authoritative base suite must cover the zero-input boundary'
)
assert.ok(
  (revnumPrivate.intendedWrongFixtures || []).some((fixture) => fixture.expectedFailingGroup === 'zero_input'),
  'REVNUM-25 must include an intended wrong fixture that fails the zero-input boundary'
)

// 16. Constellation 2 C2-B (26~28) Domain & Quality Contracts
const c2bProblemIds = ['AC-PAT-DIVISOR-26', 'AC-PAT-PRIME-27', 'AC-PAT-GCD-28']
const validEvidencePrimitives = new Set(Object.values(EVIDENCE_PRIMITIVES))
for (const problemId of c2bProblemIds) {
  const publicKernel = PUBLIC_KERNELS[problemId]
  const privateDef = getPrivateProblemDefinition(problemId, 1)
  const publicInputs = new Set(publicKernel.assessment.publicTests.map(inputKey))
  assert.equal(
    privateDef.hiddenTests.some((test) => publicInputs.has(inputKey(test))),
    false,
    `${problemId} hidden tests must not repeat public inputs`
  )

  const publicTransfer = publicKernel.assessment.transferChallenges[0]
  const privateTransfer = privateDef.transferMasterSet[0]
  const previewInputs = new Set((publicTransfer.testCases || []).map(inputKey))
  assert.ok(previewInputs.size >= 2, `${problemId} must provide at least two preview cases`)
  assert.equal(
    privateTransfer.testCases.some((test) => previewInputs.has(inputKey(test))),
    false,
    `${problemId} authoritative transfer tests must not repeat client preview inputs`
  )

  for (const primitive of publicKernel.evidenceRecipe.primitives) {
    assert.ok(validEvidencePrimitives.has(primitive), `${problemId} uses unsupported evidence primitive: ${primitive}`)
  }

  const baseWithinBudget = evaluateBaseSubmission(
    problemId,
    publicKernel.version,
    privateDef.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(baseWithinBudget.passed, true, `${problemId} official Base must pass within 20,000 steps`)

  const transferWithinBudget = evaluateTransferSubmission(
    problemId,
    publicKernel.version,
    privateTransfer.transferChallengeId,
    privateTransfer.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(transferWithinBudget.passed, true, `${problemId} official Transfer must pass within 20,000 steps`)
}

// DIVISOR-26
const divisorPublic = PUBLIC_KERNELS['AC-PAT-DIVISOR-26']
const divisorPrivate = getPrivateProblemDefinition('AC-PAT-DIVISOR-26', 1)
for (const t of [...divisorPublic.assessment.publicTests, ...divisorPrivate.hiddenTests]) {
  assert.ok(Number.isInteger(t.inputs.number) && t.inputs.number >= 1 && t.inputs.number <= 100, `DIVISOR-26 out of range: ${t.inputs.number}`)
}
for (const t of [...divisorPublic.assessment.transferChallenges[0].testCases, ...divisorPrivate.transferMasterSet[0].testCases]) {
  assert.ok(Number.isInteger(t.inputs.number) && t.inputs.number >= 1 && t.inputs.number <= 100, `DIVISOR-26 transfer out of range: ${t.inputs.number}`)
}
assert.ok(divisorPrivate.hiddenTests.some((t) => t.inputs.number === 1 && t.expected === 1), 'DIVISOR-26 hidden tests must contain 1')
const divisorCandidateFiveFrame = divisorPublic.modes.explore.lensConfig.frames.find(
  (frame) => frame.id === 'candidate_5'
)
assert.ok(
  divisorCandidateFiveFrame?.codeSnippet.includes('12 % 5 == 0'),
  'DIVISOR-26 candidate-5 scene must show the actual divisibility predicate'
)
assert.ok(
  divisorPublic.assessment.understandingChallenges[0].questions.some(
    (question) => question.id === 'q3' && question.expected === 'one_candidate_once'
  ) && divisorPrivate.understandingChallenges[0].questions.some(
    (question) => question.id === 'q3' && question.expected === 'one_candidate_once'
  ),
  'DIVISOR-26 understanding evidence must explain why a square-root divisor is counted once'
)

// PRIME-27
const primePublic = PUBLIC_KERNELS['AC-PAT-PRIME-27']
const primePrivate = getPrivateProblemDefinition('AC-PAT-PRIME-27', 1)
for (const t of [...primePublic.assessment.publicTests, ...primePrivate.hiddenTests]) {
  assert.ok(Number.isInteger(t.inputs.number) && t.inputs.number >= 0 && t.inputs.number <= 200, `PRIME-27 out of range: ${t.inputs.number}`)
}
for (const t of [...primePublic.assessment.transferChallenges[0].testCases, ...primePrivate.transferMasterSet[0].testCases]) {
  assert.ok(Number.isInteger(t.inputs.number) && t.inputs.number >= 0 && t.inputs.number <= 200, `PRIME-27 transfer out of range: ${t.inputs.number}`)
}
assert.ok(primePrivate.hiddenTests.some((t) => t.inputs.number === 0 && t.expected === false), 'PRIME-27 hidden tests must contain 0')
assert.ok(primePrivate.hiddenTests.some((t) => t.inputs.number === 1 && t.expected === false), 'PRIME-27 hidden tests must contain 1')
assert.ok(primePrivate.hiddenTests.some((t) => t.inputs.number === 2 && t.expected === true), 'PRIME-27 hidden tests must contain 2')
assert.ok(primePrivate.hiddenTests.some((t) => t.inputs.number === 49 && t.expected === false), 'PRIME-27 hidden tests must contain 49')

// GCD-28
const gcdPublic = PUBLIC_KERNELS['AC-PAT-GCD-28']
const gcdPrivate = getPrivateProblemDefinition('AC-PAT-GCD-28', 1)
for (const t of [...gcdPublic.assessment.publicTests, ...gcdPrivate.hiddenTests]) {
  assert.ok(Number.isInteger(t.inputs.a) && t.inputs.a >= 1 && t.inputs.a <= 100, `GCD-28 a out of range: ${t.inputs.a}`)
  assert.ok(Number.isInteger(t.inputs.b) && t.inputs.b >= 1 && t.inputs.b <= 100, `GCD-28 b out of range: ${t.inputs.b}`)
}
for (const t of [...gcdPublic.assessment.transferChallenges[0].testCases, ...gcdPrivate.transferMasterSet[0].testCases]) {
  assert.ok(Number.isInteger(t.inputs.a) && t.inputs.a >= 1 && t.inputs.a <= 100, `GCD-28 transfer a out of range: ${t.inputs.a}`)
  assert.ok(Number.isInteger(t.inputs.b) && t.inputs.b >= 1 && t.inputs.b <= 100, `GCD-28 transfer b out of range: ${t.inputs.b}`)
}
assert.ok(gcdPrivate.hiddenTests.some((t) => t.inputs.a === t.inputs.b), 'GCD-28 hidden tests must contain same value test')
assert.ok(gcdPrivate.hiddenTests.some((t) => t.inputs.a === 100 && t.inputs.b === 1), 'GCD-28 hidden tests must contain (100, 1) long reduction')
assert.ok(gcdPrivate.hiddenTests.some((t) => t.group === 'coprime'), 'GCD-28 hidden tests must contain coprime test')

assert.ok(
  PUBLIC_KERNELS['AC-PAT-GCD-28'].thinkingPatterns.requires.includes('pattern:preserve-before-overwrite'),
  'GCD-28 must declare pattern:preserve-before-overwrite as required pattern'
)

// 17. Constellation 2 C2-C (29~30) Domain & Quality Contracts
const c2cProblemIds = ['AC-PAT-CALENDAR-29', 'AC-PAT-PRIME-REV-30']
for (const problemId of c2cProblemIds) {
  const publicKernel = PUBLIC_KERNELS[problemId]
  const privateDef = getPrivateProblemDefinition(problemId, 1)
  const publicInputs = new Set(publicKernel.assessment.publicTests.map(inputKey))
  assert.equal(
    privateDef.hiddenTests.some((test) => publicInputs.has(inputKey(test))),
    false,
    `${problemId} hidden tests must not repeat public inputs`
  )

  const publicTransfer = publicKernel.assessment.transferChallenges[0]
  const privateTransfer = privateDef.transferMasterSet[0]
  const previewInputs = new Set((publicTransfer.testCases || []).map(inputKey))
  assert.ok(previewInputs.size >= 2, `${problemId} must provide at least two preview cases`)
  assert.equal(
    privateTransfer.testCases.some((test) => previewInputs.has(inputKey(test))),
    false,
    `${problemId} authoritative transfer tests must not repeat client preview inputs`
  )

  for (const primitive of publicKernel.evidenceRecipe.primitives) {
    assert.ok(validEvidencePrimitives.has(primitive), `${problemId} uses unsupported evidence primitive: ${primitive}`)
  }

  const baseWithinBudget = evaluateBaseSubmission(
    problemId,
    publicKernel.version,
    privateDef.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(baseWithinBudget.passed, true, `${problemId} official Base must pass within 20,000 steps`)

  const transferWithinBudget = evaluateTransferSubmission(
    problemId,
    publicKernel.version,
    privateTransfer.transferChallengeId,
    privateTransfer.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(transferWithinBudget.passed, true, `${problemId} official Transfer must pass within 20,000 steps`)
}

// CALENDAR-29
const calPublic = PUBLIC_KERNELS['AC-PAT-CALENDAR-29']
const calPrivate = getPrivateProblemDefinition('AC-PAT-CALENDAR-29', 1)
assert.equal(
  calPublic.modes.explore.lensId,
  'state-transition',
  'CALENDAR-29 must use a lens that renders start-offset weekday states instead of hard-coded bridge states'
)
assert.deepEqual(
  calPublic.modes.explore.lensConfig.frames.map((frame) => frame.id),
  ['move_0', 'move_1', 'move_4', 'wrap_5', 'large_12'],
  'CALENDAR-29 must render the five required offset and wrap scenes'
)
assert.ok(
  !calPublic.identity.subtitle.includes('(start_day + days_later) % 7'),
  'CALENDAR-29 identity must not expose the complete solution before Observe/Explore'
)
for (const t of [...calPublic.assessment.publicTests, ...calPrivate.hiddenTests]) {
  assert.ok(Number.isInteger(t.inputs.start_day) && t.inputs.start_day >= 0 && t.inputs.start_day <= 6, `CALENDAR-29 start_day out of range: ${t.inputs.start_day}`)
  assert.ok(Number.isInteger(t.inputs.days_later) && t.inputs.days_later >= 0 && t.inputs.days_later <= 1_000_000, `CALENDAR-29 days_later out of range: ${t.inputs.days_later}`)
}
for (const t of [...calPublic.assessment.transferChallenges[0].testCases, ...calPrivate.transferMasterSet[0].testCases]) {
  assert.ok(Number.isInteger(t.inputs.seat_count) && t.inputs.seat_count >= 2 && t.inputs.seat_count <= 20, `CALENDAR-29 transfer seat_count out of range: ${t.inputs.seat_count}`)
  assert.ok(Number.isInteger(t.inputs.start) && t.inputs.start >= 0 && t.inputs.start < t.inputs.seat_count, `CALENDAR-29 transfer start out of range: ${t.inputs.start}`)
  assert.ok(Number.isInteger(t.inputs.moves) && t.inputs.moves >= 0 && t.inputs.moves <= 1_000_000, `CALENDAR-29 transfer moves out of range: ${t.inputs.moves}`)
}

// PRIME-REV-30
const primeRevPublic = PUBLIC_KERNELS['AC-PAT-PRIME-REV-30']
const primeRevPrivate = getPrivateProblemDefinition('AC-PAT-PRIME-REV-30', 1)
assert.ok(
  !primeRevPublic.identity.subtitle.includes('0과 1에서'),
  'PRIME-REV-30 identity must not reveal the first counterexample before exploration'
)
assert.ok(
  !JSON.stringify(primeRevPublic.assessment.transferChallenges[0].contextCard).includes('return False'),
  'PRIME-REV-30 transfer context must guide the boundary review without exposing the repaired line'
)
for (const t of [...primeRevPublic.assessment.publicTests, ...primeRevPrivate.hiddenTests]) {
  assert.ok(Number.isInteger(t.inputs.number) && t.inputs.number >= 0 && t.inputs.number <= 200, `PRIME-REV-30 out of range: ${t.inputs.number}`)
}
for (const t of [...primeRevPublic.assessment.transferChallenges[0].testCases, ...primeRevPrivate.transferMasterSet[0].testCases]) {
  assert.ok(Number.isInteger(t.inputs.number) && t.inputs.number >= 0 && t.inputs.number <= 200, `PRIME-REV-30 transfer out of range: ${t.inputs.number}`)
}
assert.ok(
  primeRevPublic.thinkingPatterns.requires.includes('pattern:counterexample-search'),
  'PRIME-REV-30 must declare pattern:counterexample-search as required pattern'
)
assert.equal(
  evaluateBaseSubmission('AC-PAT-PRIME-REV-30', 1, primeRevPublic.modes.code.starterCode).passed,
  false,
  'PRIME-REV-30 buggy starter code must fail hidden test suite until repaired'
)
assert.equal(
  evaluateTransferSubmission(
    'AC-PAT-PRIME-REV-30',
    1,
    primeRevPrivate.transferMasterSet[0].transferChallengeId,
    primeRevPrivate.transferMasterSet[0].starterCode
  ).passed,
  false,
  'PRIME-REV-30 buggy transfer starter code must fail transfer test suite until repaired'
)

// 18. Constellation 3 (31~40) Domain & Quality Contracts
const c3ProblemIds = [
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
]
for (const problemId of c3ProblemIds) {
  const publicKernel = PUBLIC_KERNELS[problemId]
  const privateDef = getPrivateProblemDefinition(problemId, 1)
  const publicInputs = new Set(publicKernel.assessment.publicTests.map(inputKey))
  assert.equal(
    privateDef.hiddenTests.some((test) => publicInputs.has(inputKey(test))),
    false,
    `${problemId} hidden tests must not repeat public inputs`
  )

  const publicTransfer = publicKernel.assessment.transferChallenges[0]
  const privateTransfer = privateDef.transferMasterSet[0]
  const publicContextText = JSON.stringify(publicTransfer.contextCard || {})
  const solutionSyntaxPattern = /\b(?:def|for|if|return)\b|=/
  assert.equal(
    solutionSyntaxPattern.test(publicContextText),
    false,
    `${problemId} transfer context must guide the strategy without exposing solution code`
  )
  assert.deepEqual(
    privateTransfer.contextCard,
    publicTransfer.contextCard,
    `${problemId} public/private transfer context must stay synchronized`
  )
  assert.deepEqual(
    privateDef.understandingChallenges,
    publicKernel.assessment.understandingChallenges,
    `${problemId} public/private understanding challenge must stay synchronized`
  )
  for (const field of [
    'transferChallengeId',
    'title',
    'description',
    'thoughtCheck',
    'entryFunction',
    'starterCode',
  ]) {
    assert.deepEqual(
      privateTransfer[field],
      publicTransfer[field],
      `${problemId} public/private transfer ${field} must stay synchronized`
    )
  }
  const previewInputs = new Set((publicTransfer.testCases || []).map(inputKey))
  assert.ok(previewInputs.size >= 2, `${problemId} must provide at least two preview cases`)
  assert.equal(
    privateTransfer.testCases.some((test) => previewInputs.has(inputKey(test))),
    false,
    `${problemId} authoritative transfer tests must not repeat client preview inputs`
  )

  for (const primitive of publicKernel.evidenceRecipe.primitives) {
    assert.ok(validEvidencePrimitives.has(primitive), `${problemId} uses unsupported evidence primitive: ${primitive}`)
  }

  const baseWithinBudget = evaluateBaseSubmission(
    problemId,
    publicKernel.version,
    privateDef.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(baseWithinBudget.passed, true, `${problemId} official Base must pass within 20,000 steps`)

  const transferWithinBudget = evaluateTransferSubmission(
    problemId,
    publicKernel.version,
    privateTransfer.transferChallengeId,
    privateTransfer.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(transferWithinBudget.passed, true, `${problemId} official Transfer must pass within 20,000 steps`)
}

// 31 AC-SEQ-005
const seq005Public = PUBLIC_KERNELS['AC-SEQ-005']
const seq005Private = getPrivateProblemDefinition('AC-SEQ-005', 1)
assert.ok(
  seq005Public.thinkingPatterns.introduces.includes('pattern:filter-accumulate'),
  'AC-SEQ-005 must declare pattern:filter-accumulate as introduced pattern'
)
assert.equal(
  Object.hasOwn(seq005Private, 'version'),
  false,
  'AC-SEQ-005 private definition must use problemVersion only'
)

// 32 AC-SEQ-MINMAX-32
const minmaxPublic = PUBLIC_KERNELS['AC-SEQ-MINMAX-32']
const minmaxPrivate = getPrivateProblemDefinition('AC-SEQ-MINMAX-32', 1)
assert.ok(
  minmaxPublic.thinkingPatterns.introduces.includes('pattern:first-item-initialization'),
  'AC-SEQ-MINMAX-32 must declare pattern:first-item-initialization as introduced pattern'
)
for (const t of [...minmaxPublic.assessment.publicTests, ...minmaxPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.signals) && t.inputs.signals.length >= 1 && t.inputs.signals.length <= 20, `MINMAX-32 signals length out of range: ${t.inputs.signals.length}`)
  for (const x of t.inputs.signals) {
    assert.ok(Number.isInteger(x) && x >= -100 && x <= 100, `MINMAX-32 signal value out of range: ${x}`)
  }
}
assert.ok(minmaxPrivate.hiddenTests.some((t) => t.group === 'negative_only'), 'MINMAX-32 hidden tests must contain negative_only group')

// 33 AC-SEQ-COUNT-33
const countPublic = PUBLIC_KERNELS['AC-SEQ-COUNT-33']
const countPrivate = getPrivateProblemDefinition('AC-SEQ-COUNT-33', 1)
for (const t of [...countPublic.assessment.publicTests, ...countPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.capsules) && t.inputs.capsules.length >= 0 && t.inputs.capsules.length <= 20, `COUNT-33 capsules length out of range: ${t.inputs.capsules.length}`)
  assert.ok(t.inputs.min_energy <= t.inputs.max_energy, `COUNT-33 min_energy > max_energy: ${t.inputs.min_energy} > ${t.inputs.max_energy}`)
}

// 34 AC-SEQ-ADJACENT-34
const adjacentPublic = PUBLIC_KERNELS['AC-SEQ-ADJACENT-34']
const adjacentPrivate = getPrivateProblemDefinition('AC-SEQ-ADJACENT-34', 1)
for (const t of [...adjacentPublic.assessment.publicTests, ...adjacentPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.signals) && t.inputs.signals.length >= 1 && t.inputs.signals.length <= 20, `ADJACENT-34 signals length out of range: ${t.inputs.signals.length}`)
}
assert.ok(
  adjacentPublic.thinkingPatterns.requires.includes('pattern:preserve-before-overwrite'),
  'ADJACENT-34 must require pattern:preserve-before-overwrite'
)

// 35 AC-SEQ-RUNNING-35
const runningPublic = PUBLIC_KERNELS['AC-SEQ-RUNNING-35']
const runningPrivate = getPrivateProblemDefinition('AC-SEQ-RUNNING-35', 1)
assert.ok(
  runningPublic.pythonConcepts.introduces.includes('method:append'),
  'AC-SEQ-RUNNING-35 must introduce method:append'
)
assert.ok(
  runningPublic.thinkingPatterns.introduces.includes('pattern:running-prefix-state'),
  'AC-SEQ-RUNNING-35 must introduce pattern:running-prefix-state'
)
assert.equal(
  JSON.stringify({
    identity: runningPublic.identity,
    observe: runningPublic.modes.observe,
    explore: runningPublic.modes.explore,
  }).includes('.append('),
  false,
  'AC-SEQ-RUNNING-35 must not expose append syntax before First Encounter'
)
for (const t of [...runningPublic.assessment.publicTests, ...runningPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.changes) && t.inputs.changes.length >= 0 && t.inputs.changes.length <= 20, `RUNNING-35 changes length out of range: ${t.inputs.changes.length}`)
  for (const delta of t.inputs.changes) {
    assert.ok(Number.isInteger(delta) && delta >= -20 && delta <= 20, `RUNNING-35 delta out of range: ${delta}`)
  }
  assert.ok(Array.isArray(t.expected) && t.expected.length === t.inputs.changes.length, 'RUNNING-35 result length must match input length')
}

// 36 AC-STR-REVERSE-01
const reversePublic = PUBLIC_KERNELS['AC-STR-REVERSE-01']
assert.equal(reversePublic.modes.explore.lensId, 'state-transition', 'AC-STR-REVERSE-01 explore must use state-transition')
assert.ok(reversePublic.pythonConcepts.introduces.includes('syntax:slicing'), 'AC-STR-REVERSE-01 must introduce slicing')
assert.ok(!reversePublic.pythonConcepts.introduces.includes('builtin:range'), 'AC-STR-REVERSE-01 must not introduce builtin:range')

// 37 AC-STR-PALIN-37
const palinPublic = PUBLIC_KERNELS['AC-STR-PALIN-37']
const palinPrivate = getPrivateProblemDefinition('AC-STR-PALIN-37', 1)
for (const t of [...palinPublic.assessment.publicTests, ...palinPrivate.hiddenTests]) {
  assert.ok(typeof t.inputs.message === 'string' && t.inputs.message.length >= 1 && t.inputs.message.length <= 20, `PALIN-37 message length out of range: ${t.inputs.message}`)
  assert.ok(/^[A-Z]+$/.test(t.inputs.message), `PALIN-37 message must contain uppercase letters only: ${t.inputs.message}`)
  assert.equal(typeof t.expected, 'boolean', 'PALIN-37 must return a Boolean result')
}

// 38 AC-SEQ-ROTATE-38
const rotatePublic = PUBLIC_KERNELS['AC-SEQ-ROTATE-38']
const rotatePrivate = getPrivateProblemDefinition('AC-SEQ-ROTATE-38', 1)
assert.ok(
  rotatePublic.thinkingPatterns.introduces.includes('pattern:boundary-wraparound'),
  'AC-SEQ-ROTATE-38 must introduce pattern:boundary-wraparound'
)
for (const t of [...rotatePublic.assessment.publicTests, ...rotatePrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.cargos) && t.inputs.cargos.length >= 1 && t.inputs.cargos.length <= 20, `ROTATE-38 cargos length out of range: ${t.inputs.cargos.length}`)
  for (const c of t.inputs.cargos) {
    assert.ok(Number.isInteger(c) && c >= -100 && c <= 100, `ROTATE-38 cargo value out of range: ${c}`)
  }
  assert.ok(Array.isArray(t.expected) && t.expected.length === t.inputs.cargos.length, 'ROTATE-38 must preserve list length')
}
assert.equal(
  JSON.stringify(rotatePublic.assessment.transferChallenges[0].thoughtCheck).includes('signals[1:]'),
  false,
  'ROTATE-38 transfer thought check must not expose the solution slice'
)

// 39 AC-STR-COMPRESS-39
const compressPublic = PUBLIC_KERNELS['AC-STR-COMPRESS-39']
const compressPrivate = getPrivateProblemDefinition('AC-STR-COMPRESS-39', 1)
const compressPattern = PROBLEM_SOLVING_PATTERN_REGISTRY['pattern:run-boundary-flush']
assert.ok(
  compressPublic.thinkingPatterns.introduces.includes('pattern:run-boundary-flush'),
  'AC-STR-COMPRESS-39 must introduce pattern:run-boundary-flush'
)
for (const t of [...compressPublic.assessment.publicTests, ...compressPrivate.hiddenTests]) {
  assert.ok(typeof t.inputs.signal === 'string' && t.inputs.signal.length >= 1 && t.inputs.signal.length <= 20, `COMPRESS-39 signal length out of range: ${t.inputs.signal}`)
  assert.ok(/^[A-Z]+$/.test(t.inputs.signal), `COMPRESS-39 signal must be uppercase: ${t.inputs.signal}`)
  assert.ok(Array.isArray(t.expected), 'COMPRESS-39 expected must be an array of groups')
  for (let i = 0; i < t.expected.length; i++) {
    const [sym, count] = t.expected[i]
    assert.ok(typeof sym === 'string' && sym.length === 1, `COMPRESS-39 invalid symbol: ${sym}`)
    assert.ok(Number.isInteger(count) && count >= 1, `COMPRESS-39 count must be positive integer: ${count}`)
    if (i > 0) {
      assert.notEqual(sym, t.expected[i - 1][0], 'COMPRESS-39 adjacent groups must have different symbols')
    }
  }
  const reconstructed = t.expected.map(([sym, count]) => sym.repeat(count)).join('')
  assert.equal(reconstructed, t.inputs.signal, 'COMPRESS-39 expanded groups must match original signal')
}
for (const transfer of [compressPublic.assessment.transferChallenges[0], compressPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.readings) && t.inputs.readings.length >= 1 && t.inputs.readings.length <= 15, 'COMPRESS-39 transfer readings length must be 1..15')
    assert.ok(t.inputs.readings.every((value) => Number.isInteger(value) && value >= -100 && value <= 100), 'COMPRESS-39 transfer readings must contain bounded integers')
    const reconstructed = t.expected.flatMap(([value, count]) => Array(count).fill(value))
    assert.deepEqual(reconstructed, t.inputs.readings, 'COMPRESS-39 transfer groups must reconstruct the input')
  }
}

// 40 AC-STR-PATTERN-40
const patternPublic = PUBLIC_KERNELS['AC-STR-PATTERN-40']
const patternPrivate = getPrivateProblemDefinition('AC-STR-PATTERN-40', 1)
const slidingPattern = PROBLEM_SOLVING_PATTERN_REGISTRY['pattern:sliding-window-scan']
assert.ok(
  patternPublic.thinkingPatterns.introduces.includes('pattern:sliding-window-scan'),
  'AC-STR-PATTERN-40 must introduce pattern:sliding-window-scan'
)
for (const t of [...patternPublic.assessment.publicTests, ...patternPrivate.hiddenTests]) {
  assert.ok(typeof t.inputs.message === 'string' && t.inputs.message.length >= 0 && t.inputs.message.length <= 30, `PATTERN-40 message length out of range: ${t.inputs.message}`)
  assert.ok(/^[IO]*$/.test(t.inputs.message), `PATTERN-40 message must contain only I and O: ${t.inputs.message}`)
  assert.ok(Number.isInteger(t.expected) && t.expected >= 0, `PATTERN-40 expected must be non-negative integer: ${t.expected}`)
  let expected = 0
  for (let start = 0; start <= t.inputs.message.length - 3; start += 1) {
    if (t.inputs.message.slice(start, start + 3) === 'IOI') expected += 1
  }
  assert.equal(t.expected, expected, `PATTERN-40 expected count mismatch: ${t.inputs.message}`)
}

for (const transfer of [patternPublic.assessment.transferChallenges[0], patternPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.beacons) && t.inputs.beacons.length <= 30, 'PATTERN-40 transfer beacons length must be 0..30')
    assert.ok(t.inputs.beacons.every((value) => value === 0 || value === 1), 'PATTERN-40 transfer beacons must contain only 0 or 1')
    let expected = 0
    for (let start = 0; start <= t.inputs.beacons.length - 3; start += 1) {
      if (t.inputs.beacons[start] === 1 && t.inputs.beacons[start + 1] === 0 && t.inputs.beacons[start + 2] === 1) expected += 1
    }
    assert.equal(t.expected, expected, `PATTERN-40 transfer expected count mismatch: ${JSON.stringify(t.inputs.beacons)}`)
  }
}

const branch39And40 = [
  { publicKernel: compressPublic, privateDef: compressPrivate, pattern: compressPattern },
  { publicKernel: patternPublic, privateDef: patternPrivate, pattern: slidingPattern },
]
const solutionSyntaxPattern = /\b(?:def|for|if|return)\b|\.append\s*\(|\[-?\d*:\]/
const unsupportedStudentToolPattern = /\b(?:len|range|str)\s*\(|\.(?:join|find|count)\s*\(/
for (const { publicKernel, privateDef, pattern } of branch39And40) {
  const understandingGuidance = publicKernel.assessment.understandingChallenges.map((challenge) => ({
    title: challenge.title,
    prompt: challenge.prompt,
    questions: challenge.questions.map((question) => ({
      text: question.text,
      optionLabels: question.options.map((option) => option.label),
    })),
  }))
  const transfer = publicKernel.assessment.transferChallenges[0]
  const assessmentGuidance = JSON.stringify({
    understandingGuidance,
    transfer: {
      title: transfer.title,
      description: transfer.description,
      contextCard: transfer.contextCard,
      thoughtCheck: transfer.thoughtCheck,
    },
  })
  assert.equal(solutionSyntaxPattern.test(assessmentGuidance), false, `${publicKernel.id} assessment guidance must not expose solution syntax`)

  const discoveryText = JSON.stringify({
    observe: publicKernel.modes.observe,
    explore: publicKernel.modes.explore,
    firstEncounter: { tinyExample: pattern.tinyExample, syntaxExample: pattern.syntaxExample },
  })
  assert.equal(solutionSyntaxPattern.test(discoveryText), false, `${publicKernel.id} discovery flow must use thinking language instead of complete solution syntax`)

  const acceptedCodes = [privateDef.officialSolutionCode, ...(privateDef.alternativeSolutions || [])]
  assert.equal(acceptedCodes.some((code) => unsupportedStudentToolPattern.test(code)), false, `${publicKernel.id} accepted solutions must not depend on unlearned convenience tools`)

  const executableCodes = [
    publicKernel.modes.code.starterCode,
    transfer.starterCode,
    privateDef.officialSolutionCode,
    ...(privateDef.alternativeSolutions || []),
    ...privateDef.intendedWrongFixtures.map((fixture) => fixture.code),
    ...privateDef.transferMasterSet.map((challenge) => challenge.officialSolutionCode),
  ]
  assert.equal(executableCodes.some((code) => /\bwindow\b/.test(code)), false, `${publicKernel.id} executable code must not use the sandbox-reserved window identifier`)
}

// 19. Constellation 4 (41~48) Set & Dictionary Foundations Domain & Quality Contracts
const c4ProblemIds = [
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
]
for (const problemId of c4ProblemIds) {
  const publicKernel = PUBLIC_KERNELS[problemId]
  const privateDef = getPrivateProblemDefinition(problemId, 1)
  const publicInputs = new Set(publicKernel.assessment.publicTests.map(inputKey))
  assert.equal(
    privateDef.hiddenTests.some((test) => publicInputs.has(inputKey(test))),
    false,
    `${problemId} hidden tests must not repeat public inputs`
  )

  const publicTransfer = publicKernel.assessment.transferChallenges[0]
  const privateTransfer = privateDef.transferMasterSet[0]
  const publicContextText = JSON.stringify(publicTransfer.contextCard || {})
  const solutionSyntaxPattern = /\b(?:def|for|if|return)\b|=/
  assert.equal(
    solutionSyntaxPattern.test(publicContextText),
    false,
    `${problemId} transfer context must guide the strategy without exposing solution code`
  )
  assert.deepEqual(
    privateTransfer.contextCard,
    publicTransfer.contextCard,
    `${problemId} public/private transfer context must stay synchronized`
  )
  assert.deepEqual(
    privateDef.understandingChallenges,
    publicKernel.assessment.understandingChallenges,
    `${problemId} public/private understanding challenge must stay synchronized`
  )
  for (const field of [
    'transferChallengeId',
    'title',
    'description',
    'thoughtCheck',
    'entryFunction',
    'starterCode',
  ]) {
    assert.deepEqual(
      privateTransfer[field],
      publicTransfer[field],
      `${problemId} transfer ${field} must stay synchronized`
    )
  }
  const previewInputs = new Set((publicTransfer.testCases || []).map(inputKey))
  assert.ok(previewInputs.size >= 2, `${problemId} must provide at least two preview cases`)
  assert.equal(
    privateTransfer.testCases.some((test) => previewInputs.has(inputKey(test))),
    false,
    `${problemId} authoritative transfer tests must not repeat client preview inputs`
  )

  for (const primitive of publicKernel.evidenceRecipe.primitives) {
    assert.ok(validEvidencePrimitives.has(primitive), `${problemId} uses unsupported evidence primitive: ${primitive}`)
  }

  const baseWithinBudget = evaluateBaseSubmission(
    problemId,
    publicKernel.version,
    privateDef.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(baseWithinBudget.passed, true, `${problemId} official Base must pass within 20,000 steps`)

  const transferWithinBudget = evaluateTransferSubmission(
    problemId,
    publicKernel.version,
    privateTransfer.transferChallengeId,
    privateTransfer.officialSolutionCode,
    { maxCumulativeSteps: 20_000 }
  )
  assert.equal(transferWithinBudget.passed, true, `${problemId} official Transfer must pass within 20,000 steps`)
}

// Discovery must establish the mental model before First Encounter reveals syntax.
const uniqueDiscoveryText = JSON.stringify({
  observe: PUBLIC_KERNELS['AC-SET-UNIQUE-01'].modes.observe,
  explore: PUBLIC_KERNELS['AC-SET-UNIQUE-01'].modes.explore,
})
assert.equal(/\.add\s*\(/.test(uniqueDiscoveryText), false, 'SET-01 must not expose .add() before its First Encounter at SET-43')
assert.equal(uniqueDiscoveryText.includes('집합'), false, 'SET-01 discovery must establish the unique-container idea before naming set')
assert.equal(PUBLIC_KERNELS['AC-SET-UNIQUE-01'].modes.explore.lensConfig.frames.length, 5, 'SET-01 discovery must represent all five observed minerals')

const membershipDiscoveryText = JSON.stringify({
  observe: PUBLIC_KERNELS['AC-SET-MEMBERSHIP-42'].modes.observe,
  explore: PUBLIC_KERNELS['AC-SET-MEMBERSHIP-42'].modes.explore,
})
assert.equal(/\bin\b/.test(membershipDiscoveryText), false, 'MEMBERSHIP-42 discovery must precede the in syntax First Encounter')
assert.equal(
  PUBLIC_KERNELS['AC-SET-MEMBERSHIP-42'].pythonConcepts.requires.includes('builtin:set'),
  false,
  'MEMBERSHIP-42 must not imply that a one-off membership query requires set conversion'
)
assert.equal(
  /\bset\s*\(/.test(getPrivateProblemDefinition('AC-SET-MEMBERSHIP-42', 1).officialSolutionCode),
  false,
  'MEMBERSHIP-42 official solution must avoid an unnecessary set allocation'
)

const intersectDiscoveryText = JSON.stringify({
  observe: PUBLIC_KERNELS['AC-SET-INTERSECT-43'].modes.observe,
  explore: PUBLIC_KERNELS['AC-SET-INTERSECT-43'].modes.explore,
})
assert.equal(/\.add\s*\(/.test(intersectDiscoveryText), false, 'INTERSECT-43 discovery must precede the .add() syntax First Encounter')

// AC-SET-UNIQUE-01 is an existing v1 anchor. These identifiers are progress/replay compatibility keys.
const compatibilityUniquePublic = PUBLIC_KERNELS['AC-SET-UNIQUE-01']
assert.equal(compatibilityUniquePublic.version, 1, 'SET-01 must preserve problemVersion 1')
assert.equal(compatibilityUniquePublic.modes.code.entryFunction, 'count_unique_minerals', 'SET-01 must preserve its entry function')
assert.equal(compatibilityUniquePublic.assessment.understandingChallenges[0].challengeId, 'uc_set_041_1', 'SET-01 must preserve its understanding challenge ID')
assert.equal(compatibilityUniquePublic.assessment.transferChallenges[0].transferChallengeId, 'tc_set_041_transfer_1', 'SET-01 must preserve its transfer challenge ID')

// 41 AC-SET-UNIQUE-01
const uniquePublic = PUBLIC_KERNELS['AC-SET-UNIQUE-01']
const uniquePrivate = getPrivateProblemDefinition('AC-SET-UNIQUE-01', 1)
assert.ok(
  uniquePublic.pythonConcepts.introduces.includes('builtin:set') && uniquePublic.pythonConcepts.introduces.includes('builtin:len'),
  'AC-SET-UNIQUE-01 must introduce builtin:set and builtin:len'
)
assert.ok(
  !uniquePublic.pythonConcepts.introduces.includes('method:set_add'),
  'AC-SET-UNIQUE-01 must not introduce method:set_add'
)
assert.ok(
  uniquePublic.thinkingPatterns.introduces.includes('pattern:deduplicate-then-measure'),
  'AC-SET-UNIQUE-01 must introduce pattern:deduplicate-then-measure'
)
for (const t of [...uniquePublic.assessment.publicTests, ...uniquePrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.minerals) && t.inputs.minerals.length >= 0 && t.inputs.minerals.length <= 20, `SET-01 minerals length out of range: ${t.inputs.minerals.length}`)
  const expected = new Set(t.inputs.minerals).size
  assert.equal(t.expected, expected, `SET-01 oracle mismatch for: ${JSON.stringify(t.inputs.minerals)}`)
}
for (const transfer of [uniquePublic.assessment.transferChallenges[0], uniquePrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.planets) && t.inputs.planets.length >= 0 && t.inputs.planets.length <= 20, `SET-01 planets length out of range: ${t.inputs.planets.length}`)
    const expected = new Set(t.inputs.planets).size
    assert.equal(t.expected, expected, `SET-01 transfer oracle mismatch for: ${JSON.stringify(t.inputs.planets)}`)
  }
}

// 42 AC-SET-MEMBERSHIP-42
const membershipPublic = PUBLIC_KERNELS['AC-SET-MEMBERSHIP-42']
const membershipPrivate = getPrivateProblemDefinition('AC-SET-MEMBERSHIP-42', 1)
assert.ok(
  membershipPublic.pythonConcepts.introduces.includes('operator:membership-in'),
  'AC-SET-MEMBERSHIP-42 must introduce operator:membership-in'
)
assert.ok(
  membershipPublic.thinkingPatterns.introduces.includes('pattern:membership-query'),
  'AC-SET-MEMBERSHIP-42 must introduce pattern:membership-query'
)
for (const t of [...membershipPublic.assessment.publicTests, ...membershipPrivate.hiddenTests]) {
  assert.ok(typeof t.inputs.passenger === 'string', 'MEMBERSHIP-42 passenger must be string')
  assert.ok(Array.isArray(t.inputs.manifest) && t.inputs.manifest.length >= 0 && t.inputs.manifest.length <= 20, `MEMBERSHIP-42 manifest length out of range: ${t.inputs.manifest.length}`)
  const expected = t.inputs.manifest.includes(t.inputs.passenger)
  assert.equal(t.expected, expected, `MEMBERSHIP-42 oracle mismatch for: ${JSON.stringify(t.inputs)}`)
}
for (const transfer of [membershipPublic.assessment.transferChallenges[0], membershipPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(typeof t.inputs.part === 'string', 'MEMBERSHIP-42 transfer part must be string')
    assert.ok(Array.isArray(t.inputs.inventory) && t.inputs.inventory.length >= 0 && t.inputs.inventory.length <= 20, `MEMBERSHIP-42 inventory length out of range: ${t.inputs.inventory.length}`)
    const expected = t.inputs.inventory.includes(t.inputs.part)
    assert.equal(t.expected, expected, `MEMBERSHIP-42 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`)
  }
}

// 43 AC-SET-INTERSECT-43
const intersectPublic = PUBLIC_KERNELS['AC-SET-INTERSECT-43']
const intersectPrivate = getPrivateProblemDefinition('AC-SET-INTERSECT-43', 1)
assert.ok(
  intersectPublic.pythonConcepts.introduces.includes('method:set_add'),
  'AC-SET-INTERSECT-43 must introduce method:set_add'
)
assert.ok(
  intersectPublic.thinkingPatterns.introduces.includes('pattern:intersection-by-membership'),
  'AC-SET-INTERSECT-43 must introduce pattern:intersection-by-membership'
)
for (const t of [...intersectPublic.assessment.publicTests, ...intersectPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.base_a) && t.inputs.base_a.length >= 0 && t.inputs.base_a.length <= 20, `INTERSECT-43 base_a length out of range: ${t.inputs.base_a.length}`)
  assert.ok(Array.isArray(t.inputs.base_b) && t.inputs.base_b.length >= 0 && t.inputs.base_b.length <= 20, `INTERSECT-43 base_b length out of range: ${t.inputs.base_b.length}`)
  const expected = new Set(t.inputs.base_a.filter((x) => t.inputs.base_b.includes(x))).size
  assert.equal(t.expected, expected, `INTERSECT-43 oracle mismatch for: ${JSON.stringify(t.inputs)}`)
}
for (const transfer of [intersectPublic.assessment.transferChallenges[0], intersectPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.badges_a) && t.inputs.badges_a.length >= 0 && t.inputs.badges_a.length <= 20, `INTERSECT-43 transfer badges_a length out of range: ${t.inputs.badges_a.length}`)
    assert.ok(Array.isArray(t.inputs.badges_b) && t.inputs.badges_b.length >= 0 && t.inputs.badges_b.length <= 20, `INTERSECT-43 transfer badges_b length out of range: ${t.inputs.badges_b.length}`)
    const expected = new Set(t.inputs.badges_a.filter((x) => t.inputs.badges_b.includes(x))).size
    assert.equal(t.expected, expected, `INTERSECT-43 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`)
  }
}

// 44 AC-DICT-FREQ-44
const freqPublic = PUBLIC_KERNELS['AC-DICT-FREQ-44']
const freqPrivate = getPrivateProblemDefinition('AC-DICT-FREQ-44', 1)
assert.ok(
  freqPublic.pythonConcepts.introduces.includes('builtin:dict'),
  'AC-DICT-FREQ-44 must introduce builtin:dict'
)
assert.ok(
  freqPublic.thinkingPatterns.introduces.includes('pattern:frequency-table'),
  'AC-DICT-FREQ-44 must introduce pattern:frequency-table'
)
for (const t of [...freqPublic.assessment.publicTests, ...freqPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.signals) && t.inputs.signals.length >= 0 && t.inputs.signals.length <= 20, `FREQ-44 signals length out of range: ${t.inputs.signals.length}`)
  const oracle = t.inputs.signals.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  assert.deepEqual(t.expected, oracle, `FREQ-44 oracle mismatch for: ${JSON.stringify(t.inputs)}`)
}
for (const transfer of [freqPublic.assessment.transferChallenges[0], freqPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.votes) && t.inputs.votes.length >= 0 && t.inputs.votes.length <= 20, `FREQ-44 transfer votes length out of range: ${t.inputs.votes.length}`)
    const oracle = t.inputs.votes.reduce((acc, v) => {
      acc[v] = (acc[v] || 0) + 1
      return acc
    }, {})
    assert.deepEqual(t.expected, oracle, `FREQ-44 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`)
  }
}

// 45 AC-DICT-MODE-45
const modePublic = PUBLIC_KERNELS['AC-DICT-MODE-45']
const modePrivate = getPrivateProblemDefinition('AC-DICT-MODE-45', 1)
assert.ok(
  modePublic.thinkingPatterns.introduces.includes('pattern:argmax-by-associated-value'),
  'AC-DICT-MODE-45 must introduce pattern:argmax-by-associated-value'
)
for (const t of [...modePublic.assessment.publicTests, ...modePrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.signals) && t.inputs.signals.length >= 1 && t.inputs.signals.length <= 20, `MODE-45 signals length out of range: ${t.inputs.signals.length}`)
  const freq = t.inputs.signals.reduce((acc, s) => {
    acc[s] = (acc[s] || 0) + 1
    return acc
  }, {})
  let best = t.inputs.signals[0]
  for (const s of t.inputs.signals) {
    if (freq[s] > freq[best]) best = s
  }
  assert.equal(t.expected, best, `MODE-45 oracle mismatch for: ${JSON.stringify(t.inputs)}`)
}
for (const transfer of [modePublic.assessment.transferChallenges[0], modePrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.badges) && t.inputs.badges.length >= 1 && t.inputs.badges.length <= 20, `MODE-45 transfer badges length out of range: ${t.inputs.badges.length}`)
    const freq = t.inputs.badges.reduce((acc, b) => {
      acc[b] = (acc[b] || 0) + 1
      return acc
    }, {})
    let best = t.inputs.badges[0]
    for (const b of t.inputs.badges) {
      if (freq[b] > freq[best]) best = b
    }
    assert.equal(t.expected, best, `MODE-45 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`)
  }
}

// 46 AC-DICT-STOCK-46
const stockPublic = PUBLIC_KERNELS['AC-DICT-STOCK-46']
const stockPrivate = getPrivateProblemDefinition('AC-DICT-STOCK-46', 1)
assert.ok(
  stockPublic.thinkingPatterns.introduces.includes('pattern:keyed-state-update'),
  'AC-DICT-STOCK-46 must introduce pattern:keyed-state-update'
)
for (const t of [...stockPublic.assessment.publicTests, ...stockPrivate.hiddenTests]) {
  assert.ok(typeof t.inputs.stock === 'object' && t.inputs.stock !== null, 'STOCK-46 stock must be object')
  assert.ok(Array.isArray(t.inputs.updates), 'STOCK-46 updates must be array')
  assert.ok(typeof t.inputs.requested_part === 'string', 'STOCK-46 requested_part must be string')
  const simulated = { ...t.inputs.stock }
  for (const [part, amount] of t.inputs.updates) {
    simulated[part] = (simulated[part] || 0) + amount
  }
  const expected = simulated[t.inputs.requested_part] || 0
  assert.equal(t.expected, expected, `STOCK-46 oracle mismatch for: ${JSON.stringify(t.inputs)}`)
}
for (const transfer of [stockPublic.assessment.transferChallenges[0], stockPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    const simulated = { ...t.inputs.initial_scores }
    for (const [team, score] of t.inputs.bonus_events) {
      simulated[team] = (simulated[team] || 0) + score
    }
    const expected = simulated[t.inputs.requested_crew] || 0
    assert.equal(t.expected, expected, `STOCK-46 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`)
  }
}

// Independent Oracle for Two Sum (distinct index pair)
function hasDistinctPairOracle(values, target) {
  for (let i = 0; i < values.length; i += 1) {
    for (let j = i + 1; j < values.length; j += 1) {
      if (values[i] + values[j] === target) return true
    }
  }
  return false
}

// 47 AC-DICT-TWOSUM-47
const twosumPublic = PUBLIC_KERNELS['AC-DICT-TWOSUM-47']
const twosumPrivate = getPrivateProblemDefinition('AC-DICT-TWOSUM-47', 1)
assert.ok(
  twosumPublic.thinkingPatterns.introduces.includes('pattern:complement-search'),
  'AC-DICT-TWOSUM-47 must introduce pattern:complement-search'
)
for (const t of [...twosumPublic.assessment.publicTests, ...twosumPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.energies) && t.inputs.energies.length >= 0 && t.inputs.energies.length <= 20, `TWOSUM-47 energies length out of range: ${t.inputs.energies.length}`)
  assert.ok(typeof t.inputs.target === 'number', 'TWOSUM-47 target must be number')
  for (const e of t.inputs.energies) {
    assert.ok(e >= -50 && e <= 50, `TWOSUM-47 energy element out of domain [-50, 50]: ${e}`)
  }
  assert.ok(t.inputs.target >= -100 && t.inputs.target <= 100, `TWOSUM-47 target out of domain [-100, 100]: ${t.inputs.target}`)
  const oracle = hasDistinctPairOracle(t.inputs.energies, t.inputs.target)
  assert.equal(t.expected, oracle, `TWOSUM-47 oracle mismatch for: ${JSON.stringify(t.inputs)}`)
}
for (const transfer of [twosumPublic.assessment.transferChallenges[0], twosumPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.weights) && t.inputs.weights.length >= 0 && t.inputs.weights.length <= 20, `TWOSUM-47 transfer weights length out of range: ${t.inputs.weights.length}`)
    assert.ok(typeof t.inputs.capacity === 'number', 'TWOSUM-47 capacity must be number')
    const oracle = hasDistinctPairOracle(t.inputs.weights, t.inputs.capacity)
    assert.equal(t.expected, oracle, `TWOSUM-47 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`)
  }
}

// 48 AC-DICT-ONESHOT-48
const oneshotPublic = PUBLIC_KERNELS['AC-DICT-ONESHOT-48']
const oneshotPrivate = getPrivateProblemDefinition('AC-DICT-ONESHOT-48', 1)
assert.ok(
  oneshotPublic.thinkingPatterns.introduces.includes('pattern:remember-then-query'),
  'AC-DICT-ONESHOT-48 must introduce pattern:remember-then-query'
)
for (const t of [...oneshotPublic.assessment.publicTests, ...oneshotPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.energies) && t.inputs.energies.length >= 0 && t.inputs.energies.length <= 20, `ONESHOT-48 energies length out of range: ${t.inputs.energies.length}`)
  assert.ok(typeof t.inputs.target === 'number', 'ONESHOT-48 target must be number')
  for (const e of t.inputs.energies) {
    assert.ok(e >= -50 && e <= 50, `ONESHOT-48 energy element out of domain [-50, 50]: ${e}`)
  }
  assert.ok(t.inputs.target >= -100 && t.inputs.target <= 100, `ONESHOT-48 target out of domain [-100, 100]: ${t.inputs.target}`)
  const oracle = hasDistinctPairOracle(t.inputs.energies, t.inputs.target)
  assert.equal(t.expected, oracle, `ONESHOT-48 oracle mismatch for: ${JSON.stringify(t.inputs)}`)
}
for (const transfer of [oneshotPublic.assessment.transferChallenges[0], oneshotPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.times) && t.inputs.times.length >= 0 && t.inputs.times.length <= 20, `ONESHOT-48 transfer times length out of range: ${t.inputs.times.length}`)
    assert.ok(typeof t.inputs.required_time === 'number', 'ONESHOT-48 required_time must be number')
    const oracle = hasDistinctPairOracle(t.inputs.times, t.inputs.required_time)
    assert.equal(t.expected, oracle, `ONESHOT-48 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`)
  }
}

// 49 AC-DICT-ANAGRAM-49
// Independent Oracle: Map 기반 빈도 signature를 key 기준 정렬해 deep 비교한다.
// 공식 Python 구현을 번역한 plain object 비교는 피한다.
function frequencyOf(values) {
  const counts = new Map()
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1)
  return [...counts.entries()].sort(([a], [b]) => String(a).localeCompare(String(b)))
}
function sameFrequencySignature(valuesA, valuesB) {
  const signatureA = JSON.stringify(frequencyOf(valuesA))
  const signatureB = JSON.stringify(frequencyOf(valuesB))
  return signatureA === signatureB
}

const anagramPublic = PUBLIC_KERNELS['AC-DICT-ANAGRAM-49']
const anagramPrivate = getPrivateProblemDefinition('AC-DICT-ANAGRAM-49', 1)
assert.ok(
  anagramPublic.thinkingPatterns.introduces.includes('pattern:frequency-signature-comparison'),
  'AC-DICT-ANAGRAM-49 must introduce pattern:frequency-signature-comparison'
)
assert.ok(
  anagramPublic.pythonConcepts.requires.includes('operator:equality'),
  'AC-DICT-ANAGRAM-49 must declare the operator:equality dependency for structural dict comparison'
)
const packetDomain = (value) => typeof value === 'string' && value.length <= 20 && /^[A-Z]*$/.test(value)
for (const t of [...anagramPublic.assessment.publicTests, ...anagramPrivate.hiddenTests]) {
  assert.ok(packetDomain(t.inputs.packet_a), `ANAGRAM-49 packet_a out of domain: ${JSON.stringify(t.inputs.packet_a)}`)
  assert.ok(packetDomain(t.inputs.packet_b), `ANAGRAM-49 packet_b out of domain: ${JSON.stringify(t.inputs.packet_b)}`)
  assert.equal(typeof t.expected, 'boolean', `ANAGRAM-49 expected must be boolean: ${JSON.stringify(t.inputs)}`)
  assert.equal(
    t.expected,
    sameFrequencySignature(t.inputs.packet_a, t.inputs.packet_b),
    `ANAGRAM-49 oracle mismatch for: ${JSON.stringify(t.inputs)}`
  )
}
// The empty-vs-nonempty boundary must be covered in BOTH directions: a suite
// with only ('' , 'A') lets an asymmetric solution that returns True whenever
// packet_b is empty pass, and vice versa.
assert.ok(
  anagramPrivate.hiddenTests.some((t) => t.inputs.packet_a === '' && t.inputs.packet_b !== ''),
  'ANAGRAM-49 hidden suite must cover empty packet_a vs non-empty packet_b'
)
assert.ok(
  anagramPrivate.hiddenTests.some((t) => t.inputs.packet_a !== '' && t.inputs.packet_b === ''),
  'ANAGRAM-49 hidden suite must cover non-empty packet_a vs empty packet_b (asymmetric solutions must fail)'
)
assert.ok(
  anagramPrivate.hiddenTests.some((t) => t.inputs.packet_a === '' && t.inputs.packet_b === '' && t.expected === true),
  'ANAGRAM-49 hidden suite must cover two empty packets being equivalent'
)
for (const transfer of [anagramPublic.assessment.transferChallenges[0], anagramPrivate.transferMasterSet[0]]) {
  for (const t of transfer.testCases) {
    assert.ok(Array.isArray(t.inputs.badges_a) && t.inputs.badges_a.length <= 20, `ANAGRAM-49 transfer badges_a length out of range: ${t.inputs.badges_a.length}`)
    assert.ok(Array.isArray(t.inputs.badges_b) && t.inputs.badges_b.length <= 20, `ANAGRAM-49 transfer badges_b length out of range: ${t.inputs.badges_b.length}`)
    assert.equal(
      t.expected,
      sameFrequencySignature(t.inputs.badges_a, t.inputs.badges_b),
      `ANAGRAM-49 transfer oracle mismatch for: ${JSON.stringify(t.inputs)}`
    )
  }
}
// The authoritative transfer suite must also cover the empty boundary in BOTH
// directions, so asymmetric one-sided solutions fail 3-star evaluation.
const anagramTransferAuthoritative = anagramPrivate.transferMasterSet[0].testCases
assert.ok(
  anagramTransferAuthoritative.some((t) => t.inputs.badges_a.length === 0 && t.inputs.badges_b.length > 0 && t.expected === false),
  'ANAGRAM-49 authoritative transfer must fail empty badges_a vs non-empty badges_b'
)
assert.ok(
  anagramTransferAuthoritative.some((t) => t.inputs.badges_a.length > 0 && t.inputs.badges_b.length === 0 && t.expected === false),
  'ANAGRAM-49 authoritative transfer must fail non-empty badges_a vs empty badges_b'
)

// 50 AC-DICT-BUG-50
const bugfixPublic = PUBLIC_KERNELS['AC-DICT-BUG-50']
const bugfixPrivate = getPrivateProblemDefinition('AC-DICT-BUG-50', 1)
assert.ok(
  bugfixPublic.thinkingPatterns.introduces.includes('pattern:first-state-divergence'),
  'AC-DICT-BUG-50 must introduce pattern:first-state-divergence'
)
assert.deepEqual(
  bugfixPublic.curriculum.prerequisites,
  ['AC-DICT-FREQ-44', 'AC-CODE-FIRST-ERROR-01'],
  'AC-DICT-BUG-50 must declare both 44 and AC-CODE-FIRST-ERROR-01 prerequisites'
)
function countsToSortedEntries(counts) {
  return Object.entries(counts).sort(([a], [b]) => String(a).localeCompare(String(b)))
}
for (const t of [...bugfixPublic.assessment.publicTests, ...bugfixPrivate.hiddenTests]) {
  assert.ok(Array.isArray(t.inputs.signals) && t.inputs.signals.length <= 20, `BUG-50 signals length out of range: ${t.inputs.signals.length}`)
  const oracle = new Map()
  for (const signal of t.inputs.signals) oracle.set(signal, (oracle.get(signal) || 0) + 1)
  assert.deepEqual(
    countsToSortedEntries(t.expected),
    [...oracle.entries()].sort(([a], [b]) => String(a).localeCompare(String(b))),
    `BUG-50 oracle mismatch for: ${JSON.stringify(t.inputs)}`
  )
}
assert.ok(
  bugfixPrivate.hiddenTests.some((t) => t.inputs.signals.length === 0),
  'BUG-50 hidden suite must keep the empty-input regression guard'
)
// Starter failure contract: the shipped buggy starter must ACTUALLY fail the
// Base judge (['A'] -> {A: 0} instead of {A: 1}) and the buggy Transfer
// starter must ACTUALLY fail the Transfer judge on a repeated-vote case.
const bugStarterResult = evaluateBaseSubmission('AC-DICT-BUG-50', 1, bugfixPublic.modes.code.starterCode)
assert.equal(bugStarterResult.passed, false, 'BUG-50 public starter (initializes 0) must fail the Base judge before repair')
const bugTransferChallenge = bugfixPrivate.transferMasterSet[0]
const bugTransferStarterResult = evaluateTransferSubmission(
  'AC-DICT-BUG-50',
  1,
  bugTransferChallenge.transferChallengeId,
  bugTransferChallenge.starterCode
)
assert.equal(bugTransferStarterResult.passed, false, 'BUG-50 transfer starter (resets repeat votes) must fail the Transfer judge before repair')
// Representative wrong fixtures are rejected by the Base judge (declared group
// targeting is already enforced by Invariant 5).
for (const fixture of bugfixPrivate.intendedWrongFixtures) {
  const result = evaluateBaseSubmission('AC-DICT-BUG-50', 1, fixture.code)
  assert.equal(result.passed, false, `BUG-50 fixture ${fixture.id} must be rejected by the Base judge`)
}
// Transfer official solution must genuinely differ from the Base repair (the
// repeat branch is the bug, initialization is correct) yet pass fully.
const bugTransferOfficialResult = evaluateTransferSubmission(
  'AC-DICT-BUG-50',
  1,
  bugTransferChallenge.transferChallengeId,
  bugTransferChallenge.officialSolutionCode
)
assert.equal(bugTransferOfficialResult.passed, true, 'BUG-50 transfer official solution must pass fully')

// Pattern Card Syntax Leak Check for 41~50
for (const patternId of [
  'pattern:deduplicate-then-measure',
  'pattern:membership-query',
  'pattern:intersection-by-membership',
  'pattern:frequency-table',
  'pattern:argmax-by-associated-value',
  'pattern:keyed-state-update',
  'pattern:complement-search',
  'pattern:remember-then-query',
  'pattern:frequency-signature-comparison',
  'pattern:first-state-divergence',
]) {
  const pattern = PROBLEM_SOLVING_PATTERN_REGISTRY[patternId]
  assert.ok(pattern, `Pattern registry missing: ${patternId}`)
  const patternText = JSON.stringify({ tinyExample: pattern.tinyExample, syntaxExample: pattern.syntaxExample })
  assert.equal(
    solutionSyntaxPattern.test(patternText),
    false,
    `${patternId} must not leak solution code syntax`
  )
}

assert.equal(registeredProblemIds.length, 54, 'Total registered problems must be exactly 54')
console.log(`✅ All 10 Authoring Invariants PASSED across all ${registeredProblemIds.length} registered problems!`)
