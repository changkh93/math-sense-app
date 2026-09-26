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
    bestAssistanceByMission: progress?.bestAssistanceByMission && typeof progress.bestAssistanceByMission === 'object'
      ? { ...progress.bestAssistanceByMission }
      : {},
    unlockedTools: Array.isArray(progress?.unlockedTools)
      ? [...new Set(progress.unlockedTools.filter(Boolean))]
      : [],
    unlockedActs: Array.isArray(progress?.unlockedActs)
      ? [...new Set(progress.unlockedActs.filter(Boolean))]
      : ['act-0-awakening'],
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

export function mergeMissionCompletion(progress, missionSet, missionId, stars = 1, assistance = null) {
  const current = normalizeMissionLabProgress(progress)
  const completedMissionIds = [...new Set([...current.completedMissionIds, missionId].filter(Boolean))]
  const bestStarsByMission = {
    ...current.bestStarsByMission,
    [missionId]: Math.max(Number(current.bestStarsByMission?.[missionId] || 0), Number(stars || 0)),
  }

  const bestAssistanceByMission = { ...current.bestAssistanceByMission }
  if (assistance !== null && assistance !== undefined) {
    const level = typeof assistance === 'number' ? assistance : (assistance.maxLevel ?? 0)
    const existing = bestAssistanceByMission[missionId]
    bestAssistanceByMission[missionId] = existing === undefined ? level : Math.min(existing, level)
  }

  const completedMission = Array.isArray(missionSet?.missions)
    ? missionSet.missions.find((m) => m?.id === missionId)
    : null
  const newUnlocks = completedMission?.scaffold?.unlocksOnComplete || []
  const unlockedTools = [...new Set([...(current.unlockedTools || []), ...newUnlocks])]

  const completed = getMissionIds(missionSet).every((id) => completedMissionIds.includes(id))

  return {
    ...current,
    setId: missionSet?.id || current.setId || '',
    setVersion: Number(missionSet?.version || current.setVersion || 1),
    completedMissionIds,
    completedMissionCount: completedMissionIds.length,
    totalMissionCount: getMissionIds(missionSet).length,
    bestStarsByMission,
    bestAssistanceByMission,
    unlockedTools,
    bestStars: Object.values(bestStarsByMission).reduce((sum, value) => sum + Number(value || 0), 0),
    completed,
  }
}

export function buildMissionLabCompletion({
  existingMissionLab = {},
  missionSet,
  missionId,
  stars = 0,
  assistanceLevel = 0,
  timestamp = null,
}) {
  const missions = Array.isArray(missionSet?.missions) ? missionSet.missions : []
  if (!missionSet?.id || !missionId || !missions.some((mission) => mission?.id === missionId)) {
    return null
  }

  const wasCompleted = Array.isArray(existingMissionLab.completedMissionIds)
    && existingMissionLab.completedMissionIds.includes(missionId)
  const merged = mergeMissionCompletion(
    existingMissionLab,
    missionSet,
    missionId,
    Number(stars || 0),
    { maxLevel: Number(assistanceLevel || 0) }
  )
  const completedMissionCount = Number(merged.completedMissionCount || merged.completedMissionIds.length)
  const totalMissionCount = missions.length
  const independentClearCount = Number(existingMissionLab.independentClearCount || 0)
    + (!wasCompleted && Number(assistanceLevel || 0) === 0 ? 1 : 0)
  const hintedClearCount = Number(existingMissionLab.hintedClearCount || 0)
    + (!wasCompleted && Number(assistanceLevel || 0) > 0 ? 1 : 0)

  return {
    ...merged,
    schemaVersion: Math.max(3, Number(existingMissionLab.schemaVersion || 0)),
    experienceType: 'lumi_protocol',
    lumiCourseId: missionSet.lumiCourseId || existingMissionLab.lumiCourseId || 'lumi-season-1',
    missionSetId: missionSet.id,
    currentMissionId: missionId,
    completedMissionKeys: [...merged.completedMissionIds],
    completedCount: completedMissionCount,
    completedMissionCount,
    totalCount: totalMissionCount,
    totalMissionCount,
    isCompleted: merged.completed === true,
    completed: merged.completed === true,
    lastMissionId: missionId,
    lastCompletedMissionId: missionId,
    lastActiveAt: timestamp,
    lastCompletedAt: timestamp,
    independentClearCount,
    hintedClearCount,
  }
}
