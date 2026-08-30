import { useState, useMemo, useEffect, useId, useRef } from 'react'
import ObserveMode from '../modes/ObserveMode.jsx'
import ExploreMode from '../modes/ExploreMode.jsx'
import CodeMode from '../modes/CodeMode.jsx'
import UnderstandingCheckMode from '../modes/UnderstandingCheckMode.jsx'
import TransferChallengeMode from '../modes/TransferChallengeMode.jsx'
import AiResearchConfirmModal from '../aiCoach/AiResearchConfirmModal.jsx'
import { buildExternalAiCoachPrompt } from '../aiCoach/buildExternalAiCoachPrompt.js'
import { createMissionStateMachine, MISSION_STATES } from './missionStateMachine.js'
import { createAlgorithmConstellationMockGateway } from '../services/AlgorithmConstellationMockGateway.js'
import { createSustainedBlurGuard } from '../../../../utils/quizFocusGuard.js'
import { auth } from '../../../../firebase.js'
import {
  loadAlgorithmDraft,
  saveAlgorithmDraft,
  loadCompletedPythonConceptIds,
  markPythonConceptCompleted,
} from '../services/algorithmDraftStorage.js'
import FirstEncounterCard from '../scaffold/FirstEncounterCard.jsx'
import { getConceptsNeededForProblem } from '../../shared/python/pythonConceptRegistry.js'
import { getPatternsNeededForProblem } from '../../shared/patterns/problemSolvingPatternRegistry.js'

