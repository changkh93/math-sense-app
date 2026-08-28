import { useState } from 'react'

export default function DiagnosticMissionModal({
  isOpen,
  diagnosis,
  onCompleteDiagnostic,
  onClose,
}) {
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)
  const [conclusion, setConclusion] = useState(null)

  if (!isOpen || !diagnosis) return null

  // Generate 2 contrasting diagnostic questions based on current candidate
  const questions = [
    {
      id: 'q1',
      prompt: '스위치 1 = ON (True), 스위치 2 = OFF (False) 일 때 게이트는 열려야 할까요?',
      options: [
        { label: '열림 (True)', value: true },
        { label: '닫힘 (False)', value: false },
      ],
      correctValue: false,
    },
    {
      id: 'q2',
      prompt: '스위치 1 = OFF (False), 스위치 2 = ON (True) 일 때 게이트는 열려야 할까요?',
      options: [
        { label: '열림 (True)', value: true },
        { label: '닫힘 (False)', value: false },
      ],
      correctValue: false,
    },
  ]

  const handleSelect = (qid, val) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }))
  }

  const allAnswered = questions.every((q) => answers[q.id] !== undefined)

  const handleSubmit = () => {
    setSubmitted(true)
    const isQ1Correct = answers.q1 === false
    const isQ2Correct = answers.q2 === false

    if (isQ1Correct && isQ2Correct) {
      setConclusion({
        type: 'UNDERSTOOD_RULES',
        text: '규칙은 정확히 이해하고 계십니다! Python 코드에서 `and` 연산자를 사용하여 두 조건이 동시에 만족하도록 수정해 보세요.',
      })
    } else {
      setConclusion({
        type: 'RULE_CONFUSION',
        text: '스위치 하나만 켜졌을 때는 게이트가 열리지 않아야 합니다. 두 스위치가 "동시에 모두" 켜져야만 열립니다.',
      })
    }
    onCompleteDiagnostic?.({ answers, isUnderstood: isQ1Correct && isQ2Correct })
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'grid',
        placeItems: 'center',
        zIndex: 9999,
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '540px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(59, 130, 246, 0.5)',
          borderRadius: '16px',
          padding: '24px',
          color: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '24px' }}>🔬</span>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#60a5fa' }}>
              15초 미니 진단 미션: {diagnosis.title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255, 255, 255, 0.5)',
              fontSize: '18px',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '20px', lineHeight: '1.5' }}>
          막힌 원인을 정확히 구분하기 위해 아래 두 상황의 결과를 선택해 보세요.
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
          {questions.map((q, idx) => (
            <div key={q.id} style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
                Q{idx + 1}. {q.prompt}
              </div>
              <div style={{ display: 'flex', gap: '10px' }}>
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt.value
                  return (
                    <button
                      key={String(opt.value)}
                      type="button"
                      onClick={() => handleSelect(q.id, opt.value)}
                      style={{
                        flex: 1,
                        padding: '8px 14px',
                        borderRadius: '6px',
                        border: isSelected ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.2)',
                        background: isSelected ? 'rgba(59, 130, 246, 0.3)' : 'rgba(0, 0, 0, 0.3)',
                        color: isSelected ? '#93c5fd' : '#fff',
                        fontWeight: isSelected ? 'bold' : 'normal',
                        fontSize: '13px',
                        cursor: 'pointer',
                      }}
                    >
                      {opt.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {conclusion && (
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', color: '#a7f3d0', fontSize: '13px', lineHeight: '1.6', marginBottom: '20px' }}>
            💡 <strong>진단 분석 결과:</strong> {conclusion.text}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {!submitted ? (
            <button
              type="button"
              disabled={!allAnswered}
              onClick={handleSubmit}
              style={{
                padding: '10px 20px',
                background: allAnswered ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'rgba(255, 255, 255, 0.1)',
                color: allAnswered ? '#fff' : 'rgba(255, 255, 255, 0.4)',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: allAnswered ? 'pointer' : 'not-allowed',
              }}
            >
              진단 결과 확인
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '10px 20px',
                background: '#10b981',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              확인하고 코드로 돌아가기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
