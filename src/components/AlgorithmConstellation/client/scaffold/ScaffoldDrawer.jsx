import { useEffect, useState } from 'react'
import { getScaffoldByLevel } from './scaffoldGraph.js'

export default function ScaffoldDrawer({
  isOpen,
  initialLevel = 1,
  problemId = 'AC-COND-001',
  onApplySnippet,
  onSelectScaffold,
  onClose,
}) {
  const [currentLevel, setCurrentLevel] = useState(initialLevel)
  const [pendingLevel, setPendingLevel] = useState(null)
  const [accessError, setAccessError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setCurrentLevel(initialLevel)
      setAccessError('')
    }
  }, [initialLevel, isOpen])

  if (!isOpen) return null

  const scaffold = getScaffoldByLevel(currentLevel, problemId)

  const handleLevelChange = async (lvl) => {
    if (lvl === currentLevel || pendingLevel !== null) return
    setPendingLevel(lvl)
    setAccessError('')
    try {
      await onSelectScaffold?.(lvl)
      setCurrentLevel(lvl)
    } catch {
      setAccessError('지원 기록을 확인하지 못해 내용을 열지 않았어요. 연결을 확인한 뒤 다시 시도해 주세요.')
    } finally {
      setPendingLevel(null)
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
        zIndex: 9998,
        padding: '20px',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '560px',
          backgroundColor: '#0f172a',
          border: '1px solid rgba(0, 240, 255, 0.4)',
          borderRadius: '16px',
          padding: '24px',
          color: '#fff',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '20px' }}>🧭</span>
            <h3 style={{ margin: 0, fontSize: '18px', color: '#00f0ff' }}>
              항로 지원 가이드 (Scaffold)
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

        {/* Level Selector Tabs */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', overflowX: 'auto', paddingBottom: '4px' }}>
          {[
            { lvl: 1, label: 'S1 조건' },
            { lvl: 2, label: 'S2 실험' },
            { lvl: 3, label: 'S3 질문' },
            { lvl: 4, label: 'S4 절차' },
            { lvl: 5, label: 'S5 부분코드' },
            { lvl: 6, label: 'Rescue 해설' },
          ].map((tab) => (
            <button
              key={tab.lvl}
              type="button"
              onClick={() => handleLevelChange(tab.lvl)}
              disabled={pendingLevel !== null}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: currentLevel === tab.lvl ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                background: currentLevel === tab.lvl ? 'rgba(0, 240, 255, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                color: currentLevel === tab.lvl ? '#00f0ff' : 'rgba(255, 255, 255, 0.7)',
                fontSize: '12px',
                fontWeight: currentLevel === tab.lvl ? 'bold' : 'normal',
                cursor: pendingLevel !== null ? 'wait' : 'pointer',
                whiteSpace: 'nowrap',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {accessError && (
          <div role="alert" style={{ marginBottom: '12px', padding: '10px', borderRadius: '8px', background: 'rgba(239, 68, 68, 0.14)', color: '#fecaca', fontSize: '12px' }}>
            {accessError}
          </div>
        )}

        {/* Level Content Area */}
        {scaffold && (
          <div style={{ background: 'rgba(0, 0, 0, 0.5)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#38bdf8', marginBottom: '6px' }}>
              {scaffold.title}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '12px' }}>
              {scaffold.description}
            </div>

            {scaffold.content && (
              <div style={{ fontSize: '14px', lineHeight: '1.6', color: '#e2e8f0', background: 'rgba(255, 255, 255, 0.05)', padding: '12px', borderRadius: '8px', whiteSpace: 'pre-line' }}>
                {scaffold.content}
              </div>
            )}

            {scaffold.parsonsBlocks && (
              <ol style={{ margin: '12px 0 0', paddingLeft: '28px', color: '#dbeafe', fontSize: '13px', lineHeight: '1.8' }}>
                {scaffold.parsonsBlocks.map((block) => <li key={block}>{block}</li>)}
              </ol>
            )}

            {scaffold.starterSnippet && (
              <div style={{ marginTop: '12px' }}>
                <pre style={{ margin: 0, padding: '12px', background: '#030712', borderRadius: '8px', color: '#a7f3d0', fontSize: '13px', fontFamily: 'monospace' }}>
                  {scaffold.starterSnippet}
                </pre>
                {onApplySnippet && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplySnippet(scaffold.starterSnippet)
                      onClose()
                    }}
                    style={{
                      marginTop: '10px',
                      padding: '8px 14px',
                      background: '#0284c7',
                      border: 'none',
                      borderRadius: '6px',
                      color: '#fff',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      cursor: 'pointer',
                    }}
                  >
                    에디터에 부분 코드 적용하기
                  </button>
                )}
              </div>
            )}

            {scaffold.solutionExplanation && (
              <div style={{ fontSize: '13px', lineHeight: '1.6', color: '#fef08a', background: 'rgba(234, 179, 8, 0.1)', border: '1px solid #eab308', padding: '12px', borderRadius: '8px' }}>
                {scaffold.solutionExplanation}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '10px 18px',
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              color: '#fff',
              cursor: 'pointer',
            }}
          >
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}
