import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BrainCircuit,
  Check,
  ChevronRight,
  Delete,
  Eye,
  Map as MapIcon,
  RotateCcw,
  Sparkles,
} from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import { useInteractiveLearningReward } from '../../hooks/useInteractiveLearningReward'
import InteractiveLearningRewardNotice from './InteractiveLearningRewardNotice'
import {
  QUEST_FACTORS,
  QUEST_ZONES,
  buildExpedition,
  canonicalFactId,
  getEncounterPrompt,
  getFactStrategy,
  getMasteryBand,
  getMasteryLabel,
  getZoneById,
  getZoneProgress,
  insertDelayedRetry,
  recommendQuestZone,
  seedMemoryFromCardLab,
  summarizeMemory,
  updateFactMemory,
} from './multiplicationQuestModel'
import './MultiplicationQuestGame.css'

function readJsonStorage(key) {
  try {
    return JSON.parse(window.localStorage.getItem(key)) || {}
  } catch {
    return {}
  }
}

function loadQuestProgress(userId) {
  const identity = userId || 'guest'
  const saved = readJsonStorage(`metasense_multiplication_quest_v1:${identity}`)
  const cardProgress = readJsonStorage(`metasense_times_card_lab_v1:${identity}`)
  return {
    memory: seedMemoryFromCardLab(saved.memory, cardProgress.factStats),
    calmMode: saved.calmMode !== false,
    selectedZoneId: QUEST_ZONES.some(({ id }) => id === saved.selectedZoneId) ? saved.selectedZoneId : null,
    expeditionCount: Math.max(0, Number(saved.expeditionCount) || 0),
  }
}

function NumberPad({ onDigit, onDelete, disabled }) {
  return (
    <div className="mqg-number-pad" aria-label="숫자 키패드">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((digit) => (
        <button type="button" key={digit} onClick={() => onDigit(String(digit))} disabled={disabled}>{digit}</button>
      ))}
      <button type="button" className="mqg-zero-key" onClick={() => onDigit('0')} disabled={disabled}>0</button>
      <button type="button" className="mqg-delete-key" onClick={onDelete} disabled={disabled} aria-label="한 글자 지우기">
        <Delete size={18} />
      </button>
    </div>
  )
}

function MemoryMap({ memory, compact = false }) {
  return (
    <div className={`mqg-memory-map ${compact ? 'is-compact' : ''}`}>
      <div className="mqg-map-corner">×</div>
      {QUEST_FACTORS.map((factor) => <div className="mqg-map-axis" key={`top-${factor}`}>{factor}</div>)}
      {QUEST_FACTORS.flatMap((left) => [
        <div className="mqg-map-axis" key={`left-${left}`}>{left}</div>,
        ...QUEST_FACTORS.map((right) => {
          const factId = canonicalFactId(left, right)
          const stat = memory[factId] || {}
          const band = getMasteryBand(stat)
          return (
            <div
              className={`mqg-memory-cell is-${band}`}
              key={`${left}-${right}`}
              title={`${left} × ${right} · ${getMasteryLabel(stat)}`}
              aria-label={`${left} 곱하기 ${right}, ${getMasteryLabel(stat)}`}
            >
              {compact ? '' : left * right}
            </div>
          )
        }),
      ])}
    </div>
  )
}

function MemoryLegend() {
  return (
    <div className="mqg-memory-legend" aria-label="기억 지도 범례">
      <span><i className="is-seed" />첫 기억</span>
      <span><i className="is-growing" />자라는 중</span>
      <span><i className="is-steady" />거의 연결</span>
      <span><i className="is-mastered" />단단한 기억</span>
    </div>
  )
}

