export const isCodeTraceProgressComplete = (codeTrace, expectedExerciseIds = []) => {
  if (codeTrace?.completed === true) return true

  const expectedIds = [...new Set(expectedExerciseIds.filter(Boolean))]
  if (expectedIds.length === 0) return false

  const completedIds = new Set(
    Array.isArray(codeTrace?.completedExerciseIds)
      ? codeTrace.completedExerciseIds.filter(Boolean)
      : []
  )

  return expectedIds.every(exerciseId => completedIds.has(exerciseId))
}

const getExerciseId = exercise => exercise?.id || exercise?.docId || ''

export const getCodeTraceResumeState = (exercises = [], codeTrace = {}) => {
  const exerciseIds = exercises.map(getExerciseId)
  const completedIds = new Set(
    Array.isArray(codeTrace?.completedExerciseIds)
      ? codeTrace.completedExerciseIds.filter(Boolean)
      : []
  )
  const savedDrafts = codeTrace?.drafts && typeof codeTrace.drafts === 'object'
    ? codeTrace.drafts
    : {}
  const lastExerciseIndex = exerciseIds.indexOf(codeTrace?.lastExerciseId || '')
  const firstIncompleteIndex = exerciseIds.findIndex(id => id && !completedIds.has(id))

  let exerciseIndex = 0
  if (lastExerciseIndex >= 0 && !completedIds.has(exerciseIds[lastExerciseIndex])) {
    exerciseIndex = lastExerciseIndex
  } else if (firstIncompleteIndex >= 0) {
    exerciseIndex = firstIncompleteIndex
  } else if (lastExerciseIndex >= 0) {
    exerciseIndex = lastExerciseIndex
  }

  const exerciseId = exerciseIds[exerciseIndex] || ''
  return {
    exerciseIndex,
    exerciseId,
    studentCode: typeof savedDrafts[exerciseId] === 'string' ? savedDrafts[exerciseId] : '',
    mode: codeTrace?.lastMode === 'line' ? 'line' : 'recall',
  }
}

// Match the editor's answer projection: comment-only lines are helpers, not trace lines.
const traceLines = code => String(code || '').replace(/\r\n/g, '\n')
  .split('\n').filter(line => !line.trimStart().startsWith('#'))

export const getCodeTraceLineProgress = (exercises = [], codeTrace = {}) => {
  return Object.fromEntries(exercises.flatMap(exercise => {
    const id = getExerciseId(exercise)
    if (!id) return []
    const totalLines = Math.max(1, traceLines(exercise.answerCode).length)
    const saved = codeTrace?.visibleLinesByExercise?.[id]
    const draft = codeTrace?.drafts?.[id]
    // Old records have no reveal count. Resume from the last nonempty draft line.
    const fallback = typeof draft === 'string' && draft.trim()
      ? traceLines(draft.trimEnd()).length : 1
    const count = Number.isFinite(saved) && saved >= 1 ? Math.floor(saved) : fallback
    return [[id, Math.min(totalLines, Math.max(1, count))]]
  }))
}