function normalizeCallableErrorCode(error) {
  return String(error?.code || '')
    .replace(/^functions\//, '')
    .replaceAll('-', '_')
    .toUpperCase()
}

// Attempts in these states are read-only on the server; every submission would
// fail with FAILED_PRECONDITION until a fresh attempt (new requestId) is started.
const TERMINAL_ATTEMPT_STATES = new Set(['FINALIZED', 'EXPIRED', 'ABANDONED', 'INTEGRITY_TERMINATED'])

// The client-bundle mock judge ships public answer keys, so it must never grade
// a signed-in student in production (gateway contract: "Zero automatic mock
// fallback in production"). It stays available for DEV preview and for
// unauthenticated guests, whose local pilot progress never reaches the ledger.
function isMockFallbackAllowed() {
  return Boolean(import.meta.env.DEV) || !auth.currentUser
}

export default function AlgorithmMissionShell({
  kernel,
  initialShell = 'explorer',
  gateway,
  intent = 'learn',
  draftOwnerKey,
  allowBypass = false,
  onExit,
  onProgressUpdate,
}) {
  const safeOwnerKey = draftOwnerKey || auth.currentUser?.uid || 'guest_pilot'
  const existingDraft = useMemo(() => {
    return loadAlgorithmDraft({ problemId: kernel.id, problemVersion: kernel.version, ownerKey: safeOwnerKey })
  }, [kernel.id, kernel.version, safeOwnerKey])

  const [shell, setShell] = useState(existingDraft?.shell || initialShell)
  const [fsmState, setFsmState] = useState(existingDraft?.fsmState || MISSION_STATES.OBSERVE)
  const [observeCompleted, setObserveCompleted] = useState(
    Boolean(existingDraft?.observeCompleted || existingDraft?.fsmState === MISSION_STATES.EXPLORE || existingDraft?.fsmState === MISSION_STATES.CODE || existingDraft?.fsmState === MISSION_STATES.RUN_SUCCESS || existingDraft?.fsmState === MISSION_STATES.UNDERSTANDING_CHECK || existingDraft?.fsmState === MISSION_STATES.TRANSFER_CHALLENGE || existingDraft?.fsmState === MISSION_STATES.COMPLETE)
  )
  const [exploreCompleted, setExploreCompleted] = useState(
    Boolean(existingDraft?.exploreCompleted || existingDraft?.fsmState === MISSION_STATES.CODE || existingDraft?.fsmState === MISSION_STATES.RUN_SUCCESS || existingDraft?.fsmState === MISSION_STATES.UNDERSTANDING_CHECK || existingDraft?.fsmState === MISSION_STATES.TRANSFER_CHALLENGE || existingDraft?.fsmState === MISSION_STATES.COMPLETE)
  )
  const [attemptSession, setAttemptSession] = useState(null)
  const [currentProgress, setCurrentProgress] = useState({})
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [transferData, setTransferData] = useState(null)
  const [completionResult, setCompletionResult] = useState(existingDraft?.completionResult || null)
  const [understandingChallenge, setUnderstandingChallenge] = useState(null)
  const [currentCode, setCurrentCode] = useState(existingDraft?.code || kernel.modes?.code?.starterCode || '')
  const [activeMisconception, setActiveMisconception] = useState(null)
  const [recentTraceScenes, setRecentTraceScenes] = useState([])
  const [recentLearningEvidence, setRecentLearningEvidence] = useState([])
  const [recentPublicTestError, setRecentPublicTestError] = useState('')
  const [completedConceptIds, setCompletedConceptIds] = useState(() => new Set(
    loadCompletedPythonConceptIds({ ownerKey: safeOwnerKey })
  ))
  const generatedRequestId = `start_${useId().replace(/[^A-Za-z0-9_-]/g, '_')}`
  const initialRequestId = existingDraft?.requestId || generatedRequestId
  const [activeRequestId, setActiveRequestId] = useState(initialRequestId)
  const [focusLockReason, setFocusLockReason] = useState('')
  const [focusLockPending, setFocusLockPending] = useState(false)
  const [aiResearchActive, setAiResearchActive] = useState(intent === 'ai_research')
  const [studentErrorMessage, setStudentErrorMessage] = useState(null)
  const lastIntegrityEventAt = useRef(0)
  const recordedScaffoldLevels = useRef(new Set())
  const neededConcepts = useMemo(() => {
    const py = getConceptsNeededForProblem(kernel.id, kernel.pythonConcepts)
    const pat = getPatternsNeededForProblem(kernel.id, kernel.thinkingPatterns)
    return [...py, ...pat]
  }, [kernel.id, kernel.pythonConcepts, kernel.thinkingPatterns])
  const pendingFirstEncounter = neededConcepts.find(
    (concept) => !completedConceptIds.has(concept.conceptId || concept.patternId)
  ) || null

  // Resilient Gateway: use provided gateway with seamless fallback to client gateway if offline or error
  const [runtimeGateway, setRuntimeGateway] = useState(() => {
    if (gateway) return gateway
    return createAlgorithmConstellationMockGateway()
  })

  useEffect(() => {
    if (!gateway) return undefined
    const timeoutId = window.setTimeout(() => setRuntimeGateway(gateway), 0)
    return () => window.clearTimeout(timeoutId)
  }, [gateway])

  const fsm = useMemo(() => {
    return createMissionStateMachine({
      initialState: existingDraft?.fsmState || MISSION_STATES.OBSERVE,
      onTransition: ({ state }) => setFsmState(state),
    })
  }, [existingDraft?.fsmState])

  // Guarded transition helper to prevent bypassing prerequisites
  const handleTransition = (targetState) => {
    if (shell === 'pro') {
      fsm.transition(targetState)
      return
    }
    if (targetState === MISSION_STATES.EXPLORE) {
      if (!observeCompleted && !allowBypass && fsmState === MISSION_STATES.OBSERVE) {
        return
      }
    }
    if (targetState === MISSION_STATES.CODE) {
      if ((!observeCompleted || !exploreCompleted) && !allowBypass && (fsmState === MISSION_STATES.OBSERVE || fsmState === MISSION_STATES.EXPLORE)) {
        return
      }
    }
    fsm.transition(targetState)
  }

  // Start Attempt Session on mount
  useEffect(() => {
    let isMounted = true
    async function initSession() {
      try {
        const session = await runtimeGateway.startAttempt({
          problemId: kernel.id,
          problemVersion: kernel.version,
          shell: initialShell,
          intent,
          requestId: activeRequestId,
        })
        if (isMounted) {
          setAttemptSession(session)
          setCurrentProgress(session.progress || {})
        }
      } catch (err) {
        console.warn('Algorithm attempt start failed:', err)
        if (!isMounted) return
        if (isMockFallbackAllowed()) {
          try {
            const fallbackGateway = createAlgorithmConstellationMockGateway()
            const fallbackSession = await fallbackGateway.startAttempt({
              problemId: kernel.id,
              problemVersion: kernel.version,
              shell: initialShell,
              intent,
              requestId: activeRequestId,
            })
            setRuntimeGateway(fallbackGateway)
            setAttemptSession(fallbackSession)
            setCurrentProgress(fallbackSession.progress || {})
            return
          } catch (fallbackErr) {
            console.error('Both primary and fallback gateways failed:', fallbackErr)
          }
        }
        if (['RATE_LIMITED', 'RESOURCE_EXHAUSTED'].includes(normalizeCallableErrorCode(err))) {
          setStudentErrorMessage({
            title: '잠시 후 다시 시도해 주세요',
            description: '연속 요청이 많아 채점소가 잠시 숨을 고르고 있어요. 잠시 후 다시 시도해 주세요.',
          })
        } else {
          setStudentErrorMessage({
            title: '탐사 시작 오류',
            description: '채점소 통신이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.',
          })
        }
      }
    }
    initSession()
    return () => {
      isMounted = false
    }
  }, [activeRequestId, initialShell, intent, kernel.id, kernel.version, runtimeGateway])

  // Debounced draft auto-save effect
  useEffect(() => {
    const timer = setTimeout(() => {
      saveAlgorithmDraft({
        problemId: kernel.id,
        problemVersion: kernel.version,
        ownerKey: safeOwnerKey,
        requestId: activeRequestId,
        attemptId: attemptSession?.attemptId || existingDraft?.attemptId || null,
        code: currentCode,
        fsmState,
        shell,
        observeCompleted,
        exploreCompleted,
        stars: completionResult?.stars || currentProgress?.bestStars || (fsmState === MISSION_STATES.COMPLETE ? 3 : 0),
        completionResult,
      })
    }, 1000)
    return () => clearTimeout(timer)
  }, [activeRequestId, attemptSession?.attemptId, completionResult, currentCode, currentProgress?.bestStars, existingDraft?.attemptId, exploreCompleted, fsmState, kernel.id, kernel.version, observeCompleted, safeOwnerKey, shell])

  // Integrity Guard:
  // - Learn mode: Zero focus lock (gentle learning).
  // - AI research mode: Marked via dedicated button only.
  // - Independent return: Soft integrity (flags independent evidence hold, does NOT strip stars).
  // - Arena mode: Strict focus lock.
  useEffect(() => {
    if (!attemptSession?.attemptId || aiResearchActive || fsmState === MISSION_STATES.COMPLETE) return undefined
    if (intent === 'learn') return undefined // Policy: Learn mode allows window switching

    const reportViolation = (reason) => {
      const currentTime = Date.now()
      if (currentTime - lastIntegrityEventAt.current < 4_000) return
      lastIntegrityEventAt.current = currentTime

      if (intent === 'arena') {
        setFocusLockReason(reason)
        setFocusLockPending(true)
      }

      runtimeGateway.recordAssistance({
        attemptId: attemptSession.attemptId,
        eventId: `integrity_${currentTime}`,
        source: 'integrity-focus',
        stage: 'implementation',
        scaffoldLevel: 0,
        answerExposure: 'none',
      }).then(() => setFocusLockPending(false)).catch((error) => {
        console.error('Failed to record algorithm integrity event:', error)
      })
    }

    const blurGuard = createSustainedBlurGuard({
      shouldConfirm: () => !document.hasFocus() || document.visibilityState === 'hidden',
      onConfirmed: () => reportViolation('장시간 다른 화면을 보고 있어 집중 탐사 상태가 해제되었습니다.'),
      delayMs: intent === 'independent_return' ? 15_000 : 1_800,
    })

    const handleBlur = () => blurGuard.start()
    const handleFocus = () => blurGuard.cancel()
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        if (intent === 'arena') reportViolation('화면 전환이 감지되었습니다.')
        blurGuard.start()
      } else {
        blurGuard.cancel()
      }
    }
    const preventArenaExport = (event) => {
      if (intent !== 'arena') return
      event.preventDefault()
      reportViolation('아레나에서는 복사·붙여넣기를 사용할 수 없습니다.')
    }

    window.addEventListener('blur', handleBlur)
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    if (intent === 'arena') {
      document.addEventListener('copy', preventArenaExport)
      document.addEventListener('cut', preventArenaExport)
      document.addEventListener('paste', preventArenaExport)
      document.addEventListener('contextmenu', preventArenaExport)
    }
    return () => {
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('copy', preventArenaExport)
      document.removeEventListener('cut', preventArenaExport)
      document.removeEventListener('paste', preventArenaExport)
      document.removeEventListener('contextmenu', preventArenaExport)
      blurGuard.dispose()
    }
  }, [aiResearchActive, attemptSession?.attemptId, fsmState, intent, runtimeGateway])

  // 1. Request Scaffold Hint
  const handleRequestHint = async ({ level = 1, source = 'hint', answerExposure = 'partial' } = {}) => {
    const session = await getOrInitAttemptSession()
    if (recordedScaffoldLevels.current.has(level)) return { ok: true, duplicated: true }
    try {
      const result = await runtimeGateway.recordAssistance({
        attemptId: session.attemptId,
        eventId: `scaffold_level_${level}`,
        source,
        stage: 'implementation',
        scaffoldLevel: level,
        answerExposure,
      })
      recordedScaffoldLevels.current.add(level)
      return result
    } catch (err) {
      console.error('Failed to record scaffold assistance:', err)
      throw new Error('지원 기록을 확인하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.')
    }
  }

  // 2. AI Prompt Copy Confirmation
  const handleConfirmAiCopy = async () => {
    const session = await getOrInitAttemptSession()
    await runtimeGateway.recordAssistance({
      attemptId: session.attemptId,
      eventId: `ai_${Date.now()}`,
      source: 'external-ai',
      stage: 'strategy',
      scaffoldLevel: 3,
      answerExposure: 'unknown',
    })
    setAiResearchActive(true)
  }

  const startAttemptOn = async (gatewayImpl, requestId) => gatewayImpl.startAttempt({
    problemId: kernel.id,
    problemVersion: kernel.version,
    shell: initialShell,
    intent,
    requestId,
  })

  // A finished attempt can never accept submissions again. Rotating the
  // requestId starts a fresh authoritative attempt so "다시 풀기 (복습)" works
  // instead of silently degrading every submit to the client mock.
  const rotateFinishedAttempt = async () => {
    const rotatedRequestId = `start_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
    saveAlgorithmDraft({
      problemId: kernel.id,
      problemVersion: kernel.version,
      ownerKey: safeOwnerKey,
      requestId: rotatedRequestId,
      attemptId: null,
      code: currentCode,
      fsmState,
      shell,
      observeCompleted,
      exploreCompleted,
      stars: completionResult?.stars || currentProgress?.bestStars || 0,
      completionResult,
    })
    setActiveRequestId(rotatedRequestId)
    const session = await startAttemptOn(runtimeGateway, rotatedRequestId)
    setAttemptSession(session)
    setCurrentProgress(session.progress || {})
    return session
  }

  const getOrInitAttemptSession = async () => {
    if (attemptSession?.attemptId) {
      if (!TERMINAL_ATTEMPT_STATES.has(attemptSession.state)) return attemptSession
      return rotateFinishedAttempt()
    }
    if (!isMockFallbackAllowed()) {
      throw new Error('채점소와 아직 연결되지 않았어요. 잠시 후 다시 시도해 주세요.')
    }
    const fallback = createAlgorithmConstellationMockGateway()
    const session = await startAttemptOn(fallback, activeRequestId)
    setRuntimeGateway(fallback)
    setAttemptSession(session)
    setCurrentProgress(session.progress || {})
    return session
  }

  // 3. Submit Base Code
  const handleSubmitBaseCode = async ({ code, onFeedback }) => {
    setStudentErrorMessage(null)
    try {
      const session = await getOrInitAttemptSession()
      let res
      try {
        res = await runtimeGateway.submitBase({
          attemptId: session.attemptId,
          submissionId: `sub_base_${Date.now()}`,
          code,
        })
      } catch (err) {
        if (!isMockFallbackAllowed()) throw err
        console.warn('Primary submitBase failed, falling back to preview grading:', err)
        const fallback = createAlgorithmConstellationMockGateway()
        const fbSession = await fallback.startAttempt({
          problemId: kernel.id,
          problemVersion: kernel.version,
          shell: initialShell,
          intent,
          requestId: activeRequestId,
        })
        setRuntimeGateway(fallback)
        setAttemptSession(fbSession)
        res = await fallback.submitBase({
          attemptId: fbSession.attemptId,
          submissionId: `sub_base_${Date.now()}`,
          code,
        })
      }

      onFeedback?.(res)
      if (res?.resultStar) {
        if (res.understandingChallenge) {
          setUnderstandingChallenge(res.understandingChallenge)
        }
        fsm.transition(MISSION_STATES.RUN_SUCCESS)
      }
    } catch (err) {
      console.error('All base code submissions failed:', err)
      setStudentErrorMessage({
        title: '제출 오류',
        description: err.message || '베이스 코드 제출 중 오류가 발생했습니다.',
      })
    }
  }

  // 4. Submit Understanding Evidence
  const handleSubmitUnderstanding = async ({ challengeId, answers }) => {
    try {
      const session = await getOrInitAttemptSession()
      try {
        return await runtimeGateway.submitUnderstanding({
          attemptId: session.attemptId,
          challengeId,
          answers,
        })
      } catch (err) {
        if (!isMockFallbackAllowed()) throw err
        console.warn('Primary submitUnderstanding failed, falling back to preview grading:', err)
        const fallback = createAlgorithmConstellationMockGateway()
        return await fallback.submitUnderstanding({
          attemptId: session.attemptId,
          challengeId,
          answers,
        })
      }
    } catch (err) {
      console.error('Understanding check failed:', err)
      setStudentErrorMessage({
        title: '이해 확인 오류',
        description: err.message || '이해 확인을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.',
      })
      return { passed: false }
    }
  }

  // 5. Issue Transfer Challenge
  const handleProceedToTransfer = async () => {
    try {
      const session = await getOrInitAttemptSession()
      let res
      try {
        res = await runtimeGateway.issueTransfer({
          attemptId: session.attemptId,
        })
      } catch (err) {
        if (!isMockFallbackAllowed()) throw err
        console.warn('Primary issueTransfer failed, falling back to preview grading:', err)
        const fallback = createAlgorithmConstellationMockGateway()
        res = await fallback.issueTransfer({
          attemptId: session.attemptId,
        })
      }
      setTransferData(res)
      fsm.transition(MISSION_STATES.TRANSFER_CHALLENGE)
    } catch (err) {
      alert(`전이 문제 발급 오류: ${err.message}`)
    }
  }

  // 6. Submit Transfer Code
  const handleSubmitTransfer = async ({ challengeToken, transferCode }) => {
    try {
      const session = await getOrInitAttemptSession()
      let res
      try {
        res = await runtimeGateway.submitTransfer({
          attemptId: session.attemptId,
          challengeToken,
          transferCode,
        })
      } catch (err) {
        if (!isMockFallbackAllowed()) throw err
        console.warn('Primary submitTransfer failed, falling back to preview grading:', err)
        const fallback = createAlgorithmConstellationMockGateway()
        res = await fallback.submitTransfer({
          attemptId: session.attemptId,
          challengeToken,
          transferCode,
        })
      }
      if (res?.passed) {
        const nextProgress = {
          problemId: kernel.id,
          bestStars: Math.max(currentProgress?.bestStars || 0, res.stars || 3),
          masteryStatus: res.masteryStatus,
          nextReturnAt: res.nextReturnAt,
          masteryHoldReasons: res.masteryHoldReasons || [],
          // Preview (mock) results must never outrank server-authoritative
          // records when the hub merges progress.
          source: res.authoritative === false ? 'local-preview' : 'server',
        }
        setCompletionResult(res)
        setCurrentProgress((prev) => ({ ...prev, ...nextProgress }))
        onProgressUpdate?.(nextProgress)
      }
      return res
    } catch (err) {
      console.error('Submit transfer failed:', err)
      return { passed: false, error: err.message }
    }
  }

  const generatedPrompt = buildExternalAiCoachPrompt({
    problemTitle: kernel.identity?.studentTitle,
    learningObjective: kernel.learning?.objective,
    studentCode: currentCode,
    traceScenes: recentTraceScenes,
    learningEvidence: recentLearningEvidence,
    misconceptionDiagnosis: activeMisconception,
    publicTestError: recentPublicTestError,
  })

  // The callable keeps its payload minimal and returns only the authoritative
  // transfer identity and executable starter. Reattach student-facing context
  // from the matching public kernel while letting signed server fields win.
  const issuedTransferChallenge =
    transferData?.transferChallenge || transferData?.challenge || null
  const publicTransferChallenges = kernel.assessment?.transferChallenges || []
  const matchingPublicTransferChallenge = issuedTransferChallenge
    ? publicTransferChallenges.find(
        (challenge) =>
          challenge.transferChallengeId ===
          issuedTransferChallenge.transferChallengeId,
      )
    : publicTransferChallenges[0]
  const resolvedTransferChallenge = issuedTransferChallenge
    ? matchingPublicTransferChallenge
      ? { ...matchingPublicTransferChallenge, ...issuedTransferChallenge }
      : issuedTransferChallenge
    : matchingPublicTransferChallenge

  return (
    <div style={{ minHeight: '100vh', background: 'radial-gradient(ellipse at top, #0b192c 0%, #030712 100%)', padding: '24px', boxSizing: 'border-box', color: '#fff' }}>
      {/* Top Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              style={{
                padding: '8px 14px',
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '8px',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              ← 허브로 나가기
            </button>
          )}

          <div>
            <div style={{ fontSize: '12px', color: '#00f0ff', fontFamily: 'monospace', fontWeight: 'bold' }}>
              LUMI ALGORITHM CONSTELLATION
            </div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 'bold' }}>
              {kernel.identity?.studentTitle}
            </h1>
          </div>
        </div>

        {/* Shell Selector & Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
            <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
              {[
                { key: 'explorer', label: '🔎 함께 탐색', desc: '작은 예를 보며 하나씩 발견하고 힌트를 받아요' },
                { key: 'navigator', label: '🧭 기본 항해', desc: '예측·실험 후 코드로 직접 구현해요 (기본)' },
                { key: 'pro', label: '🚀 독립 도전', desc: '최소한의 도움으로 코드 에디터에서 바로 해결해요' },
              ].map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => {
                    setShell(s.key)
                    if (s.key === 'pro') {
                      fsm.transition(MISSION_STATES.CODE)
                    }
                  }}
                  title={s.desc}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: 'none',
                    background: shell === s.key ? '#00f0ff' : 'transparent',
                    color: shell === s.key ? '#000' : 'rgba(255, 255, 255, 0.7)',
                    fontWeight: shell === s.key ? 'bold' : 'normal',
                    fontSize: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
            <div style={{ fontSize: '11px', color: '#94a3b8' }}>
              {shell === 'explorer' && '💡 작은 예시를 보며 단계별 힌트와 함께 발견해요'}
              {shell === 'navigator' && '🧭 예측과 실험을 거쳐 표준 코드로 구현해요'}
              {shell === 'pro' && '🚀 에디터에서 바로 독립 구현에 도전해요'}
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '18px', color: '#fbbf24', letterSpacing: '2px' }}>
              {'★'.repeat(completionResult?.stars || currentProgress.bestStars || 0)}
              {'☆'.repeat(3 - (completionResult?.stars || currentProgress.bestStars || 0))}
            </div>
            <div style={{ fontSize: '11px', color: currentProgress.masteryStatus === 'mastered' ? '#4ade80' : currentProgress.masteryStatus === 'pending_independent_return' ? '#c084fc' : 'rgba(255, 255, 255, 0.5)' }}>
              {currentProgress.masteryStatus === 'mastered'
                ? '🏆 완전 마스터'
                : currentProgress.masteryStatus === 'pending_independent_return'
                  ? '🛰️ 독립 귀환 예정'
                  : '탐사 진행 중'}
            </div>
          </div>
        </div>
      </div>

      {/* Friendly Error Message Banner */}
      {studentErrorMessage && (
        <div style={{ marginBottom: '20px', padding: '14px 18px', background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#fca5a5' }}>
              {studentErrorMessage.title}
            </div>
            <div style={{ fontSize: '13px', color: '#e2e8f0', marginTop: '2px' }}>
              {studentErrorMessage.description}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStudentErrorMessage(null)}
            style={{
              padding: '6px 12px',
              background: 'transparent',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              borderRadius: '6px',
              color: '#fff',
              cursor: 'pointer',
              fontSize: '12px',
            }}
          >
            확인
          </button>
        </div>
      )}

      {/* Mode Navigation Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        {[
          {
            key: MISSION_STATES.OBSERVE,
            label: '1. 관찰 및 예측',
            isAccessible: true,
          },
          {
            key: MISSION_STATES.EXPLORE,
            label: '2. 대화형 실험',
            isAccessible: shell === 'pro' || observeCompleted || allowBypass || fsmState === MISSION_STATES.EXPLORE || fsmState === MISSION_STATES.CODE || fsmState === MISSION_STATES.RUN_SUCCESS || fsmState === MISSION_STATES.UNDERSTANDING_CHECK || fsmState === MISSION_STATES.TRANSFER_CHALLENGE || fsmState === MISSION_STATES.COMPLETE,
            lockReason: '1단계 관찰 및 예측을 먼저 완료해 주세요 (🚀 독립 도전 모드에서는 바로 진입 가능).',
          },
          {
            key: MISSION_STATES.CODE,
            label: '3. Python 코드',
            isAccessible: shell === 'pro' || (observeCompleted && exploreCompleted) || allowBypass || fsmState === MISSION_STATES.CODE || fsmState === MISSION_STATES.RUN_SUCCESS || fsmState === MISSION_STATES.UNDERSTANDING_CHECK || fsmState === MISSION_STATES.TRANSFER_CHALLENGE || fsmState === MISSION_STATES.COMPLETE,
            lockReason: '2단계 대화형 실험실에서 규칙을 발견해야 코드로 진입할 수 있습니다 (🚀 독립 도전 모드에서는 바로 진입 가능).',
          },
        ].map((tab) => {
          const isActive = fsmState === tab.key || (tab.key === MISSION_STATES.CODE && (fsmState === MISSION_STATES.RUN_SUCCESS || fsmState === MISSION_STATES.UNDERSTANDING_CHECK || fsmState === MISSION_STATES.TRANSFER_CHALLENGE || fsmState === MISSION_STATES.COMPLETE))
          const isAccessible = tab.isAccessible
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => isAccessible && handleTransition(tab.key)}
              disabled={!isAccessible}
              title={!isAccessible ? tab.lockReason : ''}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: isActive ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isActive ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                color: isActive ? '#00f0ff' : isAccessible ? 'rgba(255, 255, 255, 0.6)' : 'rgba(255, 255, 255, 0.25)',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: isAccessible ? 'pointer' : 'not-allowed',
                opacity: isAccessible ? 1 : 0.6,
              }}
            >
              {tab.label} {!isAccessible && '🔒'}
            </button>
          )
        })}
      </div>

      {/* Step View Routing */}
      {fsmState === MISSION_STATES.OBSERVE && (
        <ObserveMode
          kernel={kernel}
          shell={shell}
          onCompleteMicroEvidence={() => setObserveCompleted(true)}
          onProceedToExplore={() => {
            setObserveCompleted(true)
            handleTransition(MISSION_STATES.EXPLORE)
          }}
          onProceedToCode={() => {
            setObserveCompleted(true)
            if (exploreCompleted || allowBypass) {
              handleTransition(MISSION_STATES.CODE)
            } else {
              handleTransition(MISSION_STATES.EXPLORE)
            }
          }}
        />
      )}

      {fsmState === MISSION_STATES.EXPLORE && (
        <ExploreMode
          kernel={kernel}
          shell={shell}
          allowBypass={allowBypass}
          onCompleteMicroEvidence={() => setExploreCompleted(true)}
          onBackToObserve={() => handleTransition(MISSION_STATES.OBSERVE)}
          onProceedToCode={() => {
            setExploreCompleted(true)
            handleTransition(MISSION_STATES.CODE)
          }}
        />
      )}

      {(fsmState === MISSION_STATES.CODE || fsmState === MISSION_STATES.RUN_SUCCESS) && (
        <div>
          {pendingFirstEncounter ? (
            <FirstEncounterCard
              key={pendingFirstEncounter.conceptId || pendingFirstEncounter.patternId}
              concept={pendingFirstEncounter}
              onComplete={(conceptId) => {
                const id = conceptId || pendingFirstEncounter.conceptId || pendingFirstEncounter.patternId
                setCompletedConceptIds((previous) => new Set([...previous, id]))
                markPythonConceptCompleted({ ownerKey: draftOwnerKey, conceptId: id })
              }}
            />
          ) : (
            <CodeMode
              kernel={kernel}
              shell={shell}
              initialCode={currentCode}
              assistanceAllowed={Boolean(attemptSession?.policy?.assistanceAllowed)}
              onCodeChange={(c) => setCurrentCode(c)}
              onSubmitSolution={handleSubmitBaseCode}
              onOpenAiPromptModal={({ currentCode: c, diagnosis, scenes, learningEvidence, publicTestError }) => {
                setCurrentCode(c)
                setActiveMisconception(diagnosis)
                setRecentTraceScenes(scenes || [])
                setRecentLearningEvidence(learningEvidence || [])
                setRecentPublicTestError(publicTestError || '')
                setIsAiModalOpen(true)
              }}
              onRequestHint={handleRequestHint}
            />
          )}
          {fsmState === MISSION_STATES.RUN_SUCCESS && (
            <div style={{ marginTop: '20px', padding: '16px', background: 'rgba(16, 185, 129, 0.15)', border: '1px solid #10b981', borderRadius: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 'bold', color: '#10b981' }}>★ 베이스 코드 검증 통과!</span> 다음 단계인 신호 이해 확인으로 이동하세요.
              </div>
              <button
                type="button"
                onClick={() => fsm.transition(MISSION_STATES.UNDERSTANDING_CHECK)}
                style={{
                  padding: '10px 20px',
                  background: '#10b981',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '8px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                }}
              >
                ★★ 8단계: 신호 이해 확인으로 이동 ➔
              </button>
            </div>
          )}
        </div>
      )}

      {fsmState === MISSION_STATES.UNDERSTANDING_CHECK && (
        (understandingChallenge || kernel.assessment?.understandingChallenges?.[0]) ? (
          <UnderstandingCheckMode
            key={(understandingChallenge || kernel.assessment?.understandingChallenges?.[0])?.challengeId || 'uc_default'}
            challenge={understandingChallenge || kernel.assessment?.understandingChallenges?.[0]}
            code={currentCode}
            onSubmitUnderstanding={handleSubmitUnderstanding}
            onProceedToTransfer={handleProceedToTransfer}
          />
        ) : (
          <div role="alert" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444' }}>
            이해 확인 문제를 안전하게 불러오지 못했어요. 코드는 보존되어 있으니 이전 단계에서 다시 제출해 주세요.
          </div>
        )
      )}

      {fsmState === MISSION_STATES.TRANSFER_CHALLENGE && (
        resolvedTransferChallenge && transferData?.challengeToken ? (
          <TransferChallengeMode
            key={resolvedTransferChallenge.transferChallengeId}
            transferChallenge={resolvedTransferChallenge}
            challengeToken={transferData.challengeToken}
            onSubmitTransfer={handleSubmitTransfer}
            onCompleteMission={() => fsm.transition(MISSION_STATES.COMPLETE)}
          />
        ) : (
          <div role="alert" style={{ padding: '20px', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid #ef4444' }}>
            전이 항로를 안전하게 발급하지 못했어요. 작성한 코드는 보존되어 있으니 이해 확인 단계에서 다시 시도해 주세요.
          </div>
        )
      )}

      {fsmState === MISSION_STATES.COMPLETE && (
        <div style={{ padding: '32px', background: 'rgba(10, 20, 40, 0.85)', borderRadius: '16px', border: '2px solid #fbbf24', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
          <h2 style={{ fontSize: '24px', color: '#fbbf24', margin: '0 0 12px' }}>
            {kernel.identity?.studentTitle || kernel.id} 생각의 항로 탐사 완료!
          </h2>
          <div style={{ fontSize: '28px', color: '#fbbf24', marginBottom: '16px' }}>
            {'★'.repeat(completionResult?.stars || 3)}
          </div>
          <p style={{ color: '#e2e8f0', fontSize: '15px', maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            {completionResult?.authoritative === false
              ? '미리보기(비공식) 모드로 탐사를 마쳤어요. 학습 기록은 남지만 공식 채점 기록이 아니에요. 로그인 상태에서 다시 도전하면 공식 별이 기록됩니다.'
              : completionResult?.masteryStatus === 'mastered'
              ? '스스로 모든 증거와 전이 문제를 완결하여 마스터리를 달성했습니다!'
              : '강한 지원 또는 외부 도구를 활용해 탐사를 마쳤습니다. 24시간 후 도움 없는 독립 귀환에 성공하면 완전한 마스터리가 부여됩니다.'}
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={onExit}
              style={{
                padding: '12px 28px',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                color: '#fff',
                fontWeight: 'bold',
                fontSize: '15px',
                border: 'none',
                borderRadius: '10px',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(16, 185, 129, 0.4)',
              }}
            >
              🌌 다음 탐사 항로로 이동 (목록으로) ➔
            </button>
            <button
              type="button"
              onClick={() => fsm.transition(MISSION_STATES.OBSERVE)}
              style={{
                padding: '12px 20px',
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: '#94a3b8',
                fontWeight: '600',
                borderRadius: '10px',
                cursor: 'pointer',
              }}
            >
              🔄 이 문제 다시 풀기 (복습)
            </button>
          </div>
        </div>
      )}

      {/* AI Research Prompt Modal */}
      <AiResearchConfirmModal
        isOpen={isAiModalOpen}
        promptText={generatedPrompt}
        onConfirmCopy={handleConfirmAiCopy}
        onClose={() => setIsAiModalOpen(false)}
      />

      {/* Arena Mode Strict Focus Lock Modal */}
      {focusLockReason && intent === 'arena' && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0, 0, 0, 0.85)', display: 'grid', placeItems: 'center', zIndex: 99999 }}>
          <div style={{ background: '#0f172a', border: '2px solid #ef4444', borderRadius: '16px', padding: '24px', maxWidth: '480px', textAlign: 'center', color: '#fff' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>🔒</div>
            <h3 style={{ color: '#f87171', margin: '0 0 8px' }}>아레나 탐사 집중 이탈 감지</h3>
            <p style={{ fontSize: '13px', color: '#cbd5e1', lineHeight: '1.6' }}>{focusLockReason}</p>
            <button
              type="button"
              disabled={focusLockPending}
              onClick={() => setFocusLockReason('')}
              style={{ marginTop: '16px', padding: '10px 20px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer' }}
            >
              {focusLockPending ? '기록 중...' : '확인'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
