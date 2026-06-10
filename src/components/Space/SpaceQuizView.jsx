import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { parseInlineFormatting } from '../../utils/formatUtils'
import 'katex/dist/katex.min.css'
import { InlineMath } from 'react-katex'
import StarField from './StarField'
import { createParticleBurst, shakeScreen } from './ParticleEffects'
import soundManager from '../../utils/SoundManager'
import '../../styles/space-theme.css'
import QuestionModal from '../QuestionModal'
import { useSmartSync } from '../../hooks/useSync'
import { useAuth } from '../../hooks/useAuth'
import MissionMarkdownViewer from './MissionMarkdownViewer'
import { db, functions } from '../../firebase'
import { doc, getDoc, setDoc, deleteField, serverTimestamp } from 'firebase/firestore'
import { httpsCallable } from 'firebase/functions'
import { useCreateMistakeCardFromQuiz } from '../../hooks/useMistakeNotebook'

// Fisher-Yates 셔플 알고리즘
const shuffleArray = (array) => {
  const newArr = [...array];
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
  }
  return newArr;
}

const QUIZ_REACTION_CHOICES = [
  { id: 'understood', label: '확실히 이해했어요', tone: '#22c55e', review: false },
  { id: 'uncertain_correct', label: '맞혔지만 확신은 없었어요', tone: '#fbbf24', review: true },
  { id: 'missed_condition', label: '문제 조건을 놓쳐서 틀렸어요', tone: '#fb7185', review: true },
  { id: 'solution_blocked', label: '풀이 방법에서 막혀서 틀렸어요', tone: '#a78bfa', review: true },
  { id: 'guessed_concept_gap', label: '개념을 몰라서 찍었어요', tone: '#38bdf8', review: true },
  { id: 'careless_mistake', label: '아는데 실수해서 틀렸어요', tone: '#fb923c', review: true },
]

const REACTION_CAUSE_LABELS = {
  understood: '확실한 이해',
  uncertain_correct: '확신 부족',
  missed_condition: '조건 놓침',
  solution_blocked: '풀이 방법 막힘',
  guessed_concept_gap: '개념 공백/찍음',
  careless_mistake: '아는 내용 실수',
}

const REVIEW_REACTION_IDS = new Set(['uncertain_correct', 'missed_condition', 'solution_blocked', 'guessed_concept_gap', 'careless_mistake'])
const MotionReactionPanel = motion.div

const makeQuizQuestionStatId = (unitId, questionId) => encodeURIComponent(`${unitId || 'unknown'}__${questionId || 'unknown'}`)

const getOptionKey = (question, option) => {
  const options = question?.options || []
  const index = options.findIndex(item => item === option || item?.text === option?.text)
  return `o${Math.max(0, index)}`
}

const getOptionDiagnosticLabel = (option, isCorrect) => {
  if (isCorrect) return '정답'
  return option?.diagnosticLabel || option?.misconception || option?.errorType || option?.feedback || '오답 선택'
}

const getOptionSummaries = (question) => (question?.options || []).map((option, index) => ({
  key: `o${index}`,
  text: option?.text || '',
  isCorrect: option?.isCorrect === true,
  diagnosticLabel: getOptionDiagnosticLabel(option, option?.isCorrect === true),
}))

const getAnswerSelectedKeys = (question, answer) => {
  if (!question || !answer) return []
  if (answer.isMultiAnswer && Array.isArray(answer.selectedTexts)) {
    return (question.options || [])
      .map((option, index) => (answer.selectedTexts.includes(option.text) ? `o${index}` : null))
      .filter(Boolean)
  }
  return [getOptionKey(question, answer)]
}

const unflattenStats = (data) => {
  if (!data) return null;
  const result = { ...data };
  result.optionCounts = result.optionCounts ? { ...result.optionCounts } : {};
  result.reactionCounts = result.reactionCounts ? { ...result.reactionCounts } : {};
  Object.keys(result).forEach(key => {
    if (key.startsWith('optionCounts.')) {
      const optionKey = key.substring('optionCounts.'.length);
      result.optionCounts[optionKey] = result[key];
    } else if (key.startsWith('reactionCounts.')) {
      const reactionKey = key.substring('reactionCounts.'.length);
      result.reactionCounts[reactionKey] = result[key];
    }
  });
  return result;
};

const getDisplayStats = (stats, question, pendingResult, existingResponse, pendingReactionId) => {
  const options = getOptionSummaries(question)
  const totalFromStats = Number(stats?.totalResponses || 0)
  const counts = { ...(stats?.optionCounts || {}) }
  let total = totalFromStats
  let correctResponses = Number(stats?.correctResponses || 0)

  if (pendingResult && !pendingResult.persisted) {
    if (existingResponse) {
      // Re-answer: subtract old option counts and adjust correctness, total stays the same
      const previousKeys = Array.isArray(existingResponse.selectedOptionKeys)
        ? existingResponse.selectedOptionKeys : []
      previousKeys.forEach(key => {
        counts[key] = Math.max(0, Number(counts[key] || 0) - 1)
      })
      if (existingResponse.isCorrect === true && !pendingResult.isCorrect) {
        correctResponses = Math.max(0, correctResponses - 1)
      } else if (existingResponse.isCorrect !== true && pendingResult.isCorrect) {
        correctResponses += 1
      }
    } else {
      // First-time answer: increment total
      total += 1
      if (pendingResult.isCorrect) correctResponses += 1
    }
    // Add new option counts
    pendingResult.selectedOptionKeys.forEach(key => {
      counts[key] = Number(counts[key] || 0) + 1
    })
  }

  // Optimistic reaction counts
  const reactionCounts = { ...(stats?.reactionCounts || {}) }
  if (pendingResult && !pendingResult.persisted && pendingReactionId) {
    if (existingResponse?.reactionId) {
      reactionCounts[existingResponse.reactionId] = Math.max(0, Number(reactionCounts[existingResponse.reactionId] || 0) - 1)
    }
    reactionCounts[pendingReactionId] = Number(reactionCounts[pendingReactionId] || 0) + 1
  }

  return {
    total,
    correctRate: total > 0 ? Math.round((correctResponses / total) * 100) : 0,
    reactionCounts,
    options: options.map(option => ({
      ...option,
      count: Number(counts[option.key] || 0),
      percent: total > 0 ? Math.round((Number(counts[option.key] || 0) / total) * 100) : 0,
    })),
  }
}

