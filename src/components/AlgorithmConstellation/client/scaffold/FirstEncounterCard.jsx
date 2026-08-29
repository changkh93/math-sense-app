import { useState } from 'react'

/**
 * FirstEncounterCard: 10-second Micro-Lesson Card for newly encountered Python Tools
 * Flow: Why -> Tiny Example -> Syntax -> 10s Prediction Check -> Return to Problem
 */
export default function FirstEncounterCard({ concept, onComplete, onDismiss }) {
  const [selectedOption, setSelectedOption] = useState(null)
  const [feedback, setFeedback] = useState(null)

  if (!concept) return null

  const isThinkingPattern = concept.kind === 'algorithm-pattern'

  const handleCheck = (opt) => {
    setSelectedOption(opt)
    if (opt === concept.predictionCheck.expected) {
      setFeedback({ ok: true, message: '🎉 정답입니다! 새로운 도구의 움직임을 파악했어요.' })
    } else {
      setFeedback({ ok: false, message: '다시 한 번 생각해 보세요. 위의 작은 예시를 참고해 볼까요?' })
    }
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.95) 0%, rgba(30, 41, 59, 0.95) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.4)',
        borderRadius: '16px',
        padding: '24px',
        color: '#f8fafc',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(56, 189, 248, 0.15)',
        marginBottom: '20px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>{isThinkingPattern ? '🧭' : '📘'}</span>
          <div>
            <span style={{ fontSize: '12px', color: '#38bdf8', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              {isThinkingPattern ? '처음 만나는 문제 해결 전략' : '처음 만나는 Python 도구'}
            </span>
            <h3 style={{ margin: '2px 0 0 0', fontSize: '18px', color: '#f8fafc', fontWeight: 'bold' }}>
              {concept.displayName}
            </h3>
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: '18px',
            }}
          >
            ✕
          </button>
        )}
      </div>

      <div style={{ background: 'rgba(56, 189, 248, 0.08)', borderRadius: '10px', padding: '12px 16px', marginBottom: '14px' }}>
        <p style={{ margin: 0, fontSize: '14px', color: '#bae6fd', lineHeight: '1.5' }}>
          <strong>💡 왜 필요할까요?</strong> {concept.why}
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>🔍 작은 움직임 예시</span>
          <code style={{ fontSize: '13px', color: '#fcd34d', fontFamily: 'monospace', whiteSpace: 'pre-wrap', display: 'block', lineHeight: '1.5' }}>{concept.tinyExample}</code>
        </div>
        <div style={{ background: 'rgba(15, 23, 42, 0.6)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: '12px', color: '#94a3b8', display: 'block', marginBottom: '4px' }}>
            {isThinkingPattern ? '💻 전략을 코드로 표현하면' : '💻 Python 표기법'}
          </span>
          <code style={{ fontSize: '13px', color: '#86efac', fontFamily: 'monospace', whiteSpace: 'pre-wrap', display: 'block', lineHeight: '1.5' }}>{concept.syntaxExample}</code>
        </div>
      </div>

      <div style={{ background: 'rgba(30, 41, 59, 0.8)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 'bold', display: 'block', marginBottom: '10px' }}>
          ⏱️ 10초 퀴즈: {concept.predictionCheck.prompt}
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '10px' }}>
          {concept.predictionCheck.options.map((opt) => (
            <button
              key={opt}
              onClick={() => handleCheck(opt)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: selectedOption === opt
                  ? opt === concept.predictionCheck.expected
                    ? '1px solid #22c55e'
                    : '1px solid #ef4444'
                  : '1px solid rgba(255, 255, 255, 0.15)',
                background: selectedOption === opt
                  ? opt === concept.predictionCheck.expected
                    ? 'rgba(34, 197, 94, 0.2)'
                    : 'rgba(239, 68, 68, 0.2)'
                  : 'rgba(255, 255, 255, 0.05)',
                color: '#f8fafc',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: '500',
                transition: 'all 0.15s ease',
              }}
            >
              {opt}
            </button>
          ))}
        </div>

        {feedback && (
          <div style={{ marginTop: '8px', fontSize: '13px', color: feedback.ok ? '#86efac' : '#fca5a5' }}>
            {feedback.message}
          </div>
        )}
      </div>

      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={() => onComplete?.(concept.conceptId)}
          disabled={!feedback?.ok}
          style={{
            background: feedback?.ok
              ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)'
              : 'rgba(148, 163, 184, 0.2)',
            color: feedback?.ok ? '#ffffff' : '#64748b',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontWeight: 'bold',
            fontSize: '14px',
            cursor: feedback?.ok ? 'pointer' : 'not-allowed',
            transition: 'all 0.2s ease',
          }}
        >
          이해 완료! 문제로 돌아가기 →
        </button>
      </div>
    </div>
  )
}
