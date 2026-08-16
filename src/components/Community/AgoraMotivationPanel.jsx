import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CircleHelp, Trophy, Star, Zap, Target, X } from 'lucide-react';
import { useQARanking } from '../../hooks/useQA';
import soundManager from '../../utils/SoundManager';
import { calculateExplorerLevel, getExplorerExperience } from '../../utils/explorerLevelUtils';
import './AgoraMotivationPanel.css';

export default function AgoraMotivationPanel({ userData }) {
  const navigate = useNavigate();
  const { data: ranking, isLoading } = useQARanking();
  const [isExperienceGuideOpen, setIsExperienceGuideOpen] = useState(false);

  const openPublicProfile = (event, uid) => {
    event.stopPropagation();
    if (!uid) return;
    soundManager.playClick();
    navigate(`/profile/${uid}`);
  };

  const explorerExperience = getExplorerExperience(userData);

  const {
    level: explorerLevel,
    title,
    nextTitle,
    progress,
    remaining,
    isMaxLevel
  } = calculateExplorerLevel(explorerExperience);

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
                <button
                  type="button"
                  className="hall-item-name"
                  onClick={(event) => openPublicProfile(event, hero.id)}
                  aria-label={`${hero.studentName || hero.name || '익명 탐험가'}님의 프로필 보기`}
                >
                  {hero.studentName || hero.name || '익명 탐험가'}
                </button>
                <span className="count font-tech">{hero.helpCount} 도움</span>
              </div>
            ))
          ) : (
            <div className="empty-mini font-tech">첫 번째 영웅을 기다려요!</div>
          )}
        </div>
      </section>

      {/* My Stats */}
      <section className="motivation-section glass hud-border explorer-level-section">
        <h3 className="section-title font-title">
          <Zap size={18} className="icon-cyan" /> 나의 탐사 등급
          <button
            type="button"
            className="experience-guide-trigger"
            aria-label="누적 탐사 XP 안내 열기"
            aria-controls="explorer-experience-guide"
            aria-expanded={isExperienceGuideOpen}
            title="누적 탐사 XP가 무엇인지 알아보기"
            onClick={() => setIsExperienceGuideOpen((isOpen) => !isOpen)}
          >
            <CircleHelp size={16} aria-hidden="true" />
          </button>
        </h3>
        {isExperienceGuideOpen && (
          <div
            id="explorer-experience-guide"
            className="experience-guide"
            role="region"
            aria-label="누적 탐사 XP 안내"
          >
            <div className="experience-guide-heading">
              <strong>누적 탐사 XP 구성</strong>
              <button
                type="button"
                className="experience-guide-close"
                aria-label="누적 탐사 XP 안내 닫기"
                onClick={() => setIsExperienceGuideOpen(false)}
              >
                <X size={14} aria-hidden="true" />
              </button>
            </div>
            <div className="experience-formula">
              <div>
                <span>퀴즈·학습 보상</span>
                <b>지급 광석 1개 = 1 XP</b>
              </div>
              <div>
                <span>내 답변 채택</span>
                <b>20 XP</b>
              </div>
              <div>
                <span>현상금 답변 채택</span>
                <b>+현상금만큼 XP</b>
              </div>
              <div>
                <span>내 질문 해결</span>
                <b>5 XP</b>
              </div>
            </div>
            <p className="experience-formula-total">
              누적 탐사 XP = 위 XP를 모두 더한 누적값
            </p>
          </div>
        )}
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
            <p className="hint">🎉 최고 등급 달성! 누적 탐사 XP {explorerExperience.toLocaleString()}</p>
          ) : (
            <p className="hint">
              다음 등급: {nextTitle}까지 탐사 XP {remaining.toLocaleString()} 더 필요해요!
            </p>
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
              <span className="label">완료한 퀴즈 세트</span>
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
