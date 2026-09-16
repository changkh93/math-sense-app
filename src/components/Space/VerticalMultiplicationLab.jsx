import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Delete, RotateCcw, Sparkles, Waves } from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import {
  PLACE_LABELS,
  VERTICAL_MULTIPLICATION_PROBLEMS,
  buildBoardState,
  buildVerticalMultiplication,
  getStepCopy,
  validateStep,
} from './verticalMultiplicationLabModel'
import './VerticalMultiplicationLab.css'

const EMPTY_PROGRESS = { currentMission: 0, currentStep: 0, completed: [], totalErrors: 0 }

function safeLoadProgress(storageKey) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey))
    if (!stored || !Array.isArray(stored.completed)) return EMPTY_PROGRESS
    return {
      currentMission: Math.min(9, Math.max(0, Number(stored.currentMission) || 0)),
      currentStep: Math.max(0, Number(stored.currentStep) || 0),
      completed: stored.completed.filter((index) => Number.isInteger(index) && index >= 0 && index < 10),
      totalErrors: Math.max(0, Number(stored.totalErrors) || 0),
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

function numberCells(value, width = 6) {
  return String(value).padStart(width, ' ').split('').map((digit) => digit.trim())
}

function BoardRow({ label, cells, activeColumn = -1, activeVariant = 'answer-target', className = '', operation = '' }) {
  return (
    <div className={`vml-board-row ${className}`}>
      <span className="vml-row-label">{label}</span>
      <span className="vml-operation" aria-hidden="true">{operation}</span>
      <div className="vml-cell-row">
        {cells.map((digit, index) => (
          <span
            // The six fixed place-value columns do not have stable domain IDs.
            key={index}
            className={`vml-digit-cell ${activeColumn === index ? `is-active is-${activeVariant}` : ''} ${digit === '' ? 'is-empty' : ''}`}
          >
            {digit || '·'}
          </span>
        ))}
      </div>
    </div>
  )
}

function MissionRail({ progress, selectedMission, onSelect }) {
  const firstIncomplete = VERTICAL_MULTIPLICATION_PROBLEMS.findIndex((_, index) => !progress.completed.includes(index))
  const unlockedThrough = firstIncomplete === -1 ? 9 : firstIncomplete

  return (
    <aside className="vml-mission-rail" aria-label="큰곱셈 미션 목록">
      <div className="vml-rail-heading">
        <span>나의 항해 지도</span>
        <strong>{progress.completed.length}/10</strong>
      </div>
      <div className="vml-rail-list">
        {VERTICAL_MULTIPLICATION_PROBLEMS.map((problem, index) => {
          const complete = progress.completed.includes(index)
          const unlocked = index <= unlockedThrough || complete
          return (
            <button
              type="button"
              key={`${problem.a}-${problem.b}`}
              className={`vml-mission-dot ${selectedMission === index ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`}
              disabled={!unlocked}
              onClick={() => onSelect(index)}
              aria-label={`${index + 1}번 미션 ${problem.title}${complete ? ', 완료' : unlocked ? '' : ', 잠김'}`}
            >
              <span>{complete ? <Check size={15} strokeWidth={3} /> : unlocked ? index + 1 : '🔒'}</span>
              <div>
                <strong>{problem.title}</strong>
                <small>{unlocked ? `${problem.a} × ${problem.b}` : '앞 미션을 먼저 완성해요'}</small>
              </div>
            </button>
          )
        })}
      </div>
    </aside>
  )
}

function NumberPad({ onDigit, onDelete }) {
  return (
    <div className="vml-number-pad" aria-label="숫자 키패드">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
        <button type="button" key={digit} onClick={() => onDigit(String(digit))}>{digit}</button>
      ))}
      <button type="button" className="vml-delete-key" onClick={onDelete} aria-label="한 글자 지우기">
        <Delete size={21} />
      </button>
    </div>
  )
}

