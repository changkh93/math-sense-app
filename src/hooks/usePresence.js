import { useEffect, useMemo, useRef } from 'react'
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

const safePathSegment = (value) => String(value || '')
  .trim()
  .split('')
  .map((character) => '.#$[]/'.includes(character) ? '_' : character)
  .join('')
  .slice(0, 180)

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

export function usePresence(userId, clusterId, currentLocation, unitId, activeRoomId, clusterName, publicProfile = {}) {
  const connectionRef = useRef(null)
  const enteredAtMsRef = useRef(null)

  const payload = useMemo(() => ({
    uid: cleanText(userId, 180),
    state: typeof document !== 'undefined' && document.hidden ? 'away' : 'online',
    currentLocation: cleanText(currentLocation || '메인 화면', 120),
    clusterId: cleanText(clusterId || 'cluster_elementary', 100),
    clusterName: cleanText(clusterName, 80),
    unitId: cleanText(unitId, 180),
    activeRoomId: cleanText(activeRoomId, 180),
    publicDisplayName: cleanText(publicProfile.publicDisplayName, 40),
    studentName: cleanText(publicProfile.studentName, 40),
    name: cleanText(publicProfile.name, 40),
    displayName: cleanText(publicProfile.displayName, 40),
    gradeLabel: cleanText(publicProfile.gradeLabel || publicProfile.grade || publicProfile.schoolGrade || publicProfile.studentGrade, 30),
    crewId: cleanText(publicProfile.crewId, 180),
    crewName: cleanText(publicProfile.crewName, 80),
    crewColor: cleanText(publicProfile.crewColor, 30),
    role: cleanText(publicProfile.role, 30),
    studyInvitePreference: cleanText(publicProfile.studyInvitePreference || 'open', 30),
  }), [activeRoomId, clusterId, clusterName, currentLocation, publicProfile, unitId, userId])

  const latestPayloadRef = useRef(payload)
  useEffect(() => {
    enteredAtMsRef.current = Date.now()
    latestPayloadRef.current = payload
    if (!connectionRef.current) return
    set(connectionRef.current, {
      ...payload,
      enteredAtMs: enteredAtMsRef.current,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    }).catch((error) => console.warn('Failed to update realtime presence', error))
  }, [payload])

  useEffect(() => {
    const safeUid = safePathSegment(userId)
    if (!safeUid) return undefined
    enteredAtMsRef.current = Date.now()

    const connectionsRef = ref(realtimeDb, `userPresence/${safeUid}/connections`)
    const currentConnectionRef = push(connectionsRef)
    const connectedRef = ref(realtimeDb, '.info/connected')
    const lastSeenRef = ref(realtimeDb, `userPresence/${safeUid}/lastSeenMs`)
    const disconnectConnection = onDisconnect(currentConnectionRef)
    const disconnectLastSeen = onDisconnect(lastSeenRef)
    connectionRef.current = currentConnectionRef

    const writeCurrentState = (state) => set(currentConnectionRef, {
      ...latestPayloadRef.current,
      state,
      enteredAtMs: enteredAtMsRef.current,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    })

    const unsubscribeConnected = onValue(connectedRef, async (snapshot) => {
      if (snapshot.val() !== true) return
      try {
        await disconnectConnection.remove()
        await disconnectLastSeen.set(serverTimestamp())
        await writeCurrentState(document.hidden ? 'away' : 'online')
      } catch (error) {
        console.warn('Failed to establish realtime presence', error)
      }
    })

    let awayTimer = null
    const handleVisibilityChange = () => {
      window.clearTimeout(awayTimer)
      if (document.hidden) {
        awayTimer = window.setTimeout(() => writeCurrentState('away').catch(() => {}), 3000)
      } else {
        writeCurrentState('online').catch(() => {})
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearTimeout(awayTimer)
      unsubscribeConnected()
      connectionRef.current = null
      disconnectConnection.cancel().catch(() => {})
      disconnectLastSeen.cancel().catch(() => {})
      set(lastSeenRef, serverTimestamp()).catch(() => {})
      remove(currentConnectionRef).catch(() => {})
    }
  }, [userId])
}
