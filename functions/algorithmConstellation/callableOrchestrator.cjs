/**
 * Server-authoritative orchestration for Algorithm Constellation.
 * State is supplied by a durable store; production must use Firestore.
 */

const crypto = require('crypto')
const { getPrivateProblemDefinition, getTransferChallenges } = require('./privateProblemCatalog.cjs')
const { ATTEMPT_STATES, validateAttemptTransition } = require('./attemptStateMachine.cjs')
const defaultJudge = require('./isolatedJudgeRuntime.cjs')

const VALID_SHELLS = new Set(['explorer', 'navigator', 'pro'])
const VALID_INTENTS = new Set(['learn', 'ai_research', 'independent_return', 'arena'])
const VALID_ASSISTANCE_SOURCES = new Set(['hint', 'parsons', 'micro-repair', 'solution-review', 'external-ai', 'integrity-focus'])
const VALID_ASSISTANCE_STAGES = new Set(['problem-reading', 'strategy', 'implementation', 'debugging'])
const VALID_EXPOSURES = new Set(['none', 'partial', 'full', 'unknown'])
const MAX_CODE_LENGTH = 8_000
const SESSION_DURATION_MS = 2 * 60 * 60 * 1000
const RETURN_DELAY_MS = 24 * 60 * 60 * 1000

function domainError(code, message) {
  const error = new Error(message)
  error.code = code
  return error
}

function requireAuthenticatedUid(context) {
  const uid = context?.auth?.uid
  if (!uid) throw domainError('UNAUTHENTICATED', '로그인이 필요합니다.')
  return uid
}

// The secret signs attemptIds, variant seeds, and transfer challenge tokens.
// A committed fallback constant would let anyone precompute variant selection
// and forge tokens, so a missing secret must fail closed in every deployed
// environment. Local emulation can opt in explicitly via
// ALGORITHM_CONSTELLATION_INSECURE_SECRET_FALLBACK=1.
function requireServerSecret(secretProvider) {
  const secret = String(secretProvider?.() || '')
  if (secret.length >= 32) return secret
  if (process.env.ALGORITHM_CONSTELLATION_INSECURE_SECRET_FALLBACK === '1') {
    console.warn('ALGORITHM_CONSTELLATION: insecure development secret fallback is ACTIVE. Never enable this in a deployed environment.')
    return 'msense_alg_constellation_local_dev_secret_fallback_32bytes'
  }
  throw domainError('FAILED_PRECONDITION', '채점 서버 보안 설정이 완료되지 않았습니다. 잠시 후 다시 시도해 주세요.')
}

function deriveHmacSeed(secret, uid, problemId, attemptFamilyId, generatorVersion) {
  return crypto
    .createHmac('sha256', secret)
    .update(`${uid}:${problemId}:${attemptFamilyId}:g${generatorVersion}`)
    .digest()
    .readUInt32BE(0)
}

function signChallengeToken(secret, attemptId, transferChallengeId, expiresAt) {
  const payload = `${attemptId}:${transferChallengeId}:${expiresAt}`
  const signature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return `${payload}:${signature}`
}

function verifyChallengeToken(secret, token, attemptId, currentTime) {
  if (typeof token !== 'string') return null
  const parts = token.split(':')
  if (parts.length !== 4) return null
  const [tokenAttemptId, transferChallengeId, expiresAtText, signature] = parts
  const expiresAt = Number(expiresAtText)
  if (tokenAttemptId !== attemptId || !Number.isFinite(expiresAt) || currentTime > expiresAt) return null
  const payload = `${tokenAttemptId}:${transferChallengeId}:${expiresAtText}`
  const expected = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  const actualBuffer = Buffer.from(signature, 'hex')
  const expectedBuffer = Buffer.from(expected, 'hex')
  if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) return null
  return { transferChallengeId, expiresAt }
}

