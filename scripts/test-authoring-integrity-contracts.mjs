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

const require = createRequire(import.meta.url)
const { PRIVATE_PROBLEMS, getPrivateProblemDefinition, getTransferChallenges } = require('../functions/algorithmConstellation/problems/index.cjs')
const { evaluateBaseSubmission, evaluateTransferSubmission } = require('../functions/algorithmConstellation/isolatedJudgeRuntime.cjs')

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

console.log(`✅ All 10 Authoring Invariants PASSED across all ${registeredProblemIds.length} registered problems!`)
