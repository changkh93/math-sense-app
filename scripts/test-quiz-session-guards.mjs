import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  canSubmitQuizSession,
  getQuizCompletionFailureState,
  getValidQuizCheckpoint,
  getEverWrongQuizQuestions,
  getUnansweredQuizQuestions,
  hasCompleteQuizQuestionSet,
  isMatchingQuizSessionOwner,
  QUIZ_CHECKPOINT_MAX_AGE_MS,
  shouldStartQuizSessionInitialization,
  validateQuizCompletionSnapshot,
} from '../src/utils/quizSessionGuards.js'

const questions = [
  { id: 'q1' },
  { id: 'q2' },
  { id: 'q3' },
]

assert.deepEqual(
  getUnansweredQuizQuestions(questions, { q1: { isCorrect: true } }).map(question => question.id),
  ['q2', 'q3'],
  '미응답 문항을 순서대로 반환해야 합니다.'
)

assert.equal(
  hasCompleteQuizQuestionSet(questions, 3),
  true,
  '예상 문항 수와 실제 문항 수가 같아야 합니다.'
)

assert.equal(
  hasCompleteQuizQuestionSet(questions.slice(0, 2), 3),
  false,
  '문항 데이터 일부가 없으면 완전한 세트로 보지 않아야 합니다.'
)

assert.equal(
  canSubmitQuizSession({
    questions,
    answers: {
      q1: { isCorrect: true },
      q2: { isCorrect: false },
      q3: { isCorrect: true },
    },
    expectedTotal: 3,
  }),
  true,
  '모든 문항에 답했고 문항 세트가 완전하면 제출할 수 있어야 합니다.'
)

assert.equal(
  canSubmitQuizSession({
    questions,
    answers: {
      q1: { isCorrect: true },
      q2: { isCorrect: false },
    },
    expectedTotal: 3,
  }),
  false,
  '미응답 문항이 있으면 제출할 수 없어야 합니다.'
)

assert.equal(
  canSubmitQuizSession({
    questions: questions.slice(0, 2),
    answers: {
      q1: { isCorrect: true },
      q2: { isCorrect: false },
    },
    expectedTotal: 3,
  }),
  false,
  '문항 데이터가 누락되면 모든 현재 문항에 답했더라도 제출할 수 없어야 합니다.'
)

const initializationGuardKey = 'dark_matter_zone__student-a__q1|q2'
assert.equal(shouldStartQuizSessionInitialization({
  questionCount: 2,
  nextGuardKey: initializationGuardKey,
}), true, '첫 초기화는 시작해야 합니다.')
assert.equal(shouldStartQuizSessionInitialization({
  questionCount: 2,
  nextGuardKey: initializationGuardKey,
  initializingGuardKey: initializationGuardKey,
}), false, '같은 탭의 초기화가 진행 중이면 중복 세션을 시작하면 안 됩니다.')
assert.equal(shouldStartQuizSessionInitialization({
  questionCount: 2,
  nextGuardKey: initializationGuardKey,
  initializedGuardKey: initializationGuardKey,
}), false, '이미 완료된 초기화는 다시 시작하면 안 됩니다.')
assert.equal(shouldStartQuizSessionInitialization({
  questionCount: 2,
  nextGuardKey: 'dark_matter_zone__student-a__q3',
  initializingGuardKey: initializationGuardKey,
}), true, '사용자나 문항 구성이 바뀐 새 키는 초기화할 수 있어야 합니다.')

assert.deepEqual(
  getEverWrongQuizQuestions(
    questions,
    { q1: { isCorrect: true }, q2: { isCorrect: true }, q3: { isCorrect: false } },
    new Set(['q2'])
  ).map(question => question.id),
  ['q2', 'q3'],
  '나중에 정답으로 고쳤더라도 세션 중 한 번 틀린 문항은 다크매터 대상으로 유지해야 합니다.'
)

const ownership = { sessionId: 'session-a', clientInstanceId: 'tab-a' }
assert.equal(isMatchingQuizSessionOwner(ownership, ownership), true)
assert.equal(
  isMatchingQuizSessionOwner(ownership, { sessionId: 'session-a', clientInstanceId: 'tab-b' }),
  false,
  '같은 퀴즈 세션이어도 다른 탭의 저장은 거부해야 합니다.'
)

