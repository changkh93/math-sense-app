import { useCallback, useEffect, useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  Archive,
  Brain,
  CalendarClock,
  Check,
  ChevronRight,
  Clock,
  Flame,
  Gauge,
  ImagePlus,
  Layers,
  RotateCcw,
  Sparkles,
  Upload
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  useReviewMistakeCard,
  useStudentMistakeNotebook,
  useSubmitMistakeUpload
} from '../../hooks/useMistakeNotebook'
import StarField from './StarField'
import soundManager from '../../utils/SoundManager'
import '../../styles/space-theme.css'
import './MistakeNotebookPlanet.css'

const REVIEW_RATINGS = [
  {
    id: 'again',
    label: '다시',
    interval: '10분',
    tone: 'again',
    icon: RotateCcw
  },
  {
    id: 'hard',
    label: '어려움',
    interval: '1일',
    tone: 'hard',
    icon: Flame
  },
  {
    id: 'good',
    label: '좋음',
    interval: '간격 증가',
    tone: 'good',
    icon: Check
  },
  {
    id: 'easy',
    label: '쉬움',
    interval: '크게 증가',
    tone: 'easy',
    icon: Sparkles
  }
]

function formatDateTime(value) {
  const ms = value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : 0)
  if (!ms) return '곧 복습'
  return new Date(ms).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getTimestampMs(value) {
  if (!value) return 0
  if (typeof value.toMillis === 'function') return value.toMillis()
  if (value.seconds) return value.seconds * 1000
  if (value._seconds) return value._seconds * 1000
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : 0
}

function getDueState(card) {
  const dueMs = getTimestampMs(card?.review?.nextReviewAt)
  if (!dueMs) return 'today'
  if (dueMs <= Date.now()) return 'today'
  return 'scheduled'
}

function getMasteryLabel(card) {
  if (card?.review?.masteryLevel === 'stable') return '안정화'
  if (card?.review?.masteryLevel === 'needs_recheck') return '재확인'
  return '학습 중'
}

