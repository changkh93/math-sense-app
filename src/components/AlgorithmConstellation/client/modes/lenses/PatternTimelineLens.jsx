import { useEffect, useState } from 'react'

export default function PatternTimelineLens({ kernel, shell = 'explorer', onDiscoveryComplete }) {
  const isBeacon = kernel.world?.type === 'beacon' || kernel.id === 'AC-PAT-004'
  const terms = kernel.shells?.[shell]?.terms || (
    isBeacon
      ? { time: '관측 시간 (초)', result: '우주 등대 빛', resultTrue: '등대 켜짐 (LIGHT ON)', resultFalse: '회전 어두움 (DARK)', choiceTrue: '켜짐', choiceFalse: '어두움' }
      : { time: '현재 시간 (초)', result: '신호 다리', resultTrue: '열림 (통행 가능)', resultFalse: '얼어붙음 (통행 불가)', choiceTrue: '열림', choiceFalse: '얼어붙음' }
  )

  const cycle = kernel.modes?.explore?.lensConfig?.cycleLength || kernel.world?.cycleLength || (isBeacon ? 4 : 3)
  const activeInterval = kernel.modes?.explore?.lensConfig?.activeInterval || kernel.world?.activeInterval || (isBeacon ? 2 : 1)

  const [time, setTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [visitedRemainders, setVisitedRemainders] = useState(() => new Set([0]))
  const [discoveredRule, setDiscoveredRule] = useState(null)

  const remainder = time % cycle
  const isCurrentActive = isBeacon ? remainder < activeInterval : remainder === 0

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

  const allRemaindersVisited = Array.from({ length: cycle }, (_, idx) => idx).every((r) =>
    visitedRemainders.has(r)
  )

  const handleSelectRule = (isCorrect) => {
    const status = isCorrect ? 'correct' : 'wrong'
    setDiscoveredRule(status)
    if (isCorrect) {
      onDiscoveryComplete?.({
        lensId: 'pattern-timeline',
        cycle,
        activeInterval,
      })
    }
  }

  return (
    <div>
      {/* Time Controller */}
      <div style={{ background: 'linear-gradient(145deg, rgba(15, 23, 42, 0.9), rgba(8, 14, 30, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '20px', border: '1px solid rgba(129, 140, 248, 0.35)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '22px' }}>⏱️</span>
            <span style={{ fontSize: '16px', fontWeight: 'bold', color: '#ffffff' }}>
              현재 시간: <span style={{ color: '#00f0ff', fontFamily: 'monospace', fontSize: '24px' }}>{time}초</span>
              <span style={{ marginLeft: '12px', fontSize: '14px', color: '#cbd5e1' }}>
                ({cycle}초 주기 중 <strong style={{ color: '#fef08a' }}>{remainder}초</strong> 위치 ➔ time % {cycle} = {remainder})
              </span>
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

        <input
          type="range"
          min={0}
          max={15}
          value={time}
          onChange={(e) => handleTimeChange(Number(e.target.value))}
          style={{
            width: '100%',
            accentColor: isBeacon ? '#fbbf24' : '#00f0ff',
            cursor: 'pointer',
            marginBottom: '14px',
          }}
        />

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
            {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15].map((t) => {
              const isMatch = isBeacon ? (t % cycle) < activeInterval : (t % cycle) === 0
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => handleTimeChange(t)}
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    border: time === t
                      ? (isBeacon ? '2px solid #fbbf24' : '2px solid #00f0ff')
                      : isMatch
                      ? (isBeacon ? '1px solid rgba(251, 191, 36, 0.4)' : '1px solid rgba(0, 240, 255, 0.3)')
                      : '1px solid rgba(255, 255, 255, 0.1)',
                    background: time === t
                      ? (isBeacon ? '#fbbf24' : '#00f0ff')
                      : isMatch
                      ? (isBeacon ? 'rgba(251, 191, 36, 0.2)' : 'rgba(0, 240, 255, 0.15)')
                      : 'rgba(0, 0, 0, 0.3)',
                    color: time === t ? '#030712' : isMatch ? (isBeacon ? '#fef08a' : '#38bdf8') : '#94a3b8',
                    fontWeight: 'bold',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {t}
                </button>
              )
            })}
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

      {/* Graphic State Box */}
      <div
        style={{
          padding: '24px',
          borderRadius: '16px',
          background: isCurrentActive
            ? (isBeacon
                ? 'radial-gradient(ellipse at center, rgba(251, 191, 36, 0.25) 0%, rgba(30, 25, 10, 0.8) 100%)'
                : 'radial-gradient(ellipse at center, rgba(0, 240, 255, 0.2) 0%, rgba(10, 25, 50, 0.8) 100%)')
            : 'radial-gradient(ellipse at center, rgba(15, 23, 42, 0.4) 0%, rgba(5, 10, 25, 0.9) 100%)',
          border: isCurrentActive ? (isBeacon ? '2px solid #fbbf24' : '2px solid #00f0ff') : '1px solid rgba(148, 163, 184, 0.25)',
          boxShadow: isCurrentActive ? (isBeacon ? '0 0 30px rgba(251, 191, 36, 0.35)' : '0 0 30px rgba(0, 240, 255, 0.25)') : 'none',
          textAlign: 'center',
          marginBottom: '22px',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ fontSize: '36px', marginBottom: '8px' }}>
          {isCurrentActive ? (isBeacon ? '💡' : '⚡') : (isBeacon ? '🌑' : '❄️')}
        </div>
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: isCurrentActive ? (isBeacon ? '#fef08a' : '#00f0ff') : '#94a3b8' }}>
          {isCurrentActive
            ? `🔓 ${terms.resultTrue || '빛 비춤 / 열림'}`
            : `🔒 ${terms.resultFalse || '회전 어두움 / 닫힘'}`}
        </div>
      </div>

      {/* Check list */}
      <div style={{ background: 'rgba(0, 0, 0, 0.4)', borderRadius: '14px', padding: '18px 20px', marginBottom: '22px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#a5f3fc', marginBottom: '12px' }}>
          📝 내가 확인한 {cycle}초 주기 위치별 상태 ({visitedRemainders.size} / {cycle} 확인 완료)
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
          {Array.from({ length: cycle }, (_, r) => {
            const isVisited = visitedRemainders.has(r)
            const isMatch = isBeacon ? r < activeInterval : r === 0
            return (
              <div
                key={r}
                style={{
                  padding: '12px',
                  borderRadius: '8px',
                  background: isVisited
                    ? (isMatch ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)')
                    : 'rgba(255, 255, 255, 0.04)',
                  border: isVisited
                    ? (isMatch ? '1px solid #10b981' : '1px solid #ef4444')
                    : '1px solid rgba(255, 255, 255, 0.1)',
                }}
              >
                <span style={{ fontWeight: 'bold', color: isVisited ? (isMatch ? '#34d399' : '#f87171') : '#94a3b8' }}>
                  {isVisited ? '✅' : '⏳'} time % {cycle} == {r} ({r}초, {r + cycle}초, {r + cycle * 2}초...)
                </span>
                <div style={{ fontSize: '13px', color: isVisited ? (isMatch ? '#a7f3d0' : '#fca5a5') : '#64748b', marginTop: '4px' }}>
                  {isVisited ? (isMatch ? `💡 ${terms.choiceTrue || '켜짐'}` : `🌑 ${terms.choiceFalse || '어두움'}`) : '미확인'}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Discovery Quiz */}
      {allRemaindersVisited && (
        <div style={{ background: 'linear-gradient(145deg, rgba(30, 27, 75, 0.9), rgba(15, 23, 42, 0.9))', borderRadius: '14px', padding: '20px', marginBottom: '22px', border: '1px solid #818cf8' }}>
          <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fef08a', marginBottom: '12px' }}>
            💡 확인한 결과에서 어떤 주기 규칙이 보이나요?
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {(isBeacon
              ? [
                  { id: 'modulo_interval', text: `4초 주기 중 나머지가 2보다 작을 때(0초, 1초) 켜진다.`, correct: true },
                  { id: 'modulo_zero', text: `4초 주기 중 나머지가 0일 때만 켜진다.`, correct: false },
                  { id: 'even_times', text: `모든 짝수 초마다 켜진다.`, correct: false },
                ]
              : [
                  { id: 'modulo_zero', text: `3초 주기 중 나머지가 0일 때만 열린다.`, correct: true },
                  { id: 'only_3', text: `정확히 3초일 때만 한 번 열린다.`, correct: false },
                  { id: 'even_times', text: `짝수 초마다 열린다.`, correct: false },
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
              ✨ <strong>주기 규칙 발견 완료!</strong> 이제 발견한 주기를 코드로 작성해 보세요.
            </div>
          )}
        </div>
      )}
    </div>
  )
}
