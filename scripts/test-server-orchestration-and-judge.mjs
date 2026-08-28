import assert from 'assert'
import { createCallableOrchestrator } from '../functions/algorithmConstellation/callableOrchestrator.cjs'
import { createInMemoryAlgorithmStore } from '../functions/algorithmConstellation/algorithmProgressLedger.cjs'
import { evaluateBaseSubmission } from '../functions/algorithmConstellation/isolatedJudgeRuntime.cjs'
import { getPrivateProblemDefinition } from '../functions/algorithmConstellation/privateProblemCatalog.cjs'

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
const duplicateTransfer = await handlers.handleSubmitAlgorithmTransfer({
  attemptId: normal.started.attemptId,
  challengeToken: normal.issued.challengeToken,
  transferCode: solutionFor(normal.issued.transferChallenge),
}, auth('student_alpha'))
assert.equal(duplicateTransfer.duplicated, true)

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

console.log('\n=== Server Orchestration & Restricted Judge Tests Passed ===\n')
