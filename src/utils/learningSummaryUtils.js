export const LEARNING_SUMMARY_SCHEMA_VERSION = 3
export const LEARNING_SUMMARY_FRESHNESS_TTL_MS = 24 * 60 * 60 * 1000

function timestampMillis(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return Number(value.toMillis()) || 0
  if (typeof value.toDate === 'function') return value.toDate().getTime()
  if (value instanceof Date) return value.getTime()
  return Number(value) || new Date(value).getTime() || 0
}

function summaryTimestamp(millis) {
  const value = Number(millis || 0)
  return value > 0 ? { toMillis: () => value, toDate: () => new Date(value) } : null
}

function normalizeProgressType(row) {
  const type = row?.type
  if (!type || type === 'quiz') return 'quiz'
  if (type === 'workbook') return 'workbook'
  if (type === 'video') return 'video'
  if (type === 'text') return 'text'
  if (type === 'code_trace') return 'code_trace'
  if (row?.completionModalities?.missionLab === true || type === 'mission_lab' || type === 'missionLab') {
    return 'python_mission'
  }
  if (type === 'python_mission' || type === 'lumi_protocol') {
    const isUnitComplete = (
      row.isUnitComplete === true ||
      row.unitCompleted === true ||
      row.isAllMissionsComplete === true ||
      (Number(row.totalMissionsCount || row.totalMissionCount || row.totalCount || 0) > 0 &&
       Number(row.completedMissionsCount || row.completedMissionCount || row.completedCount || 0) >=
       Number(row.totalMissionsCount || row.totalMissionCount || row.totalCount || 0))
    )
    if (isUnitComplete) return 'python_mission'
  }
  return ''
}

// Read-only completion fallback for history entries missing from the summary.
// Keep this separate from history: it must not create scores, activity dates or rewards.
export function getLearningProgressCompletion(progress = {}) {
  const ml = progress.missionLab || {}
  const completedCount = Number(
    ml.completedCount ??
    ml.completedMissionsCount ??
    ml.completedMissionCount ??
    ml.completed_count ??
    0
  )
  const totalCount = Number(
    ml.totalCount ??
    ml.totalMissions ??
    ml.totalMissionCount ??
    ml.total_count ??
    0
  )
  const hasCompletedAllMissions = totalCount > 0 && completedCount >= totalCount
  const missionLabCompleted = (
    ml.completed === true ||
    ml.isCompleted === true ||
    hasCompletedAllMissions
  )

  return {
    text: progress.logRead === true,
    video: Object.values(progress.videoProgress || {}).some(
      (tx) => tx && typeof tx === 'object' && tx.completed === true
    ),
    missionLab: missionLabCompleted,
  }
}

export function mergeUnitProgressCompletion(historyProgressMap, progressCompletionMap) {
  const merged = { ...historyProgressMap }
  Object.entries(progressCompletionMap).forEach(([unitId, completion]) => {
    const completedTypes = ['text', 'video', 'missionLab'].filter((type) => completion[type] === true)
    if (completedTypes.length === 0) return
    merged[unitId] = {
      quiz: false, video: false, text: false, workbook: false, codeTrace: false, missionLab: false,
      ...merged[unitId],
    }
    completedTypes.forEach((type) => { merged[unitId][type] = true })
  })
  return merged
}

export function buildSummaryProgressHistory(summary) {
  return (summary?.units || []).flatMap((unit) => {
    const base = {
      unitId: unit.unitId,
      clusterId: unit.clusterId,
      regionId: unit.regionId,
      chapterId: unit.chapterId,
      timestamp: summaryTimestamp(unit.lastActivityMs),
    }
    const rows = []
    if (unit.modalities?.quiz) rows.push({ ...base, type: 'quiz', score: Number(unit.bestQuizScore || 0) })
    if (unit.modalities?.workbook) rows.push({ ...base, type: 'workbook', score: Number(unit.bestWorkbookScore || 0) })
    if (unit.modalities?.video) rows.push({ ...base, type: 'video', score: 100 })
    if (unit.modalities?.text) rows.push({ ...base, type: 'text', score: 100 })
    if (unit.modalities?.codeTrace) rows.push({ ...base, type: 'code_trace', score: 100 })
    if (unit.modalities?.missionLab) rows.push({
      ...base, type: 'python_mission', score: 100, completionModalities: { missionLab: true },
    })
    return rows
  })
}

export function shouldCheckLearningSummaryFreshness({
  summary = null,
  lastCheckedMs = 0,
  nowMs = Date.now(),
  ttlMs = LEARNING_SUMMARY_FRESHNESS_TTL_MS,
} = {}) {
  if (!summary) return true
  if (Number(summary.schemaVersion) !== LEARNING_SUMMARY_SCHEMA_VERSION) return true
  if (!Number.isFinite(Number(lastCheckedMs)) || Number(lastCheckedMs) <= 0 || Number(lastCheckedMs) > nowMs) return true
  return (nowMs - Number(lastCheckedMs)) >= ttlMs
}

export function mergeSummaryWithRecentHistory(summary, recentHistory = []) {
  const mergedByModality = new Map()
  const addRow = (row) => {
    const type = normalizeProgressType(row)
    if (!row?.unitId || !type) return
    const normalized = { ...row, type }
    const key = `${row.unitId}:${type}`
    const previous = mergedByModality.get(key)
    if (!previous) {
      mergedByModality.set(key, normalized)
      return
    }

    const previousMs = timestampMillis(previous.timestamp)
    const currentMs = timestampMillis(normalized.timestamp)
    mergedByModality.set(key, {
      ...(currentMs >= previousMs ? previous : normalized),
      ...(currentMs >= previousMs ? normalized : previous),
      score: Math.max(Number(previous.score || 0), Number(normalized.score || 0)),
      timestamp: currentMs >= previousMs ? normalized.timestamp : previous.timestamp,
    })
  }

  buildSummaryProgressHistory(summary).forEach(addRow)
  recentHistory.forEach(addRow)

  return Array.from(mergedByModality.values()).sort(
    (a, b) => timestampMillis(b.timestamp) - timestampMillis(a.timestamp)
  )
}
