import { useState } from 'react'

export default function GridBfsRadarLens({ kernel, shell = 'explorer', onDiscoveryComplete }) {
  const defaultGrid = [
    [0, 0, 0],
    [1, 1, 0],
    [0, 0, 0],
  ]
  const rows = 3
  const cols = 3
  const start = [0, 0]
  const target = [2, 2]

  const [stepIndex, setStepIndex] = useState(0)
  const [discoveredRule, setDiscoveredRule] = useState(null)

  // Simulation steps for BFS on defaultGrid
  const bfsSteps = [
    {
      queue: [[0, 0, 0]],
      visited: [[0, 0]],
      current: [0, 0, 0],
      desc: '시작점 (0,0)을 거리 0으로 큐에 넣고 visited에 등록합니다.',
    },
    {
      queue: [[0, 1, 1]],
      visited: [[0, 0], [0, 1]],
      current: [0, 1, 1],
      desc: '(0,0)에서 오른쪽 (0,1)로 이동! (거리 1)',
    },
    {
      queue: [[0, 2, 2]],
      visited: [[0, 0], [0, 1], [0, 2]],
      current: [0, 2, 2],
      desc: '(0,1)에서 오른쪽 (0,2)로 이동! (거리 2)',
    },
    {
      queue: [[1, 2, 3]],
      visited: [[0, 0], [0, 1], [0, 2], [1, 2]],
      current: [1, 2, 3],
      desc: '(0,2)에서 아래 (1,2)로 이동! (거리 3)',
    },
    {
      queue: [[2, 2, 4]],
      visited: [[0, 0], [0, 1], [0, 2], [1, 2], [2, 2]],
      current: [2, 2, 4],
      desc: '🎉 목표 지점 (2,2)에 도달했습니다! 최단 거리: 4',
    },
  ]

  const currentStep = bfsSteps[Math.min(stepIndex, bfsSteps.length - 1)]
  const isEnd = stepIndex >= bfsSteps.length - 1

  const handleNextStep = () => {
    if (stepIndex < bfsSteps.length - 1) {
      setStepIndex((prev) => prev + 1)
    }
  }

  const handleReset = () => {
    setStepIndex(0)
  }

  const handleSelectRule = (isCorrect) => {
    const status = isCorrect ? 'correct' : 'wrong'
    setDiscoveredRule(status)
    if (isCorrect) {
      onDiscoveryComplete?.({
        lensId: 'grid-bfs',
        rule: 'bfs_shortest_path_with_visited_set',
      })
    }
  }

  const isVisited = (r, c) => currentStep.visited.some(([vr, vc]) => vr === r && vc === c)
  const isCurrent = (r, c) => currentStep.current[0] === r && currentStep.current[1] === c

  return (
    <div>
      {/* BFS Grid Visualizer */}
      <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 30, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(0, 240, 255, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#a5f3fc' }}>
            🌌 2D 어둠 성운 BFS 파동 레이더 (탐색 단계: <span style={{ color: '#00f0ff', fontFamily: 'monospace' }}>{stepIndex + 1} / {bfsSteps.length}</span>)
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleNextStep}
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
              {isEnd ? '🏁 목표 도달 완료' : '다음 탐색 단계 (BFS Step) ▶'}
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
              처음부터 ⏪
            </button>
          </div>
        </div>

        {/* 2D Grid Representation */}
        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 70px)`, gap: '8px' }}>
            {defaultGrid.map((row, r) =>
              row.map((cell, c) => {
                const isWall = cell === 1
                const isStart = r === start[0] && c === start[1]
                const isTarget = r === target[0] && c === target[1]
                const visitedCell = isVisited(r, c)
                const currentCell = isCurrent(r, c)

                return (
                  <div
                    key={`${r}_${c}`}
                    style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: isWall
                        ? '#334155'
                        : currentCell
                        ? 'rgba(0, 240, 255, 0.4)'
                        : visitedCell
                        ? 'rgba(16, 185, 129, 0.25)'
                        : 'rgba(255, 255, 255, 0.05)',
                      border: currentCell
                        ? '2px solid #00f0ff'
                        : visitedCell
                        ? '1px solid #10b981'
                        : isWall
                        ? '1px solid #475569'
                        : '1px solid rgba(255, 255, 255, 0.1)',
                      boxShadow: currentCell ? '0 0 15px rgba(0, 240, 255, 0.5)' : 'none',
                      transition: 'all 0.3s ease',
                    }}
                  >
                    <div style={{ fontSize: '10px', color: '#94a3b8' }}>
                      ({r},{c})
                    </div>
                    <div style={{ fontSize: '20px', marginTop: '2px' }}>
                      {isWall ? '🪨' : isTarget ? '🎯' : isStart ? '🚀' : visitedCell ? '✨' : '·'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* State monitor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '16px' }}>
          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid #3b82f6' }}>
            <div style={{ fontSize: '12px', color: '#93c5fd' }}>현재 BFS 큐 (Queue: (r, c, dist))</div>
            <div style={{ fontFamily: 'monospace', fontSize: '15px', color: '#93c5fd', marginTop: '4px' }}>
              [{currentStep.queue.map(([r, c, d]) => `(${r}, ${c}, d:${d})`).join(', ')}]
            </div>
          </div>

          <div style={{ padding: '14px', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981' }}>
            <div style={{ fontSize: '12px', color: '#a7f3d0' }}>방문 집합 (Visited Set: (r, c))</div>
            <div style={{ fontFamily: 'monospace', fontSize: '15px', color: '#34d399', marginTop: '4px' }}>
              {`{ ${currentStep.visited.map(([r, c]) => `(${r},${c})`).join(', ')} }`}
            </div>
          </div>
        </div>

        <div style={{ marginTop: '14px', padding: '10px 14px', borderRadius: '8px', background: 'rgba(0, 0, 0, 0.4)', color: '#fef08a', fontSize: '14px' }}>
          💬 {currentStep.desc}
        </div>
      </div>

      {/* Discovery Checklist */}
      <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc', marginBottom: '10px' }}>
          📝 BFS 최단 경로 탐색과 방문 집합(visited)의 핵심 원리
        </div>
        <p style={{ fontSize: '14px', color: '#cbd5e1', lineHeight: '1.6', margin: 0 }}>
          BFS는 큐를 사용하여 가까운 거리부터 파동처럼 탐색합니다. 이때 <strong>이미 방문한 좌표((nr, nc) in visited)를 제외</strong>해야 같은 자리를 맴도는 무한 루프를 방지하고 최단 거리를 정확히 구할 수 있습니다.
        </p>
      </div>

      {/* Discovery Quiz */}
      {stepIndex >= 2 && (
        <div style={{ background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #818cf8' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
            💡 BFS 최단경로 탐색에서 방문 집합(visited)의 역할은?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[
              { id: 'bfs_visited', text: '이미 방문한 칸((nr, nc) in visited)을 건너뛰어 무한 루프를 막고 최단 경로를 보장한다.', correct: true },
              { id: 'visit_all_times', text: '이미 방문한 칸이라도 상관없이 계속 큐에 다시 집어넣는다.', correct: false },
              { id: 'ignore_walls', text: '벽(1)이나 지도 범위를 벗어난 좌표도 무조건 큐에 넣는다.', correct: false },
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
              ✨ <strong>BFS 원리 발견 완료!</strong> 이제 큐와 visited 집합을 활용하여 최단거리 알고리즘을 코드로 작성해 보세요.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
