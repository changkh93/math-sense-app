import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft, Check, ChevronRight, Delete, RotateCcw, Sparkles, Trophy, Volume2 } from 'lucide-react'
import soundManager from '../../utils/SoundManager'
import { playMultiplicationChantAudio, primeMultiplicationChantAudio } from './multiplicationChantAudio'
import { buildMultiplicationStatement } from './multiplicationCardLabModel'
import {
  DIVISION_TABLES,
  buildDivisionGroups,
  buildDivisionRetryQueue,
  buildDivisionStudyPlan,
  getKoreanDateKey,
  selectPracticeDivisionFacts,
  selectWeakDivisionFacts,
  updateConfidenceStats,
  updateFactStats,
} from './divisionCardLabModel'
import './MultiplicationCardLab.css'
import './DivisionCardLab.css'

const DEFAULT_PROGRESS = { selectedTables: [2], practiceSelected: false, factStats: {} }

function loadProgress(storageKey) {
  try {
    const saved = JSON.parse(window.localStorage.getItem(storageKey))
    return {
      selectedTables: Array.isArray(saved?.selectedTables)
        ? saved.selectedTables.filter((table) => DIVISION_TABLES.includes(Number(table))).map(Number)
        : DEFAULT_PROGRESS.selectedTables,
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
      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((digit) => <button type="button" key={digit} onClick={() => onDigit(String(digit))}>{digit}</button>)}
      <button type="button" className="mcl-delete-key" onClick={onDelete} aria-label="한 글자 지우기"><Delete size={20} /></button>
    </div>
  )
}

function DeckPile({ kind, count, label, note }) {
  return (
    <div className={`mcl-deck-pile is-${kind}`}>
      <div className="mcl-stack" aria-hidden="true"><span /><span /><span className="mcl-stack-front">{count}</span></div>
      <strong>{label}</strong><small>{note}</small>
    </div>
  )
}

function TableSelector({ selectedTables, onToggle, practiceSelected, practiceCount, onPracticeToggle, disabled }) {
  return (
    <div className="mcl-table-picker" aria-label="나누는 수 선택">
      {DIVISION_TABLES.map((table) => (
        <button type="button" key={table} className={selectedTables.includes(table) ? 'is-selected' : ''} onClick={() => onToggle(table)} disabled={disabled} aria-pressed={selectedTables.includes(table)}>{table}단</button>
      ))}
      <button type="button" className={`mcl-practice-choice ${practiceSelected ? 'is-selected' : ''}`} onClick={onPracticeToggle} disabled={disabled} aria-pressed={practiceSelected}>
        <span>다시 만나기</span><small>{practiceCount}장</small>
      </button>
    </div>
  )
}

