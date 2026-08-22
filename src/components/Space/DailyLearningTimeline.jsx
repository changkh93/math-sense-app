import React from 'react';
import { motion } from 'framer-motion';

const MotionDiv = motion.div;

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

const formatFocusScore = (score) => {
  if (score === null || score === undefined) return '기록 없음';
  return `${score}점`;
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
  },
  code: {
    icon: '⌨️',
    label: 'CODE TRACE',
    color: '#a78bfa',
    bg: 'rgba(167, 139, 250, 0.12)',
    border: 'rgba(167, 139, 250, 0.35)'
  },
  workbook: {
    icon: '🧮',
    label: '스마트 워크북',
    color: '#22d3ee',
    bg: 'rgba(34, 211, 238, 0.12)',
    border: 'rgba(34, 211, 238, 0.35)'
  },
  battle: {
    icon: '⚔️',
    label: '퀴즈 배틀',
    color: '#f43f5e',
    bg: 'rgba(244, 63, 94, 0.12)',
    border: 'rgba(244, 63, 94, 0.35)'
  },
  lumi: {
    icon: '🛰️',
    label: 'LUMI PROTOCOL',
    color: '#55f1c8',
    bg: 'rgba(85, 241, 200, 0.12)',
    border: 'rgba(85, 241, 200, 0.35)'
  }
};

