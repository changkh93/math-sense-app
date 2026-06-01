import { Children, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { AnimatePresence, motion as Motion } from 'framer-motion'
import {
  Brain,
  CalendarClock,
  Check,
  Clock,
  Edit3,
  Flame,
  ImagePlus,
  Layers,
  RotateCcw,
  Save,
  Sparkles,
  Trash2,
  Upload
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import {
  useArchiveStudentMistakeCard,
  useReviewMistakeCard,
  useStudentMistakeNotebook,
  useSubmitMistakeUpload,
  useUpdateStudentMistakeCard
} from '../../hooks/useMistakeNotebook'
import StarField from './StarField'
import soundManager from '../../utils/SoundManager'
import { normalizeEscapedNewlines, parseInlineFormatting } from '../../utils/formatUtils'
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
  if (card?.review?.masteryLevel === 'stable') return '장기 기억'
  if (card?.review?.masteryLevel === 'needs_recheck') return '재확인'
  return '학습 중'
}

function formatMarkdownChildren(children, keyPrefix) {
  return Children.map(children, (child, index) => {
    if (typeof child === 'string') {
      return parseInlineFormatting(child, {
        keyPrefix: `${keyPrefix}-${index}`
      })
    }
    return child
  })
}

function FormattedMarkdown({ children, keyPrefix = 'mn-md' }) {
  return (
    <ReactMarkdown
      components={{
        p: ({ children: nodeChildren }) => (
          <p>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-p`)}</p>
        ),
        li: ({ children: nodeChildren }) => (
          <li>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-li`)}</li>
        ),
        strong: ({ children: nodeChildren }) => (
          <strong>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-strong`)}</strong>
        ),
        em: ({ children: nodeChildren }) => (
          <em>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-em`)}</em>
        ),
        h1: ({ children: nodeChildren }) => (
          <h1>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-h1`)}</h1>
        ),
        h2: ({ children: nodeChildren }) => (
          <h2>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-h2`)}</h2>
        ),
        h3: ({ children: nodeChildren }) => (
          <h3>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-h3`)}</h3>
        ),
        h4: ({ children: nodeChildren }) => (
          <h4>{formatMarkdownChildren(nodeChildren, `${keyPrefix}-h4`)}</h4>
        )
      }}
    >
      {normalizeEscapedNewlines(children)}
    </ReactMarkdown>
  )
}

function CardFrontVisual({ card, compact = false }) {
  const options = Array.isArray(card?.sourceOptions) ? card.sourceOptions.filter(Boolean) : []
  const isQuizCard = card?.source === 'dark_matter_quiz' || card?.questionText || options.length > 0

  if (isQuizCard) {
    return (
      <div className={`mn-quiz-front ${compact ? 'compact' : ''}`}>
        <div className="mn-quiz-front-label">{card?.sourceQuizTitle || 'QUIZ FRONT'}</div>
        {card?.imageUrl && (
          <div className="mn-quiz-front-image">
            <img src={card.imageUrl} alt={card.questionTitle || '퀴즈 이미지'} />
          </div>
        )}
        <div className="mn-quiz-front-question">
          {parseInlineFormatting(card?.questionText || card?.questionTitle || '문제 내용이 없습니다.', {
            keyPrefix: `mn-front-q-${card?.id || 'card'}`
          })}
        </div>
        {options.length > 0 && (
          <ol className="mn-quiz-front-options">
            {options.map((option, index) => (
              <li key={`${option}-${index}`}>
                {parseInlineFormatting(option, {
                  keyPrefix: `mn-front-opt-${card?.id || 'card'}-${index}`
                })}
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  }

  if (card?.imageUrl) {
    return <img src={card.imageUrl} alt={card.questionTitle || '오답 이미지'} />
  }

  return (
    <div className={`mn-text-front ${compact ? 'compact' : ''}`}>
      <span>{card?.source === 'dark_matter_quiz' ? 'DARK MATTER QUIZ' : 'QUESTION'}</span>
      <p>{parseInlineFormatting(card?.questionText || card?.questionTitle || '문제 내용이 없습니다.', {
        keyPrefix: `mn-text-front-${card?.id || 'card'}`
      })}</p>
    </div>
  )
}

function UploadPanel({ user, userData }) {
  const [file, setFile] = useState(null)
  const [note, setNote] = useState('')
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
      await submitUpload.mutateAsync({ file, user, userData, title: '', note, tags: '' })
      setFile(null)
      setNote('')
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
          <p>이미지와 메모는 운영툴에서 카드 제작 참고 자료로 사용됩니다.</p>
        </div>
        <textarea
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="카드 제작 메모(선택): 내가 쓴 답, 헷갈린 조건, 궁금한 부분"
          rows={7}
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
  const handleKeyDown = (event) => {
    if (revealed) return
    if (event.key === ' ' || event.key === 'Enter') {
      event.preventDefault()
      onReveal()
    }
  }

  return (
    <div
      role="button"
      tabIndex={revealed ? -1 : 0}
      className={`mn-study-card ${revealed ? 'is-revealed' : ''}`}
      onClick={() => {
        if (!revealed) onReveal()
      }}
      onKeyDown={handleKeyDown}
      aria-label={revealed ? '정답과 해설' : '클릭하여 정답 보기'}
    >
      <div className="mn-card-inner">
        <div className="mn-card-face mn-card-front">
          <div className="mn-card-image-shell">
            <CardFrontVisual card={card} />
          </div>
          <div className="mn-flip-cue" aria-hidden="true">
            <RotateCcw size={18} />
            <span>클릭하여 정답 보기</span>
          </div>
        </div>

        <div className="mn-card-face mn-card-back">
          <div className="mn-card-back-scroll">
            <div className="mn-answer-chip">
              정답 · {parseInlineFormatting(card.answer || '-', {
                keyPrefix: `mn-answer-${card?.id || 'card'}`
              })}
            </div>
            <h2>{card.questionTitle || '나의 오답 카드'}</h2>
            <div className="mn-markdown">
              <FormattedMarkdown keyPrefix={`mn-back-${card?.id || 'card'}`}>
                {card.explanation || '해설이 아직 없습니다.'}
              </FormattedMarkdown>
            </div>
          </div>
        </div>
      </div>
    </div>
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
          <div className="mn-flip-note">카드 어디든 클릭하면 정답과 해설이 열립니다.</div>
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

function LibraryGrid({ cards, emptyText, editable = false, onUpdateCard, onArchiveCard, busy = false }) {
  const [editingId, setEditingId] = useState('')
  const [draft, setDraft] = useState('')
  const [message, setMessage] = useState('')
  const editingCard = cards.find(card => card.id === editingId) || null

  const startEdit = (card) => {
    setEditingId(card.id)
    setDraft(card.explanation || '')
    setMessage('')
  }

  const cancelEdit = () => {
    setEditingId('')
    setDraft('')
    setMessage('')
  }

  const saveEdit = async (card) => {
    setMessage('')
    try {
      await onUpdateCard?.(card, draft)
      setEditingId('')
      setDraft('')
      setMessage('해설을 저장했습니다.')
    } catch (error) {
      setMessage(error?.message || '해설 저장에 실패했습니다.')
    }
  }

  const archiveCard = async (card) => {
    const ok = window.confirm('이 카드를 전체 카드에서 삭제할까요? 복습 목록에서도 사라집니다.')
    if (!ok) return
    setMessage('')
    try {
      await onArchiveCard?.(card)
      setMessage('카드를 삭제했습니다.')
    } catch (error) {
      setMessage(error?.message || '카드 삭제에 실패했습니다.')
    }
  }

  if (!cards.length) {
    return <div className="mn-empty-panel">{emptyText}</div>
  }

  return (
    <div className={`mn-library-workspace ${editingCard ? 'with-editor' : ''}`}>
      {message && <div className={`mn-library-message ${message.includes('실패') ? 'error' : 'ok'}`}>{message}</div>}
      <div className="mn-library-grid">
        {cards.map(card => {
          const isEditing = editingId === card.id
          return (
            <article key={card.id} className={`mn-mini-card ${isEditing ? 'editing' : ''}`}>
              <div className="mn-mini-image">
                <CardFrontVisual card={card} compact />
              </div>
              <div className="mn-mini-body">
                <h3>{card.questionTitle || '오답 카드'}</h3>
                <p>{card.concept || (card.tags || []).slice(0, 2).join(', ') || '개념 카드'}</p>
                <div>
                  <span><Clock size={13} /> {formatDateTime(card.review?.nextReviewAt)}</span>
                  <span>{getMasteryLabel(card)}</span>
                </div>
                {editable && (
                  <div className="mn-card-actions">
                    <button type="button" onClick={() => startEdit(card)} disabled={busy || isEditing}>
                      <Edit3 size={14} />
                      {isEditing ? '수정 중' : '수정'}
                    </button>
                    <button type="button" className="danger" onClick={() => archiveCard(card)} disabled={busy}>
                      <Trash2 size={14} />
                      삭제
                    </button>
                  </div>
                )}
              </div>
            </article>
          )
        })}
      </div>
      {editingCard && (
        <aside className="mn-edit-panel">
          <div className="mn-edit-preview">
            <CardFrontVisual card={editingCard} />
          </div>
          <div className="mn-edit-header">
            <span>뒷면 해설 수정</span>
            <h2>{editingCard.questionTitle || '오답 카드'}</h2>
            <p>학생 화면의 카드 뒷면에 표시될 해설입니다.</p>
          </div>
          <textarea
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label="뒷면 해설"
            rows={18}
          />
          <div className="mn-edit-actions">
            <button type="button" onClick={() => saveEdit(editingCard)} disabled={busy || !draft.trim()}>
              <Save size={16} />
              저장
            </button>
            <button type="button" onClick={cancelEdit} disabled={busy}>취소</button>
          </div>
        </aside>
      )}
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
            <p>{item.note || '운영툴 검토 대기'}</p>
            <div><span><CalendarClock size={13} /> {formatDateTime(item.createdAt)}</span></div>
          </div>
        </article>
      ))}
    </div>
  )
}

export default function MistakeNotebookPlanet({ onBack, onNavigateView }) {
  const navigate = useNavigate()
  const { user, userData } = useAuth()
  const [deck, setDeck] = useState('due')
  const [isDeckMenuOpen, setIsDeckMenuOpen] = useState(false)
  const notebook = useStudentMistakeNotebook(user?.uid)
  const reviewMutation = useReviewMistakeCard(user?.uid)
  const updateCardMutation = useUpdateStudentMistakeCard(user?.uid)
  const archiveCardMutation = useArchiveStudentMistakeCard(user?.uid)
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

  const handleUpdateCard = async (card, explanation) => {
    await updateCardMutation.mutateAsync({ cardId: card.id, explanation })
  }

  const handleArchiveCard = async (card) => {
    await archiveCardMutation.mutateAsync({ cardId: card.id })
  }

  const selectDeck = (nextDeck) => {
    setDeck(nextDeck)
    setIsDeckMenuOpen(false)
  }

  const moveToView = (view) => {
    setIsDeckMenuOpen(false)
    if (view === 'agora') {
      navigate('/agora')
      return
    }
    onNavigateView?.(view)
  }

  return (
    <div className="space-bg mn-planet-page">
      <StarField count={120} />
      <button
        type="button"
        className={`mn-focus-menu-toggle ${isDeckMenuOpen ? 'active' : ''}`}
        onClick={() => setIsDeckMenuOpen(prev => !prev)}
        aria-expanded={isDeckMenuOpen}
        aria-label="오답노트 메뉴 열기"
      >
        <span />
        <span />
        <span />
      </button>
      <button type="button" className="mn-focus-back-btn" onClick={onBack}>
        ← 행성 지도로
      </button>
      {isDeckMenuOpen && (
        <button
          type="button"
          className="mn-menu-scrim"
          onClick={() => setIsDeckMenuOpen(false)}
          aria-label="메뉴 닫기"
        />
      )}
      <aside className={`mn-deck-rail ${isDeckMenuOpen ? 'open' : ''}`}>
        <div className="mn-rail-header">
          <strong>오답노트 메뉴</strong>
          <button type="button" onClick={() => setIsDeckMenuOpen(false)} aria-label="메뉴 닫기">×</button>
        </div>
        <button
          type="button"
          className={`mn-create-card-btn ${deck === 'upload' ? 'active' : ''}`}
          onClick={() => selectDeck('upload')}
        >
          <ImagePlus size={18} />
          <span>이미지로 카드 만들기</span>
        </button>
        <div className="mn-rail-divider" />
        <DeckButton active={deck === 'due'} icon={<Brain size={18} />} label="오늘 덱" count={data.dueCards.length} onClick={() => selectDeck('due')} />
        <DeckButton active={deck === 'learning'} icon={<Flame size={18} />} label="학습 중" count={learningCards.length} onClick={() => selectDeck('learning')} />
        <DeckButton active={deck === 'stable'} icon={<Sparkles size={18} />} label="장기 기억" count={stableCards.length} onClick={() => selectDeck('stable')} />
        <DeckButton active={deck === 'all'} icon={<Layers size={18} />} label="전체 카드" count={data.cards.length} onClick={() => selectDeck('all')} />
        <DeckButton active={deck === 'pending'} icon={<CalendarClock size={18} />} label="발행 대기" count={data.pendingUploads.length} onClick={() => selectDeck('pending')} />
        <div className="mn-rail-note">
          <strong>{scheduledCards.length}</strong>
          <span>예약된 카드</span>
        </div>
        <div className="mn-rail-divider" />
        <button type="button" className="mn-exit-btn" onClick={onBack}>행성 지도로</button>
        <div className="mn-view-links">
          <button type="button" onClick={() => moveToView('assignment_hub')}>과제</button>
          <button type="button" onClick={() => moveToView('agora')}>아고라</button>
          <button type="button" onClick={() => moveToView('store')}>스토어</button>
        </div>
      </aside>
      <div className="mn-shell">
        <header className="mn-hero">
          <div>
            <span className="mn-kicker">MEMORY PLANET</span>
            <h1>오답노트 행성</h1>
          </div>
        </header>

        <main className="mn-workspace">
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
                    <LibraryGrid
                      cards={activeDeckCards}
                      emptyText="아직 표시할 카드가 없습니다."
                      editable={deck === 'all'}
                      onUpdateCard={handleUpdateCard}
                      onArchiveCard={handleArchiveCard}
                      busy={updateCardMutation.isPending || archiveCardMutation.isPending}
                    />
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
