import { useEffect, useMemo, useRef, useState } from 'react'
import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
} from 'firebase/database'
import { realtimeDb } from '../firebase'

const BLOCKED_BATTLE_ROLES = new Set(['admin', 'parent', 'teacher', 'operator'])

const safePathSegment = (value) => String(value || '')
  .trim()
  .split('')
  .map((character) => '.#$[]/'.includes(character) ? '_' : character)
  .join('')
  .slice(0, 180)

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

const getDisplayName = (user, userData) => cleanText(
  userData?.publicDisplayName ||
  userData?.studentName ||
  userData?.name ||
  user?.displayName ||
  '탐사원',
  40,
)

export function useQuizBattlePresence({
  enabled,
  user,
  userData,
  clusterId,
  regionId,
  phase,
  waitingUids,
}) {
  const [onlineOpponents, setOnlineOpponents] = useState([])
  const [isLoadingOnline, setIsLoadingOnline] = useState(Boolean(enabled))
  const [presenceError, setPresenceError] = useState('')
  const connectionRef = useRef(null)
  const latestPayloadRef = useRef(null)

  const scopePath = useMemo(() => {
    const safeClusterId = safePathSegment(clusterId)
    const safeRegionId = safePathSegment(regionId)
    return safeClusterId && safeRegionId
      ? `quizBattlePresence/${safeClusterId}/${safeRegionId}`
      : ''
  }, [clusterId, regionId])

  const presencePayload = useMemo(() => ({
    uid: user?.uid || '',
    displayName: getDisplayName(user, userData),
    gradeLabel: cleanText(
      userData?.gradeLabel || userData?.grade || userData?.schoolGrade || userData?.studentGrade,
      30,
    ),
    crewName: cleanText(userData?.crewName, 50),
    locationLabel: '퀴즈 배틀 아레나',
    role: cleanText(userData?.role, 30).toLowerCase(),
    isGuest: userData?.isGuest === true || userData?.role === 'guest',
    challengeMutedUntilMs: Number(userData?.quizBattlePreferences?.challengeMutedUntilMs || 0),
    phase: cleanText(phase || 'idle', 20),
  }), [phase, user, userData])

  useEffect(() => {
    const nextPayload = {
      ...presencePayload,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    }
    latestPayloadRef.current = nextPayload
    if (connectionRef.current) {
      set(connectionRef.current, nextPayload).catch((err) => {
        console.warn('Failed to update quiz battle presence', err)
      })
    }
  }, [presencePayload])

  useEffect(() => {
    if (!enabled || !user?.uid || !scopePath) return undefined

    const userConnectionsRef = ref(
      realtimeDb,
      `${scopePath}/${safePathSegment(user.uid)}/connections`,
    )
    const currentConnectionRef = push(userConnectionsRef)
    const connectedRef = ref(realtimeDb, '.info/connected')
    const disconnectRegistration = onDisconnect(currentConnectionRef)
    connectionRef.current = currentConnectionRef

    const unsubscribeConnected = onValue(connectedRef, async (snap) => {
      if (snap.val() !== true) return
      try {
        // 연결 표시보다 onDisconnect 제거 예약을 먼저 등록해 끊김 race를 막는다.
        await disconnectRegistration.remove()
        await set(currentConnectionRef, latestPayloadRef.current)
      } catch (err) {
        console.warn('Failed to establish quiz battle presence', err)
      }
    })

    return () => {
      unsubscribeConnected()
      connectionRef.current = null
      disconnectRegistration.cancel().catch(() => {})
      remove(currentConnectionRef).catch(() => {})
    }
  }, [enabled, scopePath, user?.uid])

  useEffect(() => {
    if (!enabled || !user?.uid || !scopePath) {
      return undefined
    }

    const scopeRef = ref(realtimeDb, scopePath)
    return onValue(scopeRef, (snap) => {
      const nowMs = Date.now()
      const rows = Object.entries(snap.val() || {}).reduce((opponents, [uid, presence]) => {
        if (uid === user.uid || waitingUids.has(uid)) return opponents

        const connections = Object.values(presence?.connections || {})
          .filter((connection) => connection && typeof connection === 'object')
          .sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0))
        const availableConnection = connections.find((connection) => connection.phase === 'idle')
        if (!availableConnection) return opponents

        const role = cleanText(availableConnection.role, 30).toLowerCase()
        if (BLOCKED_BATTLE_ROLES.has(role)) return opponents
        if (Number(availableConnection.challengeMutedUntilMs || 0) > nowMs) return opponents

        opponents.push({
          uid,
          displayName: cleanText(availableConnection.displayName || '탐사원', 40),
          gradeLabel: cleanText(availableConnection.gradeLabel, 30),
          crewName: cleanText(availableConnection.crewName, 50),
          locationLabel: cleanText(availableConnection.locationLabel || '퀴즈 배틀 아레나', 60),
          isGuest: availableConnection.isGuest === true,
          lastSeenMs: Number(availableConnection.updatedAtMs || nowMs),
        })
        return opponents
      }, [])

      rows.sort((a, b) => b.lastSeenMs - a.lastSeenMs)
      setOnlineOpponents(rows.slice(0, 30))
      setIsLoadingOnline(false)
      setPresenceError('')
    }, (err) => {
      console.warn('Failed to listen to quiz battle presence', err)
      setOnlineOpponents([])
      setIsLoadingOnline(false)
      setPresenceError('온라인 탐사원 목록을 실시간으로 연결하지 못했습니다.')
    })
  }, [enabled, scopePath, user?.uid, waitingUids])

  return { onlineOpponents, isLoadingOnline, presenceError }
}
