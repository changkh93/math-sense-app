/**
 * Attempt-session recovery helpers shared by the mission shell.
 *
 * The server expires attempt sessions lazily against `expiresAt` without ever
 * rewriting `session.state`, so a resumed draft can hold a session that still
 * looks active (state: STARTED-family) while every submission fails with
 * FAILED_PRECONDITION. These helpers let the client detect that state and
 * rotate to a fresh attempt instead of dead-ending the student.
 */

// Attempts in these states are read-only on the server; every submission would
// fail with FAILED_PRECONDITION until a fresh attempt (new requestId) is started.
export const TERMINAL_ATTEMPT_STATES = new Set(['FINALIZED', 'EXPIRED', 'ABANDONED', 'INTEGRITY_TERMINATED'])

export function normalizeCallableErrorCode(error) {
  return String(error?.code || '')
    .replace(/^functions\//, '')
    .replaceAll('-', '_')
    .toUpperCase()
}

// A session is usable only while it is non-terminal AND unexpired. The server
// returns expiresAt on startAttempt precisely so clients can make this call.
export function isAttemptSessionUsable(session, currentTime = Date.now()) {
  if (!session?.attemptId) return false
  if (TERMINAL_ATTEMPT_STATES.has(session.state)) return false
  const expiresAt = Number(session.expiresAt)
  if (Number.isFinite(expiresAt) && expiresAt <= currentTime) return false
  return true
}

// FAILED_PRECONDITION variants that mean "the current stage cannot proceed on
// this attempt" (expired attempt, finished attempt, or stage evidence that the
// attempt never issued); rotating to a fresh attempt is the correct recovery.
const ATTEMPT_DEAD_MESSAGES = [
  /시도 시간이 만료/,
  /이미 종료된 시도/,
  /서버가 발급한 이해 확인 문제가 아닙니다/,
]

export function isAttemptDeadError(error) {
  if (normalizeCallableErrorCode(error) !== 'FAILED_PRECONDITION') return false
  const message = String(error?.message || '')
  return ATTEMPT_DEAD_MESSAGES.some((pattern) => pattern.test(message))
}

// The transfer challenge token lives 1h while the attempt session lives 2h, so
// a long idle on the transfer stage can leave a live attempt holding a stale
// token. Recovery is a re-issue, not an attempt rotation.
export function isTransferTokenError(error) {
  if (normalizeCallableErrorCode(error) !== 'FAILED_PRECONDITION') return false
  return /전이 문제 토큰이 올바르지 않거나 만료/.test(String(error?.message || ''))
}