function DivisionGroups({ fact, spokenStep, revealAnswer = false }) {
  const groups = buildDivisionGroups(fact)
  const completedGroups = revealAnswer ? fact.quotient : Math.min(spokenStep, fact.quotient)
  const remainingWholeDots = (fact.quotient - completedGroups) * fact.divisor
  const visibleRemaining = remainingWholeDots + fact.remainder
  return (
    <div className="dcl-division-story" aria-label={`${fact.dividend}개를 ${fact.divisor}개씩 묶고 ${fact.divisor}명에게 똑같이 나누는 그림`}>
      <section className="dcl-whole-panel">
        <div className="dcl-story-heading">
          <span>전체</span>
          <strong>{fact.dividend}개에서 {fact.divisor}개씩 묶어요</strong>
          <small>{completedGroups === 0 ? '아직 묶지 않았어요' : `${completedGroups}묶음 완성 · ${visibleRemaining}개 남음`}</small>
        </div>
        <div className="dcl-object-pool" style={{ '--pool-columns': Math.min(fact.divisor, 12) }}>
          {groups.map(({ group, dots }) => (
            <div key={group} className={`dcl-pool-group ${group <= completedGroups ? 'is-grouped' : 'is-ungrouped'} ${group === completedGroups && !revealAnswer ? 'is-newest' : ''}`} aria-label={`${group <= completedGroups ? `${group}번째 묶음 완성` : '아직 묶이지 않은'} ${fact.divisor}개`}>
              <span>{group <= completedGroups ? `${group}묶음` : ''}</span>
              <div className="dcl-pool-dots" style={{ '--pool-columns': Math.min(fact.divisor, 12) }}>
                {dots.map((dot) => <i key={dot} />)}
              </div>
            </div>
          ))}
          {fact.remainder > 0 && (
            <div className={`dcl-remainder-pool ${completedGroups === fact.quotient ? 'is-revealed' : ''}`} aria-label={`묶음을 만들지 못하고 남은 ${fact.remainder}개`}>
              <span>묶음 밖에 남은 점</span>
              <div>{Array.from({ length: fact.remainder }, (_, index) => <i key={index} />)}</div>
              <strong>{completedGroups === fact.quotient ? `나머지 ${fact.remainder}` : '끝까지 묶어 보세요'}</strong>
            </div>
          )}
        </div>
      </section>

      <section className="dcl-sharing-panel">
        <div className="dcl-story-heading">
          <span>똑같이 나누기</span>
          <strong>{fact.divisor}명에게 하나씩 나누어 줘요</strong>
          <small>모두에게 하나씩 줄 때마다, 한 사람이 받은 수도 1씩 늘어요</small>
        </div>
        <div className="dcl-people" style={{ '--people-count': fact.divisor }}>
          {Array.from({ length: fact.divisor }, (_, personIndex) => (
            <div className="dcl-person" key={personIndex} aria-label={`${personIndex + 1}번째 사람, ${completedGroups}개 받음`}>
              <div className="dcl-person-icon" aria-hidden="true"><i /><b /></div>
              <div className="dcl-person-share">
                {Array.from({ length: fact.quotient }, (_, shareIndex) => <i key={shareIndex} className={shareIndex < completedGroups ? 'is-given' : ''} />)}
              </div>
              <strong>{completedGroups}</strong>
            </div>
          ))}
        </div>
        {fact.remainder > 0 && completedGroups === fact.quotient && (
          <div className="dcl-sharing-remainder"><span>{Array.from({ length: fact.remainder }, (_, index) => <i key={index} />)}</span><strong>아무에게도 하나씩 더 줄 수 없어서 {fact.remainder}개가 남아요.</strong></div>
        )}
      </section>

      <p className="dcl-story-result"><b>{fact.divisor}개씩</b> 만든 묶음 수 = 한 사람이 <b>받은 개수</b> = <em>{revealAnswer ? fact.quotient : '?'}</em>{revealAnswer && fact.remainder > 0 ? <span> · 나머지 {fact.remainder}</span> : null}</p>
    </div>
  )
}

