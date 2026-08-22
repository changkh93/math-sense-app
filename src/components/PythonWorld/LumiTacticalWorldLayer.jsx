import React from 'react'

export default function LumiTacticalWorldLayer({
  tacticalState = null,
  width = 8,
  height = 5,
}) {
  if (!tacticalState || !tacticalState.entities) return null
  const entities = Object.values(tacticalState.entities)
  if (entities.length === 0) return null

  const activeId = tacticalState.activeTargetEntityId

  return (
    <div className="lumi-tactical-layer" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 7 }}>
      {entities.map((entity, index) => {
        const total = entities.length
        const posX = Math.floor(width * ((index + 1) / (total + 1)))
        const posY = Math.floor(height / 2)
        const leftPercent = ((posX + 0.5) / width) * 100
        const topPercent = ((posY + 0.5) / height) * 100

        const isTargeted = activeId === entity.entityId
        const isRestored = entity.state === 'RESTORED'
        const corruption = entity.corruption ?? 0

        return (
          <div
            key={entity.entityId}
            className={`lumi-tactical-entity ${isTargeted ? 'is-targeted' : ''} ${isRestored ? 'is-restored' : ''}`}
            style={{
              position: 'absolute',
              left: `${leftPercent}%`,
              top: `${topPercent}%`,
              transform: 'translate(-50%, -50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              transition: 'all 0.3s ease',
            }}
          >
            <div
              style={{
                width: '52px',
                height: '52px',
                borderRadius: '50%',
                border: isRestored ? '2px solid #55f1c8' : isTargeted ? '3px solid #facc15' : '2px solid #f87171',
                background: isRestored ? 'rgba(16, 185, 129, 0.25)' : 'rgba(15, 23, 42, 0.85)',
                boxShadow: isTargeted ? '0 0 16px #facc15' : isRestored ? '0 0 12px rgba(85, 241, 200, 0.5)' : '0 0 8px rgba(248, 113, 113, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
              }}
            >
              {isRestored ? '🛡️' : isTargeted ? '⚡' : '⚠️'}
            </div>
            <div style={{ marginTop: '4px', textAlign: 'center', whiteSpace: 'nowrap' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: isRestored ? '#55f1c8' : '#cbd5e1' }}>
                {entity.name}
              </div>
              <div style={{ fontSize: '0.65rem', fontWeight: 600, color: isRestored ? '#55f1c8' : '#f87171' }}>
                {isRestored ? '복구 완료 (RESTORED)' : `오염도: ${corruption}`}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
