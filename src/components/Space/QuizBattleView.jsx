import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { doc, getDoc, onSnapshot, setDoc, deleteField, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { db, functions } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { calculateBattleData } from '../../utils/rankingUtils'
import MissionMarkdownViewer from './MissionMarkdownViewer'
import soundManager from '../../utils/SoundManager'

const QUESTION_COUNT = 15
const MotionDiv = motion.div
const BATTLE_SCOPE_UNIT = 'unit'
const BATTLE_SCOPE_CUMULATIVE = 'cumulative'
const BATTLE_SCOPE_LABELS = {
  [BATTLE_SCOPE_UNIT]: '현재 유닛만',
  [BATTLE_SCOPE_CUMULATIVE]: '이전 과정 전체',
}
const BATTLE_FEEDBACK_VOLUME_MULTIPLIER = 1.75

const getBattleChallengeError = (error, fallback) => {
  const message = String(error?.message || '').trim()
  if (!message || message.toLowerCase() === 'internal' || /functions\/(internal|not-found)/i.test(String(error?.code || ''))) {
    return fallback
  }
  return message
}

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

const enterBattleFocusMode = () => {
  if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
    document.documentElement.requestFullscreen().catch(() => {})
  }
}

export default function QuizBattleView({
  clusterId,
  regionId,
  entryUnitId,
  entryUnitTitle,
  initialBattleScope = BATTLE_SCOPE_CUMULATIVE,
  opponentMode = 'pvp',
  rangeLabel = '',
  initialBattleId = '',
  onExit,
  onSoloQuiz,
}) {
  const { user, userData } = useAuth()
  const [phase, setPhase] = useState('idle')
  const [ticketId, setTicketId] = useState('')
  const [battleId, setBattleId] = useState('')
  const [battle, setBattle] = useState(null)
  const [battleContent, setBattleContent] = useState(null)
  const [battleRuntime, setBattleRuntime] = useState(null)
  const [selectedKeys, setSelectedKeys] = useState(new Set())
  const [answerResults, setAnswerResults] = useState({})
  const [battleStats, setBattleStats] = useState(null)
  const [battleScope, setBattleScope] = useState(initialBattleScope)
  const [queueTickets, setQueueTickets] = useState([])
  const [isLoadingQueue, setIsLoadingQueue] = useState(false)
  const [queueListExpanded, setQueueListExpanded] = useState(false)
  const [onlineOpponents, setOnlineOpponents] = useState([])
  const [isLoadingOnline, setIsLoadingOnline] = useState(false)
  const [onlineListExpanded, setOnlineListExpanded] = useState(false)
  const [outgoingChallenge, setOutgoingChallenge] = useState(null)
  const [challengingUid, setChallengingUid] = useState('')
  const [challengeNotice, setChallengeNotice] = useState('')
  const [isJoining, setIsJoining] = useState(false)
  const [joiningMode, setJoiningMode] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)
  const [error, setError] = useState('')
  const [integrityNotice, setIntegrityNotice] = useState('')
  const [resultDismissEnabled, setResultDismissEnabled] = useState(false)
  const [timeNow, setTimeNow] = useState(Date.now())
  const [reveal, setReveal] = useState(false) // 답안 제출 후 정답 공개 단계
  const [reviewMode, setReviewMode] = useState(false) // 결과 화면에서 틀린 문제 복습
  const [reviewIndex, setReviewIndex] = useState(0)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const activeTicketRef = useRef('')
  const matchedRef = useRef(false)
  const autoFinalizeBattleRef = useRef('')
  const cancelQueueRef = useRef(null)
  const confirmedBattleEntryRef = useRef('')
  const entryConfirmTimeoutRef = useRef('')
  const aiAdvanceTimerRef = useRef(null)
  const aiAdvanceInFlightRef = useRef(false)
  const lastIntegrityReportRef = useRef(0)
  const resultLockedRef = useRef(false)
  const isAIMode = opponentMode === 'ai'
  const isScopeLocked = Boolean(rangeLabel)
  const aiTrainingData = useMemo(() => calculateBattleData(userData || {}), [userData])

  useEffect(() => {
    if (!initialBattleId || battleId) return
    matchedRef.current = true
    setBattleId(initialBattleId)
    setPhase('active')
    enterBattleFocusMode()
  }, [battleId, initialBattleId])

  useEffect(() => {
    if (phase === 'idle') setBattleScope(initialBattleScope)
  }, [initialBattleScope, phase])

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

  useEffect(() => {
    if (!user?.uid || isAIMode) return undefined
    // 새로고침 뒤에도 보낸 도전의 잠금 상태를 복원한다. accepted가 되면
    // 고정 도전 문서 응답을 기다리지 않고 같은 배틀로 즉시 진입한다.
    return onSnapshot(doc(db, 'quizBattleChallengeLocks', user.uid), (snap) => {
      const lock = snap.exists() ? snap.data() : null
      if (!lock?.requestId) return
      if (['pending', 'accepting'].includes(lock.status)) {
        const deadlineMs = lock.status === 'accepting'
          ? Number(lock.acceptingLeaseExpiresAtMs || 0)
          : Number(lock.expiresAtMs || 0)
        if (deadlineMs > Date.now()) {
          setOutgoingChallenge((current) => ({
            challengeId: lock.challengeDocId || lock.recipientId || current?.challengeId,
            requestId: lock.requestId,
            recipientName: lock.recipientName || current?.recipientName || '탐사원',
            expiresAtMs: deadlineMs,
          }))
        }
      } else if (lock.status !== 'accepted') {
        setOutgoingChallenge((current) => current?.requestId === lock.requestId ? null : current)
      }
    }, (err) => {
      console.warn('Failed to restore outgoing battle challenge', err)
    })
  }, [isAIMode, user?.uid])

  const loadOnlineOpponents = useCallback(async ({ silent = false } = {}) => {
    if (isAIMode || !user?.uid || !clusterId || !regionId || !entryUnitId) return
    if (!silent) setIsLoadingOnline(true)
    try {
      const listOnline = httpsCallable(functions, 'listQuizBattleOnlineOpponents')
      const res = await listOnline({ clusterId, regionId, entryUnitId })
      setOnlineOpponents(Array.isArray(res.data?.opponents) ? res.data.opponents : [])
    } catch (err) {
      if (!silent) setError(getBattleChallengeError(err, '온라인 탐사원 목록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
    } finally {
      if (!silent) setIsLoadingOnline(false)
    }
  }, [clusterId, entryUnitId, isAIMode, regionId, user?.uid])

  const loadQueueTickets = useCallback(async ({ silent = false } = {}) => {
    if (isAIMode || !user?.uid || !clusterId || !regionId || !entryUnitId) return
    if (!silent) setIsLoadingQueue(true)
    try {
      const listQueue = httpsCallable(functions, 'listQuizBattleQueue')
      const res = await listQueue({ clusterId, regionId, entryUnitId })
      setQueueTickets(Array.isArray(res.data?.tickets) ? res.data.tickets : [])
    } catch (err) {
      if (!silent) setError(getBattleChallengeError(err, '배틀 대기룸을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'))
    } finally {
      if (!silent) setIsLoadingQueue(false)
    }
  }, [clusterId, entryUnitId, isAIMode, regionId, user?.uid])

  useEffect(() => {
    if (phase !== 'idle' || isAIMode) return undefined
    loadOnlineOpponents()
    loadQueueTickets()
    const onlineTimer = setInterval(() => loadOnlineOpponents({ silent: true }), 30000)
    const queueTimer = setInterval(() => loadQueueTickets({ silent: true }), 15000)
    return () => {
      clearInterval(onlineTimer)
      clearInterval(queueTimer)
    }
  }, [isAIMode, loadOnlineOpponents, loadQueueTickets, phase])

  const sendChallenge = useCallback(async (opponent) => {
    if (!opponent?.uid || challengingUid || outgoingChallenge || isJoining) return
    setChallengingUid(opponent.uid)
    setError('')
    setChallengeNotice('')
    try {
      const createChallenge = httpsCallable(functions, 'createQuizBattleChallenge')
      const res = await createChallenge({
        targetUid: opponent.uid,
        clusterId,
        regionId,
        entryUnitId,
        battleScope,
        rangeLabel: rangeLabel || entryUnitTitle || '선택한 퀴즈 범위',
        questionCount: QUESTION_COUNT,
      })
      setOutgoingChallenge({
        challengeId: res.data?.challengeId || opponent.uid,
        requestId: res.data?.requestId,
        recipientName: res.data?.recipientName || opponent.displayName || '탐사원',
        expiresAtMs: Number(res.data?.expiresAtMs || (Date.now() + 75000)),
      })
      soundManager.playClick()
    } catch (err) {
      setError(getBattleChallengeError(err, '도전장을 보내지 못했습니다. 잠시 후 다시 시도해 주세요.'))
      loadOnlineOpponents({ silent: true })
    } finally {
      setChallengingUid('')
    }
  }, [battleScope, challengingUid, clusterId, entryUnitId, entryUnitTitle, isJoining, loadOnlineOpponents, outgoingChallenge, rangeLabel, regionId])

  const cancelOutgoingChallenge = useCallback(async ({ silent = false } = {}) => {
    const active = outgoingChallenge
    if (!active?.requestId) return
    let shouldClear = false
    try {
      const cancelChallenge = httpsCallable(functions, 'cancelQuizBattleChallenge')
      const result = await cancelChallenge({ requestId: active.requestId })
      const status = result.data?.status
      shouldClear = !['accepting', 'accepted', 'active'].includes(status)
      if (!silent) {
        setChallengeNotice(shouldClear
          ? (status === 'cancelled' ? '도전장을 회수했습니다.' : '도전장이 종료되었습니다.')
          : '상대방이 이미 도전을 수락하고 있어 배틀 연결을 계속합니다.')
      }
    } catch (err) {
      if (!silent) setError(getBattleChallengeError(err, '도전장을 회수하지 못했습니다. 잠시 후 다시 시도해 주세요.'))
    } finally {
      if (shouldClear) setOutgoingChallenge(null)
    }
  }, [outgoingChallenge])

  useEffect(() => {
    if (!outgoingChallenge?.challengeId || !outgoingChallenge?.requestId) return undefined
    const activeRequestId = outgoingChallenge.requestId
    return onSnapshot(doc(db, 'quizBattleChallenges', outgoingChallenge.challengeId), (snap) => {
      if (!snap.exists()) return
      const data = snap.data() || {}
      if (data.requestId !== activeRequestId) return
      if (data.status === 'accepted' && data.battleId) {
        matchedRef.current = true
        setBattleId(data.battleId)
        setOutgoingChallenge(null)
        setPhase('active')
        enterBattleFocusMode()
        soundManager.playCrystal()
      } else if (data.status === 'declined') {
        setOutgoingChallenge(null)
        setChallengeNotice(`${data.recipientName || '상대 탐사원'}님이 이번 도전을 정중히 거절했습니다.`)
        loadOnlineOpponents({ silent: true })
      } else if (data.status === 'cancelled') {
        setOutgoingChallenge(null)
      }
    }, (err) => {
      console.warn('Failed to listen to outgoing battle challenge', err)
      setOutgoingChallenge(null)
    })
  }, [loadOnlineOpponents, outgoingChallenge?.challengeId, outgoingChallenge?.requestId])

  useEffect(() => {
    if (!outgoingChallenge?.expiresAtMs || timeNow < outgoingChallenge.expiresAtMs) return
    setChallengeNotice(`${outgoingChallenge.recipientName || '상대 탐사원'}님이 응답하지 않아 도전장이 종료되었습니다.`)
    setOutgoingChallenge(null)
    loadOnlineOpponents({ silent: true })
  }, [loadOnlineOpponents, outgoingChallenge, timeNow])

  const startAIBattle = useCallback(async () => {
    if (!user?.uid || !clusterId || !regionId || !entryUnitId || isJoining) return
    enterBattleFocusMode()
    setIsJoining(true)
    setJoiningMode('ai')
    setError('')
    try {
      const start = httpsCallable(functions, 'startAIQuizBattle')
      const res = await start({ clusterId, regionId, entryUnitId, battleScope, questionCount: QUESTION_COUNT })
      if (!res.data?.battleId) throw new Error('AI 배틀 좌표를 생성하지 못했습니다.')
      matchedRef.current = true
      setBattleId(res.data.battleId)
      setPhase('active')
      soundManager.playCrystal()
    } catch (err) {
      setError(err?.message || 'AI 배틀을 시작하지 못했습니다.')
    } finally {
      setIsJoining(false)
      setJoiningMode('')
    }
  }, [battleScope, clusterId, entryUnitId, isJoining, regionId, user?.uid])

  const joinQueue = useCallback(async ({ silent = false, targetTicketId = '' } = {}) => {
    if (!user?.uid || !clusterId || !regionId || !entryUnitId || isJoining) return
    if (!silent) enterBattleFocusMode()
    setIsJoining(true)
    setJoiningMode(targetTicketId ? 'direct' : 'queue')
    if (!silent && !targetTicketId) {
      setError('')
    } else if (!silent) {
      setError('')
    }

    try {
      const join = httpsCallable(functions, 'joinQuizBattleQueue')
      const res = await join({
        clusterId,
        regionId,
        entryUnitId,
        battleScope,
        targetTicketId,
        ticketId: activeTicketRef.current || ticketId,
        questionCount: QUESTION_COUNT,
      })
      const data = res.data || {}
      if (data.status === 'matched' && data.battleId) {
        matchedRef.current = true
        setBattleId(data.battleId)
        setQueueTickets([])
        setOnlineOpponents([])
        setPhase('active')
        soundManager.playCrystal()
      } else {
        matchedRef.current = false
        activeTicketRef.current = data.ticketId || activeTicketRef.current || ticketId
        setTicketId(activeTicketRef.current)
        setPhase('waiting')
      }
    } catch (err) {
      setError(err?.message || '배틀 대기룸에 입장하지 못했습니다.')
      setPhase('idle')
      if (targetTicketId) {
        loadQueueTickets({ silent: true })
        loadOnlineOpponents({ silent: true })
      }
    } finally {
      setIsJoining(false)
      setJoiningMode('')
    }
  }, [battleScope, clusterId, entryUnitId, isJoining, loadOnlineOpponents, loadQueueTickets, regionId, ticketId, user?.uid])

  const cancelQueue = useCallback(async ({ allowMatched = false, throwOnError = false } = {}) => {
    if (!regionId || (!allowMatched && matchedRef.current)) return null
    try {
      const cancel = httpsCallable(functions, 'cancelQuizBattleQueue')
      const res = await cancel({ regionId, ticketId: activeTicketRef.current || ticketId })
      return res.data || null
    } catch (err) {
      console.warn('Failed to cancel quiz battle queue', err)
      if (throwOnError) throw err
      return null
    }
  }, [regionId, ticketId])

  useEffect(() => {
    cancelQueueRef.current = cancelQueue
  }, [cancelQueue])

  useEffect(() => () => {
    cancelQueueRef.current?.()
  }, [])

  useEffect(() => {
    if (phase !== 'waiting' || !ticketId) return undefined
    const unsubscribe = onSnapshot(doc(db, 'quizBattleQueueTickets', ticketId), async (snap) => {
      if (!snap.exists()) return
      const data = snap.data()
      if (data.status === 'matched' && data.matchId) {
        // stale 방어: 티켓이 종료된 과거 배틀을 가리키면 무시하고 대기를 유지한다.
        // 서버가 티켓을 갱신하기 전 순간에 과거 matched 상태를 잡는 레이스를 막는다.
        try {
          const stateSnap = await getDoc(doc(db, 'quizBattleStates', data.matchId))
          const battleSnap = stateSnap.exists()
            ? stateSnap
            : await getDoc(doc(db, 'quizBattles', data.matchId))
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
    resultLockedRef.current = false
    setBattleContent(null)
    setBattleRuntime(null)
  }, [battleId])

  useEffect(() => {
    if (!battleId) return undefined
    const unsubscribeContent = onSnapshot(doc(db, 'quizBattles', battleId), (snap) => {
      if (!snap.exists()) {
        if (resultLockedRef.current) return
        setError('배틀 정보를 찾을 수 없습니다.')
        return
      }
      const raw = snap.data() || {}
      const sanitized = {
        ...raw,
        questionSet: Array.isArray(raw.questionSet)
          ? raw.questionSet.map((question) => {
            const sanitizedQuestion = { ...question }
            delete sanitizedQuestion.correctKeys
            return sanitizedQuestion
          })
          : raw.questionSet,
      }
      setBattleContent({ id: snap.id, ...sanitized })
    }, (err) => {
      setError(err?.message || '배틀 문제를 수신하지 못했습니다.')
    })
    const unsubscribeRuntime = onSnapshot(doc(db, 'quizBattleStates', battleId), (snap) => {
      setBattleRuntime(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    }, (err) => {
      setError(err?.message || '배틀 진행 상태를 수신하지 못했습니다.')
    })
    return () => {
      unsubscribeContent()
      unsubscribeRuntime()
    }
  }, [battleId])

  useEffect(() => {
    if (!battleContent) return
    const merged = battleRuntime
      ? { ...battleContent, ...battleRuntime, questionSet: battleContent.questionSet || [] }
      : battleContent
    if (!merged.status) return
    // 기존 진행 중 배틀은 공개 문서 하나만 사용하고, 신규 배틀은 작은 상태
    // 문서를 병합한다. 결과에 도달한 뒤에는 파생 동기화 스냅샷이 화면을 되돌리지 못한다.
    if (resultLockedRef.current && !['resolving', 'finished'].includes(merged.status)) return
    setBattle(merged)
    if (['resolving', 'finished'].includes(merged.status)) {
      resultLockedRef.current = true
      setPhase('result')
    } else {
      setPhase(merged.status === 'cancelled' ? 'cancelled' : 'active')
    }
  }, [battleContent, battleRuntime])

  // 배틀 진행 상태를 users/{uid}.liveStatus.battle 서브맵에 기록한다.
  // usePresence가 currentLocation/lastUpdatedAt을 주기적으로 덮어써도 battle 맵은
  // 별도 키이므로 유지되며, 운영툴(LiveStatus)과 스터디룸에서 현재 배틀 단계를 볼 수 있다.
  // 상태 업데이트 effect는 cleanup을 반환하지 않는다: 의존성 변경마다 cleanup delete가
  // 새 set보다 늦게 도착해 실제 배틀 중인데 상태가 지워지는 race를 막기 위해서다.
  // 언마운트 정리는 아래 별도 effect가 담당한다.
  const liveOpponentUid = getOpponentUid(battle, user?.uid || '')
  const liveOpponentDisplayName = battle?.participants?.[liveOpponentUid]?.displayName || ''
  const liveMyAnsweredCount = Number(getParticipant(battle, user?.uid || '').answeredCount || 0)
  useEffect(() => {
    const uid = user?.uid
    if (!uid) return
    const mapPhaseToStatus = (p) => {
      if (p === 'waiting') return 'waiting'
      if (p === 'active') {
        // battle.status가 starting이면 아직 입장 확인 단계다.
        if (battle?.status === 'starting') return 'starting'
        return 'active'
      }
      if (p === 'result') return 'result'
      return null
    }
    const status = mapPhaseToStatus(phase)
    if (status) {
      const battlePayload = {
        phase: status,
        battleId: battleId || '',
        answeredCount: liveMyAnsweredCount,
        totalCount: Number(battle?.questionCount || 0),
        updatedAt: serverTimestamp(),
      }
      // 닉네임이 없으면 키 자체를 생략해 undefined가 노출되지 않게 한다.
      if (liveOpponentDisplayName) battlePayload.opponentDisplayName = liveOpponentDisplayName
      setDoc(doc(db, 'users', uid), { liveStatus: { battle: battlePayload } }, { merge: true }).catch(() => {})
    } else {
      // idle/cancelled는 즉시 battle 맵을 제거한다. (언마운트가 아닌 phase 전환)
      setDoc(doc(db, 'users', uid), { liveStatus: { battle: deleteField() } }, { merge: true }).catch(() => {})
    }
  }, [user?.uid, phase, battleId, battle?.status, battle?.questionCount, liveOpponentDisplayName, liveMyAnsweredCount])

  // 언마운트 전용 정리: 컴포넌트가 내려갈 때만 liveStatus.battle을 제거한다.
  // 빈 의존성 배열이므로 상태 업데이트 effect와 경쟁하지 않는다.
  useEffect(() => {
    const uid = user?.uid
    if (!uid) return undefined
    return () => {
      setDoc(doc(db, 'users', uid), { liveStatus: { battle: deleteField() } }, { merge: true }).catch(() => {})
    }
  }, [user?.uid])

  useEffect(() => {
    if (!battleId || !battle || !user?.uid || battle.status !== 'starting') return undefined
    if (confirmedBattleEntryRef.current === battleId) return undefined

    let cancelled = false
    confirmedBattleEntryRef.current = battleId
    const confirmEntry = async () => {
      try {
        const confirm = httpsCallable(functions, 'confirmQuizBattleEntry')
        await confirm({ battleId })
      } catch (err) {
        console.warn('Failed to confirm quiz battle entry', err)
        if (!cancelled) {
          confirmedBattleEntryRef.current = ''
          setError(err?.message || '배틀 입장을 확인하지 못했습니다. 다시 시도해 주세요.')
        }
      }
    }

    confirmEntry()
    return () => {
      cancelled = true
    }
  }, [battle, battleId, user?.uid])

  useEffect(() => {
    const deadlineMs = Number(battle?.entryConfirmDeadlineMs || 0)
    if (!battleId || !battle || battle.status !== 'starting' || !deadlineMs || timeNow < deadlineMs) return
    if (entryConfirmTimeoutRef.current === battleId) return

    entryConfirmTimeoutRef.current = battleId
    const resolveTimeout = async () => {
      try {
        const confirm = httpsCallable(functions, 'confirmQuizBattleEntry')
        await confirm({ battleId })
      } catch (err) {
        console.warn('Failed to resolve quiz battle entry timeout', err)
      }
    }

    resolveTimeout()
  }, [battle, battleId, timeNow])

  useEffect(() => {
    const timer = setInterval(() => setTimeNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const myParticipant = getParticipant(battle, user?.uid)
  const opponentUid = getOpponentUid(battle, user?.uid)
  const opponentParticipant = getParticipant(battle, opponentUid)
  const questionSet = useMemo(() => battle?.questionSet || [], [battle?.questionSet])
  const answeredCount = Number(myParticipant.answeredCount || 0)
  const currentIndex = Math.min(answeredCount, Math.max(0, questionSet.length - 1))
  const currentQuestion = questionSet[currentIndex]
  // 답안 제출 후 서버가 answeredCount를 올려 currentIndex가 이미 다음 문제를 가리킨다.
  // 정답 공개 단계에서는 직전에 푼 문제를 보여줘야 하므로 별도 계산.
  const revealedIndex = Math.max(0, currentIndex - 1)
  const revealedQuestion = questionSet[revealedIndex]
  const isBattleSettled = battle?.status === 'finished'
  const isBattleFinished = ['resolving', 'finished'].includes(battle?.status)
  const isBattleStarting = battle?.status === 'starting'
  const isBattleCancelled = battle?.status === 'cancelled'
  const isBattleCompleteForMe = questionSet.length > 0 && answeredCount >= questionSet.length
  const isOpponentComplete = questionSet.length > 0 && Number(opponentParticipant.answeredCount || 0) >= questionSet.length
  const timeExpired = Number(battle?.endsAtMs || 0) > 0 && timeNow >= Number(battle.endsAtMs)
  const aiAnsweredCount = Number(opponentParticipant.answeredCount || 0)

  useEffect(() => {
    if (
      !battleId
      || battle?.isAI !== true
      || battle?.status !== 'active'
      || questionSet.length === 0
      || aiAnsweredCount >= answeredCount
    ) return undefined

    // 이용자가 빠르게 다음 문제로 넘어가도 기존 AI 진행을 버리지 않는다.
    // 스냅샷의 격차를 기준으로 NOVA가 사전 계획된 답을 한 문항씩 따라온다.
    const userFinished = answeredCount >= questionSet.length
    const delay = (userFinished ? 1100 : 650) + Math.floor(Math.random() * 700)
    aiAdvanceTimerRef.current = window.setTimeout(async () => {
      if (aiAdvanceInFlightRef.current) return
      aiAdvanceInFlightRef.current = true
      try {
        const advanceAI = httpsCallable(functions, 'advanceAIQuizBattle')
        await advanceAI({ battleId, schemaVersion: Number(battle?.schemaVersion || 0) })
      } catch (err) {
        console.warn('AI progress update failed', err)
      } finally {
        aiAdvanceInFlightRef.current = false
      }
    }, delay)

    return () => {
      if (aiAdvanceTimerRef.current) window.clearTimeout(aiAdvanceTimerRef.current)
      aiAdvanceTimerRef.current = null
    }
  }, [aiAnsweredCount, answeredCount, battle?.isAI, battle?.schemaVersion, battle?.status, battleId, questionSet.length])

  useEffect(() => {
    if (!isBattleSettled) {
      setResultDismissEnabled(false)
      return undefined
    }

    // 패배 결과에는 오답 복습 버튼이 추가되어, 직전 화면의 오른쪽 액션 버튼과
    // 'MISSION CONTROL로 돌아가기'가 같은 위치에 놓인다. 정산 중 연속 클릭/탭이
    // 새 버튼으로 넘어가는 click-through를 막기 위해 결과 액션을 잠시 잠근다.
    setResultDismissEnabled(false)
    const timer = window.setTimeout(() => setResultDismissEnabled(true), 1600)
    return () => window.clearTimeout(timer)
  }, [battleId, isBattleSettled])

  useEffect(() => {
    if (!battleId || battle?.status !== 'active' || isBattleFinished) return undefined

    let blurTimer = null
    const reportIntegrityEvent = async (eventType) => {
      const now = Date.now()
      if (now - lastIntegrityReportRef.current < 4000) return
      lastIntegrityReportRef.current = now
      try {
        const report = httpsCallable(functions, 'reportQuizBattleIntegrityEvent')
        const res = await report({ battleId, eventType })
        const count = Number(res.data?.violationCount || 0)
        if (res.data?.forfeited) {
          setIntegrityNotice('집중 화면 이탈이 반복되어 이번 배틀이 종료되었습니다.')
        } else if (count > 0) {
          setIntegrityNotice(`집중 화면 이탈이 감지되었습니다. 반복 시 배틀이 종료됩니다. (${count}/3)`)
        }
      } catch (err) {
        console.warn('Battle integrity event report failed', err)
      }
    }
    const handleVisibility = () => {
      if (document.hidden) reportIntegrityEvent('visibility_hidden')
    }
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) reportIntegrityEvent('fullscreen_exit')
    }
    const handleBlur = () => {
      blurTimer = window.setTimeout(() => {
        if (!document.hasFocus()) reportIntegrityEvent('window_blur')
      }, 1500)
    }
    const handleFocus = () => {
      if (blurTimer) window.clearTimeout(blurTimer)
    }
    const handleBeforeUnload = (event) => {
      event.preventDefault()
      event.returnValue = ''
    }

    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('fullscreenchange', handleFullscreenChange)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      if (blurTimer) window.clearTimeout(blurTimer)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('fullscreenchange', handleFullscreenChange)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [battle?.status, battleId, isBattleFinished])

  useEffect(() => {
    if (!battleId || !user?.uid || questionSet.length === 0) return undefined

    let cancelled = false
    const loadMyAnswers = async () => {
      try {
        const answerSnaps = await Promise.all(
          questionSet.map((question) => (
            getDoc(doc(db, 'quizBattles', battleId, 'answers', `${user.uid}_${question.questionId}`))
              .catch(() => null)
          ))
        )
        if (cancelled) return

        const restored = {}
        answerSnaps.forEach((snap, index) => {
          if (!snap?.exists?.()) return
          const data = snap.data() || {}
          const questionId = data.questionId || questionSet[index]?.questionId
          if (!questionId) return
          restored[questionId] = {
            ...data,
            selectedKeys: Array.isArray(data.selectedOptionKeys) ? data.selectedOptionKeys : [],
          }
        })

        if (Object.keys(restored).length > 0) {
          setAnswerResults(prev => ({ ...prev, ...restored }))
        }
      } catch (err) {
        console.warn('Failed to restore battle answers', err)
      }
    }

    loadMyAnswers()
    return () => {
      cancelled = true
    }
  }, [battleId, questionSet, user?.uid])

  const resultSummary = useMemo(() => {
    if (!battle || !user?.uid) return null
    const rewards = battle.rewards || {}
    const winnerUid = battle.winnerUid || ''
    const reward = Number(rewards[user.uid] || 0)
    const outcome = !winnerUid ? 'draw' : (winnerUid === user.uid ? 'win' : 'loss')
    return { reward, outcome, rewardPolicy: battle.rewardPolicies?.[user.uid] || null }
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
    if (battle?.status !== 'active' || isSubmitting || reveal || isBattleCompleteForMe) return
    setSelectedKeys(prev => {
      const next = new Set(multiAnswer ? prev : [])
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const submitAnswer = async () => {
    if (battle?.status !== 'active' || !battleId || !currentQuestion || selectedKeys.size === 0 || isSubmitting) return
    setIsSubmitting(true)
    setError('')
    try {
      const submit = httpsCallable(functions, 'submitBattleAnswer')
      const res = await submit({
        battleId,
        schemaVersion: Number(battle?.schemaVersion || 0),
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
      // React가 채점 결과를 먼저 그린 뒤 효과음을 재생한다. 오디오 디코딩/재생이
      // 느린 기기에서도 결과 표시가 소리에 막히지 않는다.
      window.requestAnimationFrame(() => {
        if (data.isCorrect) soundManager.playCorrect(BATTLE_FEEDBACK_VOLUME_MULTIPLIER)
        else soundManager.playWrong(BATTLE_FEEDBACK_VOLUME_MULTIPLIER)
      })
    } catch (err) {
      setError(err?.message || '답안을 제출하지 못했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const advanceToNext = () => {
    setReveal(false)
  }

  useEffect(() => () => {
    if (aiAdvanceTimerRef.current) clearTimeout(aiAdvanceTimerRef.current)
  }, [])

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

  useEffect(() => {
    if (!battleId || !battle || battle.status !== 'active' || isBattleFinished || !timeExpired) return
    if (autoFinalizeBattleRef.current === battleId) return

    let cancelled = false
    autoFinalizeBattleRef.current = battleId
    setIsFinalizing(true)
    setError('')

    const run = async () => {
      try {
        const finalize = httpsCallable(functions, 'finalizeQuizBattle')
        await finalize({ battleId })
      } catch (err) {
        console.warn('Auto finalize quiz battle failed', err)
        if (!cancelled) {
          autoFinalizeBattleRef.current = ''
          setError(err?.message || '제한 시간이 종료되었지만 배틀 정산에 실패했습니다. 다시 시도해 주세요.')
        }
      } finally {
        if (!cancelled) setIsFinalizing(false)
      }
    }

    run()
    return () => {
      cancelled = true
    }
  }, [battle, battleId, isBattleFinished, timeExpired])

  const handleSoloQuiz = async () => {
    if (isLeaving) return
    if (phase !== 'waiting') {
      if (outgoingChallenge) await cancelOutgoingChallenge({ silent: true })
      onSoloQuiz?.()
      return
    }

    setIsLeaving(true)
    setError('')
    try {
      await cancelQueue({ allowMatched: true, throwOnError: true })
      matchedRef.current = false
      setTicketId('')
      activeTicketRef.current = ''
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {})
      }
      onSoloQuiz?.()
    } catch (err) {
      setError(err?.message || '대기 취소를 확인하지 못했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setIsLeaving(false)
    }
  }

  const leaveBattle = async () => {
    if (isLeaving) return
    // 진행 중 '나가기'는 서버에 포기를 알리고 결과 화면에 머문다.
    // forfeit 요청을 기다리는 동안 onSnapshot이 먼저 finished 결과를 보여줄 수 있다.
    // 여기서 이어서 onExit까지 실행하면 결과가 잠시 보인 뒤 자동으로 닫히므로,
    // 포기 정산이 끝난 뒤 반드시 return하고 결과 화면의 명시적 버튼만 종료를 담당한다.
    if (battleId && phase === 'active' && !isBattleFinished) {
      setIsLeaving(true)
      setError('')
      try {
        const forfeit = httpsCallable(functions, 'forfeitQuizBattle')
        await forfeit({ battleId })
      } catch (err) {
        console.warn('Failed to forfeit quiz battle', err)
        setError(err?.message || '배틀 포기 정산에 실패했습니다. 다시 시도해 주세요.')
      } finally {
        setIsLeaving(false)
      }
      return
    }
    if (phase === 'waiting') await cancelQueue()
    if (outgoingChallenge) await cancelOutgoingChallenge({ silent: true })
    if (document.fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {})
    }
    onExit?.()
  }

  const panelStyle = {
    minHeight: '100dvh',
    width: '100%',
    padding: isMobile ? '1rem 1rem 7rem' : '1.25rem',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'radial-gradient(circle at 50% 0%, rgba(0, 243, 255, 0.12), transparent 35%), #050a19',
    color: 'var(--text-bright)',
  }

  if (phase === 'idle') {
    const showQueueList = queueTickets.length > 0 && (!isMobile || queueListExpanded)
    const showOnlineList = onlineOpponents.length > 0 && (!isMobile || onlineListExpanded)
    const challengeSecondsLeft = outgoingChallenge
      ? Math.max(0, Math.ceil((outgoingChallenge.expiresAtMs - timeNow) / 1000))
      : 0
    return (
      <div className="space-bg" style={panelStyle}>
        <div className="glass-card hud-border" style={{ width: 'min(860px, 100%)', padding: isMobile ? '1.25rem' : '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚔️</div>
          <h2 className="font-title" style={{ color: 'var(--star-gold)', marginBottom: '0.75rem' }}>QUIZ BATTLE</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            {isAIMode ? '전술 AI NOVA-7이 내 풀이 속도에 맞춰 함께 달립니다.' : '같은 범위의 탐사원과 실시간으로 대결하거나 NOVA-7과 즉시 훈련합니다.'}<br />
            {isAIMode ? 'AI전 광석은 일반 대전의 1/3이며, 공식 전적 대신 훈련 SEI에 제한적으로 반영됩니다.' : '상대를 직접 선택하거나 아래에서 원하는 대결 방식을 고르세요.'}
          </p>
          <div style={{ color: 'var(--crystal-cyan)', marginBottom: '1.5rem', fontWeight: 800 }}>
            퀴즈 범위: {rangeLabel || entryUnitTitle || entryUnitId}
          </div>
          {!isScopeLocked && <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '0.5rem', textAlign: 'center' }}>
              새 대기방 범위 선택
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '0.6rem' }}>
              {[
                [BATTLE_SCOPE_CUMULATIVE, '상대와 공통으로 배운 이전 과정 전체에서 출제'],
                [BATTLE_SCOPE_UNIT, '현재 진입 미션 유닛 문제만 출제'],
              ].map(([scope, description]) => {
                const selected = battleScope === scope
                return (
                  <button
                    key={scope}
                    type="button"
                    className="hud-btn glass"
                    onClick={() => setBattleScope(scope)}
                    style={{
                      padding: '0.8rem 1rem',
                      borderColor: selected ? 'var(--crystal-cyan)' : 'rgba(255,255,255,0.12)',
                      background: selected ? 'rgba(0, 243, 255, 0.12)' : 'rgba(255,255,255,0.05)',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ color: selected ? 'var(--crystal-cyan)' : 'var(--text-bright)', fontWeight: 900 }}>
                      {BATTLE_SCOPE_LABELS[scope]}
                    </div>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.25rem', lineHeight: 1.45 }}>
                      {description}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isMobile ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))',
              gap: '0.6rem',
              marginBottom: '1.5rem',
            }}
          >
            {(isAIMode ? [
              ['AI 훈련', `${aiTrainingData.aiMatches || 0}회`],
              ['완주', `${aiTrainingData.aiCompletedMatches || 0}회`],
              ['정답률', `${aiTrainingData.aiAnswered > 0 ? Math.round((aiTrainingData.aiCorrect / aiTrainingData.aiAnswered) * 100) : 0}%`],
              ['훈련 SEI', `${aiTrainingData.aiTrainingScore || 0}/60`],
            ] : [
              ['공식 전적', `${battleStats?.totalMatches || 0}전`],
              ['승', `${battleStats?.wins || 0}`],
              ['패', `${battleStats?.losses || 0}`],
              ['무', `${battleStats?.draws || 0}`],
            ]).map(([label, value]) => (
              <div key={label} style={{ padding: '0.7rem', borderRadius: 8, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>{label}</div>
                <div style={{ color: 'var(--text-bright)', fontWeight: 900 }}>{value}</div>
              </div>
            ))}
          </div>
          {!isAIMode && <section style={{ marginBottom: '1rem', textAlign: 'left' }}>
            <div style={{
              border: '1px solid rgba(251,191,36,0.3)',
              borderRadius: 14,
              overflow: 'hidden',
              background: 'linear-gradient(120deg, rgba(251,191,36,0.08), rgba(255,255,255,0.025))',
            }}>
              <div style={{
                padding: '0.85rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.8rem',
                borderBottom: showQueueList ? '1px solid rgba(251,191,36,0.16)' : 0,
              }}>
                <button
                  type="button"
                  onClick={() => { if (isMobile) setQueueListExpanded(prev => !prev) }}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    color: 'var(--text-bright)',
                    textAlign: 'left',
                    cursor: isMobile ? 'pointer' : 'default',
                    font: 'inherit',
                  }}
                >
                  <span className="font-tech" style={{ display: 'block', color: 'var(--star-gold)', fontSize: '0.7rem', letterSpacing: '0.12em', marginBottom: '0.25rem' }}>
                    ⚡ BATTLE WAITING ROOM
                  </span>
                  <strong>즉시 배틀 가능 {isLoadingQueue ? '확인 중…' : `${queueTickets.length}명`}</strong>
                  {isMobile && queueTickets.length > 0 && (
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '0.4rem' }}>{showQueueList ? '접기' : '보기'}</span>
                  )}
                </button>
                <button
                  type="button"
                  className="font-tech"
                  onClick={() => loadQueueTickets()}
                  disabled={isLoadingQueue}
                  style={{ border: 0, padding: '0.2rem', background: 'transparent', color: isLoadingQueue ? 'var(--text-muted)' : 'var(--star-gold)', fontWeight: 900, cursor: isLoadingQueue ? 'default' : 'pointer', whiteSpace: 'nowrap' }}
                >
                  새로 고침
                </button>
              </div>

              <div className="font-tech" style={{ padding: '0.7rem 1rem 0', color: 'var(--text-muted)', fontSize: '0.76rem', lineHeight: 1.5 }}>
                이미 대기룸에 입장해 출전 준비를 마친 탐사원입니다. 선택하면 도전장 없이 즉시 배틀이 시작됩니다.
              </div>

              {showQueueList && (
                <div style={{ display: 'grid', gap: '0.6rem', padding: '0.75rem 1rem 1rem', maxHeight: isMobile ? '30vh' : '230px', overflowY: 'auto' }}>
                  {queueTickets.map((ticket) => (
                    <div key={ticket.ticketId} style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                      gap: '0.7rem',
                      alignItems: 'center',
                      padding: '0.85rem',
                      border: '1px solid rgba(251,191,36,0.2)',
                      borderRadius: 10,
                      background: 'rgba(4,9,25,0.58)',
                    }}>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.32rem' }}>
                          <i style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--star-gold)', boxShadow: '0 0 9px rgba(251,191,36,0.85)' }} />
                          <strong style={{ color: 'var(--text-bright)' }}>{ticket.displayName || '탐사원'}</strong>
                          <span className="font-tech" style={{ color: ticket.battleScope === BATTLE_SCOPE_UNIT ? 'var(--star-gold)' : 'var(--crystal-cyan)', fontSize: '0.68rem' }}>
                            {BATTLE_SCOPE_LABELS[ticket.battleScope] || BATTLE_SCOPE_LABELS[BATTLE_SCOPE_CUMULATIVE]}
                          </span>
                          <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.68rem' }}>{ticket.questionCount || QUESTION_COUNT}문제</span>
                        </div>
                        <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                          {ticket.entryUnitTitle || '퀴즈 유닛'} · 대기 {ticket.secondsLeft || 0}초 남음
                        </div>
                      </div>
                      <button
                        type="button"
                        className="hud-btn primary glass"
                        onClick={() => joinQueue({ targetTicketId: ticket.ticketId })}
                        disabled={isJoining || Boolean(outgoingChallenge)}
                        style={{ padding: '0.7rem 1rem', whiteSpace: 'nowrap', borderColor: 'rgba(251,191,36,0.55)' }}
                      >
                        {isJoining ? '연결 중…' : '즉시 배틀'}
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {!isLoadingQueue && queueTickets.length === 0 && (
                <div style={{ padding: '0.75rem 1rem 1rem', color: 'var(--text-muted)', fontSize: '0.8rem', textAlign: 'center' }}>
                  현재 대기룸에서 출전을 기다리는 탐사원이 없습니다.
                </div>
              )}
            </div>
          </section>}
          {!isAIMode && <div style={{ marginBottom: '1.5rem', textAlign: 'left' }}>
            <div
              style={{
                width: '100%',
                padding: '0.8rem 1rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.8rem',
                borderRadius: 999,
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(255,255,255,0.14)',
              }}
            >
              <button
                type="button"
                onClick={() => {
                  if (isMobile) setOnlineListExpanded(prev => !prev)
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 0,
                  background: 'transparent',
                  color: 'var(--text-bright)',
                  textAlign: 'left',
                  cursor: isMobile ? 'pointer' : 'default',
                  font: 'inherit',
                  padding: 0,
                }}
              >
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.45rem' }}>
                  <i style={{ width: 8, height: 8, borderRadius: '50%', background: '#32f6a0', boxShadow: '0 0 10px #32f6a0' }} />
                  온라인 탐사원 · 도전 신청 가능 {isLoadingOnline ? '확인 중...' : `${onlineOpponents.length}명`}
                </span>
                {isMobile && onlineOpponents.length > 0 && (
                  <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.45rem' }}>
                    {showOnlineList ? '접기' : '보기'}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => loadOnlineOpponents()}
                disabled={isLoadingOnline}
                className="font-tech"
                style={{
                  border: 0,
                  background: 'transparent',
                  color: isLoadingOnline ? 'var(--text-muted)' : 'var(--crystal-cyan)',
                  cursor: isLoadingOnline ? 'default' : 'pointer',
                  fontWeight: 900,
                  padding: '0.15rem 0',
                  whiteSpace: 'nowrap',
                }}
              >
                새로 고침
              </button>
            </div>
            <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.76rem', margin: '0.55rem 0 0.8rem', lineHeight: 1.5 }}>
              대기룸에는 없지만 최근 2분 안에 접속했고, 현재 계정 권한으로 이 행성을 학습할 수 있는 탐사원입니다. 선택하면 퀴즈 범위를 담은 도전장이 전달됩니다.
            </div>
            {outgoingChallenge && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                alignItems: 'center',
                gap: '0.85rem',
                marginBottom: '0.8rem',
                padding: '1rem',
                borderRadius: 12,
                border: '1px solid rgba(251,191,36,0.35)',
                background: 'linear-gradient(120deg, rgba(251,191,36,0.1), rgba(124,92,255,0.08))',
              }}>
                <div>
                  <div className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.72rem', letterSpacing: '0.12em', marginBottom: '0.35rem' }}>CHALLENGE SENT · {challengeSecondsLeft} SEC</div>
                  <strong style={{ color: 'var(--text-bright)' }}>{outgoingChallenge.recipientName}님의 응답을 기다리는 중</strong>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.3rem' }}>상대 화면에 퀴즈 범위와 학습 기록 보존 안내가 전달되었습니다.</div>
                </div>
                <button type="button" className="hud-btn secondary glass" onClick={() => cancelOutgoingChallenge()} style={{ padding: '0.65rem 0.9rem', whiteSpace: 'nowrap' }}>도전 회수</button>
              </div>
            )}
            {challengeNotice && !outgoingChallenge && (
              <div className="font-tech" style={{ color: 'var(--star-gold)', margin: '0 0 0.75rem', fontSize: '0.8rem' }}>{challengeNotice}</div>
            )}
            {showOnlineList && !outgoingChallenge && (
              <div style={{ marginTop: '0.75rem', display: 'grid', gap: '0.6rem', maxHeight: isMobile ? '34vh' : '260px', overflowY: 'auto' }}>
                {onlineOpponents.map((opponent) => (
                  <div
                    key={opponent.uid}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: isMobile ? '1fr' : '1fr auto',
                      gap: '0.7rem',
                      alignItems: 'center',
                      padding: '0.85rem 1rem',
                      borderRadius: 8,
                      background: 'rgba(255,255,255,0.045)',
                      border: '1px solid rgba(255,255,255,0.1)',
                    }}
                  >
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.35rem' }}>
                        <i style={{ width: 7, height: 7, borderRadius: '50%', background: '#32f6a0', boxShadow: '0 0 8px #32f6a0' }} />
                        <span style={{ color: 'var(--text-bright)', fontWeight: 900 }}>{opponent.displayName || '탐사원'}</span>
                        {opponent.gradeLabel && <span className="font-tech" style={{ color: 'var(--crystal-cyan)', fontSize: '0.72rem' }}>{opponent.gradeLabel}</span>}
                        {opponent.crewName && <span className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>· {opponent.crewName}</span>}
                        {opponent.isGuest && <span className="font-tech" style={{ color: 'var(--star-gold)', fontSize: '0.68rem' }}>GUEST</span>}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.86rem', lineHeight: 1.45, overflowWrap: 'anywhere' }}>
                        {opponent.locationLabel || '메타센스 학습 중'} · 도전 수신 가능
                      </div>
                    </div>
                    <button
                      className="hud-btn primary glass"
                      onClick={() => sendChallenge(opponent)}
                      disabled={isJoining || Boolean(challengingUid)}
                      style={{ padding: '0.72rem 1rem', whiteSpace: 'nowrap' }}
                    >
                      {challengingUid === opponent.uid ? '전송 중…' : '도전 신청'}
                    </button>
                  </div>
                ))}
              </div>
            )}
            {!isLoadingOnline && onlineOpponents.length === 0 && !outgoingChallenge && (
              <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', marginTop: '0.65rem', padding: '0.8rem' }}>
                지금 바로 도전할 수 있는 탐사원이 없습니다.<br />자동 매칭 대기룸에 들어가면 다음 상대와 연결됩니다.
              </div>
            )}
          </div>}
          {userData?.isGuest === true && (
            <div className="font-tech" style={{ color: 'var(--star-gold)', marginBottom: '1rem', fontSize: '0.82rem' }}>
              GUEST RUN · 내 전적과 광석은 저장되지 않지만 상대방의 경기 기록에는 반영됩니다.
            </div>
          )}
          {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ marginTop: isMobile ? '0.3rem' : '0.55rem' }}>
            <div className="font-tech" style={{ color: 'var(--text-muted)', fontSize: '0.72rem', letterSpacing: '0.1em', marginBottom: '0.55rem' }}>
              {isAIMode ? 'AI BATTLE START' : '대결 방식 선택'}
            </div>
            <div style={{
              width: 'min(620px, 100%)',
              margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: isAIMode ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
              gap: isMobile ? '0.55rem' : '0.75rem',
            }}>
              {!isAIMode && (
                <button
                  type="button"
                  className="hud-btn primary glass"
                  onClick={() => joinQueue()}
                  disabled={isJoining || Boolean(outgoingChallenge)}
                  style={{
                    minHeight: isMobile ? 82 : 92,
                    padding: isMobile ? '0.8rem 0.55rem' : '0.95rem 1rem',
                    borderColor: 'rgba(0,243,255,0.5)',
                    background: 'linear-gradient(145deg, rgba(0,243,255,0.17), rgba(32,77,145,0.2))',
                  }}
                >
                  <span style={{ display: 'block', fontWeight: 900, fontSize: isMobile ? '0.9rem' : '1rem' }}>
                    {joiningMode === 'queue' ? '연결 중…' : outgoingChallenge ? '도전 대기 중' : isMobile ? '자동 매칭' : '자동 매칭 대기룸 입장'}
                  </span>
                  <span className="font-tech" style={{ display: 'block', marginTop: '0.3rem', color: 'var(--text-muted)', fontSize: isMobile ? '0.65rem' : '0.72rem', lineHeight: 1.35 }}>
                    탐사원과 실시간 대결
                  </span>
                </button>
              )}
              <button
                type="button"
                className="hud-btn primary glass"
                onClick={startAIBattle}
                disabled={isJoining || Boolean(outgoingChallenge)}
                style={{
                  minHeight: isMobile ? 82 : 92,
                  padding: isMobile ? '0.8rem 0.55rem' : '0.95rem 1rem',
                  borderColor: 'rgba(124,92,255,0.7)',
                  background: 'linear-gradient(145deg, rgba(124,92,255,0.25), rgba(0,243,255,0.1))',
                  boxShadow: '0 10px 28px rgba(124,92,255,0.16)',
                }}
              >
                <span style={{ display: 'block', fontWeight: 900, fontSize: isMobile ? '0.9rem' : '1rem' }}>
                  {joiningMode === 'ai' ? 'NOVA-7 호출 중…' : 'NOVA-7 AI'}
                </span>
                <span className="font-tech" style={{ display: 'block', marginTop: '0.3rem', color: 'var(--text-muted)', fontSize: isMobile ? '0.65rem' : '0.72rem', lineHeight: 1.35 }}>
                  즉시 대결 · 광석 1/3
                </span>
              </button>
            </div>
            <div style={{
              width: isMobile ? '100%' : 'auto',
              marginTop: '0.7rem',
              display: 'grid',
              gridTemplateColumns: isMobile ? `repeat(${!isAIMode && onSoloQuiz ? 2 : 1}, minmax(0, 1fr))` : 'repeat(2, auto)',
              justifyContent: isMobile ? 'stretch' : 'center',
              gap: '0.55rem',
            }}>
              {!isAIMode && onSoloQuiz && <button className="hud-btn secondary glass" onClick={handleSoloQuiz} style={{ minHeight: 44, padding: isMobile ? '0.7rem 0.5rem' : '0.72rem 1.1rem', fontSize: isMobile ? '0.78rem' : undefined }}>
                FIELD TEST
              </button>}
              <button className="hud-btn secondary glass" onClick={leaveBattle} style={{ minHeight: 44, padding: isMobile ? '0.7rem 0.5rem' : '0.72rem 1.1rem', fontSize: isMobile ? '0.78rem' : undefined }}>
                돌아가기
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (phase === 'waiting') {
    return (
      <div className="space-bg" style={panelStyle}>
        <div className="glass-card hud-border" style={{ width: 'min(720px, 100%)', padding: '2rem', textAlign: 'center' }}>
          <MotionDiv
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: '3.5rem', marginBottom: '1rem' }}
          >
            🛰️
          </MotionDiv>
          <h2 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.8rem' }}>배틀 상대 탐색 중</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            같은 행성의 대기룸에 들어온 탐사원을 찾고 있습니다.<br />
            대기 상태는 자동으로 갱신됩니다.
          </p>
          <div
            className="font-tech"
            style={{
              display: 'inline-block',
              marginBottom: '1.25rem',
              padding: '0.35rem 0.75rem',
              borderRadius: 999,
              color: battleScope === BATTLE_SCOPE_UNIT ? 'var(--star-gold)' : 'var(--crystal-cyan)',
              border: '1px solid rgba(255,255,255,0.14)',
              background: 'rgba(255,255,255,0.06)',
              fontSize: '0.8rem',
            }}
          >
            {BATTLE_SCOPE_LABELS[battleScope]}
          </div>
          {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="hud-btn secondary glass" onClick={handleSoloQuiz} disabled={isLeaving} style={{ padding: '0.9rem 1.4rem' }}>
              {isLeaving ? '대기 취소 중...' : '혼자 FIELD TEST로 전환'}
            </button>
            <button className="hud-btn secondary glass" onClick={leaveBattle} style={{ padding: '0.9rem 1.4rem' }}>
              대기 취소
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (isBattleCancelled) {
    return (
      <div className="space-bg" style={panelStyle}>
        <div className="glass-card hud-border" style={{ width: 'min(720px, 100%)', padding: '2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>⚠️</div>
          <h2 className="font-title" style={{ color: 'var(--star-gold)', marginBottom: '0.8rem' }}>배틀이 성립되지 않았습니다</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            상대방이 배틀 화면에 입장하지 않았거나 대기방에서 나갔습니다.<br />
            이 경기는 승패와 보상 없이 취소되었습니다.
          </p>
          {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
          <button className="hud-btn primary glass" onClick={leaveBattle} style={{ padding: '0.9rem 1.4rem' }}>
            {initialBattleId ? '학습 화면으로 돌아가기' : '돌아가기'}
          </button>
        </div>
      </div>
    )
  }

  if (isBattleStarting) {
    const deadlineMs = Number(battle?.entryConfirmDeadlineMs || 0)
    const left = deadlineMs > 0 ? Math.max(0, Math.ceil((deadlineMs - timeNow) / 1000)) : 0
    return (
      <div className="space-bg" style={panelStyle}>
        <div className="glass-card hud-border" style={{ width: 'min(720px, 100%)', padding: '2rem', textAlign: 'center' }}>
          <MotionDiv
            animate={{ rotate: 360 }}
            transition={{ duration: 2.4, repeat: Infinity, ease: 'linear' }}
            style={{ fontSize: '3.5rem', marginBottom: '1rem' }}
          >
            ⚔️
          </MotionDiv>
          <h2 className="font-title" style={{ color: 'var(--crystal-cyan)', marginBottom: '0.8rem' }}>상대 입장 확인 중</h2>
          <p className="font-tech" style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: '1.5rem' }}>
            양쪽 학생이 모두 배틀 화면에 입장하면 타이머가 시작됩니다.<br />
            {left > 0 ? `${left}초 안에 확인되지 않으면 배틀이 자동 취소됩니다.` : '입장 확인 시간이 종료되었습니다.'}
          </p>
          {error && <div style={{ color: '#f87171', marginBottom: '1rem' }}>{error}</div>}
          <button className="hud-btn secondary glass" onClick={leaveBattle} disabled={isLeaving} style={{ padding: '0.9rem 1.4rem' }}>
            {isLeaving ? '취소 중...' : '배틀 취소'}
          </button>
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
            {resultSummary?.outcome === 'win' ? '배틀 승리' : resultSummary?.outcome === 'loss' ? '배틀 패배' : '무승부'}
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
            {isBattleSettled ? `+${resultSummary?.reward || 0} 광석` : '광석·전적 정산 중…'}
          </div>
          {battle?.isAI === true && (
            <div className="font-tech" style={{ color: 'var(--text-muted)', margin: '-0.8rem 0 1.5rem', lineHeight: 1.6 }}>
              NOVA-7전은 AI 훈련 기록과 제한된 훈련 SEI에 반영되며, 공식 승률·연승·배틀 아레나 순위에는 반영되지 않습니다.
            </div>
          )}
          {resultSummary?.rewardPolicy?.reason && (
            <div className="font-tech" style={{ color: 'var(--star-gold)', margin: '-0.8rem 0 1.5rem', lineHeight: 1.6 }}>
              {{
                battle_access_inactive: '현재 접근 허용된 과정 또는 리전이 아니라 광석과 공식 전적에서 제외되었습니다.',
                scope_repeat_limit: '오늘 같은 범위의 보상·공식 전적 반영 횟수를 모두 사용했습니다.',
                opponent_repeat_limit: '오늘 같은 상대와의 보상·공식 전적 반영 횟수를 모두 사용했습니다.',
                daily_ore_cap: '오늘의 퀴즈 배틀 광석 상한에 도달했습니다.',
                daily_ore_cap_partial: '오늘의 남은 배틀 광석 한도까지만 지급되었습니다.',
              }[resultSummary.rewardPolicy.reason] || '공정 플레이 정책에 따라 연습 경기로 기록되었습니다.'}
            </div>
          )}
          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            {wrongQuestions.length > 0 && (
              <button className="hud-btn secondary glass" onClick={() => { setReviewMode(true); setReviewIndex(0) }} disabled={!resultDismissEnabled} style={{ padding: '0.9rem 1.4rem' }}>
                틀린 문제 다시 보기 ({wrongQuestions.length})
              </button>
            )}
            <button className="hud-btn primary glass" onClick={() => { if (resultDismissEnabled) leaveBattle() }} disabled={!resultDismissEnabled || isLeaving} style={{ padding: '0.9rem 1.6rem' }}>
              {resultDismissEnabled ? (initialBattleId ? '학습 화면으로 돌아가기' : 'MISSION CONTROL로 돌아가기') : '결과 확인 중…'}
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

        <div className="font-tech" style={{ color: integrityNotice ? '#fbbf24' : 'var(--text-muted)', fontSize: '0.78rem', textAlign: 'center', margin: '-0.25rem 0 0.8rem' }}>
          {integrityNotice || '집중 모드 · 탭/창/사이드바로 포커스를 옮기면 이탈로 기록됩니다.'}
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
            ) : isBattleCompleteForMe && battle?.isAI === true && !isOpponentComplete && !timeExpired ? (
              <button className="hud-btn primary glass" disabled style={{ padding: '0.8rem 1.2rem' }}>
                NOVA-7 계산 중…
              </button>
            ) : isBattleCompleteForMe || timeExpired ? (
              <button className="hud-btn primary glass" onClick={finalizeBattle} disabled={isFinalizing} style={{ padding: '0.8rem 1.2rem' }}>
                {isFinalizing ? '정산 중...' : '결과 확인'}
              </button>
            ) : (
              <button className="hud-btn primary glass" onClick={submitAnswer} disabled={selectedKeys.size === 0 || isSubmitting} style={{ padding: '0.8rem 1.2rem' }}>
                {isSubmitting ? '채점 중…' : '답안 제출'}
              </button>
            )}
          </div>
        </div>

        {isBattleCompleteForMe && !isBattleFinished && (
          <div className="glass-card" style={{ padding: '1rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            내 답안 제출이 끝났습니다. {battle?.isAI === true ? 'NOVA-7이 마지막 답안을 계산하고 있습니다.' : '상대 제출이 끝나면 결과가 확정됩니다.'}
          </div>
        )}
      </div>
    </div>
  )
}
