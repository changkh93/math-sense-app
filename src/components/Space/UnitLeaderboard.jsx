import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useLeaderboard } from '../../hooks/useLeaderboard'
import '../../styles/leaderboard.css'

/**
 * UnitLeaderboard – MISSION CONTROL (Unit) 페이지용 리더보드
 * 
 * 특정 단원(Unit)의 퀴즈 기록 기반 순위를 표시합니다.
 * Top 10을 표시하며, 기본적으로 닫힌 상태로 시작합니다.
 */
export default function UnitLeaderboard({ user, unitId, unitTitle }) {
  const [isOpen, setIsOpen] = useState(false)
  const { rankings, myRank, myData, loading, totalCount } = useLeaderboard(user?.uid, { unitId })

  const top10 = rankings.slice(0, 10)
  const myInTop10 = top10.some(u => u.id === user?.uid)
  const maxScore = rankings.length > 0 ? rankings[0].avgScore : 100

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
        <div className="lb-progress-wrapper">
          <div className="lb-progress-bar">
            <motion.div
              className="lb-progress-fill"
              initial={{ width: 0 }}
              animate={{ width: `${fillWidth}%` }}
              transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-muted)' }}>
            <span>💎 {u.totalCrystals} 광석</span>
          </div>
        </div>
      </div>
    )
  }

  if (!unitId) return null

  return (
    <div className="leaderboard-container">
      <button
        className="leaderboard-toggle"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span>🛰️ MISSION RANKING ({totalCount}명 참여){unitTitle ? ` — ${unitTitle}` : ''}</span>
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
                <div className="lb-empty">이 단원에서 아직 퀴즈를 완료한 탐험가가 없습니다.</div>
              ) : (
                <>
                  <div className="lb-tiebreaker-info" style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '1rem', textAlign: 'center' }}>
                    * 동점 시: 획득 광석(콤보/속도 보너스)이 많을수록 &gt; 먼저 도달한 순으로 랭킹 산정
                  </div>

                  {/* Top 10 */}
                  {top10.map(u => renderRow(u))}

                  {/* My rank (if not in top 10) */}
                  {!myInTop10 && myData && (
                    <>
                      <div className="lb-separator">· · · · ·</div>
                      {renderRow(myData)}
                    </>
                  )}

                  {/* Encouragement */}
                  {myData && myRank && (
                    <div className="lb-encourage">
                      {myRank === 1 ? (
                        <>🌟 현재 이 단원의 **TOP 탐험가**입니다! 기록을 유지하세요!</>
                      ) : (() => {
                        const aboveIdx = rankings.findIndex(u => u.rank === myRank - 1)
                        const above = aboveIdx >= 0 ? rankings[aboveIdx] : null
                        if (above) {
                          const gap = (above.avgScore - myData.avgScore).toFixed(1)
                          if (gap > 0) {
                            return <>🚀 <strong>{above.name}</strong>님을 추월하기까지 <strong>{gap}점</strong> 남았습니다!</>
                          } else {
                            return <>✨ <strong>{above.name}</strong>님과 점수가 같습니다! 광석 보너스로 역전해 보세요! 현재 <strong>{totalCount}명 중 {myRank}위</strong>입니다.</>
                          }
                        }
                        return ` 현재 ${totalCount}명 중 ${myRank}위입니다.`
                      })()}
                    </div>
                  )}

                  {!myData && user && (
                    <div className="lb-encourage">
                      🔭 FIELD TEST에 참여하여 첫 기록을 남겨보세요!
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
