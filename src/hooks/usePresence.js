import { useEffect, useMemo, useRef } from 'react'
import {
  onDisconnect,
  onValue,
  push,
  ref,
  remove,
  serverTimestamp,
  set,
  update,
} from 'firebase/database'
import { realtimeDb } from '../firebase'
import { PRESENCE_HEARTBEAT_MS } from '../utils/realtimePresence'

const safePathSegment = (value) => String(value || '')
  .trim()
  .split('')
  .map((character) => '.#$[]/'.includes(character) ? '_' : character)
  .join('')
  .slice(0, 180)

const cleanText = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

export function usePresence(userId, clusterId, currentLocation, unitId, activeRoomId, clusterName, publicProfile = {}) {
  const publishRef = useRef(null)
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
    publishRef.current?.()

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
    let disposed = false
    let ready = false
    let generation = 0

    const writeCurrentState = (state) => set(currentConnectionRef, {
      ...latestPayloadRef.current,
      state,
      enteredAtMs: enteredAtMsRef.current,
      updatedAt: serverTimestamp(),
      updatedAtMs: Date.now(),
    })

    const publish = () => {
      if (!disposed && ready) {
        writeCurrentState(document.hidden ? 'away' : 'online')
          .catch(error => console.warn('Failed to update realtime presence', error))
      }
    }
    publishRef.current = publish
    const unsubscribeConnected = onValue(connectedRef, async (snapshot) => {
      const currentGeneration = ++generation
      ready = false
      if (disposed || snapshot.val() !== true) return
      try {
        // Never publish before the server has registered disconnect cleanup.
        await disconnectConnection.remove()
        if (disposed || currentGeneration !== generation) return
        await disconnectLastSeen.set(serverTimestamp())
        if (disposed || currentGeneration !== generation) return
        ready = true
        publish()
      } catch (error) {
        console.warn('Failed to establish realtime presence', error)
      }
    })

    const heartbeat = window.setInterval(() => {
      if (disposed || !ready || document.hidden) return
      // Small update; do not resend the public profile on every heartbeat.
      update(currentConnectionRef, {
        state: 'online', updatedAt: serverTimestamp(), updatedAtMs: Date.now(),
      }).catch(error => console.warn('Failed to refresh realtime presence', error))
    }, PRESENCE_HEARTBEAT_MS)

    let awayTimer = null
    const handleVisibilityChange = () => {
      window.clearTimeout(awayTimer)
      if (document.hidden) {
        awayTimer = window.setTimeout(publish, 3000)
      } else {
        publish()
      }
    }
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      disposed = true
      ready = false
      generation++
      window.clearInterval(heartbeat)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.clearTimeout(awayTimer)
      unsubscribeConnected()
      publishRef.current = null
      // Keep onDisconnect armed if removal fails (e.g. logout or network loss).
      set(lastSeenRef, serverTimestamp()).catch(() => {})
      remove(currentConnectionRef).catch(() => {})
    }
  }, [userId])
}
