import assert from 'node:assert/strict'
import { createCallableOrchestrator } from '../functions/algorithmConstellation/callableOrchestrator.cjs'
import { createInMemoryAlgorithmStore } from '../functions/algorithmConstellation/algorithmProgressLedger.cjs'
import { getPrivateProblemDefinition } from '../functions/algorithmConstellation/privateProblemCatalog.cjs'
import { validateAttemptTransition } from '../functions/algorithmConstellation/attemptStateMachine.cjs'
import {
  isAttemptSessionUsable,
  isAttemptDeadError,
  isTransferTokenError,
} from '../src/components/AlgorithmConstellation/client/shell/attemptRecovery.js'

// Shared secret so the orchestrator's HMAC signing works in tests.
process.env.ALGORITHM_CONSTELLATION_SECRET = `test_secret_${'k'.repeat(64)}`

const PROBLEM_ID = 'AC-COND-001'
const CONTEXT = { auth: { uid: 'u_expiry_recovery' } }
const HOUR = 60 * 60 * 1000
const TWO_HOURS = 2 * HOUR

const definition = getPrivateProblemDefinition(PROBLEM_ID, 1)
assert.ok(definition, `${PROBLEM_ID} must exist in the private catalog`)
assert.ok((definition.understandingChallenges || []).length > 0, 'problem must have understanding challenges')

const judge = {
  evaluateBaseSubmission: () => ({ status: 'passed', resultStar: true, testGroups: [] }),
  evaluateTransferSubmission: () => ({ passed: judge.transferPasses }),
}

function buildOrchestrator(clock) {
  const store = createInMemoryAlgorithmStore()
  const orchestrator = createCallableOrchestrator({ store, judge, now: () => clock.ms })
  return { store, orchestrator }
}

async function startAttempt(orchestrator, requestId) {
  return orchestrator.handleStartAlgorithmAttempt({
    problemId: PROBLEM_ID,
    problemVersion: 1,
    shell: 'explorer',
    intent: 'learn',
    requestId,
  }, CONTEXT)
}

async function passBase(orchestrator, attemptId) {
  return orchestrator.handleSubmitAlgorithmBase({ attemptId, submissionId: `sub_${Date.now()}_base`, code: 'answer = 1' }, CONTEXT)
}

async function passUnderstanding(orchestrator, store, attemptId) {
  const session = await store.getSession(attemptId)
  const challenge = definition.understandingChallenges.find((item) => item.challengeId === session.understandingChallengeId)
  const answers = Object.fromEntries(challenge.questions.map((question) => [question.id, question.expected]))
  return orchestrator.handleSubmitUnderstandingEvidence({ attemptId, challengeId: challenge.challengeId, answers }, CONTEXT)
}

console.log('=== Algorithm Attempt Expiry & Recovery Tests ===')

// [Test 1] Client recovery helpers classify sessions and errors correctly
console.log('[Test 1] attemptRecovery helpers...')
assert.equal(isAttemptSessionUsable({ attemptId: 'a1', state: 'STARTED', expiresAt: Date.now() + HOUR }), true)
assert.equal(isAttemptSessionUsable({ attemptId: 'a1', state: 'STARTED', expiresAt: Date.now() - 1 }), false, 'expired session must be unusable')
assert.equal(isAttemptSessionUsable({ attemptId: 'a1', state: 'STARTED' }), true, 'missing expiresAt (mock gateway) stays usable')
assert.equal(isAttemptSessionUsable({ attemptId: 'a1', state: 'FINALIZED', expiresAt: Date.now() + HOUR }), false)
assert.equal(isAttemptSessionUsable(null), false)

assert.equal(isAttemptDeadError({ code: 'functions/failed-precondition', message: '시도 시간이 만료되었습니다.' }), true)
assert.equal(isAttemptDeadError({ code: 'functions/failed-precondition', message: '이미 종료된 시도입니다.' }), true)
assert.equal(isAttemptDeadError({ code: 'functions/failed-precondition', message: '서버가 발급한 이해 확인 문제가 아닙니다.' }), true)
assert.equal(isAttemptDeadError({ code: 'functions/invalid-argument', message: '시도 시간이 만료되었습니다.' }), false)
assert.equal(isAttemptDeadError({ code: 'functions/failed-precondition', message: 'Star 1과 Star 2가 먼저 필요합니다.' }), false)

assert.equal(isTransferTokenError({ code: 'functions/failed-precondition', message: '전이 문제 토큰이 올바르지 않거나 만료되었습니다.' }), true)
assert.equal(isTransferTokenError({ code: 'functions/failed-precondition', message: '시도 시간이 만료되었습니다.' }), false)
console.log('  -> helper classification verified')

// [Test 2] Hard expiry is still enforced after 2h of inactivity
console.log('[Test 2] lazy hard expiry after 2h idle...')
{
  const base = Date.now()
  const clock = { ms: base }
  const { orchestrator } = buildOrchestrator(clock)
  const session = await startAttempt(orchestrator, 'req_hard_expiry')
  clock.ms = base + TWO_HOURS + 1
  await assert.rejects(
    () => passBase(orchestrator, session.attemptId),
    (error) => /시도 시간이 만료/.test(error.message) && error.code === 'FAILED_PRECONDITION',
  )
}
console.log('  -> expired attempt rejects submissions with 시도 시간이 만료되었습니다')

