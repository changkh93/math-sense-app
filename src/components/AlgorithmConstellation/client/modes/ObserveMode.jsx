import { useState } from 'react'

function isAnswerMatch(selected, expected) {
  if (selected === undefined || selected === null) return false
  if (typeof expected === 'boolean') return selected === expected
  if (typeof expected === 'number') return typeof selected === 'number' ? selected === expected : Number(selected) === expected
  if (typeof selected === 'string' && typeof expected === 'string') {
    return selected.trim() === expected.trim()
  }
  return JSON.stringify(selected) === JSON.stringify(expected)
}

export default function ObserveMode({
  kernel,
  shell = 'explorer',
  onCompleteMicroEvidence,
  onProceedToExplore,
  onProceedToCode,
}) {
  const shellInfo = kernel.shells?.[shell] || kernel.shells?.explorer || {}
  const truthTable = kernel.modes?.observe?.truthTable || []
  const givenRecords = kernel.modes?.observe?.givenRecords || []
  const timelineScenes = kernel.modes?.observe?.timelineScenes || []
  const isSignalBridge = kernel.world?.type === 'signal-bridge' || kernel.id === 'AC-PAT-003'

  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  const handleSelectAnswer = (qIndex, value) => {
    setAnswers((prev) => ({
      ...prev,
      [qIndex]: value,
    }))
  }

  const allAnswered = truthTable.length > 0 && truthTable.every((_, idx) => answers[idx] !== undefined)
  const isAllCorrect =
    allAnswered &&
    truthTable.every((item, idx) => isAnswerMatch(answers[idx], item.expected))

  const handleSubmit = () => {
    setSubmitted(true)
    if (isAllCorrect) {
      onCompleteMicroEvidence?.({
        type: 'observation_prediction',
        passed: true,
        answers,
      })
    }
  }

  return (
    <div style={{ padding: '24px', background: 'rgba(10, 20, 40, 0.75)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.25)', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '22px' }}>
        <span style={{ fontSize: '32px' }}>{isSignalBridge ? '⏱️' : '🚪'}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#00f0ff', fontFamily: 'monospace' }}>
            [1단계: 관찰 및 추론] {shellInfo.terms?.result ? `${shellInfo.terms.result}의 숨겨진 규칙을 찾아라` : (isSignalBridge ? '신호 다리의 개폐 규칙을 찾아라' : '숨겨진 규칙을 찾아라')}
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>
            {shellInfo.story}
          </p>
        </div>
      </div>

      {/* 1. Existing Given Records (Data Evidence) */}
      <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 30, 0.9))', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(129, 140, 248, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
          <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc' }}>
            📊 관제 기록에 남아 있는 기존 관측 데이터
          </span>
          <span style={{ fontSize: '12px', color: '#818cf8', fontFamily: 'monospace' }}>
            확인된 사실
          </span>
        </div>

        {isSignalBridge && timelineScenes.length > 0 ? (
          /* Timeline view for Pattern problem */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(80px, 1fr))', gap: '10px' }}>
            {timelineScenes.map((scene) => (
              <div
                key={scene.time}
                style={{
                  padding: '12px 8px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  background: scene.bridgeOpen ? 'rgba(0, 240, 255, 0.15)' : 'rgba(30, 41, 59, 0.6)',
                  border: scene.bridgeOpen ? '2px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: scene.bridgeOpen ? '0 0 14px rgba(0, 240, 255, 0.25)' : 'none',
                }}
              >
                <div style={{ fontSize: '13px', fontWeight: 'bold', color: scene.bridgeOpen ? '#00f0ff' : '#94a3b8', fontFamily: 'monospace' }}>
                  {scene.time}초
                </div>
                <div style={{ fontSize: '20px', margin: '4px 0' }}>
                  {scene.bridgeOpen ? '🔓' : '❄️'}
                </div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: scene.bridgeOpen ? '#38bdf8' : '#64748b' }}>
                  {scene.bridgeOpen ? (shellInfo.terms?.choiceTrue || '열림') : (shellInfo.terms?.choiceFalse || '닫힘')}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Given record cards for Condition problem */
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
            {givenRecords.map((rec, idx) => (
              <div
                key={idx}
                style={{
                  padding: '14px 18px',
                  background: rec.result ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.08)',
                  border: rec.result ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid rgba(239, 68, 68, 0.3)',
                  borderRadius: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                }}
              >
                <div>
                  <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }}>{rec.label}</div>
                  <div style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '600' }}>{rec.text}</div>
                </div>
                <div style={{ fontSize: '22px' }}>{rec.result ? '🔓' : '🔒'}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 2. Prediction Quiz (Deduce Remaining Conditions) */}
      <div style={{ background: 'rgba(0, 0, 0, 0.45)', borderRadius: '14px', padding: '20px', marginBottom: '24px', border: '1px solid rgba(255, 255, 255, 0.12)' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', marginBottom: '16px', color: '#fef08a' }}>
          💡 {isSignalBridge ? '위 관측 데이터를 바탕으로 다음 시간의 신호 상태를 예측해 보세요' : '위 두 기록을 바탕으로 남은 관제 기록의 결과를 추론해 보세요'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {truthTable.map((item, idx) => {
            const selected = answers[idx]
            const isCorrect = submitted && isAnswerMatch(selected, item.expected)
            const isWrong = submitted && selected !== undefined && !isAnswerMatch(selected, item.expected)
            const answerSchema = item.answer || (typeof item.expected === 'boolean' ? { type: 'boolean-choice' } : { type: 'single-choice', options: [item.expected] })

            return (
              <div
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px',
                  padding: '16px 20px',
                  background: isCorrect ? 'rgba(16, 185, 129, 0.15)' : isWrong ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '10px',
                  border: isCorrect ? '1px solid #10b981' : isWrong ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.12)',
                }}
              >
                <div style={{ fontSize: '15px', color: '#f8fafc', fontWeight: '500', flex: '1 1 240px' }}>
                  {item.prompt}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {answerSchema.type === 'boolean-choice' ? (
                    <>
                      <button
                        type="button"
                        onClick={() => handleSelectAnswer(idx, true)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: selected === true ? '2px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.2)',
                          background: selected === true ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                          color: selected === true ? '#00f0ff' : '#fff',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {answerSchema.trueLabel || shellInfo.terms?.choiceTrue || 'True'}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSelectAnswer(idx, false)}
                        style={{
                          padding: '8px 18px',
                          borderRadius: '8px',
                          border: selected === false ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.2)',
                          background: selected === false ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                          color: selected === false ? '#f87171' : '#fff',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          fontSize: '14px',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        {answerSchema.falseLabel || shellInfo.terms?.choiceFalse || 'False'}
                      </button>
                    </>
                  ) : answerSchema.options && Array.isArray(answerSchema.options) ? (
                    answerSchema.options.map((opt, optIdx) => {
                      const isOptionSelected = isAnswerMatch(selected, opt)
                      return (
                        <button
                          key={optIdx}
                          type="button"
                          onClick={() => handleSelectAnswer(idx, opt)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '8px',
                            border: isOptionSelected ? '2px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.2)',
                            background: isOptionSelected ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                            color: isOptionSelected ? '#00f0ff' : '#cbd5e1',
                            fontWeight: 'bold',
                            cursor: 'pointer',
                            fontSize: '13px',
                            transition: 'all 0.15s ease',
                          }}
                        >
                          {String(opt)}
                        </button>
                      )
                    })
                  ) : (
                    <input
                      type="number"
                      value={selected !== undefined ? selected : ''}
                      onChange={(e) => handleSelectAnswer(idx, e.target.value === '' ? undefined : Number(e.target.value))}
                      placeholder="답안 입력"
                      style={{
                        padding: '8px 14px',
                        borderRadius: '8px',
                        border: '1px solid rgba(0, 240, 255, 0.5)',
                        background: 'rgba(0, 0, 0, 0.5)',
                        color: '#00f0ff',
                        fontWeight: 'bold',
                        fontSize: '14px',
                        width: '100px',
                      }}
                    />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px' }}>
        <div>
          {submitted && isAllCorrect && (
            <span style={{ color: '#10b981', fontSize: '15px', fontWeight: 'bold' }}>
              ✨ 정확한 관찰과 추론입니다! 이제 직접 조작하며 모든 경우를 확인해 보세요.
            </span>
          )}
          {submitted && !isAllCorrect && (
            <span style={{ color: '#f87171', fontSize: '15px' }}>
              ⚠️ 예상과 다른 항목이 있습니다. 기존 관측 기록과 비교하며 다시 생각해 보세요.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!allAnswered}
            style={{
              padding: '12px 22px',
              background: allAnswered ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(255, 255, 255, 0.1)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              fontSize: '14px',
              cursor: allAnswered ? 'pointer' : 'not-allowed',
            }}
          >
            예측 제출 및 확인
          </button>

          {isAllCorrect && onProceedToExplore && (
            <button
              type="button"
              onClick={onProceedToExplore}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
              }}
            >
              2단계: 대화형 실험실로 이동 ➔
            </button>
          )}

          {onProceedToCode && (
            <button
              type="button"
              onClick={onProceedToCode}
              style={{
                padding: '10px 16px',
                background: 'transparent',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'rgba(255, 255, 255, 0.6)',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              코드 모드로 건너뛰기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
