import { useState } from 'react'

export default function UnderstandingCheckMode({
  challenge,
  code,
  onSubmitUnderstanding,
  onProceedToTransfer,
}) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isPassed, setIsPassed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const questions = challenge?.questions || []
  const displayCode = challenge?.codeSnippet || code

  const handleSelect = (qid, val) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }))
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined)

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await onSubmitUnderstanding?.({
        challengeId: challenge?.challengeId,
        answers,
      })
      setSubmitted(true)
      setIsPassed(Boolean(res?.passed))
    } finally {
      setSubmitting(false)
    }
  }

  const defaultBooleanOptions = [
    { value: 'true', label: 'True (참)' },
    { value: 'false', label: 'False (거짓)' },
  ]

  return (
    <div style={{ padding: '24px', background: 'rgba(10, 20, 40, 0.75)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.2)', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🎯</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '19px', color: '#00f0ff' }}>
            {challenge?.title || '★★ 실행 흐름 이해하기'}
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#cbd5e1' }}>
            {challenge?.prompt || '앞 명령의 결과가 다음 명령에 어떻게 이어지는지 확인해 보세요.'}
          </p>
        </div>
      </div>

      {/* Code Snippet Box if available */}
      {displayCode && (
        <div style={{ background: 'rgba(15, 23, 42, 0.85)', padding: '14px 18px', borderRadius: '10px', marginBottom: '20px', border: '1px solid rgba(0, 240, 255, 0.2)' }}>
          <div style={{ fontSize: '12px', color: '#38bdf8', marginBottom: '6px', fontWeight: 'bold' }}>
            {challenge?.codeSnippet ? '📋 탐사 기준 알고리즘 (단계별 실행 흐름):' : '📋 작성한 코드 살펴보기:'}
          </div>
          <pre style={{ margin: 0, fontFamily: 'monospace', fontSize: '13px', color: '#fef08a', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
            {displayCode}
          </pre>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '24px' }}>
        {questions.map((q) => {
          const selected = answers[q.id]
          const options = q.options && q.options.length > 0 ? q.options : defaultBooleanOptions

          return (
            <div
              key={q.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px',
                padding: '16px 18px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '10px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ fontSize: '15px', fontWeight: '500', flex: '1 1 240px' }}>{q.text}</div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {options.map((opt, optIdx) => {
                  const optVal = typeof opt === 'object' && opt !== null ? opt.value : String(opt)
                  const optLabel = typeof opt === 'object' && opt !== null ? (opt.label || opt.value) : String(opt)
                  const isSelected = selected !== undefined && String(selected) === String(optVal)

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelect(q.id, optVal)}
                      style={{
                        padding: '8px 16px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.2)',
                        background: isSelected ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                        color: isSelected ? '#00f0ff' : '#cbd5e1',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        fontSize: '14px',
                        transition: 'all 0.15s',
                      }}
                    >
                      {optLabel}
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          {submitted && isPassed && (
            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>
              ✨ 축하합니다! 규칙 이해 별(★★)을 획득했습니다!
            </span>
          )}
          {submitted && !isPassed && (
            <span style={{ color: '#f87171', fontSize: '14px' }}>
              ⚠️ 오답이 있습니다. 상태 변화와 규칙을 다시 확인해 보세요.
            </span>
          )}
        </div>

        <div>
          {!submitted || !isPassed ? (
            <button
              type="button"
              disabled={!allAnswered || submitting}
              onClick={handleSubmit}
              style={{
                padding: '10px 20px',
                background: allAnswered ? 'linear-gradient(135deg, #0284c7, #0369a1)' : 'rgba(255, 255, 255, 0.1)',
                color: allAnswered ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: allAnswered ? 'pointer' : 'not-allowed',
              }}
            >
              {submitting ? '제출 중...' : '이해 확인 제출'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onProceedToTransfer}
              style={{
                padding: '10px 22px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ★★★ Fresh Transfer 도전하기 ➔
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
