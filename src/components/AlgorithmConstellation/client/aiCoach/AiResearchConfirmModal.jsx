import { useState } from 'react'

export default function AiResearchConfirmModal({
  isOpen,
  promptText,
  onConfirmCopy,
  onClose,
}) {
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  if (!isOpen) return null

  const handleCopy = async () => {
    setLoading(true)
    setError(null)
    try {
      if (!navigator.clipboard?.writeText) {
        throw new Error('이 브라우저에서는 안전한 클립보드 복사를 사용할 수 없습니다.')
      }
      // Server assistance record MUST succeed before unlocking clipboard copy
      if (onConfirmCopy) {
        await onConfirmCopy()
      }
      await navigator.clipboard.writeText(promptText)
      setCopied(true)
      setTimeout(() => {
        onClose()
        setCopied(false)
      }, 1200)
    } catch (err) {
      setError(err.message || '서버 통신에 실패하여 프롬프트를 복사할 수 없습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
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
          border: '1px solid rgba(168, 85, 247, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          color: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <h3 style={{ margin: 0, fontSize: '18px', color: '#c084fc' }}>
            AI 사고 연구 모드 전환 안내
          </h3>
        </div>

        <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: '10px', padding: '14px', marginBottom: '18px', fontSize: '13px', lineHeight: '1.6', color: '#e2e8f0' }}>
          <div>✨ <strong>기본 탐사 보상(광석)은 그대로 유지됩니다.</strong></div>
          <div>⚠️ 이번 시도는 <strong>'AI 연구 모드'</strong>로 전환되어 랭킹과 마스터리 인증이 보류됩니다.</div>
          <div>🔄 <strong>독립 귀환(24시간 뒤)</strong>에 스스로 다시 해결하면 완전한 마스터리가 인정됩니다.</div>
        </div>

        {error && (
          <div style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid #ef4444', borderRadius: '8px', padding: '10px', color: '#fca5a5', fontSize: '13px', marginBottom: '14px' }}>
            ⚠️ {error}
          </div>
        )}

        <div style={{ marginBottom: '16px', padding: '12px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.35)', color: 'rgba(255, 255, 255, 0.72)', fontSize: '13px', lineHeight: 1.6 }}>
          프롬프트에는 현재 작성한 코드와 공개 실행 증거만 포함됩니다. 아래 버튼을 누르면 서버에 AI 도움 사용이 먼저 기록된 뒤 클립보드에 복사됩니다.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            disabled={loading}
            onClick={onClose}
            style={{
              padding: '10px 16px',
              backgroundColor: 'transparent',
              color: 'rgba(255, 255, 255, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={handleCopy}
            style={{
              padding: '10px 20px',
              backgroundColor: copied ? '#10b981' : '#9333ea',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: loading ? 'wait' : 'pointer',
            }}
          >
            {loading ? '서버 기록 중...' : copied ? '✅ 복사 완료!' : '프롬프트 복사하고 연구 시작'}
          </button>
        </div>
      </div>
    </div>
  )
}
