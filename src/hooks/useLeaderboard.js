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
  const [rawRankings, setRawRankings] = useState([])
  const [loading, setLoading] = useState(true)
  const [userNameMap, setUserNameMap] = useState({})

  // 1. 사용자 이름 맵 구독 (users 컬렉션)
  useEffect(() => {
    let unsubscribe = null
    let cleanupTimeout = null

    const q = query(collection(db, 'users'), limit(500))
    unsubscribe = onSnapshot(q, (snapshot) => {
      const map = {}
      snapshot.docs.forEach(doc => {
        const d = doc.data()
        map[doc.id] = d.studentName || d.name || '무명 탐험가'
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
      setRawRankings([])
      setLoading(false)
      return
    }

    // Soft Loading: Only set loading=true if we have no rankings yet
    if (rawRankings.length === 0) {
      setLoading(true)
    }

    const fetchScopedRankings = async () => {
      try {
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
        const userScores = {} 

        snap.docs.forEach(doc => {
          const d = doc.data()
          if (d.type && d.type !== 'quiz') return
          if (d.score === undefined || d.score === null) return
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
          const ts = d.timestamp?.toMillis() || Date.now()
          
          if (!userScores[uid].units[uId]) {
            userScores[uid].units[uId] = { 
              bestScore: d.score, 
              initialScore: d.initialScore !== undefined ? d.initialScore : d.score, 
              attemptCount: d.attemptCount || 1,
              firstTimestamp: ts
            }
          } else {
            const unitData = userScores[uid].units[uId]
            unitData.bestScore = Math.max(unitData.bestScore, d.score)
            if (ts < unitData.firstTimestamp) {
              unitData.firstTimestamp = ts
              unitData.initialScore = d.initialScore !== undefined ? d.initialScore : d.score
            }
            unitData.attemptCount += (d.attemptCount || 1)
          }

          if (d.crystalsEarned) {
            userScores[uid].totalCrystals += d.crystalsEarned
          }
          if (ts && ts < userScores[uid].firstTimestamp) {
            userScores[uid].firstTimestamp = ts
          }
        })

        const ranked = Object.entries(userScores).map(([uid, data]) => {
          const scores = Object.values(data.units).map(u => u.bestScore)
          const totalScoreSum = scores.reduce((sum, s) => sum + s, 0)
          const unitCount = scores.length
          const avgScore = unitCount > 0 ? totalScoreSum / unitCount : 0
          const perfectCount = scores.filter(s => s === 100).length

          return {
            id: uid,
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

        ranked.sort((a, b) => {
          if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore
          if (b.avgInitialScore !== a.avgInitialScore) return b.avgInitialScore - a.avgInitialScore
          if (b.totalCrystals !== a.totalCrystals) return b.totalCrystals - a.totalCrystals
          if (b.totalAttemptCount !== a.totalAttemptCount) return b.totalAttemptCount - a.totalAttemptCount
          if (b.unitCount !== a.unitCount) return b.unitCount - a.unitCount
          return a.firstTimestamp - b.firstTimestamp
        })

        let currentRank = 1
        for (let i = 0; i < ranked.length; i++) {
          if (i > 0) {
            const prev = ranked[i - 1]
            const curr = ranked[i]
            const isTie = prev.avgScore === curr.avgScore &&
                          prev.avgInitialScore === curr.avgInitialScore &&
                          prev.totalCrystals === curr.totalCrystals &&
                          prev.totalAttemptCount === curr.totalAttemptCount &&
                          prev.unitCount === curr.unitCount &&
                          prev.firstTimestamp === curr.firstTimestamp
            if (!isTie) currentRank = i + 1
          }
          ranked[i].rank = currentRank
        }

        setRawRankings(ranked)
      } catch (error) {
        console.error('useLeaderboard: collection group query error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchScopedRankings()
  }, [regionId, chapterId, unitId])

  const result = useMemo(() => {
    // Map names dynamically
    const rankings = rawRankings.map(r => ({
      ...r,
      name: userNameMap[r.id] || '무명 탐험가'
    }))

    const myData = rankings.find(u => u.id === userId) || null
    const myRank = myData?.rank || null

    return {
      rankings,
      myRank,
      myData,
      loading,
      totalCount: rankings.length,
    }
  }, [rawRankings, userNameMap, userId, loading])

  return result
}

