import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * 다크 매터 뷰 — 오답/재검토 문항을 카테고리별로 보여주고 재풀이 진입
 */
export default function DarkMatterView({ 
  questions = [], 
  totalHistoryCount = 0, 
  onStartQuiz, 
  onExit 
}) {
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [showCelebration, setShowCelebration] = useState(false)

  // Group questions by unitId
  const grouped = useMemo(() => {
    const map = {}
    questions.forEach(q => {
      const key = q.unitId || 'unknown'
      if (!map[key]) {
        map[key] = {
          unitId: key,
          unitTitle: q.unitTitle || q.question?.replace(/\[재검토\]\s*/, '') || key,
          questions: [],
          hasReviewMarks: false,
          maxActiveAt: 0 // Track the latest activity timestamp in this group
        }
      }

      // Convert Firestore timestamp or Date to number for comparison
      const qTime = q._activeAt?.toMillis ? q._activeAt.toMillis() : (q._activeAt instanceof Date ? q._activeAt.getTime() : 0)
      if (qTime > map[key].maxActiveAt) {
        map[key].maxActiveAt = qTime
      }

      map[key].questions.push(q)
      if (q._reviewMark) map[key].hasReviewMarks = true
    })
    
    // Sort by maxActiveAt descending (Newest first)
    return Object.values(map).sort((a, b) => b.maxActiveAt - a.maxActiveAt)
  }, [questions])

  // Dark Energy percentage
  const darkEnergyPercent = totalHistoryCount > 0 
    ? Math.min(100, ((questions.length / totalHistoryCount) * 100)).toFixed(1) 
    : 0

  const handleStartGroup = (group) => {
    if (onStartQuiz) onStartQuiz(group.questions)
  }

  const handleStartAll = () => {
    if (onStartQuiz) onStartQuiz(questions)
  }

  return (
    <div className="space-bg" style={{ minHeight: '100vh' }}>
      <div style={{ 
        maxWidth: '800px', 
        margin: '0 auto', 
        padding: '2rem 1rem',
        paddingBottom: '5rem'
      }}>
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <button 
            onClick={onExit}
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'var(--text-muted)',
              padding: '0.5rem 1rem',
              borderRadius: '10px',
              cursor: 'pointer',
              zIndex: 10
            }}
          >
            ✕ 나가기
          </button>

          <motion.h1 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ 
              fontSize: '2rem', 
              color: '#c084fc',
              marginBottom: '0.5rem'
            }}
          >
            🌌 다크 매터 영역
          </motion.h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
            미지의 영역을 탐사하여 지식의 빛으로 변환하세요
          </p>
        </div>

        {/* Dark Energy Meter */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="glass-card"
          style={{ 
            padding: '1.5rem', 
            marginBottom: '2rem',
            border: '1px solid rgba(168, 85, 247, 0.3)'
          }}
        >
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '0.8rem'
          }}>
            <span style={{ 
              color: '#a855f7', 
              fontWeight: 900, 
              fontSize: '0.8rem',
              letterSpacing: '2px'
            }}>
              DARK ENERGY LEVEL
            </span>
            <span style={{ 
              color: questions.length === 0 ? '#50C878' : '#c084fc', 
              fontWeight: 900, 
              fontSize: '1.2rem'
            }}>
              {darkEnergyPercent}%
            </span>
          </div>
          <div style={{
            width: '100%',
            height: '10px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '5px',
            overflow: 'hidden'
          }}>
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${darkEnergyPercent}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              style={{
                height: '100%',
                background: questions.length === 0 
                  ? 'linear-gradient(90deg, #50C878, #22c55e)' 
                  : 'linear-gradient(90deg, #6b21a8, #a855f7, #c084fc)',
                borderRadius: '5px',
                boxShadow: '0 0 10px rgba(168, 85, 247, 0.5)'
              }}
            />
          </div>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between',
            marginTop: '0.5rem',
            fontSize: '0.75rem',
            color: 'var(--text-muted)'
          }}>
            <span>미해결 문항: {questions.length}개</span>
            <span>{questions.length === 0 ? '✨ 완벽한 지식!' : '낮을수록 좋습니다'}</span>
          </div>
        </motion.div>

        {questions.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card"
            style={{ 
              padding: '3rem', 
              textAlign: 'center',
              border: '1px solid rgba(80, 200, 120, 0.3)'
            }}
          >
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌟</div>
            <h3 style={{ color: '#50C878', marginBottom: '0.5rem' }}>완벽한 지식 상태!</h3>
            <p style={{ color: 'var(--text-muted)' }}>
              다크 매터가 감지되지 않습니다. 당신의 지식은 완벽하게 빛나고 있습니다.
            </p>
          </motion.div>
        ) : (
          <>
            {/* Start All Button */}
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleStartAll}
              style={{
                width: '100%',
                padding: '1.2rem',
                marginBottom: '1.5rem',
                background: 'linear-gradient(135deg, #6b21a8, #a855f7)',
                border: '1px solid rgba(168, 85, 247, 0.5)',
                borderRadius: '15px',
                color: 'white',
                fontSize: '1.1rem',
                fontWeight: 800,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.8rem'
              }}
            >
              <span>🌌</span>
              <span>전체 탐사 시작 ({questions.length}문항)</span>
            </motion.button>

            {/* Category List */}
            <h3 style={{ 
              color: 'var(--text-bright)', 
              marginBottom: '1rem',
              fontSize: '1rem',
              fontWeight: 800
            }}>
              📂 카테고리별 분류
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
              {grouped.map((group, idx) => (
                <motion.div
                  key={group.unitId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="glass-card"
                  style={{ 
                    padding: '1rem 1.2rem',
                    border: group.hasReviewMarks 
                      ? '1px solid rgba(168, 85, 247, 0.4)'
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '1rem'
                  }}
                  onClick={() => handleStartGroup(group)}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ 
                      color: 'var(--text-bright)', 
                      fontWeight: 700,
                      fontSize: '0.95rem',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginBottom: '0.3rem'
                    }}>
                      {group.unitTitle}
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '0.6rem', 
                      fontSize: '0.75rem' 
                    }}>
                      <span style={{ color: '#ef4444' }}>
                        ❌ {group.questions.filter(q => q._source === 'incorrect').length}개 오답
                      </span>
                      {group.hasReviewMarks && (
                        <span style={{ color: '#a855f7' }}>
                          🔖 {group.questions.filter(q => q._reviewMark).length}개 재검토
                        </span>
                      )}
                    </div>
                  </div>
                  <motion.button 
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    style={{
                      padding: '0.5rem 1rem',
                      background: 'rgba(168, 85, 247, 0.2)',
                      border: '1px solid rgba(168, 85, 247, 0.4)',
                      borderRadius: '10px',
                      color: '#c084fc',
                      fontSize: '0.85rem',
                      fontWeight: 700,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                    onClick={(e) => {
                      e.stopPropagation()
                      handleStartGroup(group)
                    }}
                  >
                    탐사 ({group.questions.length})
                  </motion.button>
                </motion.div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
