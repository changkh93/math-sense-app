export const VIDEO_END_RESUME_TOLERANCE_SECONDS = 3
export const LONG_VIDEO_SECONDS = 40 * 60
export const STANDARD_VIDEO_COMPLETION_THRESHOLD = 0.95
export const LONG_VIDEO_COMPLETION_THRESHOLD = 0.85

const toNonNegativeSecond = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}

export const getVideoPlaybackRange = ({
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
} = {}) => {
  const start = toNonNegativeSecond(contentStart)
  const videoDuration = toNonNegativeSecond(duration)
  const configuredEnd = toNonNegativeSecond(contentEnd)
  const end = configuredEnd > start
    ? Math.min(configuredEnd, videoDuration || configuredEnd)
    : videoDuration

  return {
    start,
    end,
    segmentDuration: end > start ? end - start : 0,
  }
}

export const isVideoPositionInRange = ({
  position = 0,
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
  allowEnd = true,
} = {}) => {
  const numericPosition = Number(position)
  if (!Number.isFinite(numericPosition)) return false

  const { start, end } = getVideoPlaybackRange({ duration, contentStart, contentEnd })
  if (numericPosition < start) return false
  if (end <= start) return true
  return allowEnd ? numericPosition <= end : numericPosition < end
}

export const sanitizeVideoStamps = ({
  stampedSeconds = [],
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
} = {}) => {
  const { start, end } = getVideoPlaybackRange({ duration, contentStart, contentEnd })
  const unique = new Set()

  if (!Array.isArray(stampedSeconds)) return []
  stampedSeconds.forEach((value) => {
    const numericValue = Number(value)
    if (!Number.isFinite(numericValue)) return
    const second = Math.floor(numericValue)
    if (second < start) return
    if (end > start && second >= end) return
    unique.add(second)
  })

  return Array.from(unique).sort((a, b) => a - b)
}

export const sanitizeVideoPosition = ({
  position = 0,
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
} = {}) => {
  const { start } = getVideoPlaybackRange({ duration, contentStart, contentEnd })
  return isVideoPositionInRange({ position, duration, contentStart, contentEnd })
    ? toNonNegativeSecond(position)
    : start
}

export const getVideoCompletionThreshold = (segmentDuration = 0) => (
  segmentDuration > LONG_VIDEO_SECONDS
    ? LONG_VIDEO_COMPLETION_THRESHOLD
    : STANDARD_VIDEO_COMPLETION_THRESHOLD
)

export const getVideoCompletionMetrics = ({
  stampedSeconds = [],
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
} = {}) => {
  const range = getVideoPlaybackRange({ duration, contentStart, contentEnd })
  const validStamps = sanitizeVideoStamps({
    stampedSeconds,
    duration,
    contentStart,
    contentEnd,
  })
  // Preserve the existing long-video policy (85% for source videos over 40
  // minutes), while applying that percentage to the assigned segment only.
  const thresholdDuration = toNonNegativeSecond(duration) || range.segmentDuration
  const threshold = getVideoCompletionThreshold(thresholdDuration)
  const coverage = range.segmentDuration > 0
    ? Math.min(1, validStamps.length / range.segmentDuration)
    : 0

  return {
    ...range,
    validStamps,
    coveredSeconds: validStamps.length,
    coverage,
    thresholdDuration,
    threshold,
    targetPercent: Math.round(threshold * 100),
    completed: range.segmentDuration > 0 && coverage >= threshold,
  }
}

export const getVideoResumeRecovery = ({
  resumePosition = 0,
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
  toleranceSeconds = VIDEO_END_RESUME_TOLERANCE_SECONDS,
} = {}) => {
  const position = toNonNegativeSecond(resumePosition)
  const { start, end: playbackEnd } = getVideoPlaybackRange({
    duration,
    contentStart,
    contentEnd,
  })
  const tolerance = Math.max(0, Number(toleranceSeconds) || 0)

  return {
    restartPosition: start,
    playbackEnd,
    shouldRestart: playbackEnd > start && position >= Math.max(start, playbackEnd - tolerance),
  }
}

// Merges a session's cumulative fields with the last known server values.
// totalTimeSpent and stampedSeconds are monotonic across sessions, so writes
// must never lower them — a session that (wrongly) restored from zero would
// otherwise overwrite the student's whole watch history at the next save.
export const mergeCumulativeVideoProgress = (serverTx = {}, {
  totalTimeSpent = 0,
  stampedSeconds = [],
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
} = {}) => {
  const serverStamps = Array.isArray(serverTx.stampedSeconds) ? serverTx.stampedSeconds : []
  return {
    totalTimeSpent: Math.max(Number(serverTx.totalTimeSpent) || 0, Number(totalTimeSpent) || 0),
    stampedSeconds: sanitizeVideoStamps({
      stampedSeconds: [...serverStamps, ...(Array.isArray(stampedSeconds) ? stampedSeconds : [])],
      duration,
      contentStart,
      contentEnd,
    }),
  }
}
