import assert from 'assert'
import { createCallableOrchestrator } from '../functions/algorithmConstellation/callableOrchestrator.cjs'
import { createInMemoryAlgorithmStore } from '../functions/algorithmConstellation/algorithmProgressLedger.cjs'
import { evaluateBaseSubmission, evaluateTransferSubmission } from '../functions/algorithmConstellation/isolatedJudgeRuntime.cjs'
import { evaluateAuthoritativeSubmission } from '../functions/algorithmConstellation/algorithmAuthoritativeJudge.cjs'
import { getPrivateProblemDefinition } from '../functions/algorithmConstellation/privateProblemCatalog.cjs'
import { PUBLIC_KERNELS } from '../src/components/AlgorithmConstellation/shared/problems/index.js'

console.log('\n=== Running Server Orchestration & Restricted Judge Tests ===')

const definition = getPrivateProblemDefinition('AC-COND-001', 1)
const store = createInMemoryAlgorithmStore()
let clock = Date.now()
const handlers = createCallableOrchestrator({
  store,
  now: () => clock,
  secretProvider: () => 'test-only-secret-value-with-at-least-32-chars',
})
const auth = (uid) => ({ auth: { uid } })
let requestSequence = 0

function answersFor(challengeId) {
  const challenge = definition.understandingChallenges.find((item) => item.challengeId === challengeId)
  return Object.fromEntries(challenge.questions.map((question) => [question.id, question.expected]))
}

function solutionFor(transferChallenge) {
  if (transferChallenge.entryFunction === 'can_exit') {
    return 'def can_exit(suit_ready, oxygen_ok):\n    return bool(suit_ready and oxygen_ok)\n'
  }
  if (transferChallenge.entryFunction === 'check_gate_3') {
    return 'def check_gate_3(s1, s2, s3):\n    return bool(s1 and s2 and s3)\n'
  }
  if (transferChallenge.entryFunction === 'check_gate_emergency') {
    return 'def check_gate_emergency(s1, s2):\n    return bool(s1 and not s2)\n'
  }
  throw new Error(`No test solution for ${transferChallenge.entryFunction}`)
}

async function completeAttempt(uid, intent = 'learn', assistanceEvent = null) {
  const context = auth(uid)
  const started = await handlers.handleStartAlgorithmAttempt(
    {
      problemId: definition.problemId,
      problemVersion: 1,
      shell: 'explorer',
      intent,
      requestId: `request_${uid}_${++requestSequence}`,
    },
    context
  )
  if (assistanceEvent) {
    const assistance = await handlers.handleRecordAlgorithmAssistance({
      attemptId: started.attemptId,
      eventId: `${assistanceEvent.source}_${started.attemptId}`,
      stage: 'implementation',
      ...assistanceEvent,
    }, context)
    if (assistanceEvent.source === 'external-ai') assert.equal(assistance.rankEligible, false)
    if (assistanceEvent.scaffoldLevel >= 5 || assistanceEvent.source === 'external-ai') {
      assert.equal(assistance.masteryEligible, false)
    }
  }
  const base = await handlers.handleSubmitAlgorithmBase({
    attemptId: started.attemptId,
    submissionId: `base_${started.attemptId}`,
    code: definition.officialSolutionCode,
  }, context)
  assert.equal(base.resultStar, true)
  assert(base.understandingChallenge)
  assert(!base.understandingChallenge.questions.some((question) => Object.hasOwn(question, 'expected')))

  const understanding = await handlers.handleSubmitUnderstandingEvidence({
    attemptId: started.attemptId,
    challengeId: base.understandingChallenge.challengeId,
    answers: answersFor(base.understandingChallenge.challengeId),
  }, context)
  assert.equal(understanding.passed, true)

  const issued = await handlers.handleIssueTransferChallenge({ attemptId: started.attemptId }, context)
  const transfer = await handlers.handleSubmitAlgorithmTransfer({
    attemptId: started.attemptId,
    challengeToken: issued.challengeToken,
    transferCode: solutionFor(issued.transferChallenge),
  }, context)
  return { started, base, issued, transfer }
}

