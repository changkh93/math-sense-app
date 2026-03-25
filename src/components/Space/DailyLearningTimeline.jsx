import React from 'react';
import { motion } from 'framer-motion';

/**
 * Renders a vertical timeline of learning activities for a specific date.
 * @param {Array} activities - Sorted array of activity objects from useLearningHistory
 * @param {boolean} loading - Loading state
 * @param {Error} error - Error state
 */
export default function DailyLearningTimeline({ activities, loading, error }) {
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

  if (!activities || activities.length === 0) {
    return (
      <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-muted)' }} className="glass-card">
        <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}>🏜️</div>
        <h3 className="font-title" style={{ color: 'var(--text-bright)', marginBottom: '0.5rem' }}>기록 없음</h3>
        <p className="font-tech" style={{ fontSize: '0.9rem' }}>해당 날짜의 탐사 기록이 존재하지 않습니다.</p>
      </div>
    );
  }

  // Calculate total crystals for the day
  const totalEarned = activities.reduce((sum, act) => sum + (act.crystalsEarned || 0), 0);

  return (
    <div style={{ padding: '1rem' }}>
      {/* Daily Summary Header */}
      <div className="glass-card" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 1.5rem',
        marginBottom: '2rem',
        background: 'rgba(0, 212, 255, 0.05)',
        border: '1px solid rgba(0, 212, 255, 0.2)'
      }}>
        <div>
          <h3 className="font-title" style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.2rem' }}>일일 활동 요약</h3>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>총 {activities.length}개의 기록된 활동</span>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '1.5rem', fontWeight: 'bold' }}>
            +{totalEarned} 💎
          </div>
          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>획득한 수호석</span>
        </div>
      </div>

      {/* Timeline Container */}
      <div style={{ position: 'relative', paddingLeft: '2rem' }}>
        {/* Vertical Line */}
        <div style={{
          position: 'absolute',
          left: '11px',
          top: '10px',
          bottom: '10px',
          width: '2px',
          background: 'linear-gradient(to bottom, var(--crystal-cyan), rgba(0, 212, 255, 0.1))',
          borderRadius: '2px'
        }} />

        {activities.map((act, index) => {
          const timeStr = act.timestamp 
            ? act.timestamp.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) 
            : '시간 불명';
          
          let icon = '📌';
          let iconBg = 'rgba(255, 255, 255, 0.1)';
          let iconColor = 'var(--text-muted)';
          let borderColor = 'rgba(255, 255, 255, 0.1)';

          if (act.type === 'quiz_pass') {
            icon = '🚀';
            iconBg = 'rgba(0, 212, 255, 0.2)';
            iconColor = 'var(--crystal-cyan)';
            borderColor = 'var(--crystal-cyan)';
          } else if (act.type === 'video_complete') {
            icon = '🎬';
            iconBg = 'rgba(16, 185, 129, 0.2)';
            iconColor = '#10b981';
            borderColor = '#10b981';
          } else if (act.type === 'agora_activity') {
            icon = '🗣️';
            iconBg = 'rgba(139, 92, 246, 0.2)';
            iconColor = '#8b5cf6';
            borderColor = '#8b5cf6';
          } else if (act.type === 'data_log_read') {
            icon = '📝';
            iconBg = 'rgba(245, 158, 11, 0.2)';
            iconColor = '#f59e0b';
            borderColor = '#f59e0b';
          } else if (act.type === 'attendance') {
            icon = '✅';
            iconBg = 'rgba(0, 212, 255, 0.1)';
            iconColor = 'var(--neon-blue)';
            borderColor = 'var(--neon-blue)';
          }

          return (
            <motion.div 
              key={act.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              style={{ position: 'relative', marginBottom: '1.5rem' }}
            >
              {/* Timeline Node */}
              <div style={{
                position: 'absolute',
                left: '-2rem',
                top: '4px',
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: iconBg,
                border: `2px solid ${borderColor}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.8rem',
                zIndex: 2,
                boxShadow: `0 0 10px ${iconBg}`
              }}>
                {icon}
              </div>

              {/* Content Card */}
              <div className="glass-card" style={{ 
                padding: '1rem', 
                background: 'rgba(0,0,0,0.3)',
                borderLeft: `3px solid ${borderColor}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.5rem'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
                    <span className="font-tech" style={{ color: iconColor, fontSize: '0.9rem', fontWeight: 'bold' }}>
                      {timeStr}
                    </span>
                    <strong style={{ color: 'var(--text-bright)', fontSize: '1.05rem', lineHeight: '1.3' }}>
                      {act.title}
                    </strong>
                  </div>
                  {act.crystalsEarned > 0 && (
                    <span className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.9rem', flexShrink: 0, background: 'rgba(255,215,0,0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
                      +{act.crystalsEarned} 💎
                    </span>
                  )}
                </div>

                {/* Additional Details based on type */}
                {act.type === 'quiz_pass' && act.score !== null && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.3rem' }}>
                    <div style={{ 
                      background: 'rgba(0,0,0,0.5)', 
                      padding: '0.3rem 0.8rem', 
                      borderRadius: '4px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.5rem',
                      border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>SCORE</span>
                      <span className="font-tech" style={{ 
                        color: act.score === 100 ? 'var(--star-gold)' : (act.score >= 80 ? 'var(--crystal-cyan)' : '#ef4444'),
                        fontSize: '1.1rem',
                        fontWeight: 'bold'
                      }}>
                        {act.score}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