// [Test 3] Sliding expiry: accepted mutations re-arm the 2h window
console.log('[Test 3] sliding session extension...')
{
  const base = Date.now()
  const clock = { ms: base }
  const { store, orchestrator } = buildOrchestrator(clock)
  const session = await startAttempt(orchestrator, 'req_sliding')

  clock.ms = base + 90 * 60 * 1000 // 1h30m of mission work
  const baseResult = await passBase(orchestrator, session.attemptId)
  assert.equal(baseResult.resultStar, true)

  const stored = await store.getSession(session.attemptId)
  assert.equal(stored.expiresAt, base + 90 * 60 * 1000 + TWO_HOURS, 'base submission must extend expiresAt')

  // Past the ORIGINAL 2h cap but inside the sliding window: still accepted.
  clock.ms = base + TWO_HOURS + 30 * 60 * 1000
  const understanding = await passUnderstanding(orchestrator, store, session.attemptId)
  assert.equal(understanding.passed, true)
  assert.equal(isAttemptSessionUsable(await store.getSession(session.attemptId), clock.ms), true)

  // And the newly extended window is still lazily enforced.
  const extended = (await store.getSession(session.attemptId)).expiresAt
  clock.ms = extended + 1
  await assert.rejects(
    () => orchestrator.handleRecordAlgorithmAssistance({
      attemptId: session.attemptId, eventId: 'evt_late', source: 'hint', stage: 'implementation', scaffoldLevel: 1, answerExposure: 'partial',
    }, CONTEXT),
    /시도 시간이 만료/,
  )
}
console.log('  -> activity extends the window; idle past it still expires')

// [Test 4] Recovery rotation contract: a fresh requestId starts a usable attempt
console.log('[Test 4] client rotation recovery contract...')
{
  const base = Date.now()
  const clock = { ms: base }
  const { orchestrator } = buildOrchestrator(clock)
  const stale = await startAttempt(orchestrator, 'req_rotation_old')
  clock.ms = base + TWO_HOURS + 1

  // Old attempt dead-ends exactly like the reported production incident.
  await assert.rejects(() => passBase(orchestrator, stale.attemptId), /시도 시간이 만료/)

  // The client rotates the requestId (AlgorithmMissionShell.rotateToFreshAttempt)
  // and the same preserved code then grades successfully on the fresh attempt.
  const fresh = await startAttempt(orchestrator, `start_${base}_rotated`)
  assert.notEqual(fresh.attemptId, stale.attemptId)
  assert.equal(isAttemptSessionUsable(fresh, clock.ms), true)
  const result = await passBase(orchestrator, fresh.attemptId)
  assert.equal(result.resultStar, true)
}
console.log('  -> rotated attempt accepts the preserved code')

// [Test 5] Transfer token re-issue after a failed submission is legal
console.log('[Test 5] transfer token re-issue from TRANSFER_SUBMITTED...')
{
  const base = Date.now()
  const clock = { ms: base }
  const { store, orchestrator } = buildOrchestrator(clock)
  const session = await startAttempt(orchestrator, 'req_transfer_reissue')
  await passBase(orchestrator, session.attemptId)
  await passUnderstanding(orchestrator, store, session.attemptId)

  judge.transferPasses = false
  const issued = await orchestrator.handleIssueTransferChallenge({ attemptId: session.attemptId }, CONTEXT)
  const failed = await orchestrator.handleSubmitAlgorithmTransfer({ attemptId: session.attemptId, challengeToken: issued.challengeToken, transferCode: 'wrong' }, CONTEXT)
  assert.equal(failed.passed, false)

  // Idle past the 1h token TTL while the sliding 2h session stays alive: the
  // stale token must be rejected, the state machine must allow a re-issue,
  // and the re-issued token (new expiry -> new HMAC) must unblock the stage.
  clock.ms = base + 61 * 60 * 1000
  await assert.rejects(
    () => orchestrator.handleSubmitAlgorithmTransfer({ attemptId: session.attemptId, challengeToken: issued.challengeToken, transferCode: 'right' }, CONTEXT),
    /전이 문제 토큰이 올바르지 않거나 만료/,
  )
  validateAttemptTransition('TRANSFER_SUBMITTED', 'TRANSFER_ISSUED')
  const reissued = await orchestrator.handleIssueTransferChallenge({ attemptId: session.attemptId }, CONTEXT)
  assert.notEqual(reissued.challengeToken, issued.challengeToken)

  judge.transferPasses = true
  const passed = await orchestrator.handleSubmitAlgorithmTransfer({ attemptId: session.attemptId, challengeToken: reissued.challengeToken, transferCode: 'right' }, CONTEXT)
  assert.equal(passed.passed, true)
  assert.equal(passed.stars, 3)
}
console.log('  -> re-issued token unblocks a stale transfer stage')

console.log('=== All attempt expiry & recovery tests passed ===')
