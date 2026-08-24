// Tab hiding is handled immediately by visibilitychange. Window blur is noisier
// (browser chrome, permission prompts, and OS UI can all trigger it), so only a
// sustained loss of focus is treated as a quiz-integrity event.
export const QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS = 1800

export const createSustainedBlurGuard = ({
  canStart,
  shouldConfirm,
  onConfirmed,
  delayMs = QUIZ_WINDOW_BLUR_CONFIRM_DELAY_MS,
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  now = Date.now,
} = {}) => {
  let timerId = null
  let startedAt = 0

  const cancel = () => {
    if (timerId !== null) clearTimer(timerId)
    timerId = null
    startedAt = 0
  }

  const start = () => {
    if (typeof canStart === 'function' && !canStart()) return false

    cancel()
    startedAt = now()
    timerId = setTimer(() => {
      timerId = null
      const durationMs = Math.max(0, now() - startedAt)
      startedAt = 0
      if (typeof shouldConfirm === 'function' && !shouldConfirm()) return
      onConfirmed?.({ durationMs })
    }, delayMs)
    return true
  }

  return {
    start,
    cancel,
    dispose: cancel,
    isPending: () => timerId !== null,
  }
}
