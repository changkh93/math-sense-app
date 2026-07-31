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
