import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import MissionMarkdownViewer from './MissionMarkdownViewer'
import soundManager from '../../utils/SoundManager'

const QUESTION_COUNT = 15

const getParticipant = (battle, uid) => battle?.participants?.[uid] || {}

const getOpponentUid = (battle, uid) => (
  (battle?.participantUids || []).find(participantUid => participantUid !== uid) || ''
)

const formatTimeLeft = (endsAtMs) => {
  const left = Math.max(0, Math.ceil((Number(endsAtMs || 0) - Date.now()) / 1000))
  const min = Math.floor(left / 60)
  const sec = String(left % 60).padStart(2, '0')
  return `${min}:${sec}`
}

export default function QuizBattleView({
  clusterId,
  regionId,
  entryUnitId,
  entryUnitTitle,
  onExit,
  onSoloQuiz,
}) {
  const { user } = useAuth()
  const [phase, setPhase] = useState('idle')
  const [ticketId, setTicketId] = useState('')
  const [battleId, setBattleId] = useState('')
  const [battle, setBattle] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [answerResults, setAnswerResults] = useState({})
  const [battleStats, setBattleStats] = useState(null)
  const [isJoining, setIsJoining] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState('')
  const [timeNow, setTimeNow] = useState(Date.now())
  const [reveal, setReveal] = useState(false) // 답안 제출 후 정답 공개 단계
  const [reviewMode, setReviewMode] = useState(false) // 결과 화면에서 틀린 문제 복습
  const [reviewIndex, setReviewIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const activeTicketRef = useRef('')
  const matchedRef = useRef(false)

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useEffect(() => {
    if (!user?.uid) return undefined
    const unsubscribe = onSnapshot(doc(db, 'users', user.uid, 'battleStats', 'summary'), (snap) => {
      setBattleStats(snap.exists() ? snap.data() : null)
    }, () => {
      setBattleStats(null)
    })
    return () => unsubscribe()
  }, [user?.uid])

  const joinQueue = useCallback(async ({ silent = false } = {}) => {
    if (!user?.uid || !clusterId || !regionId || !entryUnitId || isJoining) return
    setIsJoining(true)
    if (!silent) {
      setError('')
      setPhase('waiting')
    }

    try {
      const join = httpsCallable(functions, 'joinQuizBattleQueue')
      const res = await join({
        clusterId,
        regionId,
        entryUnitId,
        questionCount: QUESTION_COUNT,
      })
      const data = res.data || {}
      if (data.status === 'matched' && data.battleId) {
        matchedRef.current = true
        setBattleId(data.battleId)
        setPhase('active')
        soundManager.playCrystal()
      } else {
        activeTicketRef.current = data.ticketId || `${user.uid}_${regionId}`
        setTicketId(activeTicketRef.current)
        setPhase('waiting')
      }
    } catch (err) {
      setError(err?.message || '배틀 대기룸에 입장하지 못했습니다.')
      setPhase('idle')
    } finally {
      setIsJoining(false)
    }
  }, [clusterId, entryUnitId, isJoining, regionId, user?.uid])

  const cancelQueue = useCallback(async () => {
    if (!regionId || matchedRef.current) return
    try {
      const cancel = httpsCallable(functions, 'cancelQuizBattleQueue')
      await cancel({ regionId })
    } catch (err) {
      console.warn('Failed to cancel quiz battle queue', err)
    }
  }, [regionId])

  useEffect(() => {
    return () => {
      cancelQueue()
    }
  }, [cancelQueue])

  useEffect(() => {
    if (phase !== 'waiting' || !ticketId) return undefined
    const unsubscribe = onSnapshot(doc(db, 'quizBattleQueueTickets', ticketId), async (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      if (data.status === 'matched' && data.matchId) {
        // stale 방어: 티켓이 종료된 과거 배틀을 가리키면 무시하고 대기를 유지한다.
        // 서버가 티켓을 갱신하기 전 순간에 과거 matched 상태를 잡는 레이스를 막는다.
        try {
          const battleSnap = await getDoc(doc(db, 'quizBattles', data.matchId))
          if (battleSnap.exists() && battleSnap.data()?.status === 'finished') return
        } catch (err) {
          console.warn('Failed to verify matched battle status', err)
        }
        matchedRef.current = true
        setBattleId(data.matchId)
        setPhase('active')
        soundManager.playCrystal()
      }
    }, (err) => {
      setError(err?.message || '배틀 대기 상태를 확인하지 못했습니다.')
    })
    return () => unsubscribe()
  }, [phase, ticketId])

  useEffect(() => {
    if (phase !== 'waiting') return undefined
    // 매칭은 ticket onSnapshot이 즉시 알려준다. 이 폴링은 두 사용자가 동시에
    // 입장해 서로의 대기 티켓을 못 본 레이스 상황을 복구하는 보조 수단일 뿐이므로
    // 자주 실행할 필요가 없다. 호출 1회마다 여러 Firestore 쿼리가 수반되므로
    // 간격을 넉넉히 두어 비용과 부하를 줄인다.
    const timer = setInterval(() => {
      joinQueue({ silent: true })
    }, 25000)
    return () => clearInterval(timer)
  }, [joinQueue, phase])

  useEffect(() => {
    if (!battleId) return undefined
    const unsubscribe = onSnapshot(doc(db, 'quizBattles', battleId), (snap) => {
      if (!snap.exists()) {
        setError('배틀 정보를 찾을 수 없습니다.')
        return
      }
      const raw = snap.data() || {}
      // questionSet에 서버 채점용 correctKeys가 포함되어 있을 수 있다.
      // 클라이언트에는 노출하지 않도록 정제한다.
      const sanitized = {
        ...raw,
        questionSet: Array.isArray(raw.questionSet)
          ? raw.questionSet.map(({ correctKeys: _omit, ...rest }) => rest)
          : raw.questionSet,
      }
      setBattle({ id: snap.id, ...sanitized })
      setPhase(raw.status === 'finished' ? 'result' : 'active')
    }, (err) => {
      setError(err?.message || '배틀 정보를 수신하지 못했습니다.')
    })
    return () => unsubscribe()
  }, [battleId])

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const myParticipant = getParticipant(battle, user?.uid)
  const opponentUid = getOpponentUid(battle, user?.uid)
  const opponentParticipant = getParticipant(battle, opponentUid)
  const questionSet = battle?.questionSet || []
  const answeredCount = Number(myParticipant.answeredCount || 0)
  const currentIndex = Math.min(answeredCount, Math.max(0, questionSet.length - 1))
  const currentQuestion = questionSet[currentIndex]
  // 답안 제출 후 서버가 answeredCount를 올려 currentIndex가 이미 다음 문제를 가리킨다.
  // 정답 공개 단계에서는 직전에 푼 문제를 보여줘야 하므로 별도 계산.
  const revealedIndex = Math.max(0, currentIndex - 1)
  const revealedQuestion = questionSet[revealedIndex]
  const isBattleFinished = battle?.status === 'finished'
  const isBattleCompleteForMe = questionSet.length > 0 && answeredCount >= questionSet.length
  const timeExpired = Number(battle?.endsAtMs || 0) > 0 && timeNow >= Number(battle.endsAtMs)

  const resultSummary = useMemo(() => {
    if (!battle || !user?.uid) return null
    const rewards = battle.rewards || {}
    const winnerUid = battle.winnerUid || ''
    const reward = Number(rewards[user.uid] || 0)
    const outcome = !winnerUid ? 'draw' : (winnerUid === user.uid ? 'win' : 'loss')
    return { reward, outcome }
  }, [battle, user?.uid])

  // 상대가 중도에 포기(이탈)했는지 여부. 결과 화면 안내에 사용한다.
  const opponentForfeited = !!opponentUid && battle?.participants?.[opponentUid]?.forfeited === true
  const myForfeit = !!user?.uid && battle?.participants?.[user.uid]?.forfeited === true

  // 결과 화면에서 틀린 문제를 다시 확인하기 위한 목록.
  const wrongQuestions = useMemo(() => {
    return questionSet.filter((q) => {
      const result = answerResults[q.questionId]
      return result && !result.isCorrect
    })
  }, [questionSet, answerResults])
  const reviewQuestion = wrongQuestions[reviewIndex] || null

  const toggleOption = (key, multiAnswer) => {
    if (isSubmitting || reveal || isBattleCompleteForMe) return
    setSelectedKeys(prev => {
      const next = new Set(multiAnswer ? prev : [])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const submitAnswer = async () => {
    if (!battleId || !currentQuestion || selectedKeys.size === 0 || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const submit = httpsCallable(functions, 'submitBattleAnswer')
      const res = await submit({
        battleId,
        questionId: currentQuestion.questionId,
        selectedOptionKeys: Array.from(selectedKeys),
      })
      const data = res.data || {}
      const selectedSnapshot = new Set(selectedKeys)
      setAnswerResults(prev => ({
        ...prev,
        [currentQuestion.questionId]: {
          ...data,
          selectedKeys: Array.from(selectedSnapshot),
        },
      }))
      setSelectedKeys(new Set())
      // 정답 공개 단계로 전환해 사용자가 결과와 정답을 충분히 확인하게 한다.
      setReveal(true)
      if (data.isCorrect) soundManager.playCorrect()
      else soundManager.playWrong()
    } catch (err) {
      setError(err?.message || '답안을 제출하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const advanceToNext = () => {
    setReveal(false)
  }

  const finalizeBattle = async () => {
    if (!battleId || isFinalizing) return
    setIsFinalizing(true)
    setError('')
    try {
      const finalize = httpsCallable(functions, 'finalizeQuizBattle')
      await finalize({ battleId })
    } catch (err) {
      setError(err?.message || '아직 배틀을 정산할 수 없습니다.')
    } finally {
      setIsFinalizing(false)
    }
  }

  const leaveBattle = async () => {
    if (isLeaving) return
    // 진행 중인 배틀에서 나갈 때는 서버에 포기를 알려 상대방이 즉시 결과를 볼 수 있게 한다.
    if (battleId && phase === 'active' && !isBattleFinished) {
      setIsLeaving(true)
      try {
        const forfeit = httpsCallable(functions, 'forfeitQuizBattle')
        await forfeit({ battleId })
      } catch (err) {
        console.warn('Failed to forfeit quiz battle', err)
      } finally {
        setIsLeaving(false)
      }
    }
    if (phase === 'waiting') await cancelQueue()
    onExit?.()
  }

  const panelStyle = {
    minHeight: '100dvh',
    width: '100%',
    padding: '1.25rem',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 0%, rgba(0, 243, 255, 0.12), transparent 35%), #050a19',
    color: 'var(--text-bright)',
  }

  if (phase === 'idle') {
    return (
      <div className="space-bg" style={panelStyle}>
        <div className="glass-card hud-border" style={{ width: 'min(720px, 100%)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
          <h2 className="font-title" style={{ color: 'var(--star-gold)', marginBottom: '0.75rem' }}>QUIZ BATTLE</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            같은 행성의 배틀 대기룸에 입장합니다.<br />
            매칭되면 공통 학습 범위에서 15문제가 출제됩니다.
          </p>
          <div style={{ color: 'var(--crystal-cyan)', marginBottom: '1.5rem', fontWeight: 800 }}>
            진입 미션: {entryUnitTitle || entryUnitId}
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
              gap: '0.6rem',
              marginBottom: '1.5rem',
            }}
          >
            {[
              ['전적', `${battleStats?.totalMatches || 0}전`],
              ['승', `${battleStats?.wins || 0}`],
              ['패', `${battleStats?.losses || 0}`],
              ['무', `${battleStats?.draws || 0}`],
            ].map(([label, value]) => (
              <div key={label} style={{ padding: '0.7rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</div>
                <div style={{ color: 'var(--text-bright)', fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>
          {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="hud-btn primary glass" onClick={() => joinQueue()} disabled={isJoining} style={{ padding: '0.9rem 1.4rem' }}>
              {isJoining ? '대기룸 접속 중...' : '배틀 대기룸 입장'}
            </button>
            <button className="hud-btn secondary glass" onClick={onSoloQuiz} style={{ padding: '0.9rem 1.4rem' }}>
              혼자 FIELD TEST
            </button>
            <button className="hud-btn secondary glass" onClick={leaveBattle} style={{ padding: '0.9rem 1.4rem' }}>
              돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div className="space-bg" style={panelStyle}>
        <div className="glass-card hud-border" style={{ width: 'min(720px, 100%)', padding: '2rem', textAlign: 'center' }}>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: '3.5rem', marginBottom: '1rem' }}
          >
            🛰️
          </motion.div>
          <h2 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.8rem' }}>배틀 상대 탐색 중</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            같은 행성의 대기룸에 들어온 탐사원을 찾고 있습니다.<br />
            대기 상태는 자동으로 갱신됩니다.
          </p>
          {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="hud-btn secondary glass" onClick={onSoloQuiz} style={{ padding: '0.9rem 1.4rem' }}>
              혼자 FIELD TEST로 전환
            </button>
            <button className="hud-btn secondary glass" onClick={leaveBattle} style={{ padding: '0.9rem 1.4rem' }}>
              대기 취소
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!battle || !currentQuestion) {
    return (
      <div className="space-bg" style={panelStyle}>
        <div style={{ textAlign: 'center', color: 'var(--crystal-cyan)' }}>배틀 데이터를 수신 중...</div>
      </div>
    )
  }

  if (isBattleFinished) {
    if (reviewMode && reviewQuestion) {
      const myResult = answerResults[reviewQuestion.questionId] || {}
      const mySelectedKeys = myResult.selectedKeys || []
      return (
        <div className="space-bg" style={{ ...panelStyle, alignItems: 'stretch', overflowY: 'auto' }}>
          <div style={{ width: 'min(1040px, 100%)', margin: '0 auto', padding: '1rem 0' }}>
            <div className="glass-card hud-border" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
              <div className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
                틀린 문제 확인 {reviewIndex + 1} / {wrongQuestions.length}
              </div>
              {reviewQuestion.imageUrl && (
                <div className="space-image-card-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
                  <div className="space-image-card glass-card">
                    <div className="image-neon-glow"></div>
                    <img
                      src={reviewQuestion.imageUrl}
                      alt="문제"
                      className="space-question-image"
                      style={{ maxHeight: isMobile ? '40vh' : '420px' }}
                    />
                  </div>
                </div>
              )}
              <div style={{ fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '1.2rem' }}>
                <MissionMarkdownViewer text={reviewQuestion.question} />
              </div>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '0.75rem' : '1rem'
              }}>
                {(reviewQuestion.options || []).map(option => {
                  const isMyChoice = mySelectedKeys.includes(option.key)
                  return (
                    <div
                      key={option.key}
                      className="space-option-btn"
                      style={{
                        textAlign: 'left',
                        cursor: 'default',
                        opacity: isMyChoice ? 1 : 0.72,
                        ...(isMyChoice ? {
                          border: '2px solid #f87171',
                          background: 'rgba(248, 113, 113, 0.18)',
                          boxShadow: '0 0 12px rgba(248, 113, 113, 0.25)'
                        } : {}),
                      }}
                    >
                      <MissionMarkdownViewer text={option.text} />
                      {isMyChoice && (
                        <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 900, color: '#f87171' }}>내 선택</span>
                      )}
                    </div>
                  )
                })}
              </div>
              <div
                className="font-tech"
                style={{
                  marginTop: '1rem',
                  padding: '0.8rem 1rem',
                  borderRadius: 8,
                  background: 'rgba(248, 113, 113, 0.12)',
                  color: '#f87171',
                  fontWeight: 900,
                }}
              >
                오답입니다. 다크매터 행성에서 다시 풀어 보세요.
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
                <button className="hud-btn secondary glass" onClick={() => { setReviewMode(false); setReviewIndex(0) }} style={{ padding: '0.8rem 1.2rem' }}>
                  결과로 돌아가기
                </button>
                <div style={{ display: 'flex', gap: '0.8rem', flexWrap: 'wrap' }}>
                  <button
                    className="hud-btn secondary glass"
                    onClick={() => setReviewIndex(Math.max(0, reviewIndex - 1))}
                    disabled={reviewIndex === 0}
                    style={{ padding: '0.8rem 1.2rem' }}
                  >
                    이전
                  </button>
                  {reviewIndex < wrongQuestions.length - 1 ? (
                    <button
                      className="hud-btn primary glass"
                      onClick={() => setReviewIndex(reviewIndex + 1)}
                      style={{ padding: '0.8rem 1.2rem' }}
                    >
                      다음 틀린 문제
                    </button>
                  ) : (
                    <button
                      className="hud-btn primary glass"
                      onClick={() => { setReviewMode(false); setReviewIndex(0) }}
                      style={{ padding: '0.8rem 1.2rem' }}
                    >
                      완료
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-bg" style={panelStyle}>
        <div className="glass-card hud-border" style={{ width: 'min(780px, 100%)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>
            {resultSummary?.outcome === 'win' ? '🏆' : resultSummary?.outcome === 'loss' ? '🛡️' : '🤝'}
          </div>
          <h2 className="font-title" style={{ color: 'var(--star-gold)', marginBottom: '0.5rem' }}>
            {resultSummary?.outcome === 'win' ? '배틀 승리' : resultSummary?.outcome === 'loss' ? '배틀 완료' : '무승부'}
          </h2>
          <div className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '1rem', minHeight: '1.2rem' }}>
            {opponentForfeited
              ? '상대가 배틀을 떠났습니다.'
              : myForfeit
                ? '배틀을 중도에 떠났습니다.'
                : ''}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div className="font-tech" style={{ color: 'var(--text-muted)' }}>나</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--crystal-cyan)' }}>{myParticipant.score || 0}</div>
              <div style={{ color: 'var(--text-muted)' }}>{myParticipant.correctCount || 0} / {battle.questionCount}</div>
            </div>
            <div className="glass-card" style={{ padding: '1rem' }}>
              <div className="font-tech" style={{ color: 'var(--text-muted)' }}>{opponentParticipant.displayName || '상대'}</div>
              <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--star-gold)' }}>{opponentParticipant.score || 0}</div>
              <div style={{ color: 'var(--text-muted)' }}>{opponentParticipant.correctCount || 0} / {battle.questionCount}</div>
            </div>
          </div>
          <div style={{ color: 'var(--crystal-cyan)', fontSize: '1.25rem', fontWeight: 900, marginBottom: '1.5rem' }}>
            +{resultSummary?.reward || 0} 광석
          </div>
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {wrongQuestions.length > 0 && (
              <button className="hud-btn secondary glass" onClick={() => { setReviewMode(true); setReviewIndex(0) }} style={{ padding: '0.9rem 1.4rem' }}>
                틀린 문제 다시 보기 ({wrongQuestions.length})
              </button>
            )}
            <button className="hud-btn primary glass" onClick={leaveBattle} style={{ padding: '0.9rem 1.6rem' }}>
              MISSION CONTROL로 돌아가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-bg" style={{ ...panelStyle, alignItems: 'stretch', overflowY: 'auto' }}>
      <div style={{ width: 'min(1040px, 100%)', margin: '0 auto', padding: '1rem 0' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '0.8rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div className="glass-card" style={{ padding: '0.85rem 1rem' }}>
            <div className="font-tech" style={{ color: 'var(--text-muted)' }}>나</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--crystal-cyan)' }}>{myParticipant.score || 0}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{myParticipant.answeredCount || 0} / {battle.questionCount}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div className="font-title" style={{ color: 'var(--star-gold)', fontSize: '1.15rem' }}>QUIZ BATTLE</div>
            <div className="font-tech" style={{ color: timeExpired ? '#f87171' : 'var(--text-muted)' }}>{formatTimeLeft(battle.endsAtMs)}</div>
          </div>
          <div className="glass-card" style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
            <div className="font-tech" style={{ color: 'var(--text-muted)' }}>{opponentParticipant.displayName || '상대'}</div>
            <div style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--star-gold)' }}>{opponentParticipant.score || 0}</div>
            <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{opponentParticipant.answeredCount || 0} / {battle.questionCount}</div>
          </div>
        </div>

        <div className="glass-card hud-border" style={{ padding: '1.25rem', marginBottom: '1rem' }}>
          <div className="font-tech" style={{ color: 'var(--text-muted)', marginBottom: '0.75rem' }}>
            {reveal
              ? `QUESTION ${Math.min(revealedIndex + 1, battle.questionCount)} / ${battle.questionCount}`
              : `QUESTION ${Math.min(answeredCount + 1, battle.questionCount)} / ${battle.questionCount}`}
          </div>
          {currentQuestion.imageUrl && !reveal && (
            <div className="space-image-card-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="space-image-card glass-card">
                <div className="image-neon-glow"></div>
                <img
                  src={currentQuestion.imageUrl}
                  alt="문제"
                  className="space-question-image"
                  style={{ maxHeight: isMobile ? '40vh' : '420px' }}
                />
              </div>
            </div>
          )}
          {reveal && revealedQuestion?.imageUrl && (
            <div className="space-image-card-wrapper" style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              <div className="space-image-card glass-card">
                <div className="image-neon-glow"></div>
                <img
                  src={revealedQuestion.imageUrl}
                  alt="문제"
                  className="space-question-image"
                  style={{ maxHeight: isMobile ? '40vh' : '420px' }}
                />
              </div>
            </div>
          )}
          <div style={{ fontSize: '1.1rem', lineHeight: 1.7, marginBottom: '1.2rem' }}>
            <MissionMarkdownViewer text={reveal ? (revealedQuestion?.question || '') : currentQuestion.question} />
          </div>
          {!reveal && (
            <>
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
                gap: isMobile ? '0.75rem' : '1rem'
              }}>
                {(currentQuestion.options || []).map(option => {
                  const selected = selectedKeys.has(option.key)
                  return (
                    <button
                      key={option.key}
                      type="button"
                      className="space-option-btn"
                      onClick={() => toggleOption(option.key, currentQuestion.multiAnswer)}
                      disabled={isSubmitting || isBattleCompleteForMe}
                      style={{
                        textAlign: 'left',
                        opacity: isSubmitting ? 0.7 : 1,
                        ...(selected ? {
                          border: '2px solid var(--crystal-cyan)',
                          background: 'rgba(0, 243, 255, 0.15)',
                          boxShadow: '0 0 12px rgba(0, 243, 255, 0.3)'
                        } : {}),
                      }}
                    >
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {currentQuestion.multiAnswer && (
                          <span style={{ fontSize: '1.1rem' }}>{selected ? '☑' : '☐'}</span>
                        )}
                        <MissionMarkdownViewer text={option.text} />
                      </span>
                    </button>
                  )
                })}
              </div>
              {currentQuestion.multiAnswer && (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '0.75rem' }}>
                  복수 정답 문제입니다. 해당하는 답을 모두 선택하세요.
                </div>
              )}
            </>
          )}
          {reveal && revealedQuestion && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
              gap: isMobile ? '0.75rem' : '1rem'
            }}>
              {(revealedQuestion.options || []).map(option => {
                const myResult = answerResults[revealedQuestion.questionId] || {}
                const selectedKeysList = myResult.selectedKeys || []
                const isMyChoice = selectedKeysList.includes(option.key)
                const isCorrect = answerResults[revealedQuestion.questionId]?.isCorrect
                return (
                  <div
                    key={option.key}
                    className="space-option-btn"
                    style={{
                      textAlign: 'left',
                      cursor: 'default',
                      opacity: isMyChoice ? 1 : 0.72,
                      ...(isMyChoice ? {
                        border: '2px solid rgba(0, 243, 255, 0.55)',
                        background: 'linear-gradient(135deg, rgba(0,243,255,0.16), rgba(96,165,250,0.1))',
                        boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'
                      } : {}),
                    }}
                  >
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      {isMyChoice && <span style={{ fontSize: '1.1rem' }}>☑</span>}
                      <MissionMarkdownViewer text={option.text} />
                    </span>
                    {isMyChoice && (
                      <span style={{ marginLeft: '0.5rem', fontSize: '0.8rem', fontWeight: 900, color: 'var(--crystal-cyan)' }}>내 선택</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}
          {reveal && (
            <div
              className="font-tech"
              style={{
                marginTop: '1rem',
                padding: '0.8rem 1rem',
                borderRadius: 8,
                background: answerResults[revealedQuestion?.questionId]?.isCorrect
                  ? 'rgba(74, 222, 128, 0.12)'
                  : 'rgba(248, 113, 113, 0.12)',
                color: answerResults[revealedQuestion?.questionId]?.isCorrect ? 'var(--planet-green)' : '#f87171',
                fontWeight: 900,
                fontSize: '1.05rem',
              }}
            >
              {answerResults[revealedQuestion?.questionId]?.isCorrect ? '정답입니다!' : '아쉽지만 오답입니다.'}
              {!answerResults[revealedQuestion?.questionId]?.isCorrect && (
                <span style={{ display: 'block', marginTop: '0.4rem', fontWeight: 600, fontSize: '0.9rem' }}>
                  이 문제는 다크매터 행성에 등록됩니다. 다음 문제로 넘어가세요.
                </span>
              )}
            </div>
          )}
          {error && <div style={{ color: '#f87171', marginTop: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.8rem', marginTop: '1.2rem', flexWrap: 'wrap' }}>
            <button className="hud-btn secondary glass" onClick={leaveBattle} disabled={isLeaving} style={{ padding: '0.8rem 1.2rem' }}>
              {isLeaving ? '정산 중...' : '나가기'}
            </button>
            {reveal ? (
              <button className="hud-btn primary glass" onClick={advanceToNext} style={{ padding: '0.8rem 1.2rem' }}>
                다음 문제
              </button>
            ) : isBattleCompleteForMe || timeExpired ? (
              <button className="hud-btn primary glass" onClick={finalizeBattle} disabled={isFinalizing} style={{ padding: '0.8rem 1.2rem' }}>
                {isFinalizing ? '정산 중...' : '결과 확인'}
              </button>
            ) : (
              <button className="hud-btn primary glass" onClick={submitAnswer} disabled={selectedKeys.size === 0 || isSubmitting} style={{ padding: '0.8rem 1.2rem' }}>
                {isSubmitting ? '전송 중...' : '답안 제출'}
              </button>
            )}
          </div>
        </div>

        {isBattleCompleteForMe && !isBattleFinished && (
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            내 답안 제출이 끝났습니다. 상대 제출이 끝나면 결과가 확정됩니다.
          </div>
        )}
      </div>
    </div>
  )
}
