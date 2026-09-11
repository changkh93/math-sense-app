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
