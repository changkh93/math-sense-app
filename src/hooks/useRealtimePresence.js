import { useEffect, useMemo, useState } from 'react'
import { onValue, ref } from 'firebase/database'
import { realtimeDb } from '../firebase'

const safePathSegment = (value) => String(value || '')
  .trim()
  .split('')
  .map((character) => '.#$[]/'.includes(character) ? '_' : character)
  .join('')
  .slice(0, 180)

const timestampLike = (value) => {
  const millis = Number(value || 0)
  return millis > 0 ? { toMillis: () => millis, toDate: () => new Date(millis) } : null
}

export function normalizeRealtimePresence(uid, value) {
  const connections = Object.values(value?.connections || {})
    .filter((connection) => connection && typeof connection === 'object')
    .sort((a, b) => Number(b.updatedAtMs || 0) - Number(a.updatedAtMs || 0))
  const active = connections[0]
  const lastSeenMs = Number(active?.updatedAtMs || value?.lastSeenMs || 0)

  if (!active) {
    return {
      uid,
      liveStatus: {
        state: 'offline',
        lastUpdatedAt: timestampLike(lastSeenMs),
      },
    }
  }

  return {
    uid,
    ...active,
    liveStatus: {
      ...active,
      state: active.state || 'online',
      lastUpdatedAt: timestampLike(lastSeenMs),
      enteredAt: timestampLike(active.enteredAtMs || lastSeenMs),
    },
  }
}

export function useAllUserPresence(enabled = true) {
  const [presenceByUid, setPresenceByUid] = useState({})

  useEffect(() => {
    if (!enabled) return undefined

    return onValue(ref(realtimeDb, 'userPresence'), (snapshot) => {
      const next = {}
      Object.entries(snapshot.val() || {}).forEach(([uid, value]) => {
        next[uid] = normalizeRealtimePresence(uid, value)
      })
      setPresenceByUid(next)
    }, (error) => {
      console.warn('Failed to subscribe realtime presence', error)
      setPresenceByUid({})
    })
  }, [enabled])

  return enabled ? presenceByUid : {}
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
