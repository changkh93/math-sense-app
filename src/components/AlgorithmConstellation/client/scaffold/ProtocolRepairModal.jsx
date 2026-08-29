import { useState } from 'react'

export default function ProtocolRepairModal({
  isOpen,
  syntaxError,
  onCompleteRepair,
  onClose,
}) {
  const [selectedFix, setSelectedFix] = useState(null)
  const [submitted, setSubmitted] = useState(false)

  if (!isOpen) return null

  const repairExercises = [
    {
      id: 'fix_colon',
      problem: 'def check_gate(s1, s2)\n    return s1 and s2',
      question: '이 코드에서 문법 오류가 발생한 원인은 무엇일까요?',
      options: [
        { id: 'opt1', text: '함수 선언 끝에 콜론(:)이 누락되었습니다.', isCorrect: true },
        { id: 'opt2', text: 'return 앞에 들여쓰기가 잘못되었습니다.', isCorrect: false },
      ],
    },
  ]

  const currentExercise = repairExercises[0]

  const handleSubmit = () => {
    setSubmitted(true)
    const isCorrect = currentExercise.options.find((o) => o.id === selectedFix)?.isCorrect
    if (isCorrect) {
      onCompleteRepair?.({ repairKind: currentExercise.id })
    }
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
          maxWidth: '520px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          borderRadius: '16px',
          padding: '24px',
          color: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '22px' }}>🔧</span>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#fbbf24' }}>
              문법 퀵 수리 (Protocol Repair)
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

        <p style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '16px', lineHeight: '1.5' }}>
          알고리즘 사고력 점수 차감 없이, 2분 만에 Python 문법 규칙을 교정하고 원래 문제로 복귀합니다.
        </p>

        {syntaxError && (
          <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', fontSize: '12px', color: '#fca5a5', marginBottom: '16px' }}>
            오류 메시지: {syntaxError}
          </div>
        )}

        <div style={{ background: 'rgba(0, 0, 0, 0.5)', borderRadius: '10px', padding: '14px', marginBottom: '20px' }}>
          <pre style={{ margin: 0, color: '#fde047', fontFamily: 'monospace', fontSize: '13px', marginBottom: '12px' }}>
            {currentExercise.problem}
          </pre>
          <div style={{ fontSize: '13px', fontWeight: 'bold', marginBottom: '10px' }}>
            {currentExercise.question}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {currentExercise.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setSelectedFix(opt.id)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  border: selectedFix === opt.id ? '2px solid #fbbf24' : '1px solid rgba(255, 255, 255, 0.15)',
                  background: selectedFix === opt.id ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                  color: selectedFix === opt.id ? '#fbbf24' : '#fff',
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
              >
                {opt.text}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          {!submitted ? (
            <button
              type="button"
              disabled={!selectedFix}
              onClick={handleSubmit}
              style={{
                padding: '10px 20px',
                background: selectedFix ? 'linear-gradient(135deg, #f59e0b, #d97706)' : 'rgba(255, 255, 255, 0.1)',
                color: selectedFix ? '#000' : 'rgba(255, 255, 255, 0.4)',
                fontWeight: 'bold',
                border: 'none',
                borderRadius: '8px',
                cursor: selectedFix ? 'pointer' : 'not-allowed',
              }}
            >
              수리 완료 및 코드 복귀
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
              내 코드로 돌아가기
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
