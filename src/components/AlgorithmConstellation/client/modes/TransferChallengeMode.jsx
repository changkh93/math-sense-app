import { useState, useEffect } from 'react'
import AlgorithmPythonEditor from '../editor/AlgorithmPythonEditor.jsx'

export default function TransferChallengeMode({
  transferChallenge,
  challengeToken,
  onSubmitTransfer,
  onCompleteMission,
}) {
  const starterCode =
    transferChallenge?.starterCode ||
    (transferChallenge?.entryFunction
      ? `def ${transferChallenge.entryFunction}():\n    # 여기에 전이 코드를 작성하세요.\n    pass\n`
      : '# 전이 미션을 준비 중입니다.\n')

  const [code, setCode] = useState(starterCode)

  useEffect(() => {
    if (transferChallenge?.starterCode) {
      setCode((prev) => (!prev || prev === '# 전이 미션을 준비 중입니다.\n' ? transferChallenge.starterCode : prev))
    }
  }, [transferChallenge?.starterCode])
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

  // Thought check state
  const [selectedThoughtId, setSelectedThoughtId] = useState(null)
  const [thoughtFeedback, setThoughtFeedback] = useState(null)

  // Authored kernels store the thought check as
  // { question, options: [{ value, label }], expected } while older UI code
  // expected { prompt, options: [{ id, label, isCorrect }], feedback }. Read
  // both shapes so every published kernel renders and grades correctly.
  const thoughtCheckPrompt = transferChallenge?.thoughtCheck?.prompt || transferChallenge?.thoughtCheck?.question
  const resolveThoughtOptionId = (opt) => opt.id ?? opt.value
  const isThoughtOptionCorrect = (opt) => {
    if (opt.isCorrect !== undefined) return opt.isCorrect
    const expected = transferChallenge?.thoughtCheck?.expected
    return expected !== undefined && resolveThoughtOptionId(opt) === expected
  }

  const handleSelectThought = (opt) => {
    setSelectedThoughtId(resolveThoughtOptionId(opt))
    if (isThoughtOptionCorrect(opt)) {
      setThoughtFeedback(transferChallenge?.thoughtCheck?.feedback || '맞아요! 정확한 발견이에요.')
    } else {
      setThoughtFeedback('아직 아닙니다. 전략 카드의 절차를 한 단계씩 따라가며 다시 생각해 보세요.')
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      const res = await onSubmitTransfer?.({
        challengeToken,
        transferCode: code,
      })
      setResult(res)
    } finally {
      setSubmitting(false)
    }
  }

  const contextCard = transferChallenge?.contextCard
  const thoughtCheck = transferChallenge?.thoughtCheck

  return (
    <div style={{ padding: '24px', background: 'rgba(10, 20, 40, 0.85)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.25)', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '18px' }}>
        <span style={{ fontSize: '32px' }}>🚀</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#00f0ff', fontFamily: 'monospace' }}>
            ★★★ 새로운 상황 적용 (Fresh Transfer) — {transferChallenge?.title || '관제소 재고 보정'}
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6' }}>
            {transferChallenge?.description || '앞에서 발견한 원리를 완전히 새로운 상황에 스스로 적용해 보세요.'}
          </p>
        </div>
      </div>

      {/* Context Card / Flow Demonstration */}
      {contextCard && (
        <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.95), rgba(8, 14, 30, 0.95))', borderRadius: '12px', padding: '16px 20px', marginBottom: '18px', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
          <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '10px' }}>
            {contextCard.title || '📋 탐사 상황 분석'}
          </div>
          {contextCard.strategyGuide && (
            <div style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: 1.6 }}>
              {contextCard.strategyGuide}
            </div>
          )}
          {contextCard.steps && Array.isArray(contextCard.steps) && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr)', gap: '10px' }}>
              {contextCard.steps.map((step, idx) => (
                <div key={idx} style={{ padding: '10px 14px', borderRadius: '8px', background: 'rgba(30, 41, 59, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                  <div style={{ fontSize: '11px', color: '#94a3b8', marginBottom: '4px' }}>{step.label}</div>
                  <div style={{ fontSize: '13px', fontWeight: 'bold', color: '#fef08a', fontFamily: 'monospace' }}>{step.text}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 10-Second Interactive Scaffold Thought Check */}
      {thoughtCheck && (
        <div style={{ background: 'rgba(30, 41, 59, 0.8)', borderRadius: '12px', padding: '16px 20px', marginBottom: '18px', border: '1px solid rgba(129, 140, 248, 0.3)' }}>
          <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fef08a', marginBottom: '10px' }}>
            💡 사고 점검: {thoughtCheckPrompt}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {thoughtCheck.options.map((opt) => {
              const optionId = resolveThoughtOptionId(opt)
              const optionCorrect = isThoughtOptionCorrect(opt)
              const isSelected = selectedThoughtId === optionId
              return (
                <button
                  key={optionId}
                  type="button"
                  onClick={() => handleSelectThought(opt)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 14px',
                    borderRadius: '8px',
                    border: isSelected
                      ? (optionCorrect ? '2px solid #10b981' : '2px solid #ef4444')
                      : '1px solid rgba(255, 255, 255, 0.15)',
                    background: isSelected
                      ? (optionCorrect ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)')
                      : 'rgba(0, 0, 0, 0.3)',
                    color: isSelected ? '#fff' : '#cbd5e1',
                    fontWeight: isSelected ? 'bold' : 'normal',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  {optionCorrect && isSelected ? '✅ ' : isSelected ? '❌ ' : '○ '}{opt.label}
                </button>
              )
            })}
          </div>
          {thoughtFeedback && (
            <div style={{ marginTop: '10px', fontSize: '13px', color: '#6ee7b7', lineHeight: '1.5' }}>
              {thoughtFeedback}
            </div>
          )}
        </div>
      )}

      {/* Editor Section */}
      <div style={{ marginBottom: '18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <span style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold' }}>
            작성할 함수: <code style={{ color: '#fef08a', background: 'rgba(0,0,0,0.4)', padding: '2px 8px', borderRadius: '4px' }}>{transferChallenge?.entryFunction || '함수 작성'}</code>
          </span>
          <span style={{ fontSize: '12px', color: '#94a3b8' }}>
            💡 발견한 상태 덮어쓰기 원리를 적용하여 함수를 완성하세요.
          </span>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <AlgorithmPythonEditor
            value={code}
            onChange={(newCode) => setCode(newCode)}
            minHeight="180px"
          />
        </div>
      </div>

      {/* Action and Result */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          {result?.passed && (
            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>
              🌟 축하합니다! 새로운 상황 전이 성공 — ★★★ 3스타 달성!
            </span>
          )}
          {result && !result.passed && (
            <span style={{ color: '#f87171', fontSize: '14px' }}>
              ⚠️ 전이 문제 테스트를 통과하지 못했습니다. 상태 갱신 순서와 대입값을 점검해 보세요.
            </span>
          )}
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          {!result?.passed ? (
            <button
              type="button"
              disabled={submitting}
              onClick={handleSubmit}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: submitting ? 'wait' : 'pointer',
                boxShadow: '0 0 16px rgba(16, 185, 129, 0.3)',
              }}
            >
              {submitting ? '채점 중...' : '★★★ 전이 코드 최종 제출'}
            </button>
          ) : (
            <button
              type="button"
              onClick={onCompleteMission}
              style={{
                padding: '12px 24px',
                background: 'linear-gradient(135deg, #fbbf24, #d97706)',
                color: '#000',
                border: 'none',
                borderRadius: '8px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: 'pointer',
                boxShadow: '0 0 16px rgba(251, 191, 36, 0.4)',
              }}
            >
              🌌 탐사 완수 화면으로 이동 ➔
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
