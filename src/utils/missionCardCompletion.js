function validScore(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const score = Number(value)
  return Number.isFinite(score) && score >= 0 && score <= 100 ? score : null
}

// The progress document is written atomically with final history. Summary rows
// may lag behind it, especially when today's history query excludes an old run.
// Scope the snapshot explicitly so navigating units/users cannot reuse a badge.
export function getMissionCardCompletion({ userId, unitId, bestScores = {}, progressSnapshot = null }) {
  const progress = userId && unitId && progressSnapshot?.userId === userId && progressSnapshot?.unitId === unitId
    ? progressSnapshot.data || {}
    : {}
  const resolve = (type, historyKey) => {
    const historyScore = validScore(bestScores[historyKey])
    const finalSaved = progress[`${type}Completed`] === true
    const progressScore = finalSaved ? validScore(progress[`${type}BestScore`]) : null
    const scores = [historyScore, progressScore].filter(score => score !== null)
    return {
      completed: finalSaved || historyScore !== null,
      bestScore: scores.length ? Math.max(...scores) : null,
    }
  }
  return {
    workbook: resolve('workbook', `${unitId}_workbook`),
    quiz: resolve('quiz', unitId),
  }
}
