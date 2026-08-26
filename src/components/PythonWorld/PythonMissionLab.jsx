import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { evaluateMissionRun, translatePythonError } from './missionEvaluator'
import { getMissionVariant } from './pythonMissionCatalog'
import { normalizeRuntimeEvents } from './lumiEventNormalizer'
import { createPlaybackSteps } from './lumiWorldReducer'
import { reduceExecutionTraceState } from './executionTraceReducer'
import { mergeMissionCompletion, normalizeMissionLabProgress } from '../../utils/pythonMissionProgressUtils'
import PythonRuntimeClient from './runtime/PythonRuntimeClient'
import PythonEditor from './PythonEditor'
import PythonWorldCanvas from './PythonWorldCanvas'
import { playLumiSound, isLumiMuted, setLumiMuted, stopWorldAmbience } from './lumiAudio'
import { claimLumiMissionReward } from '../../services/lumiRewardService'
import { deriveExecutionModel, selectSystemObjectInspectorItems } from './executionTraceSelectors'
import { projectTacticalEvents } from './lumiTacticalEventProjector'
import { reduceTacticalState } from './lumiTacticalReducer'
import LumiTacticalInspector from './LumiTacticalInspector'
import LumiPygameBridgeCard from './LumiPygameBridgeCard'
import { getLumiPygameBridge } from './lumiPygameBridgeRegistry'
import {
  LUMI_DRAFT_SCHEMA_VERSION,
  getLumiConceptLessons,
  getLumiInitialCode,
  getLumiLearningSteps,
  getLumiMissionGoals,
  getLumiMissionHints,
  getLumiScaffoldMeta,
  getLumiSolutionPreview,
  getRelevantMissionApi,
} from './lumiScaffolding'
import './PythonMissionLab.css'

const DRAFT_PREFIX = `metasense:python-mission:${LUMI_DRAFT_SCHEMA_VERSION}:`
const RUN_SEQUENCE_PREFIX = 'metasense:python-mission-run-sequence:v5:'
const MAX_PERSISTED_CODE_CHARS = 20_000
const RUN_HISTORY_SLOTS = 20
let fallbackRunSequence = 0

function codeForPersistence(value) {
  return String(value || '').slice(0, MAX_PERSISTED_CODE_CHARS)
}

function getNextRunSlot(unitId, missionId) {
  const key = `${RUN_SEQUENCE_PREFIX}${unitId}:${missionId}`
  try {
    const next = (Number(localStorage.getItem(key) || -1) + 1) % RUN_HISTORY_SLOTS
    localStorage.setItem(key, String(next))
    return `slot_${String(next).padStart(2, '0')}`
  } catch {
    fallbackRunSequence = (fallbackRunSequence + 1) % RUN_HISTORY_SLOTS
    return `slot_${String(fallbackRunSequence).padStart(2, '0')}`
  }
}

function readDraft(unitId, mission) {
  try {
    const currentDraft = localStorage.getItem(`${DRAFT_PREFIX}${unitId}:${mission.id}`)
    if (typeof currentDraft === 'string') return currentDraft
    return getLumiInitialCode(mission)
  } catch {
    return getLumiInitialCode(mission)
  }
}

function hasLocalDraft(unitId, missionId) {
  try {
    return localStorage.getItem(`${DRAFT_PREFIX}${unitId}:${missionId}`) !== null
  } catch {
    return false
  }
}

function getLineEvent(events, playhead) {
  if (!Array.isArray(events) || playhead < 0) return null
  for (let index = Math.min(playhead, events.length - 1); index >= 0; index -= 1) {
    const ev = events[index]
    if (ev?.type === 'line_entered' || ev?.type === 'line') return ev.payload || ev
  }
  return null
}

function getPlaybackCursors(rawEvents) {
  const normalized = normalizeRuntimeEvents(rawEvents)
  return createPlaybackSteps(normalized).map((step) => {
    const lastEvent = step.events[step.events.length - 1]
    return normalized.indexOf(lastEvent)
  }).filter((index) => index >= 0)
}

function SolutionCodeOverlay({ preview, onClose }) {
  const [timeLeft, setTimeLeft] = useState(preview.duration)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    const startedAt = Date.now()
    const timer = setInterval(() => {
      const remaining = Math.max(0, preview.duration - (Date.now() - startedAt))
      setTimeLeft(remaining)
      if (remaining <= 0) {
        clearInterval(timer)
        onCloseRef.current?.()
      }
    }, 100)
    return () => clearInterval(timer)
  }, [preview.duration, preview.sessionId])

  return (
    <div
      className="python-lab__solution-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="완성 코드 예시"
      onCopy={(e) => e.preventDefault()}
      onCut={(e) => e.preventDefault()}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
    >
      <div className="python-lab__solution-header">
        <div>
          <strong>완성 코드 예시 (복사 불가)</strong>
          <span>눈으로 읽고 이해한 뒤 직접 에디터에 타이핑하세요. (복사 및 드래그가 차단되어 있습니다)</span>
        </div>
        <button type="button" onClick={onClose}>닫기</button>
      </div>
      <pre
        onCopy={(e) => e.preventDefault()}
        onCut={(e) => e.preventDefault()}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      >
        {preview.code}
      </pre>
      <div className="python-lab__solution-footer">
        <div className="python-lab__solution-progress">
          <span style={{ width: `${(timeLeft / preview.duration) * 100}%` }} />
        </div>
        <span>{Math.ceil(timeLeft / 1000)}초 뒤 자동으로 닫힙니다.</span>
      </div>
    </div>
  )
}

