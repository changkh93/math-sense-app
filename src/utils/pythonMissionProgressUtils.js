export function getMissionIds(missionSet) {
  return Array.isArray(missionSet?.missions)
    ? missionSet.missions.map((mission) => mission?.id).filter(Boolean)
    : []
}

export function normalizeMissionLabProgress(progress = {}) {
  const completedMissionIds = Array.isArray(progress?.completedMissionIds)
    ? [...new Set(progress.completedMissionIds.filter(Boolean))]
    : []

  return {
    ...progress,
    completedMissionIds,
    bestStarsByMission: progress?.bestStarsByMission && typeof progress.bestStarsByMission === 'object'
      ? { ...progress.bestStarsByMission }
      : {},
  }
}

export function isMissionSetComplete(progress, missionSet) {
  const requiredIds = getMissionIds(missionSet)
  if (requiredIds.length === 0) return false
  const completed = new Set(normalizeMissionLabProgress(progress).completedMissionIds)
  return requiredIds.every((id) => completed.has(id))
}

export function getMissionSetCompletion(progress, missionSet) {
  const missionIds = getMissionIds(missionSet)
  const completed = new Set(normalizeMissionLabProgress(progress).completedMissionIds)
  const completedCount = missionIds.filter((id) => completed.has(id)).length
  return {
    completedCount,
    totalCount: missionIds.length,
    completed: missionIds.length > 0 && completedCount === missionIds.length,
  }
}

export function mergeMissionCompletion(progress, missionSet, missionId, stars = 1) {
  const current = normalizeMissionLabProgress(progress)
  const completedMissionIds = [...new Set([...current.completedMissionIds, missionId].filter(Boolean))]
  const bestStarsByMission = {
    ...current.bestStarsByMission,
    [missionId]: Math.max(Number(current.bestStarsByMission?.[missionId] || 0), Number(stars || 0)),
  }
  const completed = getMissionIds(missionSet).every((id) => completedMissionIds.includes(id))

  return {
    ...current,
    setId: missionSet?.id || current.setId || '',
    setVersion: Number(missionSet?.version || current.setVersion || 1),
    completedMissionIds,
    completedMissionCount: completedMissionIds.length,
    totalMissionCount: getMissionIds(missionSet).length,
    bestStarsByMission,
    bestStars: Object.values(bestStarsByMission).reduce((sum, value) => sum + Number(value || 0), 0),
    completed,
  }
}

