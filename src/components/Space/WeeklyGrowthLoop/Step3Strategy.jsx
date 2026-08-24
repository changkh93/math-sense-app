import React from 'react';
import { STRATEGY_OPTIONS } from '../../../utils/weeklyGrowthLoopDomain';

export default function Step3Strategy({ strategyCode, onStrategySelect }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="step-header">
        <div className="step-subtitle">STEP 3. 하나 바꾸기</div>
        <h3 className="step-title">이번 주에는 무엇을 하나 바꿔볼까요? 🧭</h3>
        <p className="step-hint">
          나에게 꼭 맞는 전략을 <strong>정확히 1개</strong> 골라보세요.
        </p>
      </div>

      <div className="choice-grid">
        {STRATEGY_OPTIONS.map((opt) => {
          const isSelected = strategyCode === opt.code;
          return (
            <button
              key={opt.code}
              type="button"
              className={`choice-card ${isSelected ? 'selected' : ''}`}
              onClick={() => onStrategySelect(opt.code)}
              aria-pressed={isSelected}
            >
              <div className="choice-icon">{opt.icon}</div>
              <div className="choice-content">
                <div className="choice-label">{opt.label}</div>
                <div className="choice-desc">{opt.desc}</div>
              </div>
              <div className="choice-radio">
                {isSelected && <div className="choice-radio-inner" />}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
