import { useState } from 'react'

// dict 내부 값은 문자열이든 숫자든 Python dict 리터럴 모양으로만 표시한다
// (문자열 값에 따옴표를 붙이지 않는다: {STAR: 2}).
function formatDictValue(value) {
  if (value === null || value === undefined) return 'None'
  if (Array.isArray(value)) return `[${value.join(', ')}]`
  if (typeof value === 'object') return formatPlainObject(value)
  return String(value)
}

function formatPlainObject(val) {
  // Python dict 정신 모델: {A: 1, B: 2} / 빈 dict는 {}. 표시 순서는
  // Object.entries 삽입 순서를 그대로 따른다(저작자가 작성한 순서가 곧
  // 교육적 순서).
  const entries = Object.entries(val)
  if (entries.length === 0) return '{}'
  return `{${entries.map(([key, value]) => `${key}: ${formatDictValue(value)}`).join(', ')}}`
}

function formatValue(val, displayType) {
  if (val === null || val === undefined || val === '미정' || val === '값 없음') {
    return '아직 값 없음'
  }
  if (!Array.isArray(val) && typeof val === 'object') {
    return formatPlainObject(val)
  }
  if (Array.isArray(val)) {
    // Python 자료구조의 정신 모델을 지키기 위해 list는 [a, b], set은 {a, b}
    // 로 구분해 표시한다 (빈 set은 Python 문법대로 set()).
    if (displayType === 'set') {
      return val.length > 0 ? `{${val.join(', ')}}` : 'set()'
    }
    return `[${val.join(', ')}]`
  }
  if (typeof val === 'string') return JSON.stringify(val)
  return String(val)
}

function formatStateDisplay(state, stateDisplayTypes = {}) {
  if (!state || typeof state !== 'object') return formatValue(state)
  return Object.entries(state).map(([key, val]) => {
    const isNone = val === null || val === undefined || val === '미정' || val === '값 없음'
    return (
      <span key={key} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '0 4px' }}>
        <span style={{ color: '#a5f3fc', fontFamily: 'monospace' }}>{key}</span>
        <span style={{ color: '#64748b' }}>=</span>
        {isNone ? (
          <span style={{ color: '#94a3b8', fontStyle: 'italic', background: 'rgba(255,255,255,0.06)', padding: '2px 8px', borderRadius: '4px', fontSize: '13px' }}>
            아직 값 없음
          </span>
        ) : (
          <span style={{ color: '#38bdf8', fontWeight: 'bold', fontFamily: 'monospace' }}>
            {formatValue(val, stateDisplayTypes[key])}
          </span>
        )}
      </span>
    )
  })
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
  whiteSpace: 'nowrap',
})

