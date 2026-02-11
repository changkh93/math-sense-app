import React from 'react';
import { Trophy, Star, Zap } from 'lucide-react';
import './AgoraMotivationPanel.css';

export default function AgoraMotivationPanel({ userData, activeCategory, onCategoryChange }) {
  // Mock data for Hall of Fame (can be fetched from ranking KI later)
  const hallOfFame = [
    { name: '김수학', badges: '🥇', helpCount: 42 },
    { name: '박함수', badges: '🥈', helpCount: 38 },
    { name: '이도형', badges: '🥉', helpCount: 25 },
  ];

  /* 
  const districts = [
    { id: 'algebra', label: '대수학 구역', icon: '🔢', color: '#ff4757' },
    { id: 'geometry', label: '기하학 구역', icon: '📐', color: '#2ed573' },
    { id: 'logic', label: '규칙과 논리', icon: '📊', color: '#1e90ff' },
    { id: 'general', label: '자유 구역', icon: '🏛️', color: '#ffa502' }
  ];
  */

  const explorerLevel = userData?.spaceshipLevel || 1;
  const progress = 65; // Mock progress to next level

  return (
    <aside className="agora-side-panel">
      {/* 
      <section className="motivation-section glass hud-border district-panel">
        <h3 className="section-title font-title">
          🗺️ 탐사 구역
        </h3>
        <div className="district-list">
          {districts.map(d => (
            <button 
              key={d.id} 
              className={`district-item glass ${activeCategory === d.id ? 'active' : ''}`}
              onClick={() => onCategoryChange(d.id)}
            >
              <span className="dist-icon">{d.icon}</span>
              <span className="dist-label">{d.label}</span>
              {activeCategory === d.id && <div className="active-glow" style={{ background: d.color }} />}
            </button>
          ))}
        </div>
      </section>
      */}

      {/* Hall of Fame */}
      <section className="motivation-section glass hud-border">
        <h3 className="section-title font-title">
          <Trophy size={18} className="icon-gold" /> 명예의 전당
        </h3>
        <div className="hall-of-fame-list">
          {hallOfFame.map((hero, i) => (
            <div key={i} className="hall-item">
              <span className="badge">{hero.badges}</span>
              <span className="name">{hero.name}</span>
              <span className="count font-tech">{hero.helpCount} 도움</span>
            </div>
          ))}
        </div>
      </section>

      {/* My Stats */}
      <section className="motivation-section glass hud-border">
        <h3 className="section-title font-title">
          <Zap size={18} className="icon-cyan" /> 나의 탐사 등급
        </h3>
        <div className="my-progress">
          <div className="level-info">
            <span className="level-name">지식 탐험가 (Lv.{explorerLevel})</span>
            <span className="next-level">Lv.{explorerLevel + 1}</span>
          </div>
          <div className="progress-bar-wrap">
            <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
              <div className="progress-glow" />
            </div>
          </div>
          <p className="hint">다음 등급까지 광석 {100 - progress}개 더 필요해요!</p>
        </div>
      </section>

      {/* Helpful Tip */}
      <div className="helpful-tip font-tech">
        <Star size={14} /> 친구의 별에 답변을 달고 광석 보상을 받으세요!
      </div>
    </aside>
  );
}
