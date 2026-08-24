import React from 'react';
import {
  OBSERVATION_OPTIONS,
  PRIDE_OPTIONS,
} from '../../../utils/weeklyGrowthLoopDomain';

export default function Step2Reflection({
  observationCodes,
  onObservationToggle,
  prideCode,
  onPrideSelect,
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* 1. Observation selection (1~2 items) */}
      <div>
        <div className="step-header">
          <div className="step-subtitle">STEP 2. 마음 돌아보기</div>
          <h3 className="step-title">지난주 나는 어땠나요? 💭</h3>
          <p className="step-hint">
            가장 와닿는 느낌을 <strong>1~2개</strong> 골라보세요. (현재 {observationCodes.length}/2개 선택)
          </p>
        </div>

        <div className="choice-grid">
          {OBSERVATION_OPTIONS.map((opt) => {
            const isSelected = observationCodes.includes(opt.code);
            return (
              <button
                key={opt.code}
                type="button"
                className={`choice-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onObservationToggle(opt.code)}
                aria-pressed={isSelected}
              >
                <div className="choice-icon">{opt.icon}</div>
                <div className="choice-content">
                  <div className="choice-label">{opt.label}</div>
                </div>
                <div className="choice-checkbox">{isSelected ? '✓' : ''}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Pride selection (optional 1 item or skip) */}
      <div style={{ paddingTop: '1rem', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
        <div className="step-header">
          <h4 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0 }}>
            스스로 가장 마음에 드는 점은 무엇인가요? 🌟
          </h4>
          <p className="step-hint">작은 것이라도 괜찮아요. (선택 사항)</p>
        </div>

        <div className="choice-grid">
          {PRIDE_OPTIONS.map((opt) => {
            const isSelected = prideCode === opt.code;
            return (
              <button
                key={opt.code}
                type="button"
                className={`choice-card ${isSelected ? 'selected' : ''}`}
                onClick={() => onPrideSelect(isSelected ? null : opt.code)}
                aria-pressed={isSelected}
              >
                <div className="choice-icon">{opt.icon}</div>
                <div className="choice-content">
                  <div className="choice-label">{opt.label}</div>
                </div>
                <div className="choice-radio">
                  {isSelected && <div className="choice-radio-inner" />}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
