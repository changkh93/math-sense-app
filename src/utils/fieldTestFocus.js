// Field Test recovery is independent of document.hasFocus(): a visible page can
// receive a real touch while a tablet browser still reports hasFocus() = false.
export const isQuizFullscreenAvailable = (documentRef) => (
  documentRef.fullscreenEnabled !== false
  && typeof documentRef.documentElement?.requestFullscreen === 'function'
)

export const requestQuizFullscreen = (documentRef, {
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  timeoutMs = 4000,
} = {}) => {
  let timer
  return new Promise((resolve, reject) => {
    timer = setTimer(() => reject(new Error('FULLSCREEN_TIMEOUT')), timeoutMs)
    // Invoke synchronously to retain the browser's transient user activation.
    try {
      Promise.resolve(documentRef.documentElement.requestFullscreen()).then(resolve, reject)
    } catch (error) {
      reject(error)
    }
  }).finally(() => clearTimer(timer))
}

// No answer text, DOM text, URLs or raw error messages enter the diagnostic log.
// Pointer movement is deliberately not recorded; keep only recent actions.
export const createQuizFocusDiagnostics = ({ now = Date.now } = {}) => {
  const events = []
  let lastPersistedAt = -Infinity
  return {
    record(event, context) {
      const entry = { event, clientTime: now(), ...context }
      events.push(entry)
      if (events.length > 24) events.shift()
      return entry
    },
    snapshot: () => events.map(entry => ({ ...entry })),
    shouldPersist() {
      const time = now()
      if (time - lastPersistedAt < 15000) return false
      lastPersistedAt = time
      return true
    },
  }
}
