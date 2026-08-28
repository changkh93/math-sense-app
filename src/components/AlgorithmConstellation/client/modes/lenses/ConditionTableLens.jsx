import { useState } from 'react'

export default function ConditionTableLens({ kernel, shell = 'explorer', onDiscoveryComplete }) {
  const terms = kernel.shells?.[shell]?.terms || {
    switch1: '빨간 스위치',
    switch2: '파란 스위치',
    result: '게이트',
    resultTrue: '열림 (PASS)',
    resultFalse: '닫힘 (LOCKED)',
    choiceTrue: '열림 (True)',
    choiceFalse: '닫힘 (False)',
  }

  const [s1, setS1] = useState(false)
  const [s2, setS2] = useState(false)
  const [visitedCases, setVisitedCases] = useState(() => new Set(['false_false']))
  const [discoveredRule, setDiscoveredRule] = useState(null)

  const isOrProblem = kernel.id === 'AC-COND-002' || kernel.modes?.explore?.lensConfig?.logic === 'or'

  const getResultForState = (v1, v2) => {
    return isOrProblem ? Boolean(v1 || v2) : Boolean(v1 && v2)
  }

  const currentResult = getResultForState(s1, s2)

  const handleToggleS1 = () => {
    const next = !s1
    setS1(next)
    setVisitedCases((prev) => new Set([...prev, `${next}_${s2}`]))
  }

  const handleToggleS2 = () => {
    const next = !s2
    setS2(next)
    setVisitedCases((prev) => new Set([...prev, `${s1}_${next}`]))
  }

  const allCasesVisited =
    visitedCases.has('false_false') &&
    visitedCases.has('true_false') &&
    visitedCases.has('false_true') &&
    visitedCases.has('true_true')

  const handleSelectRule = (isCorrect) => {
    const status = isCorrect ? 'correct' : 'wrong'
    setDiscoveredRule(status)
    if (isCorrect) {
      onDiscoveryComplete?.({
        lensId: 'condition-table',
        ruleDiscovered: isOrProblem ? 'or' : 'and',
      })
    }
  }

  return (
    <div>
      {/* Switch Controllers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
        <div style={{ padding: '20px', borderRadius: '12px', background: s1 ? 'rgba(239, 68, 68, 0.25)' : 'rgba(255, 255, 255, 0.05)', border: s1 ? '2px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.15)', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fca5a5', marginBottom: '8px' }}>
            {terms.switch1 || '조건 1'}
          </div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px' }}>
            현재 상태: <strong style={{ color: s1 ? '#34d399' : '#f87171' }}>{s1 ? 'ON (True)' : 'OFF (False)'}</strong>
          </div>
          <button
            type="button"
            onClick={handleToggleS1}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: s1 ? '#ef4444' : 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {s1 ? '🔴 스위치 끄기 (OFF)' : '⭕ 스위치 켜기 (ON)'}
          </button>
        </div>

        <div style={{ padding: '20px', borderRadius: '12px', background: s2 ? 'rgba(59, 130, 246, 0.25)' : 'rgba(255, 255, 255, 0.05)', border: s2 ? '2px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.15)', textAlign: 'center' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '8px' }}>
            {terms.switch2 || '조건 2'}
          </div>
          <div style={{ fontSize: '13px', color: '#cbd5e1', marginBottom: '14px' }}>
            현재 상태: <strong style={{ color: s2 ? '#34d399' : '#f87171' }}>{s2 ? 'ON (True)' : 'OFF (False)'}</strong>
          </div>
          <button
            type="button"
            onClick={handleToggleS2}
            style={{
              padding: '10px 24px',
              borderRadius: '8px',
              border: 'none',
              background: s2 ? '#3b82f6' : 'rgba(255, 255, 255, 0.15)',
              color: '#fff',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
            }}
          >
            {s2 ? '🔵 스위치 끄기 (OFF)' : '⭕ 스위치 켜기 (ON)'}
          </button>
        </div>
      </div>

      {/* Result Indicator */}
      <div
        style={{
          padding: '24px',
          borderRadius: '16px',
          background: currentResult
            ? 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.25) 0%, rgba(10, 25, 50, 0.8) 100%)'
            : 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.2) 0%, rgba(20, 10, 20, 0.8) 100%)',
          border: currentResult ? '2px solid #10b981' : '2px solid #ef4444',
          boxShadow: currentResult ? '0 0 30px rgba(16, 185, 129, 0.3)' : 'none',
          textAlign: 'center',
          marginBottom: '24px',
        }}
      >
        <div style={{ fontSize: '40px', marginBottom: '8px' }}>{currentResult ? '🔓' : '🔒'}</div>
        <div style={{ fontSize: '22px', fontWeight: 'bold', color: currentResult ? '#34d399' : '#f87171' }}>
          {currentResult ? terms.resultTrue || '열림 (PASS / True)' : terms.resultFalse || '닫힘 (LOCKED / False)'}
        </div>
      </div>

      {/* 4 Cases Discovery Checklist */}
      <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc', marginBottom: '12px' }}>
          📝 내가 실험한 조합 ({visitedCases.size} / 4 확인 완료)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {[
            { id: 'false_false', l1: false, l2: false, label: 'OFF & OFF' },
            { id: 'true_false', l1: true, l2: false, label: 'ON & OFF' },
            { id: 'false_true', l1: false, l2: true, label: 'OFF & ON' },
            { id: 'true_true', l1: true, l2: true, label: 'ON & ON' },
          ].map((c) => {
            const isVisited = visitedCases.has(c.id)
            const expected = getResultForState(c.l1, c.l2)
            return (
              <div
                key={c.id}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: isVisited
                    ? expected
                      ? 'rgba(16, 185, 129, 0.15)'
                      : 'rgba(239, 68, 68, 0.15)'
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isVisited
                    ? expected
                      ? '1px solid #10b981'
                      : '1px solid #ef4444'
                    : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span style={{ fontWeight: 'bold', color: isVisited ? '#f8fafc' : '#94a3b8' }}>
                  {isVisited ? '✅' : '⏳'} {c.label}
                </span>
                <div style={{ fontSize: '13px', color: isVisited ? (expected ? '#34d399' : '#f87171') : '#64748b', marginTop: '4px' }}>
                  {isVisited ? (expected ? terms.choiceTrue || 'PASS' : terms.choiceFalse || 'LOCKED') : '미확인'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Discovery Quiz */}
      {allCasesVisited && (
        <div style={{ background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #818cf8' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
            💡 실험 결과에서 발견한 논리 규칙은 무엇인가요?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(isOrProblem
              ? [
                  { id: 'or_rule', text: '두 조건 중 하나라도 ON이면 승선할 수 있다.', correct: true },
                  { id: 'and_rule', text: '두 조건이 모두 ON이어야만 승선할 수 있다.', correct: false },
                  { id: 'off_rule', text: '두 조건이 모두 OFF일 때만 승선할 수 있다.', correct: false },
                ]
              : [
                  { id: 'and_rule', text: '두 스위치가 모두 ON이어야만 게이트가 열린다.', correct: true },
                  { id: 'or_rule', text: '둘 중 하나만 ON이어도 게이트가 열린다.', correct: false },
                  { id: 'off_rule', text: '두 스위치가 모두 OFF일 때만 열린다.', correct: false },
                ]
            ).map((choice) => (
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
              ✨ <strong>규칙 발견 완료!</strong> 이제 발견한 조건을 코드로 표현해 보세요.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
