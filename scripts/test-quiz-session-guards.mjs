import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  canSubmitQuizSession,
  getValidQuizCheckpoint,
  getEverWrongQuizQuestions,
  getUnansweredQuizQuestions,
  hasCompleteQuizQuestionSet,
  isMatchingQuizSessionOwner,
  QUIZ_CHECKPOINT_MAX_AGE_MS,
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
assert.match(quizViewSource, /clientInstanceId:\s*quizClientInstanceIdRef\.current/)
assert.match(quizViewSource, /sessionStorage\.setItem\(/)
assert.doesNotMatch(quizViewSource, /localStorage\.setItem\(\s*makePendingAnswerCheckpointKey/)
assert.match(quizViewSource, /QUIZ_SESSION_OWNERSHIP_LOST/)
assert.match(spaceHomeSource, /validateQuizCompletionSnapshot\(\{/)

console.log('quiz session guard tests passed')
