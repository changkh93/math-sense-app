import { useState } from 'react'

export default function UnderstandingCheckMode({
  challenge,
  onSubmitUnderstanding,
  onProceedToTransfer,
}) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [isPassed, setIsPassed] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const questions = challenge?.questions || []

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

  return (
    <div style={{ padding: '24px', background: 'rgba(10, 20, 40, 0.75)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.2)', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🎯</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '19px', color: '#00f0ff' }}>
            ★★ 규칙 이해 도전 (15초 퀴즈)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#cbd5e1' }}>
            {challenge?.prompt || '상황에 따른 조건식의 참/거짓 결과를 신속하게 예측해 보세요.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
        {questions.map((q) => {
          const selected = answers[q.id]
          return (
            <div
              key={q.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 18px',
                background: 'rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              <div style={{ fontSize: '14px' }}>{q.text}</div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => handleSelect(q.id, true)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: selected === true ? '2px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.2)',
                    background: selected === true ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                    color: selected === true ? '#00f0ff' : '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  열림 (True)
                </button>
                <button
                  type="button"
                  onClick={() => handleSelect(q.id, false)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '6px',
                    border: selected === false ? '2px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.2)',
                    background: selected === false ? 'rgba(0, 240, 255, 0.25)' : 'rgba(0, 0, 0, 0.3)',
                    color: selected === false ? '#00f0ff' : '#fff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                  }}
                >
                  닫힘 (False)
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {submitted && isPassed && (
            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>
              ✨ 축하합니다! 신호 이해 별(★★)을 획득했습니다!
            </span>
          )}
          {submitted && !isPassed && (
            <span style={{ color: '#f87171', fontSize: '14px' }}>
              ⚠️ 오답이 있습니다. 스위치 조건을 다시 생각해보세요.
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
