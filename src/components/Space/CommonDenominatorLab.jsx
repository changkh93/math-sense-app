import { useEffect, useMemo, useState } from 'react'
import {
  ArrowLeft,
  Check,
  ChevronRight,
  Eye,
  Layers3,
  RefreshCcw,
  Sparkles,
} from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import { useInteractiveLearningReward } from '../../hooks/useInteractiveLearningReward'
import InteractiveLearningRewardNotice from './InteractiveLearningRewardNotice'
import {
  COMMON_DENOMINATOR_MISSIONS,
  buildCommonDenominatorPair,
  buildCommonGrid,
  clampLensProgress,
  validateCommonDenominatorAnswer,
  validateComparison,
} from './commonDenominatorLabModel'
import './CommonDenominatorLab.css'

const EMPTY_PROGRESS = { completed: [], missionIndex: 0 }

function loadProgress(storageKey) {
  try {
    const stored = JSON.parse(window.localStorage.getItem(storageKey))
    if (!stored || !Array.isArray(stored.completed)) return EMPTY_PROGRESS
    return {
      completed: stored.completed.filter((id) => COMMON_DENOMINATOR_MISSIONS.some((mission) => mission.id === id)),
      missionIndex: Math.min(
        COMMON_DENOMINATOR_MISSIONS.length - 1,
        Math.max(0, Number(stored.missionIndex) || 0),
      ),
    }
  } catch {
    return EMPTY_PROGRESS
  }
}

function Fraction({ numerator, denominator, compact = false }) {
  return (
    <span className={`cdl-fraction ${compact ? 'is-compact' : ''}`} aria-label={`${denominator}분의 ${numerator}`}>
      <span>{numerator}</span>
      <span>{denominator}</span>
    </span>
  )
}