console.log('[Test 1] Restricted judge accepts intended solutions and rejects unsafe/wrong code...')
assert.equal(evaluateBaseSubmission(definition.problemId, 1, definition.officialSolutionCode).resultStar, true)
for (const alternative of definition.alternativeSolutions) {
  assert.equal(evaluateBaseSubmission(definition.problemId, 1, alternative).resultStar, true)
}
for (const wrong of definition.intendedWrongSolutions) {
  if (wrong.expectedFailureGroup !== 'none') {
    assert.equal(evaluateBaseSubmission(definition.problemId, 1, wrong.code).resultStar, false)
  }
}
for (const unsafeCode of [
  'import os\ndef check_gate(s1, s2):\n    return True',
  'def check_gate(s1, s2):\n    return globalThis.process',
  'def check_gate(s1, s2):\n    return s1.__class__',
]) {
  assert.equal(evaluateBaseSubmission(definition.problemId, 1, unsafeCode).resultStar, false)
}

console.log('[Test 2] Authentication, idempotent assistance, and full mastery lifecycle...')
await assert.rejects(
  () => handlers.handleStartAlgorithmAttempt({ problemId: definition.problemId }, {}),
  (error) => error.code === 'UNAUTHENTICATED'
)
const idempotentStartPayload = {
  problemId: definition.problemId,
  problemVersion: 1,
  shell: 'explorer',
  intent: 'learn',
  requestId: 'request_idempotency_probe_01',
}
const firstStart = await handlers.handleStartAlgorithmAttempt(idempotentStartPayload, auth('idempotency_probe'))
const retriedStart = await handlers.handleStartAlgorithmAttempt(idempotentStartPayload, auth('idempotency_probe'))
assert.equal(firstStart.attemptId, retriedStart.attemptId)
const normal = await completeAttempt('student_alpha')
assert.equal(normal.transfer.masteryStatus, 'mastered')
const progress = await handlers.handleGetAlgorithmProgress({ problemId: definition.problemId }, auth('student_alpha'))
assert.equal(progress.bestStars, 3)
assert.equal(progress.masteryStatus, 'mastered')
const allProgress = await handlers.handleGetAlgorithmProgress({ problemId: 'all' }, auth('student_alpha'))
assert.deepEqual(Object.keys(allProgress), [definition.problemId])
assert.equal(allProgress[definition.problemId].bestStars, 3)
assert.equal(Object.hasOwn(allProgress[definition.problemId], 'updatedAt'), false)

