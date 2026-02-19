import React from 'react';
import { Trophy, Star, Zap, Target } from 'lucide-react';
import { useQARanking } from '../../hooks/useQA';
import './AgoraMotivationPanel.css';

const getAchievementTitle = (helpCount = 0) => {
  if (helpCount >= 100) return '아고라의 지배자';
  if (helpCount >= 50) return '수학의 아인슈타인';
  if (helpCount >= 10) return '은하계의 뉴턴';
  if (helpCount >= 1) return '수학 탐험가';
  return '수습 항해사';
};

// Level thresholds: cumulative crystals needed to reach each level
// Lv.1: 0, Lv.2: 100, Lv.3: 250, Lv.4: 500, Lv.5: 1000, Lv.6: 2000, Lv.7: 5000
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000, 2000, 5000];

/**
 * Calculate level and progress from total crystals.
 * Returns { level, progress (0-100), remaining, currentThreshold, nextThreshold }
 */
function calculateLevel(crystals) {
  let level = 1;
  for (let i = 1; i < LEVEL_THRESHOLDS.length; i++) {
    if (crystals >= LEVEL_THRESHOLDS[i]) {
      level = i + 1;
    } else {
      break;
    }
  }

  const isMaxLevel = level >= LEVEL_THRESHOLDS.length;
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] || 0;
  const nextThreshold = isMaxLevel
    ? currentThreshold // Max level reached
    : LEVEL_THRESHOLDS[level];

  const rangeSize = nextThreshold - currentThreshold;
  const crystalsInRange = crystals - currentThreshold;

  const progress = isMaxLevel ? 100 : rangeSize > 0
    ? Math.min(100, Math.round((crystalsInRange / rangeSize) * 100))
    : 0;

  const remaining = isMaxLevel ? 0 : nextThreshold - crystals;

  return { level, progress, remaining, currentThreshold, nextThreshold, isMaxLevel };
}

export default function AgoraMotivationPanel({ userData, activeCategory, onCategoryChange }) {
  const { data: ranking, isLoading } = useQARanking();

  const helpCount = userData?.helpCount || 0;
  const crystals = userData?.crystals || 0;

  // Calculate level dynamically from crystals (no longer relying on spaceshipLevel)
  const { level: explorerLevel, progress, remaining, isMaxLevel } = calculateLevel(crystals);

  // Achievement Title
  const title = getAchievementTitle(helpCount);

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
                <span className="name">{hero.name || '익명 탐험가'}</span>
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
            <p className="hint">다음 레벨까지 광석 {remaining}개 더 필요해요! (보유: {crystals}개)</p>
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

