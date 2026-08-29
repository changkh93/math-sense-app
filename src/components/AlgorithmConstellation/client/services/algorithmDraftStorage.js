/**
 * Small, user-scoped local draft storage. Drafts are convenience data only;
 * server state remains authoritative for stars, challenges, and completion.
 */

const DRAFT_PREFIX = 'msense_alg_draft_v2_'
const DRAFT_TTL_MS = 7 * 24 * 60 * 60 * 1000
const MAX_DRAFT_CODE_LENGTH = 8_000
const SAFE_DRAFT_STATES = new Set([
  'BRIEFING',
  'OBSERVE',
  'EXPLORE',
  'CODE',
  'RUN_SUCCESS',
  'UNDERSTANDING_CHECK',
  'TRANSFER_CHALLENGE',
  'COMPLETE',
])
const SAFE_SHELLS = new Set(['explorer', 'navigator', 'pro'])
const CONCEPT_PROGRESS_PREFIX = 'msense_alg_python_concepts_v1_'
const MAX_CONCEPT_IDS = 100

function storageOrNull(storage) {
  if (storage) return storage
  return typeof window !== 'undefined' ? window.localStorage : null
}

export function getDraftStorageKey(problemId, problemVersion = 1, ownerKey) {
  if (!problemId || typeof ownerKey !== 'string' || !ownerKey.trim()) return null
  return `${DRAFT_PREFIX}${encodeURIComponent(ownerKey.trim())}_${encodeURIComponent(problemId)}_v${problemVersion}`
}

export function normalizeDraftFsmState(value) {
  return SAFE_DRAFT_STATES.has(value) ? value : 'OBSERVE'
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
  observeCompleted = false,
  exploreCompleted = false,
  stars = 0,
  completionResult = null,
  storage,
  now = Date.now,
}) {
  const targetStorage = storageOrNull(storage)
  const key = getDraftStorageKey(problemId, problemVersion, ownerKey)
  if (!targetStorage || !key) return false
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
      observeCompleted: Boolean(observeCompleted),
      exploreCompleted: Boolean(exploreCompleted),
      stars: typeof stars === 'number' ? stars : 0,
      completionResult: completionResult || null,
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
  if (!targetStorage || !key) return null
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
      observeCompleted: Boolean(parsed.observeCompleted),
      exploreCompleted: Boolean(parsed.exploreCompleted),
      stars: typeof parsed.stars === 'number' ? parsed.stars : 0,
      completionResult: parsed.completionResult || null,
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
  if (!targetStorage || !key) return false
  try {
    targetStorage.removeItem(key)
    return true
  } catch (error) {
    console.warn('Failed to clear algorithm draft:', error)
    return false
  }
}

export function loadCompletedPythonConceptIds({ ownerKey, storage } = {}) {
  const targetStorage = storageOrNull(storage)
  if (!targetStorage || typeof ownerKey !== 'string' || !ownerKey.trim()) return []
  try {
    const parsed = JSON.parse(targetStorage.getItem(`${CONCEPT_PROGRESS_PREFIX}${encodeURIComponent(ownerKey.trim())}`) || '[]')
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((id) => typeof id === 'string' && id.length <= 80)
      .slice(0, MAX_CONCEPT_IDS)
  } catch {
    return []
  }
}

export function markPythonConceptCompleted({ ownerKey, conceptId, storage } = {}) {
  const targetStorage = storageOrNull(storage)
  if (!targetStorage || typeof ownerKey !== 'string' || !ownerKey.trim()) return false
  if (typeof conceptId !== 'string' || !conceptId || conceptId.length > 80) return false
  try {
    const completed = new Set(loadCompletedPythonConceptIds({ ownerKey: ownerKey.trim(), storage: targetStorage }))
    completed.add(conceptId)
    targetStorage.setItem(
      `${CONCEPT_PROGRESS_PREFIX}${encodeURIComponent(ownerKey.trim())}`,
      JSON.stringify([...completed].slice(-MAX_CONCEPT_IDS)),
    )
    return true
  } catch {
    return false
  }
}