export default function DivisionCardLab({ userId, onExit }) {
  const storageKey = `metasense_division_card_lab_v1:${userId || 'guest'}`
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
  const [remainderAnswer, setRemainderAnswer] = useState('')
  const [activeAnswer, setActiveAnswer] = useState('quotient')
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
  const currentCard = queue[cardIndex]
  const practiceFacts = useMemo(() => selectPracticeDivisionFacts(factStats), [factStats])
  const previewPlan = useMemo(() => buildDivisionStudyPlan(selectedTables, factStats, { today, random: () => 0.5, includePractice: practiceSelected }), [factStats, practiceSelected, selectedTables, today])
  const weakPreview = useMemo(() => selectWeakDivisionFacts(previewPlan.allFacts, factStats, today), [factStats, previewPlan.allFacts, today])

  useEffect(() => { window.localStorage.setItem(storageKey, JSON.stringify({ selectedTables, practiceSelected, factStats })) }, [factStats, practiceSelected, selectedTables, storageKey])
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
    const fallback = () => {
      if (speechRunRef.current !== runId) return
      const synth = window.speechSynthesis
      const Utterance = window.SpeechSynthesisUtterance
      if (!synth || !Utterance) { setSpokenStep(currentCard.quotient); setSpeechState('unavailable'); return }
      const voice = synth.getVoices().find((item) => item.lang?.toLowerCase().startsWith('ko'))
      Array.from({ length: currentCard.quotient }, (_, index) => buildMultiplicationStatement(currentCard.divisor, index + 1)).forEach((phrase, index, phrases) => {
        const utterance = new Utterance(phrase)
        utterance.lang = 'ko-KR'; utterance.rate = 1.45; utterance.pitch = 1.04
        if (voice) utterance.voice = voice
        utterance.onstart = () => speechRunRef.current === runId && setSpokenStep(index + 1)
        utterance.onend = () => speechRunRef.current === runId && index === phrases.length - 1 && setSpeechState('idle')
        synth.speak(utterance)
      })
    }
    audioStopRef.current = playMultiplicationChantAudio(currentCard, {
      onStep: (step) => speechRunRef.current === runId && setSpokenStep(step),
      onEnd: () => speechRunRef.current === runId && setSpeechState('idle'),
      onError: fallback,
      revealTarget: true,
    })
  }, [currentCard, face, stopChant])

  useEffect(() => {
    if (screen !== 'study' || face !== 'front' || !currentCard) { stopChant(); return undefined }
    const timer = window.setTimeout(playChant, 900)
    return () => { window.clearTimeout(timer); stopChant() }
  }, [currentCard, face, playChant, screen, stopChant])

  const toggleTable = (table) => {
    setSelectedTables((current) => current.includes(table) ? current.filter((value) => value !== table) : [...current, table].sort((a, b) => a - b))
    soundManager.playClick?.()
  }
  const startStudy = () => {
    const nextPlan = buildDivisionStudyPlan(selectedTables, factStats, { today, includePractice: practiceSelected })
    if (!nextPlan.queue.length) return
    primeMultiplicationChantAudio(nextPlan.queue.map((fact) => fact.divisor))
    setPlan(nextPlan); setQueue(nextPlan.queue); setCardIndex(0); setFace('front'); setAnswer(''); setRemainderAnswer(''); setActiveAnswer('quotient'); setOutcome(null)
    setMasteredIds(new Set()); setRetryIds(new Set()); setRound(1); setSessionErrors(0); setSpokenStep(0); setSpeechState('idle'); setScreen('study')
    soundManager.playWarp?.()
  }
  const submitAnswer = (event) => {
    event?.preventDefault()
    if (!currentCard || answer === '' || face !== 'front') return
    const givenRemainder = remainderAnswer === '' ? 0 : Number(remainderAnswer)
    const correct = Number(answer) === currentCard.quotient && givenRemainder === currentCard.remainder
    setFactStats((current) => updateFactStats(current, currentCard.id, correct, today))
    if (!correct) { setMasteredIds((current) => { const next = new Set(current); next.delete(currentCard.id); return next }); setRetryIds((current) => new Set(current).add(currentCard.id)); setSessionErrors((count) => count + 1) }
    setOutcome({ correct, given: Number(answer), givenRemainder }); setFace('back'); setSpeechState('idle')
    if (correct) soundManager.playCorrect?.(); else soundManager.playError?.()
  }
  const showNextCard = (confidence) => {
    const needsRetry = !outcome?.correct || confidence === 'hard'
    const nextRetryIds = new Set(retryIds)
    if (needsRetry) nextRetryIds.add(currentCard.id); else nextRetryIds.delete(currentCard.id)
    setFactStats((current) => updateConfidenceStats(current, currentCard.id, confidence, Boolean(outcome?.correct), today))
    setRetryIds(nextRetryIds)
    setMasteredIds((current) => { const next = new Set(current); if (outcome?.correct && confidence === 'easy') next.add(currentCard.id); else next.delete(currentCard.id); return next })
    if (cardIndex < queue.length - 1) setCardIndex((index) => index + 1)
    else {
      const retryQueue = buildDivisionRetryQueue(nextRetryIds, plan.allFacts)
      if (retryQueue.length) { setQueue(retryQueue); setCardIndex(0); setRound((value) => value + 1) }
      else { setScreen('complete'); soundManager.playComplete?.(); return }
    }
    setAnswer(''); setRemainderAnswer(''); setActiveAnswer('quotient'); setOutcome(null); setFace('front'); setSpokenStep(0); setSpeechState('idle'); soundManager.playClick?.()
  }
  const resetToSetup = () => { setScreen('setup'); setPlan(null); setQueue([]); setAnswer(''); setRemainderAnswer(''); setActiveAnswer('quotient'); setOutcome(null); setSpokenStep(0); setSpeechState('idle'); soundManager.playClick?.() }
  const phaseLabel = currentCard?.phase === 'focus' ? '오늘의 집중 카드' : currentCard?.phase === 'practice' ? '다시 만나기 카드' : currentCard?.phase === 'retry' ? `다시 도전 ${round - 1}회` : '오늘의 전체 카드'
  const canStart = previewPlan.queue.length > 0
  const selectionLabel = [...selectedTables.map((table) => `${table}단`), ...(practiceSelected ? ['다시 만나기'] : [])].join(' · ')

  return (
    <div className="mcl-shell dcl-shell">
      <header className="mcl-header"><button type="button" className="mcl-back" onClick={onExit}><ArrowLeft size={18} /> 디비디아로</button><div className="mcl-brand"><small>체험 학습</small><strong>나눗셈 묶음 카드</strong></div>{screen !== 'setup' ? <button type="button" className="mcl-reset" onClick={resetToSetup}><RotateCcw size={16} /> 단 다시 고르기</button> : <span />}</header>
      <main className="mcl-main">
        <section className="mcl-selector-card"><div><small>어떤 수씩 묶을지 여러 단을 골라도 좋아요</small><h1>{screen === 'setup' ? '오늘은 몇 개씩 묶어 볼까요?' : selectionLabel}</h1></div><TableSelector selectedTables={selectedTables} onToggle={toggleTable} practiceSelected={practiceSelected} practiceCount={practiceFacts.length} onPracticeToggle={() => { setPracticeSelected((selected) => !selected); soundManager.playClick?.() }} disabled={screen !== 'setup'} />{screen === 'setup' && <div className="mcl-picker-actions"><button type="button" onClick={() => setSelectedTables(DIVISION_TABLES)}>모두 선택</button><button type="button" onClick={() => { setSelectedTables([]); setPracticeSelected(false) }}>선택 지우기</button></div>}</section>
        {screen === 'setup' && <section className="mcl-setup-grid"><div className="mcl-coach-panel"><div className="mcl-coach-avatar">왕새우<br />쌤</div><div><small><Sparkles size={15} /> 구구단 소리를 들으며 같은 수씩 묶어 봐요</small><h2>{canStart ? `${previewPlan.queue.length}장의 나눗셈 카드` : practiceSelected ? '아직 다시 만날 카드가 없어요' : '먼저 묶을 수를 골라요'}</h2><p>한 단마다 딱 나누어지는 카드 6장과 나머지가 생기는 카드 6장을 풀어요. 묶음을 만들고 남은 점까지 그림으로 확인할 수 있어요.</p>{weakPreview.length > 0 && <div className="mcl-focus-notice">오늘의 집중 카드 {weakPreview.length}장 · 자주 헷갈린 카드부터 시작해요.</div>}</div></div><button type="button" className="mcl-start" onClick={startStudy} disabled={!canStart}>카드 섞고 시작하기 <ChevronRight size={21} /></button></section>}
        {screen === 'study' && currentCard && (
          <section className="mcl-study-area">
            <div className="mcl-progress-row"><span>{phaseLabel}</span><div className="mcl-progress-track"><i style={{ width: `${((cardIndex + 1) / queue.length) * 100}%` }} /></div><strong>{cardIndex + 1}/{queue.length}</strong></div>
            <div className="mcl-study-grid">
              <DeckPile kind="mastered" count={masteredIds.size} label="맞힌 카드" note="내가 푼 카드" />
              <div className={`mcl-flip-stage ${face === 'back' ? 'is-flipped' : ''}`} style={{ '--mcl-card-height': `${Math.max(1060, 650 + (currentCard.quotient * 58) + (currentCard.remainder ? 90 : 0))}px` }}>
                <div className="mcl-flip-card">
                  <article className="mcl-card-face mcl-card-front" aria-hidden={face === 'back'}>
                    <div className="mcl-card-kicker"><span>{currentCard.divisor}개씩 묶기</span><small>{phaseLabel}</small></div>
                    <h2>{currentCard.dividend} ÷ {currentCard.divisor} = <em>?</em></h2>
                    <div className="mcl-sequence-guide"><div><p className="mcl-sequence-title">전체 {currentCard.dividend}개가 {currentCard.divisor}개씩 묶이고, 몇 개가 남는지 살펴봐요</p></div><button type="button" className={speechState === 'speaking' ? 'is-speaking' : ''} onClick={playChant} disabled={speechState === 'unavailable'} aria-label="묶기 다시 보기"><Volume2 size={16} /> {speechState === 'unavailable' ? '음성 미지원' : speechState === 'speaking' ? '묶는 중' : '다시 보기'}</button></div>
                    <DivisionGroups fact={currentCard} spokenStep={spokenStep} />
                    <form className="mcl-answer-form dcl-answer-form" onSubmit={submitAnswer}>
                      <label>{currentCard.divisor}개씩 몇 묶음이고, 몇 개가 남을까요?</label>
                      <div className="dcl-answer-fields">
                        <label className={activeAnswer === 'quotient' ? 'is-active' : ''}><span>몫</span><input ref={answerRef} id="dcl-answer" inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={answer} onFocus={() => setActiveAnswer('quotient')} onChange={(event) => setAnswer(event.target.value.replace(/\D/g, '').slice(0, 2))} aria-label="나눗셈 몫" /></label>
                        <label className={activeAnswer === 'remainder' ? 'is-active' : ''}><span>나머지</span><input inputMode="numeric" pattern="[0-9]*" autoComplete="off" value={remainderAnswer} placeholder="0" onFocus={() => setActiveAnswer('remainder')} onChange={(event) => setRemainderAnswer(event.target.value.replace(/\D/g, '').slice(0, 2))} aria-label="나눗셈 나머지" /></label>
                      </div>
                      <small className="dcl-answer-help">남는 것이 없으면 나머지는 0이에요.</small>
                      <NumberPad onDigit={(digit) => activeAnswer === 'quotient' ? setAnswer((current) => `${current}${digit}`.slice(0, 2)) : setRemainderAnswer((current) => `${current}${digit}`.slice(0, 2))} onDelete={() => activeAnswer === 'quotient' ? setAnswer((current) => current.slice(0, -1)) : setRemainderAnswer((current) => current.slice(0, -1))} />
                      <button type="submit" className="mcl-check" disabled={!answer}>카드 뒤집어 확인하기</button>
                    </form>
                  </article>
                  <article className={`mcl-card-face mcl-card-back ${outcome?.correct ? 'is-correct' : 'is-wrong'}`} aria-hidden={face === 'front'} aria-live="polite">
                    <div className="mcl-result-icon">{outcome?.correct ? <Check size={44} /> : '↻'}</div>
                    <small>{outcome?.correct ? '모든 묶음과 나머지를 찾았어요!' : '이 카드는 다시 만날 거예요!'}</small>
                    <h2>{currentCard.dividend} ÷ {currentCard.divisor} = {currentCard.quotient}{currentCard.remainder > 0 ? ` 나머지 ${currentCard.remainder}` : ''}</h2>
                    {!outcome?.correct && <p className="mcl-given-answer">내가 쓴 답: 몫 {outcome?.given}, 나머지 {outcome?.givenRemainder}</p>}
                    <DivisionGroups fact={currentCard} spokenStep={currentCard.quotient} revealAnswer />
                    <p className="dcl-family"><b>{currentCard.divisor} × {currentCard.quotient}{currentCard.remainder > 0 ? ` + ${currentCard.remainder}` : ''} = {currentCard.dividend}</b><span>그래서 {currentCard.dividend} ÷ {currentCard.divisor} = {currentCard.quotient}{currentCard.remainder > 0 ? `, 나머지 ${currentCard.remainder}` : ''}</span></p>
                    <div className="mcl-confidence-prompt"><strong>이 카드는 어땠나요?</strong><small>{outcome?.correct ? '느낌을 골라 주면 다음 연습을 더 똑똑하게 준비해요.' : '틀린 카드는 어느 버튼을 눌러도 다시 나와요.'}</small></div>
                    <div className="mcl-confidence-actions"><button type="button" className="is-easy" onClick={() => showNextCard('easy')}><Check size={20} /> 아주 쉬워요</button><button type="button" className="is-hard" onClick={() => showNextCard('hard')}><RotateCcw size={19} /> 조금 어려워요</button></div>
                  </article>
                </div>
              </div>
              <DeckPile kind="retry" count={retryIds.size} label="다시 만날 카드" note="알 때까지 다시" />
            </div>
          </section>
        )}
        {screen === 'complete' && <section className="mcl-complete"><div className="mcl-trophy"><Trophy size={54} /></div><small>오늘의 나눗셈 묶기 완료</small><h1>다시 만날 카드가 0장이에요!</h1><p>{selectionLabel}의 모든 수를 정확히 묶었어요. 어려웠던 카드는 ‘다시 만나기’에 모아 또 연습할 수 있어요.</p><div className="mcl-complete-stats"><span><strong>{plan?.allFacts.length || 0}</strong>전체 카드</span><span><strong>{masteredIds.size}</strong>마지막에 맞힌 카드</span><span><strong>{sessionErrors}</strong>다시 생각한 횟수</span></div><div className="mcl-complete-actions"><button type="button" onClick={startStudy}>한 번 더 섞기</button><button type="button" onClick={resetToSetup}>다른 단 고르기</button></div></section>}
      </main>
    </div>
  )
}
