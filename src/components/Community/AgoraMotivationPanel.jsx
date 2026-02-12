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

export default function AgoraMotivationPanel({ userData, activeCategory, onCategoryChange }) {
  const { data: ranking, isLoading } = useQARanking();

  const explorerLevel = userData?.spaceshipLevel || 1;
  const helpCount = userData?.helpCount || 0;
  
  // Calculate progress to next level based on crystals or score
  // Since spaceshipLevel is already calculated elsewhere, we'll use a mock progress 
  // until we have a clear formula for level-up in this app.
  // For now, let's use a simple crystal-based mockup or actual crystal value.
  const crystals = userData?.crystals || 0;
  const progress = (crystals % 100); 

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
            <span className="next-level">Lv.{explorerLevel + 1}</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
              <div className="progress-glow" />
            </div>
          </div>
          <p className="hint">다음 레벨까지 광석 {100 - progress}개 더 필요해요!</p>
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
