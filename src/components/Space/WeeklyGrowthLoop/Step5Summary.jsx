import React from 'react';
import {
  OBSERVATION_OPTIONS,
  PRIDE_OPTIONS,
  STRATEGY_OPTIONS,
  GOAL_TEMPLATES_CATALOG,
} from '../../../utils/weeklyGrowthLoopDomain';

export default function Step5Summary({
  observationCodes,
  prideCode,
  strategyCode,
  selectedTemplateIds,
  isCompleted,
  onStartEditing,
}) {
  const selectedObservations = OBSERVATION_OPTIONS.filter((o) =>
    observationCodes.includes(o.code)
  );
  const selectedPride = PRIDE_OPTIONS.find((p) => p.code === prideCode);
  const selectedStrategy = STRATEGY_OPTIONS.find((s) => s.code === strategyCode);
  const selectedGoals = GOAL_TEMPLATES_CATALOG.filter((g) =>
    selectedTemplateIds.includes(g.id)
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="step-header">
        <div className="step-subtitle">
          {isCompleted ? '항로 설정 완료' : 'STEP 5. 확인 및 시작'}
        </div>
        <h3 className="step-title">
          {isCompleted ? '이번 주 항로가 준비되었어요! 🌟' : '이번 주 항로를 출발해볼까요? 🚀'}
        </h3>
        <p className="step-hint">
          {isCompleted
            ? '이번 주 동안 아래 목표와 전략을 마음에 품고 멋지게 항해해보세요.'
            : '내가 고른 성찰과 목표를 마지막으로 확인해 주세요.'}
        </p>
      </div>

      <div className="summary-section">
        {/* 1. Observations & Pride */}
        <div className="summary-block">
          <div className="summary-block-title">💭 지난주 돌아보기</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {selectedObservations.map((obs) => (
              <span key={obs.code} className="summary-item-badge">
                <span>{obs.icon}</span>
                <span>{obs.label}</span>
              </span>
            ))}
            {selectedPride && (
              <span
                className="summary-item-badge"
                style={{
                  background: 'rgba(255, 215, 0, 0.12)',
                  borderColor: 'rgba(255, 215, 0, 0.4)',
                  color: 'var(--star-gold, #ffd700)',
                }}
              >
                <span>🌟</span>
                <span>자랑: {selectedPride.label}</span>
              </span>
            )}
          </div>
        </div>

        {/* 2. Strategy */}
        <div className="summary-block">
          <div className="summary-block-title">🧭 이번 주 나의 전략</div>
          {selectedStrategy ? (
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(0, 229, 255, 0.15), rgba(16, 24, 48, 0.6))',
                border: '1px solid rgba(0, 229, 255, 0.4)',
                borderRadius: '12px',
                padding: '0.8rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.6rem',
              }}
            >
              <span style={{ fontSize: '1.4rem' }}>{selectedStrategy.icon}</span>
              <div>
                <div style={{ fontWeight: 800, color: '#fff', fontSize: '0.95rem' }}>
                  {selectedStrategy.label}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                  {selectedStrategy.desc}
                </div>
              </div>
            </div>
          ) : (
            <div style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: '0.85rem' }}>
              선택된 전략이 없습니다.
            </div>
          )}
        </div>

        {/* 3. Goals */}
        <div className="summary-block">
          <div className="summary-block-title">🎯 이번 주 목표 ({selectedGoals.length}개)</div>
          <div className="summary-goals-list">
            {selectedGoals.map((g) => (
              <div key={g.id} className="summary-goal-card">
                <span>✨</span>
                <span>{g.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {isCompleted && onStartEditing && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '0.5rem' }}>
          <button
            type="button"
            className="nav-btn-secondary"
            onClick={onStartEditing}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <span>✏️</span>
            <span>계획 수정하기</span>
          </button>
        </div>
      )}
    </div>
  );
}
