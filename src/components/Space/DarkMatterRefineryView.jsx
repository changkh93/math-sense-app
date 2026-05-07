import { useMemo, useState } from 'react'
import { motion as Motion } from 'framer-motion'
import { parseInlineFormatting } from '../../utils/formatUtils'
import { getRefineryVariantSet, isRefinerySupportedQuestion } from '../../utils/refineryVariantCatalog'
import soundManager from '../../utils/SoundManager'

const CAUSE_CHOICES = [
  { id: 'concept_gap', label: '개념 이해가 부족했어요', shortLabel: '개념 이해 부족' },
  { id: 'equation_setup', label: '문제를 식으로 바꾸기 어려웠어요', shortLabel: '식 세우기 어려움' },
  { id: 'missed_condition', label: '조건을 놓쳤어요', shortLabel: '조건 놓침' },
  { id: 'calculation_error', label: '계산 실수를 했어요', shortLabel: '계산 실수' },
  { id: 'no_checking', label: '검산하지 못했어요', shortLabel: '검산 부족' }
]

const CAUSE_GUIDES = {
  concept_gap: '개념 이해 부족으로 골랐으니, 바로 계산하지 말고 아래 규칙을 먼저 현재 문제에 대입하세요.',
  equation_setup: '식 세우기 어려움으로 골랐으니, 문제에서 묻는 값과 주어진 값을 식의 왼쪽과 오른쪽으로 나누어 보세요.',
  missed_condition: '조건 놓침으로 골랐으니, 문제에서 묻는 값과 주어진 값을 먼저 나누어 표시하세요.',
  calculation_error: '계산 실수로 골랐으니, 식을 한 줄씩 쓰고 마지막에 단위와 약분을 확인하세요.',
  no_checking: '검산 부족으로 골랐으니, 답을 고르기 전에 대입하거나 반대로 계산해서 한 번 확인하세요.',
  calculation: '계산 실수로 골랐으니, 식을 한 줄씩 쓰고 마지막에 단위와 약분을 확인하세요.',
  condition: '조건 놓침으로 골랐으니, 문제에서 묻는 값과 주어진 값을 먼저 나누어 표시하세요.',
  concept: '개념 이해 부족으로 골랐으니, 바로 계산하지 말고 아래 규칙을 먼저 현재 문제에 대입하세요.',
  guess: '식 세우기 어려움으로 골랐으니, 보기를 보기 전에 먼저 예상 답의 범위나 개수를 정하세요.'
}

const normalizeCauseId = (causeId) => ({
  concept: 'concept_gap',
  condition: 'missed_condition',
  calculation: 'calculation_error',
  guess: 'equation_setup'
}[causeId] || causeId)

const getTimestampMs = (value) => {
  if (!value) return 0
  if (value?.toMillis) return value.toMillis()
  if (value instanceof Date) return value.getTime()
  if (typeof value === 'number') return value
  return 0
}

const getPriorityScore = (question, nowMs) => {
  const failCount = question.failCount || 0
  const reviewBonus = question._reviewMark ? 2 : 0
  const sourceBonus = question._source === 'incorrect' ? 3 : 0
  const recheckBonus = question._reviewStatus === 'recheck_pending' ? 6 : 0
  const recentMs = getTimestampMs(question._activeAt)
  const recentWrongBonus = recentMs > 0 ? Math.max(0, 5 - Math.floor((nowMs - recentMs) / (1000 * 60 * 60 * 24))) : 0
  return failCount * 3 + recentWrongBonus + reviewBonus + sourceBonus + recheckBonus
}

