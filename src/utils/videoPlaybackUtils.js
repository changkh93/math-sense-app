export const VIDEO_END_RESUME_TOLERANCE_SECONDS = 3

const toNonNegativeSecond = (value) => {
  const number = Number(value)
  return Number.isFinite(number) ? Math.max(0, Math.floor(number)) : 0
}
export const getVideoResumeRecovery = ({
  resumePosition = 0,
  duration = 0,
  contentStart = 0,
  contentEnd = 0,
  toleranceSeconds = VIDEO_END_RESUME_TOLERANCE_SECONDS,
} = {}) => {
  const position = toNonNegativeSecond(resumePosition)
  const start = toNonNegativeSecond(contentStart)
  const videoDuration = toNonNegativeSecond(duration)
  const configuredEnd = toNonNegativeSecond(contentEnd)
  const tolerance = Math.max(0, Number(toleranceSeconds) || 0)
  const playbackEnd = configuredEnd > start
    ? Math.min(configuredEnd, videoDuration || configuredEnd)
    : videoDuration

  return {
    restartPosition: start,
    playbackEnd,
    shouldRestart: playbackEnd > start && position >= Math.max(start, playbackEnd - tolerance),
  }
}
