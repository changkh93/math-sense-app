import { useState } from 'react'
import AlgorithmPythonEditor from '../editor/AlgorithmPythonEditor.jsx'

export default function TransferChallengeMode({
  transferChallenge,
  challengeToken,
  onSubmitTransfer,
  onCompleteMission,
}) {
  const starterCode =
    transferChallenge?.starterCode ||
    '# 전이 문제를 불러오지 못했습니다. 이전 화면에서 다시 시도해 주세요.\n'

  const [code, setCode] = useState(starterCode)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState(null)

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

  return (
    <div style={{ padding: '24px', background: 'rgba(10, 20, 40, 0.75)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.2)', color: '#fff' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
        <span style={{ fontSize: '28px' }}>🚀</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '19px', color: '#00f0ff' }}>
            ★★★ 새로운 상황 적용 (Fresh Transfer)
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '14px', color: '#cbd5e1' }}>
            {transferChallenge?.description || '새로운 상황에서도 발견한 규칙을 동일하게 적용할 수 있는지 확인합니다.'}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ fontSize: '13px', color: '#38bdf8', fontWeight: 'bold', marginBottom: '8px' }}>
          작성할 함수: <code style={{ color: '#fff' }}>{transferChallenge?.entryFunction || '불러오는 중'}</code>
        </div>
        <div style={{ marginBottom: '12px' }}>
          <AlgorithmPythonEditor
            value={code}
            onChange={(newCode) => setCode(newCode)}
            minHeight="180px"
          />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          {result?.passed && (
            <span style={{ color: '#10b981', fontWeight: 'bold', fontSize: '15px' }}>
              🌟 축하합니다! 전이 문제 검증 통과 — ★★★ 3스타 달성!
            </span>
          )}
          {result && !result.passed && (
            <span style={{ color: '#f87171', fontSize: '14px' }}>
              ⚠️ 전이 문제 테스트를 통과하지 못했습니다. 조건을 다시 점검해보세요.
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
                cursor: submitting ? 'wait' : 'pointer',
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
                cursor: 'pointer',
              }}
            >
              🏆 임무 완료 화면으로 이동
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
