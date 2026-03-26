import React, { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import '../../styles/leaderboard.css'

/**
 * MissionLeaderboard – MISSION SELECT 페이지용 확장 리더보드
 *
 * 해당 Chapter 내 퀴즈 기록이 있는 사용자들의 Top 10 + 프로그레스 바 + 이웃 순위 + 격려 메시지를 표시합니다.
 * 기본적으로 닫힌 상태로 시작합니다.
 */
export default function MissionLeaderboard({ user, chapterId, chapterTitle }) {
  const [isOpen, setIsOpen] = useState(false)
  const { rankings, myRank, myData, loading, totalCount } = useLeaderboard(user?.uid, { chapterId })

  const top10 = rankings.slice(0, 10)
  const myInTop10 = top10.some(u => u.id === user?.uid)
  const maxScore = rankings.length > 0 ? rankings[0].avgScore : 100

  // Find neighbors (1 above + me + 1 below)
  const neighbors = useMemo(() => {
    if (!myData || myInTop10) return []
    const myIdx = rankings.findIndex(u => u.id === user?.uid)
    if (myIdx < 0) return []

    const result = []
    if (myIdx > 0 && !top10.some(u => u.id === rankings[myIdx - 1].id)) {
      result.push(rankings[myIdx - 1])
    }
    result.push(rankings[myIdx])
    if (myIdx < rankings.length - 1) {
      result.push(rankings[myIdx + 1])
    }
    return result
  }, [rankings, myData, myInTop10, user?.uid, top10])

  const getRankClass = (rank) => {
    if (rank === 1) return 'gold'
    if (rank === 2) return 'silver'
    if (rank === 3) return 'bronze'
    return 'normal'
  }

  const getRankIcon = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return rank
  }

  const renderRow = (u) => {
    const isMe = u.id === user?.uid
    const fillWidth = maxScore > 0 ? Math.min(100, (u.avgScore / maxScore) * 100) : 0

    return (
      <div key={u.id} className={`lb-row ${isMe ? 'lb-me' : ''}`} style={{ flexWrap: 'wrap' }}>
        <div className={`lb-rank ${getRankClass(u.rank)}`}>
          {getRankIcon(u.rank)}
        </div>
        <div className="lb-name">
          {u.name}
          {isMe && <span className="lb-me-badge">ME</span>}
        </div>
        <div className="lb-score">
          최고 {u.avgScore}점
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            최초 {u.avgInitialScore}% / {u.totalAttemptCount}회 시도
          </div>
        </div>
        <div className="lb-progress-wrapper" style={{ flex: '1 1 200px' }}>
          <div className="lb-progress-bar">
            <motion.div
              className="lb-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${fillWidth}%` }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>{u.unitCount}개 단원</span>
            <span>💎 {u.totalCrystals} 광석</span>
          </div>
        </div>
      </div>
    )
  }

  if (!chapterId) return null

  return (
    <div className="leaderboard-container">
      <button
        className="leaderboard-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>📊 CHAPTER LEADERBOARD ({totalCount}명 참여){chapterTitle ? ` — ${chapterTitle}` : ''}</span>
        <span className={`toggle-icon ${isOpen ? 'open' : ''}`}>▼</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            style={{ overflow: 'hidden' }}
          >
            <div className="leaderboard-panel">
              {loading ? (
                <div className="lb-loading">순위 데이터 수신 중...</div>
              ) : rankings.length === 0 ? (
                <div className="lb-empty">이 챕터에서 아직 퀴즈를 완료한 탐험가가 없습니다.</div>
              ) : (
                <>
                  <div className="lb-tiebreaker-info" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                    * 동점 시: 탐사 단원이 많을수록 &gt; 획득 광석이 많을수록 &gt; 먼저 시작한 순으로 랭킹 산정
                  </div>

                  {/* Top 10 with progress bars */}
                  {top10.map(u => renderRow(u))}

                  {/* Separator + My neighborhood (if not in top 10) */}
                  {!myInTop10 && neighbors.length > 0 && (
                    <>
                      <div className="lb-separator">· · · · ·</div>
                      {neighbors.map(u => renderRow(u))}
                    </>
                  )}

                  {/* Encouragement Message */}
                  {myData && (
                    <div className="lb-encourage">
                      {myRank <= 3 ? (
                        <>🌟 축하합니다! <strong>Top 3</strong>에 랭크되어 있습니다! 계속 유지하세요!</>
                      ) : myRank <= 10 ? (
                        <>⭐ <strong>Top 10</strong> 안에 있습니다! 조금만 더 하면 메달권(Top 3)에 진입할 수 있어요!</>
                      ) : (() => {
                        const aboveIdx = rankings.findIndex(u => u.rank === myRank - 1)
                        const above = aboveIdx >= 0 ? rankings[aboveIdx] : null
                        if (above) {
                          const gap = (above.avgScore - myData.avgScore).toFixed(1)
                          if (gap > 0) {
                            return <>🚀 <strong>{above.name}</strong>님을 따라잡기까지 평균 <strong>{gap}점</strong>! 현재 <strong>{totalCount}명 중 {myRank}위</strong>입니다.</>
                          } else {
                            // Points are same, but tiebreaker is different
                            return <>🚀 <strong>{above.name}</strong>님과 평균 점수는 같지만 유닛 수나 광석 차이가 있습니다! 다음 유닛 탐사로 추월하세요! 현재 <strong>{totalCount}명 중 {myRank}위</strong>입니다.</>
                          }
                        }
                        return <>🚀 현재 <strong>{totalCount}명 중 {myRank}위</strong>입니다. 꾸준히 도전하세요!</>
                      })()}
                    </div>
                  )}

                  {/* No data for this user */}
                  {!myData && user && (
                    <div className="lb-encourage">
                      🔭 이 챕터의 퀴즈를 풀면 순위에 참여할 수 있습니다!
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