console.log('[Test 2b] Newly published Constellation 0~2 problems complete the production callable lifecycle...')
for (const pid of [
  'AC-EXP-SEQ-01',
  'AC-EXP-STEP-03',
  'AC-EXP-BOUND-05',
  'AC-EXP-WHILE-07',
  'AC-EXP-EQUIV-09',
  'AC-EXP-REVERSE-10',
  'AC-COND-NOT-13',
  'AC-COND-ELIF-14',
  'AC-COND-RANGE-15',
  'AC-COND-CLAMP-16',
  'AC-COND-GRADE-17',
  'AC-COND-COMPLEX-18',
  'AC-COND-TOGGLE-19',
  'AC-COND-ORDER-20',
  'AC-PAT-EVEN-23',
  'AC-PAT-DIGIT-24',
  'AC-PAT-REVNUM-25',
  'AC-PAT-DIVISOR-26',
  'AC-PAT-PRIME-27',
  'AC-PAT-GCD-28',
  'AC-PAT-CALENDAR-29',
  'AC-PAT-PRIME-REV-30',
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
]) {
  const waveDefinition = getPrivateProblemDefinition(pid, 1)
  const waveContext = auth(`student_${pid.toLowerCase().replace(/-/g, '_')}`)
  const waveStarted = await handlers.handleStartAlgorithmAttempt({
    problemId: waveDefinition.problemId,
    problemVersion: 1,
    shell: 'explorer',
    intent: 'learn',
    requestId: `request_${pid}_transfer_contract_01`,
  }, waveContext)
  assert.match(
    waveStarted.replayDescriptor.privateDefinitionChecksum,
    /^sha256:[A-Za-z0-9_:-]+$/,
    `${pid} must expose a Firestore-safe private definition checksum`
  )
  const waveBase = await handlers.handleSubmitAlgorithmBase({
    attemptId: waveStarted.attemptId,
    submissionId: `base_${pid}_transfer_contract_01`,
    code: waveDefinition.officialSolutionCode,
  }, waveContext)
  const wavePrivateChallenge = waveDefinition.understandingChallenges.find(
    (item) => item.challengeId === waveBase.understandingChallenge.challengeId
  )
  await handlers.handleSubmitUnderstandingEvidence({
    attemptId: waveStarted.attemptId,
    challengeId: wavePrivateChallenge.challengeId,
    answers: Object.fromEntries(wavePrivateChallenge.questions.map((question) => [question.id, question.expected])),
  }, waveContext)
  const waveIssued = await handlers.handleIssueTransferChallenge({ attemptId: waveStarted.attemptId }, waveContext)
  assert.ok(waveIssued.transferChallenge.starterCode.includes(`def ${waveIssued.transferChallenge.entryFunction}(`))
  const waveTransferDefinition = (waveDefinition.transferMasterSet || waveDefinition.transferChallenges).find(
    (item) => item.transferChallengeId === waveIssued.transferChallenge.transferChallengeId
  )
  // Student-facing scaffold contract: the issued transfer must deliver the
  // context card and thought check exactly as authored, so the UI can render
  // and grade them (authoritative grading itself stays server-side).
  assert.deepEqual(
    waveIssued.transferChallenge.contextCard,
    waveTransferDefinition.contextCard,
    `Issued transfer must deliver the authored contextCard for ${pid}`
  )
  assert.deepEqual(
    waveIssued.transferChallenge.thoughtCheck,
    waveTransferDefinition.thoughtCheck,
    `Issued transfer must deliver the authored thoughtCheck for ${pid}`
  )
  const waveTransfer = await handlers.handleSubmitAlgorithmTransfer({
    attemptId: waveStarted.attemptId,
    challengeToken: waveIssued.challengeToken,
    transferCode: waveTransferDefinition.officialSolutionCode,
  }, waveContext)
  assert.equal(waveTransfer.passed, true, `Lifecycle Transfer submit failed for ${pid}`)
}

console.log('[Test 2c] Constellation 4 Branch (49·50) fixture rejection and 50 starter-failure contract...')
// Representative intended-wrong fixtures must be rejected by the server judge
// (group-targeted rejection is enforced by the authoring Invariant 5).
const branch49Definition = getPrivateProblemDefinition('AC-DICT-ANAGRAM-49', 1)
for (const wrong of branch49Definition.intendedWrongFixtures) {
  assert.equal(
    evaluateBaseSubmission('AC-DICT-ANAGRAM-49', 1, wrong.code).resultStar,
    false,
    `49 fixture ${wrong.id} must be rejected`
  )
}
// 50's shipped Base starter is the repair target: it must be judged WRONG.
const bug50Public = PUBLIC_KERNELS['AC-DICT-BUG-50']
assert.equal(
  evaluateBaseSubmission('AC-DICT-BUG-50', 1, bug50Public.modes.code.starterCode).resultStar,
  false,
  "50 Base starter must fail the judge (['A'] -> {A: 0} instead of {A: 1})"
)
// 50's shipped Transfer starter (reset-bug vote tally) must also be judged WRONG.
const bug50Transfer = getPrivateProblemDefinition('AC-DICT-BUG-50', 1).transferMasterSet[0]
assert.equal(
  evaluateTransferSubmission('AC-DICT-BUG-50', 1, bug50Transfer.transferChallengeId, bug50Transfer.starterCode).passed,
  false,
  "50 Transfer starter must fail the judge (['X', 'X'] -> {X: 1} instead of {X: 2})"
)
console.log('  -> [PASS] Branch 49·50 fixture rejection and 50 starter-failure contract verified')
await assert.rejects(
  () => handlers.handleGetAlgorithmProgress({}, auth('student_alpha')),
  (error) => error.code === 'INVALID_ARGUMENT'
)
const duplicateTransfer = await handlers.handleSubmitAlgorithmTransfer({
  attemptId: normal.started.attemptId,
  challengeToken: normal.issued.challengeToken,
  transferCode: solutionFor(normal.issued.transferChallenge),
}, auth('student_alpha'))
assert.equal(duplicateTransfer.duplicated, true)

