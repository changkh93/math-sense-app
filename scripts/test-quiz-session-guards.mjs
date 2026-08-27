import assert from 'node:assert/strict'
import {
  canSubmitQuizSession,
  getEverWrongQuizQuestions,
  getUnansweredQuizQuestions,
  hasCompleteQuizQuestionSet,
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

console.log('quiz session guard tests passed')