export default function SpaceQuizView({ region, quizData, onExit, onComplete, hasShield, hasRadar, isRadarBonus, onRequestSupport }) {
  // Real-time synchronization watchdog
  useSmartSync(quizData?.unitId)
  const { user, userData } = useAuth()

  const [currentQuestions, setCurrentQuestions] = useState([])
  const [currentIdx, setCurrentIdx] = useState(0)
  const [userAnswers, setUserAnswers] = useState({})
  const [isResultMode, setIsResultMode] = useState(false)
  const [reSolveMode, setReSolveMode] = useState(false)
  const [showFeedback, setShowFeedback] = useState(null) // 'correct' | 'wrong' | null
  const [isRebooting, setIsRebooting] = useState(false)
  const [comboCount, setComboCount] = useState(0)
  const [sessionCrystals, setSessionCrystals] = useState(0)
  const [shieldsUsed, setShieldsUsed] = useState(0)
  const [floatingMarkers, setFloatingMarkers] = useState([]) // { id, text, type, x, y }
  const [originalTotal, setOriginalTotal] = useState(0)
  const [allSessionQuestions, setAllSessionQuestions] = useState([]) // 최초 20문항 유지
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(true)
  const [isSavingExit, setIsSavingExit] = useState(false)
  const [isQuestionModalOpen, setIsQuestionModalOpen] = useState(false)
  const [modalContext, setModalContext] = useState(null)
  const [firstPassScore, setFirstPassScore] = useState(null)
  const [showRadarScan, setShowRadarScan] = useState(false)
  const [potentialOre] = useState(0)
  const [reviewMarks, setReviewMarks] = useState(new Set()) // 재검토 마크 문항 ID
  const [deferredQuestionIds, setDeferredQuestionIds] = useState(new Set())
  const [isDeferredRound, setIsDeferredRound] = useState(false)
  
  // Interactive FAB (Support Tray) state
  const [isTrayExpanded, setIsTrayExpanded] = useState(false)
  
  // Anti-Guessing State
  const [retryCount, setRetryCount] = useState(0)
  const [everWrongSet, setEverWrongSet] = useState(new Set())
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= 768)
  const isDarkMatter = quizData?.unitId === 'dark_matter_zone'
  const [isAiExplanationOpen, setIsAiExplanationOpen] = useState(false)
  const [isDetailedExplanationOpen, setIsDetailedExplanationOpen] = useState(false)
  const [selectedMultiOptions, setSelectedMultiOptions] = useState(new Set()) // 멀티 정답 임시 선택
  const [questionStats, setQuestionStats] = useState(null)
  const [existingResponse, setExistingResponse] = useState(null)
  const [pendingResult, setPendingResult] = useState(null)
  const [isSavingReaction, setIsSavingReaction] = useState(false)
  const [reactionError, setReactionError] = useState('')
  const createMistakeCard = useCreateMistakeCardFromQuiz(user?.uid)
  const [mistakeCardMessage, setMistakeCardMessage] = useState('')
  const [savedMistakeQuestionIds, setSavedMistakeQuestionIds] = useState(new Set())

  const initializedRef = useRef(null) // Prevent accidental reshuffling (tracks unitId + uid)
  const currentQuestion = currentQuestions[currentIdx]

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768)
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // 초기 문제 설정 및 이어풀기 세션 로드
  useEffect(() => {
    // Guard key includes user uid so that when auth loads, we re-init with Firestore data
    const questionSignature = quizData?.questions?.map(q => q.id).join('|') || 'no_questions'
    const guardKey = `${quizData?.unitId}__${user?.uid || 'anon'}__${questionSignature}`
    if (quizData?.questions?.length > 0 && initializedRef.current !== guardKey) {
      const initQuizSession = async () => {
        setIsLoadingSession(true)
        try {
          let savedRetryCount = 0
          if (user?.uid && quizData.unitId) {
            const storedRetry = localStorage.getItem(`metasense_retry_${user.uid}_${quizData.unitId}`)
            if (storedRetry) {
              savedRetryCount = parseInt(storedRetry, 10)
            }
          }

          let targetCurrentIdx = 0
          let targetUserAnswers = {}
          let targetSessionCrystals = 0
          let targetComboCount = 0
          let targetShieldsUsed = 0
          let targetRetryCount = savedRetryCount
          let targetFirstPassScore = null
          let targetReviewMarks = []
          let targetDeferredQuestionIds = []
          let targetIsDeferredRound = false

          let targetEverWrong = []

          if (user?.uid && quizData.unitId) {
            const progressRef = doc(db, 'users', user.uid, 'learning_progress', quizData.unitId)
            const snap = await getDoc(progressRef)
            if (snap.exists()) {
              const data = snap.data()
              if (data.quizSession) {
                const session = data.quizSession
                // 문항 수가 달라졌더라도 최대한 기존 진행도를 살려서 로드합니다.
                targetCurrentIdx = session.currentIdx || 0
                targetUserAnswers = session.userAnswers || {}
                targetSessionCrystals = session.sessionCrystals || 0
                targetComboCount = session.comboCount || 0
                targetShieldsUsed = session.shieldsUsed || 0
                targetFirstPassScore = session.firstPassScore !== undefined ? session.firstPassScore : null
                targetEverWrong = session.everWrong || []
                targetReviewMarks = Array.isArray(session.reviewMarks) ? session.reviewMarks : []
                targetDeferredQuestionIds = Array.isArray(session.deferredQuestionIds) ? session.deferredQuestionIds : []
                targetIsDeferredRound = session.isDeferredRound === true
                if (session.retryCount !== undefined) {
                  targetRetryCount = session.retryCount
                }
              }
            }
          }

          const selected = [...quizData.questions].map(q => ({
            ...q,
            shuffledOptions: q.options ? shuffleArray(q.options) : []
          }));

          const selectedIds = new Set(selected.map(q => q.id))
          targetUserAnswers = Object.fromEntries(
            Object.entries(targetUserAnswers).filter(([questionId]) => selectedIds.has(questionId))
          )
          targetEverWrong = targetEverWrong.filter(questionId => selectedIds.has(questionId))
          targetReviewMarks = targetReviewMarks.filter(questionId => selectedIds.has(questionId))
          targetDeferredQuestionIds = targetDeferredQuestionIds.filter(questionId => selectedIds.has(questionId) && !targetUserAnswers[questionId])

          const deferredIdSet = new Set(targetDeferredQuestionIds)
          const deferredQuestions = selected.filter(q => deferredIdSet.has(q.id))
          const activeQuestions = targetIsDeferredRound && deferredQuestions.length > 0
            ? deferredQuestions
            : selected
          targetIsDeferredRound = targetIsDeferredRound && deferredQuestions.length > 0

          if (targetCurrentIdx < 0 || targetCurrentIdx >= activeQuestions.length) {
            const firstUnansweredIdx = activeQuestions.findIndex(q => !targetUserAnswers[q.id])
            targetCurrentIdx = firstUnansweredIdx >= 0 ? firstUnansweredIdx : 0
          }
          
          setCurrentQuestions(activeQuestions)
          setAllSessionQuestions(selected)
          setOriginalTotal(selected.length)
          setRetryCount(targetRetryCount)
          setCurrentIdx(targetCurrentIdx)
          setUserAnswers(targetUserAnswers)
          setSessionCrystals(targetSessionCrystals)
          setComboCount(targetComboCount)
          setShieldsUsed(targetShieldsUsed)
          setFirstPassScore(targetFirstPassScore)
          setEverWrongSet(new Set(targetEverWrong))
          setReviewMarks(new Set(targetReviewMarks))
          setDeferredQuestionIds(new Set(targetDeferredQuestionIds))
          setIsDeferredRound(targetIsDeferredRound)
          
          initializedRef.current = guardKey;

          if (hasRadar) {
            setShowRadarScan(isRadarBonus) 
            if (isRadarBonus) {
              soundManager.playLevelUp() 
              setTimeout(() => setShowRadarScan(false), 3000)
            }
          }
        } catch (error) {
          console.error("Failed to init quiz session", error)
        } finally {
          setIsLoadingSession(false)
        }
      }

      initQuizSession()
    }
  }, [quizData, hasRadar, isRadarBonus, user])

  // 문제 변경 시 AI 설명 패널 닫기 + 멀티 선택 초기화
  useEffect(() => {
    setIsAiExplanationOpen(false)
    setIsDetailedExplanationOpen(false)
    setSelectedMultiOptions(new Set())
    setPendingResult(null)
    setReactionError('')
    setMistakeCardMessage('')
  }, [currentIdx])

  useEffect(() => {
    if (!quizData?.unitId || !currentQuestion?.id) {
      setQuestionStats(null)
      setExistingResponse(null)
      return undefined
    }

    let isMounted = true
    const statId = makeQuizQuestionStatId(quizData.unitId, currentQuestion.id)
    setQuestionStats(null)
    setExistingResponse(null)

    // Load both stats and existing user response in parallel
    const statsPromise = getDoc(doc(db, 'quizQuestionStats', statId))
    const responsePromise = user?.uid
      ? getDoc(doc(db, 'quizQuestionResponses', `${user.uid}_${statId}`))
      : Promise.resolve(null)

    Promise.all([statsPromise, responsePromise])
      .then(([statsSnap, responseSnap]) => {
        if (isMounted) {
          setQuestionStats(statsSnap.exists() ? unflattenStats(statsSnap.data()) : null)
          setExistingResponse(responseSnap?.exists?.() ? responseSnap.data() : null)
        }
      })
      .catch((error) => {
        console.error('Quiz question stats load failed:', error)
        if (isMounted) {
          setQuestionStats(null)
          setExistingResponse(null)
        }
      })

    return () => {
      isMounted = false
    }
  }, [quizData?.unitId, currentQuestion?.id, user?.uid])


  const formatText = (text) => {
    return parseInlineFormatting(text, { keyPrefix: 'quiz' });
  }

  // 멀티 정답 여부 확인
  const getCorrectCount = (question) => question?.options?.filter(o => o.isCorrect).length || 0
  const isMultiAnswer = (question) => getCorrectCount(question) > 1
  const currentReactionId = pendingResult ? userAnswers[currentQuestion?.id]?.reactionId : null
  const displayedStats = getDisplayStats(questionStats, currentQuestion, pendingResult, existingResponse, currentReactionId)
  const currentQuestionSaved = currentQuestion?.id ? savedMistakeQuestionIds.has(currentQuestion.id) : false
  const hasMistakeExplanation = Boolean(currentQuestion?.explanation || currentQuestion?.hint)

  const handleAddToMistakeNotebook = async () => {
    if (!currentQuestion || createMistakeCard.isPending) return

    setMistakeCardMessage('')
    try {
      const result = await createMistakeCard.mutateAsync({
        question: currentQuestion,
        quizData,
        user,
        userData
      })
      setSavedMistakeQuestionIds(prev => {
        const next = new Set(prev)
        next.add(currentQuestion.id)
        return next
      })
      setMistakeCardMessage(result?.pendingReview
        ? (result?.alreadyExists ? '이미 운영툴 발행 대기 중입니다.' : 'AI 설명이 없어 운영툴 발행 대기로 보냈습니다.')
        : result?.updatedExisting ? '기존 오답노트 카드의 앞면 정보를 보강했습니다.'
        : (result?.alreadyExists ? '이미 오답노트에 담긴 문제입니다.' : '오답노트에 담았습니다.'))
      soundManager.playClick()
    } catch (error) {
      setMistakeCardMessage(error?.message || '오답노트에 담지 못했습니다.')
    }
  }

  const saveProgressSession = async ({
    nextIdxForSave,
    nextUserAnswers,
    nextCombo,
    nextSessionCrystals,
    nextShieldsUsed,
    nextEverWrongSet,
    nextReviewMarkIds,
    nextDeferredQuestionIds,
    nextIsDeferredRound,
    computedFirstPass,
    willBeResultMode
  }) => {
    if (user?.uid && quizData?.unitId && !reSolveMode && !willBeResultMode) {
      try {
        const progressRef = doc(db, 'users', user.uid, 'learning_progress', quizData.unitId)
        const sessionObj = {
          currentIdx: nextIdxForSave,
          userAnswers: nextUserAnswers,
          comboCount: nextCombo,
          sessionCrystals: nextSessionCrystals,
          retryCount: retryCount,
          shieldsUsed: nextShieldsUsed,
          originalTotal: originalTotal,
          firstPassScore: computedFirstPass !== null ? computedFirstPass : firstPassScore,
          everWrong: Array.from(nextEverWrongSet),
          reviewMarks: nextReviewMarkIds || Array.from(reviewMarks),
          deferredQuestionIds: nextDeferredQuestionIds || Array.from(deferredQuestionIds),
          isDeferredRound: nextIsDeferredRound ?? isDeferredRound
        }
        await setDoc(progressRef, {
          quizSession: JSON.parse(JSON.stringify(sessionObj)),
          unitTitle: quizData?.title || "탐사 퀴즈",
          unitId: quizData.unitId || "",
          updatedAt: serverTimestamp()
        }, { merge: true })
      } catch (e) {
        console.error("Auto save failed", e)
      }
    }
  }

  const getPendingDeferredQuestions = (deferredIds = deferredQuestionIds, answers = userAnswers) => (
    allSessionQuestions.filter(q => deferredIds.has(q.id) && !answers[q.id])
  )

  const moveToNextQuestionOrResult = async (pending) => {
    const nextDeferredIds = new Set(pending.deferredQuestionIds || Array.from(deferredQuestionIds))
    if (currentQuestion?.id) {
      nextDeferredIds.delete(currentQuestion.id)
    }
    const hasNextInCurrentRound = currentIdx < currentQuestions.length - 1
    const pendingDeferredQuestions = !reSolveMode && !isDeferredRound && !hasNextInCurrentRound
      ? getPendingDeferredQuestions(nextDeferredIds, pending.userAnswers)
      : []
    const shouldEnterDeferredRound = pendingDeferredQuestions.length > 0
    const nextIdxForSave = hasNextInCurrentRound ? currentIdx + 1 : (shouldEnterDeferredRound ? 0 : currentIdx)
    let computedFirstPass = firstPassScore
    const willBeResultMode = !hasNextInCurrentRound && !shouldEnterDeferredRound

    if (willBeResultMode) {
      const totalCorrectSoFar = allSessionQuestions.filter(q => pending.userAnswers[q.id]?.isCorrect).length
      if (pending.isCorrect && totalCorrectSoFar === originalTotal) {
        setTimeout(() => {
          const id = Date.now() + Math.random()
          setFloatingMarkers(prev => [...prev, {
            id,
            text: '+10 PERFECT!',
            type: 'gain',
            x: window.innerWidth / 2,
            y: window.innerHeight / 2
          }])
          setTimeout(() => setFloatingMarkers(prev => prev.filter(m => m.id !== id)), 2000)
        }, 200)
      }

      if (retryCount === 0 && firstPassScore === null) {
        computedFirstPass = originalTotal > 0 ? Math.round((totalCorrectSoFar / originalTotal) * 100) : 0
        setFirstPassScore(computedFirstPass)
      }
    }

    await saveProgressSession({
      nextIdxForSave,
      nextUserAnswers: pending.userAnswers,
      nextCombo: pending.combo,
      nextSessionCrystals: pending.sessionCrystals,
      nextShieldsUsed: pending.shieldsUsed,
      nextEverWrongSet: new Set(pending.everWrongIds || []),
      nextReviewMarkIds: pending.reviewMarkIds,
      nextDeferredQuestionIds: Array.from(nextDeferredIds),
      nextIsDeferredRound: shouldEnterDeferredRound ? true : (hasNextInCurrentRound ? isDeferredRound : false),
      computedFirstPass,
      willBeResultMode
    })

    setShowFeedback(null)
    setIsRebooting(false)
    setSelectedMultiOptions(new Set())
    setPendingResult(null)
    setReactionError('')
    setDeferredQuestionIds(nextDeferredIds)

    if (hasNextInCurrentRound) {
      setCurrentIdx(prev => prev + 1)
    } else if (shouldEnterDeferredRound) {
      setCurrentQuestions(pendingDeferredQuestions)
      setCurrentIdx(0)
      setIsDeferredRound(true)
    } else {
      setIsDeferredRound(false)
      setIsResultMode(true)
    }
  }

  const handleQuizReaction = async (reactionId) => {
    if (!pendingResult || isSavingReaction) return
    const reaction = QUIZ_REACTION_CHOICES.find(item => item.id === reactionId)
    if (!reaction) return

    setIsSavingReaction(true)
    setReactionError('')

    try {
      const nextReviewMarks = new Set(reviewMarks)
      if (REACTION_CAUSE_LABELS[reactionId]) {
        pendingResult.userAnswers[currentQuestion.id] = {
          ...pendingResult.userAnswers[currentQuestion.id],
          reactionId,
          reactionLabel: reaction.label,
          darkMatterCause: REACTION_CAUSE_LABELS[reactionId],
        }
        setUserAnswers({ ...pendingResult.userAnswers })
      }

      if (REVIEW_REACTION_IDS.has(reactionId)) {
        nextReviewMarks.add(currentQuestion.id)
      } else {
        nextReviewMarks.delete(currentQuestion.id)
      }
      setReviewMarks(nextReviewMarks)
      await moveToNextQuestionOrResult({
        ...pendingResult,
        persisted: false,
        reactionId,
        reviewMarkIds: Array.from(nextReviewMarks),
      })
    } catch (error) {
      console.error('Quiz reaction save failed:', error)
      setReactionError(error?.message || '반응 저장에 실패했습니다. 다시 시도해 주세요.')
    } finally {
      setIsSavingReaction(false)
    }
  }

  // 멀티 정답: 옵션 토글 선택
  const handleMultiSelect = (option) => {
    if (isRebooting || showFeedback) return
    setSelectedMultiOptions(prev => {
      const next = new Set(prev)
      const key = option.text
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // 멀티 정답: 제출 판정
  const handleMultiSubmit = (event) => {
    if (isRebooting || showFeedback) return
    
    const correctOpts = currentQuestion.options.filter(o => o.isCorrect)
    const selectedTexts = selectedMultiOptions
    
    // 정답 판정: 선택 개수 일치 + 모든 정답이 선택됨
    const isCorrect = selectedTexts.size === correctOpts.length &&
      correctOpts.every(co => selectedTexts.has(co.text))
    
    // userAnswers에 멀티 정답 결과 저장
    const answerRecord = {
      isCorrect,
      isMultiAnswer: true,
      selectedTexts: Array.from(selectedTexts),
      correctTexts: correctOpts.map(o => o.text)
    }
    const selectedOptionKeys = getAnswerSelectedKeys(currentQuestion, answerRecord)

    // 피드백 표시
    setShowFeedback(isCorrect ? 'correct' : 'wrong')

    const newUserAnswers = {
      ...userAnswers,
      [currentQuestion.id]: answerRecord
    }
    
    // 계산 로직
    let newCombo = comboCount || 0
    let newSessionCrystals = sessionCrystals
    let newShieldsUsed = shieldsUsed
    let newEverWrongSet = everWrongSet

    const addMarker = (text, type, bonusX = 0, bonusY = 0) => {
      const id = Date.now() + Math.random()
      setFloatingMarkers(prev => [...prev, { 
        id, text, type, x: event.clientX + bonusX, y: event.clientY + bonusY 
      }])
      setTimeout(() => {
        setFloatingMarkers(prev => prev.filter(m => m.id !== id))
      }, 2000)
    }

    if (isCorrect) {
      soundManager.playCorrect()
      createParticleBurst(event.clientX, event.clientY, 'star')
      createParticleBurst(event.clientX, event.clientY, 'ore')
      
      newCombo += 1
      let earned = 1
      addMarker('+1', 'gain')

      if (!reSolveMode) {
        if (newCombo > 0 && newCombo % 3 === 0) {
          earned += 5
          setTimeout(() => addMarker('+5 COMBO!', 'gain', 40, -40), 200)
        }
      }
      newSessionCrystals += earned
    } else {
      soundManager.playWrong()
      createParticleBurst(event.clientX, event.clientY, 'wrong')
      shakeScreen(300)
      
      newCombo = 0
      const remainingShields = hasShield - shieldsUsed
      if (remainingShields > 0) {
        newShieldsUsed += 1
        addMarker(`🛡️ DEFENDED! (-1)`, 'gain')
      } else {
        const currentPenalty = (retryCount + 1) * 2
        newSessionCrystals -= currentPenalty
        addMarker(`-${currentPenalty}`, 'loss')
      }
      
      newEverWrongSet = new Set(everWrongSet)
      newEverWrongSet.add(currentQuestion.id)
    }

    setUserAnswers(newUserAnswers)
    setComboCount(newCombo)
    setSessionCrystals(newSessionCrystals)
    setShieldsUsed(newShieldsUsed)
    setEverWrongSet(newEverWrongSet)
    setPendingResult({
      questionId: currentQuestion.id,
      isCorrect,
      selectedOptionKeys,
      userAnswers: newUserAnswers,
      combo: newCombo,
      sessionCrystals: newSessionCrystals,
      shieldsUsed: newShieldsUsed,
      everWrongIds: Array.from(newEverWrongSet),
      persisted: false,
    })
  }

  const handleSelect = (option, event) => {
    if (isRebooting || showFeedback) return
    const isCorrect = option.isCorrect
    
    // 피드백 표시
    setShowFeedback(isCorrect ? 'correct' : 'wrong')

    const newUserAnswers = {
      ...userAnswers,
      [currentQuestion.id]: option
    }
    const selectedOptionKeys = getAnswerSelectedKeys(currentQuestion, option)
    
    // 계산 로직 (Auto-save에 최신 값을 넘기기 위함)
    let newCombo = comboCount || 0
    let newSessionCrystals = sessionCrystals
    let newShieldsUsed = shieldsUsed
    let newEverWrongSet = everWrongSet

    // 부유 효과 트리거 함수
    const addMarker = (text, type, bonusX = 0, bonusY = 0) => {
      const id = Date.now() + Math.random()
      setFloatingMarkers(prev => [...prev, { 
        id, text, type, x: event.clientX + bonusX, y: event.clientY + bonusY 
      }])
      setTimeout(() => {
        setFloatingMarkers(prev => prev.filter(m => m.id !== id))
      }, 2000)
    }

    if (isCorrect) {
      soundManager.playCorrect()
      createParticleBurst(event.clientX, event.clientY, 'star')
      createParticleBurst(event.clientX, event.clientY, 'ore')
      
      newCombo += 1
      let earned = 1
      addMarker('+1', 'gain')

      if (!reSolveMode) {
        if (newCombo > 0 && newCombo % 3 === 0) {
          earned += 5 // 3콤보 보너스
          setTimeout(() => addMarker('+5 COMBO!', 'gain', 40, -40), 200)
        }
      }
      newSessionCrystals += earned
    } else {
      soundManager.playWrong()
      createParticleBurst(event.clientX, event.clientY, 'wrong')
      shakeScreen(300)
      
      newCombo = 0
      const remainingShields = hasShield - shieldsUsed
      if (remainingShields > 0) {
        newShieldsUsed += 1
        addMarker(`🛡️ DEFENDED! (-1)`, 'gain')
      } else {
        const currentPenalty = (retryCount + 1) * 2
        newSessionCrystals -= currentPenalty
        addMarker(`-${currentPenalty}`, 'loss')
      }
      
      newEverWrongSet = new Set(everWrongSet)
      newEverWrongSet.add(currentQuestion.id)
    }

    // React 상태 즉시 업데이트
    setUserAnswers(newUserAnswers)
    setComboCount(newCombo)
    setSessionCrystals(newSessionCrystals)
    setShieldsUsed(newShieldsUsed)
    setEverWrongSet(newEverWrongSet)
    setPendingResult({
      questionId: currentQuestion.id,
      isCorrect,
      selectedOptionKeys,
      userAnswers: newUserAnswers,
      combo: newCombo,
      sessionCrystals: newSessionCrystals,
      shieldsUsed: newShieldsUsed,
      everWrongIds: Array.from(newEverWrongSet),
      persisted: false,
    })
  }

  const handleMarkAndSkip = async () => {
    if (!currentQuestion || isRebooting || showFeedback || reSolveMode || isDeferredRound) return

    soundManager.playClick()
    const nextDeferredIds = new Set(deferredQuestionIds)
    nextDeferredIds.add(currentQuestion.id)
    const hasNextInCurrentRound = currentIdx < currentQuestions.length - 1
    const pendingDeferredQuestions = hasNextInCurrentRound
      ? []
      : getPendingDeferredQuestions(nextDeferredIds, userAnswers)
    const nextIdxForSave = hasNextInCurrentRound ? currentIdx + 1 : 0

    setDeferredQuestionIds(nextDeferredIds)
    setSelectedMultiOptions(new Set())
    setReactionError('')

    await saveProgressSession({
      nextIdxForSave,
      nextUserAnswers: userAnswers,
      nextCombo: comboCount,
      nextSessionCrystals: sessionCrystals,
      nextShieldsUsed: shieldsUsed,
      nextEverWrongSet: everWrongSet,
      nextReviewMarkIds: Array.from(reviewMarks),
      nextDeferredQuestionIds: Array.from(nextDeferredIds),
      nextIsDeferredRound: !hasNextInCurrentRound && pendingDeferredQuestions.length > 0,
      computedFirstPass: firstPassScore,
      willBeResultMode: false
    })

    if (hasNextInCurrentRound) {
      setCurrentIdx(prev => prev + 1)
    } else if (pendingDeferredQuestions.length > 0) {
      setCurrentQuestions(pendingDeferredQuestions)
      setCurrentIdx(0)
      setIsDeferredRound(true)
    }
  }

  // 명시적 닫기/저장 로직
  const handleExitClick = async () => {
    soundManager.playClick()
    
    // 이펙트/대기열이 돌고 있는(즉시저장 완료된) 상태가 아닐 때만 현재 상태 강제 저장
    if (!isRebooting && !showFeedback) {
      if (user?.uid && quizData?.unitId && !reSolveMode && !isResultMode) {
        setIsSavingExit(true)
        try {
          const progressRef = doc(db, 'users', user.uid, 'learning_progress', quizData.unitId)
          const sessionObj = {
            currentIdx: currentIdx,
            userAnswers: userAnswers,
            comboCount: comboCount,
            sessionCrystals: sessionCrystals,
            retryCount: retryCount,
            shieldsUsed: shieldsUsed,
            originalTotal: originalTotal,
            firstPassScore: firstPassScore !== null ? firstPassScore : null,
            everWrong: Array.from(everWrongSet),
            reviewMarks: Array.from(reviewMarks),
            deferredQuestionIds: Array.from(deferredQuestionIds),
            isDeferredRound
          }
          await setDoc(progressRef, {
            quizSession: JSON.parse(JSON.stringify(sessionObj)),
            unitTitle: quizData?.title || "탐사 퀴즈",
            unitId: quizData.unitId || "",
            updatedAt: serverTimestamp()
          }, { merge: true })
        } catch (e) {
          console.error("Exit save failed", e)
        }
      }
    }
    onExit()
  }

  const handleOpenQuestionModal = () => {
    setModalContext({
      quizId: currentQuestion?.id,
      unitId: quizData?.unitId || quizData?.id,
      quizTitle: quizData?.title,
      questionId: currentQuestion?.id,
      chapterId: quizData?.chapterId,
      wrongAnswer: userAnswers[currentQuestion?.id],
      captureRootSelector: '#space-quiz-capture-area'
    })
    setIsQuestionModalOpen(true)
  }

  const handleCloseQuestionModal = () => {
    setIsQuestionModalOpen(false)
  }

  const handleReSolveWrong = () => {
    soundManager.playClick()
    
    // Save retry count to local storage
    const newRetryCount = retryCount + 1
    setRetryCount(newRetryCount)
    if (user?.uid && quizData?.unitId) {
      localStorage.setItem(`metasense_retry_${user.uid}_${quizData.unitId}`, newRetryCount.toString())
    }

    startReSolveProcess()
  }

  const startReSolveProcess = () => {
    // 현재 세션의 전체 문제 중 틀린 문제만 필터링
    const wrongQuestions = allSessionQuestions.filter(q => !userAnswers[q.id]?.isCorrect).map(q => ({
      ...q,
      shuffledOptions: q.options ? [...q.options].sort(() => Math.random() - 0.5) : []
    }))
    const newUserAnswers = { ...userAnswers }
    
    // 틀린 문제의 답안 기록 삭제 (다시 풀 수 있게)
    wrongQuestions.forEach(q => {
      delete newUserAnswers[q.id]
    })
    
    setUserAnswers(newUserAnswers)
    setCurrentQuestions(wrongQuestions)
    setCurrentIdx(0)
    setIsResultMode(false)
    setReSolveMode(true)
    setIsDeferredRound(false)
    setDeferredQuestionIds(new Set())
  }

  // 점수 계산 유틸리티 (상한 점수 폐지)
  const calculateFinalScore = (rawScore) => {
    // 이제 더 이상 상한 점수를 적용하지 않고 원점수를 그대로 반환합니다.
    return rawScore;
  };

  const buildQuizSessionReactions = () => (
    allSessionQuestions
      .map((question) => {
        const answer = userAnswers[question.id]
        if (!answer?.reactionId) return null
        const selectedOptionKeys = getAnswerSelectedKeys(question, answer)
        if (selectedOptionKeys.length === 0) return null

        return {
          questionId: question.id,
          questionText: question.question || '',
          unitTitle: question.unitTitle || quizData?.title || '',
          selectedOptionKeys,
          isCorrect: answer.isCorrect === true,
          reactionId: answer.reactionId,
          optionSummaries: getOptionSummaries(question),
        }
      })
      .filter(Boolean)
  )

  const submitQuizSessionReactions = async () => {
    const reactions = buildQuizSessionReactions()
    if (!user?.uid || !quizData?.unitId || reactions.length === 0) return

    const submitBatch = httpsCallable(functions, 'submitQuizSessionReactions')
    await submitBatch({
      unitId: quizData.unitId,
      unitTitle: quizData?.title || '',
      reactions,
    })
  }

  const handleFinish = async () => {
    if (isSubmitting) return
    setIsSubmitting(true)
    
    soundManager.playClick()
    // 점수 계산
    const correctCount = allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const rawScore = originalTotal > 0 ? Math.round((correctCount / originalTotal) * 100) : 0
    const finalScore = calculateFinalScore(rawScore)
    
    const canGetPerfectBonus = (correctCount === originalTotal)
    // isDarkMatter is now in component scope
    
    // Confidence-based Reward: Only Correct AND NOT Marked for review
    const reviewMarkedIds = new Set(Array.from(reviewMarks))
    const solvedAndReleasedCount = allSessionQuestions.filter(q => 
      userAnswers[q.id]?.isCorrect && !reviewMarkedIds.has(q.id)
    ).length

    const crystalsEarned = isDarkMatter 
      ? Math.min(5, solvedAndReleasedCount) 
      : sessionCrystals + (canGetPerfectBonus ? 10 : 0)
    
    try {
      try {
        await submitQuizSessionReactions()
      } catch (reactionError) {
        console.error("Failed to submit quiz session reactions", reactionError)
      }

      // Clear localStorage on successful finish
      if (user?.uid && quizData?.unitId) {
        localStorage.removeItem(`metasense_retry_${user.uid}_${quizData.unitId}`)
        try {
          const progressRef = doc(db, 'users', user.uid, 'learning_progress', quizData.unitId)
          await setDoc(progressRef, { quizSession: deleteField() }, { merge: true })
        } catch(e) { console.error("Failed to clear quiz session", e) }
      }

      await onComplete({ 
        unitId: quizData?.unitId || quizData?.id || "",
        unitTitle: quizData?.title || "탐사 퀴즈",
        chapterId: quizData?.chapterId || "",
        regionId: region?.id || "",
        regionTitle: region?.title || "",
        score: finalScore, 
        initialRawScore: (firstPassScore !== null ? firstPassScore : rawScore), // Capture first pass specifically
        retryCount: retryCount, // Current session retry count
        attemptCount: (retryCount + 1), // Total attempts in THIS session (1 initial + N re-solves)
        total: 100, 
        correctCount, 
        totalCount: originalTotal, 
        crystalsEarned,
        isPerfect: canGetPerfectBonus,
        shieldsUsed,
        wrongQuestions: allSessionQuestions.filter(q => everWrongSet.has(q.id) || (userAnswers[q.id] && userAnswers[q.id].isCorrect === false)).map(q => {
          const answerMeta = userAnswers[q.id] || {}
          return {
            ...q,
            unitId: q.unitId || quizData?.unitId || "",
            unitTitle: q.unitTitle || quizData?.title || "",
            chapterId: q.chapterId || quizData?.chapterId || "",
            regionId: q.regionId || region?.id || "",
            reactionId: answerMeta.reactionId || "",
            reactionLabel: answerMeta.reactionLabel || "",
            darkMatterCause: answerMeta.darkMatterCause || ""
          }
        }),
        correctQuestions: allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect && !everWrongSet.has(q.id)).map(q => {
          const answerMeta = userAnswers[q.id] || {}
          return {
            id: q.id,
            unitId: q.unitId || quizData?.unitId || "",
            unitTitle: q.unitTitle || quizData?.title || "",
            reactionId: answerMeta.reactionId || "",
            reactionLabel: answerMeta.reactionLabel || "",
            darkMatterCause: answerMeta.darkMatterCause || ""
          }
        }),
        reviewMarkedQuestions: allSessionQuestions.filter(q => reviewMarks.has(q.id)).map(q => {
          const answerMeta = userAnswers[q.id] || {}
          return {
            id: q.id,
            unitId: q.unitId || quizData?.unitId || "",
            unitTitle: quizData?.title || "",
            chapterId: q.chapterId || quizData?.chapterId || "",
            regionId: q.regionId || region?.id || "",
            reactionId: answerMeta.reactionId || "",
            reactionLabel: answerMeta.reactionLabel || "",
            darkMatterCause: answerMeta.darkMatterCause || ""
          }
        })
      })
    } catch (err) {
      console.error("Finish failed:", err)
      setIsSubmitting(false)
    }
  }

  if (isLoadingSession) {
    return (
      <div className="space-bg">
        <StarField count={100} />
        <div style={{ 
          height: '100vh', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          color: 'var(--crystal-cyan)',
          fontSize: '1.2rem',
          letterSpacing: '2px'
        }}>
          🚀 퀴즈 세션을 불러오는 중...
        </div>
      </div>
    )
  }

  if (!isResultMode) {
    if (!quizData) {
      return (
        <div className="space-bg">
          <StarField count={100} />
          <div style={{ 
            height: '100vh', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--crystal-cyan)'
          }}>
            🚀 문제를 불러오는 중...
          </div>
        </div>
      )
    }

    if (currentQuestions.length === 0) {
      return (
        <div className="space-bg">
          <StarField count={100} />
          <div style={{ 
            height: '100vh', 
            display: 'flex', 
            flexDirection: 'column',
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'var(--text-muted)',
            gap: '2rem'
          }}>
            <div style={{ fontSize: '1.5rem', textAlign: 'center' }}>
              ⚠️ 이 유닛에는 아직 문제가 등록되지 않았습니다.<br/>
              <span style={{ fontSize: '1rem', opacity: 0.7 }}>관리자에게 문의해 주세요.</span>
            </div>
            <button 
              onClick={onExit}
              className="glass-card"
              style={{
                padding: '1rem 2rem',
                border: 'none',
                color: 'white',
                cursor: 'pointer'
              }}
            >
              나가기
            </button>
          </div>
        </div>
      )
    }
  }

  // 결과 화면
  if (isResultMode) {
    const correctCount = allSessionQuestions.filter(q => userAnswers[q.id]?.isCorrect).length
    const rawScore = originalTotal > 0 ? Math.round((correctCount / originalTotal) * 100) : 0
    const finalScore = calculateFinalScore(rawScore)
    const isPerfect = (correctCount === originalTotal)
    
    // 만점 보너스 가시성 (저장 로직과 동일하게 유지)
    const canGetPerfectBonus = isPerfect
    // isDarkMatter is now in component scope
    
    // Confidence-based display: Only Correct AND NOT Marked
    const reviewMarkedIds = new Set(Array.from(reviewMarks))
    const solvedAndReleasedCount = allSessionQuestions.filter(q => 
      userAnswers[q.id]?.isCorrect && !reviewMarkedIds.has(q.id)
    ).length

    const crystalsEarnedDisplay = isDarkMatter 
      ? Math.min(5, solvedAndReleasedCount) 
      : sessionCrystals + (canGetPerfectBonus ? 10 : 0)

    return (
      <div className="space-bg">
        <StarField count={150} />
        <div className="space-quiz-container fade-in">
          <div className="glass-card space-quiz-card" style={{ textAlign: 'center' }}>
              <button 
                onClick={() => { soundManager.playClick(); onExit() }}
                style={{
                  position: 'absolute',
                  top: '1rem',
                  right: '1rem',
                  background: 'rgba(255,255,255,0.1)',
                  border: 'none',
                  color: 'var(--text-muted)',
                  padding: '0.5rem 1rem',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                ✕ 나가기
              </button>

            <h2 style={{ 
              fontSize: '2rem', 
              color: 'var(--text-bright)',
              marginBottom: '1.5rem'
            }}>
              🎉 {reSolveMode ? '재도전 완료!' : '탐사 완료!'}
            </h2>

            {/* 점수 원 */}
            <div style={{
              width: '150px',
              height: '150px',
              borderRadius: '50%',
              border: `4px solid ${canGetPerfectBonus ? 'var(--star-gold)' : 'var(--crystal-cyan)'}`,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              background: 'rgba(0,0,0,0.3)',
              boxShadow: canGetPerfectBonus ? 'var(--glow-gold)' : 'var(--glow-cyan)'
            }}>
              <span style={{ 
                fontSize: '3rem', 
                fontWeight: 900,
                color: canGetPerfectBonus ? 'var(--star-gold)' : 'var(--crystal-cyan)'
              }}>
                {finalScore}
              </span>
              <span style={{ color: 'var(--text-muted)' }}>점</span>
            </div>

            {retryCount > 0 && isPerfect && (
              <p style={{ color: 'var(--planet-green)', fontWeight: 'bold', marginBottom: '0.5rem', fontSize: '1.1rem' }}>
                🌟 완벽한 복구 성공! (재도전 시스템 보정 최종 점수)
              </p>
            )}

            <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              {correctCount} / {originalTotal} 정답 (전체 기준)
            </p>
            <p style={{ color: 'var(--secondary)', fontSize: '1rem', marginBottom: '1rem', fontWeight: 'bold' }}>
              이번 탐사 시도: {retryCount + 1}회
            </p>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              marginBottom: '2rem'
            }}>
              <div className="crystal-icon" style={{ width: '20px', height: '20px' }}></div>
              <span style={{ color: crystalsEarnedDisplay >= 0 ? 'var(--crystal-cyan)' : '#f87171', fontWeight: 700 }}>
                {crystalsEarnedDisplay > 0 ? '+' : ''}{crystalsEarnedDisplay} 광석 {crystalsEarnedDisplay >= 0 ? '획득' : '유실'}!
              </span>
            </div>

            {/* 결과 리스트 */}
            <div style={{
              maxHeight: '250px',
              overflowY: 'auto',
              background: 'rgba(0,0,0,0.2)',
              borderRadius: '15px',
              padding: '1rem',
              marginBottom: '2rem',
              textAlign: 'left'
            }}>
              {(reSolveMode ? currentQuestions : allSessionQuestions).map((q, idx) => {
                const isCorrect = userAnswers[q.id]?.isCorrect
                return (
                  <div 
                    key={q.id}
                    style={{
                      padding: '0.8rem',
                      borderRadius: '10px',
                      background: 'rgba(255,255,255,0.05)',
                      marginBottom: '0.5rem',
                      borderLeft: `4px solid ${isCorrect ? 'var(--planet-green)' : '#ef4444'}`,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem'
                    }}
                  >
                    <span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>{idx + 1}.</span>
                    <span style={{ flex: 1, color: 'var(--text-bright)', fontSize: '0.9rem' }}>
                      {formatText(q.question)}
                    </span>
                    <span>{isCorrect ? '⭕' : '❌'}</span>
                  </div>
                )
              })}
            </div>

            {/* 버튼들 */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {!isPerfect && (
                <button
                  onClick={handleReSolveWrong}
                  style={{
                    padding: '1rem',
                    background: 'linear-gradient(135deg, #ff6b6b, #ee5a5a)',
                    border: 'none',
                    borderRadius: '15px',
                    color: 'white',
                    fontSize: '1.1rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ❌ 틀린 문제 다시 풀기
                </button>
              )}
              <button
                onClick={handleFinish}
                disabled={isSubmitting}
                style={{
                  padding: '1rem',
                  background: isSubmitting ? '#9ca3af' : 'linear-gradient(135deg, var(--planet-green), #22c55e)',
                  border: 'none',
                  borderRadius: '15px',
                  color: 'white',
                  fontSize: '1.1rem',
                  fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                {isSubmitting ? '제출 중...' : (isDarkMatter ? '🌌 탐사 완료하기' : (canGetPerfectBonus ? '🌟 만점 보상 받기' : '📤 결과 저장하기'))}
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // 퀴즈 화면
  const progress = ((currentIdx + 1) / currentQuestions.length) * 100

  // [SAFETY GUARD] If currentQuestion is undefined (e.g. ghost docs or index out of bounds),
  // show a fallback to prevent white screen crash.
  if (!currentQuestion && !isResultMode) {
    return (
      <div className="space-bg">
        <div className="space-quiz-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', maxWidth: '400px' }}>
            <h2 style={{ marginBottom: '1rem', color: '#ff6b6b' }}>데이터 로딩 오류</h2>
            <p style={{ marginBottom: '1.5rem', lineHeight: '1.6' }}>
              퀴즈 데이터를 불러오는 중 문제가 발생했습니다.<br/>
              (오래된 데이터가 남아있을 수 있습니다)
            </p>
            <button 
              className="quiz-btn primary"
              onClick={() => handleFinish()} 
              style={{ width: '100%' }}
            >
              퀴즈 종료하고 나가기
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="space-bg"
      style={{
        display: 'flex',
        width: '100%',
        position: 'relative',
        minHeight: '100dvh',
        overflowX: 'hidden'
      }}
    >
      <StarField count={100} />
      
      <div 
        className="space-quiz-container scale-in"
        style={{
          transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          width: '100%',
          flex: 1,
          margin: 0,
          paddingRight: (isAiExplanationOpen && !isMobile) ? '400px' : '0',
          padding: isMobile ? '0.75rem 0.75rem 6.25rem' : undefined
        }}
      >
        {/* Interactive Support Tray (FAB) */}
        {!isResultMode && (
          <motion.div 
            className="support-tray-wrapper"
            initial={{ x: 100, opacity: 0 }}
            animate={{ 
              x: 0, 
              opacity: 1 
            }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            style={{ 
              position: 'fixed', 
              bottom: isMobile ? '1rem' : '6rem', 
              right: isMobile ? '1rem' : '0', 
              zIndex: 9999,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: '0.8rem',
              paddingRight: isMobile ? 0 : '1rem'
            }}
          >
            <AnimatePresence>
              {isTrayExpanded && (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.8rem',
                    alignItems: 'flex-end',
                    width: isMobile ? 'calc(100vw - 2rem)' : 'auto'
                  }}
                >
                  {/* Data Link Button */}
                  {onRequestSupport && (
                    <button 
                      className="support-action-btn data-link"
                      onClick={() => onRequestSupport(currentQuestion?.reference)}
                      style={{
                        padding: '0 1.2rem',
                        borderRadius: '25px',
                        height: '46px',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: 'var(--planet-green)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        cursor: 'pointer',
                        border: '2px solid rgba(0, 255, 136, 0.6)',
                        boxShadow: '0 0 15px rgba(0, 255, 136, 0.3)',
                        background: 'rgba(5, 20, 10, 0.95)',
                        whiteSpace: 'nowrap',
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'center' : 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>📡</span>
                      <span>데이터 링크</span>
                    </button>
                  )}

                  {/* AI Explanation Button */}
                  {isDarkMatter && (currentQuestion?.hint || currentQuestion?.explanation) && (
                    <button 
                      className="support-action-btn ai-explanation" 
                      onClick={() => setIsAiExplanationOpen(prev => !prev)}
                      style={{
                        padding: '0 1.2rem',
                        borderRadius: '25px',
                        height: '46px',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: 'var(--planet-purple)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        cursor: 'pointer',
                        border: '2px solid rgba(168, 85, 247, 0.6)',
                        boxShadow: '0 0 15px rgba(168, 85, 247, 0.3)',
                        background: 'rgba(20, 5, 25, 0.95)',
                        whiteSpace: 'nowrap',
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'center' : 'flex-start'
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>🤖</span>
                      <span>AI 설명</span>
                    </button>
                  )}

                  {currentQuestion && (
                    <button
                      className="support-action-btn mistake-note"
                      onClick={handleAddToMistakeNotebook}
                      disabled={createMistakeCard.isPending || currentQuestionSaved}
                      style={{
                        padding: '0 1.2rem',
                        borderRadius: '25px',
                        height: '46px',
                        fontSize: '0.9rem',
                        fontWeight: 800,
                        color: currentQuestionSaved ? 'rgba(187,247,208,0.88)' : '#fef3c7',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.6rem',
                        cursor: createMistakeCard.isPending || currentQuestionSaved ? 'not-allowed' : 'pointer',
                        border: currentQuestionSaved ? '2px solid rgba(74, 222, 128, 0.42)' : '2px solid rgba(250, 204, 21, 0.62)',
                        boxShadow: currentQuestionSaved ? '0 0 15px rgba(34, 197, 94, 0.22)' : '0 0 15px rgba(250, 204, 21, 0.26)',
                        background: currentQuestionSaved ? 'rgba(5, 35, 22, 0.95)' : 'rgba(34, 24, 5, 0.95)',
                        whiteSpace: 'nowrap',
                        width: isMobile ? '100%' : 'auto',
                        justifyContent: isMobile ? 'center' : 'flex-start',
                        opacity: createMistakeCard.isPending ? 0.72 : 1
                      }}
                    >
                      <span style={{ fontSize: '1.2rem' }}>{currentQuestionSaved ? '✓' : hasMistakeExplanation ? '🧠' : '🛠'}</span>
                      <span>{createMistakeCard.isPending ? '담는 중...' : currentQuestionSaved ? '처리됨' : hasMistakeExplanation ? '오답노트에 담기' : '운영툴로 보내기'}</span>
                    </button>
                  )}

                  {/* Ask Teacher Button */}
                  <button 
                    className="support-action-btn teacher-ask" 
                    onClick={handleOpenQuestionModal}
                    style={{
                      padding: '0 1.2rem',
                      borderRadius: '25px',
                      height: '46px',
                      fontSize: '0.9rem',
                      fontWeight: 800,
                      color: 'var(--crystal-cyan)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.6rem',
                      cursor: 'pointer',
                      border: '2px solid rgba(0, 243, 255, 0.6)',
                      boxShadow: '0 0 15px rgba(0, 243, 255, 0.3)',
                      background: 'rgba(5, 5, 20, 0.95)',
                      whiteSpace: 'nowrap',
                      width: isMobile ? '100%' : 'auto',
                      justifyContent: isMobile ? 'center' : 'flex-start'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🙋</span>
                    <span>선생님 질문</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Toggle FAB */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => setIsTrayExpanded(!isTrayExpanded)}
              style={{
                width: isMobile ? '52px' : '56px',
                height: isMobile ? '52px' : '56px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--crystal-cyan), var(--planet-purple))',
                border: '2px solid white',
                boxShadow: '0 0 20px rgba(0, 243, 255, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                fontSize: '1.5rem',
                zIndex: 10001
              }}
            >
              {isTrayExpanded ? '✕' : '✨'}
            </motion.button>
          </motion.div>
        )}

        <div id="space-quiz-capture-area" className="glass-card space-quiz-card">
          {/* 닫기 버튼 (X 모양, 위치 저장 기능 유지) */}
          <button 
            onClick={handleExitClick}
            title="학습 위치를 저장하고 나갑니다"
            style={{
              position: 'absolute',
              top: '1rem',
              right: '1rem',
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: 'var(--text-muted)',
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              zIndex: 10,
              fontSize: '1.2rem',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.2)'}
            onMouseLeave={(e) => e.target.style.background = 'rgba(255,255,255,0.1)'}
          >
            ✕
          </button>

          {/* 헤더 */}
          <div style={{ marginBottom: isMobile ? '1.35rem' : '2rem', paddingRight: isMobile ? '2.75rem' : 0 }}>
            <span style={{
              background: region?.color || 'var(--crystal-cyan)',
              color: 'white',
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              fontSize: '0.9rem',
              fontWeight: 700
            }}>
              {currentQuestion?.unitTitle || quizData?.title} {reSolveMode && '(재도전)'} {isDeferredRound && '(표시 문제)'}
            </span>
            
            {/* 진행바 */}
            <div style={{
              width: '100%',
              height: '8px',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
              marginTop: '1rem',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${progress}%`,
                height: '100%',
                background: 'linear-gradient(90deg, var(--crystal-cyan), var(--planet-green))',
                transition: 'width 0.5s ease',
                boxShadow: 'var(--glow-cyan)'
              }}></div>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '0.5rem'
            }}>
              <span style={{ 
                color: 'var(--star-gold)', 
                fontSize: '0.9rem',
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                {hasShield > 0 ? `🛡️ ${Math.max(0, hasShield - shieldsUsed)}` : ''}
              </span>
              <span style={{ 
                color: 'var(--text-muted)', 
                fontSize: '0.8rem',
              }}>
                {currentIdx + 1} / {currentQuestions.length}
                {!reSolveMode && !isDeferredRound && deferredQuestionIds.size > 0 ? ` · 표시 ${deferredQuestionIds.size}` : ''}
              </span>
            </div>
          </div>

          {/* Radar HUD */}
          {hasRadar && (
            <div className="radar-hud glass-card" style={{
              position: 'absolute',
              top: '4.5rem',
              left: '50%',
              transform: 'translateX(-50%)',
              padding: '0.4rem 1rem',
              background: 'rgba(5, 10, 30, 0.8)',
              border: '1px solid var(--crystal-cyan)',
              borderRadius: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              zIndex: 5
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span className="radar-pulse-dot" style={{ 
                  width: 8, height: 8, background: 'var(--crystal-cyan)', borderRadius: '50%' 
                }}></span>
                <span style={{ fontSize: '0.7rem', fontWeight: 900, color: 'var(--crystal-cyan)', letterSpacing: '1px' }}>SCANNER ACTIVE</span>
              </div>
              <div style={{ width: '1px', height: '10px', background: 'rgba(255,255,255,0.2)' }}></div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-bright)' }}>
                ORE DETECTED: <span style={{ color: 'var(--star-gold)' }}>+{sessionCrystals}</span>
              </div>
              {isRadarBonus && (
                <div style={{ 
                  fontSize: '0.6rem', 
                  fontWeight: 900, 
                  color: 'var(--secondary)', 
                  background: 'rgba(255, 107, 129, 0.2)',
                  padding: '2px 6px',
                  borderRadius: '10px',
                  border: '1px solid var(--secondary)'
                }}>BONUS</div>
              )}
            </div>
          )}

          {/* Radar Scan Overlay */}
          <AnimatePresence>
            {showRadarScan && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  zIndex: 200,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'rgba(0, 243, 255, 0.05)'
                }}
              >
                <div className="radar-scanner-line" />
                <motion.div
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  style={{
                    padding: '2rem',
                    background: 'rgba(5, 20, 40, 0.9)',
                    border: '2px solid var(--crystal-cyan)',
                    borderRadius: '20px',
                    textAlign: 'center',
                    boxShadow: '0 0 30px rgba(0, 243, 255, 0.5)'
                  }}
                >
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📡</div>
                  <h3 className="font-title" style={{ color: 'var(--crystal-cyan)', fontSize: '1.5rem', marginBottom: '0.5rem' }}>광석 반응 탐지됨</h3>
                  <p className="font-tech" style={{ color: 'var(--text-bright)', fontSize: '0.9rem' }}>
                    예상 채굴 가능량: <span style={{ color: 'var(--star-gold)', fontWeight: 900 }}>{potentialOre}개+</span>
                  </p>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* 문제 및 이미지 섹션 */}
          <div style={{ textAlign: 'left', marginBottom: '2.5rem' }}>
            {currentQuestion.imageUrl && (
              <motion.div 
                className="space-image-card-wrapper"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ 
                  perspective: '1000px',
                  marginBottom: '2.5rem',
                  display: 'flex',
                  justifyContent: 'center'
                }}
              >
                <div className="space-image-card glass-card">
                  {/* Neon Glow behind image */}
                  <div className="image-neon-glow"></div>
                  <motion.img 
                    src={currentQuestion.imageUrl} 
                    alt="Question" 
                    className="space-question-image"
                  />
                </div>
              </motion.div>
            )}
            
            <h2 className="font-title" style={{ 
              fontSize: isMobile ? '1.4rem' : '1.8rem', 
              color: 'var(--text-bright)',
              lineHeight: 1.4,
              wordBreak: 'keep-all',
              textAlign: 'left'
            }}>
              {formatText(currentQuestion.question)}
            </h2>

            <div style={{
              marginTop: '1rem',
              color: 'var(--text-muted)',
              fontSize: '0.85rem',
              lineHeight: 1.5
            }}>
              답을 고른 뒤 이해 상태를 선택하면 다음 문제로 이동합니다.
              {!reSolveMode && !isDeferredRound && deferredQuestionIds.size > 0 && (
                <span> 표시한 문제 {deferredQuestionIds.size}개는 마지막 문제 뒤에 다시 나옵니다.</span>
              )}
              {isDeferredRound && (
                <span> 표시하고 넘긴 문제입니다. 답을 골라야 결과를 확인할 수 있어요.</span>
              )}
            </div>
          </div>

          {/* 보기 */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
            gap: isMobile ? '0.75rem' : '1rem'
          }}>
            {(currentQuestion?.shuffledOptions || []).map((option, idx) => {
              const multiMode = isMultiAnswer(currentQuestion)
              let btnClass = 'space-option-btn'
              const optionKey = getOptionKey(currentQuestion, option)
              const optionStats = showFeedback
                ? displayedStats.options.find(stat => stat.key === optionKey)
                : null
              const isOptionSelected = multiMode
                ? selectedMultiOptions.has(option.text)
                : userAnswers[currentQuestion.id] === option
              
              if (multiMode) {
                // 멀티 정답 모드: 선택 상태 표시
                if (selectedMultiOptions.has(option.text) && !showFeedback) {
                  btnClass += ' multi-selected'
                }
              }
              
              return (
                <button
                  key={idx}
                  className={btnClass}
                  onClick={(e) => {
                    if (showFeedback || isRebooting) return
                    if (multiMode) {
                      handleMultiSelect(option)
                    } else {
                      handleSelect(option, e)
                    }
                  }}
                  disabled={showFeedback !== null || isRebooting}
                  style={{ 
                    opacity: (showFeedback || isRebooting) && !isOptionSelected ? 0.72 : 1,
                    ...(multiMode && selectedMultiOptions.has(option.text) && !showFeedback ? {
                      border: '2px solid var(--crystal-cyan)',
                      background: 'rgba(0, 243, 255, 0.15)',
                      boxShadow: '0 0 12px rgba(0, 243, 255, 0.3)'
                    } : {}),
                    ...(showFeedback && isOptionSelected ? {
                      border: '2px solid rgba(0, 243, 255, 0.55)',
                      background: 'linear-gradient(135deg, rgba(0,243,255,0.16), rgba(96,165,250,0.1))',
                      boxShadow: '0 0 18px rgba(0, 243, 255, 0.2)'
                    } : {})
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {multiMode && (
                      <span style={{ 
                        fontSize: '1.1rem',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}>
                        {selectedMultiOptions.has(option.text) ? '☑' : '☐'}
                      </span>
                    )}
                    <span>{formatText(option.text)}</span>
                    {optionStats && (
                      <span style={{
                        color: isOptionSelected ? 'var(--crystal-cyan)' : 'var(--text-muted)',
                        fontSize: '0.82em',
                        fontWeight: 900,
                        opacity: 0.95
                      }}>
                        ({optionStats.percent}%)
                      </span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>

          {showFeedback && pendingResult && (
            <MotionReactionPanel
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              style={{
                marginTop: '1.5rem',
                padding: '1.2rem',
                borderRadius: '18px',
                border: `1px solid ${pendingResult.isCorrect ? 'rgba(34,197,94,0.45)' : 'rgba(248,113,113,0.45)'}`,
                background: pendingResult.isCorrect
                  ? 'linear-gradient(135deg, rgba(34,197,94,0.13), rgba(0,243,255,0.07))'
                  : 'linear-gradient(135deg, rgba(248,113,113,0.13), rgba(168,85,247,0.08))',
                boxShadow: pendingResult.isCorrect ? '0 0 22px rgba(34,197,94,0.12)' : '0 0 22px rgba(248,113,113,0.12)'
              }}
            >
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '1rem',
                flexWrap: 'wrap',
                marginBottom: '1rem'
              }}>
                <div>
                  <div style={{
                    color: 'var(--crystal-cyan)',
                    fontWeight: 900,
                    fontSize: '1.15rem',
                    marginBottom: '0.25rem'
                  }}>
                    채점 완료
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                    보기 옆 괄호에 친구들이 고른 비율만 표시됩니다.
                  </div>
                </div>
                <div style={{
                  minWidth: 120,
                  padding: '0.75rem 1rem',
                  borderRadius: '14px',
                  background: 'rgba(0,0,0,0.22)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  textAlign: 'center'
                }}>
                  <div style={{ color: 'var(--crystal-cyan)', fontWeight: 900, fontSize: '1.5rem' }}>{displayedStats.correctRate}%</div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '0.72rem' }}>이 문제 정답률</div>
                </div>
                {currentQuestion && (
                  <div style={{
                    flex: '1 1 320px',
                    minHeight: 76,
                    padding: '0.75rem 0.9rem',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, rgba(250,204,21,0.11), rgba(15,23,42,0.28))',
                    border: '1px solid rgba(250,204,21,0.26)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '0.8rem'
                  }}>
                    <div>
                      <div style={{ color: '#fef3c7', fontWeight: 950, fontSize: '0.95rem' }}>
                        {hasMistakeExplanation ? '오답노트에 저장' : '운영툴 발행 대기'}
                      </div>
                      <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.16rem', lineHeight: 1.35 }}>
                        {hasMistakeExplanation
                          ? 'AI 설명 카드로 바로 발행합니다.'
                          : '해설 완성 후 카드로 발행됩니다.'}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddToMistakeNotebook}
                      disabled={createMistakeCard.isPending || currentQuestionSaved}
                      style={{
                        minHeight: 40,
                        padding: '0.58rem 0.9rem',
                        borderRadius: '12px',
                        border: currentQuestionSaved ? '1px solid rgba(74,222,128,0.45)' : '1px solid rgba(250,204,21,0.54)',
                        background: currentQuestionSaved ? 'rgba(34,197,94,0.14)' : 'rgba(250,204,21,0.14)',
                        color: currentQuestionSaved ? '#bbf7d0' : '#fde68a',
                        fontWeight: 900,
                        whiteSpace: 'nowrap',
                        cursor: createMistakeCard.isPending || currentQuestionSaved ? 'not-allowed' : 'pointer'
                      }}
                    >
                      {createMistakeCard.isPending ? '저장 중...' : currentQuestionSaved ? '처리됨' : '오답노트에 담기'}
                    </button>
                    {mistakeCardMessage && (
                      <div style={{
                        flexBasis: '100%',
                        color: mistakeCardMessage.includes('못') || mistakeCardMessage.includes('없습니다') ? '#fecaca' : '#bbf7d0',
                        fontSize: '0.8rem',
                        fontWeight: 800
                      }}>
                        {mistakeCardMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div style={{
                margin: '1.15rem 0 0.7rem',
                padding: '0 0.2rem'
              }}>
                <div style={{ color: 'var(--text-bright)', fontWeight: 950, marginBottom: '0.18rem', fontSize: '1.05rem' }}>
                  내 이해 상태를 선택하세요
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                  아래 버튼 중 하나를 눌러야 집계가 저장되고 다음 문제로 이동합니다.
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0.75rem' }}>
                {QUIZ_REACTION_CHOICES.map(choice => {
                  const reactionCounts = displayedStats.reactionCounts || {}
                  const reactionTotal = Object.values(reactionCounts).reduce((sum, value) => sum + Number(value || 0), 0)
                  const count = Number(reactionCounts[choice.id] || 0)
                  const percent = reactionTotal > 0 ? Math.round((count / reactionTotal) * 100) : 0
                  const disabledByAnswer =
                    (pendingResult.isCorrect && ['missed_condition', 'solution_blocked', 'careless_mistake'].includes(choice.id)) ||
                    (!pendingResult.isCorrect && ['understood', 'uncertain_correct'].includes(choice.id))

                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={isSavingReaction || disabledByAnswer}
                      onClick={() => {
                        soundManager.playClick()
                        handleQuizReaction(choice.id)
                      }}
                      style={{
                        minHeight: isMobile ? 70 : 82,
                        padding: isMobile ? '0.85rem' : '1rem',
                        borderRadius: isMobile ? '14px' : '18px',
                        border: `1px solid ${disabledByAnswer ? 'rgba(255,255,255,0.08)' : `${choice.tone}88`}`,
                        background: disabledByAnswer
                          ? 'linear-gradient(145deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))'
                          : `linear-gradient(145deg, ${choice.tone}2f, rgba(15,23,42,0.74) 58%, ${choice.tone}20)`,
                        color: disabledByAnswer ? 'rgba(226,232,240,0.36)' : 'var(--text-bright)',
                        cursor: disabledByAnswer || isSavingReaction ? 'not-allowed' : 'pointer',
                        textAlign: 'left',
                        opacity: disabledByAnswer ? 0.55 : 1,
                        boxShadow: disabledByAnswer
                          ? 'inset 0 1px 0 rgba(255,255,255,0.04)'
                          : `0 14px 0 rgba(0,0,0,0.26), 0 18px 34px ${choice.tone}22, inset 0 1px 0 rgba(255,255,255,0.18)`,
                        transform: disabledByAnswer ? 'translateY(3px)' : 'translateY(0)',
                        transition: 'transform 0.16s ease, box-shadow 0.16s ease, filter 0.16s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                    >
                      {!disabledByAnswer && (
                        <span style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          height: '42%',
                          background: 'linear-gradient(180deg, rgba(255,255,255,0.18), rgba(255,255,255,0))',
                          pointerEvents: 'none'
                        }} />
                      )}
                      <div style={{ position: 'relative', fontWeight: 950, lineHeight: 1.35, fontSize: isMobile ? '0.92rem' : '1rem' }}>{choice.label}</div>
                      <div style={{ marginTop: '0.3rem', color: disabledByAnswer ? 'rgba(226,232,240,0.28)' : choice.tone, fontSize: '0.76rem', fontWeight: 800 }}>
                        익명 반응 {count}명{reactionTotal > 0 ? ` · ${percent}%` : ''}
                      </div>
                    </button>
                  )
                })}
              </div>
              {reactionError && (
                <div style={{ marginTop: '0.7rem', color: '#fecaca', fontSize: '0.85rem' }}>
                  {reactionError}
                </div>
              )}
              {isSavingReaction && (
                <div style={{ marginTop: '0.7rem', color: 'var(--crystal-cyan)', fontSize: '0.85rem', fontWeight: 800 }}>
                  반응 저장 중...
                </div>
              )}
            </MotionReactionPanel>
          )}

          {!showFeedback && !isRebooting && !reSolveMode && !isDeferredRound && (
            <div style={{
              marginTop: '1.25rem',
              display: 'flex',
              justifyContent: 'center'
            }}>
              <button
                type="button"
                onClick={handleMarkAndSkip}
                style={{
                  minHeight: 44,
                  padding: '0.75rem 1.25rem',
                  borderRadius: '999px',
                  border: '1px solid rgba(251, 191, 36, 0.55)',
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.18), rgba(15,23,42,0.72))',
                  color: '#fde68a',
                  fontSize: '0.95rem',
                  fontWeight: 900,
                  cursor: 'pointer',
                  boxShadow: '0 10px 26px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.12)'
                }}
              >
                표시하고 넘기기
              </button>
            </div>
          )}

          {/* 멀티 정답 안내 및 제출 버튼 */}
          {isMultiAnswer(currentQuestion) && !showFeedback && !isRebooting && (
            <div style={{ 
              marginTop: '1.5rem', 
              display: 'flex', 
              flexDirection: 'column',
              alignItems: 'center', 
              gap: '0.8rem' 
            }}>
              <span style={{ 
                color: 'var(--star-gold)', 
                fontSize: '0.9rem', 
                fontWeight: 700,
                background: 'rgba(255, 215, 0, 0.1)',
                padding: '0.4rem 1rem',
                borderRadius: '20px',
                border: '1px solid rgba(255, 215, 0, 0.3)'
              }}>
                ⚡ 정답 {getCorrectCount(currentQuestion)}개를 모두 선택하세요 ({selectedMultiOptions.size}개 선택됨)
              </span>
              <button
                onClick={(e) => handleMultiSubmit(e)}
                disabled={selectedMultiOptions.size === 0}
                style={{
                  padding: '0.8rem 2.5rem',
                  borderRadius: '12px',
                  border: 'none',
                  fontSize: '1.1rem',
                  fontWeight: 800,
                  cursor: selectedMultiOptions.size === 0 ? 'not-allowed' : 'pointer',
                  background: selectedMultiOptions.size === 0 
                    ? 'rgba(255,255,255,0.1)' 
                    : 'linear-gradient(135deg, var(--crystal-cyan), #00b4d8)',
                  color: selectedMultiOptions.size === 0 ? 'var(--text-muted)' : 'white',
                  boxShadow: selectedMultiOptions.size > 0 ? '0 4px 15px rgba(0, 243, 255, 0.3)' : 'none',
                  transition: 'all 0.3s ease'
                }}
              >
                ✓ 정답 제출하기
              </button>
            </div>
          )}
          
          {/* 하단 중앙 기능 버튼 (영상 학습과 통일성) */}
          {!isResultMode && (
            <div style={{ 
              marginTop: '3rem', 
              display: 'flex', 
              justifyContent: 'center' 
            }}>
              <button 
                onClick={handleExitClick}
                disabled={isSavingExit}
                className="hud-btn secondary glass"
                style={{ 
                  padding: '0.8rem 2.5rem', 
                  fontSize: '1.1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.6rem',
                  borderRadius: '12px',
                  background: isSavingExit ? 'rgba(0,243,255,0.15)' : 'rgba(255,255,255,0.05)',
                  border: isSavingExit ? '1px solid var(--crystal-cyan)' : '1px solid rgba(255,255,255,0.1)',
                  color: 'white',
                  cursor: isSavingExit ? 'not-allowed' : 'pointer',
                  transition: 'all 0.3s ease',
                  opacity: isSavingExit ? 0.85 : 1
                }}
                onMouseEnter={(e) => {
                  if (!isSavingExit) {
                    e.target.style.background = 'rgba(255,255,255,0.12)'
                    e.target.style.transform = 'translateY(-2px)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSavingExit) {
                    e.target.style.background = 'rgba(255,255,255,0.05)'
                    e.target.style.transform = 'translateY(0)'
                  }
                }}
              >
                {isSavingExit ? (
                  <><span className="spinner-inline"></span> 저장 중...</>
                ) : (
                  <>📋 오늘은 여기까지</>
                )}
              </button>
            </div>
          )}

          {/* 시스템 리부트 오버레이 */}
          <AnimatePresence>
            {isRebooting && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  background: 'rgba(255, 0, 0, 0.2)',
                  backdropFilter: 'blur(10px)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 100,
                  borderRadius: '20px'
                }}
              >
                <div style={{
                  color: '#ff4d4d',
                  fontSize: '2rem',
                  fontWeight: 900,
                  marginBottom: '1rem',
                  textShadow: '0 0 20px #ff0000'
                }}>
                  ⚠️ SYSTEM REBOOT
                </div>
                <div style={{ color: 'white', opacity: 0.8 }}>
                  에너지 손실로 인한 시스템 복구 중... ({Math.min((retryCount + 1) * 3, 9)}s)
                </div>
                {hasShield - shieldsUsed >= 0 && shieldsUsed > 0 && (
                  <div style={{ color: 'var(--star-gold)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
                    🛡️ 광자 쉴드가 에너지를 보호했습니다! (남은 방어: {hasShield - shieldsUsed}회)
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* 부유 마커 애니메이션 */}
          <AnimatePresence>
            {floatingMarkers.map(marker => (
              <motion.div
                key={marker.id}
                initial={{ 
                  opacity: 0, 
                  y: 0,
                  x: marker.x - 50,
                  top: marker.y - 40 // Starting closer to the click point
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0], 
                  y: marker.type === 'gain' ? -80 : 80,
                  scale: marker.type === 'gain' ? [1, 1.4, 1.2] : [1, 0.9, 0.7]
                }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1.2, ease: "easeOut" }}
                style={{
                  position: 'fixed',
                  left: 0,
                  top: 0,
                  zIndex: 9999,
                  pointerEvents: 'none',
                  color: '#df5fff',
                  fontSize: '2rem',
                  fontWeight: 900,
                  textShadow: '0 0 10px rgba(0,0,0,0.5), -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span style={{ 
                  color: marker.type === 'gain' ? '#50C878' : '#ff4d4d',
                  fontSize: '1.2em'
                }}>
                  💎
                </span> 
                <span style={{ color: marker.type === 'gain' ? '#50C878' : '#ff4d4d' }}>
                  {marker.text}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>

          <QuestionModal 
            isOpen={isQuestionModalOpen}
            onClose={handleCloseQuestionModal}
            quizContext={modalContext}
          />
        </div>
      </div>

      {/* AI Explanation Panel */}
      <AnimatePresence>
        {isAiExplanationOpen && (
          <motion.div
            initial={isMobile ? { y: '100%' } : { x: '100%' }}
            animate={isMobile ? { y: 0 } : { x: 0 }}
            exit={isMobile ? { y: '100%' } : { x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed',
              zIndex: 1000,
              background: 'rgba(10, 10, 25, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid var(--planet-purple)',
              boxShadow: '0 0 30px rgba(168, 85, 247, 0.3)',
              overflowY: 'auto',
              ...(isMobile ? {
                bottom: 0,
                left: 0,
                right: 0,
                height: '80vh',
                borderTopLeftRadius: '20px',
                borderTopRightRadius: '20px',
                borderBottom: 'none'
              } : {
                top: 0,
                right: 0,
                width: '400px',
                height: '100vh',
                borderLeft: '2px solid var(--planet-purple)',
                borderTop: 'none',
                borderBottom: 'none',
                borderRight: 'none'
              })
            }}
          >
            <div style={{ padding: '2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', position: 'sticky', top: 0, background: 'rgba(10, 10, 25, 0.95)', zIndex: 10, paddingBottom: '1rem', borderBottom: '1px solid rgba(168, 85, 247, 0.3)' }}>
                <h3 style={{ color: 'var(--planet-purple)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px', fontSize: '1.2rem' }}>
                  🤖 AI 설명
                </h3>
                <button 
                  onClick={() => setIsAiExplanationOpen(false)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}
                >✕</button>
              </div>
              <div style={{ color: 'var(--text-bright)', lineHeight: 1.6, paddingBottom: '2rem' }}>
                {currentQuestion?.hint && (
                  <MissionMarkdownViewer text={currentQuestion.hint} />
                )}
                
                {currentQuestion?.explanation && (
                  <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid rgba(168, 85, 247, 0.3)' }}>
                    <button 
                      onClick={() => setIsDetailedExplanationOpen(!isDetailedExplanationOpen)}
                      style={{
                        background: 'rgba(168, 85, 247, 0.1)',
                        border: '1px solid var(--planet-purple)',
                        color: 'var(--planet-purple)',
                        padding: '0.8rem 1.5rem',
                        borderRadius: '20px',
                        fontSize: '0.95rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        width: '100%',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => e.target.style.background = 'rgba(168, 85, 247, 0.2)'}
                      onMouseLeave={(e) => e.target.style.background = 'rgba(168, 85, 247, 0.1)'}
                    >
                      <span style={{ pointerEvents: 'none' }}>💡 자세한 설명 보기</span>
                      <span style={{ pointerEvents: 'none' }}>{isDetailedExplanationOpen ? '▲' : '▼'}</span>
                    </button>
                    
                    <AnimatePresence>
                      {isDetailedExplanationOpen && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          style={{ overflow: 'hidden', marginTop: '1rem' }}
                        >
                          <div style={{ padding: '1.5rem', background: 'rgba(0,0,0,0.3)', borderRadius: '15px', border: '1px solid rgba(255,255,255,0.05)' }}>
                            <MissionMarkdownViewer text={currentQuestion.explanation} />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  )
}