const nowMs = 1_000_000
const checkpoint = { ...ownership, savedAt: nowMs - 1000, userAnswers: { q1: { isCorrect: true } } }
assert.equal(getValidQuizCheckpoint(checkpoint, { ...ownership, nowMs }), checkpoint)
assert.equal(
  getValidQuizCheckpoint(checkpoint, { sessionId: 'session-a', clientInstanceId: 'tab-b', nowMs }),
  null,
  '다른 탭에서 만든 체크포인트를 병합하면 안 됩니다.'
)
assert.equal(
  getValidQuizCheckpoint(
    { ...checkpoint, savedAt: nowMs - QUIZ_CHECKPOINT_MAX_AGE_MS - 1 },
    { ...ownership, nowMs }
  ),
  null,
  '만료된 체크포인트를 복구하면 안 됩니다.'
)

const completionSession = {
  ...ownership,
  userAnswers: {
    q1: { isCorrect: true },
    q2: { isCorrect: false },
    q3: { isCorrect: true },
  },
}
assert.equal(validateQuizCompletionSnapshot({
  session: completionSession,
  ...ownership,
  questionIds: ['q1', 'q2', 'q3'],
  totalCount: 3,
  correctCount: 2,
  score: 67,
}).ok, true)
assert.equal(validateQuizCompletionSnapshot({
  session: completionSession,
  sessionId: 'session-a',
  clientInstanceId: 'tab-b',
  questionIds: ['q1', 'q2', 'q3'],
  totalCount: 3,
  correctCount: 2,
  score: 67,
}).reason, 'session_owner_mismatch')
assert.equal(validateQuizCompletionSnapshot({
  session: completionSession,
  ...ownership,
  questionIds: ['q1', 'q2', 'q3', 'q4'],
  totalCount: 4,
  correctCount: 4,
  score: 100,
}).reason, 'answer_count_mismatch')
assert.equal(validateQuizCompletionSnapshot({
  session: completionSession,
  ...ownership,
  questionIds: ['q1', 'q2', 'q3'],
  totalCount: 3,
  correctCount: 3,
  score: 100,
}).reason, 'score_mismatch')

const quizViewSource = readFileSync(new URL('../src/components/Space/SpaceQuizView.jsx', import.meta.url), 'utf8')
const spaceHomeSource = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')
for (const reason of ['answer_count_mismatch', 'answer_id_mismatch', 'score_mismatch', undefined]) {
  const failure = getQuizCompletionFailureState(reason)
  assert.equal(failure.ownershipLost, false, '답안 검증 오류를 다른 탭의 소유권 탈취로 간주하면 안 됩니다.')
  assert.doesNotMatch(failure.message, /다른 탭/)
}
assert.equal(getQuizCompletionFailureState('session_owner_mismatch').ownershipLost, true)
assert.match(spaceHomeSource, /validationError\.reason = completionValidation\.reason/)
assert.match(quizViewSource, /getQuizCompletionFailureState\(err\?\.reason\)/)
assert.equal((quizViewSource.match(/writeQuizProgressSnapshot\(transaction, progressRef,/g) || []).length, 3,
  '초기화·답안 저장·퇴장 저장 모두 전체 세션 스냅샷을 교체해야 합니다.')
assert.match(quizViewSource, /userAnswers: targetUserAnswers/,
  '재입장할 때 화면에 복구한 필터링된 답안을 서버에도 저장해야 합니다.')
assert.match(quizViewSource, /clientInstanceId:\s*quizClientInstanceIdRef\.current/)
assert.match(quizViewSource, /sessionStorage\.setItem\(/)
assert.doesNotMatch(quizViewSource, /localStorage\.setItem\(\s*makePendingAnswerCheckpointKey/)
assert.match(quizViewSource, /QUIZ_SESSION_OWNERSHIP_LOST/)
assert.match(quizViewSource, /initializingRef\.current = guardKey/)
assert.doesNotMatch(quizViewSource, /\}, \[quizData, hasRadar, isRadarBonus, user\]\)/)
assert.match(spaceHomeSource, /validateQuizCompletionSnapshot\(\{/)

console.log('quiz session guard tests passed')
