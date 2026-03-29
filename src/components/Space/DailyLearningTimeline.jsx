import React from 'react';
import { motion } from 'framer-motion';

/**
 * Renders a vertical timeline of learning activities for a specific date.
 * @param {Array} activities - Sorted array of activity objects from useLearningHistory
 * @param {boolean} loading - Loading state
 * @param {Error} error - Error state
 */
/**
 * Renders a vertical timeline of learning activities for a specific date.
 * @param {Array} activities - Sorted array of activity objects from useLearningHistory
 * @param {Object} dailyStats - Aggregated stats (quizCount, logCount, totalVideoSeconds, isAssignmentSubmitted)
 * @param {boolean} loading - Loading state
 * @param {Error} error - Error state
 */
export default function DailyLearningTimeline({ activities, dailyStats, loading, error }) {
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
        <div style={{ fontSize: '3rem', opacity: 0.5, marginBottom: '1rem' }}> Desert... 🏜️</div>
        <h3 className="font-title" style={{ color: 'var(--text-bright)', marginBottom: '0.5rem' }}>기록 없음</h3>
        <p className="font-tech" style={{ fontSize: '0.9rem' }}>해당 날짜의 탐사 기록이 존재하지 않습니다.</p>
      </div>
    );
  }

  // Calculate total crystals for the day
  const totalEarned = activities.reduce((sum, act) => sum + (act.crystalsEarned || 0), 0);

  // Helper for video time formatting
  const formatSeconds = (sec) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  return (
    <div style={{ padding: '1rem' }}>
      {/* Daily Summary Header */}
      <div className="glass-card" style={{ 
        padding: '1.2rem 1.5rem',
        marginBottom: '2rem',
        background: 'rgba(0, 212, 255, 0.08)',
        border: '1px solid rgba(0, 212, 255, 0.2)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.4)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <h3 className="font-title" style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.3rem', letterSpacing: '1px' }}>
              DAILY EXPEDITION SUMMARY
            </h3>
            <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              총 {activities.length}개의 기록된 활동
            </span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div className="font-tech" style={{ color: totalEarned >= 0 ? 'var(--star-gold)' : '#f87171', fontSize: '1.6rem', fontWeight: 'bold', textShadow: `0 0 10px ${totalEarned >= 0 ? 'rgba(255,215,0,0.3)' : 'rgba(248,113,113,0.3)'}` }}>
              {totalEarned >= 0 ? '+' : ''}{totalEarned} 💎
            </div>
            <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>획득한 수호석</span>
          </div>
        </div>

        {/* Detailed Stats Row */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', 
          gap: '1rem',
          padding: '1rem',
          background: 'rgba(0,0,0,0.3)',
          borderRadius: '12px',
          border: '1px solid rgba(255,255,255,0.05)'
        }}>
          <div className="font-tech" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🚀 퀴즈 탐사</span>
            <span style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 'bold' }}>{dailyStats?.quizCount || 0}회</span>
          </div>
          <div className="font-tech" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📝 데이터 로그</span>
            <span style={{ color: 'var(--text-bright)', fontSize: '1rem', fontWeight: 'bold' }}>{dailyStats?.logCount || 0}개</span>
          </div>
          <div className="font-tech" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>🎬 동영상 학습</span>
            <span style={{ color: 'var(--crystal-cyan)', fontSize: '1rem', fontWeight: 'bold' }}>
              {formatSeconds(dailyStats?.totalVideoSeconds || 0)}
            </span>
          </div>
          <div className="font-tech" style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>📁 항행 일지</span>
            <span style={{ 
              color: dailyStats?.isAssignmentSubmitted ? 'var(--neon-blue)' : '#f87171', 
              fontSize: '1rem', 
              fontWeight: 'bold' 
            }}>
              {dailyStats?.isAssignmentSubmitted ? '제출 완료' : '미제출'}
            </span>
          </div>
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
          } else if (act.type === 'quiz_in_progress') {
            icon = '⏳';
            iconBg = 'rgba(251, 191, 36, 0.2)';
            iconColor = '#fbbf24';
            borderColor = '#fbbf24';
          } else if (act.type === 'attendance') {
            icon = '✅';
            iconBg = 'rgba(0, 212, 255, 0.1)';
            iconColor = 'var(--neon-blue)';
            borderColor = 'var(--neon-blue)';
          } else if (act.type === 'assignment_submission') {
            icon = '📁';
            iconBg = 'rgba(168, 85, 247, 0.2)';
            iconColor = '#a855f7';
            borderColor = '#a855f7';
          }

          const videoTime = act.metadata?.videoTime || act.metadata?.metadata?.videoTime;
          const formattedVideoTime = videoTime ? formatSeconds(Math.floor(videoTime)) : null;

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
                  {act.crystalsEarned !== 0 && (
                    <span className="font-tech" style={{ 
                      color: act.crystalsEarned > 0 ? 'var(--star-gold)' : '#f87171', 
                      fontSize: '0.9rem', 
                      flexShrink: 0, 
                      background: act.crystalsEarned > 0 ? 'rgba(255,215,0,0.1)' : 'rgba(248,113,113,0.1)', 
                      padding: '0.2rem 0.5rem', 
                      borderRadius: '4px' 
                    }}>
                      {act.crystalsEarned > 0 ? '+' : ''}{act.crystalsEarned} 💎
                    </span>
                  )}
                </div>

                {/* Additional Details row */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginTop: '0.2rem' }}>
                  {/* Quiz Score */}
                  {act.type === 'quiz_pass' && act.score !== null && (
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <div style={{ 
                        background: 'rgba(0,0,0,0.5)', 
                        padding: '0.2rem 0.6rem', 
                        borderRadius: '4px', 
                        display: 'inline-flex', 
                        alignItems: 'center', 
                        gap: '0.4rem',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}>
                        <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>SCORE</span>
                        <span className="font-tech" style={{ 
                          color: act.score === 100 ? 'var(--star-gold)' : (act.score >= 80 ? 'var(--crystal-cyan)' : '#ef4444'),
                          fontSize: '0.9rem',
                          fontWeight: 'bold'
                        }}>
                          {act.score}
                        </span>
                      </div>

                      {act.initialScore !== undefined && (
                        <div style={{ 
                          background: 'rgba(255,107,129,0.05)', 
                          padding: '0.2rem 0.6rem', 
                          borderRadius: '4px', 
                          display: 'inline-flex', 
                          alignItems: 'center', 
                          gap: '0.4rem',
                          border: '1px solid rgba(255,107,129,0.1)'
                        }}>
                          <span className="font-tech" style={{ color: 'var(--secondary)', fontSize: '0.65rem' }}>INIT / ATTEMPT</span>
                          <span className="font-tech" style={{ color: 'var(--text-bright)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                            {act.initialScore}점 / {act.attemptCount || 1}회
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Video Position */}
                  {formattedVideoTime && (
                    <div style={{ 
                      background: 'rgba(0,243,255,0.05)', 
                      padding: '0.2rem 0.6rem', 
                      borderRadius: '4px', 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.4rem',
                      border: '1px solid rgba(0,243,255,0.1)'
                    }}>
                      <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.75rem' }}>POSITION</span>
                      <span className="font-tech" style={{ color: 'var(--text-bright)', fontSize: '0.9rem', fontWeight: 'bold' }}>
                        {formattedVideoTime} 지점 시청
                      </span>
                    </div>
                  )}

                  {/* Quiz In-Progress Bar */}
                  {act.type === 'quiz_in_progress' && act.metadata?.totalCount > 0 && (() => {
                    const pct = Math.round((act.metadata.answeredCount / act.metadata.totalCount) * 100);
                    return (
                      <div style={{ width: '100%', marginTop: '0.3rem' }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          marginBottom: '0.3rem',
                          fontSize: '0.75rem'
                        }}>
                          <span className="font-tech" style={{ color: 'var(--text-muted)' }}>PROGRESS</span>
                          <span className="font-tech" style={{ color: '#fbbf24', fontWeight: 'bold' }}>{pct}%</span>
                        </div>
                        <div style={{
                          width: '100%',
                          height: '6px',
                          background: 'rgba(255,255,255,0.08)',
                          borderRadius: '3px',
                          overflow: 'hidden'
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: 'linear-gradient(90deg, #fbbf24, #f59e0b)',
                            borderRadius: '3px',
                            transition: 'width 0.5s ease',
                            boxShadow: '0 0 8px rgba(251, 191, 36, 0.4)'
                          }} />
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
