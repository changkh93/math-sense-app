import { httpsCallable } from 'firebase/functions'
import { auth, functions } from '../../firebase'

// Per-account, bounded in-memory cache. Nothing is placed in browser storage.
const requests = new Map()
export async function requestCoachAdvice(uid, payload, learningConsent = false, learningSamplesConsent = false) {
  if (!auth.currentUser || auth.currentUser.uid !== uid || auth.currentUser.isAnonymous) throw new Error('로그인한 수강생 계정에서 AI 도움을 사용할 수 있어요.')
  const stamp = Date.now()
  for (const [key, item] of requests) if (item.expires < stamp) requests.delete(key)
  const key = JSON.stringify([uid, payload])
  if (requests.has(key)) return requests.get(key).promise
  if (requests.size >= 50) requests.delete(requests.keys().next().value)
  const promise = httpsCallable(functions, 'studioErrorCoach', { timeout: 30000 })({ ...payload, learningConsent, learningSamplesConsent }).then(result => result.data).catch(error => {
    if (['functions/failed-precondition', 'functions/permission-denied', 'functions/unauthenticated', 'functions/invalid-argument'].includes(error.code)) requests.delete(key)
    // Keep the rejected promise too: a network timeout might already be billed.
    const messages = {
      'functions/failed-precondition': ({
        'coach-disabled': 'AI 도움이 운영 설정에서 꺼져 있어요. 선생님께 활성화를 요청해 주세요. 기본 힌트는 사용할 수 있어요.',
        'structure-not-ready': '코드 보호 설정을 확인해야 AI 도움을 사용할 수 있어요. 선생님께 알려 주세요.',
        'connection-not-ready': 'AI 연결 설정을 확인해야 해요. 선생님께 알려 주세요.'
      })[error.details?.reason] || 'AI 도움의 운영 설정을 확인해야 해요. 기다리기보다 선생님께 알려 주세요.',
      'functions/resource-exhausted': '잠시 쉬거나 기본 힌트를 살펴보세요. 사용량 제한에 도달했을 수 있어요.',
      'functions/already-exists': '같은 오류의 도움을 이미 요청했어요. 받은 힌트를 살펴보고 코드를 바꿔 다시 실행해 보세요.',
      'functions/permission-denied': '파이썬 수강 권한을 확인해 주세요.',
      'functions/unauthenticated': '로그인 후 다시 이용해 주세요.'
    }
    throw new Error(messages[error.code] || 'AI에 연결하지 못했어요. 자동 재요청은 하지 않아요. 기본 힌트를 사용하거나 선생님께 질문해 주세요.')
  })
  requests.set(key, { promise, expires: stamp + 15 * 60000 })
  return promise
}