function ZoneMap({ memory, selectedZoneId, recommendedZoneId, onSelect }) {
  return (
    <div className="mqg-zone-grid">
      {QUEST_ZONES.map((zone) => {
        const selected = selectedZoneId === zone.id
        const recommended = recommendedZoneId === zone.id
        return (
          <button
            type="button"
            key={zone.id}
            className={`mqg-zone-card ${selected ? 'is-selected' : ''}`}
            style={{ '--zone-color': zone.color }}
            onClick={() => onSelect(zone.id)}
            aria-pressed={selected}
          >
            <span className="mqg-zone-icon" aria-hidden="true">{zone.icon}</span>
            <span>
              <small>{recommended ? '오늘의 추천 경로' : zone.shortName}</small>
              <strong>{zone.name}</strong>
              <em>{zone.action}</em>
            </span>
            <span className="mqg-zone-progress" aria-label={`기억 연결 ${getZoneProgress(zone, memory)}퍼센트`}>
              <i style={{ width: `${getZoneProgress(zone, memory)}%` }} />
              <b>{getZoneProgress(zone, memory)}%</b>
            </span>
          </button>
        )
      })}
    </div>
  )
}

function StrategyPanel({ fact, showAnswer = false }) {
  const strategy = getFactStrategy(fact)
  return (
    <div className={`mqg-strategy ${showAnswer ? 'is-revealed' : ''}`}>
      <span className="mqg-strategy-icon" aria-hidden="true">🧠</span>
      <div>
        <small>기억 발판 · {strategy.title}</small>
        <strong>{showAnswer ? strategy.equation : strategy.hintEquation}</strong>
        <p>{strategy.explanation}</p>
      </div>
    </div>
  )
}

function MultiplicationPair({ fact }) {
  const { a, b, product } = fact
  return (
    <div className="mqg-fact-family" aria-label="곱셈 순서 연결">
      <span>{a} × {b} = {product}</span>
      <span>{b} × {a} = {product}</span>
    </div>
  )
}

