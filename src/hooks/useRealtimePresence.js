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

    let raw = null
    let offset = 0
    const publish = () => {
      if (raw === null) return
      const next = {}
      Object.entries(raw).forEach(([uid, value]) => {
        next[uid] = normalizeRealtimePresence(uid, value, Date.now() + offset)
      })
      setResult({ presenceByUid: next, status: 'ready' })
    }
    const unsubscribeOffset = onValue(ref(realtimeDb, '.info/serverTimeOffset'), snapshot => {
      offset = Number(snapshot.val() || 0)
      publish()
    })
    const timer = window.setInterval(publish, 30_000)
    const unsubscribe = onValue(ref(realtimeDb, 'userPresence'), snapshot => {
      raw = snapshot.val() || {}
      publish()
    }, (error) => {
      raw = null
      console.warn('Failed to subscribe realtime presence', error)
      setResult({ presenceByUid: {}, status: 'error' })
    })
    return () => {
      unsubscribe()
      unsubscribeOffset()
      window.clearInterval(timer)
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

    let raw = {}
    const publish = () => setPresence(normalizeRealtimePresence(uid, raw))
    const timer = window.setInterval(publish, 30_000)
    const unsubscribe = onValue(ref(realtimeDb, `userPresence/${safeUid}`), (snapshot) => {
      raw = snapshot.val() || {}
      publish()
    }, (error) => {
      raw = {}
      console.warn('Failed to subscribe user presence', error)
      setPresence(null)
    })
    return () => { unsubscribe(); window.clearInterval(timer) }
  }, [enabled, safeUid, uid])

  return enabled && safeUid ? presence : null
}
