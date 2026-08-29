import { useState } from 'react'

function formatValue(value) {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return String(value)
  }
}

/** A single data-driven discovery surface shared by capability prototypes. */
export default function PrototypeConceptLens({ kernel, onDiscoveryComplete }) {
  const config = kernel.modes?.explore?.lensConfig || {}
  const [revealed, setRevealed] = useState(false)

  return (
    <div style={{ display: 'grid', gap: '16px' }}>
      <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.85)', border: '1px solid rgba(56, 189, 248, 0.3)' }}>
        <div style={{ color: '#a5f3fc', fontWeight: 'bold', marginBottom: '10px' }}>작은 입력 우주</div>
        <pre style={{ margin: 0, whiteSpace: 'pre-wrap', color: '#e2e8f0', fontSize: '14px' }}>
          {formatValue(config.defaultValues)}
        </pre>
      </div>

      {!revealed ? (
        <button
          type="button"
          onClick={() => setRevealed(true)}
          style={{ padding: '12px 18px', borderRadius: '10px', border: '1px solid #38bdf8', background: 'rgba(56, 189, 248, 0.15)', color: '#bae6fd', cursor: 'pointer', fontWeight: 'bold' }}
        >
          입력을 살펴보고 규칙 확인하기
        </button>
      ) : (
        <div style={{ padding: '18px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.45)' }}>
          <div style={{ color: '#a7f3d0', lineHeight: 1.6 }}>{config.ruleStatement}</div>
          <button
            type="button"
            onClick={() => onDiscoveryComplete?.({ lensId: 'prototype-concept', ruleConfirmed: true })}
            style={{ marginTop: '14px', padding: '10px 16px', borderRadius: '8px', border: 'none', background: '#10b981', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
          >
            이 규칙을 코드로 표현해 볼게요
          </button>
        </div>
      )}
    </div>
  )
}
