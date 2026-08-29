import { useState } from 'react'

function formatState(state) {
  if (!state || typeof state !== 'object') return String(state)
  return Object.entries(state)
    .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
    .join(', ')
}

const timelineButtonStyle = (active, disabled) => ({
  padding: '6px 14px',
  borderRadius: '8px',
  border: active ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.15)',
  background: active ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.3)',
  color: disabled ? '#475569' : active ? '#38bdf8' : '#94a3b8',
  fontWeight: 'bold',
  fontSize: '13px',
  cursor: disabled ? 'not-allowed' : 'pointer',
})

export default function StateTransitionLens({ kernel, onDiscoveryComplete }) {
  const exploreConfig = kernel?.modes?.explore?.lensConfig || {}
  const initialState = exploreConfig.initialState || { state: '초기 상태' }
  const frames = Array.isArray(exploreConfig.frames) ? exploreConfig.frames : []
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1)
  const [furthestFrameIndex, setFurthestFrameIndex] = useState(-1)
  const [revealedRule, setRevealedRule] = useState(false)

  const currentFrame = currentFrameIndex >= 0 ? frames[currentFrameIndex] : null
  const previousState = currentFrameIndex <= 0
    ? initialState
    : frames[currentFrameIndex - 1]?.stateAfter || initialState
  const currentState = currentFrame?.stateAfter || initialState
  const nextFrame = frames[currentFrameIndex + 1] || null

  const [selectedOptionId, setSelectedOptionId] = useState(null)
  const [optionFeedback, setOptionFeedback] = useState(null)
  const [choiceAttempts, setChoiceAttempts] = useState({})

  const handleSelectOption = (opt) => {
    setSelectedOptionId(opt.id)
    if (nextFrame?.id) {
      setChoiceAttempts((previous) => ({
        ...previous,
        [nextFrame.id]: (previous[nextFrame.id] || 0) + 1,
      }))
    }
    if (nextFrame && nextFrame.expectedOptionId) {
      if (opt.id === nextFrame.expectedOptionId) {
        setOptionFeedback({ type: 'success', text: `정답입니다! (${opt.label})` })
      } else {
        setOptionFeedback({
          type: 'error',
          text: `선택한 명령 결과: ${formatState(opt.stateAfter)}. 목표 상태와 다릅니다. 다시 선택해 보세요.`,
        })
      }
    }
  }

  const canAdvance = !nextFrame?.operationOptions || (selectedOptionId === nextFrame.expectedOptionId)

  const handleRevealNext = () => {
    if (!canAdvance) return
    setSelectedOptionId(null)
    setOptionFeedback(null)
    if (nextFrame) {
      const nextIndex = currentFrameIndex + 1
      setCurrentFrameIndex(nextIndex)
      setFurthestFrameIndex((previous) => Math.max(previous, nextIndex))
      return
    }
    setRevealedRule(true)
  }

  const handleComplete = () => {
    onDiscoveryComplete?.({
      lensId: 'state-transition',
      ruleConfirmed: true,
      viewedSteps: frames.length,
      choiceAttempts,
    })
  }

  return (
    <div style={{ display: 'grid', gap: '18px', color: '#f8fafc' }}>
      <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
        <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>🔍 상태 전이 관찰 연구실</div>
        <div style={{ fontSize: '15px', color: '#e2e8f0', lineHeight: 1.5 }}>
          {exploreConfig.predictionPrompt || '다음 명령 뒤의 상태를 먼저 예상하고 결과를 확인해 보세요.'}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          aria-pressed={currentFrameIndex === -1}
          onClick={() => setCurrentFrameIndex(-1)}
          style={timelineButtonStyle(currentFrameIndex === -1, false)}
        >
          초기 상태
        </button>
        {frames.map((frame, index) => {
          const disabled = index > furthestFrameIndex
          return (
            <button
              key={frame.id || index}
              type="button"
              aria-pressed={currentFrameIndex === index}
              disabled={disabled}
              onClick={() => setCurrentFrameIndex(index)}
              style={timelineButtonStyle(currentFrameIndex === index, disabled)}
            >
              단계 {index + 1} ({frame.operationLabel || `명령 ${index + 1}`})
            </button>
          )
        })}
      </div>

      {currentFrame ? (
        <div style={{ display: 'grid', gap: '12px', padding: '22px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>직전 상태</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#cbd5e1' }}>{formatState(previousState)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', padding: '4px 10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                {currentFrame.operationLabel || '전이'}
              </span>
              <span style={{ fontSize: '20px', color: '#38bdf8' }}>➔</span>
            </div>
            <div style={{ padding: '16px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid #38bdf8', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '6px' }}>확인한 현재 상태</div>
              <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#38bdf8' }}>{formatState(currentState)}</div>
            </div>
          </div>
          {currentFrame.prompt && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.08)', color: '#bae6fd', fontSize: '14px', lineHeight: 1.5 }}>
              {currentFrame.prompt}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '22px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>현재 초기 상태</div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0' }}>{formatState(initialState)}</div>
          {nextFrame && (
            <div style={{ marginTop: '12px', color: '#fef08a', fontSize: '14px' }}>
              다음 명령 <strong>{nextFrame.operationLabel}</strong> 뒤의 상태를 먼저 예상해 보세요.
            </div>
          )}
        </div>
      )}

      {/* Choice Frame UI when nextFrame requires selecting an operation */}
      {nextFrame && nextFrame.operationOptions && (
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '10px' }}>
            🎯 {nextFrame.prompt || '다음 단계에 알맞은 명령을 선택해 보세요.'}
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {nextFrame.operationOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.35)',
                    color: isSelected ? '#38bdf8' : '#e2e8f0',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {optionFeedback && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: optionFeedback.type === 'success' ? '#34d399' : '#f87171' }}>
              {optionFeedback.text}
            </div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
        <button
          type="button"
          onClick={() => setCurrentFrameIndex((index) => Math.max(-1, index - 1))}
          disabled={currentFrameIndex === -1}
          style={{
            padding: '8px 16px',
            borderRadius: '8px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: currentFrameIndex === -1 ? '#64748b' : '#cbd5e1',
            cursor: currentFrameIndex === -1 ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          ← 이전 상태
        </button>

        <button
          type="button"
          onClick={handleRevealNext}
          disabled={!canAdvance}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            background: canAdvance ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(255, 255, 255, 0.1)',
            border: 'none',
            color: canAdvance ? '#fff' : '#64748b',
            cursor: canAdvance ? 'pointer' : 'not-allowed',
            fontWeight: 'bold',
            fontSize: '13px',
          }}
        >
          {nextFrame
            ? `${nextFrame.operationLabel || '다음 명령'} 뒤 상태 확인 ➔`
            : '핵심 규칙 확인 ➔'}
        </button>
      </div>

      {revealedRule && (
        <div style={{ marginTop: '8px', padding: '18px 22px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.45)' }}>
          <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 'bold', marginBottom: '6px' }}>
            💡 {exploreConfig.rulePrompt || '핵심 사고 규칙'}
          </div>
          <div style={{ color: '#a7f3d0', fontSize: '15px', lineHeight: 1.6, fontWeight: '500' }}>
            {exploreConfig.ruleStatement || '프로그램은 명령을 순서대로 실행하며, 각 단계의 결과가 다음 단계의 입력 상태가 됩니다.'}
          </div>
          <button
            type="button"
            onClick={handleComplete}
            style={{ marginTop: '16px', padding: '10px 18px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 'bold', fontSize: '14px' }}
          >
            규칙을 확인했습니다. 코드로 작성해 볼게요 ➔
          </button>
        </div>
      )}
    </div>
  )
}
