import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Delete, RotateCcw, Sparkles, Trophy, Volume2 } from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import {
  MULTIPLICATION_TABLES,
  buildMultiplicationChant,
  buildMultiplicationGrid,
  buildRetryQueue,
  buildStudyPlan,
  getKoreanDateKey,
  selectPracticeFacts,
  selectWeakFacts,
  updateConfidenceStats,
  updateFactStats,
} from './multiplicationCardLabModel'
import { playMultiplicationChantAudio, primeMultiplicationChantAudio } from './multiplicationChantAudio'
import { useInteractiveLearningReward } from '../../hooks/useInteractiveLearningReward'
import InteractiveLearningRewardNotice from './InteractiveLearningRewardNotice'
import './MultiplicationCardLab.css'

const DEFAULT_PROGRESS = { selectedTables: [2], practiceSelected: false, factStats: {} }

function loadProgress(storageKey) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey))
    const selectedTables = Array.isArray(saved?.selectedTables)
      ? saved.selectedTables.filter((table) => MULTIPLICATION_TABLES.includes(Number(table))).map(Number)
      : DEFAULT_PROGRESS.selectedTables
    return {
      selectedTables,
      practiceSelected: Boolean(saved?.practiceSelected),
      factStats: saved?.factStats && typeof saved.factStats === 'object' ? saved.factStats : {},
    }
  } catch {
    return DEFAULT_PROGRESS
  }
}

function NumberPad({ onDigit, onDelete }) {
  return (
    <div className="mcl-number-pad" aria-label="숫자 키패드">
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => (
        <button type="button" key={digit} onClick={() => onDigit(String(digit))}>{digit}</button>
      ))}
      <button type="button" className="mcl-delete-key" onClick={onDelete} aria-label="한 글자 지우기">
        <Delete size={20} />
      </button>
    </div>
  )
}

function DeckPile({ kind, count, label, note }) {
  return (
    <div className={`mcl-deck-pile is-${kind}`}>
      <div className="mcl-stack" aria-hidden="true">
        <span /><span /><span className="mcl-stack-front">{count}</span>
      </div>
      <strong>{label}</strong>
      <small>{note}</small>
    </div>
  )
}

function TableSelector({ selectedTables, onToggle, practiceSelected, practiceCount, onPracticeToggle, disabled }) {
  return (
    <div className="mcl-table-picker" aria-label="연습할 단 선택">
      {MULTIPLICATION_TABLES.map((table) => {
        const selected = selectedTables.includes(table)
        return (
          <button
            type="button"
            key={table}
            className={selected ? 'is-selected' : ''}
            onClick={() => onToggle(table)}
            disabled={disabled}
            aria-pressed={selected}
          >
            {table}단
          </button>
        )
      })}
      <button
        type="button"
        className={`mcl-practice-choice ${practiceSelected ? 'is-selected' : ''}`}
        onClick={onPracticeToggle}
        disabled={disabled}
        aria-pressed={practiceSelected}
      >
        <span>한 번 더!</span>
        <small>{practiceCount}장</small>
      </button>
    </div>
  )
}

