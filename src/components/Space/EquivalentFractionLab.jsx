import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  GripVertical,
  Layers3,
  RefreshCcw,
  Sparkles,
} from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import { useInteractiveLearningReward } from '../../hooks/useInteractiveLearningReward'
import InteractiveLearningRewardNotice from './InteractiveLearningRewardNotice'
import {
  EQUIVALENT_FRACTION_MISSIONS,
  buildEquivalentFraction,
  buildFractionGrid,
  clampOverlayProgress,
  getEquivalentFractionSentence,
  validateEquivalentFractionAnswer,
} from './equivalentFractionLabModel'
import './EquivalentFractionLab.css'

const EMPTY_PROGRESS = { completed: [], missionIndex: 0 }

function loadProgress(storageKey) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey))
    if (!stored || !Array.isArray(stored.completed)) return EMPTY_PROGRESS
    return {
      completed: stored.completed.filter((id) => EQUIVALENT_FRACTION_MISSIONS.some((mission) => mission.id === id)),
      missionIndex: Math.min(
        EQUIVALENT_FRACTION_MISSIONS.length - 1,
        Math.max(0, Number(stored.missionIndex) || 0),
      ),
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

function Fraction({ numerator, denominator, label, question = false, compact = false }) {
  const accessibleLabel = label || (question ? '새 분수의 분자와 분모' : `${denominator}분의 ${numerator}`)
  return (
    <span className={`efl-fraction ${compact ? 'is-compact' : ''}`} aria-label={accessibleLabel}>
      <span>{question ? '?' : numerator}</span>
      <span>{question ? '?' : denominator}</span>
    </span>
  )
}

function FractionEquation({ fraction, reveal, answerNumerator, answerDenominator, answerState }) {
  return (
    <div className="efl-equation" aria-label={reveal ? getEquivalentFractionSentence(fraction) : '겹치면 같은 크기 분수가 나타납니다'}>
      <Fraction numerator={fraction.numerator} denominator={fraction.denominator} />
      <span className="efl-equation-symbol">=</span>
      {reveal ? (
        <Fraction
          numerator={answerNumerator || fraction.equivalentNumerator}
          denominator={answerDenominator || fraction.equivalentDenominator}
        />
      ) : (
        <Fraction question />
      )}
      <span className="efl-equation-factor">분자 ×{fraction.factor}<br />분모 ×{fraction.factor}</span>
      {answerState === 'correct' && <Check className="efl-equation-check" size={27} strokeWidth={3} />}
    </div>
  )
}

function CardStage({ fraction, overlayProgress, setOverlayProgress, reveal, reducedMotion }) {
  const stageRef = useRef(null)
  const dragRef = useRef(null)
  const cells = useMemo(
    () => buildFractionGrid(fraction.numerator, fraction.denominator, fraction.factor),
    [fraction.denominator, fraction.factor, fraction.numerator],
  )
  const overlayLeft = 52 - overlayProgress * 46

  const startDrag = (event) => {
    event.currentTarget.setPointerCapture?.(event.pointerId)
    dragRef.current = { x: event.clientX, progress: overlayProgress }
  }

  const moveDrag = (event) => {
    if (!dragRef.current) return
    const width = stageRef.current?.getBoundingClientRect().width || 600
    const delta = (dragRef.current.x - event.clientX) / (width * 0.46)
    setOverlayProgress(clampOverlayProgress(dragRef.current.progress + delta))
  }

  const finishDrag = () => {
    if (!dragRef.current) return
    dragRef.current = null
    setOverlayProgress((current) => (current > 0.7 ? 1 : current < 0.18 ? 0 : current))
  }

  return (
    <div className="efl-stage" ref={stageRef}>
      <div className="efl-stage-caption is-paper"><span>종이카드</span><strong>{fraction.numerator}/{fraction.denominator}</strong></div>
      <div className="efl-paper-card" style={{ '--rows': fraction.denominator }} aria-label={`${fraction.denominator}칸 중 ${fraction.numerator}칸이 색칠된 종이카드`}>
        {Array.from({ length: fraction.denominator }, (_, row) => (
          <span key={row} className={row < fraction.numerator ? 'is-shaded' : ''} />
        ))}
      </div>

      <button
        type="button"
        className={`efl-overlay-card ${reveal ? 'is-snapped' : ''}`}
        style={{ left: `${overlayLeft}%`, '--columns': fraction.factor }}
        onPointerDown={startDrag}
        onPointerMove={moveDrag}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        aria-label={`세로로 ${fraction.factor}칸인 투명카드. 왼쪽으로 끌어 종이카드와 겹치세요.`}
      >
        <span className="efl-overlay-label"><Layers3 size={16} /> 투명카드 · {fraction.factor}칸</span>
        <span className="efl-overlay-grip"><GripVertical size={24} /><em>{reveal ? '딱 맞았어요!' : '왼쪽으로 끌어요'}</em></span>
        {Array.from({ length: fraction.factor }, (_, column) => <i key={column} />)}
      </button>

      {reveal && (
        <div
          className={`efl-result-grid ${reducedMotion ? 'no-motion' : ''}`}
          style={{ '--rows': fraction.denominator, '--columns': fraction.factor }}
          aria-hidden="true"
        >
          {cells.map((cell) => <i key={cell.id} className={cell.shaded ? 'is-shaded' : ''} />)}
        </div>
      )}

      <div className={`efl-size-lock ${reveal ? 'is-visible' : ''}`}>
        <span aria-hidden="true">↔</span>
        <strong>색칠한 넓이는 그대로</strong>
      </div>
    </div>
  )
}

function MissionRail({ completed, missionIndex, onSelect }) {
  const firstIncomplete = EQUIVALENT_FRACTION_MISSIONS.findIndex((mission) => !completed.includes(mission.id))
  const unlockedThrough = firstIncomplete === -1 ? EQUIVALENT_FRACTION_MISSIONS.length - 1 : firstIncomplete
  return (
    <nav className="efl-mission-rail" aria-label="같은 크기 분수 탐구 목록">
      {EQUIVALENT_FRACTION_MISSIONS.map((mission, index) => {
        const complete = completed.includes(mission.id)
        const unlocked = complete || index <= unlockedThrough
        return (
          <button
            type="button"
            key={mission.id}
            className={`${missionIndex === index ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`}
            disabled={!unlocked}
            onClick={() => onSelect(index)}
            aria-label={`${index + 1}번 탐구 ${mission.title}${complete ? ', 완료' : unlocked ? '' : ', 잠김'}`}
          >
            <span>{complete ? <Check size={15} strokeWidth={3} /> : index + 1}</span>
            <small>{mission.title}</small>
          </button>
        )
      })}
    </nav>
  )
}

function AnswerPanel({ mission, fraction, snapped, answerNumerator, answerDenominator, setAnswerNumerator, setAnswerDenominator, answerState, feedback, onCheck, onNext, isLast, rewardState }) {
  return (
    <section className={`efl-answer-panel ${snapped ? 'is-ready' : ''}`}>
      <div className="efl-answer-heading">
        <span><Sparkles size={17} /> 이제 작은 방을 세어 봐요</span>
        <strong>{mission.prompt}</strong>
      </div>
      <div className="efl-answer-equation">
        <Fraction numerator={fraction.numerator} denominator={fraction.denominator} compact />
        <span className="efl-answer-equals" aria-hidden="true">=</span>
        <label className={answerState === 'wrong-numerator' ? 'has-error' : ''}>
          <span>색칠한 방</span>
          <input
            value={answerNumerator}
            onChange={(event) => setAnswerNumerator(event.target.value.replace(/\D/g, '').slice(0, 2))}
            inputMode="numeric"
            disabled={!snapped || answerState === 'correct'}
            aria-label="새 분자"
            placeholder="?"
          />
        </label>
        <span className="efl-answer-bar" aria-hidden="true" />
        <label className={answerState === 'wrong-denominator' ? 'has-error' : ''}>
          <span>전체 방</span>
          <input
            value={answerDenominator}
            onChange={(event) => setAnswerDenominator(event.target.value.replace(/\D/g, '').slice(0, 2))}
            inputMode="numeric"
            disabled={!snapped || answerState === 'correct'}
            aria-label="새 분모"
            placeholder="?"
          />
        </label>
      </div>
      <p className={`efl-feedback ${answerState === 'correct' ? 'is-correct' : ''}`} role="status" aria-live="polite">
        {feedback || (snapped ? '색칠한 방과 전체 방을 차례로 세어 쓰세요.' : '먼저 투명카드를 종이카드 위에 꼭 맞게 겹쳐 보세요.')}
      </p>
      <InteractiveLearningRewardNotice state={rewardState} />
      {answerState === 'correct' ? (
        <button type="button" className="efl-primary-action" onClick={onNext}>
          {isLast ? '탐구 결과 보기' : '다음 탐구'} <ChevronRight size={20} />
        </button>
      ) : (
        <button type="button" className="efl-primary-action" onClick={onCheck} disabled={!snapped || !answerNumerator || !answerDenominator}>
          같은 크기인지 확인하기 <ChevronRight size={20} />
        </button>
      )}
    </section>
  )
}

function EquivalentFractionLab({ userId, onExit }) {
  const storageKey = `metasense_equivalent_fraction_lab_v1:${userId || 'guest'}`
  const saved = useMemo(() => loadProgress(storageKey), [storageKey])
  const [mode, setMode] = useState('guide')
  const [completed, setCompleted] = useState(saved.completed)
  const [missionIndex, setMissionIndex] = useState(saved.missionIndex)
  const [overlayProgress, setOverlayProgress] = useState(0)
  const [answerNumerator, setAnswerNumerator] = useState('')
  const [answerDenominator, setAnswerDenominator] = useState('')
  const [answerState, setAnswerState] = useState('idle')
  const [feedback, setFeedback] = useState('')
  const [showSummary, setShowSummary] = useState(false)
  const [exploreNumerator, setExploreNumerator] = useState(1)
  const [exploreDenominator, setExploreDenominator] = useState(2)
  const [exploreFactor, setExploreFactor] = useState(3)
  const [reducedMotion, setReducedMotion] = useState(() => (
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
  ))
  const { claimCompletion, rewardState, resetRewardState } = useInteractiveLearningReward(userId)

  const mission = EQUIVALENT_FRACTION_MISSIONS[missionIndex]
  const activeConfig = mode === 'guide'
    ? mission
    : { numerator: exploreNumerator, denominator: exploreDenominator, factor: exploreFactor }
  const fraction = useMemo(
    () => buildEquivalentFraction(activeConfig.numerator, activeConfig.denominator, activeConfig.factor),
    [activeConfig.denominator, activeConfig.factor, activeConfig.numerator],
  )
  const snapped = overlayProgress >= 0.999
  const showResult = snapped && (mode === 'explore' || answerState === 'correct')

  useEffect(() => {
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const listener = (event) => setReducedMotion(event.matches)
    media?.addEventListener?.('change', listener)
    return () => media?.removeEventListener?.('change', listener)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ completed, missionIndex }))
  }, [completed, missionIndex, storageKey])

  const resetExperiment = (playSound = false) => {
    setOverlayProgress(0)
    setAnswerNumerator('')
    setAnswerDenominator('')
    setAnswerState('idle')
    setFeedback('')
    if (playSound) soundManager.playClick?.()
  }

  const selectMission = (index) => {
    setMissionIndex(index)
    setShowSummary(false)
    resetRewardState()
    resetExperiment()
    soundManager.playClick?.()
  }

  const setModeAndReset = (nextMode) => {
    setMode(nextMode)
    setShowSummary(false)
    resetRewardState()
    resetExperiment()
    soundManager.playClick?.()
  }

  const slideOverlay = () => {
    setOverlayProgress(1)
    soundManager.playClick?.()
  }

  const checkAnswer = () => {
    const result = validateEquivalentFractionAnswer(mission, answerNumerator, answerDenominator)
    if (result.correct) {
      const nextCompleted = completed.includes(mission.id) ? completed : [...completed, mission.id]
      setCompleted(nextCompleted)
      setAnswerState('correct')
      setFeedback(`${mission.observation} 그래서 ${fraction.numerator}/${fraction.denominator} = ${fraction.equivalentNumerator}/${fraction.equivalentDenominator}이에요!`)
      claimCompletion({
        activityId: 'equivalent_fractions',
        completionKey: `mission-${missionIndex + 1}`,
        metrics: {
          missionNumber: missionIndex + 1,
          sourceFraction: `${fraction.numerator}/${fraction.denominator}`,
          equivalentFraction: `${fraction.equivalentNumerator}/${fraction.equivalentDenominator}`,
          factor: fraction.factor,
        },
      })
      soundManager.playCorrect?.()
      return
    }
    if (!result.numeratorCorrect && result.denominatorCorrect) {
      setAnswerState('wrong-numerator')
      setFeedback(`전체 방 ${result.expectedDenominator}칸 중에서 파란 방만 다시 세어 볼까요?`)
    } else if (result.numeratorCorrect && !result.denominatorCorrect) {
      setAnswerState('wrong-denominator')
      setFeedback(`파란 방은 맞았어요. 흰 방까지 모두 세면 전체 방은 몇 칸일까요?`)
    } else {
      setAnswerState('wrong-both')
      setFeedback(`가로 ${fraction.denominator}줄, 세로 ${fraction.factor}칸이에요. 파란 방과 전체 방을 천천히 다시 세어 봐요.`)
    }
    soundManager.playWrong?.()
  }

  const goNext = () => {
    if (missionIndex === EQUIVALENT_FRACTION_MISSIONS.length - 1) {
      setShowSummary(true)
      soundManager.playCorrect?.()
      return
    }
    selectMission(missionIndex + 1)
  }

  const updateExploreDenominator = (value) => {
    const denominator = Number(value)
    setExploreDenominator(denominator)
    setExploreNumerator((current) => Math.min(current, denominator - 1))
    resetExperiment()
  }

  return (
    <main className="efl-page">
      <header className="efl-topbar">
        <button type="button" className="efl-back" onClick={onExit}><ArrowLeft size={20} /> 분수 행성으로</button>
        <div className="efl-brand"><span>FRACTONIS LAB</span><strong>분수 겹침 렌즈</strong></div>
        <div className="efl-progress-badge"><Eye size={17} /> {completed.length}/{EQUIVALENT_FRACTION_MISSIONS.length} 발견</div>
      </header>

      <section className="efl-hero">
        <span className="efl-hero-kicker">같은 크기 분수 관찰실</span>
        <h1>선을 더 그었는데, 왜 크기는 그대로일까요?</h1>
        <p>종이카드 위에 투명카드를 겹쳐 보세요. 작은 방의 수가 바뀌는 순간을 눈으로 확인할 수 있어요.</p>
        <div className="efl-mode-switch" aria-label="학습 방법 선택">
          <button type="button" className={mode === 'guide' ? 'is-active' : ''} onClick={() => setModeAndReset('guide')}>왕새우쌤과 발견하기</button>
          <button type="button" className={mode === 'explore' ? 'is-active' : ''} onClick={() => setModeAndReset('explore')}>내 마음대로 관찰</button>
        </div>
      </section>

      {mode === 'guide' && <MissionRail completed={completed} missionIndex={missionIndex} onSelect={selectMission} />}

      {showSummary && mode === 'guide' ? (
        <section className="efl-summary">
          <span className="efl-summary-orbit" aria-hidden="true"><Sparkles size={40} /></span>
          <small>6개의 렌즈 탐구 완료</small>
          <h2>같은 크기 분수의 비밀을 발견했어요!</h2>
          <div className="efl-rule-card">
            <strong>분자와 분모에 같은 수를 곱하면</strong>
            <span>방은 더 작고 많아지지만, 색칠한 전체 크기는 그대로예요.</span>
          </div>
          <button type="button" className="efl-primary-action" onClick={() => setModeAndReset('explore')}>내 분수로 실험하기 <ChevronRight size={20} /></button>
          <button type="button" className="efl-text-action" onClick={() => selectMission(0)}><RefreshCcw size={16} /> 처음부터 다시 보기</button>
        </section>
      ) : (
        <div className="efl-workspace">
          <section className="efl-observation-card">
            <div className="efl-coach-row">
              <span className="efl-coach-avatar">왕새우<br />쌤</span>
              <div>
                <small>{mode === 'guide' ? `탐구 ${missionIndex + 1} · ${mission.title}` : '자유 관찰'}</small>
                <strong>{mode === 'guide' ? '투명카드의 손잡이를 잡고 왼쪽으로 끌어 보세요.' : '분수와 렌즈 칸 수를 바꾸고 직접 겹쳐 보세요.'}</strong>
              </div>
            </div>

            {mode === 'explore' && (
              <div className="efl-explore-controls">
                <label>
                  <span>전체를 몇 칸으로?</span>
                  <select value={exploreDenominator} onChange={(event) => updateExploreDenominator(event.target.value)}>
                    {[2, 3, 4, 5, 6, 7, 8].map((value) => <option key={value} value={value}>{value}칸</option>)}
                  </select>
                </label>
                <label>
                  <span>몇 칸을 색칠할까요?</span>
                  <select value={exploreNumerator} onChange={(event) => { setExploreNumerator(Number(event.target.value)); resetExperiment() }}>
                    {Array.from({ length: exploreDenominator - 1 }, (_, index) => index + 1).map((value) => <option key={value} value={value}>{value}칸</option>)}
                  </select>
                </label>
                <fieldset>
                  <legend>투명카드 세로 칸</legend>
                  {[2, 3, 4, 5].map((value) => (
                    <button type="button" key={value} className={exploreFactor === value ? 'is-active' : ''} onClick={() => { setExploreFactor(value); resetExperiment() }}>{value}칸</button>
                  ))}
                </fieldset>
              </div>
            )}

            <FractionEquation
              fraction={fraction}
              reveal={showResult}
              answerNumerator={answerNumerator}
              answerDenominator={answerDenominator}
              answerState={answerState}
            />

            <CardStage
              fraction={fraction}
              overlayProgress={overlayProgress}
              setOverlayProgress={setOverlayProgress}
              reveal={snapped}
              reducedMotion={reducedMotion}
            />

            <div className="efl-overlay-controls">
              <label>
                <span>투명카드 위치</span>
                <input type="range" min="0" max="100" value={Math.round(overlayProgress * 100)} onChange={(event) => setOverlayProgress(Number(event.target.value) / 100)} />
              </label>
              <button type="button" onClick={snapped ? () => resetExperiment(true) : slideOverlay}>
                {snapped ? <><RefreshCcw size={17} /> 다시 떼어 보기</> : <><Layers3 size={17} /> 자동으로 겹치기</>}
              </button>
            </div>

            <div className={`efl-discovery-strip ${snapped ? 'is-revealed' : ''}`} aria-live="polite">
              <div><small>색칠한 방</small><strong>{snapped ? `${fraction.numerator} × ${fraction.factor} = ${showResult ? fraction.shadedCells : '?'}` : `${fraction.numerator}칸`}</strong></div>
              <span>둘 다 <b>{fraction.factor}배</b></span>
              <div><small>전체 방</small><strong>{snapped ? `${fraction.denominator} × ${fraction.factor} = ${showResult ? fraction.totalCells : '?'}` : `${fraction.denominator}칸`}</strong></div>
            </div>
          </section>

          {mode === 'guide' ? (
            <AnswerPanel
              mission={mission}
              fraction={fraction}
              snapped={snapped}
              answerNumerator={answerNumerator}
              answerDenominator={answerDenominator}
              setAnswerNumerator={(value) => { setAnswerNumerator(value); setAnswerState('idle'); setFeedback('') }}
              setAnswerDenominator={(value) => { setAnswerDenominator(value); setAnswerState('idle'); setFeedback('') }}
              answerState={answerState}
              feedback={feedback}
              onCheck={checkAnswer}
              onNext={goNext}
              isLast={missionIndex === EQUIVALENT_FRACTION_MISSIONS.length - 1}
              rewardState={rewardState}
            />
          ) : (
            <aside className={`efl-free-note ${snapped ? 'is-visible' : ''}`}>
              <Sparkles size={23} />
              <div>
                <small>관찰 기록</small>
                <strong>{snapped ? `${fraction.numerator}/${fraction.denominator} = ${fraction.equivalentNumerator}/${fraction.equivalentDenominator}` : '카드를 겹치기 전과 후를 비교해 보세요.'}</strong>
                <p>{snapped ? '선이 더 생겨 작은 방이 많아졌지만, 파란 넓이는 처음과 완전히 같아요.' : '가로선은 종이카드에, 세로선은 투명카드에 있어요.'}</p>
              </div>
            </aside>
          )}
        </div>
      )}
    </main>
  )
}

export default EquivalentFractionLab
