import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

const CHECKPOINT_INTERVAL_MS = 30_000
const IDLE_PROMPT_MS = 3 * 60_000
const IDLE_EXIT_MS = 5 * 60_000

const randomId = () => globalThis.crypto?.randomUUID?.()
  || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`

const callPlay = (name, payload = {}) => httpsCallable(functions, name)(payload).then((result) => result.data)

function storageKey(uid, suffix) {
  return `metasense_galaxy_play_${uid || 'anonymous'}_${suffix}`
}

function readStoredSession(uid) {
  if (!uid || typeof window === 'undefined') return null
  try {
    const value = JSON.parse(sessionStorage.getItem(storageKey(uid, 'session')) || 'null')
    return value?.sessionId && value?.resumeToken ? value : null
  } catch {
    return null
  }
}

function writeStoredSession(uid, value) {
  if (!uid || typeof window === 'undefined') return
  if (!value) {
    sessionStorage.removeItem(storageKey(uid, 'session'))
    sessionStorage.removeItem(storageKey(uid, 'start_request'))
    return
  }
  sessionStorage.setItem(storageKey(uid, 'session'), JSON.stringify(value))
}

function getClientInstanceId(uid) {
  if (!uid || typeof window === 'undefined') return ''
  const key = storageKey(uid, 'client_instance')
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const next = randomId()
  sessionStorage.setItem(key, next)
  return next
}

function getOrCreateStartRequestId(uid) {
  const key = storageKey(uid, 'start_request')
  const existing = sessionStorage.getItem(key)
  if (existing) return existing
  const next = randomId()
  sessionStorage.setItem(key, next)
  return next
}

function formatEndReason(reason) {
  if (reason === 'kst_midnight') return '날짜가 바뀌어 오늘의 탐험을 마쳤어요.'
  if (reason === 'idle_timeout') return '잠시 자리를 비운 동안 행성이 안전하게 귀환했어요.'
  if (reason === 'connection_timeout') return '연결 복구 시간이 지나 행성이 안전하게 귀환했어요.'
  if (reason === 'daily_limit') return '오늘의 탐험 시간을 모두 사용했어요.'
  if (reason === 'manual_exit') return '오늘의 탐험을 안전하게 마쳤어요.'
  return '이번 탐험 시간이 끝났어요.'
}

export function useGalaxyPlaySession({ uid, active }) {
  const [session, setSession] = useState(() => readStoredSession(uid))
  const [access, setAccess] = useState(null)
  const [busy, setBusy] = useState('')
  const [error, setError] = useState('')
  const [serverOffsetMs, setServerOffsetMs] = useState(0)
  const [nowMs, setNowMs] = useState(Date.now())
  const [idleWarning, setIdleWarning] = useState(false)
  const [connectionState, setConnectionState] = useState(() => typeof navigator === 'undefined' || navigator.onLine ? 'online' : 'reconnecting')
  const [endedSummary, setEndedSummary] = useState(null)
  const sequenceRef = useRef(Number(session?.sequenceNumber || 0))
  const lastInteractionRef = useRef(Date.now())
  const endingRef = useRef(false)
  const checkpointRef = useRef(null)

  useEffect(() => {
    const restored = readStoredSession(uid)
    setSession(restored)
    setAccess(null)
    setError('')
    setEndedSummary(null)
    setIdleWarning(false)
    sequenceRef.current = Number(restored?.sequenceNumber || 0)
  }, [uid])

  const lastAccessFetchedAtRef = useRef(0)

  const syncServerClock = useCallback((serverNowMs, sentAtMs = Date.now(), receivedAtMs = Date.now()) => {
    if (!Number.isFinite(Number(serverNowMs))) return
    setServerOffsetMs(Number(serverNowMs) - Math.round((sentAtMs + receivedAtMs) / 2))
  }, [])

  const loadAccess = useCallback(async ({ force = false } = {}) => {
    if (!uid) return null
    const now = Date.now()
    if (!force && lastAccessFetchedAtRef.current && (now - lastAccessFetchedAtRef.current < 10_000) && access) {
      return access
    }
    setBusy('access')
    setError('')
    const sentAtMs = Date.now()
    try {
      const result = await callPlay('getGalaxyPlayAccess')
      syncServerClock(result?.serverNowMs, sentAtMs, Date.now())
      lastAccessFetchedAtRef.current = Date.now()
      setAccess(result)
      return result
    } catch (loadError) {
      setError(loadError?.message || '게임 이용시간을 확인하지 못했습니다.')
      return null
    } finally {
      setBusy('')
    }
  }, [access, syncServerClock, uid])

  const startSession = useCallback(async () => {
    if (!uid || busy) return null
    setBusy('start')
    setError('')
    const clientInstanceId = getClientInstanceId(uid)
    const startRequestId = getOrCreateStartRequestId(uid)
    const sentAtMs = Date.now()
    try {
      const result = await callPlay('startGalaxyPlaySession', { clientInstanceId, startRequestId })
      const nextSession = { ...result.session, sequenceNumber: 0 }
      syncServerClock(result?.serverNowMs, sentAtMs, Date.now())
      setSession(nextSession)
      setAccess(result.access || null)
      setEndedSummary(null)
      setIdleWarning(false)
      sequenceRef.current = 0
      lastInteractionRef.current = Date.now()
      writeStoredSession(uid, nextSession)
      sessionStorage.removeItem(storageKey(uid, 'start_request'))
      return nextSession
    } catch (startError) {
      const details = startError?.details || {}
      if (details?.nextAllowedAtMs) {
        setAccess((current) => ({
          ...(current || {}),
          canStart: false,
          blockedReason: details.reason || 'cooldown',
          runtime: { status: 'cooldown', nextAllowedAtMs: details.nextAllowedAtMs },
        }))
      }
      setError(startError?.message || '아스트라 프론티어에 입장하지 못했습니다.')
      return null
    } finally {
      setBusy('')
    }
  }, [busy, syncServerClock, uid])

  const finishLocally = useCallback((summary = {}) => {
    const currentSession = readStoredSession(uid) || session
    const endedAtMs = Number(summary.endedAtMs || Date.now() + serverOffsetMs)
    const chargedSeconds = Number(summary.chargedSeconds || Math.max(0, Math.ceil((endedAtMs - Number(currentSession?.startedAtMs || endedAtMs)) / 1000)))
    const endReason = summary.endReason || 'time_limit'
    const nextAllowedAtMs = Number(summary.nextAllowedAtMs || endedAtMs + 20 * 60_000)
    setEndedSummary({
      endReason,
      title: formatEndReason(endReason),
      endedAtMs,
      chargedSeconds,
      nextAllowedAtMs,
    })
    setSession(null)
    setIdleWarning(false)
    writeStoredSession(uid, null)
    endingRef.current = false
  }, [serverOffsetMs, session, uid])

  const endSession = useCallback(async (reason = 'manual_exit') => {
    const currentSession = readStoredSession(uid) || session
    if (!uid || !currentSession?.sessionId || endingRef.current) return endedSummary
    endingRef.current = true
    setBusy('end')
    setError('')
    const sentAtMs = Date.now()
    try {
      const result = await callPlay('endGalaxyPlaySession', {
        sessionId: currentSession.sessionId,
        clientInstanceId: currentSession.clientInstanceId,
        resumeToken: currentSession.resumeToken,
        reason,
      })
      syncServerClock(result?.serverNowMs, sentAtMs, Date.now())
      finishLocally({ ...result, endReason: result.endReason || reason })
      return result
    } catch (endError) {
      if (!navigator.onLine) {
        finishLocally({
          endReason: reason,
          endedAtMs: Math.min(
            Number(currentSession.hardEndsAtMs || Date.now()),
            Number(currentSession.leaseExpiresAtMs || Date.now()),
          ),
        })
        return null
      }
      setError(endError?.message || '게임 종료 상태를 확인하지 못했습니다.')
      endingRef.current = false
      return null
    } finally {
      setBusy('')
    }
  }, [endedSummary, finishLocally, session, syncServerClock, uid])

  const checkpoint = useCallback(async () => {
    const currentSession = readStoredSession(uid) || session
    if (!uid || !active || !currentSession?.sessionId || endingRef.current) return null
    if (!navigator.onLine || document.visibilityState !== 'visible') {
      setConnectionState('reconnecting')
      return null
    }
    if (checkpointRef.current) return checkpointRef.current
    sequenceRef.current += 1
    const sequenceNumber = sequenceRef.current
    const sentAtMs = Date.now()
    const promise = callPlay('checkpointGalaxyPlaySession', {
      sessionId: currentSession.sessionId,
      clientInstanceId: currentSession.clientInstanceId,
      resumeToken: currentSession.resumeToken,
      sequenceNumber,
      visible: true,
      recentActivity: Date.now() - lastInteractionRef.current < IDLE_PROMPT_MS,
    }).then((result) => {
      syncServerClock(result?.serverNowMs, sentAtMs, Date.now())
      setConnectionState('online')
      if (result?.ended) {
        finishLocally({
          endReason: result.endReason,
          endedAtMs: result.endedAtMs,
        })
        return result
      }
      const nextSession = {
        ...currentSession,
        sequenceNumber,
        hardEndsAtMs: Number(result?.hardEndsAtMs || currentSession.hardEndsAtMs),
        leaseExpiresAtMs: Number(result?.leaseExpiresAtMs || currentSession.leaseExpiresAtMs),
      }
      setSession(nextSession)
      writeStoredSession(uid, nextSession)
      return result
    }).catch((checkpointError) => {
      setConnectionState('reconnecting')
      const code = String(checkpointError?.code || '')
      if (code.includes('failed-precondition') || code.includes('permission-denied') || code.includes('not-found')) {
        finishLocally({ endReason: 'connection_timeout' })
      }
      return null
    }).finally(() => {
      checkpointRef.current = null
    })
    checkpointRef.current = promise
    return promise
  }, [active, finishLocally, session, syncServerClock, uid])

  const acknowledgeIdle = useCallback(() => {
    lastInteractionRef.current = Date.now()
    setIdleWarning(false)
    checkpoint()
  }, [checkpoint])

  const clearEndedSummary = useCallback(() => {
    setEndedSummary(null)
    setError('')
    setAccess(null)
  }, [])

  useEffect(() => {
    if (!active || !session?.sessionId) return undefined
    const recordInteraction = () => {
      lastInteractionRef.current = Date.now()
      setIdleWarning(false)
    }
    const events = ['pointerdown', 'pointermove', 'keydown', 'touchstart', 'wheel']
    events.forEach((eventName) => window.addEventListener(eventName, recordInteraction, { passive: true }))
    return () => events.forEach((eventName) => window.removeEventListener(eventName, recordInteraction))
  }, [active, session?.sessionId])

  useEffect(() => {
    if (!active || !session?.sessionId) return undefined
    checkpoint()
    const timer = window.setInterval(checkpoint, CHECKPOINT_INTERVAL_MS)
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkpoint()
      else setConnectionState('reconnecting')
    }
    const handleOnline = () => checkpoint()
    const handleOffline = () => setConnectionState('reconnecting')
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [active, checkpoint, session?.sessionId])

  useEffect(() => {
    if (!active || !session?.sessionId) return undefined
    const timer = window.setInterval(() => {
      const nextNow = Date.now()
      setNowMs(nextNow)
      const estimatedServerNow = nextNow + serverOffsetMs
      const idleMs = nextNow - lastInteractionRef.current
      if (idleMs >= IDLE_EXIT_MS) {
        endSession('idle_timeout')
        return
      }
      if (idleMs >= IDLE_PROMPT_MS) setIdleWarning(true)
      if (Number(session.hardEndsAtMs || 0) <= estimatedServerNow) endSession('time_limit')
    }, 1000)
    return () => window.clearInterval(timer)
  }, [active, endSession, serverOffsetMs, session?.hardEndsAtMs, session?.sessionId])

  const estimatedServerNowMs = nowMs + serverOffsetMs
  const remainingSeconds = session?.hardEndsAtMs
    ? Math.max(0, Math.ceil((Number(session.hardEndsAtMs) - estimatedServerNowMs) / 1000))
    : 0
  const sessionElapsedSeconds = session?.startedAtMs
    ? Math.max(0, Math.ceil((estimatedServerNowMs - Number(session.startedAtMs)) / 1000))
    : 0
  const dailyUsedSeconds = session
    ? Math.min(
        Number(session.dailyLimitSeconds || access?.policy?.dailyLimitSeconds || 0),
        Number(access?.daily?.completedSeconds || 0) + sessionElapsedSeconds,
      )
    : Number(access?.daily?.usedSeconds || 0)
  const warningStage = remainingSeconds <= 60 ? 1 : remainingSeconds <= 120 ? 2 : remainingSeconds <= 300 ? 5 : 0

  return useMemo(() => ({
    session,
    access,
    busy,
    error,
    idleWarning,
    connectionState,
    endedSummary,
    remainingSeconds,
    sessionElapsedSeconds,
    dailyUsedSeconds,
    warningStage,
    loadAccess,
    startSession,
    endSession,
    checkpoint,
    acknowledgeIdle,
    clearEndedSummary,
  }), [
    access,
    acknowledgeIdle,
    busy,
    checkpoint,
    clearEndedSummary,
    connectionState,
    dailyUsedSeconds,
    endSession,
    endedSummary,
    error,
    idleWarning,
    loadAccess,
    remainingSeconds,
    session,
    sessionElapsedSeconds,
    startSession,
    warningStage,
  ])
}
