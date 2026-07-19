import { useEffect, useMemo, useState } from 'react'
import { httpsCallable } from 'firebase/functions'
import { functions } from '../firebase'

export function useLeaderboard(userId, { regionId, chapterId, unitId } = {}) {
  const scopeKey = unitId ? `unit:${unitId}` : chapterId ? `chapter:${chapterId}` : regionId ? `region:${regionId}` : ''
  const [result, setResult] = useState({ scopeKey: '', rankings: [] })

  useEffect(() => {
    const scope = unitId
      ? { unitId }
      : chapterId
        ? { chapterId }
        : regionId
          ? { regionId }
          : null
    if (!scope) return undefined

    let cancelled = false
    httpsCallable(functions, 'getCachedLeaderboard')(scope).then((result) => {
      if (!cancelled) setResult({ scopeKey, rankings: Array.isArray(result.data?.rankings) ? result.data.rankings : [] })
    }).catch((error) => {
      console.error('useLeaderboard: cached leaderboard error:', error)
      if (!cancelled) setResult({ scopeKey, rankings: [] })
    })
    return () => { cancelled = true }
  }, [chapterId, regionId, scopeKey, unitId])

  return useMemo(() => {
    const rankings = result.scopeKey === scopeKey ? result.rankings : []
    const myData = rankings.find((row) => row.id === userId) || null
    return {
      rankings,
      myRank: myData?.rank || null,
      myData,
      loading: Boolean(scopeKey) && result.scopeKey !== scopeKey,
      totalCount: rankings.length,
    }
  }, [result, scopeKey, userId])
}
