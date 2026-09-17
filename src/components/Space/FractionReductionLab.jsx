import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Boxes,
  Check,
  ChevronRight,
  Combine,
  Sparkles,
} from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import { useInteractiveLearningReward } from '../../hooks/useInteractiveLearningReward'
import InteractiveLearningRewardNotice from './InteractiveLearningRewardNotice'
import {
  FRACTION_REDUCTION_MISSIONS,
  buildFactorChoices,
  getCommonFactors,
  getSimplestFraction,
  greatestCommonDivisor,
  isCommonFactor,
  reduceFraction,
  validateReductionAnswer,
} from './fractionReductionLabModel'
import './FractionReductionLab.css'

const EMPTY_PROGRESS = { completed: [], missionIndex: 0 }
const NO_COMMON_FACTOR = 'none'

function loadProgress(storageKey) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey))
    if (!stored || !Array.isArray(stored.completed)) return EMPTY_PROGRESS
    const storedCompleted = new Set(stored.completed)
    const completed = []
    for (const mission of FRACTION_REDUCTION_MISSIONS) {
      if (!storedCompleted.has(mission.id)) break
      completed.push(mission.id)
    }
    const highestUnlockedIndex = Math.min(completed.length, FRACTION_REDUCTION_MISSIONS.length - 1)
    return {
      completed,
      missionIndex: Math.min(highestUnlockedIndex, Math.max(0, Number(stored.missionIndex) || 0)),
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

function Fraction({ numerator, denominator, compact = false }) {
  return (
    <span className={`frl-fraction ${compact ? 'is-compact' : ''}`} aria-label={`${denominator}분의 ${numerator}`}>
      <span>{numerator}</span>
      <span>{denominator}</span>
    </span>
  )
}

function MissionRail({ activeIndex, completed, onSelect }) {
  return (
    <nav className="frl-mission-rail" aria-label="약분 묶음 탐구 목록">
      {FRACTION_REDUCTION_MISSIONS.map((mission, index) => {
        const complete = completed.includes(mission.id)
        const unlocked = index === 0 || completed.includes(FRACTION_REDUCTION_MISSIONS[index - 1].id)
        return (
          <button
            type="button"
            key={mission.id}
            className={`${activeIndex === index ? 'is-current' : ''} ${complete ? 'is-complete' : ''}`}
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

function getBuildingShape(denominator, factor) {
  if (factor) {
    return { columns: factor, rows: Math.ceil(denominator / factor), groupedByRows: true }
  }
  if (denominator === 8) return { columns: 2, rows: 4, groupedByRows: false }
  const preferredColumns = [3, 2, 4, 5, 6].find((columns) => denominator % columns === 0 && columns <= Math.sqrt(denominator) + 2)
  const columns = preferredColumns || denominator
  return { columns, rows: denominator / columns, groupedByRows: false }
}

function getSnakeCellOrder(columns, rows, denominator) {
  const order = []
  for (let row = 0; row < rows; row += 1) {
    const columnsInRow = Array.from({ length: columns }, (_, column) => column)
    if (row % 2 === 1) columnsInRow.reverse()
    for (const column of columnsInRow) {
      const index = row * columns + column
      if (index < denominator) order.push(index)
    }
  }
  return order
}

function getGroupBoundaryPath(indices, columns, cellWidth, cellHeight) {
  const cells = new Set(indices.map((index) => `${Math.floor(index / columns)}:${index % columns}`))
  const segments = []
  const addSegment = (x1, y1, x2, y2) => segments.push(`M ${x1} ${y1} L ${x2} ${y2}`)

  indices.forEach((index) => {
    const row = Math.floor(index / columns)
    const column = index % columns
    const x = 2 + column * cellWidth
    const y = 2 + row * cellHeight
    if (!cells.has(`${row - 1}:${column}`)) addSegment(x, y, x + cellWidth, y)
    if (!cells.has(`${row}:${column + 1}`)) addSegment(x + cellWidth, y, x + cellWidth, y + cellHeight)
    if (!cells.has(`${row + 1}:${column}`)) addSegment(x + cellWidth, y + cellHeight, x, y + cellHeight)
    if (!cells.has(`${row}:${column - 1}`)) addSegment(x, y + cellHeight, x, y)
  })

  return segments.join(' ')
}

function FractionBuilding({ numerator, denominator, layoutFactor, groupFactor = null, compact = false, showGrouping = true }) {
  const { columns, rows } = getBuildingShape(denominator, layoutFactor)
  const cellWidth = 300 / columns
  const cellHeight = 300 / rows
  const orderedCells = getSnakeCellOrder(columns, rows, denominator)
  const completeGroupCount = groupFactor ? Math.floor(denominator / groupFactor) : 0
  const groups = groupFactor
    ? Array.from({ length: completeGroupCount }, (_, groupIndex) => (
      orderedCells.slice(groupIndex * groupFactor, (groupIndex + 1) * groupFactor)
    ))
    : []
  const remainderCells = groupFactor ? orderedCells.slice(completeGroupCount * groupFactor) : []

  return (
    <div className={`frl-building ${compact ? 'is-compact' : ''}`}>
      <svg viewBox="0 0 304 304" role="img" aria-label={`${denominator}칸 중 ${numerator}칸이 색칠된 정사각형 분수 빌딩`}>
        <rect className="frl-building-paper" x="2" y="2" width="300" height="300" rx="4" />
        {Array.from({ length: denominator }, (_, index) => {
          const column = index % columns
          const row = Math.floor(index / columns)
          return (
            <rect
              key={index}
              className={index < numerator ? 'frl-building-cell is-filled' : 'frl-building-cell'}
              x={2 + column * cellWidth}
              y={2 + row * cellHeight}
              width={cellWidth}
              height={cellHeight}
            />
          )
        })}
        <rect className="frl-building-frame" x="2" y="2" width="300" height="300" rx="4" />
        {showGrouping && groupFactor && groups.map((indices, groupIndex) => {
          const containsFilled = indices.some((index) => index < numerator)
          const containsEmpty = indices.some((index) => index >= numerator)
          return (
            <path
              key={`group-${groupIndex}`}
              className={`frl-building-group ${containsFilled && containsEmpty ? 'is-mixed' : ''}`}
              d={getGroupBoundaryPath(indices, columns, cellWidth, cellHeight)}
            />
          )
        })}
        {showGrouping && groupFactor && remainderCells.map((index) => {
          const column = index % columns
          const row = Math.floor(index / columns)
          return (
            <rect
              key={`leftover-${index}`}
              className="frl-building-leftover"
              x={7 + column * cellWidth}
              y={7 + row * cellHeight}
              width={cellWidth - 10}
              height={cellHeight - 10}
              rx="7"
            />
          )
        })}
      </svg>
      {showGrouping && groupFactor > 1 && <span>{groupFactor}칸씩 묶은 선</span>}
    </div>
  )
}

function AnswerFraction({ value, onChange, disabled, error, label }) {
  return (
    <input
      value={value}
      onChange={(event) => onChange(event.target.value.replace(/\D/g, '').slice(0, 2))}
      inputMode="numeric"
      placeholder="?"
      disabled={disabled}
      className={error === false ? 'has-error' : ''}
      aria-label={label}
    />
  )
}

function ReductionPanel({
  current,
  selectedFactor,
  choices,
  onFactor,
  answers,
  onAnswer,
  checks,
  preview,
  onCheck,
  onCompress,
  conceptComplete,
  irreducible,
  onConfirmIrreducible,
  onNext,
  isLast,
  feedback,
  rewardState,
}) {
  const factorValid = isCommonFactor(current.numerator, current.denominator, selectedFactor)
  const noCommonFactorSelected = irreducible && selectedFactor === NO_COMMON_FACTOR
  return (
    <aside className="frl-control-panel">
      <div className="frl-control-heading">
        <span><Sparkles size={17} /> 고정된 빌딩을 관찰해요</span>
        <strong>분자와 분모를 동시에 나누어 더 간단히 표현할 수 있는 수를 찾으세요.</strong>
      </div>

      {!conceptComplete ? (
        <>
          <div className="frl-factor-picker" aria-label="공통으로 묶을 수 선택">
            <small>분자와 분모를 동시에 나눌 수 있는 수를 찾으세요.</small>
            <div>
              {choices.map((factor) => (
                <button
                  type="button"
                  key={factor}
                  className={selectedFactor === factor ? (factorValid ? 'is-valid' : 'is-invalid') : ''}
                  onClick={() => onFactor(factor)}
                  aria-label={`${factor}로 분자와 분모를 동시에 나눠 보기`}
                >
                  {factor}
                </button>
              ))}
              {irreducible && (
                <button
                  type="button"
                  className={`is-none ${noCommonFactorSelected ? 'is-valid' : ''}`}
                  onClick={() => onFactor(NO_COMMON_FACTOR)}
                >
                  동시에 나눌 수 있는 수가 없어요
                </button>
              )}
            </div>
          </div>

          <div className={`frl-shared-divisor ${factorValid || noCommonFactorSelected ? 'is-valid' : selectedFactor ? 'is-invalid' : ''}`}>
            <span>분자와 분모를 동시에 나눌 수 있는 1보다 큰 수</span>
            <strong>{noCommonFactorSelected ? '없어요' : selectedFactor ? `÷ ${selectedFactor}` : '÷ ?'}</strong>
            <small>{noCommonFactorSelected ? '2와 7의 공약수는 1뿐이에요.' : factorValid ? '분자와 분모가 모두 나누어떨어져요!' : selectedFactor ? '분자와 분모 중 적어도 하나가 나누어떨어지지 않아요.' : '동시에 나누어떨어지는 수를 골라요.'}</small>
          </div>

          {!noCommonFactorSelected && (
            <div className="frl-quotient-work">
              <div>
                <span>{current.numerator} ÷ {selectedFactor || '?'}</span>
                <AnswerFraction
                  value={answers.numerator}
                  onChange={(value) => onAnswer('numerator', value)}
                  disabled={!factorValid || Boolean(preview)}
                  error={checks?.numerator}
                  label="묶은 뒤 새 분자"
                />
              </div>
              <div>
                <span>{current.denominator} ÷ {selectedFactor || '?'}</span>
                <AnswerFraction
                  value={answers.denominator}
                  onChange={(value) => onAnswer('denominator', value)}
                  disabled={!factorValid || Boolean(preview)}
                  error={checks?.denominator}
                  label="묶은 뒤 새 분모"
                />
              </div>
            </div>
          )}

          {!preview ? (
            noCommonFactorSelected ? (
              <button type="button" className="frl-primary-action is-observe" onClick={onConfirmIrreducible}>
                이 분수가 가장 간단한지 확인하기 <ChevronRight size={20} />
              </button>
            ) : (
              <button type="button" className="frl-primary-action" disabled={!factorValid} onClick={onCheck}>
                새 큰 방의 수 확인하기 <ChevronRight size={20} />
              </button>
            )
          ) : (
            <button type="button" className="frl-primary-action is-compress" onClick={onCompress}>
              <Combine size={19} /> 묶음마다 하나의 큰 방으로 바꾸기
            </button>
          )}
        </>
      ) : (
        <div className="frl-simplest-card">
          <Check size={28} strokeWidth={3} />
          <span>빌딩 전체를 같은 크기의 큰 방으로 더 묶을 수 없어요.</span>
          <strong>지금 모습이 가장 간단한 분수예요!</strong>
          <InteractiveLearningRewardNotice state={rewardState} />
          <button type="button" className="frl-primary-action" onClick={onNext}>
            {isLast ? '처음부터 다시 탐구하기' : '다음 약분 탐구'} <ChevronRight size={20} />
          </button>
        </div>
      )}

      <p className="frl-feedback" role="status" aria-live="polite">{feedback}</p>
    </aside>
  )
}

export default function FractionReductionLab({ userId = 'guest', onExit }) {
  const storageKey = `metasense:fraction-reduction-lab:${userId || 'guest'}`
  const initial = useMemo(() => loadProgress(storageKey), [storageKey])
  const [missionIndex, setMissionIndex] = useState(initial.missionIndex)
  const [completed, setCompleted] = useState(initial.completed)
  const [current, setCurrent] = useState(() => ({
    numerator: FRACTION_REDUCTION_MISSIONS[initial.missionIndex].fraction[0],
    denominator: FRACTION_REDUCTION_MISSIONS[initial.missionIndex].fraction[1],
  }))
  const [history, setHistory] = useState(() => [current])
  const [selectedFactor, setSelectedFactor] = useState(null)
  const [answers, setAnswers] = useState({ numerator: '', denominator: '' })
  const [checks, setChecks] = useState(null)
  const [preview, setPreview] = useState(null)
  const [lastTransition, setLastTransition] = useState(null)
  const [conceptComplete, setConceptComplete] = useState(false)
  const [feedback, setFeedback] = useState('분자와 분모를 동시에 나누어 더 간단히 표현할 수 있는 수를 찾아보세요.')
  const { claimCompletion, rewardState, resetRewardState } = useInteractiveLearningReward(userId)

  const mission = FRACTION_REDUCTION_MISSIONS[missionIndex]
  const choices = useMemo(() => buildFactorChoices(current.numerator, current.denominator), [current])
  const commonFactors = useMemo(() => getCommonFactors(current.numerator, current.denominator), [current])
  const irreducible = commonFactors.length === 0
  const noCommonFactorSelected = irreducible && selectedFactor === NO_COMMON_FACTOR
  const factorValid = isCommonFactor(current.numerator, current.denominator, selectedFactor)
  const visualCurrent = conceptComplete && lastTransition ? lastTransition.from : current
  const candidateVisualFactor = conceptComplete && lastTransition ? lastTransition.factor : selectedFactor
  const visualFactor = typeof candidateVisualFactor === 'number' ? candidateVisualFactor : null
  const visualFactorValid = isCommonFactor(visualCurrent.numerator, visualCurrent.denominator, visualFactor)
  const visualLayoutFactor = mission.layoutFactor ?? greatestCommonDivisor(visualCurrent.numerator, visualCurrent.denominator)
  const visualReduced = visualFactorValid
    ? { numerator: visualCurrent.numerator / visualFactor, denominator: visualCurrent.denominator / visualFactor }
    : null
  const isLast = missionIndex === FRACTION_REDUCTION_MISSIONS.length - 1

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ completed, missionIndex }))
  }, [completed, missionIndex, storageKey])

  const resetWork = (index) => {
    const nextMission = FRACTION_REDUCTION_MISSIONS[index]
    const nextCurrent = { numerator: nextMission.fraction[0], denominator: nextMission.fraction[1] }
    setMissionIndex(index)
    setCurrent(nextCurrent)
    setHistory([nextCurrent])
    setSelectedFactor(null)
    setAnswers({ numerator: '', denominator: '' })
    setChecks(null)
    setPreview(null)
    setLastTransition(null)
    setConceptComplete(false)
    resetRewardState()
    setFeedback('분자와 분모를 동시에 나누어 더 간단히 표현할 수 있는 수를 찾아보세요.')
  }

  const chooseFactor = (factor) => {
    setSelectedFactor(factor)
    setAnswers({ numerator: '', denominator: '' })
    setChecks(null)
    setPreview(null)
    if (factor === NO_COMMON_FACTOR) {
      if (irreducible) {
        setFeedback(`맞았어요! 분자 ${current.numerator}와 분모 ${current.denominator}을 동시에 나눌 수 있는 1보다 큰 수가 없어요. 이 분수는 이미 가장 간단해요.`)
        soundManager.playClick?.()
      }
      return
    }
    if (isCommonFactor(current.numerator, current.denominator, factor)) {
      setFeedback(`맞았어요! ${factor}는 분자 ${current.numerator}와 분모 ${current.denominator}의 공약수예요. 새 분자와 분모를 계산해 보세요.`)
      soundManager.playClick?.()
    } else {
      const numeratorRemainder = current.numerator % factor
      const denominatorRemainder = current.denominator % factor
      setFeedback(`${factor}칸씩 묶으면 ${numeratorRemainder ? `색칠한 부분에 ${numeratorRemainder}칸` : ''}${numeratorRemainder && denominatorRemainder ? ', ' : ''}${denominatorRemainder ? `빌딩 전체에 ${denominatorRemainder}칸` : ''}이 남아요. 빌딩 전체를 똑같은 큰 방으로 바꿀 수 없어요.`)
      soundManager.playIncorrect?.()
    }
  }

  const setAnswer = (key, value) => {
    setAnswers((previous) => ({ ...previous, [key]: value }))
    setChecks(null)
  }

  const checkAnswer = () => {
    const result = validateReductionAnswer(current.numerator, current.denominator, selectedFactor, answers)
    setChecks(result)
    if (result.correct) {
      const reduced = reduceFraction(current.numerator, current.denominator, selectedFactor)
      setPreview(reduced)
      setFeedback(`정확해요! ${selectedFactor}칸짜리 묶음 하나를 새 큰 방 하나로 바꿔 보세요.`)
      soundManager.playCorrect?.()
    } else {
      setFeedback('묶음의 개수를 다시 세어 보세요. 분자와 분모를 같은 수로 나누어야 해요.')
      soundManager.playIncorrect?.()
    }
  }

  const compress = () => {
    if (!preview) return
    const next = { numerator: preview.numerator, denominator: preview.denominator }
    const reachedSimplest = preview.simplest
    setLastTransition({ from: current, to: next, factor: selectedFactor })
    setCurrent(next)
    setHistory((previous) => [...previous, next])
    setSelectedFactor(null)
    setAnswers({ numerator: '', denominator: '' })
    setChecks(null)
    setPreview(null)
    if (reachedSimplest) {
      setCompleted((previous) => previous.includes(mission.id) ? previous : [...previous, mission.id])
      setConceptComplete(true)
      setFeedback('빌딩 전체를 같은 크기의 큰 방으로 더 묶을 수 없어요. 가장 간단한 분수 완성!')
      claimCompletion({
        activityId: 'fraction_reduction',
        completionKey: `mission-${missionIndex + 1}`,
        metrics: {
          missionNumber: missionIndex + 1,
          sourceFraction: `${mission.fraction[0]}/${mission.fraction[1]}`,
          finalFraction: `${next.numerator}/${next.denominator}`,
          reductionSteps: history.length,
        },
      })
      soundManager.playCorrect?.()
    } else {
      setFeedback('아직 분자와 분모를 함께 묶을 수 있어요. 다음 공통 묶음 수를 찾아보세요.')
      soundManager.playClick?.()
    }
  }

  const confirmIrreducible = () => {
    if (!irreducible || selectedFactor !== NO_COMMON_FACTOR) return
    setCompleted((previous) => previous.includes(mission.id) ? previous : [...previous, mission.id])
    setConceptComplete(true)
    setFeedback(`${current.numerator}와 ${current.denominator}의 공약수는 1뿐이에요. 분자와 분모를 동시에 더 나눌 수 없으므로 이미 기약분수예요.`)
    claimCompletion({
      activityId: 'fraction_reduction',
      completionKey: `mission-${missionIndex + 1}`,
      metrics: {
        missionNumber: missionIndex + 1,
        sourceFraction: `${mission.fraction[0]}/${mission.fraction[1]}`,
        finalFraction: `${current.numerator}/${current.denominator}`,
        reductionSteps: 0,
        irreducible: true,
      },
    })
    soundManager.playCorrect?.()
  }

  const nextMission = () => {
    resetWork(isLast ? 0 : missionIndex + 1)
    soundManager.playClick?.()
  }

  const finalFraction = getSimplestFraction(mission.fraction[0], mission.fraction[1])

  return (
    <main className="frl-page">
      <header className="frl-topbar">
        <button type="button" className="frl-back" onClick={onExit}><ArrowLeft size={17} /> 분수 행성으로</button>
        <div className="frl-brand"><span>FRACTONIS LAB</span><strong>약분 묶음 연구소</strong></div>
        <div className="frl-progress"><Boxes size={16} /> {completed.length}개 완료 · 전체 {FRACTION_REDUCTION_MISSIONS.length}개</div>
      </header>

      <section className="frl-hero">
        <span>분자와 분모를 함께 묶는 관찰실</span>
        <h1>작은 칸을 묶어, 같은 크기의 큰 방으로 바꿔요.</h1>
        <p>약분은 색칠한 칸과 빌딩 전체 칸을 같은 수만큼씩 묶는 일이에요. 끝까지 남는 칸이 없어야 더 간단한 분수 빌딩으로 바꿀 수 있어요.</p>
      </section>

      <MissionRail activeIndex={missionIndex} completed={completed} onSelect={resetWork} />

      <div className="frl-workspace">
        <section className="frl-observation-panel">
          <div className="frl-coach-row">
            <span>왕새우<br />쌤</span>
            <div><small>탐구 {missionIndex + 1} · {mission.title}</small><strong>{mission.hint}</strong></div>
          </div>

          <div className="frl-current-equation">
            <span>지금 분수</span>
            <Fraction numerator={current.numerator} denominator={current.denominator} />
            <em>{conceptComplete ? '더 나눌 공약수가 없어요' : irreducible ? '분자와 분모를 동시에 나눌 수 있는 수가 있는지 살펴보세요' : '분자와 분모를 동시에 나눌 수 있는 수를 찾아보세요'}</em>
          </div>

          <div className="frl-history" aria-label="약분 과정">
            {history.map((item, index) => (
              <span key={`${item.numerator}-${item.denominator}-${index}`}>
                {index > 0 && <b>=</b>}
                <Fraction numerator={item.numerator} denominator={item.denominator} compact />
              </span>
            ))}
            <small>도착할 기약분수 <Fraction numerator={finalFraction.numerator} denominator={finalFraction.denominator} compact /></small>
          </div>

          <div className={`frl-building-machine ${visualFactorValid || noCommonFactorSelected ? 'is-valid' : visualFactor ? 'is-invalid' : ''} ${preview || noCommonFactorSelected || (conceptComplete && lastTransition) ? 'is-ready' : ''}`}>
            <div className="frl-building-stage">
              <header>
                <span>원래 분수 빌딩</span>
                <Fraction numerator={visualCurrent.numerator} denominator={visualCurrent.denominator} compact />
              </header>
              <FractionBuilding
                numerator={visualCurrent.numerator}
                denominator={visualCurrent.denominator}
                layoutFactor={visualLayoutFactor}
                groupFactor={visualFactor}
              />
              <p>{visualFactor
                ? `${visualFactor}칸씩 묶은 선만 더했어요. 원래 분수의 칸과 색칠은 그대로예요.`
                : noCommonFactorSelected
                  ? '분모 7에 맞춰 나눈 7칸과 색칠한 2칸을 그대로 확인해요.'
                  : '먼저 원래 분수의 전체 칸과 색칠된 칸을 그대로 관찰해요.'}</p>
            </div>

            <div className="frl-building-arrow" aria-hidden="true">
              <strong>{visualFactor ? `÷ ${visualFactor}` : noCommonFactorSelected ? '그대로' : '묶기'}</strong>
              <ChevronRight size={34} />
            </div>

            <div className={`frl-building-stage is-result ${visualFactorValid || noCommonFactorSelected ? '' : 'is-blocked'}`}>
              <header>
                <span>{noCommonFactorSelected ? '이미 가장 간단한 모습' : '큰 방으로 간단히 표현'}</span>
                {visualFactorValid
                  ? <Fraction numerator={visualReduced.numerator} denominator={visualReduced.denominator} compact />
                  : noCommonFactorSelected
                    ? <Fraction numerator={current.numerator} denominator={current.denominator} compact />
                  : <strong>아직 못 바꿔요</strong>}
              </header>
              {visualFactorValid ? (
                <FractionBuilding
                  numerator={visualReduced.numerator}
                  denominator={visualReduced.denominator}
                  layoutFactor={1}
                  compact
                  showGrouping={false}
                />
              ) : noCommonFactorSelected ? (
                <FractionBuilding
                  numerator={current.numerator}
                  denominator={current.denominator}
                  layoutFactor={1}
                  compact
                  showGrouping={false}
                />
              ) : (
                <div className="frl-cannot-compress">
                  <span>{visualFactor ? visualCurrent.denominator % visualFactor : '?'}</span>
                  <strong>{visualFactor ? '마지막에 남는 칸' : '묶을 수를 먼저 골라요'}</strong>
                  <small>{visualFactor ? '모든 큰 방의 크기가 같아야 하므로 새 빌딩을 만들 수 없어요.' : '남는 칸이 없어야 오른쪽 빌딩으로 바꿀 수 있어요.'}</small>
                </div>
              )}
              <p>{visualFactorValid
                ? `세로 ${visualFactor}칸을 합친 한 층이 새 빌딩의 한 칸이 돼요.`
                : noCommonFactorSelected
                  ? '분자와 분모를 동시에 더 나눌 수 없어 분수의 모습이 그대로예요.'
                  : '빌딩 전체가 같은 크기의 층으로 남김없이 묶여야 해요.'}</p>
            </div>
          </div>

          <div className={`frl-principle ${factorValid ? 'is-active' : ''}`}>
            <span>분자와 분모를</span>
            <strong>반드시 같은 수로 나누어야</strong>
            <span>분수의 크기가 그대로예요.</span>
          </div>
        </section>

        <ReductionPanel
          current={current}
          selectedFactor={selectedFactor}
          choices={choices}
          onFactor={chooseFactor}
          answers={answers}
          onAnswer={setAnswer}
          checks={checks}
          preview={preview}
          onCheck={checkAnswer}
          onCompress={compress}
          conceptComplete={conceptComplete}
          irreducible={irreducible}
          onConfirmIrreducible={confirmIrreducible}
          onNext={nextMission}
          isLast={isLast}
          feedback={feedback}
          rewardState={rewardState}
        />
      </div>
    </main>
  )
}
