import React from 'react';
import { Trophy, Star, Zap, Target } from 'lucide-react';
import { useQARanking } from '../../hooks/useQA';
import './AgoraMotivationPanel.css';

const EXPLORER_LEVELS = [
  { level: 1, threshold: 0, title: '수습 항해사' },
  { level: 2, threshold: 100, title: '별빛 수집가' },
  { level: 3, threshold: 250, title: '궤도 계산가' },
  { level: 4, threshold: 500, title: '성운 탐험가' },
  { level: 5, threshold: 1000, title: '문제 해결 파일럿' },
  { level: 6, threshold: 2000, title: '블랙홀 전략가' },
  { level: 7, threshold: 5000, title: '은하계의 뉴턴' },
  { level: 8, threshold: 9000, title: '별자리의 가우스' },
  { level: 9, threshold: 15000, title: '차원의 오일러' },
  { level: 10, threshold: 24000, title: '우주의 아인슈타인' },
  { level: 11, threshold: 38000, title: '아고라의 아르키메데스' },
  { level: 12, threshold: 60000, title: '스텔라의 전설' },
];

/**
 * Calculate level and progress from total crystals.
 * Returns { level, title, progress (0-100), remaining, currentThreshold, nextThreshold }
 */
function calculateLevel(crystals) {
  let currentLevel = EXPLORER_LEVELS[0];
  for (let i = 1; i < EXPLORER_LEVELS.length; i++) {
    if (crystals >= EXPLORER_LEVELS[i].threshold) {
      currentLevel = EXPLORER_LEVELS[i];
    } else {
      break;
    }
  }

  const nextLevel = EXPLORER_LEVELS.find((item) => item.level === currentLevel.level + 1);
  const isMaxLevel = !nextLevel;
  const currentThreshold = currentLevel.threshold;
  const nextThreshold = nextLevel?.threshold || currentThreshold;

  const rangeSize = nextThreshold - currentThreshold;
  const crystalsInRange = crystals - currentThreshold;

  const progress = isMaxLevel ? 100 : rangeSize > 0
    ? Math.min(100, Math.round((crystalsInRange / rangeSize) * 100))
    : 0;

  const remaining = isMaxLevel ? 0 : nextThreshold - crystals;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    nextTitle: nextLevel?.title || null,
    progress,
    remaining,
    currentThreshold,
    nextThreshold,
    isMaxLevel
  };
}

export default function AgoraMotivationPanel({ userData, activeCategory, onCategoryChange }) {
  const { data: ranking, isLoading } = useQARanking();

  const crystals = userData?.crystals || 0;

  const {
    level: explorerLevel,
    title,
    nextTitle,
    progress,
    remaining,
    isMaxLevel
  } = calculateLevel(crystals);

  return (
    <aside className="agora-side-panel">
      {/* Hall of Fame */}
      <section className="motivation-section glass hud-border">
        <h3 className="section-title font-title">
          <Trophy size={18} className="icon-gold" /> 명예의 전당 (TOP 10)
        </h3>
        <div className="hall-of-fame-list">
          {isLoading ? (
            <div className="loading-mini font-tech">데이터 수신 중...</div>
          ) : ranking && ranking.length > 0 ? (
            ranking.map((hero, i) => (
              <div key={hero.id} className="hall-item">
                <span className="badge">{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '✨'}</span>
                <span className="name">{hero.studentName || hero.name || '익명 탐험가'}</span>
                <span className="count font-tech">{hero.helpCount} 도움</span>
              </div>
            ))
          ) : (
            <div className="empty-mini font-tech">첫 번째 영웅을 기다려요!</div>
          )}
        </div>
      </section>

      {/* My Stats */}
      <section className="motivation-section glass hud-border">
        <h3 className="section-title font-title">
          <Zap size={18} className="icon-cyan" /> 나의 탐사 등급
        </h3>
        <div className="my-progress">
          <div className="level-info">
            <span className="level-name">{title} (Lv.{explorerLevel})</span>
            {!isMaxLevel && <span className="next-level">Lv.{explorerLevel + 1}</span>}
            {isMaxLevel && <span className="next-level">MAX</span>}
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
              <div className="progress-glow" />
            </div>
          </div>
          {isMaxLevel ? (
            <p className="hint">🎉 최고 등급 달성! 총 광석: {crystals}개</p>
          ) : (
            <p className="hint">다음 등급: {nextTitle}까지 광석 {remaining}개 더 필요해요! (보유: {crystals}개)</p>
          )}
        </div>
      </section>

      {/* Resolution Stats (Bonus) */}
      {userData?.totalQuizzes > 0 && (
        <section className="motivation-section glass hud-border">
          <h3 className="section-title font-title">
            <Target size={18} className="icon-purple" /> 탐사 성적표
          </h3>
          <div className="mini-stats-grid">
            <div className="mini-stat">
              <span className="label">해결한 문제</span>
              <span className="value">{userData.totalQuizzes}개</span>
            </div>
            <div className="mini-stat">
              <span className="label">평균 점수</span>
              <span className="value">{userData.averageScore?.toFixed(1) || 0}점</span>
            </div>
          </div>
        </section>
      )}

      {/* Helpful Tip */}
      <div className="helpful-tip font-tech">
        <Star size={14} /> 친구의 별에 답변을 달고 광석 보상을 받으세요!
      </div>
    </aside>
  );
}
