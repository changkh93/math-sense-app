import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { db } from '../../firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import soundManager from '../../utils/SoundManager'

export default function SpaceRanking({ user, userData }) {
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rankMode, setRankMode] = useState('global') // 'global' | 'weekly'

  useEffect(() => {
    // 랭킹 모드에 따른 쿼리 설정
    // global: crystals (총 광석) 기준
    // weekly: 이번 주 획득량 기준 (weeklyGrowth 필드 직접 참조)
    
    const q = query(
      collection(db, 'users'),
      orderBy('crystals', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log("📊 SpaceRanking: Snapshot received. Size:", snapshot.size)
      // Calculate current KST date keys
      const kstNow = new Date(Date.now() + 9 * 3600000)
      const todayKey = kstNow.toISOString().split('T')[0]
      const mondayOffset = (kstNow.getUTCDay() + 6) % 7
      const mondayKey = new Date(kstNow.getTime() - mondayOffset * 86400000)
        .toISOString().split('T')[0]

      const users = snapshot.docs.map(doc => {
        const d = doc.data()
        return {
          id: doc.id,
          ...d,
          // Direct growth counter reads — no baseline math needed
          dailyGain:  d.dailyGrowthDate    === todayKey  ? (d.dailyGrowth  || 0) : 0,
          weeklyGain: d.weeklyGrowthMonday === mondayKey  ? (d.weeklyGrowth || 0) : 0,
        }
      })

      if (rankMode === 'weekly') {
        users.sort((a, b) => b.weeklyGain - a.weeklyGain)
      }
      
      setTopUsers(users.slice(0, 100))
      setLoading(false)
    }, (error) => {
      console.error("❌ SpaceRanking: Firestore error:", error)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [rankMode])

  const containerVariants = {
    hidden: { opacity: 0, scale: 0.9, y: 20 },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        duration: 0.5,
        staggerChildren: 0.05
      }
    }
  }

  const rowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fade-in"
    >
      <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
        <h2 style={{ 
          fontSize: '2.5rem', 
          color: 'var(--text-bright)', 
          marginBottom: '0.8rem',
          textShadow: '0 0 20px var(--crystal-glow)'
        }}>
          🏆 우주 관제 리더보드
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>
          실시간 탐사 대원들의 수학 광석 랭킹 시스템입니다. (대원 {topUsers.length}명 대기 중)
        </p>
      </div>

      {/* 모드 전환 탭 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        {['global', 'weekly'].map(mode => (
          <button
            key={mode}
            onClick={() => { setRankMode(mode); soundManager.playClick(); }}
            className={`font-tech ${rankMode === mode ? 'active' : ''}`}
            style={{
              padding: '0.8rem 2rem',
              background: rankMode === mode ? 'rgba(0, 243, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${rankMode === mode ? 'var(--crystal-cyan)' : 'var(--glass-border)'}`,
              borderRadius: '12px',
              color: rankMode === mode ? 'var(--crystal-cyan)' : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '2px',
              fontWeight: 700,
              boxShadow: rankMode === mode ? 'var(--glow-cyan)' : 'none'
            }}
          >
            {mode === 'global' ? '🪐 전 우주 정거장' : '🚀 이번 주 급상승'}
          </button>
        ))}
      </div>

      <div className="glass-card hud-border" style={{ 
        padding: '1.5rem', 
        background: 'rgba(5, 5, 16, 0.6)',
        backdropFilter: 'blur(15px)'
      }}>
        {/* 헤더 행 */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '60px 1fr 100px 100px 120px',
          padding: '1rem',
          borderBottom: '1px solid var(--glass-border)',
          color: 'var(--crystal-cyan)',
          fontWeight: 700,
          fontSize: '0.9rem',
          letterSpacing: '1px'
        }}>
          <span>RANK</span>
          <span>PILOT</span>
          <span style={{ textAlign: 'center' }}>CRYSTALS</span>
          <span style={{ textAlign: 'center' }}>SCORE</span>
          <span style={{ textAlign: 'right' }}>GROWTH</span>
        </div>

        {/* 랭킹 리스트 */}
        <div style={{ paddingRight: '5px' }}>
          {loading ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              호로그램 데이터 수신 중...
            </div>
          ) : topUsers.length === 0 ? (
            <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              현재 순위 데이터가 없습니다.<br/>
              <span style={{ fontSize: '0.8rem' }}>탐사를 시작하여 광석을 채집해 보세요!</span>
            </div>
          ) : (
            topUsers.map((u, index) => {
              const isMe = u.id === user?.uid
              const growth = rankMode === 'weekly' ? (u.weeklyGain || 0) : (u.dailyGain || 0)

              return (
                <div
                  key={u.id}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '60px 1fr 100px 100px 120px',
                    padding: '1.2rem 1rem',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    alignItems: 'center',
                    background: isMe ? 'rgba(0, 243, 255, 0.12)' : 'transparent',
                    boxShadow: isMe ? 'inset 0 0 20px rgba(0, 243, 255, 0.2)' : 'none',
                    borderRadius: isMe ? '10px' : '0',
                    margin: isMe ? '5px 0' : '0',
                    borderLeft: isMe ? '4px solid var(--crystal-cyan)' : 'none',
                    color: '#fff !important' // Force visibility
                  }}
                >
                  {/* 순위 */}
                  <span style={{ 
                    fontSize: '1.2rem', 
                    fontWeight: 900,
                    color: index < 3 ? 'var(--star-gold)' : '#ffffff'
                  }}>
                    {index + 1}
                  </span>

                  {/* 이름 & 상태 */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span style={{ 
                      fontSize: '1.1rem', 
                      fontWeight: isMe ? 800 : 500,
                      color: isMe ? '#ffffff' : 'rgba(255,255,255,0.8)'
                    }}>
                      {u.name || '무명 탐험가'}
                    </span>
                    {isMe && <span style={{ 
                      fontSize: '0.7rem', 
                      background: 'var(--crystal-cyan)', 
                      color: '#000', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      fontWeight: 900
                    }}>ME</span>}
                  </div>

                  {/* 광석 개수 */}
                  <span style={{ 
                    textAlign: 'center', 
                    color: 'var(--neon-blue)', 
                    fontWeight: 700 
                  }}>
                    💎 {u.crystals || 0}
                  </span>

                  {/* 평균 점수 */}
                  <span style={{ 
                    textAlign: 'center', 
                    color: 'var(--text-muted)', 
                    fontWeight: 600,
                    fontSize: '0.9rem'
                  }}>
                    {u.averageScore ? u.averageScore.toFixed(1) : '─'}
                  </span>

                  {/* 상승 지표 */}
                  <div style={{ 
                    textAlign: 'right',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'flex-end'
                  }}>
                    <span style={{ 
                      color: growth > 0 ? 'var(--planet-green)' : growth < 0 ? '#ff4d4d' : 'rgba(255,255,255,0.4)',
                      fontWeight: 800,
                      fontSize: '0.9rem'
                    }}>
                      {growth > 0 ? `▲ ${growth}` : growth < 0 ? `▼ ${Math.abs(growth)}` : '─'}
                    </span>
                    <span style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.3)', marginTop: '2px' }}>
                      {rankMode === 'weekly' ? 'WEEKLY' : 'DAILY'}
                    </span>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* 격려 문구 */}
      <div style={{ marginTop: '2.5rem', marginBottom: '4rem', textAlign: 'center' }}>
        <p className="font-tech" style={{ color: 'var(--text-muted)', letterSpacing: '1px' }}>
          {(() => {
            const kstNow = new Date(Date.now() + 9 * 3600000)
            const mondayOffset = (kstNow.getUTCDay() + 6) % 7
            const mondayKey = new Date(kstNow.getTime() - mondayOffset * 86400000).toISOString().split('T')[0]
            const myWeeklyGrowth = userData?.weeklyGrowthMonday === mondayKey ? (userData?.weeklyGrowth || 0) : 0
            return myWeeklyGrowth > 0
              ? `🚀 대단합니다! 이번 주에 ${myWeeklyGrowth}개의 광석을 추가로 채굴했습니다.`
              : "🔭 새로운 탐사를 시작하여 순위를 높여보세요!"
          })()}
        </p>
      </div>
    </motion.div>
  )
}
