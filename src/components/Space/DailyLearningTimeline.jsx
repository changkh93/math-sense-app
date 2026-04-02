import React from 'react';
import { motion } from 'framer-motion';

/**
 * DailyLearningTimeline — Clean, grouped learning activity cards.
 * 
 * @param {Array} groupedActivities - Grouped learning activities from useLearningHistory
 * @param {Array} activities - Raw activities (fallback if groupedActivities unavailable)
 * @param {Object} dailyStats - Aggregated stats (quizCount, logCount, totalVideoSeconds, isAssignmentSubmitted)
 * @param {boolean} loading - Loading state
 * @param {Error} error - Error state
 * @param {Function} onActivityClick - Optional callback (unitId) => void for navigation
 */
export default function DailyLearningTimeline({ 
  groupedActivities, 
  activities, 
  dailyStats, 
  loading, 
  error, 
  onActivityClick 
}) {
  if (loading) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }} className="font-tech">
        <div className="siren-pulse" style={{ fontSize: '2rem', marginBottom: '1rem' }}>⏱️</div>
        데이터 동기화 중...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
        데이터를 불러오는 중 오류가 발생했습니다.
      </div>
    );
  }

  // Use grouped data if available, otherwise fall back to raw
  const items = groupedActivities && groupedActivities.length > 0 
    ? groupedActivities 
    : null;

  // If no grouped and no raw activities
  if (!items && (!activities || activities.length === 0)) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-card">
        <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}> Desert... 🏜️</div>
        <h3 className="font-title" style={{ color: 'var(--text-bright)', marginBottom: '0.5rem' }}>기록 없음</h3>
        <p className="font-tech" style={{ fontSize: '0.9rem' }}>해당 날짜의 학습 기록이 존재하지 않습니다.</p>
      </div>
    );
  }

  // If we have grouped items, render grouped view
  if (items && items.length > 0) {
    return <GroupedView items={items} dailyStats={dailyStats} onActivityClick={onActivityClick} />;
  }

  // Fallback: raw activities with no grouping available
  return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-card">
      <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}> Desert... 🏜️</div>
      <h3 className="font-title" style={{ color: 'var(--text-bright)', marginBottom: '0.5rem' }}>기록 없음</h3>
      <p className="font-tech" style={{ fontSize: '0.9rem' }}>해당 날짜의 순수 학습 기록이 존재하지 않습니다.</p>
    </div>
  );
}

// ── Helper: format seconds to "Xm Ys" ──
const formatSeconds = (sec) => {
  if (!sec || sec <= 0) return '0s';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return m > 0 ? `${m}분 ${s}초` : `${s}초`;
};

// ── Helper: format time from Date ──
const formatTime = (date) => {
  if (!date) return '';
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
};

// ── Type config ──
const TYPE_CONFIG = {
  quiz: {
    icon: '🚀',
    label: '퀴즈 탐사',
    color: 'var(--crystal-cyan)',
    bg: 'rgba(0, 212, 255, 0.12)',
    border: 'rgba(0, 212, 255, 0.3)'
  },
  video: {
    icon: '🎬',
    label: '영상 학습',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)'
  },
  text: {
    icon: '📝',
    label: '데이터 로그',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)'
  }
};

