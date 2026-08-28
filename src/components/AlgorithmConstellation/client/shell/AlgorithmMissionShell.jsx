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
import { loadAlgorithmDraft, saveAlgorithmDraft, clearAlgorithmDraft } from '../services/algorithmDraftStorage.js'

function normalizeCallableErrorCode(error) {
  return String(error?.code || '')
    .replace(/^functions\//, '')
    .replaceAll('-', '_')
    .toUpperCase()
}

export default function AlgorithmMissionShell({
  kernel,
  initialShell = 'explorer',
  gateway,
  intent = 'learn',
  draftOwnerKey = 'guest_default',
  onExit,
}) {
  const existingDraft = useMemo(() => {
    return loadAlgorithmDraft({ problemId: kernel.id, problemVersion: kernel.version, ownerKey: draftOwnerKey })
  }, [draftOwnerKey, kernel.id, kernel.version])

  const [shell, setShell] = useState(existingDraft?.shell || initialShell)
  const [fsmState, setFsmState] = useState(existingDraft?.fsmState || MISSION_STATES.OBSERVE)
  const [attemptSession, setAttemptSession] = useState(null)
  const [currentProgress, setCurrentProgress] = useState({})
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [transferData, setTransferData] = useState(null)
  const [completionResult, setCompletionResult] = useState(null)
  const [understandingChallenge, setUnderstandingChallenge] = useState(null)
  const [currentCode, setCurrentCode] = useState(existingDraft?.code || kernel.modes?.code?.starterCode || '')
  const [activeMisconception, setActiveMisconception] = useState(null)
  const [recentTraceScenes, setRecentTraceScenes] = useState([])
  const [recentPublicTestError, setRecentPublicTestError] = useState('')
  const generatedRequestId = `start_${useId().replace(/[^A-Za-z0-9_-]/g, '_')}`
  const startRequestId = existingDraft?.requestId || generatedRequestId
  const [focusLockReason, setFocusLockReason] = useState('')
  const [focusLockPending, setFocusLockPending] = useState(false)
  const [aiResearchActive, setAiResearchActive] = useState(intent === 'ai_research')
  const [studentErrorMessage, setStudentErrorMessage] = useState(null)
  const lastIntegrityEventAt = useRef(0)
  const recordedScaffoldLevels = useRef(new Set())

  // Use provided gateway or default to mock gateway for safe standalone dev
  const activeGateway = useMemo(() => {
    if (gateway) return gateway
    if (import.meta.env.DEV) return createAlgorithmConstellationMockGateway()
    throw new Error('AlgorithmConstellationGateway must be provided outside development mode.')
  }, [gateway])

  const fsm = useMemo(() => {
    return createMissionStateMachine({
      initialState: existingDraft?.fsmState || MISSION_STATES.OBSERVE,
      onTransition: ({ state }) => setFsmState(state),
    })
  }, [existingDraft?.fsmState])

  // Start Attempt Session on mount
  useEffect(() => {
    let isMounted = true
    async function initSession() {
      try {
        const session = await activeGateway.startAttempt({
          problemId: kernel.id,
          problemVersion: kernel.version,
          shell: initialShell,
          intent,
          requestId: startRequestId,
        })
        if (isMounted) {
          recordedScaffoldLevels.current.clear()
          setAttemptSession(session)
          setCurrentProgress(session.progress || {})
        }
      } catch (err) {
        console.error('Failed to start algorithm attempt session:', err)
        if (isMounted) {
          if (normalizeCallableErrorCode(err) === 'FAILED_PRECONDITION' && intent === 'independent_return') {
            setStudentErrorMessage({
              title: '독립 귀환 대기 중',
              description: '아직 24시간 독립 귀환 예약 시간이 도래하지 않았습니다.',
            })
          } else {
            setStudentErrorMessage({
              title: '탐사 시작 오류',
              description: '채점소 통신이 잠시 불안정해요. 잠시 후 다시 시도해 주세요.',
            })
          }
        }
      }
    }
    initSession()
    return () => {
      isMounted = false
    }
  }, [activeGateway, initialShell, intent, kernel.id, kernel.version, startRequestId])

  // Debounced draft auto-save effect
  useEffect(() => {
    if (fsmState === MISSION_STATES.COMPLETE) {
      clearAlgorithmDraft({ problemId: kernel.id, problemVersion: kernel.version, ownerKey: draftOwnerKey })
      return undefined
    }
    const timer = setTimeout(() => {
      saveAlgorithmDraft({
        problemId: kernel.id,
        problemVersion: kernel.version,
        ownerKey: draftOwnerKey,
        requestId: startRequestId,
        attemptId: attemptSession?.attemptId || existingDraft?.attemptId || null,
        code: currentCode,
        fsmState,
        shell,
      })
    }, 1500)
    return () => clearTimeout(timer)
  }, [attemptSession?.attemptId, currentCode, draftOwnerKey, existingDraft?.attemptId, fsmState, kernel.id, kernel.version, shell, startRequestId])

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

      activeGateway.recordAssistance({
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
  }, [activeGateway, aiResearchActive, attemptSession?.attemptId, fsmState, intent])

  // 1. Request Scaffold Hint
  const handleRequestHint = async ({ level = 1, source = 'hint', answerExposure = 'partial' } = {}) => {
    if (!attemptSession?.attemptId) throw new Error('탐사 세션을 준비하고 있어요. 잠시 후 다시 시도해 주세요.')
    if (recordedScaffoldLevels.current.has(level)) return { ok: true, duplicated: true }
    try {
      const result = await activeGateway.recordAssistance({
        attemptId: attemptSession.attemptId,
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
    if (!attemptSession?.attemptId) return
    await activeGateway.recordAssistance({
      attemptId: attemptSession.attemptId,
      eventId: `ai_${Date.now()}`,
      source: 'external-ai',
      stage: 'strategy',
      scaffoldLevel: 3,
      answerExposure: 'unknown',
    })
    setAiResearchActive(true)
  }

  // 3. Submit Base Code
  const handleSubmitBaseCode = async ({ code, onFeedback }) => {
    if (!attemptSession?.attemptId) return
    setStudentErrorMessage(null)
    try {
      const res = await activeGateway.submitBase({
        attemptId: attemptSession.attemptId,
        submissionId: `sub_base_${Date.now()}`,
        code,
      })
      onFeedback?.(res)
      if (res.resultStar) {
        if (res.understandingChallenge) {
          setUnderstandingChallenge(res.understandingChallenge)
        }
        fsm.transition(MISSION_STATES.RUN_SUCCESS)
      }
    } catch (err) {
      if (['JUDGE_UNAVAILABLE', 'UNAVAILABLE'].includes(normalizeCallableErrorCode(err))) {
        setStudentErrorMessage({
          title: '채점소 통신 일시 지연',
          description: '채점소 통신이 잠시 불안정해요. 작성하신 코드는 안전하게 보존되었습니다.',
        })
      } else {
        setStudentErrorMessage({
          title: '제출 오류',
          description: err.message || '베이스 코드 제출 중 오류가 발생했습니다.',
        })
      }
    }
  }

  // 4. Submit Understanding Evidence
  const handleSubmitUnderstanding = async ({ challengeId, answers }) => {
    if (!attemptSession?.attemptId) return { passed: false }
    const res = await activeGateway.submitUnderstanding({
      attemptId: attemptSession.attemptId,
      challengeId,
      answers,
    })
    return res
  }

  // 5. Issue Transfer Challenge
  const handleProceedToTransfer = async () => {
    if (!attemptSession?.attemptId) return
    try {
      const res = await activeGateway.issueTransfer({
        attemptId: attemptSession.attemptId,
      })
      setTransferData(res)
      fsm.transition(MISSION_STATES.TRANSFER_CHALLENGE)
    } catch (err) {
      alert(`전이 문제 발급 오류: ${err.message}`)
    }
  }

  // 6. Submit Transfer Code
  const handleSubmitTransfer = async ({ challengeToken, transferCode }) => {
    if (!attemptSession?.attemptId) return { passed: false }
    const res = await activeGateway.submitTransfer({
      attemptId: attemptSession.attemptId,
      challengeToken,
      transferCode,
    })
    if (res.passed) {
      setCompletionResult(res)
      setCurrentProgress((prev) => ({
        ...prev,
        bestStars: Math.max(prev.bestStars || 0, res.stars || 3),
        masteryStatus: res.masteryStatus,
        nextReturnAt: res.nextReturnAt,
        masteryHoldReasons: res.masteryHoldReasons || [],
      }))
    }
    return res
  }

  const generatedPrompt = buildExternalAiCoachPrompt({
    problemTitle: kernel.identity?.studentTitle,
    studentCode: currentCode,
    traceScenes: recentTraceScenes,
    misconceptionDiagnosis: activeMisconception,
    publicTestError: recentPublicTestError,
  })

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
          <div style={{ display: 'flex', background: 'rgba(0, 0, 0, 0.4)', borderRadius: '8px', padding: '4px', border: '1px solid rgba(255, 255, 255, 0.15)' }}>
            {['explorer', 'navigator', 'pro'].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setShell(s)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '6px',
                  border: 'none',
                  background: shell === s ? '#00f0ff' : 'transparent',
                  color: shell === s ? '#000' : 'rgba(255, 255, 255, 0.7)',
                  fontWeight: shell === s ? 'bold' : 'normal',
                  fontSize: '12px',
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                }}
              >
                {s}
              </button>
            ))}
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
          { key: MISSION_STATES.OBSERVE, label: '1. 관찰 및 예측' },
          { key: MISSION_STATES.EXPLORE, label: '2. 대화형 실험' },
          { key: MISSION_STATES.CODE, label: '3. Python 코드' },
        ].map((tab) => {
          const isActive = fsmState === tab.key || (tab.key === MISSION_STATES.CODE && (fsmState === MISSION_STATES.RUN_SUCCESS || fsmState === MISSION_STATES.UNDERSTANDING_CHECK || fsmState === MISSION_STATES.TRANSFER_CHALLENGE || fsmState === MISSION_STATES.COMPLETE))
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => fsm.transition(tab.key)}
              style={{
                padding: '8px 16px',
                borderRadius: '8px',
                border: isActive ? '1px solid #00f0ff' : '1px solid rgba(255, 255, 255, 0.1)',
                background: isActive ? 'rgba(0, 240, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)',
                color: isActive ? '#00f0ff' : 'rgba(255, 255, 255, 0.6)',
                fontWeight: isActive ? 'bold' : 'normal',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Step View Routing */}
      {fsmState === MISSION_STATES.OBSERVE && (
        <ObserveMode
          kernel={kernel}
          shell={shell}
          onProceedToExplore={() => fsm.transition(MISSION_STATES.EXPLORE)}
          onProceedToCode={() => fsm.transition(MISSION_STATES.CODE)}
        />
      )}

      {fsmState === MISSION_STATES.EXPLORE && (
        <ExploreMode
          kernel={kernel}
          shell={shell}
          onBackToObserve={() => fsm.transition(MISSION_STATES.OBSERVE)}
          onProceedToCode={() => fsm.transition(MISSION_STATES.CODE)}
        />
      )}

      {(fsmState === MISSION_STATES.CODE || fsmState === MISSION_STATES.RUN_SUCCESS) && (
        <div>
          <CodeMode
            kernel={kernel}
            shell={shell}
            initialCode={currentCode}
            assistanceAllowed={Boolean(attemptSession?.policy?.assistanceAllowed)}
            onCodeChange={(c) => setCurrentCode(c)}
            onSubmitSolution={handleSubmitBaseCode}
            onOpenAiPromptModal={({ currentCode: c, diagnosis, scenes, publicTestError }) => {
              setCurrentCode(c)
              setActiveMisconception(diagnosis)
              setRecentTraceScenes(scenes || [])
              setRecentPublicTestError(publicTestError || '')
              setIsAiModalOpen(true)
            }}
            onRequestHint={handleRequestHint}
          />
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
        understandingChallenge ? (
          <UnderstandingCheckMode
            challenge={understandingChallenge}
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
        <TransferChallengeMode
          transferChallenge={transferData?.transferChallenge}
          challengeToken={transferData?.challengeToken}
          onSubmitTransfer={handleSubmitTransfer}
          onCompleteMission={() => fsm.transition(MISSION_STATES.COMPLETE)}
        />
      )}

      {fsmState === MISSION_STATES.COMPLETE && (
        <div style={{ padding: '32px', background: 'rgba(10, 20, 40, 0.85)', borderRadius: '16px', border: '2px solid #fbbf24', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🏆</div>
          <h2 style={{ fontSize: '24px', color: '#fbbf24', margin: '0 0 12px' }}>
            {kernel.id} 생각의 항로 탐사 완료!
          </h2>
          <div style={{ fontSize: '28px', color: '#fbbf24', marginBottom: '16px' }}>
            {'★'.repeat(completionResult?.stars || 3)}
          </div>
          <p style={{ color: '#e2e8f0', fontSize: '15px', maxWidth: '600px', margin: '0 auto 24px', lineHeight: '1.6' }}>
            {completionResult?.masteryStatus === 'mastered'
              ? '스스로 모든 증거와 전이 문제를 완결하여 마스터리를 달성했습니다!'
              : '강한 지원 또는 외부 도구를 활용해 탐사를 마쳤습니다. 24시간 후 도움 없는 독립 귀환에 성공하면 완전한 마스터리가 부여됩니다.'}
          </p>
          <button
            type="button"
            onClick={() => fsm.transition(MISSION_STATES.OBSERVE)}
            style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #00f0ff, #0284c7)',
              color: '#000',
              fontWeight: 'bold',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
            }}
          >
            다시 탐사하기
          </button>
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
