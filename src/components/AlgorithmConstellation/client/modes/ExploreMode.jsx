import { useState } from 'react'
import ConditionTableLens from './lenses/ConditionTableLens'
import PatternTimelineLens from './lenses/PatternTimelineLens'
import SequenceAccumulatorLens from './lenses/SequenceAccumulatorLens'
import QueueFifoLens from './lenses/QueueFifoLens'
import GridBfsRadarLens from './lenses/GridBfsRadarLens'
import PrototypeConceptLens from './lenses/PrototypeConceptLens'
import StateTransitionLens from './lenses/StateTransitionLens'

const LENS_REGISTRY = {
  'condition-table': ConditionTableLens,
  'pattern-timeline': PatternTimelineLens,
  'sequence-accumulator': SequenceAccumulatorLens,
  'fifo-queue': QueueFifoLens,
  'grid-bfs': GridBfsRadarLens,
  'prototype-concept': PrototypeConceptLens,
  'state-transition': StateTransitionLens,
}

export default function ExploreMode({
  kernel,
  shell = 'explorer',
  onProceedToCode,
  onBackToObserve,
  onCompleteMicroEvidence,
  allowBypass = false,
}) {
  const [lensEvidence, setLensEvidence] = useState(null)

  const handleDiscovery = (evidence) => {
    setLensEvidence(evidence)
    onCompleteMicroEvidence?.({
      type: 'explore_discovery',
      passed: true,
      evidence,
    })
  }

  // Resolve lensId from kernel.modes.explore.lensId with fallback
  const resolvedLensId =
    kernel.modes?.explore?.lensId ||
    (kernel.family === 'SEQ' || kernel.runtime?.worldModel?.includes('accumulator')
      ? 'sequence-accumulator'
      : kernel.family === 'NAV' && (kernel.id === 'AC-NAV-005' || kernel.runtime?.worldModel?.includes('queue'))
      ? 'fifo-queue'
      : kernel.family === 'NAV' && (kernel.id === 'AC-NAV-006' || kernel.runtime?.worldModel?.includes('bfs'))
      ? 'grid-bfs'
      : kernel.family === 'PAT' || kernel.id.startsWith('AC-PAT')
      ? 'pattern-timeline'
      : 'condition-table')

  const ActiveLens = LENS_REGISTRY[resolvedLensId] || ConditionTableLens
  const canProceed = Boolean(lensEvidence)

  return (
    <div style={{ padding: '24px', background: 'rgba(10, 20, 40, 0.75)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.25)', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <span style={{ fontSize: '32px' }}>
          {resolvedLensId === 'grid-bfs'
            ? '🌌'
            : resolvedLensId === 'fifo-queue'
            ? '📡'
            : resolvedLensId === 'sequence-accumulator'
            ? '🛸'
            : resolvedLensId === 'pattern-timeline'
            ? '⏱️'
            : '⚡'}
        </span>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#00f0ff', fontFamily: 'monospace' }}>
            [2단계: 대화형 실험실] {kernel.identity?.studentTitle || '규칙 탐색 실험'}
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>
            다양한 입력 상태를 직접 조작해 보며 알고리즘의 동작 규칙과 핵심 패턴을 관찰하고 발견해 보세요.
          </p>
        </div>
      </div>

      {/* Render Active Lens */}
      <ActiveLens
        kernel={kernel}
        shell={shell}
        onDiscoveryComplete={handleDiscovery}
      />

      {/* Discovery Status Banner */}
      <div style={{ margin: '20px 0 10px', padding: '12px 18px', borderRadius: '10px', background: canProceed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(234, 179, 8, 0.12)', border: canProceed ? '1px solid #10b981' : '1px solid rgba(234, 179, 8, 0.35)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ fontSize: '14px', color: canProceed ? '#a7f3d0' : '#fef08a' }}>
          {canProceed
            ? '✨ 2단계 규칙 발견 완료! 이제 3단계 Python 코드를 구현할 준비가 되었습니다.'
            : '💡 위 실험실의 모든 상태를 조작하고 규칙 발견 퀴즈를 완료해야 다음 단계로 이동할 수 있습니다.'}
        </div>
        {!canProceed && allowBypass && (
          <button
            type="button"
            onClick={() => handleDiscovery({ bypass: true, bypassedAt: new Date().toISOString() })}
            style={{ fontSize: '12px', background: 'transparent', border: '1px dashed #eab308', color: '#fef08a', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}
          >
            실험 건너뛰기 (Bypass)
          </button>
        )}
      </div>

      {/* Footer Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <button
          type="button"
          onClick={onBackToObserve}
          style={{
            padding: '10px 20px',
            borderRadius: '8px',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            background: 'rgba(255, 255, 255, 0.08)',
            color: '#cbd5e1',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ◀ 1단계 관찰로 돌아가기
        </button>

        <button
          type="button"
          onClick={() => onProceedToCode?.(lensEvidence)}
          disabled={!canProceed}
          style={{
            padding: '12px 28px',
            borderRadius: '8px',
            border: 'none',
            background: canProceed ? 'linear-gradient(135deg, #00f0ff, #3b82f6)' : 'rgba(255, 255, 255, 0.08)',
            color: canProceed ? '#030712' : '#64748b',
            fontWeight: 'bold',
            fontSize: '15px',
            cursor: canProceed ? 'pointer' : 'not-allowed',
            boxShadow: canProceed ? '0 0 20px rgba(0, 240, 255, 0.4)' : 'none',
            transition: 'all 0.2s ease',
          }}
        >
          3단계 Python 코드로 구현하기 ▶
        </button>
      </div>
    </div>
  )
}
