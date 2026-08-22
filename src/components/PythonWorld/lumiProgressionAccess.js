export function isCourseComplete(act, progress = {}) {
  return progress.completed === true
    || (progress.completedMissionIds || []).length >= act.coreMissions
}

export function getSequentialActAccess(course, actProgressMap = {}, isAdminPreview = false, completionMap = {}) {
  return Object.fromEntries(course.acts.map((act, index) => {
    const previousAct = index > 0 ? course.acts[index - 1] : null
    const previousCompleted = !previousAct
      || completionMap[previousAct.id] === true
      || (completionMap[previousAct.id] === undefined && isCourseComplete(previousAct, actProgressMap[previousAct.id]))
    return [act.id, isAdminPreview || previousCompleted]
  }))
}

export function getAdvancedChallengeAccess({
  finalCompleted = false,
  objectTraceCompleted = false,
  objectLearningCompleted = false,
  tacticalCompleted = false,
} = {}, isAdminPreview = false) {
  return {
    objectTrace: isAdminPreview || finalCompleted,
    objectLearning: isAdminPreview || (finalCompleted && objectTraceCompleted),
    tactical: isAdminPreview || (finalCompleted && objectTraceCompleted && objectLearningCompleted),
    frontier: isAdminPreview || (finalCompleted && objectTraceCompleted && objectLearningCompleted && tacticalCompleted),
  }
}