export default function StateTransitionLens({ kernel, onDiscoveryComplete }) {
  const exploreConfig = kernel?.modes?.explore?.lensConfig || {}
  const initialState = exploreConfig.initialState || { signal: null }
  const frames = Array.isArray(exploreConfig.frames) ? exploreConfig.frames : []
  const [currentFrameIndex, setCurrentFrameIndex] = useState(-1)
  const [furthestFrameIndex, setFurthestFrameIndex] = useState(-1)
  const [revealedRule, setRevealedRule] = useState(false)

  const currentFrame = currentFrameIndex >= 0 ? frames[currentFrameIndex] : null
  // A frame may declare its own stateBefore to start a NEW experiment (e.g. a
  // counterexample run) instead of continuing from the previous frame's result.
  const previousState = currentFrameIndex <= 0
    ? (frames[0]?.stateBefore ?? initialState)
    : (currentFrame?.stateBefore ?? frames[currentFrameIndex - 1]?.stateAfter ?? initialState)
  const currentState = currentFrame?.stateAfter || initialState
  const nextFrame = frames[currentFrameIndex + 1] || null
  const stateDisplayTypes = exploreConfig.stateDisplayTypes || {}

  const [selectedOptionId, setSelectedOptionId] = useState(null)
  const [optionFeedback, setOptionFeedback] = useState(null)
  const [choiceAttempts, setChoiceAttempts] = useState({})

  // Discovery Question state
  const [selectedDiscoveryId, setSelectedDiscoveryId] = useState(null)
  const [discoveryFeedback, setDiscoveryFeedback] = useState(null)
  const [discoveryPassed, setDiscoveryPassed] = useState(false)

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
        setOptionFeedback({
          type: 'success',
          text: opt.feedback || `정답입니다! (${opt.label})`,
        })
      } else {
        setOptionFeedback({
          type: 'error',
          text: opt.feedback || `선택한 명령 결과 상태가 목표와 다릅니다. 다시 선택해 보세요.`,
        })
      }
    }
  }

  const handleSelectDiscovery = (opt) => {
    setSelectedDiscoveryId(opt.id)
    if (opt.isCorrect) {
      setDiscoveryPassed(true)
      setRevealedRule(true)
      setDiscoveryFeedback({
        isCorrect: true,
        text: exploreConfig.discoveryQuestion?.successFeedback || '맞아요! 정확한 발견입니다.',
      })
    } else {
      setDiscoveryFeedback({
        isCorrect: false,
        text: exploreConfig.discoveryQuestion?.wrongFeedback || '변수는 새 값을 넣으면 이전 값을 덮어씁니다. 다시 골라보세요.',
      })
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
      discoveryPassed,
    })
  }

  const hasDiscovery = Boolean(exploreConfig.discoveryQuestion)
  const isAtFinalFrame = currentFrameIndex === frames.length - 1
  const canFinalize = !hasDiscovery || discoveryPassed || revealedRule

  return (
    <div style={{ display: 'grid', gap: '18px', color: '#f8fafc' }}>
      {/* 1. Intro Condition & Setup Box */}
      {exploreConfig.introContext ? (
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(8, 14, 30, 0.95))', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <div style={{ fontSize: '15px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {exploreConfig.introContext.title || '🔍 상태 변화 실험실'}
          </div>
          {exploreConfig.introContext.description && (
            <div style={{ fontSize: '14px', color: '#cbd5e1', marginBottom: '10px', lineHeight: '1.5' }}>
              {exploreConfig.introContext.description}
            </div>
          )}
          {exploreConfig.introContext.variables && Array.isArray(exploreConfig.introContext.variables) && (
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {exploreConfig.introContext.variables.map((v, i) => (
                <div key={i} style={{ padding: '6px 14px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.8)', border: '1px solid rgba(129, 140, 248, 0.35)', fontSize: '13px' }}>
                  <span style={{ color: '#94a3b8' }}>{v.label ? `${v.label}: ` : ''}</span>
                  <strong style={{ color: '#fef08a', fontFamily: 'monospace' }}>{v.name} = {String(v.value)}</strong>
                </div>
              ))}
            </div>
          )}
          {exploreConfig.introContext.guidance && (
            <div style={{ fontSize: '13px', color: '#a5f3fc', lineHeight: '1.5' }}>
              💡 {exploreConfig.introContext.guidance}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '16px 20px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
          <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '4px' }}>🔍 상태 전이 관찰 연구실</div>
          <div style={{ fontSize: '15px', color: '#e2e8f0', lineHeight: 1.5 }}>
            {exploreConfig.predictionPrompt || '다음 명령 뒤의 상태를 먼저 예상하고 결과를 확인해 보세요.'}
          </div>
        </div>
      )}

      {/* 2. Step Navigator Timeline */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        <button
          type="button"
          aria-pressed={currentFrameIndex === -1}
          onClick={() => setCurrentFrameIndex(-1)}
          style={timelineButtonStyle(currentFrameIndex === -1, false)}
        >
          {exploreConfig.initialStepTitle || '🚀 시작 (값 없음)'}
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
              {frame.stepTitle || frame.label || `단계 ${index + 1} (${frame.operationLabel || `명령 ${index + 1}`})`}
            </button>
          )
        })}
      </div>

      {/* 3. Main Stage Content */}
      {currentFrame ? (
        <div style={{ display: 'grid', gap: '14px', padding: '22px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {currentFrame.experimentReset && (
            <div style={{ padding: '8px 14px', borderRadius: '8px', background: 'rgba(251, 191, 36, 0.12)', border: '1px solid rgba(251, 191, 36, 0.45)', color: '#fde68a', fontSize: '13px', fontWeight: 'bold', textAlign: 'center' }}>
              🔄 새 실험 시작 — 이전 실행과 이어지지 않은 새로운 입력입니다
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '16px', alignItems: 'center' }}>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(255, 255, 255, 0.08)', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '6px' }}>실행 전 상태</div>
              <div style={{ fontSize: '17px', fontWeight: 'bold' }}>{formatStateDisplay(previousState, stateDisplayTypes)}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
              <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#38bdf8', padding: '4px 10px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.15)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
                {currentFrame.operationLabel || currentFrame.label || '명령 실행'}
              </span>
              <span style={{ fontSize: '20px', color: '#38bdf8' }}>➔</span>
            </div>
            <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid #38bdf8', textAlign: 'center' }}>
              <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '6px' }}>실행 후 현재 상태</div>
              <div style={{ fontSize: '17px', fontWeight: 'bold' }}>{formatStateDisplay(currentState, stateDisplayTypes)}</div>
            </div>
          </div>

          {currentFrame.codeSnippet && (
            <div style={{ background: 'rgba(15, 23, 42, 0.9)', padding: '10px 14px', borderRadius: '8px', border: '1px solid rgba(129, 140, 248, 0.3)', fontFamily: 'monospace', fontSize: '13px', color: '#fef08a' }}>
              {currentFrame.codeSnippet}
            </div>
          )}

          {currentFrame.prompt && (
            <div style={{ padding: '12px 16px', borderRadius: '8px', background: 'rgba(56, 189, 248, 0.1)', color: '#bae6fd', fontSize: '14px', lineHeight: 1.6 }}>
              💡 {currentFrame.prompt}
            </div>
          )}
        </div>
      ) : (
        <div style={{ padding: '22px', borderRadius: '12px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', textAlign: 'center' }}>
          <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
            {exploreConfig.initialStateLabel || '아직 변수에 값을 저장하지 않았습니다.'}
          </div>
          <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#e2e8f0', marginBottom: '12px' }}>
            {formatStateDisplay(initialState, stateDisplayTypes)}
          </div>
          {nextFrame && (
            <div style={{ color: '#fef08a', fontSize: '14px' }}>
              {exploreConfig.initialPrompt || `다음 명령 ${nextFrame.operationLabel || nextFrame.stepTitle} 뒤의 상태를 먼저 예상해 보세요.`}
            </div>
          )}
        </div>
      )}

      {/* 4. Choice Frame UI when nextFrame requires selecting an operation */}
      {nextFrame && nextFrame.operationOptions && (
        <div style={{ padding: '18px 20px', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.08)', border: '1px solid rgba(56, 189, 248, 0.35)', display: 'grid', gap: '10px' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '6px' }}>
            {nextFrame.choiceTitle || '🎯 다음 단계 미션: 빠진 명령 선택'}
          </div>
          <div style={{ fontSize: '14px', color: '#e2e8f0', lineHeight: '1.5' }}>
            {nextFrame.choicePrompt || nextFrame.prompt || '다음 단계에 알맞은 명령을 선택해 보세요.'}
          </div>
          {nextFrame.choiceHint && (
            <div style={{ fontSize: '13px', color: '#a5f3fc', background: 'rgba(56, 189, 248, 0.12)', padding: '8px 12px', borderRadius: '6px', borderLeft: '3px solid #38bdf8', lineHeight: '1.4' }}>
              {nextFrame.choiceHint}
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px' }}>
            {nextFrame.operationOptions.map((opt) => {
              const isSelected = selectedOptionId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectOption(opt)}
                  style={{
                    padding: '9px 18px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.2)',
                    background: isSelected ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.35)',
                    color: isSelected ? '#38bdf8' : '#e2e8f0',
                    fontWeight: 'bold',
                    fontSize: '13px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>
          {optionFeedback && (
            <div style={{ marginTop: '4px', padding: '10px 14px', borderRadius: '8px', fontSize: '13px', background: optionFeedback.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: optionFeedback.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)', color: optionFeedback.type === 'success' ? '#6ee7b7' : '#fca5a5', lineHeight: '1.5' }}>
              {optionFeedback.type === 'success' ? '✅ ' : '❌ '}
              {optionFeedback.text}
            </div>
          )}
        </div>
      )}

      {/* 5. Navigation Controls */}
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
            ? `${nextFrame.stepTitle || nextFrame.operationLabel || '다음 명령'} 확인 ➔`
            : (hasDiscovery && !discoveryPassed ? '발견 퀴즈로 이동 ➔' : '핵심 규칙 확인 ➔')}
        </button>
      </div>

      {/* 6. Discovery Question (Golden Bridge to SWAP) */}
      {hasDiscovery && isAtFinalFrame && (
        <div style={{ marginTop: '8px', padding: '18px 22px', borderRadius: '12px', background: 'linear-gradient(145deg, rgba(30, 41, 59, 0.95), rgba(15, 23, 42, 0.95))', border: '1px solid rgba(56, 189, 248, 0.4)' }}>
          <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
            {exploreConfig.discoveryQuestion.prompt}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {exploreConfig.discoveryQuestion.options.map((opt) => {
              const isSelected = selectedDiscoveryId === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => handleSelectDiscovery(opt)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: isSelected
                      ? (opt.isCorrect ? '2px solid #10b981' : '2px solid #ef4444')
                      : '1px solid rgba(255, 255, 255, 0.15)',
                    background: isSelected
                      ? (opt.isCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                      : 'rgba(0, 0, 0, 0.3)',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    cursor: 'pointer',
                    fontSize: '14px',
                    transition: 'all 0.15s',
                  }}
                >
                  {opt.isCorrect && isSelected ? '✅ ' : isSelected ? '❌ ' : '○ '}{opt.label}
                </button>
              )
            })}
          </div>
          {discoveryFeedback && (
            <div style={{ marginTop: '12px', padding: '12px 14px', borderRadius: '8px', background: discoveryFeedback.isCorrect ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', color: discoveryFeedback.isCorrect ? '#6ee7b7' : '#fca5a5', fontSize: '14px', lineHeight: 1.5 }}>
              {discoveryFeedback.text}
            </div>
          )}
        </div>
      )}

      {/* 7. Final Rule Confirmation */}
      {revealedRule && canFinalize && (
        <div style={{ marginTop: '8px', padding: '18px 22px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.45)' }}>
          <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 'bold', marginBottom: '6px' }}>
            💡 {exploreConfig.rulePrompt || '핵심 사고 규칙'}
          </div>
          <div style={{ color: '#a7f3d0', fontSize: '15px', lineHeight: 1.6, fontWeight: '500' }}>
            {exploreConfig.ruleStatement || '변수에 새 값을 대입(=)하면 이전 값은 완전히 덮어씌워져 사라지고 새 값으로 교체됩니다.'}
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
