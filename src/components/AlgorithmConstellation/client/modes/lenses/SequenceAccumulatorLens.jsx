import { useState } from 'react'

export default function SequenceAccumulatorLens({ kernel, shell = 'explorer', onDiscoveryComplete }) {
  const sampleStream = kernel.modes?.explore?.lensConfig?.sampleStream || [10, -5, 20, -8, 15, 0, -2, 30]
  const [cursor, setCursor] = useState(0)
  const [discoveredRule, setDiscoveredRule] = useState(null)

  // Calculate accumulator up to cursor
  let currentTotal = 0
  for (let i = 0; i <= cursor; i++) {
    const val = sampleStream[i]
    if (val > 0) currentTotal += val
  }

  const currentVal = sampleStream[cursor]
  const isPositive = currentVal > 0
  const isEnd = cursor >= sampleStream.length - 1

  const handleNext = () => {
    if (cursor < sampleStream.length - 1) {
      setCursor((prev) => prev + 1)
    }
  }

  const handleReset = () => {
    setCursor(0)
  }

  const handleSelectRule = (isCorrect) => {
    const status = isCorrect ? 'correct' : 'wrong'
    setDiscoveredRule(status)
    if (isCorrect) {
      onDiscoveryComplete?.({
        lensId: 'sequence-accumulator',
        pattern: 'filter_positive_and_accumulate',
      })
    }
  }

  return (
    <div>
      {/* Conveyor Belt Stream Visualizer */}
      <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 30, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(0, 240, 255, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#a5f3fc' }}>
            🛸 캡슐 컨베이어 벨트 (진행: <span style={{ color: '#00f0ff', fontFamily: 'monospace' }}>{cursor + 1} / {sampleStream.length}</span>)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleNext}
              disabled={isEnd}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid rgba(0, 240, 255, 0.5)',
                background: isEnd ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 240, 255, 0.2)',
                color: isEnd ? '#64748b' : '#00f0ff',
                fontWeight: 'bold',
                cursor: isEnd ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              {isEnd ? '🏁 끝에 도달' : '다음 캡슐 조사 ▶'}
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              처음부터 ⏪
            </button>
          </div>
        </div>

        {/* Capsule track */}
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', padding: '10px 0 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
          {sampleStream.map((val, idx) => {
            const isCurrent = idx === cursor
            const isProcessed = idx < cursor
            const isValPositive = val > 0

            return (
              <div
                key={idx}
                onClick={() => setCursor(idx)}
                style={{
                  minWidth: '64px',
                  padding: '12px 8px',
                  borderRadius: '10px',
                  textAlign: 'center',
                  background: isCurrent
                    ? 'rgba(0, 240, 255, 0.25)'
                    : isProcessed
                    ? isValPositive
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.12)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isCurrent
                    ? '2px solid #00f0ff'
                    : isProcessed
                    ? isValPositive
                      ? '1px solid #10b981'
                      : '1px solid #ef4444'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                  cursor: 'pointer',
                  transform: isCurrent ? 'scale(1.08)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}
              >
                <div style={{ fontSize: '11px', color: isCurrent ? '#a5f3fc' : '#94a3b8', marginBottom: '4px' }}>
                  #{idx}
                </div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: isValPositive ? '#34d399' : '#f87171', fontFamily: 'monospace' }}>
                  {val > 0 ? `+${val}` : val}
                </div>
                <div style={{ fontSize: '14px', marginTop: '4px' }}>
                  {isValPositive ? '🔋' : '⚡'}
                </div>
              </div>
            )
          })}
        </div>

        {/* Current inspection status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: isPositive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)', border: isPositive ? '1px solid #10b981' : '1px solid #ef4444' }}>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>현재 조사 중인 캡슐 (#{cursor})</div>
            <div style={{ fontSize: '20px', fontWeight: 'bold', color: isPositive ? '#34d399' : '#f87171', marginTop: '4px' }}>
              {currentVal > 0 ? `+${currentVal}` : currentVal}
              <span style={{ fontSize: '13px', marginLeft: '8px' }}>
                {isPositive ? '➔ 양수 에너지 (수거 대상 ⭕)' : '➔ 0 이하 손상 (수거 제외 ❌)'}
              </span>
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(0, 240, 255, 0.12)', border: '1px solid #00f0ff' }}>
            <div style={{ fontSize: '12px', color: '#cbd5e1' }}>누적된 총 유효 에너지 (total)</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#00f0ff', fontFamily: 'monospace', marginTop: '4px' }}>
              {currentTotal}
            </div>
          </div>
        </div>
      </div>

      {/* Discovery Checklist */}
      <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc', marginBottom: '10px' }}>
          📝 순회 및 선별 누적의 원리
        </div>
        <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
          리스트의 모든 요소를 <code>for</code>문으로 하나씩 꺼내며 확인하되, <strong>0보다 큰 양수(energy &gt; 0)</strong>일 때만 <strong>누적 변수(total)</strong>에 더해나갑니다.
        </p>
      </div>

      {/* Discovery Quiz */}
      {cursor >= 3 && (
        <div style={{ background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #818cf8' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
            💡 에너지 선별 수거의 핵심 구현 패턴은 무엇인가요?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'filter_sum', text: 'total을 0으로 시작한 뒤, for문으로 순회하며 energy > 0 일 때만 total에 더한다.', correct: true },
              { id: 'sum_all', text: '음수나 0을 구분하지 않고 리스트의 모든 숫자를 무조건 더한다.', correct: false },
              { id: 'count_only', text: '값의 크기는 무시하고 양수 캡슐의 개수만 1씩 센다.', correct: false },
            ].map((choice) => (
              <button
                key={choice.id}
                type="button"
                onClick={() => handleSelectRule(choice.correct)}
                style={{
                  padding: '12px 18px',
                  borderRadius: '8px',
                  textAlign: 'left',
                  background: discoveredRule === 'correct' && choice.correct ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                  border: discoveredRule === 'correct' && choice.correct ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#fff',
                  fontSize: '14px',
                  cursor: 'pointer',
                }}
              >
                {choice.text}
              </button>
            ))}
          </div>
          {discoveredRule === 'correct' && (
            <div style={{ marginTop: '14px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', border: '1px solid #10b981', color: '#a7f3d0', fontSize: '14px' }}>
              ✨ <strong>패턴 발견 완료!</strong> 이제 for문과 if문을 결합하여 코드로 구현해 보세요.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