console.log('[Test 2d] Constellation 5 (51~60) representative wrong fixtures are rejected by the server judge...')
for (const pid of [
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
]) {
  const c5Definition = getPrivateProblemDefinition(pid, 1)
  const representativeFixture = c5Definition.intendedWrongFixtures[0]
  assert.equal(
    evaluateBaseSubmission(pid, 1, representativeFixture.code).resultStar,
    false,
    `C5 fixture ${representativeFixture.id || representativeFixture.label} of ${pid} must be rejected`
  )
}
console.log('  -> [PASS] Constellation 5 representative fixture rejection verified')

console.log('[Test 2e] Constellation 7 (71~80) representative wrong fixtures and 80 starter-failure contract...')
for (const pid of [
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
]) {
  const c7Def = getPrivateProblemDefinition(pid, 1)
  const repFixture = c7Def.intendedWrongFixtures[0]
  assert.equal(
    evaluateBaseSubmission(pid, 1, repFixture.code).resultStar,
    false,
    `C7 fixture ${repFixture.id} of ${pid} must be rejected`
  )
}
// 80's shipped Base starter is the repair target (uses pop instead of popleft): it must be judged WRONG.
const pop80Public = PUBLIC_KERNELS['AC-QUEUE-POP-80']
assert.equal(
  evaluateBaseSubmission('AC-QUEUE-POP-80', 1, pop80Public.modes.code.starterCode).resultStar,
  false,
  "80 Base starter must fail the judge (uses pop instead of popleft)"
)
// 80's shipped Transfer starter (uses popleft instead of pop): it must also be judged WRONG.
const pop80Transfer = getPrivateProblemDefinition('AC-QUEUE-POP-80', 1).transferMasterSet[0]
assert.equal(
  evaluateTransferSubmission('AC-QUEUE-POP-80', 1, pop80Transfer.transferChallengeId, pop80Transfer.starterCode).passed,
  false,
  "80 Transfer starter must fail the judge (uses popleft instead of pop)"
)
console.log('  -> [PASS] Constellation 7 representative fixture rejection and 80 starter-failure contract verified')

console.log('[Test 2f] Constellation 8 (81~90) representative wrong fixtures and 90 starter-failure contract...')
for (const pid of [
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
]) {
  const c8Def = getPrivateProblemDefinition(pid, 1)
  const repFixture = (c8Def.intendedWrongFixtures || c8Def.intendedWrongSolutions)[0]
  assert.equal(
    evaluateBaseSubmission(pid, 1, repFixture.code).resultStar,
    false,
    `C8 fixture ${repFixture.id || repFixture.label} of ${pid} must be rejected`
  )
}
// 90's shipped Base starter is the repair target: it must be judged WRONG.
const visited90Public = PUBLIC_KERNELS['AC-NAV-VISITED-90']
assert.equal(
  evaluateBaseSubmission('AC-NAV-VISITED-90', 1, visited90Public.modes.code.starterCode).resultStar,
  false,
  "90 Base starter must fail the judge (late visited recording causes duplicate enqueues)"
)
// 90's shipped Transfer starter: it must also be judged WRONG.
const visited90Definition = getPrivateProblemDefinition('AC-NAV-VISITED-90', 1)
const visited90Transfer = (visited90Definition.transferMasterSet || visited90Definition.transferChallenges)[0]
assert.equal(
  evaluateTransferSubmission('AC-NAV-VISITED-90', 1, visited90Transfer.transferChallengeId, visited90Transfer.starterCode).passed,
  false,
  "90 Transfer starter must fail the judge (late visited recording causes duplicate enqueues)"
)
console.log('  -> [PASS] Constellation 8 representative fixture rejection and 90 starter-failure contract verified')

console.log('[Test 3] AI use withholds new mastery, then independent return restores it...')
const aiAttempt = await completeAttempt('student_beta', 'learn', {
  source: 'external-ai', scaffoldLevel: 3, answerExposure: 'unknown',
})
assert.equal(aiAttempt.transfer.masteryStatus, 'pending_independent_return')
assert(aiAttempt.transfer.nextReturnAt > clock)
await assert.rejects(
  () => handlers.handleStartAlgorithmAttempt({
    problemId: definition.problemId,
    intent: 'independent_return',
    requestId: 'request_student_beta_too_early',
  }, auth('student_beta')),
  (error) => error.code === 'FAILED_PRECONDITION'
)
clock = aiAttempt.transfer.nextReturnAt + 1
const independentReturn = await completeAttempt('student_beta', 'independent_return')
assert.equal(independentReturn.transfer.masteryStatus, 'mastered')

