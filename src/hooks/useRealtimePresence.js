import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { realtimeDb } from '../firebase'
import { normalizeRealtimePresence } from '../utils/realtimePresence'

const safePathSegment = (value) => String(value || '')
  .trim()
  .split('')
  .map((character) => '.#$[]/'.includes(character) ? '_' : character)
  .join('')
  .slice(0, 180)

export { normalizeRealtimePresence } from '../utils/realtimePresence'

export function useAllUserPresenceState(enabled = true) {
  const [result, setResult] = useState({ presenceByUid: {}, status: 'loading' })

  useEffect(() => {
    if (!enabled) return undefined

    const unsubscribe = onValue(ref(realtimeDb, 'userPresence'), (snapshot) => {
      const next = {}
      Object.entries(snapshot.val() || {}).forEach(([uid, value]) => {
        next[uid] = normalizeRealtimePresence(uid, value)
      })
      setResult({ presenceByUid: next, status: 'ready' })
    }, (error) => {
      console.warn('Failed to subscribe realtime presence', error)
      setResult({ presenceByUid: {}, status: 'error' })
    })
    return () => {
      unsubscribe()
      setResult({ presenceByUid: {}, status: 'loading' })
    }
  }, [enabled])

  return enabled ? result : { presenceByUid: {}, status: 'loading' }
}

export function useAllUserPresence(enabled = true) {
  return useAllUserPresenceState(enabled).presenceByUid
}

export function useUserPresence(uid, enabled = true) {
  const safeUid = useMemo(() => safePathSegment(uid), [uid])
  const [presence, setPresence] = useState(null)

  useEffect(() => {
    if (!enabled || !safeUid) return undefined

    return onValue(ref(realtimeDb, `userPresence/${safeUid}`), (snapshot) => {
      setPresence(normalizeRealtimePresence(uid, snapshot.val() || {}))
    }, (error) => {
      console.warn('Failed to subscribe user presence', error)
      setPresence(null)
    })
  }, [enabled, safeUid, uid])

  return enabled && safeUid ? presence : null
}
