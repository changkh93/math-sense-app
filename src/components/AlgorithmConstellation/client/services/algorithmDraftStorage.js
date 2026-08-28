/**
 * Small, user-scoped local draft storage. Drafts are convenience data only;
 * server state remains authoritative for stars, challenges, and completion.
 */

const DRAFT_PREFIX = 'msense_alg_draft_v2_'
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_DRAFT_CODE_LENGTH = 8_000
const SAFE_DRAFT_STATES = new Set(['OBSERVE', 'EXPLORE', 'CODE'])
const SAFE_SHELLS = new Set(['explorer', 'navigator', 'pro'])

function storageOrNull(storage) {
  if (storage) return storage
  return typeof window !== 'undefined' ? window.localStorage : null
}

export function getDraftStorageKey(problemId, problemVersion = 1, ownerKey = 'guest_default') {
  const safeOwner = ownerKey || 'guest_default'
  return `${DRAFT_PREFIX}${encodeURIComponent(safeOwner)}_${encodeURIComponent(problemId)}_v${problemVersion}`
}

export function normalizeDraftFsmState(value) {
  return SAFE_DRAFT_STATES.has(value) ? value : 'CODE'
}

export function saveAlgorithmDraft({
  problemId,
  problemVersion = 1,
  ownerKey,
  requestId,
  attemptId = null,
  code = '',
  fsmState = 'OBSERVE',
  shell = 'explorer',
  storage,
  now = Date.now,
}) {
  const targetStorage = storageOrNull(storage)
  const key = getDraftStorageKey(problemId, problemVersion, ownerKey)
  if (!targetStorage || !problemId || !key) return false
  try {
    const boundedCode = String(code).slice(0, MAX_DRAFT_CODE_LENGTH)
    targetStorage.setItem(key, JSON.stringify({
      schemaVersion: 2,
      problemId,
      problemVersion,
      requestId: typeof requestId === 'string' ? requestId : null,
      attemptId: typeof attemptId === 'string' ? attemptId : null,
      code: boundedCode,
      fsmState: normalizeDraftFsmState(fsmState),
      shell: SAFE_SHELLS.has(shell) ? shell : 'explorer',
      savedAt: now(),
    }))
    return true
  } catch (error) {
    console.warn('Failed to auto-save algorithm draft:', error)
    return false
  }
}

export function loadAlgorithmDraft({
  problemId,
  problemVersion = 1,
  ownerKey,
  storage,
  now = Date.now,
}) {
  const targetStorage = storageOrNull(storage)
  const key = getDraftStorageKey(problemId, problemVersion, ownerKey)
  if (!targetStorage || !problemId || !key) return null
  try {
    const stored = targetStorage.getItem(key)
    if (!stored) return null
    const parsed = JSON.parse(stored)
    const isValid = parsed?.schemaVersion === 2 &&
      parsed.problemId === problemId &&
      parsed.problemVersion === problemVersion &&
      typeof parsed.code === 'string' &&
      parsed.code.length <= MAX_DRAFT_CODE_LENGTH &&
      Number.isFinite(parsed.savedAt) &&
      now() - parsed.savedAt >= 0 &&
      now() - parsed.savedAt < DRAFT_TTL_MS
    if (!isValid) {
      targetStorage.removeItem(key)
      return null
    }
    return {
      ...parsed,
      fsmState: normalizeDraftFsmState(parsed.fsmState),
      shell: SAFE_SHELLS.has(parsed.shell) ? parsed.shell : 'explorer',
    }
  } catch (error) {
    console.warn('Failed to load algorithm draft:', error)
    try { targetStorage.removeItem(key) } catch { /* no-op */ }
    return null
  }
}

export function clearAlgorithmDraft({ problemId, problemVersion = 1, ownerKey, storage }) {
  const targetStorage = storageOrNull(storage)
  const key = getDraftStorageKey(problemId, problemVersion, ownerKey)
  if (!targetStorage || !problemId || !key) return false
  try {
    targetStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn('Failed to clear algorithm draft:', error)
    return false
  }
}
