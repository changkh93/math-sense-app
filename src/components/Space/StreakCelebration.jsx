import React, { useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { getCometTier, getMilestoneInfo, getTodayKST } from '../../utils/streakUtils'
import CometBadge from './CometBadge'
import './StreakCelebration.css'

/**
 * ☄️ StreakCelebrationModal — 마일스톤 달성 시 전체 화면 축하 연출
 */
export function StreakCelebrationModal({ celebration, onClose }) {
  if (!celebration) return null

  const { milestone, currentStreak } = celebration
  const tier = getCometTier(currentStreak)
  const milestoneInfo = getMilestoneInfo(milestone)

  // 5초 후 자동 닫기
  useEffect(() => {
    const timer = setTimeout(onClose, 7000)
    return () => clearTimeout(timer)
  }, [onClose])

  // 파티클 생성
  const particles = useMemo(() => {
    return Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      delay: `${Math.random() * 2}s`,
      size: `${3 + Math.random() * 5}px`,
      color: tier.color,
    }))
  }, [tier.color])

  return (
    <motion.div 
      className="streak-celebration-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div 
        className="streak-celebration-card"
        style={{ 
          borderColor: tier.color,
          '--celebration-glow': tier.glowColor,
          '--celebration-gradient': tier.gradient,
        }}
        onClick={e => e.stopPropagation()}
        initial={{ scale: 0.5, y: 40, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: 'spring', damping: 15, stiffness: 200 }}
      >
        {/* 파티클 배경 */}
        <div className="streak-particles">
          {particles.map(p => (
            <div 
              key={p.id}
              className="streak-particle"
              style={{
                left: p.left,
                bottom: '0',
                width: p.size,
                height: p.size,
                background: p.color,
                animationDelay: p.delay,
              }}
            />
          ))}
        </div>

        {/* 아이콘 */}
        <div className="milestone-icon-container">
          <div className="milestone-icon-ring" style={{ borderColor: tier.color }} />
          <div className="milestone-icon-inner">{milestoneInfo.icon}</div>
        </div>

        {/* 숫자 */}
        <div className="streak-celebration-number">{currentStreak}</div>
        <div className="streak-celebration-label">일 연속 항해</div>

        {/* 메시지 */}
        <div className="streak-celebration-title">{milestoneInfo.title}</div>
        <div className="streak-celebration-message">{milestoneInfo.message}</div>

        {/* 버튼 */}
        <button 
          className="streak-celebration-btn"
          style={{ background: tier.gradient }}
          onClick={onClose}
        >
          계속 항해하기 ☄️
        </button>
      </motion.div>
    </motion.div>
  )
}

/**
 * ☄️ StreakToast — 일일 학습 완료 시 간단한 토스트
 */
export function StreakToast({ streakInfo, onDismiss }) {
  if (!streakInfo || streakInfo.alreadyDoneToday) return null

  const tier = getCometTier(streakInfo.currentStreak)
  
  useEffect(() => {
    const timer = setTimeout(onDismiss, 4000)
    return () => clearTimeout(timer)
  }, [onDismiss])

  return (
    <motion.div 
      className="streak-toast"
      style={{ 
        background: `${tier.color}20`,
        border: `1px solid ${tier.color}60`,
        color: tier.color,
      }}
      initial={{ x: 120, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 120, opacity: 0 }}
    >
      <span style={{ fontSize: '1.3rem' }}>{tier.icon}</span>
      <span>
        {streakInfo.freezeUsed 
          ? `🧊 크라이오 코어가 엔진을 지켰습니다! ${streakInfo.currentStreak}일 연속!`
          : `${streakInfo.currentStreak}일 연속 항해 성공!`
        }
      </span>
    </motion.div>
  )
}

/**
 * 📅 StreakCalendar — GitHub 잔디 스타일 학습 히트맵 (최근 90일)
 */
export function StreakCalendar({ history, userData }) {
  const todayKST = getTodayKST()
  
  // history에서 날짜별 학습 여부 추출
  const activeDates = useMemo(() => {
    const dates = new Set()
    if (!history) return dates
    
    history.forEach(h => {
      if (h.timestamp) {
        // Firestore Timestamp or Date
        const d = h.timestamp.toDate ? h.timestamp.toDate() : new Date(h.timestamp)
        dates.add(getTodayKST(d))
      }
    })
    return dates
  }, [history])

  // 최근 90일의 그리드 생성
  const calendarData = useMemo(() => {
    const days = []
    
    for (let i = 89; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000)
      const dateStr = getTodayKST(d)
      const isActive = activeDates.has(dateStr)
      const isToday = dateStr === todayKST
      
      days.push({ dateStr, isActive, isToday })
    }
    
    // 앞에 빈 셀 추가 (첫 날의 요일에 맞추기)
    const firstDate = new Date(days[0].dateStr + 'T00:00:00+09:00')
    const firstDayOfWeek = firstDate.getDay() // 0=Sun
    const paddedDays = []
    for (let i = 0; i < firstDayOfWeek; i++) {
      paddedDays.push({ dateStr: '', isActive: false, isToday: false, isEmpty: true })
    }
    
    return [...paddedDays, ...days]
  }, [activeDates, todayKST])

  const currentStreak = userData?.currentStreak || 0
  const longestStreak = userData?.longestStreak || 0
  const freezeCount = userData?.streakFreezeCount || 0
  const tier = getCometTier(currentStreak)
  
  const dayLabels = ['일', '월', '화', '수', '목', '금', '토']

  return (
    <div className="streak-calendar glass-card" style={{ padding: '1.5rem' }}>
      <div className="streak-calendar-title">
        <span>📅 항해 기록</span>
        <CometBadge streak={currentStreak} compact />
      </div>

      {/* 요일 헤더 */}
      <div className="streak-calendar-grid">
        {dayLabels.map(d => (
          <div key={d} className="streak-calendar-day-label">{d}</div>
        ))}
        
        {/* 날짜 셀 */}
        {calendarData.map((day, idx) => {
          if (day.isEmpty) {
            return <div key={`empty-${idx}`} className="streak-calendar-cell empty" />
          }
          
          const cellTier = day.isActive ? tier : null
          return (
            <div 
              key={day.dateStr}
              className={`streak-calendar-cell ${day.isActive ? 'active' : 'inactive'} ${day.isToday ? 'today' : ''}`}
              style={{
                background: day.isActive ? `${cellTier.color}30` : undefined,
                '--cell-glow': day.isActive ? cellTier.glowColor : undefined,
              }}
            >
              <div className="cell-tooltip">
                {day.dateStr.slice(5)} {day.isActive ? '✅ 학습 완료' : '⬜ 미학습'}
              </div>
            </div>
          )
        })}
      </div>

      {/* 통계 */}
      <div className="streak-stats-row">
        <div className="streak-stat-box">
          <div className="streak-stat-value" style={{ color: tier.color }}>{currentStreak}</div>
          <div className="streak-stat-label">현재 연속</div>
        </div>
        <div className="streak-stat-box">
          <div className="streak-stat-value" style={{ color: 'var(--star-gold)' }}>{longestStreak}</div>
          <div className="streak-stat-label">최고 기록</div>
        </div>
        <div className="streak-stat-box">
          <div className="streak-stat-value" style={{ color: 'var(--crystal-cyan)' }}>🧊 {freezeCount}</div>
          <div className="streak-stat-label">크라이오 코어</div>
        </div>
        <div className="streak-stat-box">
          <div className="streak-stat-value" style={{ color: 'var(--text-bright)' }}>{activeDates.size}</div>
          <div className="streak-stat-label">총 학습일</div>
        </div>
      </div>
    </div>
  )
}
