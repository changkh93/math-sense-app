import { useEffect, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

const ONLINE_REFRESH_INTERVAL_MS = 30000

export function useQuizBattlePresence({
  enabled,
  user,
  clusterId,
  regionId,
  entryUnitId,
}) {
  const [onlineOpponents, setOnlineOpponents] = useState([])
  const [isLoadingOnline, setIsLoadingOnline] = useState(Boolean(enabled))
  const [presenceError, setPresenceError] = useState('')

  useEffect(() => {
    if (!enabled || !user?.uid || !clusterId || !regionId || !entryUnitId) {
      setOnlineOpponents([])
      setIsLoadingOnline(false)
      setPresenceError('')
      return undefined
    }

    let cancelled = false
    let requestInFlight = false
    const listOnline = httpsCallable(functions, 'listQuizBattleOnlineOpponents')

    const refresh = async ({ initial = false } = {}) => {
      if (requestInFlight) return
      requestInFlight = true
      if (initial) setIsLoadingOnline(true)
      try {
        const response = await listOnline({ clusterId, regionId, entryUnitId })
        if (cancelled) return
        setOnlineOpponents(Array.isArray(response.data?.opponents) ? response.data.opponents : [])
        setPresenceError('')
      } catch (error) {
        console.warn('Failed to load quiz battle opponents', error)
        if (cancelled) return
        setOnlineOpponents([])
        setPresenceError('온라인 탐사원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
      } finally {
        requestInFlight = false
        if (!cancelled && initial) setIsLoadingOnline(false)
      }
    }

    refresh({ initial: true })
    const refreshTimer = window.setInterval(() => refresh(), ONLINE_REFRESH_INTERVAL_MS)

    return () => {
      cancelled = true
      window.clearInterval(refreshTimer)
    }
  }, [clusterId, enabled, entryUnitId, regionId, user?.uid])

  return { onlineOpponents, isLoadingOnline, presenceError }
}