function MultiplicationTable({ fact, revealAnswer = false, spokenStep = 0 }) {
  const grid = buildMultiplicationGrid(fact)

  return (
    <div className="mcl-times-table-scroll">
      <div className="mcl-times-table" role="grid" aria-label={`${fact.table} 곱하기 ${fact.multiplier} 직사각형 곱셈표`}>
        {grid.map((rowCells) => {
          const row = rowCells[0].row
          return (
            <div className="mcl-times-row" role="row" key={row}>
              <span className={`mcl-axis-cell mcl-row-axis ${row === fact.table ? 'is-current' : ''}`} role="rowheader">{row}</span>
              {rowCells.map((cell) => {
                const classes = [
                  'mcl-product-cell',
                  cell.isArea ? 'is-area' : '',
                  cell.isTopRow ? 'is-top-row' : '',
                  cell.isTopRow && cell.column < fact.multiplier && cell.column <= spokenStep ? 'is-sequence-light' : '',
                  cell.isTarget ? 'is-target' : '',
                  cell.isTarget && spokenStep >= fact.multiplier ? 'is-voice-cue' : '',
                  cell.isArea && cell.isTopRow ? 'is-rect-top' : '',
                  cell.isArea && row === 1 ? 'is-rect-bottom' : '',
                  cell.isArea && cell.column === 1 ? 'is-rect-left' : '',
                  cell.isArea && cell.column === fact.multiplier ? 'is-rect-right' : '',
                ].filter(Boolean).join(' ')

                return (
                  <span
                    role="gridcell"
                    key={`${row}-${cell.column}`}
                    className={classes}
                    aria-label={cell.isTarget && !revealAnswer ? `${fact.table} 곱하기 ${fact.multiplier}, 답 쓰는 칸` : `${row} 곱하기 ${cell.column}은 ${cell.product}`}
                  >
                    {cell.isTarget && !revealAnswer ? '?' : cell.product}
                  </span>
                )
              })}
            </div>
          )
        })}
        <div className="mcl-times-row mcl-column-axis" role="row">
          <span className="mcl-axis-cell" aria-hidden="true">×</span>
          {Array.from({ length: 12 }, (_, index) => index + 1).map((column) => (
            <span className={`mcl-axis-cell ${column <= fact.multiplier ? 'is-inside-width' : ''}`} role="columnheader" key={column}>{column}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function RectangleProof({ fact }) {
  return (
    <div className="mcl-rectangle-proof-wrap">
      <strong>{fact.table}줄 × {fact.multiplier}칸</strong>
      <div className="mcl-rectangle-proof" style={{ '--proof-columns': fact.multiplier }} aria-label={`${fact.table}줄, 한 줄에 ${fact.multiplier}칸인 직사각형`}>
        {Array.from({ length: fact.answer }, (_, index) => <i key={index} />)}
      </div>
    </div>
  )
}

function MultiplicationCardLab({ userId, onExit }) {
  const storageKey = `metasense_times_card_lab_v1:${userId || 'guest'}`
  const saved = useMemo(() => loadProgress(storageKey), [storageKey])
  const [selectedTables, setSelectedTables] = useState(saved.selectedTables)
  const [practiceSelected, setPracticeSelected] = useState(saved.practiceSelected)
  const [factStats, setFactStats] = useState(saved.factStats)
  const [screen, setScreen] = useState('setup')
  const [plan, setPlan] = useState(null)
  const [queue, setQueue] = useState([])
  const [cardIndex, setCardIndex] = useState(0)
  const [face, setFace] = useState('front')
  const [answer, setAnswer] = useState('')
  const [outcome, setOutcome] = useState(null)
  const [masteredIds, setMasteredIds] = useState(() => new Set())
  const [retryIds, setRetryIds] = useState(() => new Set())
  const [round, setRound] = useState(1)
  const [sessionErrors, setSessionErrors] = useState(0)
  const [spokenStep, setSpokenStep] = useState(0)
  const [speechState, setSpeechState] = useState('idle')
  const answerRef = useRef(null)
  const speechRunRef = useRef(0)
  const audioStopRef = useRef(null)
  const today = getKoreanDateKey()
  const { claimCompletion, rewardState, resetRewardState } = useInteractiveLearningReward(userId)

  const currentCard = queue[cardIndex]
  const practiceFacts = useMemo(() => selectPracticeFacts(factStats), [factStats])
  const previewPlan = useMemo(
    () => buildStudyPlan(selectedTables, factStats, { today, random: () => 0.5, includePractice: practiceSelected }),
    [factStats, practiceSelected, selectedTables, today],
  )
  const weakPreview = useMemo(
    () => selectWeakFacts(previewPlan.allFacts, factStats, today),
    [factStats, previewPlan.allFacts, today],
  )

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify({ selectedTables, practiceSelected, factStats }))
  }, [factStats, practiceSelected, selectedTables, storageKey])

  useEffect(() => {
    if (screen !== 'study' || face !== 'front') return
    const timer = window.setTimeout(() => answerRef.current?.focus(), 120)
    return () => window.clearTimeout(timer)
  }, [cardIndex, face, screen])

  const stopChant = useCallback(() => {
    speechRunRef.current += 1
    audioStopRef.current?.()
    audioStopRef.current = null
    window.speechSynthesis?.cancel()
  }, [])

  const playChant = useCallback(() => {
    if (!currentCard || face !== 'front') return
    stopChant()
    const runId = speechRunRef.current
    setSpokenStep(0)
    setSpeechState('speaking')

    const playBrowserFallback = () => {
      if (speechRunRef.current !== runId) return
      const synth = window.speechSynthesis
      const Utterance = window.SpeechSynthesisUtterance
      if (!synth || !Utterance) {
        setSpokenStep(currentCard.multiplier)
        setSpeechState('unavailable')
        return
      }

      const koreanVoice = synth.getVoices().find((voice) => voice.lang?.toLowerCase().startsWith('ko'))
      const phrases = buildMultiplicationChant(currentCard)
      phrases.forEach((phrase, index) => {
        const utterance = new Utterance(phrase)
        utterance.lang = 'ko-KR'
        utterance.rate = 1.45
        utterance.pitch = 1.04
        if (koreanVoice) utterance.voice = koreanVoice
        utterance.onstart = () => {
          if (speechRunRef.current === runId) setSpokenStep(index + 1)
        }
        utterance.onend = () => {
          if (speechRunRef.current === runId && index === phrases.length - 1) setSpeechState('idle')
        }
        utterance.onerror = () => {
          if (speechRunRef.current === runId) {
            setSpokenStep(currentCard.multiplier)
            setSpeechState('idle')
          }
        }
        synth.speak(utterance)
      })
    }

    audioStopRef.current = playMultiplicationChantAudio(currentCard, {
      onStep: (step) => {
        if (speechRunRef.current === runId) setSpokenStep(step)
      },
      onEnd: () => {
        if (speechRunRef.current === runId) setSpeechState('idle')
      },
      onError: playBrowserFallback,
    })
  }, [currentCard, face, stopChant])

  useEffect(() => {
    if (screen !== 'study' || face !== 'front' || !currentCard) {
      stopChant()
      return undefined
    }
    const timer = window.setTimeout(playChant, 180)
    return () => {
      window.clearTimeout(timer)
      stopChant()
    }
  }, [currentCard, face, playChant, screen, stopChant])

  const toggleTable = (table) => {
    setSelectedTables((current) => current.includes(table)
      ? current.filter((value) => value !== table)
      : [...current, table].sort((a, b) => a - b))
    soundManager.playClick?.()
  }

  const startStudy = () => {
    const nextPlan = buildStudyPlan(selectedTables, factStats, { today, includePractice: practiceSelected })
    if (!nextPlan.queue.length) return
    primeMultiplicationChantAudio(nextPlan.queue.map((fact) => fact.table))
    setPlan(nextPlan)
    setQueue(nextPlan.queue)
    setCardIndex(0)
    setFace('front')
    setAnswer('')
    setOutcome(null)
    setMasteredIds(new Set())
    setRetryIds(new Set())
    setRound(1)
    setSessionErrors(0)
    setSpokenStep(0)
    setSpeechState('idle')
    resetRewardState()
    setScreen('study')
    soundManager.playWarp?.()
  }

  const submitAnswer = (event) => {
    event?.preventDefault()
    if (!currentCard || answer === '' || face !== 'front') return
    const correct = Number(answer) === currentCard.answer
    setFactStats((current) => updateFactStats(current, currentCard.id, correct, today))
    if (!correct) {
      setMasteredIds((current) => {
        const next = new Set(current)
        next.delete(currentCard.id)
        return next
      })
      setRetryIds((current) => new Set(current).add(currentCard.id))
      setSessionErrors((count) => count + 1)
    }
    setOutcome({ correct, given: Number(answer) })
    setFace('back')
    setSpeechState('idle')
    if (correct) {
      claimCompletion({
        activityId: 'multiplication_cards',
        completionKey: `card-${currentCard.table}x${currentCard.multiplier}`,
        metrics: { table: currentCard.table, multiplier: currentCard.multiplier, answer: currentCard.answer, round },
      })
      soundManager.playCorrect?.()
    } else soundManager.playError?.()
  }

  const showNextCard = (confidence) => {
    const needsRetry = !outcome?.correct || confidence === 'hard'
    const nextRetryIds = new Set(retryIds)
    if (needsRetry) nextRetryIds.add(currentCard.id)
    else nextRetryIds.delete(currentCard.id)

    setFactStats((current) => updateConfidenceStats(current, currentCard.id, confidence, Boolean(outcome?.correct), today))
    setRetryIds(nextRetryIds)
    setMasteredIds((current) => {
      const next = new Set(current)
      if (outcome?.correct && confidence === 'easy') next.add(currentCard.id)
      else next.delete(currentCard.id)
      return next
    })

    if (cardIndex < queue.length - 1) {
      setCardIndex((index) => index + 1)
    } else {
      const retryQueue = buildRetryQueue(nextRetryIds, plan.allFacts)
      if (retryQueue.length) {
        setQueue(retryQueue)
        setCardIndex(0)
        setRound((value) => value + 1)
      } else {
        setScreen('complete')
        soundManager.playComplete?.()
        return
      }
    }
    setAnswer('')
    setOutcome(null)
    setFace('front')
    setSpokenStep(0)
    setSpeechState('idle')
    resetRewardState()
    soundManager.playClick?.()
  }

  const resetToSetup = () => {
    setScreen('setup')
    setPlan(null)
    setQueue([])
    setAnswer('')
    setOutcome(null)
    setSpokenStep(0)
    setSpeechState('idle')
    resetRewardState()
    soundManager.playClick?.()
  }

  const phaseLabel = currentCard?.phase === 'focus'
    ? '어제의 집중 카드'
    : currentCard?.phase === 'practice'
      ? '한 번 더 카드'
    : currentCard?.phase === 'retry'
      ? `다시 도전 ${round - 1}회`
      : '오늘의 전체 카드'
  const canStart = previewPlan.queue.length > 0
  const selectionLabel = [
    ...selectedTables.map((table) => `${table}단`),
    ...(practiceSelected ? ['한 번 더!'] : []),
  ].join(' · ')

  return (
    <div className="mcl-shell">
      <header className="mcl-header">
        <button type="button" className="mcl-back" onClick={onExit}>
          <ArrowLeft size={18} /> 멀티플루비아로
        </button>
        <div className="mcl-brand">
          <small>체험 학습</small>
          <strong>구구단 불빛 카드</strong>
        </div>
        {screen !== 'setup' ? (
          <button type="button" className="mcl-reset" onClick={resetToSetup}>
            <RotateCcw size={16} /> 단 다시 고르기
          </button>
        ) : <span />}
      </header>

      <main className="mcl-main">
        <section className="mcl-selector-card">
          <div>
            <small>연습할 단을 여러 개 골라도 좋아요</small>
            <h1>{screen === 'setup' ? '오늘 어떤 단을 밝혀 볼까요?' : selectionLabel}</h1>
          </div>
          <TableSelector
            selectedTables={selectedTables}
            onToggle={toggleTable}
            practiceSelected={practiceSelected}
            practiceCount={practiceFacts.length}
            onPracticeToggle={() => {
              setPracticeSelected((selected) => !selected)
              soundManager.playClick?.()
            }}
            disabled={screen !== 'setup'}
          />
          {screen === 'setup' && (
            <div className="mcl-picker-actions">
              <button type="button" onClick={() => setSelectedTables(MULTIPLICATION_TABLES)}>모두 선택</button>
              <button type="button" onClick={() => {
                setSelectedTables([])
                setPracticeSelected(false)
              }}>선택 지우기</button>
            </div>
          )}
        </section>

        {screen === 'setup' && (
          <section className="mcl-setup-grid">
            <div className="mcl-coach-panel">
              <div className="mcl-coach-avatar">왕새우<br />쌤</div>
              <div>
                <small><Sparkles size={15} /> 카드 앞면에서 답을 쓰고, 뒷면에서 원리를 확인해요</small>
                <h2>{canStart ? `${previewPlan.queue.length}장의 연습 카드` : practiceSelected ? '아직 ‘한 번 더!’ 카드가 없어요' : '먼저 연습할 단을 골라요'}</h2>
                <p>맞힌 뒤에도 느낌을 알려 주세요. 틀린 카드와 ‘조금 어려워요’ 카드는 다시 나와요.</p>
                {weakPreview.length > 0 && (
                  <div className="mcl-focus-notice">
                    오늘의 집중 카드 {weakPreview.length}장 · 지난 학습에서 자주 헷갈린 문제부터 시작해요.
                  </div>
                )}
                {practiceSelected && practiceFacts.length > 0 && (
                  <div className="mcl-practice-notice">
                    ‘한 번 더!’ {practiceFacts.length}장 · 틀렸거나 어려웠던 카드를 다시 연습해요.
                  </div>
                )}
              </div>
            </div>
            <button type="button" className="mcl-start" onClick={startStudy} disabled={!canStart}>
              카드 섞고 시작하기 <ChevronRight size={21} />
            </button>
          </section>
        )}

        {screen === 'study' && currentCard && (
          <section className="mcl-study-area">
            <div className="mcl-progress-row">
              <span>{phaseLabel}</span>
              <div className="mcl-progress-track"><i style={{ width: `${((cardIndex + 1) / queue.length) * 100}%` }} /></div>
              <strong>{cardIndex + 1}/{queue.length}</strong>
            </div>

            <div className="mcl-study-grid">
              <DeckPile kind="mastered" count={masteredIds.size} label="맞힌 카드" note="내가 밝힌 카드" />

              <div
                className={`mcl-flip-stage ${face === 'back' ? 'is-flipped' : ''}`}
                style={{ '--mcl-card-height': `${Math.max(690, 490 + (currentCard.table * 28))}px` }}
              >
                <div className="mcl-flip-card">
                  <article className="mcl-card-face mcl-card-front" aria-hidden={face === 'back'}>
                    <div className="mcl-card-kicker"><span>{currentCard.table}단</span><small>{phaseLabel}</small></div>
                    <h2>{currentCard.table} × {currentCard.multiplier} = <em>?</em></h2>
                    <div className="mcl-sequence-guide">
                      <div>
                        <p className="mcl-sequence-title">맨 윗줄의 불빛과 구구단 소리를 함께 따라가요</p>
                        <small className="mcl-ai-voice-note">AI로 만든 학습 음성</small>
                      </div>
                      <button
                        type="button"
                        className={speechState === 'speaking' ? 'is-speaking' : ''}
                        onClick={playChant}
                        disabled={speechState === 'unavailable'}
                        aria-label="구구단 다시 듣기"
                      >
                        <Volume2 size={16} /> {speechState === 'unavailable' ? '음성 미지원' : speechState === 'speaking' ? '구구단 듣는 중' : '다시 듣기'}
                      </button>
                    </div>
                    <MultiplicationTable fact={currentCard} spokenStep={spokenStep} />
                    <form className="mcl-answer-form" onSubmit={submitAnswer}>
                      <label htmlFor="mcl-answer">물음표에 들어갈 수</label>
                      <input
                        ref={answerRef}
                        id="mcl-answer"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        autoComplete="off"
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value.replace(/\D/g, '').slice(0, 3))}
                        aria-label="곱셈 답"
                      />
                      <NumberPad
                        onDigit={(digit) => setAnswer((current) => `${current}${digit}`.slice(0, 3))}
                        onDelete={() => setAnswer((current) => current.slice(0, -1))}
                      />
                      <button type="submit" className="mcl-check" disabled={!answer}>카드 뒤집어 확인하기</button>
                    </form>
                  </article>

                  <article className={`mcl-card-face mcl-card-back ${outcome?.correct ? 'is-correct' : 'is-wrong'}`} aria-hidden={face === 'front'} aria-live="polite">
                    <div className="mcl-result-icon">{outcome?.correct ? <Check size={44} /> : '↻'}</div>
                    <small>{outcome?.correct ? '불빛을 모두 밝혔어요!' : '이 카드는 다시 볼 데크로!'}</small>
                    <h2>{currentCard.table} × {currentCard.multiplier} = {currentCard.answer}</h2>
                    {!outcome?.correct && <p className="mcl-given-answer">내가 쓴 답: {outcome?.given}</p>}
                    <RectangleProof fact={currentCard} />
                    <p>세로 {currentCard.table}칸, 가로 {currentCard.multiplier}칸인 직사각형에는 모두 {currentCard.answer}칸이 있어요.</p>
                    <InteractiveLearningRewardNotice state={rewardState} />
                    <div className="mcl-confidence-prompt">
                      <strong>이 카드는 어땠나요?</strong>
                      <small>{outcome?.correct ? '느낌을 골라 주면 다음 연습을 더 똑똑하게 준비해요.' : '틀린 카드는 어느 버튼을 눌러도 반드시 다시 나와요.'}</small>
                    </div>
                    <div className="mcl-confidence-actions">
                      <button type="button" className="is-easy" onClick={() => showNextCard('easy')}>
                        <Check size={20} /> 아주 쉬워요
                      </button>
                      <button type="button" className="is-hard" onClick={() => showNextCard('hard')}>
                        <RotateCcw size={19} /> 조금 어려워요
                      </button>
                    </div>
                  </article>
                </div>
              </div>

              <DeckPile kind="retry" count={retryIds.size} label="다시 볼 카드" note="맞힐 때까지 다시" />
            </div>
          </section>
        )}

        {screen === 'complete' && (
          <section className="mcl-complete">
            <div className="mcl-trophy"><Trophy size={54} /></div>
            <small>오늘의 구구단 항해 완료</small>
            <h1>다시 볼 카드가 0장이에요!</h1>
            <p>{selectionLabel}의 모든 문제를 끝까지 밝혔어요. 어려웠던 카드는 ‘한 번 더!’에 모아서 또 연습할 수 있어요.</p>
            <div className="mcl-complete-stats">
              <span><strong>{plan?.allFacts.length || 0}</strong>전체 카드</span>
              <span><strong>{masteredIds.size}</strong>마지막에 맞힌 카드</span>
              <span><strong>{sessionErrors}</strong>다시 생각한 횟수</span>
            </div>
            <InteractiveLearningRewardNotice state={rewardState} />
            <div className="mcl-complete-actions">
              <button type="button" onClick={startStudy}>한 번 더 섞기</button>
              <button type="button" onClick={resetToSetup}>다른 단 고르기</button>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default MultiplicationCardLab
