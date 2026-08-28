import { useEffect, useState } from 'react'

export default function ExploreMode({
  kernel,
  shell = 'explorer',
  onProceedToCode,
  onBackToObserve,
}) {
  const isSignalBridge = kernel.world?.type === 'signal-bridge' || kernel.id === 'AC-PAT-003'
  const terms = kernel.shells?.[shell]?.terms || (
    isSignalBridge
      ? { time: '현재 시간 (초)', result: '신호 다리' }
      : { switch1: '빨간 스위치', switch2: '파란 스위치', result: '게이트' }
  )

  // State for Switch problem (AC-COND-001)
  const [s1, setS1] = useState(false)
  const [s2, setS2] = useState(false)
  const [visitedCases, setVisitedCases] = useState(() => new Set(['false_false']))
  const [discoveredRule, setDiscoveredRule] = useState(null)

  // State for Pattern/Signal Bridge (AC-PAT-003)
  const [time, setTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [visitedRemainders, setVisitedRemainders] = useState(() => new Set([0]))
  const [discoveredPatternRule, setDiscoveredPatternRule] = useState(null)

  const cycle = kernel.world?.cycleLength || 3
  const remainder = time % cycle
  const bridgeOpen = isSignalBridge ? remainder === 0 : Boolean(s1 && s2)

  // Track discovered combinations for switch problem
  const handleToggleS1 = () => {
    const nextS1 = !s1
    setS1(nextS1)
    setVisitedCases((prev) => new Set([...prev, `${nextS1}_${s2}`]))
  }

  const handleToggleS2 = () => {
    const nextS2 = !s2
    setS2(nextS2)
    setVisitedCases((prev) => new Set([...prev, `${s1}_${nextS2}`]))
  }

  const allSwitchCasesVisited = visitedCases.has('false_false') &&
    visitedCases.has('true_false') &&
    visitedCases.has('false_true') &&
    visitedCases.has('true_true')

  // Auto-play timer for signal bridge
  useEffect(() => {
    if (!isPlaying) return undefined
    const interval = setInterval(() => {
      setTime((prev) => {
        const next = prev >= 15 ? 0 : prev + 1
        setVisitedRemainders((rSet) => new Set([...rSet, next % cycle]))
        return next
      })
    }, 1200)
    return () => clearInterval(interval)
  }, [cycle, isPlaying])

  const handleTimeChange = (newTime) => {
    setTime(newTime)
    setVisitedRemainders((prev) => new Set([...prev, newTime % cycle]))
  }

  const allRemaindersVisited = visitedRemainders.has(0) && visitedRemainders.has(1) && visitedRemainders.has(2)

  return (
    <div style={{ padding: '24px', background: 'rgba(10, 20, 40, 0.75)', borderRadius: '16px', border: '1px solid rgba(0, 240, 255, 0.25)', color: '#fff' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
        <span style={{ fontSize: '32px' }}>{isSignalBridge ? '⏳' : '⚡'}</span>
        <div>
          <h3 style={{ margin: 0, fontSize: '20px', color: '#00f0ff', fontFamily: 'monospace' }}>
            [2단계: 대화형 실험실] {isSignalBridge ? '시간을 직접 변경하며 주기 규칙을 발견하세요' : '스위치를 직접 조작하며 모든 경우를 확인하세요'}
          </h3>
          <p style={{ margin: '6px 0 0', fontSize: '15px', color: '#cbd5e1', lineHeight: '1.6' }}>
            {isSignalBridge
              ? '시간(time)을 바꿔가며 다리가 언제 열리고 언제 얼어붙는지 관찰하고 규칙을 발견해 보세요.'
              : '두 스위치를 켜고 끄면서 4가지 경우의 게이트 상태를 직접 실험해 보세요.'}
          </p>
        </div>
      </div>

      {isSignalBridge ? (
        /* Signal Bridge Interactive Simulator (AC-PAT-003) */
        <div>
          {/* Time Machine Controls */}
          <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 30, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(129, 140, 248, 0.35)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '22px' }}>⏱️</span>
                <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
                  현재 시간: <span style={{ color: '#00f0ff', fontFamily: 'monospace', fontSize: '24px' }}>{time}초</span>
                </span>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setIsPlaying(!isPlaying)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(0, 240, 255, 0.5)',
                    background: isPlaying ? 'rgba(239, 68, 68, 0.25)' : 'rgba(0, 240, 255, 0.2)',
                    color: isPlaying ? '#f87171' : '#00f0ff',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    fontSize: '13px',
                  }}
                >
                  {isPlaying ? '⏸ 일시 정지' : '▶ 자동 시간 흐름'}
                </button>
                <button
                  type="button"
                  onClick={() => handleTimeChange(0)}
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
                  0초 리셋
                </button>
              </div>
            </div>

            {/* Slider */}
            <input
              type="range"
              min={0}
              max={15}
              value={time}
              onChange={(e) => handleTimeChange(Number(e.target.value))}
              style={{
                width: '100%',
                accentColor: '#00f0ff',
                cursor: 'pointer',
                marginBottom: '14px',
              }}
            />

            {/* Step buttons */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => handleTimeChange(Math.max(0, time - 1))}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                ◀ -1초
              </button>

              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'center' }}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTimeChange(t)}
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '6px',
                      border: time === t ? '2px solid #00f0ff' : t % 3 === 0 ? '1px solid rgba(0, 240, 255, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
                      background: time === t ? '#00f0ff' : t % 3 === 0 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                      color: time === t ? '#030712' : t % 3 === 0 ? '#38bdf8' : '#94a3b8',
                      fontWeight: 'bold',
                      fontSize: '12px',
                      cursor: 'pointer',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => handleTimeChange(Math.min(15, time + 1))}
                style={{
                  padding: '8px 16px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '13px',
                }}
              >
                +1초 ▶
              </button>
            </div>
          </div>

          {/* Animated Frozen Signal Bridge Graphic */}
          <div
            style={{
              padding: '24px',
              borderRadius: '16px',
              background: bridgeOpen
                ? 'radial-gradient(ellipse at center, rgba(0, 240, 255, 0.2) 0%, rgba(10, 25, 50, 0.8) 100%)'
                : 'radial-gradient(ellipse at center, rgba(30, 58, 138, 0.3) 0%, rgba(5, 10, 25, 0.9) 100%)',
              border: bridgeOpen ? '2px solid #00f0ff' : '1px solid rgba(148, 163, 184, 0.25)',
              boxShadow: bridgeOpen ? '0 0 30px rgba(0, 240, 255, 0.25)' : 'none',
              textAlign: 'center',
              marginBottom: '22px',
              transition: 'all 0.3s ease',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '32px' }}>🛰️</span>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>탐사 대원 구역</div>
              </div>

              <div style={{ flex: 1, maxWidth: '280px', margin: '0 20px', position: 'relative' }}>
                <div
                  style={{
                    height: '8px',
                    borderRadius: '4px',
                    background: bridgeOpen
                      ? 'linear-gradient(90deg, #00f0ff, #38bdf8, #00f0ff)'
                      : 'linear-gradient(90deg, #1e293b, #334155, #1e293b)',
                    boxShadow: bridgeOpen ? '0 0 15px #00f0ff' : 'none',
                  }}
                />
                <div style={{ fontSize: '24px', position: 'absolute', top: '-14px', left: '50%', transform: 'translateX(-50%)' }}>
                  {bridgeOpen ? '⚡' : '❄️'}
                </div>
              </div>

              <div style={{ textAlign: 'center' }}>
                <span style={{ fontSize: '32px' }}>🌌</span>
                <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px' }}>성단 관문</div>
              </div>
            </div>

            <div style={{ fontSize: '20px', fontWeight: 'bold', color: bridgeOpen ? '#00f0ff' : '#94a3b8', textShadow: bridgeOpen ? '0 0 12px rgba(0, 240, 255, 0.6)' : 'none' }}>
              {bridgeOpen ? '🔓 신호 다리 열림! (통행 가능)' : '🔒 신호 다리 얼어붙음 (통행 불가)'}
            </div>
          </div>

          {/* Discovery Checklist (Pattern Problem) */}
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc', marginBottom: '12px' }}>
              📝 내가 확인한 나머지별 신호 상태 ({visitedRemainders.size} / 3 확인 완료)
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '12px', borderRadius: '8px', background: visitedRemainders.has(0) ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.04)', border: visitedRemainders.has(0) ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ fontWeight: 'bold', color: visitedRemainders.has(0) ? '#34d399' : '#94a3b8' }}>
                  {visitedRemainders.has(0) ? '✅' : '⏳'} time % 3 == 0 (0초, 3초...)
                </span>
                <div style={{ fontSize: '13px', color: visitedRemainders.has(0) ? '#a7f3d0' : '#64748b', marginTop: '4px' }}>
                  {visitedRemainders.has(0) ? '🔓 열림 (PASS)' : '아직 미확인'}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: visitedRemainders.has(1) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)', border: visitedRemainders.has(1) ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ fontWeight: 'bold', color: visitedRemainders.has(1) ? '#f87171' : '#94a3b8' }}>
                  {visitedRemainders.has(1) ? '✅' : '⏳'} time % 3 == 1 (1초, 4초...)
                </span>
                <div style={{ fontSize: '13px', color: visitedRemainders.has(1) ? '#fca5a5' : '#64748b', marginTop: '4px' }}>
                  {visitedRemainders.has(1) ? '🔒 얼어붙음 (FROZEN)' : '아직 미확인'}
                </div>
              </div>

              <div style={{ padding: '12px', borderRadius: '8px', background: visitedRemainders.has(2) ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.04)', border: visitedRemainders.has(2) ? '1px solid #ef4444' : '1px solid rgba(255, 255, 255, 0.1)' }}>
                <span style={{ fontWeight: 'bold', color: visitedRemainders.has(2) ? '#f87171' : '#94a3b8' }}>
                  {visitedRemainders.has(2) ? '✅' : '⏳'} time % 3 == 2 (2초, 5초...)
                </span>
                <div style={{ fontSize: '13px', color: visitedRemainders.has(2) ? '#fca5a5' : '#64748b', marginTop: '4px' }}>
                  {visitedRemainders.has(2) ? '🔒 얼어붙음 (FROZEN)' : '아직 미확인'}
                </div>
              </div>
            </div>
          </div>

          {/* Pattern Rule Discovery Selector */}
          {allRemaindersVisited && (
            <div style={{ background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #818cf8' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
                💡 확인한 결과에서 어떤 규칙이 보이나요?
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'modulo_zero', text: '시간(time)을 3으로 나눈 나머지가 0일 때만 열린다.', correct: true },
                  { id: 'only_3', text: '정확히 3초일 때만 한 번 열린다.', correct: false },
                  { id: 'even_times', text: '짝수 초(2, 4, 6...)마다 열린다.', correct: false },
                ].map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setDiscoveredPatternRule(choice.correct ? 'correct' : 'wrong')}
                    style={{
                      padding: '12px 18px',
                      borderRadius: '8px',
                      textAlign: 'left',
                      background: discoveredPatternRule === 'correct' && choice.correct ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.06)',
                      border: discoveredPatternRule === 'correct' && choice.correct ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.15)',
                      color: '#fff',
                      fontSize: '14px',
                      cursor: 'pointer',
                    }}
                  >
                    {choice.text}
                  </button>
                ))}
              </div>

              {discoveredPatternRule === 'correct' && (
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', border: '1px solid #10b981', color: '#a7f3d0', fontSize: '14px' }}>
                  ✨ <strong>규칙 발견 성공!</strong> Python에서는 나눗셈의 나머지를 <strong>`%`</strong> 연산자로 계산합니다. (예: <code>time % 3 == 0</code>)
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        /* Switch Interactive Controls (AC-COND-001) */
        <div>
          {/* Dual Switches with Separated Colors & Toggle Glow */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '22px' }}>
            {/* Red Switch */}
            <button
              type="button"
              onClick={handleToggleS1}
              style={{
                padding: '22px',
                background: s1 ? 'radial-gradient(circle at center, rgba(239, 68, 68, 0.35) 0%, rgba(30, 10, 15, 0.8) 100%)' : 'rgba(30, 10, 15, 0.6)',
                border: s1 ? '2px solid #ef4444' : '1px solid rgba(239, 68, 68, 0.4)',
                boxShadow: s1 ? '0 0 24px rgba(239, 68, 68, 0.45)' : 'none',
                borderRadius: '14px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fca5a5', marginBottom: '10px' }}>
                🔴 {terms.switch1}
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: s1 ? '#ef4444' : '#7f1d1d', textShadow: s1 ? '0 0 12px rgba(239,68,68,0.8)' : 'none' }}>
                {s1 ? '● ON (True)' : '○ OFF (False)'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                클릭하여 스위치 전환
              </div>
            </button>

            {/* Blue Switch */}
            <button
              type="button"
              onClick={handleToggleS2}
              style={{
                padding: '22px',
                background: s2 ? 'radial-gradient(circle at center, rgba(0, 240, 255, 0.35) 0%, rgba(10, 20, 40, 0.8) 100%)' : 'rgba(10, 20, 40, 0.6)',
                border: s2 ? '2px solid #00f0ff' : '1px solid rgba(59, 130, 246, 0.4)',
                boxShadow: s2 ? '0 0 24px rgba(0, 240, 255, 0.45)' : 'none',
                borderRadius: '14px',
                color: '#fff',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s ease',
              }}
            >
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#93c5fd', marginBottom: '10px' }}>
                🔵 {terms.switch2}
              </div>
              <div style={{ fontSize: '26px', fontWeight: '900', color: s2 ? '#00f0ff' : '#1e3a8a', textShadow: s2 ? '0 0 12px rgba(0,240,255,0.8)' : 'none' }}>
                {s2 ? '● ON (True)' : '○ OFF (False)'}
              </div>
              <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '8px' }}>
                클릭하여 스위치 전환
              </div>
            </button>
          </div>

          {/* Live Gate Visual State */}
          <div
            style={{
              padding: '24px',
              borderRadius: '14px',
              background: bridgeOpen ? 'rgba(16, 185, 129, 0.15)' : 'rgba(0, 0, 0, 0.4)',
              border: bridgeOpen ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.1)',
              textAlign: 'center',
              marginBottom: '22px',
              transition: 'all 0.2s ease',
            }}
          >
            <div style={{ fontSize: '13px', color: '#94a3b8', marginBottom: '6px' }}>
              현재 스위치 상태에 따른 {terms.result} 결과
            </div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: bridgeOpen ? '#10b981' : '#94a3b8' }}>
              {bridgeOpen ? '🔓 🚀 게이트가 열렸습니다! (PASS)' : '🔒 게이트가 닫혀있습니다 (LOCKED)'}
            </div>
          </div>

          {/* 4-Case Discovery Checklist (내가 확인한 결과) */}
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc' }}>
                📝 내가 확인한 결과 ({visitedCases.size} / 4 확인 완료)
              </span>
              <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                스위치를 눌러 4가지를 모두 밝혀보세요
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px' }}>
              {/* OFF / OFF */}
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: visitedCases.has('false_false') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.04)', border: visitedCases.has('false_false') ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔴 OFF &nbsp; 🔵 OFF</span>
                <span style={{ fontWeight: 'bold', color: visitedCases.has('false_false') ? '#fca5a5' : '#64748b' }}>
                  {visitedCases.has('false_false') ? '🔒 닫힘' : '⏳ 미확인'}
                </span>
              </div>

              {/* ON / OFF */}
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: visitedCases.has('true_false') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.04)', border: visitedCases.has('true_false') ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔴 ON &nbsp; 🔵 OFF</span>
                <span style={{ fontWeight: 'bold', color: visitedCases.has('true_false') ? '#fca5a5' : '#64748b' }}>
                  {visitedCases.has('true_false') ? '🔒 닫힘' : '⏳ 미확인'}
                </span>
              </div>

              {/* OFF / ON */}
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: visitedCases.has('false_true') ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 255, 255, 0.04)', border: visitedCases.has('false_true') ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔴 OFF &nbsp; 🔵 ON</span>
                <span style={{ fontWeight: 'bold', color: visitedCases.has('false_true') ? '#fca5a5' : '#64748b' }}>
                  {visitedCases.has('false_true') ? '🔒 닫힘' : '⏳ 미확인'}
                </span>
              </div>

              {/* ON / ON */}
              <div style={{ padding: '12px 14px', borderRadius: '8px', background: visitedCases.has('true_true') ? 'rgba(16, 185, 129, 0.18)' : 'rgba(255, 255, 255, 0.04)', border: visitedCases.has('true_true') ? '1px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>🔴 ON &nbsp; 🔵 ON</span>
                <span style={{ fontWeight: 'bold', color: visitedCases.has('true_true') ? '#34d399' : '#64748b' }}>
                  {visitedCases.has('true_true') ? '🔓 열림' : '⏳ 미확인'}
                </span>
              </div>
            </div>
          </div>

          {/* Rule Discovery Selector (Appears after exploring all 4) */}
          {allSwitchCasesVisited && (
            <div style={{ background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #818cf8' }}>
              <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
                💡 네 가지 결과에서 어떤 규칙이 보이나요?
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[
                  { id: 'any_one', text: '스위치 하나라도 켜지면 열린다.', correct: false },
                  { id: 'both_on', text: '두 스위치가 모두 켜져야(True) 열린다.', correct: true },
                  { id: 'only_red', text: '빨간 스위치만 켜지면 열린다.', correct: false },
                  { id: 'no_rule', text: '일정한 규칙이 없다.', correct: false },
                ].map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    onClick={() => setDiscoveredRule(choice.correct ? 'correct' : 'wrong')}
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
                <div style={{ marginTop: '16px', padding: '12px 16px', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '8px', border: '1px solid #10b981', color: '#a7f3d0', fontSize: '14px' }}>
                  ✨ <strong>규칙 발견 성공!</strong> Python에서는 두 조건이 모두 참이어야 할 때 <strong>`and`</strong> 연산자를 사용합니다. (예: <code>s1 and s2</code>)
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Navigation Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {onBackToObserve && (
          <button
            type="button"
            onClick={onBackToObserve}
            style={{
              padding: '10px 18px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              color: '#fff',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '13px',
            }}
          >
            ← 1단계: 관찰 및 추론으로 복귀
          </button>
        )}

        {onProceedToCode && (
          <button
            type="button"
            onClick={onProceedToCode}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: '#fff',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer',
              fontSize: '14px',
              boxShadow: '0 0 16px rgba(16, 185, 129, 0.35)',
            }}
          >
            3단계: Python 코드로 표현하기 ➔
          </button>
        )}
      </div>
    </div>
  )
}
