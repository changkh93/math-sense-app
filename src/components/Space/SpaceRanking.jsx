import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth'
import { Trophy, Medal, Star, Target, Info, ShieldAlert, Zap, CircleHelp } from 'lucide-react'
import { db } from '../../firebase'
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore'
import './SpaceRanking.css'
import soundManager from '../../utils/SoundManager'
import CometBadge from './CometBadge'

export default function SpaceRanking({ user, userData }) {
  const [topUsers, setTopUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [rankMode, setRankMode] = useState('global') // 'global' | 'weekly' | 'guide'

  useEffect(() => {
    if (rankMode === 'guide') return;

    setLoading(true);
    const q = query(
      collection(db, 'users'),
      orderBy('crystals', 'desc'),
      limit(100)
    )

    const unsubscribe = onSnapshot(q, (snapshot) => {
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

  const rewardRules = [
    { 
      category: '🎯 탐사(퀴즈) 보상', 
      icon: <Target className="rule-icon-blue" />,
      items: [
        { label: '문제 정답', value: '+1 💎', desc: '최고 점수 경신 시 지급' },
        { label: '3연속 콤보', value: '+5 💎', desc: '안정적인 비행 보너스' },
        { label: '백점 만점', value: '+10 💎', desc: '단원 최초 1회 보너스' },
        { label: '문제 오답', value: '-2 💎', desc: '에너지 손실 (쉴드로 방어 가능)' },
      ]
    },
    { 
      category: '🤝 아고라(커뮤니티) 보상', 
      icon: <Zap className="rule-icon-purple" />,
      items: [
        { label: '답변 채택', value: '+20 💎', desc: '내가 쓴 답변이 채택됨' },
        { label: '질문 해결', value: '+5 💎', desc: '내 질문이 해결됨' },
        { label: '스스로 해결', value: '+3 💎', desc: '자기 주도 해결 보충' },
        { label: '선생님 인증', value: '+10 💎', desc: '최우수 답변 추가 보너스' },
      ]
    }
  ]

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
          {rankMode === 'guide' ? '광석 획득 및 손실 기준 안내' : `실시간 탐사 대원들의 메타 광석 랭킹 시스템입니다. (대원 ${topUsers.length}명 대기 중)`}
        </p>
      </div>

      {/* 모드 전환 탭 */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        gap: '1rem', 
        marginBottom: '2rem' 
      }}>
        {[
          { id: 'global', label: '전 우주 정거장', icon: '🪐' },
          { id: 'weekly', label: '이번 주 급상승', icon: '🚀' },
          { id: 'guide', label: '탐사 가이드', icon: '💎', isSpecial: true }
        ].map(mode => (
          <button
            key={mode.id}
            onClick={() => { setRankMode(mode.id); soundManager.playClick(); }}
            className={`font-tech ${rankMode === mode.id ? 'active' : ''}`}
            style={{
              padding: '0.8rem 1.5rem',
              background: rankMode === mode.id 
                ? (mode.isSpecial ? 'rgba(255, 215, 0, 0.2)' : 'rgba(0, 243, 255, 0.2)') 
                : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${rankMode === mode.id 
                ? (mode.isSpecial ? '#ffd700' : 'var(--crystal-cyan)') 
                : 'var(--glass-border)'}`,
              borderRadius: '12px',
              color: rankMode === mode.id 
                ? (mode.isSpecial ? '#ffd700' : 'var(--crystal-cyan)') 
                : 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              fontWeight: 700,
              boxShadow: rankMode === mode.id 
                ? (mode.isSpecial ? '0 0 15px rgba(255, 215, 0, 0.4)' : 'var(--glow-cyan)') 
                : 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <span>{mode.icon}</span>
            {mode.label}
          </button>
        ))}
      </div>

      <div className="glass-card hud-border" style={{ 
        padding: rankMode === 'guide' ? '2.5rem' : '1.5rem', 
        background: 'rgba(5, 5, 16, 0.6)',
        backdropFilter: 'blur(15px)',
        minHeight: '400px'
      }}>
        <AnimatePresence mode="wait">
          {rankMode === 'guide' ? (
            <motion.div 
              key="guide"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="reward-guide-container"
            >
              <div className="guide-grid">
                {rewardRules.map((cat, i) => (
                  <div key={i} className="guide-category">
                    <h3 className="cat-title">
                      {cat.icon} {cat.category}
                    </h3>
                    <div className="rule-items">
                      {cat.items.map((item, j) => (
                        <div key={j} className="rule-item glass">
                          <div className="rule-main">
                            <span className="rule-label">{item.label}</span>
                            <span className={`rule-value ${item.value.includes('-') ? 'minus' : 'plus'}`}>
                              {item.value}
                            </span>
                          </div>
                          <p className="rule-desc">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="guide-footer-note glass">
                <CircleHelp size={16} />
                <span>동일 단원 반복 시 <strong>최고 기록(Best)</strong>보다 높은 성적을 거둘 때만 광석이 추가 채굴됩니다.</span>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="ranking"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
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
                          color: '#fff !important'
                        }}
                      >
                        <span style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: 900,
                          color: index < 3 ? 'var(--star-gold)' : '#ffffff'
                        }}>
                          {index + 1}
                        </span>

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
                          {(u.currentStreak || 0) > 0 && (
                            <CometBadge streak={u.currentStreak} compact showTooltip={false} />
                          )}
                        </div>

                        <span style={{ 
                          textAlign: 'center', 
                          color: 'var(--neon-blue)', 
                          fontWeight: 700 
                        }}>
                          💎 {u.crystals || 0}
                        </span>

                        <span style={{ 
                          textAlign: 'center', 
                          color: 'var(--text-muted)', 
                          fontWeight: 600,
                          fontSize: '0.9rem'
                        }}>
                          {u.averageScore ? u.averageScore.toFixed(1) : '─'}
                        </span>

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
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 격려 문구 */}
      <div style={{ marginTop: '2.5rem', marginBottom: '4rem', textAlign: 'center' }}>
        <p className="font-tech" style={{ color: 'var(--text-muted)', letterSpacing: '1px' }}>
          {rankMode === 'guide' ? (
            "✨ 신중한 탐사가 위대한 대원을 만듭니다."
          ) : (() => {
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