export default function PythonMissionLab({ unit, missionSet, initialMissionIndex = null, initialProgress, onBack }) {
  const { user } = useAuth()
  const missions = useMemo(() => missionSet?.missions || [], [missionSet?.missions])
  const initial = normalizeMissionLabProgress(initialProgress)
  const firstIncompleteIndex = missions.findIndex((item) => !initial.completedMissionIds.includes(item.id))
  const firstIncomplete = firstIncompleteIndex < 0 ? 0 : firstIncompleteIndex
  const defaultIndex = typeof initialMissionIndex === 'number' && initialMissionIndex >= 0
    ? initialMissionIndex
    : firstIncomplete
  const [missionIndex, setMissionIndex] = useState(defaultIndex)
  const hasUserSelectedMissionRef = useRef(typeof initialMissionIndex === 'number' && initialMissionIndex >= 0)
  const mission = missions[missionIndex]
  const isPreviewOnly = missionSet?.persistencePolicy === 'none'
  const [progress, setProgress] = useState(initial)
  const [code, setCode] = useState(() => readDraft(unit?.id, missions[defaultIndex] || {}))
  const [inputValues, setInputValues] = useState(() => (missions[defaultIndex]?.inputValues || ['4']))
  const [runtimeStatus, setRuntimeStatus] = useState('loading')
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState([])
  const [playhead, setPlayhead] = useState(-1)
  const [stdout, setStdout] = useState('')
  const [result, setResult] = useState(null)
  const [runtimeMetadata, setRuntimeMetadata] = useState(null)
  const [inspectorTab, setInspectorTab] = useState('trace')
  const [inspectorHeight, setInspectorHeight] = useState(140)
  const [isResizingInspector, setIsResizingInspector] = useState(false)
  const resizeStartRef = useRef({ startY: 0, startHeight: 140 })
  const [hintLevel, setHintLevel] = useState(0)
  const [solutionReviewUsed, setSolutionReviewUsed] = useState(false)
  const [solutionSession, setSolutionSession] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const [soundMuted, setSoundMuted] = useState(() => isLumiMuted())
  const [showActCelebration, setShowActCelebration] = useState(false)
  const [lastRewardPaid, setLastRewardPaid] = useState(null)
  const runtimeRef = useRef(null)
  const autoplayRef = useRef(null)
  const draftDirtyRef = useRef(false)
  const draftWriteEpochRef = useRef(0)
  const draftLoadEpochRef = useRef(0)
  const runIdRef = useRef(0)
  const celebratedRunIdsRef = useRef(new Set())
  const pendingResultRef = useRef(null)
  const lastServerDraftRef = useRef('')

  const handleStartResize = useCallback((e) => {
    e.preventDefault()
    setIsResizingInspector(true)
    resizeStartRef.current = {
      startY: e.clientY,
      startHeight: inspectorHeight,
    }
  }, [inspectorHeight])

  useEffect(() => {
    if (!isResizingInspector) return undefined

    const handleMouseMove = (e) => {
      const deltaY = resizeStartRef.current.startY - e.clientY
      const nextHeight = Math.max(60, Math.min(500, resizeStartRef.current.startHeight + deltaY))
      setInspectorHeight(nextHeight)
    }

    const handleMouseUp = () => {
      setIsResizingInspector(false)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isResizingInspector])
  const scaffoldMeta = useMemo(() => getLumiScaffoldMeta(mission), [mission])
  const learningSteps = useMemo(() => getLumiLearningSteps(mission), [mission])
  const missionHints = useMemo(() => getLumiMissionHints(mission), [mission])
  const relevantApi = useMemo(() => getRelevantMissionApi(mission), [mission])
  const conceptLessons = useMemo(() => getLumiConceptLessons(mission), [mission])
  const solutionPreview = useMemo(() => getLumiSolutionPreview(mission), [mission])
  const missionGoals = useMemo(() => getLumiMissionGoals(mission, result), [mission, result])
  const assistanceLevel = Math.max(hintLevel, solutionReviewUsed ? 3 : 0)

  const currentSeq = playhead < 0 ? -1 : (events[playhead]?.seq ?? playhead)

  const executionModel = useMemo(() => {
    return deriveExecutionModel(events, currentSeq, runtimeMetadata?.classesMetadata)
  }, [events, currentSeq, runtimeMetadata?.classesMetadata])

  const registeredClasses = executionModel.registeredClasses
  const instanceCreations = executionModel.instances
  const attributeDiffs = executionModel.attributeDiffs
  const systemObjectItems = useMemo(() => (
    selectSystemObjectInspectorItems(runtimeMetadata?.systemObjects)
  ), [runtimeMetadata?.systemObjects])

  useEffect(() => {
    if (initialProgress) {
      const normalized = normalizeMissionLabProgress(initialProgress)
      setProgress(normalized)
      if (!hasUserSelectedMissionRef.current) {
        const nextIncomplete = missions.findIndex((item) => !normalized.completedMissionIds.includes(item.id))
        if (nextIncomplete >= 0) {
          setMissionIndex(nextIncomplete)
        }
      }
    }
  }, [initialProgress, missions])

  useEffect(() => {
    if (!mission) return
    const isPrintFocused =
      mission.id === 'lumi-act1-04' ||
      mission.conceptEvidence?.mustCall?.includes('print') ||
      mission.goals?.some((g) => g.type === 'stdoutIncludes' || g.type === 'stdoutLineCountAtLeast')
    if (isPrintFocused) {
      setInspectorTab('output')
    } else {
      setInspectorTab('trace')
    }
  }, [mission])

  const toggleSound = useCallback(() => {
    setSoundMuted((prev) => {
      const next = !prev
      setLumiMuted(next)
      if (!next) playLumiSound('wake')
      return next
    })
  }, [])

  const activeTrace = useMemo(() => getLineEvent(events, playhead), [events, playhead])
  const executionTrace = useMemo(() => {
    const targetSeq = playhead < 0 ? -1 : (events[playhead]?.seq ?? playhead)
    return reduceExecutionTraceState(events, targetSeq)
  }, [events, playhead])
  const tacticalState = useMemo(() => {
    if (!mission?.isTacticalMission) return null
    const targetSeq = playhead < 0 ? -1 : (events[playhead]?.seq ?? playhead)
    const tacticalEvents = projectTacticalEvents(events, mission)
    return reduceTacticalState(tacticalEvents, targetSeq)
  }, [mission, events, playhead])
  const playbackCursors = useMemo(() => getPlaybackCursors(events), [events])
  const playbackStepIndex = useMemo(() => {
    if (playhead < 0 || playbackCursors.length === 0) return -1
    const index = playbackCursors.findIndex((cursor) => cursor >= playhead)
    return index < 0 ? playbackCursors.length - 1 : index
  }, [playbackCursors, playhead])
  const completedIds = useMemo(() => new Set(progress.completedMissionIds || []), [progress.completedMissionIds])

  useEffect(() => {
    if (playhead >= 0 && events[playhead]) {
      const event = events[playhead]
      switch (event.type) {
        case 'rover_woke': {
          if (mission.id === 'lumi-vs-01') {
            playLumiSound('first_awaken')
          } else {
            playLumiSound('boot')
          }
          break
        }
        case 'rover_moved': {
          if (event.payload?.blocked) {
            playLumiSound('error_collision')
          } else {
            const remainingMoves = events.slice(playhead + 1).some((ev) => ev.type === 'rover_moved')
            playLumiSound('move', { isFinalStep: !remainingMoves })
          }
          break
        }
        case 'rover_turned':
          playLumiSound('turn')
          break
        case 'rover_spoke':
          playLumiSound('say')
          break
        case 'rover_scanned':
        case 'sensor_read':
          playLumiSound('scan')
          break
        case 'rover_collected':
          playLumiSound('collect')
          break
        case 'rover_charged':
          playLumiSound('charge')
          break
        case 'memory_changed':
          playLumiSound('memory')
          break
        case 'game_inited':
          playLumiSound('boot')
          break
        case 'shield_raised':
          playLumiSound('shield')
          break
        case 'sound_played': {
          const soundName = String(event.payload?.name || '').toLowerCase()
          const supportedSound = {
            alert: 'alert', warning: 'warning', engine: 'engine', thrust: 'thrust',
            hud: 'hud', radar: 'radar', blip: 'blip', damage: 'damage', hit: 'hit',
            pulse: 'pulse', laser: 'laser', shield: 'shield',
          }[soundName]
          // lumi.shield() already emits shield_raised. Avoid playing the same
          // effect twice when a mission also records game.sound.play("shield").
          const recentShieldAction = soundName === 'shield'
            && events.slice(Math.max(0, playhead - 4), playhead)
              .some((previousEvent) => previousEvent.type === 'shield_raised')
          if (supportedSound && !recentShieldAction) playLumiSound(supportedSound)
          break
        }
        case 'music_played': {
          break
        }
        default:
          break
      }
    }
  }, [playhead, events, mission.id])

  useEffect(() => {
    const runtime = new PythonRuntimeClient({
      onStatus: ({ status }) => setRuntimeStatus(status),
    })
    runtimeRef.current = runtime
    runtime.load().catch(() => setRuntimeStatus('error'))
    return () => {
      clearInterval(autoplayRef.current)
      runtime.dispose()
      runtimeRef.current = null
      stopWorldAmbience()
    }
  }, [])

  useEffect(() => {
    if (!mission) return
    let active = true
    const loadEpoch = ++draftLoadEpochRef.current
    draftWriteEpochRef.current += 1
    runIdRef.current += 1
    pendingResultRef.current = null
    clearInterval(autoplayRef.current)
    setPlaying(false)
    setRunning(false)
    setCode(readDraft(unit?.id, mission))
    setInputValues(mission?.inputValues || ['4'])
    setEvents([])
    setPlayhead(-1)
    setStdout('')
    setResult(null)
    setRuntimeMetadata(null)
    setLastRewardPaid(null)
    setHintLevel(0)
    setSolutionReviewUsed(false)
    setSolutionSession(null)
    draftDirtyRef.current = false

    const solutionTimer = setTimeout(() => {
      const preview = getLumiSolutionPreview(mission)
      if (preview) setSolutionSession({ sessionId: Date.now(), ...preview, automatic: true })
    }, 500)

    if (!isPreviewOnly && user?.uid && missionSet?.kind !== 'prototype' && !hasLocalDraft(unit?.id, mission.id)) {
      getDoc(doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id))
        .then((snapshot) => {
          const data = snapshot.data()
          const serverDraft = data?.draftCode
          if (
            active && draftLoadEpochRef.current === loadEpoch &&
            snapshot.exists() &&
            data?.draftSchemaVersion === LUMI_DRAFT_SCHEMA_VERSION &&
            typeof serverDraft === 'string'
          ) setCode(serverDraft)
        })
        .catch((error) => console.warn('Mission draft load failed:', error))
    }
    return () => {
      active = false
      clearTimeout(solutionTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPreviewOnly, mission?.id, missionSet?.kind, unit?.id, user?.uid])

  useEffect(() => {
    if (isPreviewOnly || !mission || !draftDirtyRef.current) return
    const writeEpoch = draftWriteEpochRef.current
    const timer = setTimeout(() => {
      if (draftWriteEpochRef.current !== writeEpoch || !draftDirtyRef.current) return
      const persistedCode = codeForPersistence(code)
      try {
        localStorage.setItem(`${DRAFT_PREFIX}${unit?.id}:${mission.id}`, persistedCode)
      } catch {
        // Private browsing or storage quotas should not block the mission.
      }
      draftDirtyRef.current = false
    }, 2500)
    return () => clearTimeout(timer)
  }, [code, isPreviewOnly, mission, unit?.id])

  const pausePlayback = useCallback(() => {
    clearInterval(autoplayRef.current)
    setPlaying(false)
  }, [])

  const startAutoplay = useCallback((nextEvents, startAt = 0, onComplete = null) => {
    clearInterval(autoplayRef.current)
    const cursors = getPlaybackCursors(nextEvents)
    if (!cursors.length || startAt >= cursors.length) {
      setPlaying(false)
      onComplete?.()
      return
    }
    let stepIndex = startAt - 1
    if (startAt === 0) setPlayhead(-1)
    setPlaying(true)
    autoplayRef.current = setInterval(() => {
      stepIndex += 1
      setPlayhead(cursors[stepIndex])
      if (stepIndex >= cursors.length - 1) {
        clearInterval(autoplayRef.current)
        setPlaying(false)
        onComplete?.()
      }
    }, 320 / playbackSpeed)
  }, [playbackSpeed])

  const scaffold = mission.scaffold || {}
  const visibleTools = scaffold.visibleTools || ['run', 'reset', 'step', 'replay', 'memory', 'sensor', 'timeline', 'api', 'inspector']
  const showReset = visibleTools.includes('reset')
  const showTimeline = visibleTools.includes('step') || visibleTools.includes('timeline') || visibleTools.includes('replay')
  // 학습에 필요한 새 도구의 설명은 미션별 UI 옵션과 관계없이 항상 제공합니다.
  const showApi = relevantApi.length > 0
  const showMissionTabs = missions.length > 1
  const showHud = missionSet.kind !== 'prototype' || visibleTools.includes('hud')
  const showSensor = missionSet.kind !== 'prototype' || visibleTools.includes('sensor')
  const showInspector = true
  const isViewOnly = scaffold.mode === 'view-only'
  const firstUnfinishedIndex = missions.findIndex((item) => !completedIds.has(item.id))
  const maxUnlockedMissionIndex = firstUnfinishedIndex < 0 ? missions.length - 1 : firstUnfinishedIndex

  const persistCompletion = useCallback(async (evaluation) => {
    if (!mission) return
    const isFirstMissionClear = !progress.completedMissionIds?.includes(mission.id)
    const previousStars = Number(progress.bestStarsByMission?.[mission.id] || 0)
    const previousAssistance = progress.bestAssistanceByMission?.[mission.id]
    const completionEvidenceImproved = (
      isFirstMissionClear ||
      Number(evaluation.stars || 0) > previousStars ||
      previousAssistance === undefined ||
      assistanceLevel < Number(previousAssistance)
    )
    const assistanceInfo = {
      maxLevel: assistanceLevel,
      hintsViewed: [
        ...missionHints.slice(0, hintLevel).map((hint) => hint.type || 'context'),
        ...(solutionReviewUsed ? ['solution-review'] : []),
      ],
      rescueUsed: solutionReviewUsed,
    }
    const nextProgress = mergeMissionCompletion(progress, missionSet, mission.id, evaluation.stars, assistanceInfo)
    nextProgress.independentClearCount = Number(progress.independentClearCount || 0)
    nextProgress.hintedClearCount = Number(progress.hintedClearCount || 0)
    if (isFirstMissionClear) {
      if (assistanceLevel > 0) nextProgress.hintedClearCount += 1
      else nextProgress.independentClearCount += 1
    }
    setProgress(nextProgress)
    if (isPreviewOnly) return

    const actKey = missionSet?.actId || (unit?.id?.includes('act_1') ? 'act-1-command' : 'act-0-awakening')
    try {
      localStorage.setItem(`metasense:lumi-progress:${actKey}`, JSON.stringify(nextProgress))
      if (actKey === 'act-0-awakening') {
        localStorage.setItem('metasense:lumi-progress:v1', JSON.stringify(nextProgress))
      }
    } catch {
      // ignore
    }

    const wasActCompletedBefore = Boolean(
      progress?.completed ||
      (progress?.completedMissionIds && progress.completedMissionIds.length >= missions.length)
    )
    const isActNowCompleted = Boolean(
      nextProgress.completed ||
      (nextProgress.completedMissionIds && nextProgress.completedMissionIds.length >= missions.length)
    )

    if (!wasActCompletedBefore && isActNowCompleted) {
      setTimeout(() => {
        setShowActCelebration(true)
        playLumiSound('clear_core')
      }, 600)
    }

    if (!isPreviewOnly && completionEvidenceImproved && user?.uid && unit?.id) {
      try {
        const rewardResult = await claimLumiMissionReward({
          userId: user.uid,
          missionId: mission.id,
          stars: Number(evaluation.stars || 2),
          assistanceLevel,
          unitId: unit.id,
          unitTitle: unit.title || 'LUMI Protocol: 사라진 빛의 항로',
          lumiCourseId: missionSet?.lumiCourseId || 'lumi-season-1',
          missionSetId: missionSet?.id || 'lumi-vertical-slice-v1',
          missionSetVersion: Number(missionSet?.version || 1),
          totalMissionCount: missions.length || 10,
        })
        if (rewardResult?.rewarded && rewardResult.crystalsEarned > 0) {
          setLastRewardPaid(rewardResult)
        }
      } catch (rewardErr) {
        console.warn('LUMI mission reward claim error:', rewardErr)
      }
    }
  }, [assistanceLevel, hintLevel, isPreviewOnly, mission, missionHints, missionSet, missions.length, progress, solutionReviewUsed, unit, user?.uid])

  const persistAttempt = useCallback(async ({ evaluation, runtimeResult, durationMs }) => {
    if (isPreviewOnly || !user?.uid || !unit?.id || !mission) return
    const persistedCode = codeForPersistence(code)
    const payload = {
      unitId: unit.id,
      unitTitle: unit.title || '',
      missionSetId: missionSet.id,
      missionSetVersion: Number(missionSet.version || 1),
      missionId: mission.id,
      missionTitle: mission.title,
      lastCode: persistedCode,
      draftCode: persistedCode,
      draftSchemaVersion: LUMI_DRAFT_SCHEMA_VERSION,
      lastResult: {
        completed: evaluation.completed === true,
        cleared: evaluation.cleared === true,
        stars: Number(evaluation.stars || 0),
        worldGoalPassed: evaluation.worldGoalPassed === true,
        conceptPassed: evaluation.conceptPassed === true,
        robustnessPassed: evaluation.robustnessPassed ?? null,
        errorType: runtimeResult?.error?.type || '',
        errorLine: Number(runtimeResult?.error?.line || 0),
        commandCount: Number(runtimeResult?.commandCount || 0),
        hintLevel: assistanceLevel,
        durationMs: Math.round(durationMs || 0),
      },
      lastPlayedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(evaluation.completed ? { representativeSuccessCode: persistedCode, lastCompletedAt: serverTimestamp() } : {}),
    }
    const missionProgressRef = doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id)
    const serverDraftKey = `${mission.id}:${persistedCode}`
    const completed = evaluation.completed === true || evaluation.cleared === true
    const previousStars = Number(progress.bestStarsByMission?.[mission.id] || 0)
    const previousAssistance = progress.bestAssistanceByMission?.[mission.id]
    const wasCompleted = progress.completedMissionIds?.includes(mission.id)
    const evidenceImproved = (
      !wasCompleted ||
      Number(evaluation.stars || 0) > previousStars ||
      previousAssistance === undefined ||
      assistanceLevel < Number(previousAssistance)
    )

    if (!completed) {
      if (lastServerDraftRef.current === serverDraftKey) return
      await setDoc(missionProgressRef, {
        unitId: unit.id,
        unitTitle: unit.title || '',
        missionSetId: missionSet.id,
        missionSetVersion: Number(missionSet.version || 1),
        missionId: mission.id,
        missionTitle: mission.title,
        draftCode: persistedCode,
        draftSchemaVersion: LUMI_DRAFT_SCHEMA_VERSION,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      lastServerDraftRef.current = serverDraftKey
      return
    }

    if (!evidenceImproved) return
    const runsRef = collection(missionProgressRef, 'runs')
    const runRef = doc(runsRef, getNextRunSlot(unit.id, mission.id))
    await Promise.all([
      setDoc(missionProgressRef, payload, { merge: true }),
      setDoc(runRef, {
        code: persistedCode,
        completed: evaluation.completed === true,
        cleared: evaluation.cleared === true,
        stars: Number(evaluation.stars || 0),
        worldGoalPassed: evaluation.worldGoalPassed === true,
        conceptPassed: evaluation.conceptPassed === true,
        robustnessPassed: evaluation.robustnessPassed ?? null,
        conceptsUsed: runtimeResult?.conceptsUsed || [],
        callsUsed: runtimeResult?.callsUsed || [],
        error: runtimeResult?.error || null,
        commandCount: Number(runtimeResult?.commandCount || 0),
        eventCount: Number(runtimeResult?.events?.length || 0),
        hintLevel: assistanceLevel,
        durationMs: Math.round(durationMs || 0),
        timestamp: serverTimestamp(),
      }),
    ])
    lastServerDraftRef.current = serverDraftKey
  }, [assistanceLevel, code, isPreviewOnly, mission, missionSet.id, missionSet.version, progress.bestAssistanceByMission, progress.bestStarsByMission, progress.completedMissionIds, unit, user?.uid])

  const runMission = useCallback(async () => {
    if (!mission || !runtimeRef.current || running) return
    const runId = ++runIdRef.current
    clearInterval(autoplayRef.current)
    setPlaying(false)
    setRunning(true)
    setResult(null)
    setEvents([])
    setPlayhead(-1)
    setStdout('')
    playLumiSound('transmit')

    const startedAt = performance.now()
    try {
      const primaryResult = await runtimeRef.current.run({ mission, code, inputValues })
      const friendlyPrimary = primaryResult.error
        ? { ...primaryResult, error: { ...primaryResult.error, friendlyMessage: translatePythonError(primaryResult.error) } }
        : { ...primaryResult }

      const variants = (mission.transferVariants?.length ? mission.transferVariants : mission.hiddenVariants) || []
      let hiddenPassed = null
      const initialEvaluation = evaluateMissionRun(mission, friendlyPrimary, hiddenPassed)

      if (initialEvaluation.worldGoalPassed && initialEvaluation.conceptPassed && variants.length > 0) {
        hiddenPassed = true
        for (const variant of variants) {
          const variantMission = getMissionVariant(mission, variant)
          const variantResult = await runtimeRef.current.run({
            mission: variantMission,
            code,
            inputValues: variant.inputValues || inputValues,
          })
          const variantEvaluation = evaluateMissionRun(variantMission, variantResult, true)
          if (!variantEvaluation.worldGoalPassed || !variantEvaluation.conceptPassed || variantResult.error) {
            hiddenPassed = false
            break
          }
        }
      }

      const evaluation = evaluateMissionRun(mission, friendlyPrimary, hiddenPassed)
      const normalizedEvents = normalizeRuntimeEvents(friendlyPrimary.events || [])
      setEvents(normalizedEvents)
      setStdout(friendlyPrimary.stdout || '')
      setRuntimeMetadata({
        classesMetadata: friendlyPrimary.classesMetadata || {},
        systemObjects: friendlyPrimary.systemObjects || {},
      })
      if (mission.id === 'pilot-object-9-1' && friendlyPrimary.systemObjects?.lumi) {
        setInspectorTab('system')
      }

      const finalizeEvaluation = async () => {
        if (runIdRef.current !== runId) return
        setRunning(false)
        setResult(evaluation)
        pendingResultRef.current = null

        if (evaluation.cleared || evaluation.completed) {
          if (!celebratedRunIdsRef.current.has(runId)) {
            celebratedRunIdsRef.current.add(runId)
            if (mission.difficulty === 'field-test' || mission.restorationLevel === 100) {
              setTimeout(() => playLumiSound('clear_core'), 200)
            } else {
              setTimeout(() => playLumiSound('clear_mission'), 200)
            }
          }
          try {
            await persistCompletion(evaluation)
          } catch (persistError) {
            console.warn('Mission completion persist failed:', persistError)
          }
        } else if (friendlyPrimary.error) {
          const errType = friendlyPrimary.error.type || ''
          if (['SyntaxError', 'IndentationError', 'NameError'].includes(errType)) {
            setTimeout(() => playLumiSound('error_syntax'), 200)
          } else {
            setTimeout(() => playLumiSound('error'), 200)
          }
        }

        try {
          await persistAttempt({ evaluation, runtimeResult: friendlyPrimary, durationMs: performance.now() - startedAt })
        } catch (persistError) {
          console.warn('Mission progress sync failed:', persistError)
        }
      }

      if (friendlyPrimary.error && normalizedEvents.length === 0) {
        await finalizeEvaluation()
      } else {
        pendingResultRef.current = { runId, evaluation }
        startAutoplay(normalizedEvents, 0, () => {
          finalizeEvaluation()
        })
      }
    } catch (error) {
      if (runIdRef.current !== runId) return
      setRunning(false)
      const fallbackEvaluation = {
        completed: false,
        cleared: false,
        stars: 0,
        message: translatePythonError({ type: error.name, message: error.message }),
      }
      setResult(fallbackEvaluation)
      playLumiSound('error_syntax')
      persistAttempt({
        evaluation: fallbackEvaluation,
        runtimeResult: { error: { type: error.name, message: error.message } },
        durationMs: performance.now() - startedAt,
      }).catch((persistError) => console.warn('Mission attempt sync failed:', persistError))
    }
  }, [code, inputValues, mission, persistAttempt, persistCompletion, running, startAutoplay])

  const stopMission = () => {
    runIdRef.current += 1
    pendingResultRef.current = null
    clearInterval(autoplayRef.current)
    setPlaying(false)
    runtimeRef.current?.stop()
    setRunning(false)
    setRuntimeStatus('loading')
    runtimeRef.current?.load().catch(() => setRuntimeStatus('error'))
  }

  const updateCode = useCallback((nextCode) => {
    draftDirtyRef.current = true
    setCode(nextCode)
  }, [])

  const handleReset = useCallback(() => {
    draftLoadEpochRef.current += 1
    draftWriteEpochRef.current += 1
    runIdRef.current += 1
    pendingResultRef.current = null
    pausePlayback()
    if (running) {
      clearInterval(autoplayRef.current)
      setPlaying(false)
      runtimeRef.current?.stop()
      setRunning(false)
    }
    setEvents([])
    setPlayhead(-1)
    setStdout('')
    setResult(null)
    setRuntimeMetadata(null)
    setLastRewardPaid(null)
    setSolutionSession(null)
    setInputValues(mission?.inputValues || ['4'])
    draftDirtyRef.current = false
    const initialCode = getLumiInitialCode(mission)
    setCode(initialCode)
    if (!isPreviewOnly) {
      try {
        localStorage.setItem(`${DRAFT_PREFIX}${unit?.id}:${mission.id}`, initialCode)
      } catch {
        // ignore
      }
    }
  }, [isPreviewOnly, mission, pausePlayback, running, unit?.id])

  const editorRef = useRef(null)

  const suggestedTokens = useMemo(() => {
    if (!mission) return []
    const tokens = []
    const memoryCode = solutionPreview?.code || ''

    // Extract ONLY pure string literals (e.g. "신호 수신", "LUMI ONLINE", "COMMAND CORE 100%")
    const stringMatches = memoryCode.match(/(["'])(?:(?=(\\?))\2.)*?\1/g) || []
    stringMatches.forEach((str) => {
      if (!tokens.some((t) => t.text === str)) {
        tokens.push({ type: 'string', label: str, text: str })
      }
    })

    // String literals from goals
    if (Array.isArray(mission.goals)) {
      mission.goals.forEach((g) => {
        if (g.type === 'spokenMessage' && g.includes) {
          const str = `"${g.includes}"`
          if (!tokens.some((t) => t.text === str)) {
            tokens.push({ type: 'string', label: str, text: str })
          }
        }
        if (g.type === 'stdoutIncludes' && g.value) {
          const str = `"${g.value}"`
          if (!tokens.some((t) => t.text === str)) {
            tokens.push({ type: 'string', label: str, text: str })
          }
        }
      })
    }

    return tokens
  }, [mission, solutionPreview?.code])

  const handleInsertToken = (tokenText) => {
    playLumiSound('type')
    if (editorRef.current?.insertSnippet) {
      editorRef.current.insertSnippet(tokenText)
    } else {
      updateCode((prevCode) => `${prevCode || ''}${tokenText}`)
    }
  }

  if (!mission) {
    return (
      <div className="python-lab python-lab--empty">
        <p>이 유닛에 연결된 Python 미션이 없습니다.</p>
        <button type="button" onClick={onBack}>돌아가기</button>
      </div>
    )
  }

  return (
    <div className="python-lab">
      <header className="python-lab__header">
        <div className="python-lab__header-left">
          <button type="button" className="python-lab__back" onClick={onBack} aria-label="미션 허브로 돌아가기">←</button>
          <div className="python-lab__header-title">
            <span className="python-lab__kicker">LUMI PROTOCOL</span>
            <span className="python-lab__header-divider">/</span>
            <h1>{missionSet.title}</h1>
          </div>
        </div>
        <div className="python-lab__header-right">
          <button
            type="button"
            className={`python-lab__sound-btn ${soundMuted ? 'is-muted' : ''}`}
            onClick={toggleSound}
            title={soundMuted ? '사운드 켜기' : '사운드 끄기'}
            aria-label={soundMuted ? '사운드 켜기' : '사운드 끄기'}
          >
            {soundMuted ? '🔇' : '🔊'}
          </button>
          <div className={`python-lab__runtime python-lab__runtime--${runtimeStatus}`}>
            <span /> {runtimeStatus === 'ready' ? 'PYTHON READY' : runtimeStatus === 'error' ? 'RUNTIME ERROR' : 'PYTHON LOADING'}
          </div>
        </div>
      </header>

      {showMissionTabs && (
        <nav className="python-lab__mission-tabs" aria-label="미션 선택">
          {missions.map((item, index) => {
            const locked = missionSet.kind === 'prototype' && index > maxUnlockedMissionIndex
            return (
              <button
                type="button"
                key={item.id}
                className={index === missionIndex ? 'is-active' : ''}
                onClick={() => setMissionIndex(index)}
                disabled={locked}
                aria-label={locked ? `${item.title} 잠김` : item.title}
              >
                <span>{completedIds.has(item.id) ? '✓' : locked ? '🔒' : index + 1}</span>
                {item.title}
              </button>
            )
          })}
        </nav>
      )}

      <main className="python-lab__layout">
        <aside className="python-lab__briefing">
          <span className="python-lab__eyebrow">{mission.eyebrow}</span>
          <h2>{mission.title}</h2>
          {mission.subtitle && <p className="python-lab__subtitle">{mission.subtitle}</p>}
          {mission.storyIntro && <p className="python-lab__story-intro">{mission.storyIntro}</p>}
          {mission.briefing && (
            <section className="python-lab__mission-copy python-lab__mission-copy--story">
              <span>지금 어떤 상황인가요?</span>
              <p>{mission.briefing}</p>
            </section>
          )}
          {(mission.codeObjective || mission.objective || mission.summary) && (
            <section className="python-lab__mission-copy python-lab__mission-copy--code">
              <span>코드로 무엇을 해야 하나요?</span>
              <p>{mission.codeObjective || mission.objective || mission.summary}</p>
            </section>
          )}
          <div className={`python-lab__scaffold-stage is-${scaffoldMeta.stage}`}>
            <span>{scaffoldMeta.label}</span>
            <p>{scaffoldMeta.instruction}</p>
          </div>

          <section className="python-lab__learning-steps" aria-label="코드 작성 순서">
            <h3>코드 작성 순서</h3>
            <ol>
              {learningSteps.map((step) => <li key={step}>{step}</li>)}
            </ol>
          </section>

          {/* Mission Goals / Checklist Section */}
          {missionGoals.length > 0 && (
            <div className="python-lab__checklist-card">
              <h4>
                <span>🎯</span> 실행 후 이렇게 되면 성공입니다
              </h4>
              <ul>
                {missionGoals.map((item, idx) => {
                  const label = item.label
                  const passed = typeof item === 'object' && item.passed !== undefined ? item.passed : null
                  const hint = typeof item === 'object' ? item.hint : null
                  return (
                    <li key={`${idx}-${label}`} className={passed === true ? 'is-passed' : passed === false ? 'is-failed' : ''}>
                      <span>{passed === true ? '✓' : passed === false ? '✗' : '○'}</span>
                      <span>{label}</span>
                      {passed === false && hint && <small>↳ {hint}</small>}
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {scaffold.exposure === 'minimal-skeleton' && scaffold.highlightToken && (
            <p className="python-lab__hint">
              💡 수정할 토큰: <span className="python-lab__token-pill">{scaffold.highlightToken}</span>
            </p>
          )}

          {mission.concepts?.length > 0 && (
            <div className="python-lab__concepts">
              {mission.concepts.map((concept) => <span key={concept}>{concept}</span>)}
            </div>
          )}

          {conceptLessons.length > 0 && (
            <section className="python-lab__concept-lessons">
              <h3>먼저 알아둘 원리</h3>
              {conceptLessons.map((lesson) => (
                <article key={lesson.title}>
                  <strong>{lesson.title}</strong>
                  <p>{lesson.body}</p>
                </article>
              ))}
            </section>
          )}

          {showApi && (
            <>
              <h3>이번에 사용하는 도구</h3>
              {relevantApi.map((item) => (
                <div className="python-lab__api" key={item.signature || item}>
                  <code>{item.signature || item}</code>
                  {item.description && <p>{item.description}</p>}
                  {item.detail && <small>{item.detail}</small>}
                </div>
              ))}
            </>
          )}

          {missionHints.length > 0 && (
            <>
              <button
                type="button"
                className="python-lab__hint-button"
                onClick={() => setHintLevel((level) => Math.min(level + 1, missionHints.length))}
              >
                단계별 도움말 보기 ({hintLevel}/{missionHints.length})
              </button>
              {missionHints.slice(0, hintLevel).map((hint, index) => {
                return <p className="python-lab__hint" key={`${index}-${hint.text}`}><strong>{hint.label}</strong> {hint.text}</p>
              })}
            </>
          )}
        </aside>

        <section className="python-lab__world-panel">
          <PythonWorldCanvas
            mission={mission}
            events={events}
            playhead={playhead}
            showHud={showHud}
            showSensor={showSensor}
            isTransmitting={running}
            result={result}
          />
          {showTimeline && (
            <div className="python-lab__timeline">
              <button
                type="button"
                onClick={() => {
                  pausePlayback()
                  const previousStep = Math.max(-1, playbackStepIndex - 1)
                  setPlayhead(previousStep < 0 ? -1 : playbackCursors[previousStep])
                }}
                disabled={!playbackCursors.length || playbackStepIndex < 0}
              >‹</button>
              <input
                aria-label="코드 실행 단계"
                type="range"
                min="-1"
                max={Math.max(-1, playbackCursors.length - 1)}
                value={playbackStepIndex}
                onChange={(event) => {
                  pausePlayback()
                  const stepIndex = Number(event.target.value)
                  setPlayhead(stepIndex < 0 ? -1 : playbackCursors[stepIndex])
                }}
                disabled={!playbackCursors.length}
              />
              <button
                type="button"
                onClick={() => {
                  pausePlayback()
                  const nextStep = Math.min(playbackCursors.length - 1, playbackStepIndex + 1)
                  setPlayhead(playbackCursors[nextStep])
                }}
                disabled={!playbackCursors.length || playbackStepIndex >= playbackCursors.length - 1}
              >›</button>
              {visibleTools.includes('replay') && (
                <button type="button" onClick={() => startAutoplay(events, 0)} disabled={!playbackCursors.length} aria-label="처음부터 다시 재생">↻</button>
              )}
              <button
                type="button"
                onClick={() => playing ? pausePlayback() : startAutoplay(events, Math.max(0, playbackStepIndex + 1))}
                disabled={!playbackCursors.length || (!playing && playbackStepIndex >= playbackCursors.length - 1)}
                aria-label={playing ? '재생 일시정지' : '이어서 재생'}
              >{playing ? 'Ⅱ' : '▶'}</button>
              <select
                aria-label="재생 속도"
                value={playbackSpeed}
                onChange={(event) => {
                  pausePlayback()
                  setPlaybackSpeed(Number(event.target.value))
                }}
              >
                <option value="0.5">0.5×</option>
                <option value="1">1×</option>
                <option value="2">2×</option>
              </select>
              <span>STEP {playbackStepIndex + 1}/{playbackCursors.length}</span>
            </div>
          )}

          {result && (
            <div className={`python-lab__result ${result.cleared || result.completed ? 'is-success' : 'is-failure'}`} role="status">
              <strong>
                {result.stars >= 3
                  ? '★★★ FIELD VERIFIED'
                  : result.stars === 2
                    ? '★★☆ SIGNAL UNDERSTOOD'
                    : result.stars === 1
                      ? '★☆☆ CORE RESTORED'
                      : '⚠️ 미션 신호 미완료 (SIGNAL INCOMPLETE)'}
              </strong>
              {result.cleared && mission.lumiVoice && (
                <p className="python-lab__lumi-voice">💬 LUMI: "{mission.lumiVoice}"</p>
              )}
              {result.cleared && mission.restorationLevel && (
                <p className="python-lab__restoration-badge">⚡ CORE RESTORATION: {mission.restorationLevel}%</p>
              )}
              {lastRewardPaid?.rewarded && lastRewardPaid.crystalsEarned > 0 && (
                <p className="python-lab__reward-badge" style={{ color: '#55f1c8', fontWeight: 600, margin: '0.4rem 0' }}>
                  💎 광석 +{lastRewardPaid.crystalsEarned}개 획득!
                  {lastRewardPaid.multiplier > 1 && (
                    <span style={{ fontSize: '0.85em', opacity: 0.9, marginLeft: '0.35rem' }}>
                      ({lastRewardPaid.multiplierReason === 'rest_day' ? '주말/휴일 1.5배' : '수업시간 외 1.2배'})
                    </span>
                  )}
                </p>
              )}
              {result.message && <p className="python-lab__result-message">{result.message}</p>}
              {!result.cleared && result.failureReason && (
                <p style={{ color: '#fca5a5', marginTop: '0.3rem', fontSize: '0.88em' }}>
                  💡 {result.failureReason}
                </p>
              )}
              {(result.nextUnlocked || result.cleared || result.completed) && (
                missionIndex < missions.length - 1 ? (
                  <button type="button" onClick={() => setMissionIndex((index) => index + 1)}>다음 미션 →</button>
                ) : (
                  <button type="button" className="python-lab__celebrate-btn" onClick={() => setShowActCelebration(true)}>
                    🎉 코어 복원 완료 축하창 보기
                  </button>
                )
              )}
              {(result.cleared || result.completed) && getLumiPygameBridge(mission) && (
                <LumiPygameBridgeCard bridge={getLumiPygameBridge(mission)} />
              )}
              {(result.cleared || result.completed) && mission.reflectionQuestions?.length > 0 && (
                <div className="python-lab__reflection">
                  <strong>🧠 관제 성찰 신호</strong>
                  <ol>
                    {mission.reflectionQuestions.map((question) => <li key={question}>{question}</li>)}
                  </ol>
                </div>
              )}
            </div>
          )}
        </section>

        <section className="python-lab__code-panel">
          <div className="python-lab__editor-toolbar">
            <span>main.py</span>
            <div>
              {solutionPreview && (
                <button
                  type="button"
                  className="is-solution"
                  onClick={() => {
                    setSolutionReviewUsed(true)
                    setSolutionSession({ sessionId: Date.now(), ...solutionPreview, automatic: false })
                  }}
                  disabled={running}
                >완성 코드 보기</button>
              )}
              {showReset && (
                <button type="button" onClick={handleReset} disabled={running}>RESET</button>
              )}
              {running
                ? <button type="button" className="is-stop" onClick={stopMission}>■ STOP</button>
                : <button type="button" className="is-run" onClick={runMission} disabled={runtimeStatus !== 'ready'}>▶ RUN</button>}
            </div>
          </div>
          {scaffold.allowQuickInsert === true && suggestedTokens.length > 0 && !isViewOnly && (
            <div className="python-lab__quick-chips" aria-label="추천 문자열 및 코드 칩">
              <span className="python-lab__quick-chips-label">💡 원클릭 입력:</span>
              <div className="python-lab__quick-chips-list">
                {suggestedTokens.map((tok) => (
                  <button
                    key={tok.text}
                    type="button"
                    className="python-lab__quick-chip is-string"
                    onClick={() => handleInsertToken(tok.text)}
                    title={`클릭하여 에디터 커서 위치에 '${tok.text}' 자동 삽입`}
                  >
                    💬 <code>{tok.label}</code>
                  </button>
                ))}
              </div>
            </div>
          )}
          {mission?.inputPanel && (
            <div className="python-lab__input-panel" aria-label="관제소 입력 패널">
              <div className="python-lab__input-header">
                <span>📡 {mission.inputPanel.label || '관제소 입력 신호'}</span>
                <small>input() 호출 시 순차 전달</small>
              </div>
              <div className="python-lab__input-fields">
                {(mission.inputPanel.fields || []).map((field, idx) => (
                  <div key={field.id || idx} className="python-lab__input-field">
                    <label htmlFor={`input-field-${field.id || idx}`}>{field.label || '신호'}:</label>
                    <input
                      id={`input-field-${field.id || idx}`}
                      type="text"
                      value={inputValues[idx] ?? field.defaultValue ?? ''}
                      onChange={(e) => {
                        const next = [...inputValues]
                        next[idx] = e.target.value
                        setInputValues(next)
                      }}
                      disabled={running}
                      inputMode={field.inputMode || 'text'}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="python-lab__editor-wrap">
            <PythonEditor
              ref={editorRef}
              value={code}
              onChange={updateCode}
              activeLine={activeTrace?.line}
              readOnly={running || isViewOnly}
            />
            {solutionSession && (
              <SolutionCodeOverlay
                key={solutionSession.sessionId}
                preview={solutionSession}
                onClose={() => setSolutionSession(null)}
              />
            )}
          </div>
          {showInspector && (
            <>
              <div
                className={`python-lab__inspector-resizer ${isResizingInspector ? 'is-resizing' : ''}`}
                onMouseDown={handleStartResize}
                role="separator"
                aria-orientation="horizontal"
                aria-label="출력 패널 높이 조절"
                title="마우스로 위/아래로 끌어 높이를 조절할 수 있습니다"
              />
              <div className="python-lab__inspector-tabs">
                <button type="button" className={inspectorTab === 'trace' ? 'is-active' : ''} onClick={() => setInspectorTab('trace')}>
                  변수 기록 (MEMORY)
                </button>
                {registeredClasses.length > 0 && (
                  <button type="button" className={inspectorTab === 'blueprint' ? 'is-active' : ''} onClick={() => setInspectorTab('blueprint')}>
                    📐 클래스 설계도 ({registeredClasses.length})
                  </button>
                )}
                {instanceCreations.length > 0 && (
                  <button type="button" className={inspectorTab === 'instances' ? 'is-active' : ''} onClick={() => setInspectorTab('instances')}>
                    🤖 조립된 드론 ({instanceCreations.length})
                  </button>
                )}
                {systemObjectItems.length > 0 && (
                  <button type="button" className={inspectorTab === 'system' ? 'is-active' : ''} onClick={() => setInspectorTab('system')}>
                    🛰️ 시스템 객체 ({systemObjectItems.length})
                  </button>
                )}
                {mission?.isTacticalMission && (
                  <button type="button" className={inspectorTab === 'tactical' ? 'is-active' : ''} onClick={() => setInspectorTab('tactical')}>
                    🛡️ 전술 편대 상태
                  </button>
                )}
                <button type="button" className={inspectorTab === 'output' ? 'is-active' : ''} onClick={() => setInspectorTab('output')}>
                  💻 출력 (OUTPUT)
                </button>
              </div>
              <div className="python-lab__inspector" style={{ height: `${inspectorHeight}px` }}>
                {inspectorTab === 'tactical' ? (
                  <LumiTacticalInspector tacticalState={tacticalState} />
                ) : inspectorTab === 'trace' ? (
                  activeTrace ? (
                    <>
                      <p>LINE {activeTrace.line}</p>
                      {Object.keys(activeTrace.variables || {}).length > 0 ? (
                        <div className="python-lab__memory-list">
                          {Object.entries(activeTrace.variables).map(([name, val]) => {
                            if (val && typeof val === 'object' && val.kind === 'python_instance') {
                              const isSelf = executionTrace.activeSelfRef === val.id
                              return (
                                <div className={`python-lab__memory-item python-lab__memory-item--instance ${isSelf ? 'is-self-active' : ''}`} key={name}>
                                  <div className="python-lab__memory-header">
                                    <span className="python-lab__memory-name">{name}</span>
                                    <span className="python-lab__instance-badge">🏷️ {val.className} ({val.id})</span>
                                    {isSelf && <span className="python-lab__self-badge">⚡ SELF FOCUS</span>}
                                  </div>
                                  <div className="python-lab__instance-attrs">
                                    {Object.entries(val.publicAttributes || {}).map(([attr, attrVal]) => (
                                      <span key={attr} className="python-lab__attr-chip">
                                        .{attr} = {typeof attrVal === 'object' ? JSON.stringify(attrVal) : String(attrVal)}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )
                            }
                            if (val && typeof val === 'object' && val.kind === 'python_class') {
                              return (
                                <div className="python-lab__memory-item python-lab__memory-item--class" key={name}>
                                  <div className="python-lab__memory-header">
                                    <span className="python-lab__memory-name">{name}</span>
                                    <span className="python-lab__class-badge">📐 CLASS: {val.className}</span>
                                  </div>
                                  <div className="python-lab__instance-attrs">
                                    {(val.methods || []).map((m) => {
                                      const mName = typeof m === 'string' ? m : m.name
                                      return <span key={mName} className="python-lab__attr-chip python-lab__attr-chip--method">def {mName}()</span>
                                    })}
                                  </div>
                                </div>
                              )
                            }
                            return (
                              <div className="python-lab__memory-item" key={name}>
                                <span className="python-lab__memory-name">{name}</span>
                                <span className="python-lab__memory-val">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p>변수 상태: [EMPTY]</p>
                      )}
                    </>
                  ) : <p>RUN을 누르면 변수와 실행 줄이 여기에 기록됩니다.</p>
                ) : inspectorTab === 'blueprint' ? (
                  <div className="python-lab__blueprint-list">
                    {registeredClasses.map((cls) => (
                      <div key={cls.className} className="python-lab__blueprint-card">
                        <div className="python-lab__blueprint-header">
                          <span className="python-lab__blueprint-tag">CLASS BLUEPRINT</span>
                          <strong>class {cls.className}</strong>
                        </div>
                        <div className="python-lab__blueprint-body">
                          {cls.initParameters && cls.initParameters.length > 0 && (
                            <div className="python-lab__blueprint-slot">
                              <small>생성자 입력 슬롯 (__init__):</small>
                              <div className="python-lab__slot-chips">
                                {cls.initParameters.map((param) => (
                                  <span key={param} className="python-lab__slot-chip">{param}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          <div className="python-lab__blueprint-methods">
                            <small>메서드 목록:</small>
                            <div className="python-lab__method-chips">
                              {cls.methods.map((m) => {
                                const mName = typeof m === 'string' ? m : m.name
                                const params = typeof m === 'object' && m.parameters ? m.parameters.join(', ') : ''
                                return (
                                  <span key={mName} className="python-lab__attr-chip python-lab__attr-chip--method">
                                    def {mName}({params})
                                  </span>
                                )
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : inspectorTab === 'instances' ? (
                  <div className="python-lab__instances-list">
                    {instanceCreations.map((inst) => {
                      const isSelf = executionTrace.activeSelfRef === inst.instanceId
                      const aliases = inst.bindings.filter((b) => b !== inst.primaryBinding)
                      const diffs = attributeDiffs.filter((d) => d.instanceId === inst.instanceId)
                      return (
                        <div key={inst.instanceId} className={`python-lab__instance-card ${isSelf ? 'is-self-active' : ''}`}>
                          <div className="python-lab__instance-card-header">
                            <span className="python-lab__instance-badge">🏷️ {inst.className} ({inst.instanceId})</span>
                            <span className="python-lab__instance-var">변수: <code>{inst.primaryBinding}</code></span>
                            {aliases.length > 0 && (
                              <span className="python-lab__instance-alias">(alias: {aliases.join(', ')})</span>
                            )}
                            {isSelf && <span className="python-lab__self-badge">⚡ SELF FOCUS</span>}
                          </div>
                          <div className="python-lab__instance-card-attrs">
                            {Object.entries(inst.publicAttributes || {}).map(([k, v]) => (
                              <div key={k} className="python-lab__instance-attr-row">
                                <span className="python-lab__attr-name">.{k}</span>
                                <span className="python-lab__attr-val">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
                              </div>
                            ))}
                          </div>
                          {diffs.length > 0 && (
                            <div className="python-lab__instance-diffs">
                              <small>속성 변경 이력 (Attribute Diffs):</small>
                              {diffs.map((d, dIdx) => (
                                <div key={dIdx} className="python-lab__diff-entry">
                                  <span>Line {d.sourceLine}:</span>
                                  {Object.entries(d.changes).map(([k, c]) => (
                                    <code key={k}>{k}: {String(c.before)} ➔ {String(c.after)}</code>
                                  ))}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                ) : inspectorTab === 'system' ? (
                  <div className="python-lab__instances-list">
                    {systemObjectItems.map((item) => (
                      <div key={item.instanceId} className="python-lab__instance-card python-lab__instance-card--system">
                        <div className="python-lab__instance-card-header">
                          <span className="python-lab__instance-badge">🛰️ {item.className} ({item.instanceId})</span>
                          <span className="python-lab__instance-var">시스템 객체: <code>{item.binding}</code></span>
                        </div>
                        <div className="python-lab__instance-card-attrs">
                          {Object.entries(item.publicAttributes).map(([name, value]) => (
                            <div key={name} className="python-lab__instance-attr-row">
                              <span className="python-lab__attr-name">.{name}</span>
                              <span className="python-lab__attr-val">{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                            </div>
                          ))}
                        </div>
                        <div className="python-lab__blueprint-methods">
                          <small>행동(메서드):</small>
                          <div className="python-lab__method-chips">
                            {item.methods.map((method) => (
                              <span key={method} className="python-lab__attr-chip python-lab__attr-chip--method">{method}()</span>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="python-lab__output-container">
                    {stdout ? (
                      <div className="python-lab__output-filled">
                        <pre className="python-lab__stdout-box">{stdout}</pre>
                        <div className="python-lab__output-success-hint">
                          <span>💡 <code>print()</code>에 넣은 글자가 화면(OUTPUT)에 정상적으로 출력되었습니다.</span>
                        </div>
                      </div>
                    ) : (
                      <div className="python-lab__output-empty">
                        <span className="python-lab__output-icon">💻</span>
                        <strong>아직 출력된 메시지가 없습니다.</strong>
                        <small>코드를 작성하고 <strong>▶ RUN</strong>을 누르면 <code>print()</code>로 출력한 내용이 여기에 나타납니다.</small>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </section>
      </main>

      {showActCelebration && (
        <LumiActCelebrationModal
          actId={mission.actId || missionSet?.actId || 'act-0-awakening'}
          missionSet={missionSet}
          totalMissions={missions.length}
          onBack={onBack}
          onClose={() => setShowActCelebration(false)}
        />
      )}
    </div>
  )
}

function LumiActCelebrationModal({ actId, missionSet, totalMissions = 10, onBack, onClose }) {
  const isAct1 = actId === 'act-1-command' || missionSet?.id === 'lumi-act-1-command'
  const isAct2 = actId === 'act-2-memory' || missionSet?.id === 'lumi-act-2-memory'

  let eyebrow = 'PROTOCOL RESTORATION COMPLETE'
  let title = '🎉 긴급 재부팅 성공!'
  let desc = '10개의 기본 항법 코어(실행·이동·변수·센서·판단)가 완벽히 복원되었습니다.'
  let totalCount = totalMissions || 10
  let quote = '관제사님! 신호 폭풍을 뚫고 기본 코어가 모두 깨어났어요. 이제 ACT 1 명령 코어 탐험을 시작할 수 있습니다!'
  let nextButtonLabel = '📜 코어 복원 지도로 이동 (ACT 1 열기) →'

  if (isAct1) {
    eyebrow = 'ACT 1 RESTORATION COMPLETE'
    title = '🎉 명령 코어(COMMAND CORE) 복원 성공!'
    desc = '5개의 정규 명령 코어(다중 명령·수식 표현식·콘솔 출력·주석 디버깅)가 완벽히 복원되었습니다.'
    totalCount = totalMissions || 5
    quote = '관제사님! 명령 코어가 100% 동기화되었어요. 이제 ACT 2 기억 코어(MEMORY CORE) 탐험을 시작할 수 있습니다!'
    nextButtonLabel = '📜 코어 복원 지도로 이동 (ACT 2 확인) →'
  } else if (isAct2) {
    eyebrow = 'ACT 2 RESTORATION COMPLETE'
    title = '🎉 기억 코어(MEMORY CORE) 복원 성공!'
    desc = '6개의 정규 기억 코어(변수 대입·연산 및 갱신·자료형 검사·f-string 보고)가 완벽히 복원되었습니다.'
    totalCount = totalMissions || 6
    quote = '관제사님! 기억 코어가 100% 동기화되었어요. 이제 ACT 3 센서 코어(SENSOR CORE) 탐험을 준비할 수 있습니다!'
    nextButtonLabel = '📜 코어 복원 지도로 이동 (ACT 3 확인) →'
  }

  return (
    <div className="lumi-act-modal" role="dialog" aria-modal="true">
      <div className="lumi-act-modal__backdrop" onClick={onClose} />
      <div className="lumi-act-modal__card">
        <div className="lumi-act-modal__core-visual">
          <span className="lumi-act-modal__ring" />
          <span className="lumi-act-modal__ring lumi-act-modal__ring--2" />
          <div className="lumi-act-modal__ship">
            <svg width="44" height="44" viewBox="0 0 32 32" className="lumi-ship-svg lumi-ship-svg--awake">
              <path d="M 28 16 L 8 6 L 12 16 L 8 26 Z" fill="#00f3ff" stroke="#00f3ff" strokeWidth="1.5" strokeLinejoin="round" />
              <circle cx="16" cy="16" r="3" fill="#ffffff" />
            </svg>
          </div>
          <span className="lumi-act-modal__core-badge">100% ONLINE</span>
        </div>
        <div className="lumi-act-modal__content">
          <span className="lumi-act-modal__eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="lumi-act-modal__desc">{desc}</p>
          <div className="lumi-act-modal__stats">
            <div className="lumi-act-modal__stat-box">
              <small>완료 미션</small>
              <strong>{totalCount} / {totalCount}</strong>
            </div>
            <div className="lumi-act-modal__stat-box">
              <small>코어 복원도</small>
              <strong className="is-cyan">100%</strong>
            </div>
            <div className="lumi-act-modal__stat-box">
              <small>항법 등급</small>
              <strong className="is-gold">★★★ MASTER</strong>
            </div>
          </div>
          <div className="lumi-act-modal__quote">
            💬 <strong>LUMI</strong>: "{quote}"
          </div>
          <div className="lumi-act-modal__actions">
            <button type="button" className="lumi-act-modal__btn-primary" onClick={onBack}>
              {nextButtonLabel}
            </button>
            <button type="button" className="lumi-act-modal__btn-secondary" onClick={onClose}>
              ↺ 코드 계속 복습하기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
