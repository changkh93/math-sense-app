import React from 'react'

export default function LumiTacticalInspector({ tacticalState = null }) {
  if (!tacticalState || !tacticalState.entities) return null
  const entities = Object.values(tacticalState.entities)
  if (entities.length === 0) {
    return <p className="python-lab__empty-hint">감지된 전술 Entity가 없습니다. 코드를 실행하세요.</p>
  }

  const activeId = tacticalState.activeTargetEntityId

  return (
    <div className="lumi-tactical-inspector" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        <span>전술 개체 상태: {tacticalState.restoredCount} / {entities.length} 복구</span>
        {tacticalState.allRestored && <span style={{ color: '#55f1c8', fontWeight: 700 }}>✓ 전체 편대 정화 완료</span>}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
        {entities.map((ent) => {
          const isTargeted = activeId === ent.entityId
          const isRestored = ent.state === 'RESTORED'
          return (
            <div
              key={ent.entityId}
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: isRestored ? '1px solid #10b981' : isTargeted ? '1px solid #facc15' : '1px solid #334155',
                borderRadius: '6px',
                padding: '8px',
                fontSize: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: isRestored ? '#55f1c8' : '#f8fafc' }}>
                <span>{ent.name}</span>
                <span>{isRestored ? 'RESTORED' : isTargeted ? 'TARGET' : 'DETECTED'}</span>
              </div>
              <div style={{ marginTop: '4px', color: '#94a3b8' }}>
                오염도(corruption): <strong style={{ color: isRestored ? '#55f1c8' : '#f87171' }}>{ent.corruption}</strong>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
