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