console.log('[Test 4] A later assisted attempt cannot downgrade existing mastery...')
const laterAiAttempt = await completeAttempt('student_beta', 'learn', {
  source: 'external-ai', scaffoldLevel: 3, answerExposure: 'unknown',
})
assert.equal(laterAiAttempt.transfer.masteryStatus, 'mastered')
const preserved = await handlers.handleGetAlgorithmProgress({ problemId: definition.problemId }, auth('student_beta'))
assert.equal(preserved.masteryStatus, 'mastered')

console.log('[Test 5] S5/Rescue support is recordable and schedules an independent return...')
const rescueAttempt = await completeAttempt('student_rescue', 'learn', {
  source: 'solution-review', scaffoldLevel: 6, answerExposure: 'full',
})
assert.equal(rescueAttempt.transfer.masteryStatus, 'pending_independent_return')
assert(rescueAttempt.transfer.masteryHoldReasons.includes('strong_scaffold'))

console.log('[Test 6] Arena assistance is denied at both policy and server boundaries...')
const arenaContext = auth('student_arena')
const arena = await handlers.handleStartAlgorithmAttempt({
  problemId: definition.problemId,
  problemVersion: 1,
  shell: 'explorer',
  intent: 'arena',
  requestId: 'request_student_arena_01',
}, arenaContext)
assert.equal(arena.policy.assistanceAllowed, false)
await assert.rejects(
  () => handlers.handleRecordAlgorithmAssistance({
    attemptId: arena.attemptId,
    eventId: 'arena_hint_probe',
    source: 'hint',
    stage: 'implementation',
    scaffoldLevel: 1,
    answerExposure: 'none',
  }, arenaContext),
  (error) => error.code === 'FAILED_PRECONDITION'
)

console.log('[Test 7] Cumulative step limit halts execution across multiple tests...')

// Code that executes ~35,000 steps per invocation.
// Across 8 tests (2 public + 6 hidden), 35,000 * 8 = 280,000 > 200,000 MAX_CUMULATIVE_STEPS.
const heavyLoopCode = `def check_gate(s1, s2):
    i = 0
    while i < 35000:
        i += 1
    return s1 and s2
`
// 1. Direct evaluation on production isolatedJudgeRuntime.evaluateBaseSubmission
const directBaseEval = evaluateBaseSubmission(definition.problemId, 1, heavyLoopCode)
assert.equal(directBaseEval.resultStar, false, 'evaluateBaseSubmission MUST reject cumulative step overrun')
assert.equal(directBaseEval.passed, false)
assert.ok(directBaseEval.cumulativeStepsUsed >= 200000, `evaluateBaseSubmission cumulative steps (${directBaseEval.cumulativeStepsUsed}) must reach budget limit`)

// 2. Evaluation on authoritative judge facade
const heavyEval = evaluateAuthoritativeSubmission({
  problemId: definition.problemId,
  problemVersion: 1,
  studentPythonCode: heavyLoopCode,
  entryFunction: 'check_gate',
  publicTests: [
    { inputs: { s1: true, s2: true }, expected: true },
    { inputs: { s1: false, s2: true }, expected: false },
  ],
})

assert.equal(heavyEval.hiddenPassed, false, 'Cumulative step overrun across test suite MUST fail hidden suite')
assert.equal(heavyEval.resultStar, false, 'Result star must be false when cumulative steps overrun')
assert.ok(heavyEval.cumulativeStepsUsed >= 200000, `Cumulative steps (${heavyEval.cumulativeStepsUsed}) must reach budget limit`)
console.log('  -> [PASS] Cumulative Step Limit (200,000) strictly bounded on both isolatedJudgeRuntime & AuthoritativeJudge')

console.log('\n=== Server Orchestration & Restricted Judge Tests Passed ===\n')
