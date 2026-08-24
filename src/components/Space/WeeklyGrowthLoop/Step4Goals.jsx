import React from 'react';
import {
  CATEGORY_LABELS,
  GOAL_TEMPLATES_CATALOG,
} from '../../../utils/weeklyGrowthLoopDomain';

export default function Step4Goals({ selectedTemplateIds, onGoalToggle }) {
  const categories = ['learn', 'habit', 'challenge', 'together'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div className="step-header">
        <div className="step-subtitle">STEP 4. 이번 주 목표</div>
        <h3 className="step-title">이번 주에 실천할 목표를 골라보세요 🚀</h3>
        <p className="step-hint">
          부담 없이 집중할 수 있도록 <strong>최대 3개</strong>까지 고를 수 있어요. (현재{' '}
          <strong style={{ color: selectedTemplateIds.length > 0 ? 'var(--crystal-cyan)' : 'inherit' }}>
            {selectedTemplateIds.length}/3개
          </strong>{' '}
          선택)
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {categories.map((catKey) => {
          const catInfo = CATEGORY_LABELS[catKey] || { name: catKey, icon: '📌', color: '#fff' };
          const templatesInCat = GOAL_TEMPLATES_CATALOG.filter((t) => t.category === catKey && t.active);

          return (
            <div key={catKey} className="category-group">
              <div className="category-header" style={{ color: catInfo.color }}>
                <span>{catInfo.icon}</span>
                <span>{catInfo.name}</span>
              </div>

              <div className="choice-grid">
                {templatesInCat.map((t) => {
                  const isSelected = selectedTemplateIds.includes(t.id);
                  const isMaxReached = selectedTemplateIds.length >= 3 && !isSelected;

                  return (
                    <button
                      key={t.id}
                      type="button"
                      className={`choice-card ${isSelected ? 'selected' : ''}`}
                      disabled={isMaxReached}
                      aria-pressed={isSelected}
                      style={{
                        opacity: isMaxReached ? 0.45 : 1,
                        cursor: isMaxReached ? 'not-allowed' : 'pointer',
                      }}
                      onClick={() => {
                        if (!isMaxReached || isSelected) {
                          onGoalToggle(t.id);
                        }
                      }}
                    >
                      <div className="choice-content">
                        <div className="choice-label">{t.label}</div>
                      </div>
                      <div className="choice-checkbox">{isSelected ? '✓' : ''}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
