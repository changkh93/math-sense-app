import { useMemo, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Archive, CheckCircle2, Image, Send, Sparkles } from 'lucide-react'
import { parseInlineFormatting } from '../../utils/formatUtils'
import {
  useAdminMistakeUploads,
  useArchiveMistakeUpload,
  useCreateMistakeCard
} from '../../hooks/useMistakeNotebook'
import './Admin.css'

const emptyForm = {
  questionTitle: '',
  answer: '',
  explanation: '',
  concept: '',
  tags: '',
  difficulty: 'normal'
}

function formatUploadDate(value) {
  const ms = value?.toMillis?.() || (value?.seconds ? value.seconds * 1000 : 0)
  if (!ms) return ''
  return new Date(ms).toLocaleString('ko-KR', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function buildStarterExplanation(upload) {
  const hints = [
    upload?.questionText ? `문제: ${upload.questionText}` : '',
    upload?.note ? `학생 메모: ${upload.note}` : '',
    '핵심 개념:',
    '풀이:',
    '다음에 확인할 포인트:'
  ].filter(Boolean)
  return hints.join('\n\n')
}

function UploadPreview({ upload, compact = false }) {
  const options = Array.isArray(upload?.sourceOptions) ? upload.sourceOptions.filter(Boolean) : []

  if (upload?.imageUrl) {
    if (compact) {
      return (
        <img
          src={upload.imageUrl}
          alt={upload.title || '오답 이미지'}
          style={{ width: 82, height: 82, objectFit: 'cover', borderRadius: 6, background: '#0f172a' }}
        />
      )
    }

    return (
      <div style={{ padding: '1rem', display: 'grid', gap: '1rem' }}>
        <img
          src={upload.imageUrl}
          alt={upload.title || '오답 이미지'}
          style={{ width: '100%', maxHeight: 360, objectFit: 'contain', display: 'block', borderRadius: 8, background: 'rgba(255,255,255,0.92)' }}
        />
        {upload.questionText && (
          <div style={{ color: 'white', fontWeight: 850, lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
            {parseInlineFormatting(upload.questionText, { keyPrefix: `admin-mn-q-${upload.id || 'upload'}` })}
          </div>
        )}
        {options.length > 0 && (
          <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.84)', lineHeight: 1.55 }}>
            {options.map((option, index) => (
              <li key={`${option}-${index}`}>
                {parseInlineFormatting(option, { keyPrefix: `admin-mn-opt-${upload.id || 'upload'}-${index}` })}
              </li>
            ))}
          </ol>
        )}
      </div>
    )
  }

  return (
    <div style={{
      width: compact ? 82 : '100%',
      height: compact ? 82 : 'auto',
      minHeight: compact ? 82 : 260,
      boxSizing: 'border-box',
      borderRadius: compact ? 6 : 0,
      background: 'linear-gradient(145deg, rgba(15,23,42,0.95), rgba(2,6,23,0.92))',
      border: compact ? '1px solid rgba(0,212,255,0.22)' : 'none',
      padding: compact ? '0.5rem' : '1.25rem',
      overflow: 'hidden',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: compact ? 'center' : 'flex-start',
      gap: compact ? '0.25rem' : '0.75rem'
    }}>
      <span style={{
        color: 'var(--crystal-cyan)',
        fontSize: compact ? '0.58rem' : '0.78rem',
        fontWeight: 900,
        letterSpacing: '0.08em'
      }}>
        QUIZ
      </span>
      <div style={{
        color: 'white',
        fontWeight: 850,
        lineHeight: 1.45,
        fontSize: compact ? '0.68rem' : '1.05rem',
        display: compact ? '-webkit-box' : 'block',
        WebkitLineClamp: compact ? 4 : 'unset',
        WebkitBoxOrient: compact ? 'vertical' : 'unset',
        overflow: compact ? 'hidden' : 'visible',
        whiteSpace: 'pre-wrap'
      }}>
        {compact
          ? (upload?.questionText || upload?.title || '문제 텍스트가 없습니다.')
          : parseInlineFormatting(upload?.questionText || upload?.title || '문제 텍스트가 없습니다.', {
            keyPrefix: `admin-mn-text-${upload?.id || 'upload'}`
          })}
      </div>
      {!compact && options.length > 0 && (
        <ol style={{ margin: 0, paddingLeft: '1.2rem', color: 'rgba(255,255,255,0.82)', lineHeight: 1.55 }}>
          {options.map((option, index) => (
            <li key={`${option}-${index}`}>
              {parseInlineFormatting(option, { keyPrefix: `admin-mn-text-opt-${upload?.id || 'upload'}-${index}` })}
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}

export default function MistakeNotebookAdmin() {
  const [status, setStatus] = useState('pending')
  const [selectedId, setSelectedId] = useState('')

  const uploadsQuery = useAdminMistakeUploads(status)
  const archiveUpload = useArchiveMistakeUpload()
  const uploads = useMemo(() => uploadsQuery.data || [], [uploadsQuery.data])
  const selected = uploads.find(item => item.id === selectedId) || uploads[0] || null

  const stats = useMemo(() => ({
    total: uploads.length,
    pending: uploads.filter(item => item.status === 'pending').length,
    created: uploads.filter(item => item.status === 'card_created').length
  }), [uploads])

  const handleArchive = async () => {
    if (!selected) return
    const ok = window.confirm('이 업로드를 카드 발행 없이 보관 처리할까요?')
    if (!ok) return
    await archiveUpload.mutateAsync({ uploadId: selected.id })
    setSelectedId('')
  }

  return (
    <div className="admin-page">
      <header className="page-header" style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-end', marginBottom: '1rem' }}>
        <div>
          <h1>오답노트 행성 운영툴</h1>
          <p>Student Mistake Planet Command Center</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.25)', padding: '0.35rem', borderRadius: 8 }}>
          {[
            ['pending', '발행 대기'],
            ['card_created', '발행 완료'],
            ['archived', '보관'],
            ['all', '전체']
          ].map(([key, label]) => (
            <button
              key={key}
              className={`admin-btn ${status === key ? 'primary' : 'secondary'}`}
              style={{ border: status === key ? '' : 'none', padding: '0.5rem 1rem' }}
              onClick={() => {
                setStatus(key)
                setSelectedId('')
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '360px minmax(0, 1fr)', gap: '1rem', height: 'calc(100vh - 160px)' }}>
        <section className="admin-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
              <MiniStat label="목록" value={stats.total} />
              <MiniStat label="대기" value={stats.pending} />
              <MiniStat label="발행" value={stats.created} />
            </div>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
            {uploadsQuery.isLoading ? (
              <p style={{ color: 'var(--text-muted)' }}>업로드 대기열을 불러오는 중...</p>
            ) : uploads.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '2rem' }}>해당 상태의 항목이 없습니다.</p>
            ) : uploads.map(upload => (
              <button
                key={upload.id}
                type="button"
                onClick={() => setSelectedId(upload.id)}
                className="admin-list-item"
                style={{
                  display: 'grid',
                  gridTemplateColumns: '82px minmax(0, 1fr)',
                  gap: '0.75rem',
                  border: selected?.id === upload.id ? '1px solid var(--crystal-cyan)' : '1px solid rgba(255,255,255,0.08)',
                  background: selected?.id === upload.id ? 'rgba(0, 212, 255, 0.12)' : 'rgba(255,255,255,0.03)',
                  borderRadius: 8,
                  padding: '0.65rem',
                  color: 'white',
                  cursor: 'pointer',
                  textAlign: 'left'
                }}
              >
                <UploadPreview upload={upload} compact />
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 900, color: 'var(--text-bright)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {upload.title || '제목 없음'}
                  </div>
                  <div style={{ color: 'var(--crystal-cyan)', fontSize: '0.85rem', marginTop: 4 }}>{upload.userName || upload.userId}</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: 4 }}>{formatUploadDate(upload.createdAt)}</div>
                  <StatusBadge status={upload.status} />
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="admin-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {!selected ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              왼쪽에서 오답 항목을 선택하세요.
            </div>
          ) : (
            <>
              <div style={{ padding: '1rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div>
                  <h2 style={{ margin: 0, color: 'var(--text-bright)', fontSize: '1.15rem' }}>{selected.userName} 학생 오답 항목</h2>
                  <p style={{ margin: '0.25rem 0 0', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    이미지 또는 문제 텍스트 앞면, 입력한 정답/해설 뒷면으로 플래시카드가 발행됩니다.
                  </p>
                </div>
                <button className="admin-btn secondary" onClick={handleArchive} disabled={archiveUpload.isPending}>
                  <Archive size={15} /> 보관
                </button>
              </div>

              <MistakeCardEditor key={selected.id} selected={selected} />
            </>
          )}
        </section>
      </div>
    </div>
  )
}

function getInitialForm(upload) {
  if (!upload) return emptyForm
  const card = upload.card || {}
  return {
    questionTitle: card.questionTitle || upload.title || '나의 오답 카드',
    answer: card.answer || upload.answer || '',
    explanation: card.explanation || buildStarterExplanation(upload),
    concept: card.concept || upload.concept || '',
    tags: (card.tags || upload.tags || []).join(', '),
    difficulty: card.difficulty || 'normal'
  }
}

function MistakeCardEditor({ selected }) {
  const [form, setForm] = useState(() => getInitialForm(selected))
  const [notice, setNotice] = useState('')
  const createCard = useCreateMistakeCard()

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  const handleCreate = async () => {
    setNotice('')
    try {
      await createCard.mutateAsync({ upload: selected, form })
      setNotice(selected.cardId
        ? '플래시카드를 수정 저장했습니다. 학생 오답노트 행성에 반영됩니다.'
        : '플래시카드를 발행했습니다. 학생 오답노트 행성의 복습 목록에 반영됩니다.')
    } catch (error) {
      setNotice(error?.message || '카드 발행에 실패했습니다.')
    }
  }

  return (
    <div style={{ flex: 1, overflowY: 'auto', padding: '1rem', display: 'grid', gridTemplateColumns: 'minmax(280px, 42%) minmax(0, 1fr)', gap: '1rem' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, overflow: 'hidden', background: 'rgba(0,0,0,0.2)' }}>
          <UploadPreview upload={selected} />
        </div>
        <div style={{ border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '1rem', background: 'rgba(255,255,255,0.03)' }}>
          <h3 style={{ margin: '0 0 0.6rem', color: 'var(--crystal-cyan)', fontSize: '1rem' }}><Image size={16} /> 학생 메모</h3>
          <p style={{ color: 'var(--text-muted)', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>
            {selected.note || '학생 메모가 없습니다.'}
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        <label style={labelStyle}>카드 제목</label>
        <input style={inputStyle} value={form.questionTitle} onChange={e => handleChange('questionTitle', e.target.value)} />

        <label style={labelStyle}>핵심 개념</label>
        <input style={inputStyle} value={form.concept} onChange={e => handleChange('concept', e.target.value)} placeholder="예: 일차방정식 이항, 함수 기울기" />

        <label style={labelStyle}>정답</label>
        <input style={inputStyle} value={form.answer} onChange={e => handleChange('answer', e.target.value)} placeholder="학생이 외워야 할 최종 정답" />

        <label style={labelStyle}>해설</label>
        <textarea
          style={{ ...inputStyle, minHeight: 180, resize: 'vertical', lineHeight: 1.55 }}
          value={form.explanation}
          onChange={e => handleChange('explanation', e.target.value)}
          placeholder="왜 틀렸는지, 올바른 풀이, 다음 확인 포인트를 적어 주세요. 마크다운 사용 가능"
        />

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: '0.75rem' }}>
          <div>
            <label style={labelStyle}>태그</label>
            <input style={inputStyle} value={form.tags} onChange={e => handleChange('tags', e.target.value)} />
          </div>
          <div>
            <label style={labelStyle}>난이도</label>
            <select style={inputStyle} value={form.difficulty} onChange={e => handleChange('difficulty', e.target.value)}>
              <option value="light">가벼움</option>
              <option value="normal">보통</option>
              <option value="hard">집중 필요</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.3rem' }}>
          <button className="admin-btn secondary" type="button" onClick={() => handleChange('explanation', buildStarterExplanation(selected))}>
            <Sparkles size={15} /> 해설 틀 채우기
          </button>
          <button className="admin-btn primary" type="button" onClick={handleCreate} disabled={createCard.isPending}>
            <Send size={15} /> {createCard.isPending ? '저장 중...' : (selected.cardId ? '수정 저장' : '플래시카드 발행')}
          </button>
        </div>

        {notice && (
          <div style={{
            color: notice.includes('실패') ? '#ff8a84' : '#86efac',
            border: `1px solid ${notice.includes('실패') ? 'rgba(248,113,113,0.3)' : 'rgba(74,222,128,0.3)'}`,
            background: notice.includes('실패') ? 'rgba(248,113,113,0.08)' : 'rgba(74,222,128,0.08)',
            borderRadius: 8,
            padding: '0.8rem'
          }}>
            {notice}
          </div>
        )}

        <div style={{ border: '1px solid rgba(0, 212, 255, 0.18)', borderRadius: 8, padding: '1rem', background: 'rgba(0, 212, 255, 0.05)' }}>
          <h3 style={{ margin: '0 0 0.7rem', color: 'var(--crystal-cyan)', fontSize: '1rem' }}>
            <CheckCircle2 size={16} /> 카드 뒷면 미리보기
          </h3>
          <div style={{ color: '#bbf7d0', fontWeight: 900, marginBottom: 8 }}>정답: {form.answer || '-'}</div>
          <div style={{ color: 'rgba(255,255,255,0.84)', lineHeight: 1.6 }}>
            <ReactMarkdown>{form.explanation || '해설을 입력하면 미리보기가 표시됩니다.'}</ReactMarkdown>
          </div>
        </div>
      </div>
    </div>
  )
}

function MiniStat({ label, value }) {
  return (
    <div style={{ border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '0.65rem', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.76rem' }}>{label}</div>
      <div style={{ color: 'var(--text-bright)', fontWeight: 900, fontSize: '1.25rem' }}>{value}</div>
    </div>
  )
}

function StatusBadge({ status }) {
  const map = {
    pending: ['발행 대기', '#f59e0b'],
    card_created: ['발행 완료', '#10b981'],
    archived: ['보관', '#64748b']
  }
  const [label, color] = map[status] || [status || '상태 없음', '#64748b']
  return (
    <span style={{
      display: 'inline-block',
      marginTop: 7,
      background: color,
      color: 'white',
      fontSize: '0.72rem',
      fontWeight: 900,
      borderRadius: 4,
      padding: '2px 6px'
    }}>
      {label}
    </span>
  )
}

const labelStyle = {
  color: 'var(--crystal-cyan)',
  fontWeight: 800,
  fontSize: '0.88rem'
}

const inputStyle = {
  width: '100%',
  boxSizing: 'border-box',
  border: '1px solid rgba(255,255,255,0.14)',
  borderRadius: 8,
  background: 'rgba(15, 23, 42, 0.86)',
  color: 'white',
  padding: '0.72rem 0.82rem',
  outline: 'none'
}
