import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowDown, ArrowLeft, Check, ChevronRight, Delete, RotateCcw, Sparkles } from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import { useInteractiveLearningReward } from '../../hooks/useInteractiveLearningReward'
import InteractiveLearningRewardNotice from './InteractiveLearningRewardNotice'
import {
  DIVISION_ACTION_LABELS,
  DIVISION_ZONES,
  VERTICAL_DIVISION_PROBLEMS,
  buildDivisionBoardState,
  buildVerticalDivision,
  getDivisionStepCopy,
  getProblemZone,
  validateDivisionStep,
} from './verticalDivisionLabModel'
import './VerticalDivisionLab.css'

const EMPTY_PROGRESS = { currentMission: 0, currentStep: 0, completed: [], totalErrors: 0 }

function loadProgress(key) {
  try {
    const value = JSON.parse(window.localStorage.getItem(key))
    if (!value || !Array.isArray(value.completed)) return EMPTY_PROGRESS
    return {
      currentMission: Math.min(19, Math.max(0, Number(value.currentMission) || 0)),
      currentStep: Math.max(0, Number(value.currentStep) || 0),
      completed: value.completed.filter((index) => Number.isInteger(index) && index >= 0 && index < 20),
      totalErrors: Math.max(0, Number(value.totalErrors) || 0),
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

function cellsFor(value, width, endColumn) {
  const cells = Array(width).fill('')
  String(value).split('').reverse().forEach((digit, offset) => {
    const index = endColumn - offset
    if (index >= 0) cells[index] = digit
  })
  return cells
}

function PlaceCells({ cells, activeColumns = [], focusColumns = [], fadingColumns = [], variant = '', arrowColumn = null }) {
  return (
    <div className="vdl-place-cells">
      {cells.map((digit, index) => {
        const fading = fadingColumns.includes(index)
        return (
          <span
            key={index}
            aria-hidden={fading ? 'true' : undefined}
            className={`vdl-place-cell ${activeColumns.includes(index) ? `is-active is-${variant}` : ''} ${focusColumns.includes(index) ? 'is-current-dividend' : ''} ${fading ? 'is-fading-zero' : ''} ${digit === '' ? 'is-empty' : ''}`}
          >
            {arrowColumn === index && (
              <span className="vdl-falling-arrow" aria-hidden="true"><ArrowDown size={24} strokeWidth={3} /></span>
            )}
            {digit || (activeColumns.includes(index) ? '?' : '')}
          </span>
        )
      })}
    </div>
  )
}

function targetColumns(expected, endColumn) {
  const length = String(expected).length
  return Array.from({ length }, (_, offset) => endColumn - length + 1 + offset).filter((value) => value >= 0)
}

function LongDivisionBoard({ mission, stepIndex }) {
  const step = mission.steps[Math.min(stepIndex, mission.steps.length - 1)]
  const board = buildDivisionBoardState(mission, stepIndex)
  const width = mission.dividendDigits.length
  const visibleCycles = mission.cycles.filter((cycle) => cycle.cycleIndex <= step.cycleIndex)
  const sourceFocusColumns = step.type === 'quotient' && step.cycleIndex === 0
    ? targetColumns(step.partialDividend, step.columnIndex)
    : []
  const workingFocusOwner = step.type === 'quotient' && step.cycleIndex > 0
    ? mission.cycles.slice(0, step.cycleIndex).reverse().find((cycle) => !cycle.skipArithmetic)?.cycleIndex
    : null

  return (
    <section className="vdl-board" aria-label={`${mission.dividend} 나누기 ${mission.divisor} 세로셈 판`} style={{ '--vdl-cols': width }}>
      <div className="vdl-board-caption">
        <span>몫은 위에</span><strong>{mission.dividend} ÷ {mission.divisor}</strong><span>계산은 아래로</span>
      </div>
      <div className="vdl-quotient-line">
        <span className="vdl-side-label">몫</span>
        <PlaceCells cells={board.quotientCells} activeColumns={step.type === 'quotient' ? [step.columnIndex] : []} variant="quotient" />
      </div>
      <div className="vdl-dividend-line">
        <strong className="vdl-divisor">{mission.divisor}</strong>
        <div className="vdl-bracket">
          <PlaceCells cells={mission.dividendDigits.map(String)} activeColumns={step.type === 'bringDown' ? [step.nextColumnIndex] : step.type === 'canDivide' ? step.observedColumns : []} focusColumns={sourceFocusColumns} variant="source" />
        </div>
      </div>

      <div className="vdl-workings">
        {visibleCycles.map((cycle) => {
          const cycleState = board.cycleStates[cycle.cycleIndex]
          const isCurrent = cycle.cycleIndex === step.cycleIndex
          const canDivideActive = isCurrent && step.type === 'canDivide'
          const quotientActive = isCurrent && step.type === 'quotient'
          const productActive = isCurrent && step.type === 'multiply'
          const subtractActive = isCurrent && step.type === 'subtract'
          const bringActive = isCurrent && step.type === 'bringDown'
          const productCells = cycleState.product !== '' ? cellsFor(cycleState.product, width, cycle.columnIndex) : Array(width).fill('')
          const remainderCells = cycleState.remainder !== '' ? cellsFor(cycleState.remainder, width, cycle.columnIndex) : Array(width).fill('')
          let fadingZeroColumns = cycleState.remainder === '0' && cycleState.broughtDigit !== '' && step.cycleIndex > cycle.cycleIndex
            ? [cycle.columnIndex]
            : []
          const nextCycle = mission.cycles[cycle.cycleIndex + 1]
          const nextCycleState = nextCycle ? board.cycleStates[nextCycle.cycleIndex] : null
          const zeroBridge = nextCycle?.skipArithmetic
          const zeroBridgeCurrent = zeroBridge && step.cycleIndex === nextCycle.cycleIndex
          const zeroBridgeBringActive = zeroBridgeCurrent && step.type === 'bringDown'
          const zeroBridgeFinished = zeroBridge && (
            step.cycleIndex > nextCycle.cycleIndex || nextCycleState?.broughtDigit !== ''
          )
          const dismissZeroBridge = zeroBridge && nextCycle.partialDividend === 0
          const workingFocusColumns = cycle.cycleIndex === workingFocusOwner
            ? targetColumns(step.partialDividend, step.columnIndex)
            : []
          if (cycleState.broughtDigit !== '' && cycle.nextColumnIndex !== null) {
            remainderCells[cycle.nextColumnIndex] = cycleState.broughtDigit
          }
          if (dismissZeroBridge && (zeroBridgeBringActive || zeroBridgeFinished)) {
            fadingZeroColumns = [...new Set([...fadingZeroColumns, nextCycle.columnIndex])]
          }
          if (zeroBridgeFinished && nextCycle.nextColumnIndex !== null && nextCycleState?.broughtDigit !== '') {
            remainderCells[nextCycle.nextColumnIndex] = nextCycleState.broughtDigit
          }

          if (cycle.skipArithmetic || canDivideActive || quotientActive) return null

          const landingActive = bringActive || zeroBridgeBringActive
          const landingColumn = bringActive ? step.nextColumnIndex : zeroBridgeBringActive ? nextCycle.nextColumnIndex : null

          return (
            <div className={`vdl-cycle ${isCurrent ? 'is-current' : ''}`} key={cycle.cycleIndex}>
              <div className="vdl-calc-row">
                <span className="vdl-math-sign">−</span>
                <PlaceCells cells={productCells} activeColumns={productActive ? targetColumns(step.expected, step.columnIndex) : []} variant="product" />
              </div>
              {(subtractActive || bringActive || !isCurrent) && <div className="vdl-subtract-rule" />}
              {(subtractActive || bringActive || !isCurrent) && (
                <div className="vdl-calc-row vdl-remainder-row">
                  <span className="vdl-math-sign" />
                  <PlaceCells cells={remainderCells} activeColumns={subtractActive ? targetColumns(step.expected, step.columnIndex) : landingActive ? [landingColumn] : []} focusColumns={workingFocusColumns} fadingColumns={fadingZeroColumns} variant={landingActive ? 'landing' : 'remainder'} arrowColumn={landingColumn} />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MissionRail({ progress, selected, onSelect }) {
  const firstIncomplete = VERTICAL_DIVISION_PROBLEMS.findIndex((_, index) => !progress.completed.includes(index))
  const unlockedThrough = firstIncomplete === -1 ? 19 : firstIncomplete
  return (
    <aside className="vdl-rail" aria-label="나눗셈 탐험 지도">
      <div className="vdl-rail-head"><span>나의 탐험 지도</span><strong>{progress.completed.length}/20</strong></div>
      {DIVISION_ZONES.map((zone) => (
        <div className="vdl-zone" key={zone.id} style={{ '--zone-color': zone.color }}>
          <div className="vdl-zone-title">{zone.title}<small>{zone.range[0] + 1}–{zone.range[1] + 1}</small></div>
          <div className="vdl-zone-dots">
            {VERTICAL_DIVISION_PROBLEMS.slice(zone.range[0], zone.range[1] + 1).map((problem, offset) => {
              const index = zone.range[0] + offset
              const complete = progress.completed.includes(index)
              const unlocked = index <= unlockedThrough || complete
              return (
                <button type="button" key={`${problem.dividend}-${problem.divisor}`} className={`${selected === index ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`} disabled={!unlocked} onClick={() => onSelect(index)} aria-label={`${index + 1}번 ${problem.title}${unlocked ? '' : ', 잠김'}`}>
                  {complete ? <Check size={15} strokeWidth={3} /> : unlocked ? index + 1 : '·'}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </aside>
  )
}

function NumberPad({ onDigit, onDelete }) {
  return (
    <div className="vdl-number-pad" aria-label="숫자 키패드">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => <button type="button" key={digit} onClick={() => onDigit(String(digit))}>{digit}</button>)}
      <button type="button" className="vdl-delete" onClick={onDelete} aria-label="한 글자 지우기"><Delete size={20} /></button>
    </div>
  )
}

export default function VerticalDivisionLab({ userId, onExit, initialMission = null }) {
  const storageKey = `metasense_vertical_division_lab_v1:${userId || 'guest'}`
  const saved = useMemo(() => {
    const stored = loadProgress(storageKey)
    return Number.isInteger(initialMission) && initialMission >= 0 && initialMission < 20
      ? { ...stored, currentMission: initialMission, currentStep: 0 }
      : stored
  }, [initialMission, storageKey])
  const [progress, setProgress] = useState(saved)
  const [missionIndex, setMissionIndex] = useState(saved.currentMission)
  const [stepIndex, setStepIndex] = useState(saved.currentStep)
  const [screen, setScreen] = useState(saved.currentStep > 0 ? 'work' : 'briefing')
  const [answer, setAnswer] = useState('')
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const inputRef = useRef(null)
  const timerRef = useRef(null)
  const { claimCompletion, rewardState, resetRewardState } = useInteractiveLearningReward(userId)

  const mission = useMemo(() => buildVerticalDivision(VERTICAL_DIVISION_PROBLEMS[missionIndex]), [missionIndex])
  const currentStepIndex = Math.min(stepIndex, mission.steps.length - 1)
  const step = mission.steps[currentStepIndex]
  const copy = getDivisionStepCopy(step, attempts, mission.divisor)
  const zone = getProblemZone(missionIndex)

  useEffect(() => window.localStorage.setItem(storageKey, JSON.stringify(progress)), [progress, storageKey])
  useEffect(() => {
    if (screen === 'work' && feedback?.type !== 'correct') window.setTimeout(() => inputRef.current?.focus(), 80)
  }, [screen, stepIndex, feedback?.type])
  useEffect(() => () => timerRef.current && window.clearTimeout(timerRef.current), [])

  const clearStep = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current)
    timerRef.current = null
    setAnswer('')
    setAttempts(0)
    setFeedback(null)
  }

  const selectMission = (index) => {
    const targetStep = progress.completed.includes(index) ? 0 : index === progress.currentMission ? progress.currentStep : 0
    setMissionIndex(index)
    setStepIndex(targetStep)
    setProgress((current) => ({ ...current, currentMission: index, currentStep: targetStep }))
    setScreen('briefing')
    clearStep()
    soundManager.playClick?.()
  }

  const startMission = () => {
    if (progress.completed.includes(missionIndex)) {
      setStepIndex(0)
      setProgress((current) => ({ ...current, currentMission: missionIndex, currentStep: 0 }))
    }
    setScreen('work')
    resetRewardState()
    clearStep()
    soundManager.playWarp?.()
  }

  const advance = () => {
    if (stepIndex < mission.steps.length - 1) {
      const next = stepIndex + 1
      setStepIndex(next)
      setProgress((current) => ({ ...current, currentMission: missionIndex, currentStep: next }))
      clearStep()
      return
    }
    setProgress((current) => ({
      ...current,
      completed: current.completed.includes(missionIndex) ? current.completed : [...current.completed, missionIndex].sort((a, b) => a - b),
      currentMission: Math.min(19, missionIndex + 1),
      currentStep: 0,
    }))
    setStepIndex(0)
    setScreen('complete')
    claimCompletion({
      activityId: 'vertical_division',
      completionKey: `mission-${missionIndex + 1}`,
      metrics: { missionNumber: missionIndex + 1, problem: `${mission.dividend} ÷ ${mission.divisor}`, errorCount: progress.totalErrors },
    })
    soundManager.playAchievement?.()
  }

  const check = (submittedAnswer = answer) => {
    if (feedback?.type === 'correct' || timerRef.current) return
    const checkedAnswer = typeof submittedAnswer === 'string' ? submittedAnswer : answer
    if (validateDivisionStep(step, checkedAnswer)) {
      setFeedback({ type: 'correct', text: step.type === 'canDivide' ? copy.success : step.type === 'bringDown' ? '제자리로 잘 내렸어요!' : '정확한 자리에 썼어요!' })
      soundManager.playCorrect?.()
      if (step.type !== 'canDivide') timerRef.current = window.setTimeout(advance, step.type === 'bringDown' ? 750 : 500)
      return
    }
    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    setProgress((current) => ({ ...current, totalErrors: current.totalErrors + 1 }))
    setFeedback({ type: 'wrong', text: getDivisionStepCopy(step, nextAttempts, mission.divisor).hint })
    soundManager.playWrong?.()
  }

  const nextMission = () => {
    if (missionIndex === 19) {
      setScreen('mastery')
      return
    }
    const next = missionIndex + 1
    setMissionIndex(next)
    setStepIndex(0)
    setProgress((current) => ({ ...current, currentMission: next, currentStep: 0 }))
    setScreen('briefing')
    clearStep()
  }

  const updateAnswer = (value) => {
    setAnswer(value.replace(/\D/g, '').slice(0, 4))
    if (feedback?.type === 'wrong') setFeedback(null)
  }

  return (
    <div className="vdl-shell">
      <header className="vdl-topbar">
        <button type="button" onClick={onExit}><ArrowLeft size={18} /> 디비디아로</button>
        <div className="vdl-progress"><span style={{ width: `${(progress.completed.length / 20) * 100}%` }} /></div>
        <strong>{progress.completed.length}/20</strong>
      </header>

      <main className="vdl-layout">
        <MissionRail progress={progress} selected={missionIndex} onSelect={selectMission} />
        <section className="vdl-stage">
          {screen === 'briefing' && (
            <div className="vdl-briefing">
              <div className="vdl-zone-badge" style={{ '--zone-color': zone.color }}>ZONE {DIVISION_ZONES.indexOf(zone) + 1} · {zone.title}</div>
              <div className="vdl-mission-number">{String(missionIndex + 1).padStart(2, '0')}</div>
              <p>MISSION {missionIndex + 1}</p>
              <h1>{mission.dividend} ÷ {mission.divisor}</h1>
              <h2>{mission.title}</h2>
              <div className="vdl-teacher-card"><span>왕새우<br />쌤</span><div><strong>{mission.focus}</strong><p>{mission.cycles.some((cycle) => cycle.skipArithmetic) ? '몫이 0인 자리는 0만 쓰고, 필요 없는 곱하기와 빼기는 건너뛴 뒤 다음 숫자를 바로 내려요.' : '몫을 쓰고, 곱해 적고, 빼고, 다음 숫자를 내려오는 네 동작을 한 자리씩 해봐요.'}</p></div></div>
              <div className="vdl-action-track">
                {Object.entries(DIVISION_ACTION_LABELS).filter(([key]) => key !== 'canDivide').map(([key, label], index) => <span key={key}><b>{index + 1}</b>{label}</span>)}
              </div>
              <button type="button" className="vdl-primary" onClick={startMission}>왕새우쌤과 시작하기 <ChevronRight /></button>
            </div>
          )}

          {screen === 'work' && (
            <div className="vdl-work-screen">
              <div className="vdl-work-head">
                <div><small>MISSION {missionIndex + 1} · STEP {currentStepIndex + 1}/{mission.steps.length}</small><h1>{copy.title}</h1></div>
                <span>{mission.dividend} ÷ {mission.divisor}</span>
              </div>
              <div className="vdl-work-grid">
                <LongDivisionBoard mission={mission} stepIndex={stepIndex} />
                <section className="vdl-coach-panel">
                  <div className="vdl-coach-head"><span>왕새우<br />쌤</span><div><small>{DIVISION_ACTION_LABELS[step.type]}{step.type === 'quotient' ? ` · ${step.placeName}의 자리` : ''}</small><strong>{copy.equation}</strong></div></div>
                  <p className="vdl-instruction">{copy.instruction}</p>
                  {step.type === 'bringDown' && <div className="vdl-down-demo"><span>{step.nextDigit}</span><ArrowDown /><strong>제자리</strong></div>}
                  {step.type === 'canDivide' ? (
                    <div className="vdl-choice-grid" role="group" aria-label="나눌 수 있는지 고르기">
                      <button type="button" disabled={feedback?.type === 'correct'} onClick={() => check('can')}>나눌 수 있어요</button>
                      <button type="button" className={feedback?.type === 'correct' ? 'is-correct' : ''} disabled={feedback?.type === 'correct'} onClick={() => check('cannot')}>나눌 수 없어요</button>
                    </div>
                  ) : (
                    <>
                      <label htmlFor="division-step-answer">{step.type === 'bringDown' ? '내려올 숫자' : step.type === 'quotient' ? `${step.placeName}의 자리 몫` : `${copy.title}의 답`}</label>
                      <input ref={inputRef} id="division-step-answer" inputMode="numeric" value={answer} onChange={(event) => updateAnswer(event.target.value)} onKeyDown={(event) => event.key === 'Enter' && check()} aria-describedby="division-feedback" />
                      <NumberPad onDigit={(digit) => updateAnswer(`${answer}${digit}`)} onDelete={() => updateAnswer(answer.slice(0, -1))} />
                    </>
                  )}
                  <div id="division-feedback" className={`vdl-feedback ${feedback ? `is-${feedback.type}` : ''}`}>{feedback?.text || copy.hint}</div>
                  {step.type === 'canDivide' && feedback?.type === 'correct' && <button type="button" className="vdl-primary" onClick={advance}>이해했어요. {step.nextPartialDividend}를 나눠 볼게요 <ChevronRight /></button>}
                  {step.type !== 'canDivide' && <button type="button" className="vdl-primary" disabled={!answer || feedback?.type === 'correct'} onClick={() => check()}>확인하기 <ChevronRight /></button>}
                </section>
              </div>
            </div>
          )}

          {screen === 'complete' && (
            <div className="vdl-finish">
              <div className="vdl-check"><Check size={48} strokeWidth={3} /></div>
              <p>MISSION {missionIndex + 1} COMPLETE</p>
              <h1>{mission.dividend} ÷ {mission.divisor} = {mission.quotient}{mission.remainder ? ` ··· ${mission.remainder}` : ''}</h1>
              <h2>{mission.remainder ? `몫 ${mission.quotient}, 나머지 ${mission.remainder}` : '나머지 없이 정확히 나누었어요!'}</h2>
              <InteractiveLearningRewardNotice state={rewardState} />
              <button type="button" className="vdl-primary" onClick={nextMission}>{missionIndex === 19 ? '마스터 결과 보기' : '다음 미션'} <ChevronRight /></button>
              <button type="button" className="vdl-link" onClick={() => { setScreen('briefing'); clearStep() }}><RotateCcw size={16} /> 다시 풀기</button>
            </div>
          )}

          {screen === 'mastery' && (
            <div className="vdl-finish vdl-mastery">
              <Sparkles size={64} />
              <p>DIVIDIA MASTER</p>
              <h1>나눗셈의 흐름을 끝까지 연결했어요!</h1>
              <h2>몫 → 곱하기 → 빼기 → 내려오기</h2>
              <button type="button" className="vdl-primary" onClick={onExit}>디비디아로 돌아가기 <ChevronRight /></button>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