function MissionRail({ activeIndex, completed, onSelect }) {
  return (
    <nav className="cdl-mission-rail" aria-label="통분 렌즈 탐구 목록">
      {COMMON_DENOMINATOR_MISSIONS.map((mission, index) => {
        const complete = completed.includes(mission.id)
        const unlocked = index === 0 || completed.includes(COMMON_DENOMINATOR_MISSIONS[index - 1].id)
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

function CommonFractionCard({ side, fraction, factor, partnerDenominator, commonDenominator, lensProgress, snapped }) {
  const cells = useMemo(() => buildCommonGrid(fraction, factor), [factor, fraction])
  const lensOffset = (1 - lensProgress) * -112
  const label = side === 'left' ? '파란 카드' : '보라 카드'
  const followsPartnerDenominator = factor === partnerDenominator

  return (
    <article className={`cdl-card-shell is-${side}`}>
      <div className="cdl-card-title">
        <span>{label}</span>
        <Fraction numerator={fraction.numerator} denominator={fraction.denominator} compact />
      </div>
      <div className="cdl-split-reason">
        {factor === 1 ? (
          <>이미 전체가 <strong>{commonDenominator}칸</strong>이라 그대로 두어요.</>
        ) : followsPartnerDenominator ? (
          <>옆 분수의 <strong>분모 {partnerDenominator}</strong> → 각 칸을 <strong>{factor}등분</strong></>
        ) : (
          <>전체가 <strong>{commonDenominator}칸</strong>이 되도록 각 칸을 <strong>{factor}등분</strong></>
        )}
      </div>
      <div className={`cdl-paper-card ${snapped ? 'is-snapped' : ''}`} style={{ '--columns': fraction.denominator }}>
        <div className="cdl-base-slices" aria-label={`${fraction.denominator}칸 중 ${fraction.numerator}칸 색칠`}>
          {Array.from({ length: fraction.denominator }, (_, column) => (
            <i key={column} className={column < fraction.numerator ? 'is-shaded' : ''} />
          ))}
        </div>
        <div
          className={`cdl-divider-lens ${snapped ? 'is-snapped' : ''}`}
          style={{ '--rows': factor, transform: `translateY(${lensOffset}%)` }}
          aria-hidden="true"
        >
          {Array.from({ length: factor }, (_, row) => <i key={row} />)}
          <span><Layers3 size={14} /> {factor === 1 ? '그대로' : `각 칸 ${factor}등분`}</span>
        </div>
        {snapped && (
          <div
            className="cdl-common-grid"
            style={{ '--columns': fraction.denominator, '--rows': factor }}
            aria-label={`${commonDenominator}개의 같은 크기 방 중 ${fraction.commonNumerator}개 색칠`}
          >
            {cells.map((cell) => <i key={cell.id} className={cell.shaded ? 'is-shaded' : ''} />)}
          </div>
        )}
      </div>
      <div className={`cdl-card-math ${snapped ? 'is-visible' : ''}`}>
        <span>전체 칸: {fraction.denominator} × {factor} = {commonDenominator}</span>
        <Fraction numerator={fraction.commonNumerator} denominator={commonDenominator} compact />
        <span>색칠 칸: {fraction.numerator} × {factor} = {fraction.commonNumerator}</span>
      </div>
    </article>
  )
}

function FractionAnswer({ source, numerator, denominator, onNumerator, onDenominator, disabled, errors }) {
  return (
    <div className="cdl-answer-fraction-row">
      <Fraction numerator={source.numerator} denominator={source.denominator} compact />
      <span className="cdl-answer-equals" aria-hidden="true">=</span>
      <div className="cdl-input-fraction">
        <input
          value={numerator}
          onChange={(event) => onNumerator(event.target.value.replace(/\D/g, '').slice(0, 2))}
          inputMode="numeric"
          placeholder="?"
          disabled={disabled}
          className={errors?.numerator === false ? 'has-error' : ''}
          aria-label={`${source.denominator}분의 ${source.numerator}을 통분한 분자`}
        />
        <span aria-hidden="true" />
        <input
          value={denominator}
          onChange={(event) => onDenominator(event.target.value.replace(/\D/g, '').slice(0, 2))}
          inputMode="numeric"
          placeholder="?"
          disabled={disabled}
          className={errors?.denominator === false ? 'has-error' : ''}
          aria-label={`${source.denominator}분의 ${source.numerator}을 통분한 분모`}
        />
      </div>
    </div>
  )
}

function AnswerPanel({ mission, pair, snapped, answers, setAnswer, answerState, checks, feedback, onCheck, comparisonChoice, comparisonState, onCompare, onNext, isLast, rewardState }) {
  const transformed = answerState === 'correct'
  return (
    <aside className={`cdl-answer-panel ${snapped ? 'is-ready' : ''}`}>
      <div className="cdl-answer-heading">
        <span><Sparkles size={17} /> 이제 같은 크기의 칸으로 바꿔 봐요</span>
        <strong>{mission.prompt}</strong>
      </div>

      <div className="cdl-common-denominator-badge">
        <small>공통으로 나눈 전체 칸 수</small>
        <strong>{snapped ? pair.commonDenominator : '?'}</strong>
        <div className="cdl-unit-fraction">
          {snapped ? <><span>각 칸은 전체의</span><Fraction numerator={1} denominator={pair.commonDenominator} compact /></> : <span>렌즈를 내려 확인해 보세요.</span>}
        </div>
      </div>

      <div className="cdl-answer-fractions">
        <FractionAnswer
          source={pair.left}
          numerator={answers.leftNumerator}
          denominator={answers.leftDenominator}
          onNumerator={(value) => setAnswer('leftNumerator', value)}
          onDenominator={(value) => setAnswer('leftDenominator', value)}
          disabled={!snapped || transformed}
          errors={{ numerator: checks?.leftNumerator, denominator: checks?.leftDenominator }}
        />
        <FractionAnswer
          source={pair.right}
          numerator={answers.rightNumerator}
          denominator={answers.rightDenominator}
          onNumerator={(value) => setAnswer('rightNumerator', value)}
          onDenominator={(value) => setAnswer('rightDenominator', value)}
          disabled={!snapped || transformed}
          errors={{ numerator: checks?.rightNumerator, denominator: checks?.rightDenominator }}
        />
      </div>

      {!transformed ? (
        <button type="button" className="cdl-primary-action" disabled={!snapped} onClick={onCheck}>
          통분한 두 분수 확인하기 <ChevronRight size={20} />
        </button>
      ) : (
        <div className="cdl-comparison-step">
          <span>같은 크기로 나뉜 색칠 칸 수를 보고 알맞은 기호를 골라요.</span>
          <div className="cdl-comparison-equation">
            <Fraction numerator={pair.left.commonNumerator} denominator={pair.commonDenominator} compact />
            <div className="cdl-comparison-buttons" aria-label="분수 크기 비교 기호">
              {['<', '=', '>'].map((symbol) => (
                <button
                  type="button"
                  key={symbol}
                  className={comparisonChoice === symbol ? (comparisonState === 'correct' ? 'is-correct' : 'is-selected') : ''}
                  onClick={() => onCompare(symbol)}
                  aria-label={`${symbol} 기호`}
                >
                  {symbol}
                </button>
              ))}
            </div>
            <Fraction numerator={pair.right.commonNumerator} denominator={pair.commonDenominator} compact />
          </div>
          {comparisonState === 'correct' && (
            <button type="button" className="cdl-primary-action" onClick={onNext}>
              {isLast ? '발견 정리하기' : '다음 통분 탐구'} <ChevronRight size={20} />
            </button>
          )}
        </div>
      )}

      <p className={`cdl-feedback ${answerState === 'correct' ? 'is-correct' : ''} ${comparisonState === 'wrong' ? 'is-wrong' : ''}`} role="status" aria-live="polite">
        {feedback || (snapped ? '두 카드에서 색칠된 칸과 전체 칸의 수를 세어 써 보세요.' : '먼저 렌즈를 카드 위에 끝까지 내려 보세요.')}
      </p>
      <InteractiveLearningRewardNotice state={rewardState} />
    </aside>
  )
}

export default function CommonDenominatorLab({ userId = 'guest', onExit }) {
  const storageKey = `metasense:common-denominator-lab:${userId || 'guest'}`
  const initial = useMemo(() => loadProgress(storageKey), [storageKey])
  const [missionIndex, setMissionIndex] = useState(initial.missionIndex)
  const [completed, setCompleted] = useState(initial.completed)
  const [lensProgress, setLensProgress] = useState(0)
  const [answers, setAnswers] = useState({ leftNumerator: '', leftDenominator: '', rightNumerator: '', rightDenominator: '' })
  const [answerState, setAnswerState] = useState('')
  const [checks, setChecks] = useState(null)
  const [comparisonChoice, setComparisonChoice] = useState('')
  const [comparisonState, setComparisonState] = useState('')
  const [feedback, setFeedback] = useState('')
  const [reducedMotion, setReducedMotion] = useState(false)
  const { claimCompletion, rewardState, resetRewardState } = useInteractiveLearningReward(userId)

  const mission = COMMON_DENOMINATOR_MISSIONS[missionIndex]
  const pair = useMemo(() => buildCommonDenominatorPair(mission.left, mission.right), [mission])
  const snapped = lensProgress >= 0.995
  const isLast = missionIndex === COMMON_DENOMINATOR_MISSIONS.length - 1

  useEffect(() => {
    const query = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    const update = () => setReducedMotion(Boolean(query?.matches))
    update()
    query?.addEventListener?.('change', update)
    return () => query?.removeEventListener?.('change', update)
  }, [])

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ completed, missionIndex }))
  }, [completed, missionIndex, storageKey])

  const selectMission = (index) => {
    setMissionIndex(index)
    resetRewardState()
    setLensProgress(0)
    setAnswers({ leftNumerator: '', leftDenominator: '', rightNumerator: '', rightDenominator: '' })
    setAnswerState('')
    setChecks(null)
    setComparisonChoice('')
    setComparisonState('')
    setFeedback('')
  }

  const setAnswer = (key, value) => {
    setAnswers((current) => ({ ...current, [key]: value }))
    setAnswerState('')
    setChecks(null)
    setFeedback('')
  }

  const checkAnswer = () => {
    const result = validateCommonDenominatorAnswer(pair, answers)
    setChecks(result)
    if (result.correct) {
      setAnswerState('correct')
      setFeedback(`좋아요! 두 카드 모두 전체가 ${pair.commonDenominator}칸으로 나뉘었어요. 이제 같은 크기의 색칠 칸 수를 비교해 봐요.`)
      soundManager.playCorrect?.()
    } else {
      setAnswerState('wrong')
      setFeedback('렌즈 위의 작은 칸을 다시 세어 보세요. 통분한 뒤에는 두 분모가 반드시 같아야 해요.')
      soundManager.playIncorrect?.()
    }
  }

  const compare = (symbol) => {
    setComparisonChoice(symbol)
    if (validateComparison(pair, symbol)) {
      setComparisonState('correct')
      setFeedback(`${mission.observation} 통분하면 같은 크기의 칸끼리 정확하게 비교할 수 있어요.`)
      setCompleted((current) => current.includes(mission.id) ? current : [...current, mission.id])
      claimCompletion({
        activityId: 'common_denominator',
        completionKey: `mission-${missionIndex + 1}`,
        metrics: {
          missionNumber: missionIndex + 1,
          leftFraction: `${pair.left.numerator}/${pair.left.denominator}`,
          rightFraction: `${pair.right.numerator}/${pair.right.denominator}`,
          commonDenominator: pair.commonDenominator,
          comparison: symbol,
        },
      })
      soundManager.playCorrect?.()
    } else {
      setComparisonState('wrong')
      setFeedback('분모가 같아졌으니 같은 크기의 색칠 칸 수, 즉 분자만 비교해 보세요.')
      soundManager.playIncorrect?.()
    }
  }

  const nextMission = () => {
    if (isLast) {
      selectMission(0)
      return
    }
    selectMission(missionIndex + 1)
    soundManager.playClick?.()
  }

  return (
    <main className={`cdl-page ${reducedMotion ? 'is-reduced-motion' : ''}`}>
      <header className="cdl-topbar">
        <button type="button" className="cdl-back" onClick={onExit}><ArrowLeft size={17} /> 분수 행성으로</button>
        <div className="cdl-brand"><span>FRACTONIS LAB</span><strong>통분 겹침 렌즈</strong></div>
        <div className="cdl-progress-badge"><Eye size={16} /> {completed.length}개 완료 · 전체 {COMMON_DENOMINATOR_MISSIONS.length}개</div>
      </header>

      <section className="cdl-hero">
        <span className="cdl-hero-kicker">통분을 눈으로 이해하는 관찰실</span>
        <h1>칸의 크기를 맞추면, 두 분수를 바로 비교할 수 있어요.</h1>
        <p>분모는 전체를 몇 칸으로 나누는지를 나타내요. 두 카드의 전체를 같은 수의 칸으로 나누면, 한 칸의 크기가 같아져 정확히 비교할 수 있어요.</p>
      </section>

      <MissionRail activeIndex={missionIndex} completed={completed} onSelect={selectMission} />

      <div className="cdl-workspace">
        <section className="cdl-observation-panel">
          <div className="cdl-coach-row">
            <span className="cdl-coach-avatar">왕새우<br />쌤</span>
            <div><small>탐구 {missionIndex + 1} · {mission.title}</small><strong>분모는 전체를 나누는 수예요. 두 렌즈를 내려 각 칸을 더 잘게 나눠 보세요.</strong></div>
          </div>

          <div className="cdl-original-pair">
            <Fraction numerator={pair.left.numerator} denominator={pair.left.denominator} />
            <span>와</span>
            <Fraction numerator={pair.right.numerator} denominator={pair.right.denominator} />
            <em>{snapped ? `→ 둘 다 전체를 ${pair.commonDenominator}칸으로 나눔` : '→ 아직 한 칸의 크기가 달라요'}</em>
          </div>

          <div className="cdl-denominator-guide">
            <div>
              <Fraction numerator={pair.left.numerator} denominator={pair.left.denominator} compact />
              <span><strong>분모 {pair.left.denominator}</strong>는 전체를 {pair.left.denominator}칸으로 나누라는 뜻</span>
            </div>
            <div>
              <Fraction numerator={pair.right.numerator} denominator={pair.right.denominator} compact />
              <span><strong>분모 {pair.right.denominator}</strong>는 전체를 {pair.right.denominator}칸으로 나누라는 뜻</span>
            </div>
          </div>

          <div className="cdl-card-stage">
            <CommonFractionCard side="left" fraction={pair.left} factor={pair.left.factor} partnerDenominator={pair.right.denominator} commonDenominator={pair.commonDenominator} lensProgress={lensProgress} snapped={snapped} />
            <div className={`cdl-room-lock ${snapped ? 'is-unlocked' : ''}`}>
              <span>{snapped ? '두 카드의 한 칸 크기' : '한 칸 크기 비교 중'}</span>
              {snapped ? <Fraction numerator={1} denominator={pair.commonDenominator} compact /> : <strong>≠</strong>}
            </div>
            <CommonFractionCard side="right" fraction={pair.right} factor={pair.right.factor} partnerDenominator={pair.left.denominator} commonDenominator={pair.commonDenominator} lensProgress={lensProgress} snapped={snapped} />
          </div>

          <div className="cdl-lens-controls">
            <label>
              <span>두 렌즈의 위치</span>
              <input
                type="range"
                min="0"
                max="100"
                value={Math.round(lensProgress * 100)}
                onChange={(event) => setLensProgress(clampLensProgress(Number(event.target.value) / 100))}
                aria-label="두 통분 렌즈 위치"
              />
            </label>
            <button type="button" onClick={() => setLensProgress(snapped ? 0 : 1)}>
              {snapped ? <><RefreshCcw size={17} /> 다시 떼어 보기</> : <><Layers3 size={17} /> 두 렌즈 겹치기</>}
            </button>
          </div>

          <div className={`cdl-discovery-strip ${snapped ? 'is-revealed' : ''}`}>
            <div><span>파란 카드의 색칠 칸</span><strong>{snapped ? pair.left.commonNumerator : pair.left.numerator}칸</strong></div>
            <span>한 칸 크기 {snapped ? '같음' : '다름'}</span>
            <div><span>보라 카드의 색칠 칸</span><strong>{snapped ? pair.right.commonNumerator : pair.right.numerator}칸</strong></div>
          </div>
        </section>

        <AnswerPanel
          mission={mission}
          pair={pair}
          snapped={snapped}
          answers={answers}
          setAnswer={setAnswer}
          answerState={answerState}
          checks={checks}
          feedback={feedback}
          onCheck={checkAnswer}
          comparisonChoice={comparisonChoice}
          comparisonState={comparisonState}
          onCompare={compare}
          onNext={nextMission}
          isLast={isLast}
          rewardState={rewardState}
        />
      </div>
    </main>
  )
}