const shuffleOptions = (options = []) => {
  const arr = [...options]
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

const formatText = (text) => parseInlineFormatting(text || '', { keyPrefix: 'refinery' })

function CauseStatsPanel({ causeStats }) {
  const distribution = causeStats?.distribution || {}
  const total = causeStats?.total || 0

  return (
    <div className="glass-card" style={{ padding: '1.3rem', marginBottom: '1.5rem', border: '1px solid rgba(125, 211, 252, 0.22)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '0.9rem', flexWrap: 'wrap' }}>
        <div>
          <div style={{ color: '#7dd3fc', fontWeight: 900, marginBottom: '0.25rem' }}>나의 흔들림 원인</div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            정제소에서 고른 원인을 누적해, 다음 학습 처방에 활용합니다.
          </div>
        </div>
        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>기록 {total}건</div>
      </div>
      {total === 0 ? (
        <div style={{ color: 'var(--text-muted)', padding: '0.9rem', borderRadius: 12, background: 'rgba(0,0,0,0.16)' }}>
          아직 원인 기록이 없습니다. 정제소 문항을 풀면 이곳에 원인 비율이 표시됩니다.
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '0.75rem' }}>
          {CAUSE_CHOICES.map(choice => {
            const value = distribution[choice.id] || 0
            return (
              <div key={choice.id}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginBottom: '0.25rem', color: 'var(--text-bright)', fontWeight: 800, fontSize: '0.88rem' }}>
                  <span>{choice.shortLabel}</span>
                  <span>{value}%</span>
                </div>
                <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                  <div style={{ width: `${value}%`, height: '100%', background: 'linear-gradient(90deg, #38bdf8, #c084fc)' }} />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const makeFallbackSet = (question) => {
  const imageUrl = question.refineryImageUrl || question.variantImageUrl || question.imageUrl || ''
  const originalQuestion = question.question || ''
  const imageNotice = imageUrl
    ? '아래 이미지는 참고용입니다. 이미지 안의 숫자나 표시와 다를 수 있으니, 반드시 문제 글에 제시된 조건과 숫자를 기준으로 풀어주세요.\n'
    : ''

  return {
    conceptId: question.conceptId || 'refinery_general',
    conceptName: question.unitTitle || '수학 탐사',
    bridge: {
      question: `[징검다리]\n${question.refineryPrompt || question.variantPrompt || originalQuestion}`,
      options: question.options || [],
      imageUrl
    },
    variant: {
      question: `[정화 변형]\n${question.refineryPrompt || question.variantPrompt || originalQuestion}`,
      options: question.options || [],
      imageUrl
    },
    hints: {
      target: '문제에서 최종적으로 묻는 값을 먼저 말로 정리하세요.',
      rule: '그림이 있더라도 계산 기준은 문제 글의 조건입니다.',
      check: '보기를 고르기 전에 구한 값의 단위와 조건을 다시 대조하세요.'
    }
  }
}

export function buildRefineryQuestion(question) {
  const set = getRefineryVariantSet(question) || makeFallbackSet(question)
  return {
    ...question,
    sourceQuestionId: question.id,
    refineryMode: true,
    conceptId: question.conceptId || set.conceptId,
    conceptName: set.conceptName,
    hint: '',
    explanation: ''
  }
}

function OptionGrid({ options, disabled, selectedText, onSelect }) {
  const [shuffled] = useState(() => shuffleOptions(options))

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.75rem', marginTop: '1.2rem' }}>
      {shuffled.map((option, idx) => {
        const isSelected = selectedText === option.text
        return (
          <button
            key={`${option.text}-${idx}`}
            disabled={disabled}
            onClick={() => onSelect(option)}
            style={{
              padding: '0.95rem',
              minHeight: '58px',
              background: isSelected ? 'rgba(251, 191, 36, 0.22)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${isSelected ? 'rgba(251, 191, 36, 0.8)' : 'rgba(255,255,255,0.14)'}`,
              borderRadius: '12px',
              color: 'white',
              fontWeight: 800,
              cursor: disabled ? 'default' : 'pointer'
            }}
          >
            {formatText(option.text)}
          </button>
        )
      })}
    </div>
  )
}

function StepHintPanel({ hints, causeId }) {
  const [hintLevel, setHintLevel] = useState(0)
  const hintItems = [
    { title: '1. 구해야 할 것', text: hints?.target || hints?.concept },
    { title: '2. 바로 쓰는 규칙', text: hints?.rule || hints?.direction },
    { title: '3. 실수 체크', text: hints?.check || hints?.example }
  ].filter(item => item.text)

  return (
    <div style={{ marginTop: '1rem' }}>
      {CAUSE_GUIDES[causeId] && (
        <div style={{
          marginBottom: '0.8rem',
          padding: '0.75rem 0.9rem',
          borderRadius: '12px',
          background: 'rgba(251,191,36,0.1)',
          border: '1px solid rgba(251,191,36,0.24)',
          color: '#fde68a',
          lineHeight: 1.5,
          fontWeight: 800
        }}>
          {CAUSE_GUIDES[causeId]}
        </div>
      )}
      <button
        onClick={() => setHintLevel(prev => Math.min(hintItems.length, prev + 1))}
        disabled={hintLevel >= hintItems.length}
        style={{
          padding: '0.65rem 0.9rem',
          background: 'rgba(56, 189, 248, 0.1)',
          border: '1px solid rgba(56, 189, 248, 0.35)',
          color: '#7dd3fc',
          borderRadius: '10px',
          cursor: hintLevel >= hintItems.length ? 'default' : 'pointer',
          fontWeight: 800
        }}
      >
        풀이 발판 열기 ({hintLevel}/{hintItems.length})
      </button>
      {hintLevel > 0 && (
        <div style={{ marginTop: '0.85rem', display: 'grid', gap: '0.6rem' }}>
          {hintItems.slice(0, hintLevel).map(item => (
            <div key={item.title} style={{ padding: '0.8rem', borderRadius: '12px', background: 'rgba(0,0,0,0.18)', border: '1px solid rgba(56, 189, 248, 0.18)' }}>
              <div style={{ color: '#7dd3fc', fontWeight: 900, marginBottom: '0.3rem' }}>{item.title}</div>
              <div style={{ color: 'var(--text-muted)', lineHeight: 1.55 }}>{formatText(item.text)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function SourceQuestionPreview({ source }) {
  const imageUrl = source?.imageUrl || source?.refineryImageUrl || source?.variantImageUrl || ''
  const options = source?.options || []

  if (!source) return null

  return (
    <div style={{
      margin: '0 0 1.25rem',
      padding: '1rem',
      borderRadius: '14px',
      background: 'rgba(0,0,0,0.18)',
      border: '1px solid rgba(255,255,255,0.12)'
    }}>
      <div style={{ color: '#7dd3fc', fontWeight: 900, marginBottom: '0.5rem' }}>당시 문항 확인</div>
      <div style={{ color: 'white', lineHeight: 1.55, fontSize: '1.05rem', fontWeight: 800 }}>
        {formatText(source.question || source.refineryPrompt || source.variantPrompt || '문항 내용을 불러오지 못했습니다.')}
      </div>
      {imageUrl && (
        <>
          <div style={{ color: '#fbbf24', marginTop: '0.75rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
            아래 이미지는 참고용입니다. 이미지 안의 숫자나 표시와 다를 수 있으니, 반드시 문제 글에 제시된 조건과 숫자를 기준으로 판단하세요.
          </div>
          <img
            src={imageUrl}
            alt="당시 문항 참고 이미지"
            style={{ maxWidth: '100%', maxHeight: 260, objectFit: 'contain', borderRadius: 12, marginTop: '0.75rem' }}
          />
        </>
      )}
      {options.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.55rem', marginTop: '0.9rem' }}>
          {options.map((option, optionIdx) => (
            <div
              key={`${option.text}-${optionIdx}`}
              style={{
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.65rem',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.84)',
                fontWeight: 800
              }}
            >
              {formatText(option.text)}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function DarkMatterRefineryMission({ items, missionType = 'daily', onExit, onComplete }) {
  const [idx, setIdx] = useState(0)
  const [stage, setStage] = useState('cause')
  const [causes, setCauses] = useState({})
  const [results, setResults] = useState([])
  const [feedback, setFeedback] = useState(null)
  const [selectedText, setSelectedText] = useState(null)

  const source = items[idx]
  const set = useMemo(() => {
    const rawSet = getRefineryVariantSet(source) || makeFallbackSet(source)
    const imageUrl = source?.refineryImageUrl || source?.variantImageUrl || source?.imageUrl || ''
    
    // Ensure both bridge and variant have images if available
    if (rawSet.bridge && !rawSet.bridge.imageUrl && imageUrl) rawSet.bridge.imageUrl = imageUrl
    if (rawSet.variant && !rawSet.variant.imageUrl && imageUrl) rawSet.variant.imageUrl = imageUrl

    // Clean up notice from text if it accidentally leaked (from existing catalog data)
    const noticePattern = /아래 이미지는 참고용입니다\..*?풀어주세요\.\s*/g
    if (rawSet.bridge?.question) rawSet.bridge.question = rawSet.bridge.question.replace(noticePattern, '')
    if (rawSet.variant?.question) rawSet.variant.question = rawSet.variant.question.replace(noticePattern, '')

    return rawSet
  }, [source])

  const isRecheck = source?._reviewStatus === 'recheck_pending'
  const currentProblem = stage === 'bridge' ? set.bridge : set.variant
  const progress = items.length > 0 ? Math.round(((idx + 1) / items.length) * 100) : 100

  const moveNext = (nextResult) => {
    setResults(prev => [...prev, nextResult])
    setFeedback(null)
    setSelectedText(null)
    if (idx >= items.length - 1) {
      setStage('summary')
    } else {
      setIdx(prev => prev + 1)
      setStage(items[idx + 1]?._reviewStatus === 'recheck_pending' ? 'variant' : 'cause')
    }
  }

  const handleCause = (causeId) => {
    soundManager.playClick()
    setCauses(prev => ({ ...prev, [source.id]: normalizeCauseId(causeId) }))
    setStage(isRecheck ? 'variant' : 'bridge')
  }

  const handleAnswer = (option) => {
    if (feedback) return
    setSelectedText(option.text)
    const correct = !!option.isCorrect
    setFeedback(correct ? 'correct' : 'wrong')

    if (correct) {
      soundManager.playCorrect()
    } else {
      soundManager.playWrong()
    }

    setTimeout(() => {
      if (stage === 'bridge') {
        if (correct) {
          setFeedback(null)
          setSelectedText(null)
          setStage('variant')
        } else {
          moveNext({ source, status: 'failed_bridge', cause: causes[source.id], selected: option.text })
        }
        return
      }

      moveNext({
        source,
        status: correct ? (isRecheck ? 'mastered' : 'pending_recheck') : 'failed_variant',
        cause: causes[source.id],
        selected: option.text,
        recheck: isRecheck
      })
    }, 650)
  }

  const finish = async () => {
    const correctResults = results.filter(r => r.status === 'pending_recheck' || r.status === 'mastered')
    const wrongResults = results.filter(r => r.status === 'failed_bridge' || r.status === 'failed_variant')
    const correctQuestions = correctResults.map(r => ({
      id: r.source.id,
      unitId: r.source.unitId,
      unitTitle: r.source.unitTitle,
      conceptId: r.source.conceptId || getRefineryVariantSet(r.source)?.conceptId || '',
      refineryCause: r.cause || '',
      refineryStatus: r.status,
      refineryRecheckPassed: r.status === 'mastered'
    }))
    const wrongQuestions = wrongResults.map(r => ({
      id: r.source.id,
      unitId: r.source.unitId,
      unitTitle: r.source.unitTitle,
      conceptId: r.source.conceptId || getRefineryVariantSet(r.source)?.conceptId || '',
      refineryCause: r.cause || '',
      refineryStatus: r.status
    }))

    await onComplete?.({
      refineryMode: true,
      unitId: 'dark_matter_refinery',
      type: 'refinery',
      score: items.length > 0 ? Math.round((correctResults.length / items.length) * 100) : 0,
      totalCount: items.length,
      correctCount: correctResults.length,
      crystalsEarned: Math.min(3, correctResults.length),
      starCoresEarned: correctResults.length,
      isPerfect: correctResults.length === items.length,
      initialRawScore: items.length > 0 ? Math.round((correctResults.length / items.length) * 100) : 0,
      attemptCount: 1,
      questions: items,
      correctQuestions,
      wrongQuestions,
      reviewMarkedQuestions: []
    })
  }

  if (stage === 'summary') {
    const pending = results.filter(r => r.status === 'pending_recheck').length
    const mastered = results.filter(r => r.status === 'mastered').length
    const failed = results.length - pending - mastered

    return (
      <div className="space-bg" style={{ minHeight: '100vh', padding: '3rem 1rem' }}>
        <div className="glass-card" style={{ maxWidth: 720, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
          <h2 style={{ color: '#fbbf24', marginTop: 0 }}>정화 작전 결과</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', margin: '1.5rem 0' }}>
            <div><strong style={{ color: '#50C878', fontSize: '1.6rem' }}>{pending + mastered}</strong><br/><span style={{ color: 'var(--text-muted)' }}>회복 성공</span></div>
            <div><strong style={{ color: '#fbbf24', fontSize: '1.6rem' }}>{pending}</strong><br/><span style={{ color: 'var(--text-muted)' }}>재확인 대기</span></div>
            <div><strong style={{ color: '#fb7185', fontSize: '1.6rem' }}>{failed}</strong><br/><span style={{ color: 'var(--text-muted)' }}>재도전 필요</span></div>
          </div>
          <p style={{ color: 'var(--text-muted)', lineHeight: 1.65 }}>
            맞힌 문항은 바로 완전 정화가 아니라 다음날 재확인 대기로 이동합니다. 틀린 문항만 정제소에 남아 다시 복구합니다.
          </p>
          <button
            onClick={() => { soundManager.playClick(); finish(); }}
            style={{
              marginTop: '1rem',
              padding: '1rem 1.5rem',
              background: 'linear-gradient(135deg, #b45309, #f59e0b)',
              border: '1px solid rgba(251,191,36,0.55)',
              borderRadius: '14px',
              color: 'white',
              fontWeight: 900,
              cursor: 'pointer'
            }}
          >
            결과 저장하고 정제소로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-bg" style={{ minHeight: '100vh', padding: '2rem 1rem' }}>
      <div className="glass-card" style={{ maxWidth: 900, margin: '0 auto', padding: '1.6rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div>
            <div style={{ color: '#fbbf24', fontWeight: 900 }}>{missionType === 'recheck' ? '완전 정화 재확인' : '다크매터 정제소'}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{idx + 1} / {items.length} · {source?.unitTitle || '4월 평가'}</div>
          </div>
          <button onClick={() => { soundManager.playClick(); onExit(); }} style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 10, color: 'var(--text-muted)', padding: '0.55rem 0.85rem', cursor: 'pointer' }}>나가기</button>
        </div>

        <div style={{ height: 8, borderRadius: 999, background: 'rgba(255,255,255,0.1)', overflow: 'hidden', marginBottom: '1.4rem' }}>
          <div style={{ height: '100%', width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #50C878)' }} />
        </div>

        {stage === 'cause' && !isRecheck ? (
          <>
            <div style={{ color: '#fbbf24', fontWeight: 900, marginBottom: '0.6rem' }}>1단계 · 원인 선택</div>
            <SourceQuestionPreview source={source} />
            <h2 style={{ color: 'white', lineHeight: 1.45, marginTop: 0 }}>이 문항이 흔들린 가장 가까운 이유를 고르세요.</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.8rem', marginTop: '1.2rem' }}>
              {CAUSE_CHOICES.map(choice => (
                <button
                  key={choice.id}
                  onClick={() => handleCause(choice.id)}
                  style={{
                    padding: '1rem',
                    borderRadius: '14px',
                    border: '1px solid rgba(251,191,36,0.3)',
                    background: 'rgba(251,191,36,0.1)',
                    color: 'white',
                    fontWeight: 900,
                    lineHeight: 1.35,
                    cursor: 'pointer'
                  }}
                >
                  {choice.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          <>
            <div style={{ color: stage === 'bridge' ? '#7dd3fc' : '#fbbf24', fontWeight: 900, marginBottom: '0.6rem' }}>
              {isRecheck ? '완전 정화 재확인' : stage === 'bridge' ? '2단계 · 징검다리 문제' : '3단계 · 변형문항'}
            </div>
            <h2 style={{ color: 'white', lineHeight: 1.5, marginTop: 0 }}>{formatText(currentProblem?.question)}</h2>
            {currentProblem?.imageUrl && (
              <>
                <div style={{ color: '#fbbf24', marginTop: '0.75rem', fontSize: '0.9rem', lineHeight: 1.5 }}>
                  아래 이미지는 참고용입니다. 이미지 안의 숫자나 표시와 다를 수 있으니, 반드시 문제 글에 제시된 조건과 숫자를 기준으로 풀어주세요.
                </div>
                <img src={currentProblem.imageUrl} alt="정제소 참고 이미지" style={{ maxWidth: '100%', maxHeight: 280, objectFit: 'contain', borderRadius: 12, marginTop: '0.8rem' }} />
              </>
            )}
            <StepHintPanel hints={set.hints} causeId={causes[source.id]} />
            <OptionGrid key={`${source?.id}-${stage}`} options={currentProblem?.options || []} disabled={!!feedback} selectedText={selectedText} onSelect={handleAnswer} />
            {feedback && (
              <div style={{ marginTop: '1rem', color: feedback === 'correct' ? '#50C878' : '#fb7185', fontWeight: 900 }}>
                {feedback === 'correct' ? '좋습니다. 다음 단계로 이동합니다.' : '아직 정화되지 않았습니다. 이 문항만 정제소에 남습니다.'}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export default function DarkMatterRefineryView({
  questions = [],
  totalHistoryCount = 0,
  stats: externalStats,
  onComplete,
  onExit,
  onOpenLearningDarkMatter
}) {
  const [rankedAtMs] = useState(() => Date.now())
  const [missionSession, setMissionSession] = useState(null)
  const sortedQuestions = useMemo(() => {
    return [...questions].sort((a, b) => getPriorityScore(b, rankedAtMs) - getPriorityScore(a, rankedAtMs))
  }, [questions, rankedAtMs])

  const refineryReadyQuestions = useMemo(() => sortedQuestions.filter(isRefinerySupportedQuestion), [sortedQuestions])
  const recheckMission = useMemo(() => refineryReadyQuestions.filter(q => q._reviewStatus === 'recheck_pending'), [refineryReadyQuestions])
  const dailyCandidates = useMemo(() => refineryReadyQuestions.filter(q => q._reviewStatus !== 'recheck_pending'), [refineryReadyQuestions])
  const todayMission = useMemo(() => dailyCandidates.slice(0, 8), [dailyCandidates])

  const stats = useMemo(() => {
    const repeated = externalStats?.repeatedCount ?? questions.filter(q => (q.failCount || 0) >= 2).length
    const maxFail = externalStats?.maxFail ?? questions.reduce((max, q) => Math.max(max, q.failCount || 0), 0)
    const activeCount = externalStats?.activeCount ?? questions.length
    const masteredCount = externalStats?.masteredCount ?? Math.max(0, totalHistoryCount - questions.length)
    const totalTrackedCount = activeCount + masteredCount
    const purificationRate = totalTrackedCount > 0
      ? Math.min(100, Math.round((masteredCount / totalTrackedCount) * 100))
      : 100

    return {
      repeated,
      maxFail,
      purificationRate,
      activeCount,
      pendingCount: externalStats?.pendingCount || 0,
      causeStats: externalStats?.causeStats || { total: 0, distribution: {} }
    }
  }, [questions, totalHistoryCount, externalStats])

  const startMission = (items, missionType = 'daily') => {
    soundManager.playClick()
    setMissionSession({
      missionType,
      items: items.map(buildRefineryQuestion)
    })
  }

  if (missionSession) {
    return (
      <DarkMatterRefineryMission
        items={missionSession.items}
        missionType={missionSession.missionType}
        onExit={() => setMissionSession(null)}
        onComplete={async (result) => {
          await onComplete?.(result)
          setMissionSession(null)
        }}
      />
    )
  }

  return (
    <div className="space-bg" style={{ minHeight: '100vh' }}>
      <div style={{ maxWidth: '980px', margin: '0 auto', padding: '2rem 1rem 5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', marginBottom: '2rem' }}>
          <div>
            <Motion.h1 initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} style={{ fontSize: '2.1rem', color: '#fbbf24', margin: '0 0 0.5rem' }}>
              ⚗️ 다크매터 정제소
            </Motion.h1>
            <p style={{ color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
              기존 다크매터에서 풀이를 익힌 뒤, 변형 조건으로 이해를 증명하는 별도 회복 미션입니다.
            </p>
          </div>
          <button onClick={onExit} style={{ background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.12)', color: 'var(--text-muted)', padding: '0.6rem 1rem', borderRadius: '10px', cursor: 'pointer' }}>
            ✕ 나가기
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          <div className="glass-card" style={{ padding: '1.2rem', border: '1px solid rgba(251, 191, 36, 0.35)' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>정화율</div>
            <div style={{ color: '#fbbf24', fontSize: '1.7rem', fontWeight: 900 }}>{stats.purificationRate}%</div>
          </div>
          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>오염 문항</div>
            <div style={{ color: '#c084fc', fontSize: '1.7rem', fontWeight: 900 }}>{stats.activeCount}개</div>
          </div>
          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>재확인 대기</div>
            <div style={{ color: '#fbbf24', fontSize: '1.7rem', fontWeight: 900 }}>{stats.pendingCount}개</div>
          </div>
          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>반복 오류</div>
            <div style={{ color: '#fb7185', fontSize: '1.7rem', fontWeight: 900 }}>{stats.repeated}개</div>
          </div>
          <div className="glass-card" style={{ padding: '1.2rem' }}>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.35rem' }}>최대 실패</div>
            <div style={{ color: '#38bdf8', fontSize: '1.7rem', fontWeight: 900 }}>{stats.maxFail}회</div>
          </div>
        </div>

        <div className="glass-card" style={{ padding: '1.3rem', marginBottom: '1.5rem', border: '1px solid rgba(251, 191, 36, 0.22)' }}>
          <div style={{ color: '#fbbf24', fontWeight: 900, marginBottom: '0.8rem' }}>정화 규칙</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.9rem', color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.6 }}>
            <div>1. 오늘 작전은 배정된 8문항을 모두 시도하면 완료됩니다.</div>
            <div>2. 맞힌 문항은 바로 완전 정화가 아니라 다음날 재확인 대기로 이동합니다.</div>
            <div>3. 다음날 재확인을 맞히면 완전 정화되고, 틀린 문항은 다시 오염 문항으로 남습니다.</div>
          </div>
        </div>

        <CauseStatsPanel causeStats={stats.causeStats} />

        {questions.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', border: '1px solid rgba(80, 200, 120, 0.3)' }}>
            <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🌟</div>
            <h3 style={{ color: '#50C878', marginBottom: '0.5rem' }}>정화할 다크매터가 없습니다.</h3>
            <p style={{ color: 'var(--text-muted)' }}>현재 우주는 안정 상태입니다.</p>
          </div>
        ) : (
          <>
            <div className="glass-card" style={{ padding: '1.3rem', marginBottom: '1.5rem', border: '1px solid rgba(80, 200, 120, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ color: '#50C878', fontSize: '1.05rem', margin: '0 0 0.35rem' }}>완전 정화 재확인</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    어제 정화 성공한 문항은 오늘 작전 8문항과 별도로 확인합니다. 여기서 맞히면 완전 정화됩니다.
                  </div>
                </div>
                <Motion.button
                  whileHover={{ scale: recheckMission.length ? 1.02 : 1 }}
                  whileTap={{ scale: recheckMission.length ? 0.98 : 1 }}
                  disabled={recheckMission.length === 0}
                  onClick={() => startMission(recheckMission, 'recheck')}
                  style={{
                    padding: '0.95rem 1.4rem',
                    background: recheckMission.length === 0 ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #15803d, #50C878)',
                    border: '1px solid rgba(80, 200, 120, 0.55)',
                    borderRadius: '14px',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 900,
                    cursor: recheckMission.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  재확인 시작 ({recheckMission.length}문항)
                </Motion.button>
              </div>
              {recheckMission.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.16)' }}>
                  오늘 완전 정화 재확인이 열린 문항은 없습니다.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.7rem' }}>
                  {recheckMission.map((q, index) => {
                    const set = getRefineryVariantSet(q)
                    return (
                      <div key={q.id} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(80, 200, 120, 0.2)', background: 'rgba(0,0,0,0.16)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: '#50C878', fontWeight: 900 }}>재확인 #{index + 1}</span>
                          <span style={{ color: 'var(--text-bright)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {set?.conceptName || q.unitTitle || '수학 탐사'}
                          </span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>맞히면 완전 정화</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="glass-card" style={{ padding: '1.3rem', marginBottom: '1.5rem', border: '1px solid rgba(251, 191, 36, 0.28)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <h3 style={{ color: 'var(--text-bright)', fontSize: '1.05rem', margin: '0 0 0.35rem' }}>오늘의 정화 작전</h3>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', lineHeight: 1.5 }}>
                    오늘 새로 복구할 8문항입니다. 어제 성공한 재확인 문항은 여기에 포함되지 않습니다.
                  </div>
                </div>
                <Motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={todayMission.length === 0}
                  onClick={() => startMission(todayMission, 'daily')}
                  style={{
                    padding: '0.95rem 1.4rem',
                    background: todayMission.length === 0 ? 'rgba(255,255,255,0.12)' : 'linear-gradient(135deg, #b45309, #f59e0b)',
                    border: '1px solid rgba(251, 191, 36, 0.55)',
                    borderRadius: '14px',
                    color: 'white',
                    fontSize: '1rem',
                    fontWeight: 900,
                    cursor: todayMission.length === 0 ? 'not-allowed' : 'pointer'
                  }}
                >
                  시작 ({todayMission.length}문항)
                </Motion.button>
              </div>

              {todayMission.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', padding: '1rem', borderRadius: 12, background: 'rgba(0,0,0,0.16)' }}>
                  현재 대상 단위에 해당하는 오늘 작전 문항이 없습니다. 재확인 대기 문항은 위의 완전 정화 재확인에서 별도로 진행합니다.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '0.7rem' }}>
                  {todayMission.map((q, index) => {
                    const set = getRefineryVariantSet(q)
                    return (
                      <div key={q.id} style={{ padding: '0.85rem', borderRadius: '12px', border: '1px solid rgba(251, 191, 36, 0.18)', background: 'rgba(0,0,0,0.16)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
                          <span style={{ color: '#fbbf24', fontWeight: 900 }}>#{index + 1}</span>
                          <span style={{ color: 'var(--text-bright)', fontWeight: 800, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {set?.conceptName || q.unitTitle || '수학 탐사'}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                          <span>실패 {q.failCount || 1}회</span>
                          {q._reviewMark && <span style={{ color: '#c084fc' }}>재검토</span>}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={onOpenLearningDarkMatter} style={{ padding: '1rem 1.2rem', background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.35)', borderRadius: '14px', color: '#d8b4fe', fontWeight: 800, cursor: 'pointer' }}>
                풀이 학습장으로 이동
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
