import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  consumeGoogleRedirect,
  getGoogleAuthErrorMessage,
  readGoogleRedirectIntent,
  signInWithGooglePopup,
  startGoogleRedirect,
  writeGoogleRedirectIntent,
} from '../src/utils/googleAuthFlow.js'

const createStorage = () => {
  const values = new Map()
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  }
}

{
  let slowCalls = 0
  let timerCallback = null
  let clearedTimer = null
  let resolvePopup = null
  const credential = { user: { uid: 'user-1' } }
  const popupPromise = signInWithGooglePopup({}, {}, {
    popupImpl: () => new Promise((resolve) => { resolvePopup = resolve }),
    onSlow: () => { slowCalls += 1 },
    setTimer: (callback) => {
      timerCallback = callback
      return 17
    },
    clearTimer: (timer) => { clearedTimer = timer },
  })
  timerCallback()
  assert.equal(slowCalls, 1)
  resolvePopup(credential)
  assert.deepEqual(await popupPromise, credential)
  assert.equal(clearedTimer, 17)
}

{
  const storage = createStorage()
  writeGoogleRedirectIntent({ path: '/invite/abc', purpose: 'invite' }, { storage, now: 1_000 })
  assert.deepEqual(readGoogleRedirectIntent({ storage, now: 2_000 }), {
    path: '/invite/abc',
    purpose: 'invite',
    createdAt: 1_000,
  })
  assert.equal(readGoogleRedirectIntent({ storage, now: 1_000 + (16 * 60 * 1000) }), null)
}

{
  const storage = createStorage()
  let redirected = false
  await startGoogleRedirect({}, {}, { path: '/', purpose: 'login' }, {
    storage,
    redirectImpl: async () => { redirected = true },
  })
  assert.equal(redirected, true)
  const consumed = await consumeGoogleRedirect({}, {
    storage,
    redirectResultImpl: async () => ({ user: { uid: 'user-2' } }),
  })
  assert.equal(consumed.intent.path, '/')
  assert.equal(consumed.result.user.uid, 'user-2')
  assert.equal(readGoogleRedirectIntent({ storage }), null)
}

assert.match(
  getGoogleAuthErrorMessage({ code: 'auth/popup-blocked' }),
  /새 창 없이 로그인을 이용/,
)
assert.match(
  getGoogleAuthErrorMessage({ code: 'auth/unauthorized-domain' }),
  /등록되지 않았습니다/,
)

const spaceHomeSource = readFileSync(new URL('../src/components/Space/SpaceHome.jsx', import.meta.url), 'utf8')
assert.match(
  spaceHomeSource,
  /const clearSignupPrompt = useCallback\(\(\) => \{\s*window\.sessionStorage\.removeItem\(LOGIN_NOTICE_KEY\)\s*setSignupPrompt\(null\)/,
  'successful login must have a single cleanup path for stale signup notices',
)
assert.match(
  spaceHomeSource,
  /if \(isActiveMemberDoc\(parentSnap\)\) \{\s*clearSignupPrompt\(\)\s*navigate\('\/parent\/dashboard'\)/,
  'parent login must clear a stale signup notice before routing',
)
assert.match(
  spaceHomeSource,
  /if \(isActiveMemberDoc\(userSnap\)\) \{\s*clearSignupPrompt\(\)\s*return true/,
  'student login must clear a stale signup notice before continuing',
)

console.log('google auth flow tests passed')