function VerticalMultiplicationLab({ userId, onExit }) {
  const storageKey = `metasense_big_multiply_lab_v1:${userId || 'guest'}`
  const [progress, setProgress] = useState(() => safeLoadProgress(storageKey))
  const [missionIndex, setMissionIndex] = useState(() => safeLoadProgress(storageKey).currentMission)
  const [stepIndex, setStepIndex] = useState(() => safeLoadProgress(storageKey).currentStep)
  const [screen, setScreen] = useState(() => safeLoadProgress(storageKey).currentStep > 0 ? 'work' : 'briefing')
  const [writeValue, setWriteValue] = useState('')
  const [carryValue, setCarryValue] = useState('')
  const [activeField, setActiveField] = useState('write')
  const [attempts, setAttempts] = useState(0)
  const [feedback, setFeedback] = useState(null)
  const writeInputRef = useRef(null)
  const carryInputRef = useRef(null)
  const advanceTimerRef = useRef(null)

  const mission = useMemo(
    () => buildVerticalMultiplication(VERTICAL_MULTIPLICATION_PROBLEMS[missionIndex]),
    [missionIndex],
  )
  const safeStepIndex = Math.min(stepIndex, mission.steps.length - 1)
  const step = mission.steps[safeStepIndex]
  const board = useMemo(() => buildBoardState(mission, stepIndex), [mission, stepIndex])
  const copy = getStepCopy(step, attempts)
  const activeBoardColumn = 5 - step.targetColumn
  const overallComplete = progress.completed.length === VERTICAL_MULTIPLICATION_PROBLEMS.length
  const stageLabel = step.type === 'partial'
    ? `${mission.a} × ${step.placeMultiplier} 계산하기`
    : '곱해서 만든 세 수를 더해 답 구하기'

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(progress))
  }, [progress, storageKey])

  useEffect(() => {
    if (screen !== 'work' || feedback?.type === 'correct') return
    window.setTimeout(() => writeInputRef.current?.focus(), 80)
  }, [feedback?.type, screen, stepIndex])

  useEffect(() => () => {
    if (advanceTimerRef.current) window.clearTimeout(advanceTimerRef.current)
  }, [])

  const resetInputs = () => {
    if (advanceTimerRef.current) {
      window.clearTimeout(advanceTimerRef.current)
      advanceTimerRef.current = null
    }
    setWriteValue('')
    setCarryValue('')
    setActiveField('write')
    setAttempts(0)
    setFeedback(null)
  }

  const selectMission = (index) => {
    const isComplete = progress.completed.includes(index)
    const targetStep = isComplete ? 0 : (index === progress.currentMission ? progress.currentStep : 0)
    setMissionIndex(index)
    setStepIndex(targetStep)
    setProgress((current) => ({ ...current, currentMission: index, currentStep: targetStep }))
    setScreen('briefing')
    resetInputs()
    soundManager.playClick?.()
  }

  const startMission = () => {
    if (progress.completed.includes(missionIndex)) {
      setStepIndex(0)
      setProgress((current) => ({ ...current, currentMission: missionIndex, currentStep: 0 }))
    }
    setScreen('work')
    resetInputs()
    soundManager.playWarp?.()
  }

  const checkAnswer = () => {
    if (feedback?.type === 'correct' || advanceTimerRef.current) return
    const result = validateStep(step, writeValue, carryValue)
    if (result.correct) {
      setFeedback({
        type: 'correct',
        text: '맞았어요! 다음 계산으로 넘어갈게요.',
      })
      soundManager.playCorrect?.()
      advanceTimerRef.current = window.setTimeout(() => advance(), 450)
      return
    }

    const nextAttempts = attempts + 1
    setAttempts(nextAttempts)
    setProgress((current) => ({ ...current, totalErrors: current.totalErrors + 1 }))
    const parts = []
    if (!result.writeCorrect) parts.push(step.type === 'partial' ? '아래에 쓸 수' : '결과 칸의 수')
    if (!result.carryCorrect) parts.push('앞자리로 올림할 수')
    setFeedback({
      type: 'wrong',
      text: `${parts.join('와 ')}를 다시 생각해 봐요. ${getStepCopy(step, nextAttempts).hint}`,
    })
    soundManager.playWrong?.()
  }

  const advance = () => {
    if (stepIndex < mission.steps.length - 1) {
      const nextStep = stepIndex + 1
      setStepIndex(nextStep)
      setProgress((current) => ({ ...current, currentMission: missionIndex, currentStep: nextStep }))
      resetInputs()
      return
    }

    setProgress((current) => {
      const completed = current.completed.includes(missionIndex)
        ? current.completed
        : [...current.completed, missionIndex].sort((a, b) => a - b)
      return {
        ...current,
        completed,
        currentMission: Math.min(9, missionIndex + 1),
        currentStep: 0,
      }
    })
    setStepIndex(0)
    setScreen('complete')
    soundManager.playAchievement?.()
  }
  const nextMission = () => {
    const nextIndex = Math.min(9, missionIndex + 1)
    setMissionIndex(nextIndex)
    setStepIndex(0)
    setProgress((current) => ({ ...current, currentMission: nextIndex, currentStep: 0 }))
    setScreen(missionIndex === 9 ? 'mastery' : 'briefing')
    resetInputs()
  }

  const updateField = (field, value) => {
    const maxLength = field === 'carry' ? 1 : step.isLastColumn ? 2 : 1
    const clean = value.replace(/\D/g, '').slice(0, maxLength)
    if (field === 'carry') setCarryValue(clean)
    else setWriteValue(clean)
    if (feedback?.type === 'wrong') setFeedback(null)
  }

  const handlePadDigit = (digit) => {
    if (feedback?.type === 'correct') return
    if (activeField === 'carry' && step.carryOut > 0) {
      updateField('carry', `${carryValue}${digit}`)
      carryInputRef.current?.focus()
    } else {
      updateField('write', `${writeValue}${digit}`)
      writeInputRef.current?.focus()
    }
  }

  const handleDelete = () => {
    if (activeField === 'carry' && step.carryOut > 0) setCarryValue((value) => value.slice(0, -1))
    else setWriteValue((value) => value.slice(0, -1))
  }

  const handleKeyDown = (event) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    if (feedback?.type !== 'correct') checkAnswer()
  }

  const restartAll = () => {
    if (!window.confirm('10개 미션의 큰곱셈 연습 기록을 처음부터 다시 시작할까요?')) return
    window.localStorage.removeItem(storageKey)
    setProgress(EMPTY_PROGRESS)
    setMissionIndex(0)
    setStepIndex(0)
    setScreen('briefing')
    resetInputs()
  }

  return (
    <div className="vml-shell" onKeyDown={handleKeyDown}>
      <header className="vml-topbar">
        <button type="button" className="vml-exit" onClick={onExit}>
          <ArrowLeft size={18} /> 멀티플루비아로
        </button>
        <div className="vml-brand">
          <span className="vml-brand-icon"><Waves size={23} /></span>
          <div><small>체험 학습</small><strong>큰곱셈 조립소</strong></div>
        </div>
        <button type="button" className="vml-reset" onClick={restartAll} title="처음부터 다시 시작">
          <RotateCcw size={17} /> <span>기록 초기화</span>
        </button>
      </header>

      <div className="vml-layout">
        <MissionRail progress={progress} selectedMission={missionIndex} onSelect={selectMission} />

        <main className="vml-main">
          <div className="vml-progress-line" aria-label={`현재 미션 진행률 ${screen === 'complete' || screen === 'mastery' ? 100 : Math.round((stepIndex / mission.steps.length) * 100)}퍼센트`}>
            <span style={{ width: `${screen === 'complete' || screen === 'mastery' ? 100 : (stepIndex / mission.steps.length) * 100}%` }} />
          </div>

          {screen === 'briefing' && (
            <section className="vml-briefing">
              <div className="vml-briefing-visual" aria-hidden="true">
                <span>{missionIndex + 1}</span>
                <Waves size={72} />
              </div>
              <div className="vml-kicker">MISSION {String(missionIndex + 1).padStart(2, '0')} · {mission.title}</div>
              <h1>{mission.a} × {mission.b}</h1>
              <p className="vml-focus">{mission.focus}</p>
              <div className="vml-concept-card">
                <div className="vml-coach-avatar">왕새우<br />쌤</div>
                <div>
                  <strong>큰 곱셈은 작은 곱셈 세 개를 조립하는 거야.</strong>
                  <p>
                    {mission.b}를 {Number(String(mission.b)[2])} + {Number(String(mission.b)[1]) * 10} + {Number(String(mission.b)[0]) * 100}으로 나누어 생각해 보자.
                    {' '}{mission.a} × {mission.partialRows[0].digit}, {mission.a} × {mission.partialRows[1].digit * 10}, {mission.a} × {mission.partialRows[2].digit * 100}을 계산한 뒤 모두 더하면 돼!
                  </p>
                </div>
              </div>
              <button type="button" className="vml-primary" onClick={startMission}>
                {progress.completed.includes(missionIndex) ? '다시 연습하기' : '왕새우쌤과 시작하기'} <ChevronRight size={19} />
              </button>
            </section>
          )}

          {screen === 'work' && (
            <section className="vml-workspace">
              <div className="vml-work-heading">
                <div>
                  <span>MISSION {missionIndex + 1} · STEP {stepIndex + 1}/{mission.steps.length}</span>
                  <h1>{stageLabel}</h1>
                </div>
                <div className={`vml-stage-chip ${step.type}`}>
                  {step.type === 'partial' ? `${mission.a} × ${step.placeMultiplier}` : '세 수 더하기'}
                </div>
              </div>

              <div className="vml-work-grid">
                <div className="vml-board-card">
                  <div className="vml-place-headings">
                    <span />
                    <span />
                    {PLACE_LABELS.slice(0, 6).reverse().map((place, index) => (
                      <span key={place} className={index === activeBoardColumn ? 'is-active' : ''}>{place}</span>
                    ))}
                  </div>
                  {step.incomingCarry > 0 && (
                    <div className="vml-carry-flag" style={{ '--carry-column': activeBoardColumn + 1 }}>
                      올림 {step.incomingCarry}
                    </div>
                  )}
                  <BoardRow label="곱해지는 수" cells={numberCells(mission.a)} activeColumn={step.type === 'partial' ? 5 - step.columnIndex : -1} activeVariant="factor" />
                  <BoardRow label="곱하는 수" cells={numberCells(mission.b)} activeColumn={step.type === 'partial' ? 5 - step.rowIndex : -1} activeVariant="factor" operation="×" className="is-operand" />
                  {board.partialCells.map((cells, index) => (
                    <BoardRow
                      key={index}
                      label={`${mission.a} × ${mission.partialRows[index].digit * (10 ** index)}`}
                      cells={cells}
                      activeColumn={step.type === 'partial' && step.rowIndex === index ? activeBoardColumn : -1}
                      operation={index === 2 ? '+' : ''}
                      className={`${step.type === 'partial' && step.rowIndex === index ? 'is-working' : ''} ${index === 0 ? 'is-first-partial' : ''}`}
                    />
                  ))}
                  <BoardRow label="최종 결과" cells={board.resultCells} activeColumn={step.type === 'addition' ? activeBoardColumn : -1} className="is-result" />
                </div>

                <div className="vml-coach-card">
                  <div className="vml-coach-top">
                    <div className="vml-coach-avatar">왕새우<br />쌤</div>
                    <div>
                      <small>{copy.eyebrow}</small>
                      <h2>{copy.equation}</h2>
                    </div>
                  </div>
                  <p className="vml-instruction">{copy.hint}</p>

                  <div className={`vml-answer-split ${step.carryOut > 0 ? '' : 'is-single'}`}>
                    <label className={activeField === 'write' ? 'is-selected' : ''}>
                      <span>{step.type === 'partial' ? '아래 칸에 쓸 수' : '결과 칸에 쓸 수'}</span>
                      <input
                        ref={writeInputRef}
                        type="text"
                        inputMode="numeric"
                        value={writeValue}
                        maxLength={step.isLastColumn ? 2 : 1}
                        onFocus={() => setActiveField('write')}
                        onChange={(event) => updateField('write', event.target.value)}
                        disabled={feedback?.type === 'correct'}
                        aria-label={step.type === 'partial' ? '아래 칸에 쓸 수' : '결과 칸에 쓸 수'}
                      />
                    </label>
                    {step.carryOut > 0 && (
                      <>
                        <span className="vml-split-arrow">10개씩 묶으면</span>
                        <label className={activeField === 'carry' ? 'is-selected' : ''}>
                          <span>앞자리로 올림할 수</span>
                          <input
                            ref={carryInputRef}
                            type="text"
                            inputMode="numeric"
                            value={carryValue}
                            maxLength={1}
                            onFocus={() => setActiveField('carry')}
                            onChange={(event) => updateField('carry', event.target.value)}
                            disabled={feedback?.type === 'correct'}
                            aria-label="앞자리로 올림할 수"
                          />
                        </label>
                      </>
                    )}
                  </div>

                  <NumberPad onDigit={handlePadDigit} onDelete={handleDelete} />

                  {feedback && (
                    <div className={`vml-feedback ${feedback.type}`} role="status">
                      {feedback.type === 'correct' ? <Check size={20} /> : <span>↺</span>}
                      <span>{feedback.text}</span>
                    </div>
                  )}

                  {feedback?.type !== 'correct' && (
                    <button
                      type="button"
                      className="vml-primary"
                      onClick={checkAnswer}
                      disabled={writeValue === '' || (step.carryOut > 0 && carryValue === '')}
                    >
                      확인하기 <ChevronRight size={19} />
                    </button>
                  )}
                </div>
              </div>
            </section>
          )}

          {screen === 'complete' && (
            <section className="vml-celebration">
              <div className="vml-burst" aria-hidden="true"><Sparkles size={76} /></div>
              <span className="vml-complete-kicker">MISSION {missionIndex + 1} COMPLETE</span>
              <h1>{mission.a} × {mission.b} = {mission.product}</h1>
              <p>세 번의 곱셈과 올림, 마지막 덧셈까지 직접 완성했어요.</p>
              <div className="vml-earned">
                <span>✓ 자리 맞추기</span><span>✓ 곱셈 올림</span><span>✓ 세 수 더하기</span>
              </div>
              <button type="button" className="vml-primary" onClick={nextMission}>
                {missionIndex === 9 ? '마스터 결과 보기' : '다음 미션 열기'} <ChevronRight size={19} />
              </button>
            </section>
          )}

          {(screen === 'mastery' || (overallComplete && screen !== 'work' && screen !== 'briefing' && screen !== 'complete')) && (
            <section className="vml-celebration is-mastery">
              <div className="vml-master-medal">10</div>
              <span className="vml-complete-kicker">BIG MULTIPLICATION MASTER</span>
              <h1>큰곱셈 조립 마스터!</h1>
              <p>10개의 세 자리 수 곱셈에서 모든 올림과 세로 덧셈을 직접 완성했어요.</p>
              <button type="button" className="vml-primary" onClick={onExit}>멀티플루비아로 돌아가기</button>
            </section>
          )}
        </main>
      </div>
    </div>
  )
}

export default VerticalMultiplicationLab
