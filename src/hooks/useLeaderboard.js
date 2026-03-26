import { useState, useEffect, useMemo } from 'react'
import { db, auth } from '../firebase'
import { collection, collectionGroup, query, where, limit, getDocs, onSnapshot } from 'firebase/firestore'

/**
 * useLeaderboard – Region/Chapter/Unit 범위 내 퀴즈 점수 기반 순위 데이터 훅
 *
 * Firestore 컬렉션 그룹 쿼리(users/{uid}/history)를 사용하여
 * 특정 범위 내에서 퀴즈를 완료한 사용자들의 순위를 계산합니다.
 *
 * @param {string} userId - 현재 로그인 사용자 UID
 * @param {{ regionId?: string, chapterId?: string, unitId?: string }} scope - 순위 범위
 * @returns {{ rankings, myRank, myData, loading, totalCount }}
 */
export function useLeaderboard(userId, { regionId, chapterId, unitId } = {}) {
  const [rankings, setRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [userNameMap, setUserNameMap] = useState({})

  // 1. 사용자 이름 맵 구독 (users 컬렉션)
  useEffect(() => {
    let unsubscribe = null
    let cleanupTimeout = null

    const q = query(collection(db, 'users'), limit(200))
    unsubscribe = onSnapshot(q, (snapshot) => {
      const map = {}
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        map[doc.id] = d.name || '무명 탐험가'
      })
      setUserNameMap(map)
    }, (error) => {
      console.error('useLeaderboard: user names error:', error)
    })

    return () => {
      if (cleanupTimeout) clearTimeout(cleanupTimeout)
      if (unsubscribe) {
        if (!auth.currentUser) {
          unsubscribe()
        } else {
          cleanupTimeout = setTimeout(() => { if (unsubscribe) unsubscribe() }, 100)
        }
      }
    }
  }, [])

  // 2. 범위별 퀴즈 기록 조회 (collection group query on history)
  useEffect(() => {
    if (!regionId && !chapterId && !unitId) {
      setRankings([])
      setLoading(false)
      return
    }

    setLoading(true)

    const fetchScopedRankings = async () => {
      try {
        // Build collection group query
        const historyGroup = collectionGroup(db, 'history')
        let q
        if (unitId) {
          q = query(historyGroup, where('unitId', '==', unitId))
        } else if (chapterId) {
          q = query(historyGroup, where('chapterId', '==', chapterId))
        } else {
          q = query(historyGroup, where('regionId', '==', regionId))
        }

        const snap = await getDocs(q)

        // Aggregate: userId → { units, totalCrystals, firstTimestamp }
        const userScores = {} 

        snap.docs.forEach(doc => {
          const d = doc.data()

          // Quiz entries only (no type field or type === 'quiz')
          if (d.type && d.type !== 'quiz') return

          // Skip entries with no score
          if (d.score === undefined || d.score === null) return

          // Extract userId from doc path: users/{userId}/history/{historyId}
          const uid = doc.ref.parent.parent?.id
          if (!uid) return

          if (!userScores[uid]) {
            userScores[uid] = { 
              units: {}, 
              totalCrystals: 0, 
              firstTimestamp: d.timestamp?.toMillis() || Date.now() 
            }
          }

          const uId = d.unitId
          if (!uId) return

          // Track metrics per unit
          const unitData = userScores[uid].units[uId] || { bestScore: 0, initialScore: d.score, attemptCount: 1 }
          
          unitData.bestScore = Math.max(unitData.bestScore, d.score)
          if (d.initialScore !== undefined) unitData.initialScore = d.initialScore
          if (d.attemptCount !== undefined) unitData.attemptCount = Math.max(unitData.attemptCount, d.attemptCount)
          
          userScores[uid].units[uId] = unitData

          // Accumulate total crystals earned in this scope
          if (d.crystalsEarned) {
            userScores[uid].totalCrystals += d.crystalsEarned
          }

          // Track earliest achievement in this scope
          const ts = d.timestamp?.toMillis()
          if (ts && ts < userScores[uid].firstTimestamp) {
            userScores[uid].firstTimestamp = ts
          }
        })

        // Calculate average best score per user
        const ranked = Object.entries(userScores).map(([uid, data]) => {
          const scores = Object.values(data.units).map(u => u.bestScore)
          const totalScoreSum = scores.reduce((sum, s) => sum + s, 0)
          const unitCount = scores.length
          const avgScore = unitCount > 0 ? totalScoreSum / unitCount : 0
          const perfectCount = scores.filter(s => s === 100).length

          return {
            id: uid,
            name: userNameMap[uid] || '무명 탐험가',
            avgScore: Math.round(avgScore * 10) / 10,
            avgInitialScore: Math.round((unitCount > 0 ? Object.values(data.units).reduce((sum, u) => sum + u.initialScore, 0) / unitCount : 0) * 10) / 10,
            totalAttemptCount: Object.values(data.units).reduce((sum, u) => sum + (u.attemptCount || 1), 0),
            totalScore: totalScoreSum,
            unitCount,
            perfectCount,
            totalCrystals: data.totalCrystals,
            firstTimestamp: data.firstTimestamp,
            bestScores: data.units,
          }
        })

        /**
         * Tie-breaking Sort:
         * 1. avgScore (desc)
         * 2. unitCount (desc)
         * 3. totalCrystals (desc)
         * 4. firstTimestamp (asc)
         */
        ranked.sort((a, b) => {
          if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore
          if (b.unitCount !== a.unitCount) return b.unitCount - a.unitCount
          if (b.totalCrystals !== a.totalCrystals) return b.totalCrystals - a.totalCrystals
          return a.firstTimestamp - b.firstTimestamp
        })

        // Dense ranking
        let currentRank = 1
        for (let i = 0; i < ranked.length; i++) {
          if (i > 0) {
            const prev = ranked[i - 1]
            const curr = ranked[i]
            const isTie = prev.avgScore === curr.avgScore &&
                          prev.unitCount === curr.unitCount &&
                          prev.totalCrystals === curr.totalCrystals &&
                          prev.firstTimestamp === curr.firstTimestamp
            if (!isTie) currentRank = i + 1
          }
          ranked[i].rank = currentRank
        }

        setRankings(ranked)
      } catch (error) {
        console.error('useLeaderboard: collection group query error:', error)
        setRankings([])
      } finally {
        setLoading(false)
      }
    }

    fetchScopedRankings()
  }, [regionId, chapterId, unitId, userNameMap])

  const result = useMemo(() => {
    const myData = rankings.find(u => u.id === userId) || null
    const myRank = myData?.rank || null

    return {
      rankings,
      myRank,
      myData,
      loading,
      totalCount: rankings.length,
    }
  }, [rankings, userId, loading])

  return result
}
