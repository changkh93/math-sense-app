import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import '../../styles/leaderboard.css'

/**
 * SectorLeaderboard – SECTOR 페이지용 미니 리더보드
 * 
 * 해당 Region 내 모든 퀴즈 기록이 있는 사용자들의 Top 10 + 내 순위를 표시합니다.
 * 기본적으로 닫힌 상태로 시작합니다.
 */
export default function SectorLeaderboard({ user, regionId, regionTitle }) {
  const [isOpen, setIsOpen] = useState(false)
  const { rankings, myRank, myData, loading, totalCount } = useLeaderboard(user?.uid, { regionId })

  const top10 = rankings.slice(0, 10)
  const myInTop10 = top10.some(u => u.id === user?.uid)

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

  if (!regionId) return null

  return (
    <div className="leaderboard-container sector-lb" style={{ margin: '0 auto 1.5rem', maxWidth: '1000px' }}>
      <button
        className="leaderboard-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>🏆 SECTOR RANKING ({totalCount}명 참여){regionTitle ? ` — ${regionTitle}` : ''}</span>
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
                <div className="lb-empty">이 섹터에서 아직 퀴즈를 완료한 탐험가가 없습니다.</div>
              ) : (
                <>
                  <div className="lb-tiebreaker-info" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                    * 동점 시: 탐사 단원이 많을수록 &gt; 획득 광석이 많을수록 &gt; 먼저 시작한 순으로 랭킹 산정
                  </div>

                  {/* Top 10 */}
                  {top10.map(u => {
                    const isMe = u.id === user?.uid
                    return (
                      <div key={u.id} className={`lb-row ${isMe ? 'lb-me' : ''}`}>
                        <div className={`lb-rank ${getRankClass(u.rank)}`}>
                          {getRankIcon(u.rank)}
                        </div>
                        <div className="lb-name">
                          {u.name}
                          {isMe && <span className="lb-me-badge">ME</span>}
                        </div>
                        <div className="lb-score">
                          평균 {u.avgScore}점
                        </div>
                      </div>
                    )
                  })}

                  {/* My rank (if not in top 10) */}
                  {!myInTop10 && myData && (
                    <>
                      <div className="lb-separator">· · · · ·</div>
                      <div className="lb-row lb-me">
                        <div className={`lb-rank ${getRankClass(myRank)}`}>
                          {myRank}
                        </div>
                        <div className="lb-name">
                          {myData.name}
                          <span className="lb-me-badge">ME</span>
                        </div>
                        <div className="lb-score">
                          평균 {myData.avgScore}점
                        </div>
                      </div>
                    </>
                  )}

                  {/* Encouragement */}
                  {myData && myRank && (
                    <div className="lb-encourage" style={{ fontSize: '0.8rem' }}>
                      {myRank === 1 ? (
                        <>🌟 현재 이 섹터의 **TOP 탐험가**입니다! 기록을 유지하세요!</>
                      ) : (() => {
                        const aboveIdx = rankings.findIndex(u => u.rank === myRank - 1)
                        const above = aboveIdx >= 0 ? rankings[aboveIdx] : null
                        if (above) {
                          const gap = (above.avgScore - myData.avgScore).toFixed(1)
                          if (gap > 0) {
                            return <>🚀 <strong>{above.name}</strong>님을 추월하기까지 평균 <strong>{gap}점</strong> 남았습니다!</>
                          } else {
                            return <>✨ <strong>{above.name}</strong>님과 점수가 같습니다! 다음 단원 탐사로 역전해 보세요! 현재 <strong>{totalCount}명 중 {myRank}위</strong>입니다.</>
                          }
                        }
                        return ` 현재 ${totalCount}명 중 ${myRank}위입니다.`
                      })()}
                    </div>
                  )}

                  {!myData && user && (
                    <div className="lb-encourage">
                      🔭 각 단원(MISSION SELECT)의 퀴즈를 풀면 순위에 참여할 수 있습니다!
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
