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

export const getEverWrongQuizQuestions = (questions = [], answers = {}, everWrongIds = []) => {
  const everWrong = everWrongIds instanceof Set ? everWrongIds : new Set(everWrongIds)
  return questions.filter(question => (
    question?.id && (everWrong.has(question.id) || answers?.[question.id]?.isCorrect === false)
  ))
}