function safeCode(value) {
  if (typeof value !== 'string' || !value.trim()) throw domainError('INVALID_ARGUMENT', '코드를 입력해 주세요.')
  if (value.length > MAX_CODE_LENGTH) throw domainError('INVALID_ARGUMENT', `코드는 ${MAX_CODE_LENGTH}자를 넘을 수 없습니다.`)
  return value
}

function safeIdentifier(value, name, maxLength = 160) {
  if (typeof value !== 'string' || !value || value.length > maxLength || value.includes('/')) {
    throw domainError('INVALID_ARGUMENT', `${name} 형식이 올바르지 않습니다.`)
  }
  return value
}

function codeHash(code) {
  return crypto.createHash('sha256').update(code).digest('hex')
}

function publicStartResponse(session, progress = null) {
  return {
    attemptId: session.attemptId,
    // Clients need the state to detect finished attempts (e.g. revisiting a
    // completed mission) and rotate to a fresh attempt instead of dead-ending
    // on FAILED_PRECONDITION for every submission.
    state: session.state,
    publicVariant: { seed: session.variantSeed },
    replayDescriptor: {
      problemId: session.problemId,
      problemVersion: session.problemVersion,
      attemptFamilyId: session.attemptId,
      variantSeed: session.variantSeed,
      generatorVersion: session.generatorVersion,
      runtimeVersion: 'restricted-condition-v1',
      interpreterVersion: 'restricted-python-subset-v1',
      traceSchemaVersion: 1,
      privateDefinitionChecksum: session.privateDefinitionChecksum,
    },
    policy: { rankMode: session.intent, assistanceAllowed: !['independent_return', 'arena'].includes(session.intent) },
    expiresAt: session.expiresAt,
    progress: progress || {
      problemId: session.problemId,
      bestStars: 0,
      masteryStatus: 'unstarted',
      nextReturnAt: null,
      masteryHoldReasons: [],
    },
  }
}

function assertOwnedActiveSession(session, uid, currentTime) {
  if (!session) throw domainError('NOT_FOUND', '시도 세션을 찾을 수 없습니다.')
  if (session.uid !== uid) throw domainError('PERMISSION_DENIED', '이 시도에 접근할 수 없습니다.')
  if (session.expiresAt <= currentTime) throw domainError('FAILED_PRECONDITION', '시도 시간이 만료되었습니다.')
  if ([ATTEMPT_STATES.FINALIZED, ATTEMPT_STATES.EXPIRED, ATTEMPT_STATES.ABANDONED, ATTEMPT_STATES.INTEGRITY_TERMINATED].includes(session.state)) {
    throw domainError('FAILED_PRECONDITION', '이미 종료된 시도입니다.')
  }
}

function publicUnderstandingChallenge(challenge) {
  return {
    challengeId: challenge.challengeId,
    type: challenge.type,
    title: challenge.title,
    prompt: challenge.prompt,
    codeSnippet: challenge.codeSnippet,
    questions: (challenge.questions || []).map(({ id, text, prompt, options }) => ({
      id,
      text: text || prompt || '',
      options: Array.isArray(options)
        ? options.map((opt) => (typeof opt === 'object' && opt !== null ? { value: String(opt.value), label: String(opt.label || opt.value) } : { value: String(opt), label: String(opt) }))
        : undefined,
    })),
  }
}

function publicTransferChallenge(challenge) {
  return {
    transferChallengeId: challenge.transferChallengeId,
    title: challenge.title,
    description: challenge.description,
    entryFunction: challenge.entryFunction,
    starterCode: challenge.starterCode,
    // contextCard와 thoughtCheck은 학생용 스캐폴드다(공개 커널에도 동일 값이
    // 존재하는 형성적 자기 점검). 숨겨진 테스트·정답 코드와 달리 클라이언트
    // 표시 계약의 일부이므로 그대로 전달한다. thoughtCheck.expected는 Observe의
    // expected와 같은 클라이언트 신뢰 모델이며, 3★ 채점은 코드 제출만으로
    // 서버에서 수행된다.
    contextCard: challenge.contextCard,
    thoughtCheck: challenge.thoughtCheck,
  }
}

