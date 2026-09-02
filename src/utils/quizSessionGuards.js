export const getUnansweredQuizQuestions = (questions = [], answers = {}) => (
  questions.filter(question => question?.id && !answers?.[question.id])
)

export const hasCompleteQuizQuestionSet = (questions = [], expectedTotal = 0) => (
  Number.isInteger(expectedTotal) &&
  expectedTotal > 0 &&
  questions.length === expectedTotal
)

export const canSubmitQuizSession = ({ questions = [], answers = {}, expectedTotal = 0 } = {}) => (
  hasCompleteQuizQuestionSet(questions, expectedTotal) &&
  getUnansweredQuizQuestions(questions, answers).length === 0
)

export const shouldStartQuizSessionInitialization = ({
  questionCount = 0,
  nextGuardKey = '',
  initializedGuardKey = null,
  initializingGuardKey = null,
} = {}) => (
  questionCount > 0 &&
  Boolean(nextGuardKey) &&
  initializedGuardKey !== nextGuardKey &&
  initializingGuardKey !== nextGuardKey
)

export const QUIZ_CHECKPOINT_MAX_AGE_MS = 30 * 60 * 1000

export const isMatchingQuizSessionOwner = (session = {}, { sessionId = '', clientInstanceId = '' } = {}) => (
  Boolean(sessionId) &&
  Boolean(clientInstanceId) &&
  session?.sessionId === sessionId &&
  session?.clientInstanceId === clientInstanceId
)

export const getValidQuizCheckpoint = (
  checkpoint,
  { sessionId = '', clientInstanceId = '', nowMs = Date.now(), maxAgeMs = QUIZ_CHECKPOINT_MAX_AGE_MS } = {}
) => {
  if (!checkpoint || typeof checkpoint !== 'object') return null
  if (!isMatchingQuizSessionOwner(checkpoint, { sessionId, clientInstanceId })) return null
  const savedAt = Number(checkpoint.savedAt)
  if (!Number.isFinite(savedAt) || savedAt <= 0 || nowMs - savedAt > maxAgeMs || savedAt > nowMs + 60_000) return null
  return checkpoint
}

export const validateQuizCompletionSnapshot = ({
  session,
  sessionId = '',
  clientInstanceId = '',
  questionIds = [],
  totalCount = 0,
  correctCount = 0,
  score = 0,
} = {}) => {
  if (!isMatchingQuizSessionOwner(session, { sessionId, clientInstanceId })) {
    return { ok: false, reason: 'session_owner_mismatch' }
  }

  const expectedIds = Array.from(new Set(questionIds.filter(Boolean)))
  const answerEntries = Object.entries(session?.userAnswers || {})
  const answerIds = new Set(answerEntries.map(([questionId]) => questionId))
  if (expectedIds.length !== totalCount || answerEntries.length !== totalCount) {
    return { ok: false, reason: 'answer_count_mismatch' }
  }
  if (expectedIds.some(questionId => !answerIds.has(questionId))) {
    return { ok: false, reason: 'answer_id_mismatch' }
  }

  const serverCorrectCount = answerEntries.filter(([, answer]) => answer?.isCorrect === true).length
  const serverScore = totalCount > 0 ? Math.round((serverCorrectCount / totalCount) * 100) : 0
  if (serverCorrectCount !== correctCount || serverScore !== score) {
    return { ok: false, reason: 'score_mismatch' }
  }

  return { ok: true, serverCorrectCount, serverScore }
}

export const getEverWrongQuizQuestions = (questions = [], answers = {}, everWrongIds = []) => {
  const everWrong = everWrongIds instanceof Set ? everWrongIds : new Set(everWrongIds)
  return questions.filter(question => (
    question?.id && (everWrong.has(question.id) || answers?.[question.id]?.isCorrect === false)
  ))
}
