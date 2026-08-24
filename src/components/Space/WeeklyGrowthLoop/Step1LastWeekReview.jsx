import React from 'react';
import {
  formatFriendlyDateKey,
  PREVIOUS_GOAL_OUTCOME_OPTIONS,
} from '../../../utils/weeklyGrowthLoopDomain';

export default function Step1LastWeekReview({
  loop,
  previousGoalOutcomes,
  onOutcomeChange,
}) {
  const reviewedWeek = loop?.reviewedWeek || {};
  const evidence = reviewedWeek.evidence || {};
  const previousGoals = reviewedWeek.previousGoals || [];

  const startFriendly = formatFriendlyDateKey(reviewedWeek.startKey);
  const endFriendly = formatFriendlyDateKey(reviewedWeek.endKey);

  const getSelectedOutcome = (goalId) => {
    const item = previousGoalOutcomes.find((o) => o.goalId === goalId);
    return item ? item.result : '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="step-header">
        <div className="step-subtitle">STEP 1. 지난주 돌아보기</div>
        <h3 className="step-title">지난주 나는 이렇게 움직였어요 🪞</h3>
        <p className="step-hint">
          {startFriendly && endFriendly ? `${startFriendly} ~ ${endFriendly}` : '지난주 기록'}의
          소중한 발자국입니다.
        </p>
      </div>

      {/* 1. Evidence Cards (Record Mirror) */}
      <div className="evidence-grid">
        <div className="evidence-card">
          <div className="evidence-icon">🌱</div>
          <div className="evidence-value">
            {evidence.availability?.learning !== false
              ? `${evidence.learningActivityDays || 0}일`
              : '기록 없음'}
          </div>
          <div className="evidence-label">학습 활동일</div>
        </div>

        <div className="evidence-card">
          <div className="evidence-icon">📝</div>
          <div className="evidence-value">
            {evidence.availability?.assignments !== false
              ? `${evidence.assignmentCount || 0}건`
              : '기록 없음'}
          </div>
          <div className="evidence-label">제출한 과제</div>
        </div>

        <div className="evidence-card">
          <div className="evidence-icon">📚</div>
          <div className="evidence-value">
            {evidence.availability?.reading !== false
              ? `${evidence.readingDays || 0}일`
              : '기록 없음'}
          </div>
          <div className="evidence-label">독서 기록일</div>
        </div>

        <div className="evidence-card">
          <div className="evidence-icon">🎯</div>
          <div className="evidence-value">{previousGoals.length}개</div>
          <div className="evidence-label">지난주 목표</div>
        </div>
      </div>

      <p className="evidence-note">
        {Object.values(evidence.availability || {}).some((available) => available === false)
          ? '일부 기록을 불러오지 못했어요. 보이는 기록만 참고하고 계속 진행해도 괜찮아요.'
          : '기록 거울은 MetaSense에 남아 있는 활동만 가볍게 보여줘요. 점수나 평가가 아니에요.'}
      </p>

      {/* 2. Previous Goals Review Section */}
      {previousGoals.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem', marginTop: '0.5rem' }}>
          <div style={{ fontSize: '0.92rem', fontWeight: 800, color: '#fff' }}>
            지난주에 세운 목표는 어땠나요?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {previousGoals.map((goal) => {
              const currentVal = getSelectedOutcome(goal.id);
              return (
                <div key={goal.id} className="goal-outcome-item">
                  <div className="goal-outcome-label">
                    <span>🎯</span>
                    <span>{goal.label}</span>
                  </div>
                  <div className="goal-outcome-buttons">
                    {PREVIOUS_GOAL_OUTCOME_OPTIONS.map((opt) => {
                      const isSelected = currentVal === opt.code;
                      return (
                        <button
                          key={opt.code}
                          type="button"
                          className={`outcome-btn ${isSelected ? `active ${opt.badgeClass}` : ''}`}
                          onClick={() => onOutcomeChange(goal.id, opt.code)}
                          aria-pressed={isSelected}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'rgba(0, 229, 255, 0.05)',
            border: '1px solid rgba(0, 229, 255, 0.2)',
            borderRadius: '14px',
            padding: '1.2rem',
            textAlign: 'center',
            color: 'rgba(255, 255, 255, 0.8)',
            fontSize: '0.88rem',
            lineHeight: 1.5,
          }}
        >
          ✨ <strong>첫 항로를 정해볼까요?</strong>
          <br />
          지난주 목표가 없어도 괜찮아요. 이번 주부터 나만의 멋진 항로를 시작해보세요!
        </div>
      )}
    </div>
  );
}