function createCallableOrchestrator({
  store,
  secretProvider = () => process.env.ALGORITHM_CONSTELLATION_SECRET || process.env.GUEST_ABUSE_HASH_SECRET,
  now = Date.now,
  judge = defaultJudge,
} = {}) {
  if (!store) throw new Error('Algorithm store is required')

  async function handleStartAlgorithmAttempt(data, context) {
    const uid = requireAuthenticatedUid(context)
    const secret = requireServerSecret(secretProvider)
    const {
      problemId,
      problemVersion = 1,
      shell = 'explorer',
      intent = 'learn',
      requestId,
    } = data || {}
    safeIdentifier(problemId, 'problemId', 80)
    if (!Number.isInteger(problemVersion) || problemVersion < 1) throw domainError('INVALID_ARGUMENT', 'problemVersion is invalid')
    if (typeof requestId !== 'string' || !/^[A-Za-z0-9_-]{8,120}$/.test(requestId)) {
      throw domainError('INVALID_ARGUMENT', 'requestId is required')
    }
    if (!VALID_SHELLS.has(shell) || !VALID_INTENTS.has(intent)) throw domainError('INVALID_ARGUMENT', 'shell 또는 intent가 올바르지 않습니다.')

    const definition = getPrivateProblemDefinition(problemId, problemVersion)
    const currentTime = now()
    const currentProgress = await store.getProgress(uid, problemId)
    if (intent === 'independent_return') {
      if (!currentProgress || currentProgress.masteryStatus !== 'pending_independent_return') {
        throw domainError('FAILED_PRECONDITION', '예약된 독립 귀환이 없습니다.')
      }
      if (currentProgress.nextReturnAt && currentTime < currentProgress.nextReturnAt) {
        throw domainError('FAILED_PRECONDITION', '독립 귀환 예약 시간 이전에는 재도전할 수 없습니다.')
      }
    }

    const attemptId = `att_${crypto.createHmac('sha256', secret).update(`${uid}:${requestId}`).digest('hex').slice(0, 32)}`
    const existingSession = await store.getSession(attemptId)
    if (existingSession) {
      if (
        existingSession.uid !== uid || existingSession.problemId !== problemId ||
        existingSession.problemVersion !== problemVersion || existingSession.intent !== intent
      ) {
        throw domainError('FAILED_PRECONDITION', 'requestId가 다른 시도에 이미 사용되었습니다.')
      }
      return publicStartResponse(existingSession, currentProgress)
    }
    const generatorVersion = Number(definition.generatorVersion || 1)
    const variantSeed = deriveHmacSeed(secret, uid, problemId, attemptId, generatorVersion)
    const session = {
      attemptId,
      uid,
      problemId,
      problemVersion,
      privateDefinitionChecksum: definition.checksum,
      shell,
      intent,
      state: ATTEMPT_STATES.STARTED,
      variantSeed,
      generatorVersion,
      rankEligible: !['ai_research'].includes(intent),
      masteryEligible: intent !== 'ai_research',
      masteryHoldReasons: intent === 'ai_research' ? ['external_ai'] : [],
      stars: 0,
      starDetails: { star1_result: false, star2_understanding: false, star3_transfer: false },
      assistanceSummary: { count: 0, highestScaffoldLevel: 0, externalAiUsed: false },
      startedAtMs: currentTime,
      expiresAt: currentTime + SESSION_DURATION_MS,
    }
    try {
      await store.createSession(session)
    } catch (error) {
      if (error?.code !== 'ALREADY_EXISTS' && error?.code !== 6) throw error
      const racedSession = await store.getSession(attemptId)
      if (!racedSession) throw error
      return publicStartResponse(racedSession, currentProgress)
    }

    return publicStartResponse(session, currentProgress)
  }

  async function handleRecordAlgorithmAssistance(data, context) {
    const uid = requireAuthenticatedUid(context)
    const { attemptId, eventId, source, stage, scaffoldLevel = 0, answerExposure = 'none' } = data || {}
    safeIdentifier(attemptId, 'attemptId')
    safeIdentifier(eventId, 'eventId', 120)
    if (!VALID_ASSISTANCE_SOURCES.has(source) || !VALID_ASSISTANCE_STAGES.has(stage) || !VALID_EXPOSURES.has(answerExposure)) {
      throw domainError('INVALID_ARGUMENT', '지원 기록 형식이 올바르지 않습니다.')
    }
    if (!Number.isInteger(scaffoldLevel) || scaffoldLevel < 0 || scaffoldLevel > 6) {
      throw domainError('INVALID_ARGUMENT', 'scaffoldLevel은 0~6 정수여야 합니다.')
    }
    const currentTime = now()
    const eventRecord = { eventId, source, stage, scaffoldLevel, answerExposure, usedAtMs: currentTime }
    const result = await store.recordAssistance({
      attemptId,
      uid,
      eventRecord,
      mutateSession(session) {
        assertOwnedActiveSession(session, uid, currentTime)
        if (session.intent === 'independent_return' && source !== 'integrity-focus') {
          throw domainError('FAILED_PRECONDITION', '독립 귀환에서는 도움을 사용할 수 없습니다.')
        }
        if (session.intent === 'arena' && source !== 'integrity-focus') {
          throw domainError('FAILED_PRECONDITION', '아레나에서는 도움을 사용할 수 없습니다.')
        }
        const summary = session.assistanceSummary || { count: 0, highestScaffoldLevel: 0, externalAiUsed: false }
        if (source === 'integrity-focus') {
          session.integrityViolationCount = (session.integrityViolationCount || 0) + 1
        } else {
          session.assistanceSummary = {
            count: summary.count + 1,
            highestScaffoldLevel: Math.max(summary.highestScaffoldLevel || 0, scaffoldLevel),
            externalAiUsed: Boolean(summary.externalAiUsed || source === 'external-ai'),
          }
        }
        if (source === 'external-ai' || source === 'integrity-focus') {
          session.rankEligible = false
          session.masteryEligible = false
        }
        const holdReasons = new Set(session.masteryHoldReasons || [])
        if (source === 'external-ai') holdReasons.add('external_ai')
        if (source === 'integrity-focus') holdReasons.add('integrity_review')
        if (scaffoldLevel >= 5 || answerExposure === 'full' || source === 'solution-review') {
          session.masteryEligible = false
          holdReasons.add('strong_scaffold')
        }
        session.masteryHoldReasons = [...holdReasons]
        return session
      },
    })
    return {
      ok: true,
      duplicated: result.duplicated,
      rankEligible: result.session.rankEligible,
      masteryEligible: result.session.masteryEligible,
      masteryHoldReasons: result.session.masteryHoldReasons || [],
      integrityViolationCount: result.session.integrityViolationCount || 0,
    }
  }

  async function handleSubmitAlgorithmBase(data, context) {
    const uid = requireAuthenticatedUid(context)
    const attemptId = data?.attemptId
    const submissionId = data?.submissionId
    const code = safeCode(data?.code)
    safeIdentifier(attemptId, 'attemptId')
    safeIdentifier(submissionId, 'submissionId', 120)
    const currentTime = now()
    const session = await store.getSession(attemptId)
    assertOwnedActiveSession(session, uid, currentTime)
    if (![ATTEMPT_STATES.STARTED, ATTEMPT_STATES.BASE_SUBMITTED, ATTEMPT_STATES.BASE_PASSED].includes(session.state)) {
      throw domainError('FAILED_PRECONDITION', '현재 단계에서는 기본 코드를 제출할 수 없습니다.')
    }

    const result = judge.evaluateBaseSubmission(session.problemId, session.problemVersion, code)
    let understandingChallenge = null
    await store.updateSession(attemptId, (latest) => {
      assertOwnedActiveSession(latest, uid, currentTime)
      const targetState = result.resultStar ? ATTEMPT_STATES.BASE_PASSED : ATTEMPT_STATES.BASE_SUBMITTED
      if (latest.state !== targetState) validateAttemptTransition(latest.state, targetState)
      latest.state = targetState
      latest.lastBaseSubmissionId = submissionId
      latest.baseCodeHash = codeHash(code)
      if (result.resultStar) {
        const definition = getPrivateProblemDefinition(latest.problemId, latest.problemVersion)
        const challenges = definition.understandingChallenges || []
        if (challenges.length === 0) throw domainError('JUDGE_UNAVAILABLE', '이해 확인 문제를 준비하지 못했습니다.')
        const challenge = challenges[latest.variantSeed % challenges.length]
        latest.understandingChallengeId = challenge.challengeId
        latest.stars = Math.max(latest.stars, 1)
        latest.starDetails.star1_result = true
        understandingChallenge = publicUnderstandingChallenge(challenge)
      }
      return latest
    })

    return {
      status: result.status,
      resultStar: result.resultStar,
      testGroups: result.testGroups,
      understandingChallenge,
      nextAction: result.resultStar ? 'understanding_check' : 'retry_code',
    }
  }

  async function handleSubmitUnderstandingEvidence(data, context) {
    const uid = requireAuthenticatedUid(context)
    const { attemptId, challengeId, answers } = data || {}
    safeIdentifier(attemptId, 'attemptId')
    safeIdentifier(challengeId, 'challengeId', 120)
    if (!answers || typeof answers !== 'object' || Array.isArray(answers) || Object.keys(answers).length > 20) {
      throw domainError('INVALID_ARGUMENT', 'answers 형식이 올바르지 않습니다.')
    }
    const currentTime = now()
    let passed = false
    await store.updateSession(attemptId, (session) => {
      assertOwnedActiveSession(session, uid, currentTime)
      if (session.state !== ATTEMPT_STATES.BASE_PASSED || session.understandingChallengeId !== challengeId) {
        throw domainError('FAILED_PRECONDITION', '서버가 발급한 이해 확인 문제가 아닙니다.')
      }
      const definition = getPrivateProblemDefinition(session.problemId, session.problemVersion)
      const challenge = (definition.understandingChallenges || []).find((item) => item.challengeId === challengeId)
      passed = challenge.questions.every((question) => {
        const studentAns = answers?.[question.id]
        return studentAns === question.expected || String(studentAns).trim() === String(question.expected).trim()
      })
      if (passed) {
        validateAttemptTransition(session.state, ATTEMPT_STATES.UNDERSTANDING_PASSED)
        session.state = ATTEMPT_STATES.UNDERSTANDING_PASSED
        session.stars = Math.max(session.stars, 2)
        session.starDetails.star2_understanding = true
      }
      return session
    })
    return { passed, understandingStar: passed, nextAction: passed ? 'transfer_challenge' : 'retry_understanding' }
  }

  async function handleIssueTransferChallenge(data, context) {
    const uid = requireAuthenticatedUid(context)
    const secret = requireServerSecret(secretProvider)
    const attemptId = data?.attemptId
    safeIdentifier(attemptId, 'attemptId')
    const currentTime = now()
    let challenge
    let tokenExpiresAt
    await store.updateSession(attemptId, (session) => {
      assertOwnedActiveSession(session, uid, currentTime)
      if (!session.starDetails.star1_result || !session.starDetails.star2_understanding) {
        throw domainError('FAILED_PRECONDITION', 'Star 1과 Star 2가 먼저 필요합니다.')
      }
      const definition = getPrivateProblemDefinition(session.problemId, session.problemVersion)
      const challenges = getTransferChallenges(definition)
      if (challenges.length === 0) throw domainError('JUDGE_UNAVAILABLE', '전이 문제를 준비하지 못했습니다.')
      challenge = session.transferChallengeId
        ? challenges.find((item) => item.transferChallengeId === session.transferChallengeId)
        : challenges[session.variantSeed % challenges.length]
      if (!challenge) throw domainError('JUDGE_UNAVAILABLE', '전이 문제를 찾지 못했습니다.')
      if (session.state !== ATTEMPT_STATES.TRANSFER_ISSUED) {
        validateAttemptTransition(session.state, ATTEMPT_STATES.TRANSFER_ISSUED)
      }
      tokenExpiresAt = currentTime + 60 * 60 * 1000
      session.transferChallengeId = challenge.transferChallengeId
      session.transferChallengeExpiresAt = tokenExpiresAt
      session.state = ATTEMPT_STATES.TRANSFER_ISSUED
      return session
    })
    return {
      challengeToken: signChallengeToken(secret, attemptId, challenge.transferChallengeId, tokenExpiresAt),
      transferChallenge: publicTransferChallenge(challenge),
    }
  }

  async function handleSubmitAlgorithmTransfer(data, context) {
    const uid = requireAuthenticatedUid(context)
    const secret = requireServerSecret(secretProvider)
    const { attemptId, challengeToken } = data || {}
    safeIdentifier(attemptId, 'attemptId')
    if (typeof challengeToken !== 'string' || challengeToken.length > 512) {
      throw domainError('INVALID_ARGUMENT', 'challengeToken 형식이 올바르지 않습니다.')
    }
    const transferCode = safeCode(data?.transferCode)
    const currentTime = now()
    const session = await store.getSession(attemptId)
    if (session?.uid === uid && session.state === ATTEMPT_STATES.FINALIZED && session.transferCodeHash === codeHash(transferCode)) {
      const progress = await store.getProgress(uid, session.problemId)
      return {
        passed: true,
        stars: session.stars,
        starDetails: session.starDetails,
        masteryStatus: progress?.masteryStatus,
        nextReturnAt: progress?.nextReturnAt || null,
        masteryHoldReasons: progress?.masteryHoldReasons || [],
        duplicated: true,
      }
    }
    assertOwnedActiveSession(session, uid, currentTime)
    if (![ATTEMPT_STATES.TRANSFER_ISSUED, ATTEMPT_STATES.TRANSFER_SUBMITTED].includes(session.state)) {
      throw domainError('FAILED_PRECONDITION', '현재 단계에서는 전이 답안을 제출할 수 없습니다.')
    }
    const verified = verifyChallengeToken(secret, challengeToken, attemptId, currentTime)
    if (!verified || verified.transferChallengeId !== session.transferChallengeId) {
      throw domainError('FAILED_PRECONDITION', '전이 문제 토큰이 올바르지 않거나 만료되었습니다.')
    }
    const result = judge.evaluateTransferSubmission(
      session.problemId,
      session.problemVersion,
      verified.transferChallengeId,
      transferCode
    )

    const submittedSession = await store.updateSession(attemptId, (latest) => {
      assertOwnedActiveSession(latest, uid, currentTime)
      validateAttemptTransition(latest.state, ATTEMPT_STATES.TRANSFER_SUBMITTED)
      latest.state = ATTEMPT_STATES.TRANSFER_SUBMITTED
      latest.transferCodeHash = codeHash(transferCode)
      if (result.passed) {
        latest.stars = 3
        latest.starDetails.star3_transfer = true
      }
      return latest
    })
    if (!result.passed) {
      return { passed: false, stars: submittedSession.stars, starDetails: submittedSession.starDetails }
    }

    validateAttemptTransition(submittedSession.state, ATTEMPT_STATES.FINALIZED)
    const finalizedSession = { ...submittedSession, state: ATTEMPT_STATES.FINALIZED, finalizedAtMs: currentTime }
    const previous = await store.getProgress(uid, session.problemId)
    const isMastered = previous?.masteryStatus === 'mastered' ||
      (submittedSession.masteryEligible && submittedSession.stars === 3)
    const nextReturnAt = isMastered ? null : currentTime + RETURN_DELAY_MS
    const progressRecord = {
      problemId: session.problemId,
      bestStars: Math.max(previous?.bestStars || 0, 3),
      masteryStatus: isMastered ? 'mastered' : 'pending_independent_return',
      nextReturnAt,
      masteryHoldReasons: isMastered ? [] : (submittedSession.masteryHoldReasons || []),
      lastFinalizedAtMs: currentTime,
    }
    const attemptSnapshot = {
      attemptId,
      uid,
      problemId: session.problemId,
      problemVersion: session.problemVersion,
      intent: session.intent,
      shell: session.shell,
      variantSeed: session.variantSeed,
      generatorVersion: session.generatorVersion,
      baseCodeHash: submittedSession.baseCodeHash,
      transferCodeHash: submittedSession.transferCodeHash,
      assistanceSummary: submittedSession.assistanceSummary,
      rankEligible: submittedSession.rankEligible,
      masteryEligible: submittedSession.masteryEligible,
      masteryHoldReasons: submittedSession.masteryHoldReasons || [],
      stars: 3,
      starDetails: submittedSession.starDetails,
      runtimeVersion: 'restricted-condition-v1',
      traceSchemaVersion: 1,
    }
    const rewardKey = `reward:${uid}:${session.problemId}:exploration:c1`
    const returnRecord = isMastered ? null : {
      returnId: `return:${uid}:${session.problemId}`,
      uid,
      problemId: session.problemId,
      sourceAttemptId: attemptId,
      eligibleAtMs: nextReturnAt,
      status: 'scheduled',
    }
    const finalized = await store.finalizeSuccessfulTransfer({
      attemptId,
      uid,
      expectedState: ATTEMPT_STATES.TRANSFER_SUBMITTED,
      finalizedSession,
      attemptSnapshot,
      progressRecord,
      rewardKey,
      returnRecord,
    })
    return {
      passed: true,
      stars: 3,
      starDetails: submittedSession.starDetails,
      masteryStatus: finalized.progress.masteryStatus,
      nextReturnAt: finalized.progress.nextReturnAt,
      masteryHoldReasons: finalized.progress.masteryHoldReasons || [],
    }
  }

  async function handleGetAlgorithmProgress(data, context) {
    const uid = requireAuthenticatedUid(context)
    const problemId = data?.problemId
    if (problemId !== 'all') {
      safeIdentifier(problemId, 'problemId', 80)
      return (await store.getProgress(uid, problemId)) || {
        problemId,
        bestStars: 0,
        masteryStatus: 'unstarted',
        nextReturnAt: null,
        masteryHoldReasons: [],
      }
    }
    const records = (await store.getAllProgress(uid)) || {}
    return Object.fromEntries(Object.entries(records).map(([id, record]) => [id, {
      problemId: id,
      bestStars: Math.max(0, Math.min(3, Number(record?.bestStars) || 0)),
      masteryStatus: record?.masteryStatus || 'unstarted',
      nextReturnAt: record?.nextReturnAt ?? null,
      masteryHoldReasons: Array.isArray(record?.masteryHoldReasons) ? record.masteryHoldReasons : [],
      lastFinalizedAtMs: record?.lastFinalizedAtMs ?? null,
    }]))
  }

  return {
    handleStartAlgorithmAttempt,
    handleRecordAlgorithmAssistance,
    handleSubmitAlgorithmBase,
    handleSubmitUnderstandingEvidence,
    handleIssueTransferChallenge,
    handleSubmitAlgorithmTransfer,
    handleGetAlgorithmProgress,
  }
}

module.exports = {
  createCallableOrchestrator,
  deriveHmacSeed,
  signChallengeToken,
  verifyChallengeToken,
}