function UploadPanel({ user, userData }) {
  const [file, setFile] = useState(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [message, setMessage] = useState('')
  const submitUpload = useSubmitMistakeUpload()

  const previewUrl = useMemo(() => {
    if (!file) return ''
    return URL.createObjectURL(file)
  }, [file])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setMessage('')
    try {
      await submitUpload.mutateAsync({ file, user, userData, title, note, tags })
      setFile(null)
      setTitle('')
      setNote('')
      setTags('')
      setMessage('업로드가 접수되었습니다. 카드가 발행되면 복습 덱에 들어옵니다.')
      soundManager.playCrystal()
    } catch (error) {
      setMessage(error?.message || '업로드에 실패했습니다.')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mn-upload-panel">
      <label className="mn-dropzone">
        {previewUrl ? (
          <img src={previewUrl} alt="업로드 미리보기" />
        ) : (
          <div className="mn-dropzone-empty">
            <ImagePlus size={44} />
            <strong>풀이 이미지 업로드</strong>
            <span>문제와 풀이 흔적이 보이게 올려 주세요.</span>
          </div>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(event) => setFile(event.target.files?.[0] || null)}
        />
      </label>

      <div className="mn-upload-form">
        <div>
          <h2>카드 제작 요청</h2>
          <p>선생님이 정답과 해설을 붙여 플래시카드로 발행합니다.</p>
        </div>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="제목 힌트"
        />
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="헷갈린 부분이나 내가 쓴 답"
          rows={5}
        />
        <input
          value={tags}
          onChange={(event) => setTags(event.target.value)}
          placeholder="태그: 내심, 함수, 계산실수"
        />
        <button type="submit" disabled={!file || submitUpload.isPending}>
          <Upload size={17} />
          {submitUpload.isPending ? '전송 중...' : '운영툴로 보내기'}
        </button>
        {message && (
          <div className={`mn-upload-message ${message.includes('실패') ? 'error' : 'ok'}`}>
            {message}
          </div>
        )}
      </div>
    </form>
  )
}

function StudyCard({ card, revealed, onReveal }) {
  return (
    <button type="button" className={`mn-study-card ${revealed ? 'is-revealed' : ''}`} onClick={onReveal}>
      <div className="mn-card-inner">
        <div className="mn-card-face mn-card-front">
          <div className="mn-card-image-shell">
            <img src={card.imageUrl} alt={card.questionTitle || '오답 이미지'} />
          </div>
          <div className="mn-card-front-meta">
            <span>FRONT</span>
            <h2>{card.questionTitle || '나의 오답 카드'}</h2>
            {card.concept && <p>{card.concept}</p>}
          </div>
        </div>

        <div className="mn-card-face mn-card-back">
          <div className="mn-card-back-scroll">
            <div className="mn-answer-chip">정답 · {card.answer || '-'}</div>
            <h2>{card.questionTitle || '나의 오답 카드'}</h2>
            <div className="mn-markdown">
              <ReactMarkdown>{card.explanation || '해설이 아직 없습니다.'}</ReactMarkdown>
            </div>
          </div>
        </div>
      </div>
    </button>
  )
}

function StudyDeck({ cards, onReview, reviewing }) {
  const [sessionDoneIds, setSessionDoneIds] = useState([])

  const queue = useMemo(
    () => cards.filter(card => !sessionDoneIds.includes(card.id)),
    [cards, sessionDoneIds]
  )
  const activeCard = queue[0] || null
  const total = cards.length
  const done = Math.max(0, total - queue.length)
  const progress = total > 0 ? Math.round((done / total) * 100) : 100

  if (!activeCard) {
    return (
      <div className="mn-session-complete">
        <div className="mn-orbit-ring">
          <Check size={44} />
        </div>
        <h2>오늘 덱을 모두 확인했습니다</h2>
        <p>어려웠던 카드는 더 짧은 간격으로, 쉬웠던 카드는 더 긴 간격으로 다시 돌아옵니다.</p>
      </div>
    )
  }

  const handleReview = async (card, rating) => {
    await onReview(card, rating)
    setSessionDoneIds(prev => [...prev, card.id])
  }

  return (
    <StudyCardSession
      key={activeCard.id}
      card={activeCard}
      done={done}
      total={total}
      progress={progress}
      onReview={handleReview}
      reviewing={reviewing}
    />
  )
}

function StudyCardSession({ card, done, total, progress, onReview, reviewing }) {
  const [revealed, setRevealed] = useState(false)
  const [lastRating, setLastRating] = useState(null)

  const handleRate = useCallback(async (rating) => {
    if (!card || reviewing) return
    setLastRating(rating)
    await onReview(card, rating)
    soundManager.playClick()
  }, [card, onReview, reviewing])

  useEffect(() => {
    const handleKeyDown = (event) => {
      const tag = document.activeElement?.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select' || document.activeElement?.isContentEditable) return
      if (!card || reviewing) return

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        if (!revealed) setRevealed(true)
        return
      }
      if (!revealed) return

      const index = Number(event.key) - 1
      if (index >= 0 && index < REVIEW_RATINGS.length) {
        event.preventDefault()
        handleRate(REVIEW_RATINGS[index].id)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [card, handleRate, revealed, reviewing])

  return (
    <section className="mn-study-stage">
      <div className="mn-stage-header">
        <div>
          <span className="mn-kicker">ACTIVE DECK</span>
          <h2>{card.questionTitle || '나의 오답 카드'}</h2>
        </div>
        <div className="mn-progress-cluster">
          <span>{done + 1}/{total}</span>
          <div className="mn-progress-track">
            <div style={{ width: `${progress}%` }} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <Motion.div
          key={card.id}
          initial={{ opacity: 0, x: 34, scale: 0.98 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -34, scale: 0.98 }}
          transition={{ duration: 0.28 }}
        >
          <StudyCard card={card} revealed={revealed} onReveal={() => setRevealed(true)} />
        </Motion.div>
      </AnimatePresence>

      <div className="mn-review-controls">
        {!revealed ? (
          <button type="button" className="mn-show-answer" onClick={() => setRevealed(true)}>
            <ChevronRight size={18} />
            답 확인
          </button>
        ) : (
          <div className="mn-rating-grid">
            {REVIEW_RATINGS.map((rating) => {
              const Icon = rating.icon
              return (
                <button
                  key={rating.id}
                  type="button"
                  disabled={reviewing}
                  className={`mn-rating-btn ${rating.tone} ${lastRating === rating.id ? 'selected' : ''}`}
                  onClick={() => handleRate(rating.id)}
                >
                  <Icon size={18} />
                  <span>{rating.label}</span>
                  <small>{rating.interval}</small>
                </button>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

function LibraryGrid({ cards, emptyText }) {
  if (!cards.length) {
    return <div className="mn-empty-panel">{emptyText}</div>
  }

  return (
    <div className="mn-library-grid">
      {cards.map(card => (
        <article key={card.id} className="mn-mini-card">
          <div className="mn-mini-image">
            <img src={card.imageUrl} alt={card.questionTitle || '오답 카드'} />
          </div>
          <div className="mn-mini-body">
            <h3>{card.questionTitle || '오답 카드'}</h3>
            <p>{card.concept || (card.tags || []).slice(0, 2).join(', ') || '개념 카드'}</p>
            <div>
              <span><Clock size={13} /> {formatDateTime(card.review?.nextReviewAt)}</span>
              <span>{getMasteryLabel(card)}</span>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}

function PendingGrid({ uploads }) {
  if (!uploads.length) {
    return <div className="mn-empty-panel">운영툴에서 카드 발행을 기다리는 이미지가 없습니다.</div>
  }

  return (
    <div className="mn-library-grid">
      {uploads.map(item => (
        <article key={item.id} className="mn-mini-card pending">
          <div className="mn-mini-image">
            <img src={item.imageUrl} alt={item.title || '발행 대기 이미지'} />
          </div>
          <div className="mn-mini-body">
            <h3>{item.title || '발행 대기 이미지'}</h3>
            <p>{(item.tags || []).join(', ') || '검토 대기'}</p>
            <div><span><CalendarClock size={13} /> {formatDateTime(item.createdAt)}</span></div>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function MistakeNotebookPlanet({ onBack }) {
  const { user, userData } = useAuth()
  const [deck, setDeck] = useState('due')
  const notebook = useStudentMistakeNotebook(user?.uid)
  const reviewMutation = useReviewMistakeCard(user?.uid)
  const data = notebook.data || { dueCards: [], cards: [], pendingUploads: [], uploads: [] }

  const scheduledCards = useMemo(
    () => data.cards.filter(card => getDueState(card) === 'scheduled'),
    [data.cards]
  )
  const stableCards = useMemo(
    () => data.cards.filter(card => card.review?.masteryLevel === 'stable'),
    [data.cards]
  )
  const learningCards = useMemo(
    () => data.cards.filter(card => card.review?.masteryLevel !== 'stable'),
    [data.cards]
  )

  const activeDeckCards = deck === 'all'
    ? data.cards
    : deck === 'learning'
      ? learningCards
      : deck === 'stable'
        ? stableCards
        : data.dueCards

  const handleReview = async (card, result) => {
    await reviewMutation.mutateAsync({ card, result })
  }

  return (
    <div className="space-bg mn-planet-page">
      <StarField count={120} />
      <div className="mn-shell">
        <header className="mn-hero">
          <button type="button" className="mn-back-btn" onClick={onBack}>← 행성 지도로</button>
          <div>
            <span className="mn-kicker">MEMORY PLANET</span>
            <h1>오답노트 행성</h1>
            <p>이미지를 떠올리고, 답을 확인하고, 난이도로 다음 복습 궤도를 정합니다.</p>
          </div>
          <div className="mn-metrics">
            <Metric icon={<Layers size={18} />} label="전체" value={data.cards.length} />
            <Metric icon={<Gauge size={18} />} label="오늘" value={data.dueCards.length} />
            <Metric icon={<Archive size={18} />} label="대기" value={data.pendingUploads.length} />
          </div>
        </header>

        <main className="mn-workspace">
          <aside className="mn-deck-rail">
            <DeckButton active={deck === 'due'} icon={<Brain size={18} />} label="오늘 덱" count={data.dueCards.length} onClick={() => setDeck('due')} />
            <DeckButton active={deck === 'learning'} icon={<Flame size={18} />} label="학습 중" count={learningCards.length} onClick={() => setDeck('learning')} />
            <DeckButton active={deck === 'stable'} icon={<Sparkles size={18} />} label="안정화" count={stableCards.length} onClick={() => setDeck('stable')} />
            <DeckButton active={deck === 'all'} icon={<Layers size={18} />} label="전체 카드" count={data.cards.length} onClick={() => setDeck('all')} />
            <DeckButton active={deck === 'pending'} icon={<CalendarClock size={18} />} label="발행 대기" count={data.pendingUploads.length} onClick={() => setDeck('pending')} />
            <DeckButton active={deck === 'upload'} icon={<ImagePlus size={18} />} label="이미지 보내기" count={0} onClick={() => setDeck('upload')} />
            <div className="mn-rail-note">
              <strong>{scheduledCards.length}</strong>
              <span>예약된 카드</span>
            </div>
          </aside>

          <section className="mn-content-panel">
            {notebook.isLoading ? (
              <div className="mn-empty-panel">오답노트 궤도 계산 중...</div>
            ) : (
              <>
                {deck === 'upload' && <UploadPanel user={user} userData={userData} />}
                {deck === 'pending' && <PendingGrid uploads={data.pendingUploads} />}
                {['due', 'learning', 'stable', 'all'].includes(deck) && (
                  deck === 'due' || deck === 'learning' ? (
                    activeDeckCards.length > 0 ? (
                      <StudyDeck
                        cards={activeDeckCards}
                        onReview={handleReview}
                        reviewing={reviewMutation.isPending}
                      />
                    ) : (
                      <div className="mn-session-complete">
                        <div className="mn-orbit-ring">
                          <Check size={44} />
                        </div>
                        <h2>{deck === 'due' ? '오늘 덱이 비었습니다' : '학습 중 카드가 없습니다'}</h2>
                        <p>새 카드가 발행되거나 복습 시간이 돌아오면 이곳에 표시됩니다.</p>
                      </div>
                    )
                  ) : (
                    <LibraryGrid cards={activeDeckCards} emptyText="아직 표시할 카드가 없습니다." />
                  )
                )}
              </>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

function DeckButton({ active, icon, label, count, onClick }) {
  return (
    <button type="button" className={`mn-deck-btn ${active ? 'active' : ''}`} onClick={onClick}>
      <span>{icon}</span>
      <strong>{label}</strong>
      {count > 0 && <em>{count}</em>}
    </button>
  )
}

function Metric({ icon, label, value }) {
  return (
    <div className="mn-metric">
      <span>{icon}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </div>
  )
}