export default function MultiplicationQuestGame({ userId, onExit }) {
  const storageKey = `metasense_multiplication_quest_v1:${userId || 'guest'}`
  const saved = useMemo(() => loadQuestProgress(userId), [userId])
  const [memory, setMemory] = useState(saved.memory)
  const [calmMode, setCalmMode] = useState(saved.calmMode)
  const [selectedZoneId, setSelectedZoneId] = useState(saved.selectedZoneId)
  const [expeditionCount, setExpeditionCount] = useState(saved.expeditionCount)
  const [screen, setScreen] = useState('map')
  const [expedition, setExpedition] = useState(null)
  const [queue, setQueue] = useState([])
  const [missionIndex, setMissionIndex] = useState(0)
  const [answer, setAnswer] = useState('')
  const [result, setResult] = useState(null)
  const [usedHint, setUsedHint] = useState(false)
  const [session, setSession] = useState({ correct: 0, wrong: 0, hints: 0, streak: 0, bestStreak: 0, recovered: [] })
  const answerRef = useRef(null)
  const startedAtRef = useRef(0)
  const { claimCompletion, rewardState, resetRewardState } = useInteractiveLearningReward(userId)

  const recommendedZone = useMemo(() => recommendQuestZone(memory), [memory])
  const activeZoneId = selectedZoneId || recommendedZone.id
  const activeZone = getZoneById(activeZoneId)
  const currentMission = queue[missionIndex]
  const prompt = currentMission ? getEncounterPrompt(currentMission) : null
  const memorySummary = useMemo(() => summarizeMemory(memory), [memory])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({
      memory,
      calmMode,
      selectedZoneId: activeZoneId,
      expeditionCount,
    }))
  }, [activeZoneId, calmMode, expeditionCount, memory, storageKey])

  useEffect(() => {
    if (screen !== 'mission' || result) return undefined
    startedAtRef.current = Date.now()
    const timer = window.setTimeout(() => answerRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [missionIndex, result, screen])

  const chooseZone = (zoneId) => {
    setSelectedZoneId(zoneId)
    soundManager.playClick?.()
  }

  const beginExpedition = () => {
    const nextExpedition = buildExpedition(memory, { zoneId: activeZoneId })
    setExpedition(nextExpedition)
    setQueue(nextExpedition.missions)
    setMissionIndex(0)
    setAnswer('')
    setResult(null)
    setUsedHint(false)
    setSession({ correct: 0, wrong: 0, hints: 0, streak: 0, bestStreak: 0, recovered: [] })
    resetRewardState()
    setScreen('mission')
    startedAtRef.current = Date.now()
    soundManager.playWarp?.()
  }

  const revealHint = () => {
    if (!currentMission || result || usedHint) return
    setUsedHint(true)
    soundManager.playClick?.()
  }

  const submitAnswer = (event) => {
    event?.preventDefault()
    if (!currentMission || !prompt || answer === '' || result) return
    const numericAnswer = Number(answer)
    const correct = numericAnswer === prompt.answer
    const responseMs = Date.now() - startedAtRef.current
    const previousBand = getMasteryBand(memory[currentMission.fact.id])
    const updatedMemory = updateFactMemory(memory, currentMission.fact, {
      correct,
      usedHint,
      responseMs,
      mode: currentMission.mode,
    })
    const nextBand = getMasteryBand(updatedMemory[currentMission.fact.id])
    const newlyRecovered = previousBand !== 'mastered' && nextBand === 'mastered'

    setMemory(updatedMemory)
    if (!correct) setQueue((current) => insertDelayedRetry(current, missionIndex, currentMission))
    setSession((current) => {
      const nextStreak = correct ? current.streak + 1 : 0
      return {
        correct: current.correct + (correct ? 1 : 0),
        wrong: current.wrong + (correct ? 0 : 1),
        hints: current.hints + (usedHint ? 1 : 0),
        streak: nextStreak,
        bestStreak: Math.max(current.bestStreak, nextStreak),
        recovered: newlyRecovered && !current.recovered.includes(currentMission.fact.id)
          ? [...current.recovered, currentMission.fact.id]
          : current.recovered,
      }
    })
    setResult({ correct, given: numericAnswer, expected: prompt.answer, newlyRecovered })

    if (correct) {
      claimCompletion({
        activityId: 'multiplication_cards',
        completionKey: `card-${currentMission.fact.id}`,
        metrics: {
          table: currentMission.fact.a,
          multiplier: currentMission.fact.b,
          answer: currentMission.fact.product,
          mode: currentMission.mode,
          usedHint,
          responseMs,
          source: 'multiplication_quest',
        },
      })
      soundManager.playCorrect?.()
    } else {
      soundManager.playWrong?.()
    }
  }

  const advanceMission = () => {
    if (missionIndex < queue.length - 1) {
      setMissionIndex((index) => index + 1)
      setAnswer('')
      setResult(null)
      setUsedHint(false)
      resetRewardState()
      soundManager.playClick?.()
      return
    }
    setExpeditionCount((count) => count + 1)
    setScreen('complete')
    soundManager.playLevelUp?.()
  }

  const returnToMap = () => {
    setScreen('map')
    setExpedition(null)
    setQueue([])
    setAnswer('')
    setResult(null)
    setUsedHint(false)
    resetRewardState()
    soundManager.playClick?.()
  }

  return (
    <div className={`mqg-shell ${calmMode ? 'is-calm' : ''}`} style={{ '--zone-color': expedition?.zone?.color || activeZone.color }}>
      <header className="mqg-header">
        <button type="button" className="mqg-back" onClick={screen === 'map' ? onExit : returnToMap}>
          <ArrowLeft size={18} /> <span>{screen === 'map' ? '멀티플루비아로' : '세계 지도'}</span>
        </button>
        <div className="mqg-brand">
          <small>MEMORY EXPEDITION</small>
          <strong>구구단 원정대</strong>
        </div>
        <button
          type="button"
          className={`mqg-calm-toggle ${calmMode ? 'is-on' : ''}`}
          onClick={() => setCalmMode((value) => !value)}
          aria-pressed={calmMode}
        >
          <Eye size={16} /> <span>차분 모드 {calmMode ? 'ON' : 'OFF'}</span>
        </button>
      </header>

      {screen === 'map' && (
        <main className="mqg-map-screen">
          <section className="mqg-hero-card">
            <div className="mqg-hero-copy">
              <span className="mqg-kicker"><Sparkles size={15} /> 불빛 카드 다음 모험</span>
              <h1>외운 답을 꺼내<br /><em>세계를 움직여요.</em></h1>
              <p>빨리 풀지 않아도 괜찮아요. 원정대가 나에게 필요한 곱셈을 골라, 다른 모습으로 다시 만나게 해요.</p>
              <div className="mqg-engine-chips">
                <span>약점 자동 선택</span><span>곱셈 순서 연결</span><span>세 장 뒤 재도전</span>
              </div>
            </div>
            <div className="mqg-hero-orbit" aria-hidden="true">
              <div className="mqg-orbit-ring"><span>7×8</span><span>7×4+7×4</span><span>8×7</span></div>
              <div className="mqg-orbit-core">56</div>
            </div>
          </section>

          <section className="mqg-dashboard-grid">
            <article className="mqg-route-panel">
              <div className="mqg-section-heading">
                <span><MapIcon size={18} /></span>
                <div><small>오늘 떠날 곳을 골라요</small><h2>잃어버린 숫자의 세계</h2></div>
              </div>
              <ZoneMap
                memory={memory}
                selectedZoneId={activeZoneId}
                recommendedZoneId={recommendedZone.id}
                onSelect={chooseZone}
              />
              <div className="mqg-launch-row">
                <div>
                  <small>선택한 원정</small>
                  <strong>{activeZone.icon} {activeZone.name}</strong>
                  <span>8개 임무 + 기억의 수호룡 2개 관문</span>
                </div>
                <button type="button" className="mqg-launch" onClick={beginExpedition}>
                  원정 시작 <ChevronRight size={20} />
                </button>
              </div>
            </article>

            <aside className="mqg-memory-panel">
              <div className="mqg-section-heading">
                <span><BrainCircuit size={18} /></span>
                <div><small>나만의 학습 기록</small><h2>기억 지도</h2></div>
              </div>
              <MemoryMap memory={memory} />
              <MemoryLegend />
              <div className="mqg-memory-summary">
                <span><strong>{memorySummary.averageMastery}%</strong>전체 연결</span>
                <span><strong>{memorySummary.mastered}</strong>단단한 기억</span>
                <span><strong>{expeditionCount}</strong>완료한 원정</span>
              </div>
            </aside>
          </section>
        </main>
      )}

      {screen === 'mission' && currentMission && prompt && (
        <main className="mqg-mission-screen">
          <div className="mqg-mission-topbar">
            <div>
              <small>{expedition.zone.icon} {expedition.zone.name}</small>
              <strong>{currentMission.isBoss ? '최종 관문' : `${missionIndex + 1}번째 임무`} · {currentMission.scene.title}</strong>
            </div>
            <div className="mqg-route-progress" aria-label={`전체 ${queue.length}개 중 ${missionIndex + 1}번째`}>
              <i style={{ width: `${((missionIndex + (result ? 1 : 0)) / queue.length) * 100}%` }} />
            </div>
            <span>{missionIndex + 1}/{queue.length}</span>
          </div>

          <section className={`mqg-game-stage ${currentMission.isBoss ? 'is-boss' : ''} ${result ? 'has-result' : ''}`}>
            <div className="mqg-scene" aria-hidden="true">
              <div className="mqg-planet-glow" />
              <span className="mqg-scene-landmark">{currentMission.scene.icon}</span>
              <span className="mqg-rover">🚀</span>
              {!calmMode && <><i className="mqg-star star-one" /><i className="mqg-star star-two" /><i className="mqg-star star-three" /></>}
            </div>

            <article className="mqg-challenge-card">
              <div className="mqg-challenge-kicker">
                <span>{currentMission.scene.icon} {currentMission.scene.title}</span>
                <small>{prompt.kind}</small>
              </div>
              <p className="mqg-instruction">{currentMission.scene.instruction}</p>

              <div className="mqg-expression" aria-label={`${prompt.expression}의 답`}>
                {prompt.expression}{prompt.hasAnswerSuffix !== false && <b>= ?</b>}
              </div>

              {!result && (
                <>
                  <form className="mqg-answer-form" onSubmit={submitAnswer}>
                    <label htmlFor="mqg-answer">내가 찾은 수</label>
                    <div>
                      <input
                        ref={answerRef}
                        id="mqg-answer"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        maxLength={3}
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value.replace(/\D/g, '').slice(0, 3))}
                        aria-describedby="mqg-no-timer"
                      />
                      <button type="submit" disabled={!answer}>별빛 보내기</button>
                    </div>
                    <small id="mqg-no-timer">화면에는 시간이 없어요. 생각이 연결되면 답해요.</small>
                  </form>
                  <NumberPad
                    onDigit={(digit) => setAnswer((current) => `${current}${digit}`.slice(0, 3))}
                    onDelete={() => setAnswer((current) => current.slice(0, -1))}
                  />
                  {usedHint ? (
                    <StrategyPanel fact={currentMission.fact} />
                  ) : (
                    <button type="button" className="mqg-hint-button" onClick={revealHint}>
                      <Sparkles size={16} /> 답 대신 생각의 발판 보기
                    </button>
                  )}
                </>
              )}

              {result && (
                <div className={`mqg-result ${result.correct ? 'is-correct' : 'is-retry'}`} aria-live="polite">
                  <div className="mqg-result-title">
                    <span>{result.correct ? <Check size={28} /> : '🌱'}</span>
                    <div>
                      <small>{result.correct ? '별빛 연결 성공' : '기억 씨앗을 심었어요'}</small>
                      <h2>{result.correct ? `${prompt.expression} = ${result.expected}` : '괜찮아요. 세 장 뒤에 다시 만나요.'}</h2>
                    </div>
                  </div>
                  {!result.correct && <p className="mqg-given">내가 쓴 답 {result.given} · 연결할 답 {result.expected}</p>}
                  <StrategyPanel fact={currentMission.fact} showAnswer />
                  <MultiplicationPair fact={currentMission.fact} />
                  {result.newlyRecovered && <div className="mqg-recovered"><Sparkles size={16} /> 이 곱셈이 ‘단단한 기억’이 되었어요!</div>}
                  <InteractiveLearningRewardNotice state={rewardState} />
                  <button type="button" className="mqg-next" onClick={advanceMission}>
                    {missionIndex < queue.length - 1 ? '다음 장면으로' : '원정 기록 보기'} <ChevronRight size={19} />
                  </button>
                </div>
              )}
            </article>

            {!calmMode && (
              <aside className="mqg-streak-card">
                <small>연결 별빛</small>
                <strong>{session.streak}</strong>
                <span>틀려도 잃지 않아요.<br />다음 연결을 시작해요.</span>
              </aside>
            )}
          </section>
        </main>
      )}

      {screen === 'complete' && expedition && (
        <main className="mqg-complete-screen">
          <section className="mqg-complete-card">
            <div className="mqg-complete-emblem">{expedition.zone.icon}<span>✦</span></div>
            <small>EXPEDITION COMPLETE</small>
            <h1>{expedition.zone.name}의<br /><em>별문이 다시 열렸어요!</em></h1>
            <p>맞고 틀린 횟수보다, 끝까지 다시 연결한 것이 오늘의 진짜 기록이에요.</p>
            <div className="mqg-complete-stats">
              <span><strong>{session.correct}</strong>별빛 연결</span>
              <span><strong>{session.wrong}</strong>다시 생각</span>
              <span><strong>{session.recovered.length}</strong>단단해진 기억</span>
            </div>
            <div className="mqg-complete-memory">
              <div><small>원정 후 기억 지도</small><strong>{memorySummary.averageMastery}% 연결</strong></div>
              <MemoryMap memory={memory} compact />
            </div>
            <div className="mqg-complete-actions">
              <button type="button" className="mqg-launch" onClick={beginExpedition}>
                약한 기억으로 한 번 더 <RotateCcw size={18} />
              </button>
              <button type="button" onClick={returnToMap}>다른 세계 고르기</button>
              <button type="button" onClick={onExit}>멀티플루비아로 돌아가기</button>
            </div>
          </section>
        </main>
      )}
    </div>
  )
}
