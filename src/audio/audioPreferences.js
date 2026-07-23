/**
 * audioPreferences.js
 * 사용자 선호 오디오 설정 관리 (User-Scoped localStorage & Lifecycle)
 */

export const AUDIO_PREFS_VERSION = 1
export const AUDIO_STORAGE_PREFIX = 'metasense_audio_preferences_v1_'

export const DEFAULT_AUDIO_PREFERENCES = Object.freeze({
  version: AUDIO_PREFS_VERSION,
  enabled: true,
  ambience: 0.55,
  action: 0.65,
  ui: 0.45,
  quietMode: false,
  reducedSpatial: false,
  updatedAt: 0,
})

function createDefaultPreferences() {
  return { ...DEFAULT_AUDIO_PREFERENCES, updatedAt: Date.now() }
}

/**
 * Storage Key 생성 헬퍼
 * @param {string} [uid]
 * @returns {string}
 */
export function getStorageKey(uid) {
  if (!uid) return `${AUDIO_STORAGE_PREFIX}guest`
  return `${AUDIO_STORAGE_PREFIX}${uid}`
}

/**
 * 설정 값 검증 및 범위 clamp
 * @param {Object} rawPrefs 
 * @returns {Object}
 */
export function sanitizePreferences(rawPrefs) {
  if (!rawPrefs || typeof rawPrefs !== 'object') {
    return createDefaultPreferences()
  }

  const clamp = (val, def) => {
    if (val === null || val === '' || typeof val === 'boolean') return def
    const num = Number(val)
    if (!Number.isFinite(num)) return def
    return Math.max(0, Math.min(1, num))
  }
  const strictBoolean = (value, fallback) => (
    typeof value === 'boolean' ? value : fallback
  )
  const parsedUpdatedAt = Number(rawPrefs.updatedAt)

  return {
    version: AUDIO_PREFS_VERSION,
    enabled: strictBoolean(rawPrefs.enabled, DEFAULT_AUDIO_PREFERENCES.enabled),
    ambience: clamp(rawPrefs.ambience, DEFAULT_AUDIO_PREFERENCES.ambience),
    action: clamp(rawPrefs.action, DEFAULT_AUDIO_PREFERENCES.action),
    ui: clamp(rawPrefs.ui, DEFAULT_AUDIO_PREFERENCES.ui),
    quietMode: strictBoolean(rawPrefs.quietMode, DEFAULT_AUDIO_PREFERENCES.quietMode),
    reducedSpatial: strictBoolean(rawPrefs.reducedSpatial, DEFAULT_AUDIO_PREFERENCES.reducedSpatial),
    updatedAt: Number.isFinite(parsedUpdatedAt) && parsedUpdatedAt > 0 ? parsedUpdatedAt : Date.now(),
  }
}

/**
 * 사용자 선호 설정 로드
 * @param {string} [uid] 
 * @param {boolean} [isGuest=false] 
 * @returns {Object}
 */
export function loadAudioPreferences(uid, isGuest = false) {
  try {
    if (typeof window === 'undefined') return createDefaultPreferences()
    const useSessionStorage = isGuest || !uid
    const storage = useSessionStorage ? window.sessionStorage : window.localStorage
    if (!storage) return createDefaultPreferences()

    const key = getStorageKey(uid)
    const item = storage.getItem(key)

    if (!item) {
      return createDefaultPreferences()
    }

    const parsed = JSON.parse(item)
    return sanitizePreferences(parsed)
  } catch (err) {
    console.warn('[AudioPreferences] Failed to load preferences:', err)
    return createDefaultPreferences()
  }
}

/**
 * 사용자 선호 설정 저장
 * @param {string} [uid] 
 * @param {Object} prefs 
 * @param {boolean} [isGuest=false] 
 * @returns {boolean}
 */
export function saveAudioPreferences(uid, prefs, isGuest = false) {
  try {
    if (typeof window === 'undefined') return false
    const useSessionStorage = isGuest || !uid
    const storage = useSessionStorage ? window.sessionStorage : window.localStorage
    if (!storage) return false

    const key = getStorageKey(uid)
    const sanitized = sanitizePreferences({ ...prefs, updatedAt: Date.now() })
    storage.setItem(key, JSON.stringify(sanitized))
    return true
  } catch (err) {
    console.warn('[AudioPreferences] Failed to save preferences:', err)
    return false
  }
}

/**
 * 특정 UID 저장소 정리
 * @param {string} uid 
 */
export function clearUserPreferences(uid, isGuest = false) {
  try {
    if (typeof window === 'undefined') return
    const key = getStorageKey(uid)
    if (isGuest || !uid) {
      window.sessionStorage?.removeItem(key)
    } else {
      window.localStorage?.removeItem(key)
    }
  } catch (err) {
    console.warn('[AudioPreferences] Failed to clear user preferences:', err)
  }
}

/**
 * 만료된 (30일 초과) audio preferences 정리
 * @param {number} [maxAgeDays=30]
 */
export function cleanExpiredAudioPreferences(maxAgeDays = 30) {
  try {
    if (typeof window === 'undefined') return
    const storage = window.localStorage
    if (!storage) return

    const now = Date.now()
    const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000

    const keysToRemove = []
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith(AUDIO_STORAGE_PREFIX)) {
        try {
          const item = storage.getItem(key)
          if (item) {
            const parsed = JSON.parse(item)
            const updatedAt = Number(parsed.updatedAt)
            if (!Number.isFinite(updatedAt) || updatedAt <= 0 || now - updatedAt > maxAgeMs) {
              keysToRemove.push(key)
            }
          }
        } catch {
          keysToRemove.push(key)
        }
      }
    }

    keysToRemove.forEach((key) => storage.removeItem(key))
  } catch (err) {
    console.warn('[AudioPreferences] Failed to clean expired preferences:', err)
  }
}
