import { useState } from 'react'

export default function QueueFifoLens({ kernel, shell = 'explorer', onDiscoveryComplete }) {
  const initialSignals = kernel.modes?.explore?.lensConfig?.initialSignals || ['ALPHA', 'BETA', 'GAMMA', 'DELTA']
  const [queue, setQueue] = useState(() => [...initialSignals])
  const [processed, setProcessed] = useState([])
  const [discoveredRule, setDiscoveredRule] = useState(null)
  const [signalCount, setSignalCount] = useState(5)

  const handlePopleft = () => {
    if (queue.length === 0) return
    const [first, ...rest] = queue
    setQueue(rest)
    setProcessed((prev) => [...prev, first])
  }

  const handleAppend = () => {
    const nextSig = `SIG_${signalCount}`
    setSignalCount((prev) => prev + 1)
    setQueue((prev) => [...prev, nextSig])
  }

  const handleReset = () => {
    setQueue([...initialSignals])
    setProcessed([])
  }

  const handleSelectRule = (isCorrect) => {
    const status = isCorrect ? 'correct' : 'wrong'
    setDiscoveredRule(status)
    if (isCorrect) {
      onDiscoveryComplete?.({
        lensId: 'fifo-queue',
        rule: 'fifo_popleft_processing',
      })
    }
  }

  return (
    <div>
      {/* Queue Pipeline Visualizer */}
      <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 30, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(0, 240, 255, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#a5f3fc' }}>
            🛰️ 구조 신호 선입선출(FIFO) 대기열 시뮬레이터
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleAppend}
              style={{
                padding: '8px 14px',
                borderRadius: '8px',
                border: '1px solid rgba(59, 130, 246, 0.5)',
                background: 'rgba(59, 130, 246, 0.2)',
                color: '#93c5fd',
                fontWeight: 'bold',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              + 새 신호 전송 (append)
            </button>
            <button
              type="button"
              onClick={handlePopleft}
              disabled={queue.length === 0}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: '1px solid #10b981',
                background: queue.length === 0 ? 'rgba(255, 255, 255, 0.05)' : 'rgba(16, 185, 129, 0.25)',
                color: queue.length === 0 ? '#64748b' : '#34d399',
                fontWeight: 'bold',
                cursor: queue.length === 0 ? 'not-allowed' : 'pointer',
                fontSize: '13px',
              }}
            >
              ⚡ 가장 앞 신호 꺼내기 (popleft)
            </button>
            <button
              type="button"
              onClick={handleReset}
              style={{
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                background: 'rgba(255, 255, 255, 0.08)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '13px',
              }}
            >
              리셋 🔄
            </button>
          </div>
        </div>

        {/* Pipeline graphic */}
        <div style={{ background: 'rgba(0, 0, 0, 0.5)', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '13px', color: '#93c5fd' }}>📥 [대기열 입구 (Rear)]</span>
            <span style={{ fontSize: '13px', color: '#34d399' }}>📤 [대기열 출구 (Front - popleft)]</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minHeight: '60px', overflowX: 'auto', padding: '6px' }}>
            {queue.length === 0 ? (
              <div style={{ width: '100%', textAlign: 'center', color: '#64748b', fontSize: '14px', padding: '12px' }}>
                대기열이 비어 있습니다. (새 신호를 전송해 보세요)
              </div>
            ) : (
              queue.map((sig, idx) => {
                const isFront = idx === 0
                return (
                  <div
                    key={idx}
                    style={{
                      padding: '10px 16px',
                      borderRadius: '8px',
                      background: isFront ? 'rgba(16, 185, 129, 0.25)' : 'rgba(0, 240, 255, 0.15)',
                      border: isFront ? '2px solid #10b981' : '1px solid rgba(0, 240, 255, 0.4)',
                      color: isFront ? '#34d399' : '#00f0ff',
                      fontWeight: 'bold',
                      fontSize: '14px',
                      fontFamily: 'monospace',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span>{isFront ? '🌟' : '📡'}</span>
                    <span>{sig}</span>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Processed output list */}
        <div style={{ marginTop: '16px', padding: '12px 16px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
          <div style={{ fontSize: '13px', color: '#a7f3d0', marginBottom: '6px' }}>
            ✅ 처리 완료된 신호 목록 (출력 결과 리스트):
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '15px', color: '#34d399' }}>
            [{processed.map((s) => `'${s}'`).join(', ')}]
          </div>
        </div>
      </div>

      {/* Discovery Checklist */}
      <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc', marginBottom: '10px' }}>
          📝 선입선출 (FIFO: First-In First-Out) 원리
        </div>
        <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
          큐(Queue)는 먼저 들어온 데이터가 항상 먼저 나갑니다. Python에서는 <code>deque</code>의 <code>popleft()</code>를 사용하여 대기열의 가장 앞 신호를 꺼내 순차적으로 처리합니다.
        </p>
      </div>

      {/* Discovery Quiz */}
      {processed.length >= 2 && (
        <div style={{ background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #818cf8' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
            💡 큐(Queue) 자료구조에서 신호를 올바르게 처리하는 방법은?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'fifo_popleft', text: '큐가 빌 때까지 while문으로 반복하며 popleft()로 가장 앞의 신호를 차례로 꺼낸다.', correct: true },
              { id: 'lifo_pop', text: '가장 나중에 들어온 신호부터 pop()으로 거꾸로 꺼낸다.', correct: false },
              { id: 'random_pick', text: '순서에 상관없이 아무 신호나 임의로 꺼낸다.', correct: false },
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
              ✨ <strong>큐 원리 발견 완료!</strong> 이제 deque와 popleft()를 사용하여 신호 처리 함수를 완성해 보세요.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