// ── Grouped View Component ──
function GroupedView({ items, dailyStats, onActivityClick }) {
  // Count unique types for the summary
  const quizItems = items.filter(i => i.type === 'quiz');
  const videoItems = items.filter(i => i.type === 'video');
  const textItems = items.filter(i => i.type === 'text');

  return (
    <div style={{ padding: '1rem' }}>
      {/* ── Summary Header ── */}
      <div className="glass-card" style={{ 
        padding: '1.2rem 1.5rem',
        marginBottom: '1.5rem',
        background: 'rgba(0, 212, 255, 0.06)',
        border: '1px solid rgba(0, 212, 255, 0.15)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
      }}>
        <h3 className="font-title" style={{ 
          margin: '0 0 1rem 0', 
          color: 'var(--text-bright)', 
          fontSize: '1.15rem', 
          letterSpacing: '1px' 
        }}>
          DAILY LEARNING SUMMARY
        </h3>
        
        <div style={{ 
          display: 'flex', 
          gap: '0.8rem',
          flexWrap: 'wrap'
        }}>
          {/* Quiz stat */}
          <StatChip 
            icon="🚀" 
            label="퀴즈" 
            value={`${dailyStats?.quizCount || quizItems.length}회`}
            color="var(--crystal-cyan)"
          />
          
          {/* Video stat */}
          <StatChip 
            icon="🎬" 
            label="영상" 
            value={`${videoItems.length}편`}
            subValue={dailyStats?.totalVideoSeconds > 0 ? formatSeconds(dailyStats.totalVideoSeconds) : null}
            color="#10b981"
          />
          
          {/* Data log stat */}
          <StatChip 
            icon="📝" 
            label="데이터 로그" 
            value={`${dailyStats?.logCount || textItems.length}개`}
            color="#f59e0b"
          />
          
          {/* Assignment stat */}
          <StatChip 
            icon="📁" 
            label="항행 일지" 
            value={dailyStats?.isAssignmentSubmitted ? '제출 완료' : '미제출'}
            color={dailyStats?.isAssignmentSubmitted ? 'var(--neon-blue)' : 'rgba(255,255,255,0.3)'}
          />
        </div>
      </div>

      {/* ── Activity Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {items.map((item, index) => (
          <GroupedCard 
            key={item.id} 
            item={item} 
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

// ── Stat Chip ──
function StatChip({ icon, label, value, subValue, color }) {
  return (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '0.5rem',
      padding: '0.5rem 0.8rem',
      background: 'rgba(0,0,0,0.3)',
      borderRadius: '8px',
      border: '1px solid rgba(255,255,255,0.06)',
      flex: '1 1 auto',
      minWidth: '120px'
    }}>
      <span style={{ fontSize: '1rem' }}>{icon}</span>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.65rem', letterSpacing: '0.5px' }}>
          {label}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.3rem' }}>
          <span className="font-tech" style={{ color, fontSize: '0.95rem', fontWeight: 'bold' }}>
            {value}
          </span>
          {subValue && (
            <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>
              ({subValue})
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Grouped Activity Card ──
function GroupedCard({ item, index }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.quiz;
  
  const timeRange = (() => {
    const start = formatTime(item.firstTimestamp);
    const end = formatTime(item.lastTimestamp);
    if (!start) return '';
    if (start === end) return start;
    return `${start} ~ ${end}`;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      style={{ 
        padding: '1rem 1.2rem',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '12px',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {/* Top row: type badge + completion */}
      <div style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center',
        marginBottom: '0.5rem'
      }}>
        {/* Type badge */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '0.4rem' 
        }}>
          <span style={{ fontSize: '1rem' }}>{config.icon}</span>
          <span className="font-tech" style={{ 
            color: config.color, 
            fontSize: '0.75rem', 
            fontWeight: 'bold',
            letterSpacing: '0.5px'
          }}>
            {config.label}
          </span>
        </div>
        
        {/* Completion badge */}
        {item.completed && (
          <span className="font-tech" style={{
            background: 'rgba(16, 185, 129, 0.15)',
            color: '#10b981',
            fontSize: '0.7rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            fontWeight: 'bold'
          }}>
            ✅ 완료
          </span>
        )}
        {!item.completed && item.type === 'quiz' && item.score === null && (
          <span className="font-tech" style={{
            background: 'rgba(251, 191, 36, 0.15)',
            color: '#fbbf24',
            fontSize: '0.7rem',
            padding: '0.2rem 0.5rem',
            borderRadius: '4px',
            border: '1px solid rgba(251, 191, 36, 0.3)',
            fontWeight: 'bold'
          }}>
            ⏳ 진행 중
          </span>
        )}
      </div>

      {/* Title */}
      <h4 style={{ 
        margin: '0 0 0.5rem 0', 
        color: 'var(--text-bright)', 
        fontSize: '1.05rem',
        fontWeight: 600,
        lineHeight: 1.3
      }}>
        {item.unitTitle}
      </h4>

      {/* Details row */}
      <div style={{ 
        display: 'flex', 
        flexWrap: 'wrap',
        alignItems: 'center', 
        gap: '0.6rem',
        fontSize: '0.8rem'
      }}>
        {/* Time range */}
        {timeRange && (
          <span className="font-tech" style={{ color: 'var(--text-muted)' }}>
            🕐 {timeRange}
          </span>
        )}

        {/* Quiz score */}
        {item.type === 'quiz' && item.score !== null && item.score !== undefined && (
          <span className="font-tech" style={{ 
            color: item.score === 100 ? 'var(--star-gold)' : item.score >= 80 ? config.color : '#ef4444',
            fontWeight: 'bold',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px'
          }}>
            점수 {item.score}점
          </span>
        )}

        {/* Video time */}
        {item.type === 'video' && item.totalVideoSeconds > 0 && (
          <span className="font-tech" style={{ 
            color: config.color,
            fontWeight: 'bold',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px'
          }}>
            총 {formatSeconds(item.totalVideoSeconds)} 시청
          </span>
        )}
        
      </div>
    </motion.div>
  );
}
