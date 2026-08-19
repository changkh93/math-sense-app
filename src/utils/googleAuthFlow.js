import { getRedirectResult, signInWithPopup, signInWithRedirect } from 'firebase/auth'

export const GOOGLE_POPUP_SLOW_DELAY_MS = 4000
export const GOOGLE_REDIRECT_INTENT_KEY = 'metasenseGoogleRedirectIntent'
const GOOGLE_REDIRECT_INTENT_MAX_AGE_MS = 15 * 60 * 1000

const getSessionStorage = () => (
  typeof window !== 'undefined' ? window.sessionStorage : null
)

export function getGoogleAuthErrorMessage(error) {
  switch (error?.code) {
    case 'auth/popup-blocked':
      return 'Google 계정 선택 창이 차단되었습니다. 새 창 없이 로그인을 이용해 주세요.'
    case 'auth/popup-closed-by-user':
      return 'Google 계정 선택 창이 닫혔습니다. 다시 시도해 주세요.'
    case 'auth/network-request-failed':
      return '네트워크 연결을 확인한 뒤 다시 시도해 주세요.'
    case 'auth/unauthorized-domain':
      return '현재 접속 도메인이 Google 로그인에 등록되지 않았습니다. 관리자에게 문의해 주세요.'
    case 'auth/operation-not-supported-in-this-environment':
      return '이 브라우저에서는 팝업 로그인을 사용할 수 없습니다. 새 창 없이 로그인을 이용해 주세요.'
    default:
      return 'Google 로그인에 실패했습니다. 다시 시도해 주세요.'
  }
}

export async function signInWithGooglePopup(
  auth,
  provider,
  {
    onSlow,
    slowDelayMs = GOOGLE_POPUP_SLOW_DELAY_MS,
    popupImpl = signInWithPopup,
    setTimer = setTimeout,
    clearTimer = clearTimeout,
  } = {},
) {
  const slowTimer = setTimer(() => onSlow?.(), slowDelayMs)
  try {
    return await popupImpl(auth, provider)
  } finally {
    clearTimer(slowTimer)
  }
}

export function writeGoogleRedirectIntent(
  intent,
  { storage = getSessionStorage(), now = Date.now() } = {},
) {
  if (!storage) return
  storage.setItem(GOOGLE_REDIRECT_INTENT_KEY, JSON.stringify({
    path: intent?.path || '/',
    purpose: intent?.purpose || 'login',
    createdAt: now,
  }))
}

export function readGoogleRedirectIntent(
  { storage = getSessionStorage(), now = Date.now() } = {},
) {
  if (!storage) return null
  const raw = storage.getItem(GOOGLE_REDIRECT_INTENT_KEY)
  if (!raw) return null

  try {
    const intent = JSON.parse(raw)
    const age = now - Number(intent?.createdAt || 0)
    if (!intent?.createdAt || age < 0 || age > GOOGLE_REDIRECT_INTENT_MAX_AGE_MS) {
      storage.removeItem(GOOGLE_REDIRECT_INTENT_KEY)
      return null
    }
    return intent
  } catch {
    storage.removeItem(GOOGLE_REDIRECT_INTENT_KEY)
    return null
  }
}

export function clearGoogleRedirectIntent({ storage = getSessionStorage() } = {}) {
  storage?.removeItem(GOOGLE_REDIRECT_INTENT_KEY)
}

export async function startGoogleRedirect(
  auth,
  provider,
  intent,
  {
    storage = getSessionStorage(),
    redirectImpl = signInWithRedirect,
  } = {},
) {
  writeGoogleRedirectIntent(intent, { storage })
  try {
    await redirectImpl(auth, provider)
  } catch (error) {
    clearGoogleRedirectIntent({ storage })
    throw error
  }
}

export async function consumeGoogleRedirect(
  auth,
  {
    storage = getSessionStorage(),
    redirectResultImpl = getRedirectResult,
  } = {},
) {
  const intent = readGoogleRedirectIntent({ storage })
  if (!intent) return { intent: null, result: null }

  try {
    const result = await redirectResultImpl(auth)
    return { intent, result }
  } finally {
    clearGoogleRedirectIntent({ storage })
  }
}