// ── Grouped View Component ──
function GroupedView({ items, dailyStats, onActivityClick }) {
  // Count unique types for the summary
  const quizItems = items.filter(i => i.type === 'quiz');
  const videoItems = items.filter(i => i.type === 'video');
  const textItems = items.filter(i => i.type === 'text');
  const codeItems = items.filter(i => i.type === 'code');
  const workbookItems = items.filter(i => i.type === 'workbook');
  const battleItems = items.filter(i => i.type === 'battle');
  const codeTraceCount = dailyStats?.codeTraceCount ?? codeItems.filter(i => i.completed).length;
  const codeTraceProgressCount = dailyStats?.codeTraceProgressCount ?? codeItems.filter(i => !i.completed).length;
  const workbookCount = dailyStats?.workbookCount ?? workbookItems.filter(i => i.completed).length;
  const workbookProgressCount = dailyStats?.workbookProgressCount ?? workbookItems.filter(i => !i.completed).length;

  const battleCount = dailyStats?.battleCount ?? battleItems.length;
  const battleCorrectRate = dailyStats?.battleQuestionCount > 0
    ? Math.round((dailyStats.battleCorrectCount / dailyStats.battleQuestionCount) * 100)
    : null;

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

          {/* Code trace stat */}
          <StatChip
            icon="🧮"
            label="스마트 워크북"
            value={workbookProgressCount > 0 ? `완료 ${workbookCount} / 진행 ${workbookProgressCount}` : `${workbookCount}회`}
            color="#22d3ee"
          />

          <StatChip
            icon="⌨️"
            label="CODE TRACE"
            value={
              codeTraceProgressCount > 0
                ? `완료 ${codeTraceCount} / 진행 ${codeTraceProgressCount}`
                : `${codeTraceCount}회`
            }
            color="#a78bfa"
          />

          {(dailyStats?.lumiProtocolMissionCount > 0 || dailyStats?.lumiProtocolCount > 0 || dailyStats?.lumiProtocolProgressCount > 0 || items.some(i => i.type === 'lumi')) && (
            <StatChip
              icon="🛰️"
              label="LUMI PROTOCOL"
              value={
                (dailyStats?.lumiProtocolProgressCount > 0 && !(dailyStats?.lumiProtocolMissionCount > 0 || dailyStats?.lumiProtocolCount > 0))
                  ? `진행 중 ${dailyStats.lumiProtocolProgressCount}개`
                  : dailyStats?.lumiProtocolProgressCount > 0
                    ? `완료 ${dailyStats.lumiProtocolMissionCount || dailyStats.lumiProtocolCount} / 진행 ${dailyStats.lumiProtocolProgressCount}`
                    : `${dailyStats?.lumiProtocolMissionCount || dailyStats?.lumiProtocolCount || items.filter(i => i.type === 'lumi').length}회`
              }
              subValue={dailyStats?.lumiProtocolCrystalsEarned > 0 ? `광석 ${dailyStats.lumiProtocolCrystalsEarned}개` : null}
              color="#55f1c8"
            />
          )}
          
          {/* Assignment stat */}
          <StatChip 
            icon="📁" 
            label="항행 일지" 
            value={dailyStats?.isAssignmentSubmitted ? '제출됨' : '미작성'}
            color={dailyStats?.isAssignmentSubmitted ? 'var(--text-bright)' : 'rgba(255,255,255,0.3)'}
          />

          <StatChip
            icon="💎"
            label="집중도"
            value={formatFocusScore(dailyStats?.focusScore)}
            subValue={dailyStats?.attentionOpportunities > 0 ? `${dailyStats.attentionHits}/${dailyStats.attentionOpportunities} 획득` : null}
            color={
              dailyStats?.focusScore == null
                ? 'rgba(255,255,255,0.45)'
                : dailyStats.focusScore >= 80
                  ? '#22c55e'
                  : dailyStats.focusScore >= 50
                    ? '#fbbf24'
                    : '#f87171'
            }
          />

          {battleCount > 0 && (
            <StatChip
              icon="⚔️"
              label="퀴즈 배틀"
              value={`${battleCount}전 ${dailyStats?.battleWinCount || 0}승 ${dailyStats?.battleLossCount || 0}패${dailyStats?.battleDrawCount ? ` ${dailyStats.battleDrawCount}무` : ''}`}
              subValue={battleCorrectRate != null ? `정답률 ${battleCorrectRate}%` : null}
              color="#f43f5e"
            />
          )}
        </div>
      </div>

      {/* ── Activity Cards ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
        {items.map((item, index) => (
          <GroupedCard 
            key={item.id} 
            item={item} 
            index={index}
            onClick={onActivityClick ? () => onActivityClick(item.unitId, item.chapterId) : null}
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
function GroupedCard({ item, index, onClick }) {
  const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.quiz;
  const isClickable = !!onClick;
  const attentionScore = item.attentionOpportunities > 0
    ? Math.round((item.attentionHits / item.attentionOpportunities) * 100)
    : null;
  
  const timeRange = (() => {
    const start = formatTime(item.firstTimestamp);
    const end = formatTime(item.lastTimestamp);
    if (!start) return '';
    if (start === end) return start;
    return `${start} ~ ${end}`;
  })();

  return (
    <MotionDiv
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      onClick={isClickable ? onClick : undefined}
      style={{ 
        padding: '1rem 1.2rem',
        background: config.bg,
        border: `1px solid ${config.border}`,
        borderRadius: '12px',
        cursor: isClickable ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden'
      }}
      whileHover={isClickable ? { 
        scale: 1.01, 
        boxShadow: `0 4px 20px ${config.border}` 
      } : {}}
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
        
        {/* Status badges removed per user request */}
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
        {/* Quiz score / Progress */}
        {item.type === 'quiz' && (
          <>
            {item.score !== null && item.score !== undefined ? (
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span className="font-tech" style={{ 
                  color: item.score === 100 ? 'var(--star-gold)' : item.score >= 80 ? config.color : '#ef4444',
                  fontWeight: 'bold',
                  background: 'rgba(0,0,0,0.3)',
                  padding: '0.15rem 0.5rem',
                  borderRadius: '4px'
                }}>
                  점수 {item.score}점
                </span>
                {item.totalCount > 0 && (
                  <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                    ({item.totalCount}문항 완료)
                  </span>
                )}
              </div>
            ) : item.totalCount > 0 ? (
              <span className="font-tech" style={{ 
                color: 'var(--text-muted)',
                fontWeight: 'bold',
                background: 'rgba(255, 165, 0, 0.1)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px',
                border: '1px solid rgba(255, 165, 0, 0.2)'
              }}>
                🔭 진행 중 {item.answeredCount}/{item.totalCount}문항
              </span>
            ) : (
                <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                  탐사 준비 중
                </span>
            )}
          </>
        )}

        {item.type === 'workbook' && (
          item.completed ? (
            <span className="font-tech" style={{ color: item.score === 100 ? 'var(--star-gold)' : config.color, fontWeight: 'bold' }}>
              점수 {item.score ?? 0}점{item.totalCount > 0 ? ` · ${item.totalCount}문항` : ''}
            </span>
          ) : (
            <span className="font-tech" style={{ color: '#fbbf24' }}>
              이어 풀기 {item.currentPage || 1}/{item.totalCount || '?'}페이지 · 답안 {item.answeredCount || 0}개
            </span>
          )
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

        {item.type === 'video' && item.attentionOpportunities > 0 && (
          <span className="font-tech" style={{
            color: attentionScore >= 80 ? '#22c55e' : attentionScore >= 50 ? '#fbbf24' : '#f87171',
            fontWeight: 'bold',
            background: 'rgba(0,0,0,0.3)',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px'
          }}>
            광석 {item.attentionHits}/{item.attentionOpportunities} 획득
          </span>
        )}

        {item.type === 'video' && item.timeAttackHits + item.timeAttackMisses > 0 && (
          <span className="font-tech" style={{ color: 'var(--text-muted)' }}>
            타임어택 {item.timeAttackHits}/{item.timeAttackHits + item.timeAttackMisses}
          </span>
        )}

        {item.type === 'video' && item.completionCrystalHits + item.completionCrystalMisses > 0 && (
          <span className="font-tech" style={{
            color: item.completionCrystalMisses > 0 ? '#f87171' : '#22c55e'
          }}>
            완료 보너스 {item.completionCrystalMisses > 0 ? '놓침' : '획득'}
          </span>
        )}

        {item.type === 'code' && (
          <>
            <span className="font-tech" style={{
              color: item.completed ? '#22c55e' : '#fbbf24',
              fontWeight: 'bold',
              background: 'rgba(0,0,0,0.3)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              border: item.completed ? 'none' : '1px solid rgba(251, 191, 36, 0.25)'
            }}>
              {item.completed ? '완료' : '진행 중'}
              {item.totalCount > 0 ? ` ${item.completedExerciseCount || 0}/${item.totalCount}` : ''}
            </span>
            {item.bestAccuracy !== null && item.bestAccuracy !== undefined && (
              <span className="font-tech" style={{
                color: config.color,
                fontWeight: 'bold',
                background: 'rgba(0,0,0,0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                정확도 {item.bestAccuracy}점
              </span>
            )}
            {item.totalPracticeCount > 0 && (
              <span className="font-tech" style={{ color: 'var(--text-muted)' }}>
                연습 {item.totalPracticeCount}회
              </span>
            )}
            {item.lastMode && (
              <span className="font-tech" style={{ color: 'var(--text-muted)' }}>
                {item.lastMode === 'hidden' ? '가리고 쓰기' : item.lastMode === 'line' ? '한 줄씩' : item.lastMode}
              </span>
            )}
            {item.crystalsEarnedTotal > 0 && (
              <span className="font-tech" style={{
                color: 'var(--star-gold)',
                fontWeight: 'bold',
                background: 'rgba(0,0,0,0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                광석 {item.crystalsEarnedTotal}개 획득
              </span>
            )}
          </>
        )}

        {item.type === 'battle' && (
          <>
            <span className="font-tech" style={{
              color: item.battleResult === 'win'
                ? '#22c55e'
                : item.battleResult === 'loss'
                  ? '#f87171'
                  : '#fbbf24',
              fontWeight: 'bold',
              background: 'rgba(0,0,0,0.3)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px'
            }}>
              {item.battleResult === 'win' ? '승리' : item.battleResult === 'loss' ? '패배' : '무승부'}{item.forfeited ? ' (포기)' : ''}
            </span>
            {item.score != null && (
              <span className="font-tech" style={{ color: 'var(--text-muted)' }}>
                {item.score}점 · {item.battleCorrectCount}/{item.totalCount} 정답
              </span>
            )}
            {item.opponentDisplayName && (
              <span className="font-tech" style={{ color: 'var(--text-muted)' }}>
                vs {item.opponentDisplayName}
              </span>
            )}
            {item.battleScope === 'unit' && item.battleUnitTitle ? (
              <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                범위: {item.battleUnitTitle}
              </span>
            ) : item.battleScope === 'cumulative' ? (
              <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>
                범위: 이전 과정 전체
              </span>
            ) : null}
            {item.crystalsEarnedTotal > 0 && (
              <span className="font-tech" style={{
                color: 'var(--star-gold)',
                fontWeight: 'bold',
                background: 'rgba(0,0,0,0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                +{item.crystalsEarnedTotal} 광석
              </span>
            )}
          </>
        )}

        {item.type === 'lumi' && (
          <>
            <span className="font-tech" style={{
              color: item.completed ? '#22c55e' : '#55f1c8',
              fontWeight: 'bold',
              background: 'rgba(0,0,0,0.3)',
              padding: '0.15rem 0.5rem',
              borderRadius: '4px',
              border: item.completed ? 'none' : '1px solid rgba(85, 241, 200, 0.25)'
            }}>
              {item.todayCompletedCount > 0 ? `오늘 ${item.todayCompletedCount}개 미션 완료` : '진행 중'}
              {item.totalMissionCount > 0 ? ` · 전체 ${item.completedMissionCount || item.todayCompletedCount || 0}/${item.totalMissionCount} 진행` : ''}
            </span>
            {item.bestStars > 0 && (
              <span className="font-tech" style={{
                color: 'var(--star-gold)',
                fontWeight: 'bold',
                background: 'rgba(0,0,0,0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                최고 별 {item.bestStars}개
              </span>
            )}
            {item.lastMissionTitle && (
              <span className="font-tech" style={{ color: 'var(--text-muted)' }}>
                마지막 미션: {item.lastMissionTitle}
              </span>
            )}
            {item.crystalsEarnedToday > 0 ? (
              <span className="font-tech" style={{
                color: 'var(--star-gold)',
                fontWeight: 'bold',
                background: 'rgba(0,0,0,0.3)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                오늘 광석 {item.crystalsEarnedToday}개 획득
              </span>
            ) : item.crystalsEarnedTotal > 0 ? (
              <span className="font-tech" style={{
                color: 'var(--text-muted)',
                background: 'rgba(0,0,0,0.2)',
                padding: '0.15rem 0.5rem',
                borderRadius: '4px'
              }}>
                누적 광석 {item.crystalsEarnedTotal}개
              </span>
            ) : null}
          </>
        )}

      </div>
    </MotionDiv>
  );
}
