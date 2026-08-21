import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { evaluateMissionRun, translatePythonError } from './missionEvaluator'
import { getMissionVariant } from './pythonMissionCatalog'
import { normalizeRuntimeEvents } from './lumiEventNormalizer'
import { createPlaybackSteps } from './lumiWorldReducer'
import { mergeMissionCompletion, normalizeMissionLabProgress } from '../../utils/pythonMissionProgressUtils'
import PythonRuntimeClient from './runtime/PythonRuntimeClient'
import PythonEditor from './PythonEditor'
import PythonWorldCanvas from './PythonWorldCanvas'
import './PythonMissionLab.css'

const DRAFT_PREFIX = 'metasense:python-mission:'
const RUN_SEQUENCE_PREFIX = 'metasense:python-mission-run-sequence:'
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
    return localStorage.getItem(`${DRAFT_PREFIX}${unitId}:${mission.id}`) || mission.starterCode
  } catch {
    return mission.starterCode
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
    if (events[index]?.type === 'line') return events[index]
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

export default function PythonMissionLab({ unit, missionSet, initialProgress, onBack }) {
  const { user } = useAuth()
  const missions = missionSet?.missions || []
  const initial = normalizeMissionLabProgress(initialProgress)
  const firstIncompleteIndex = missions.findIndex((item) => !initial.completedMissionIds.includes(item.id))
  const firstIncomplete = firstIncompleteIndex < 0 ? 0 : firstIncompleteIndex
  const [missionIndex, setMissionIndex] = useState(firstIncomplete)
  const mission = missions[missionIndex]
  const [progress, setProgress] = useState(initial)
  const [code, setCode] = useState(() => readDraft(unit?.id, missions[firstIncomplete] || {}))
  const [runtimeStatus, setRuntimeStatus] = useState('loading')
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState([])
  const [playhead, setPlayhead] = useState(-1)
  const [stdout, setStdout] = useState('')
  const [result, setResult] = useState(null)
  const [inspectorTab, setInspectorTab] = useState('trace')
  const [hintLevel, setHintLevel] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [playbackSpeed, setPlaybackSpeed] = useState(1)
  const runtimeRef = useRef(null)
  const autoplayRef = useRef(null)
  const lastDraftSyncRef = useRef({ key: '', code: '' })
  const draftDirtyRef = useRef(false)

  const activeTrace = useMemo(() => getLineEvent(events, playhead), [events, playhead])
  const playbackCursors = useMemo(() => getPlaybackCursors(events), [events])
  const playbackStepIndex = useMemo(() => {
    if (playhead < 0 || playbackCursors.length === 0) return -1
    const index = playbackCursors.findIndex((cursor) => cursor >= playhead)
    return index < 0 ? playbackCursors.length - 1 : index
  }, [playbackCursors, playhead])
  const completedIds = useMemo(() => new Set(progress.completedMissionIds || []), [progress.completedMissionIds])

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
    }
  }, [])

  useEffect(() => {
    if (!mission) return
    let active = true
    clearInterval(autoplayRef.current)
    setPlaying(false)
    setCode(readDraft(unit?.id, mission))
    setEvents([])
    setPlayhead(-1)
    setStdout('')
    setResult(null)
    setHintLevel(0)
    lastDraftSyncRef.current = { key: '', code: '' }
    draftDirtyRef.current = false
    if (user?.uid && !hasLocalDraft(unit?.id, mission.id)) {
      getDoc(doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id))
        .then((snapshot) => {
          const serverDraft = snapshot.data()?.draftCode
          if (active && snapshot.exists() && typeof serverDraft === 'string' && serverDraft.trim()) setCode(serverDraft)
        })
        .catch((error) => console.warn('Mission draft load failed:', error))
    }
    return () => { active = false }
  }, [mission, unit?.id, user?.uid])

  useEffect(() => {
    if (!mission || !draftDirtyRef.current) return
    const timer = setTimeout(() => {
      const persistedCode = codeForPersistence(code)
      try {
        localStorage.setItem(`${DRAFT_PREFIX}${unit?.id}:${mission.id}`, persistedCode)
      } catch {
        // Private browsing or storage quotas should not block the mission.
      }
      if (user?.uid && unit?.id) {
        const syncKey = `${unit.id}:${mission.id}`
        if (lastDraftSyncRef.current.key === syncKey && lastDraftSyncRef.current.code === persistedCode) {
          draftDirtyRef.current = false
          return
        }
        lastDraftSyncRef.current = { key: syncKey, code: persistedCode }
        draftDirtyRef.current = false
        setDoc(doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id), {
          unitId: unit.id,
          unitTitle: unit.title || '',
          missionSetId: missionSet.id,
          missionSetVersion: Number(missionSet.version || 1),
          missionId: mission.id,
          missionTitle: mission.title,
          draftCode: persistedCode,
          lastCode: persistedCode,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch((error) => {
          lastDraftSyncRef.current = { key: '', code: '' }
          draftDirtyRef.current = true
          console.warn('Mission draft sync failed:', error)
        })
      }
    }, 2500)
    return () => clearTimeout(timer)
  }, [code, mission, missionSet.id, missionSet.version, unit?.id, unit?.title, user?.uid])

  const pausePlayback = useCallback(() => {
    clearInterval(autoplayRef.current)
    setPlaying(false)
  }, [])

  const startAutoplay = useCallback((nextEvents, startAt = 0) => {
    clearInterval(autoplayRef.current)
    const cursors = getPlaybackCursors(nextEvents)
    if (!cursors.length || startAt >= cursors.length) {
      setPlaying(false)
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
      }
    }, 320 / playbackSpeed)
  }, [playbackSpeed])

  const scaffold = mission.scaffold || {}
  const visibleTools = scaffold.visibleTools || ['run', 'reset', 'step', 'replay', 'memory', 'sensor', 'timeline', 'api', 'inspector']
  const showReset = visibleTools.includes('reset')
  const showTimeline = visibleTools.includes('step') || visibleTools.includes('timeline') || visibleTools.includes('replay')
  const showApi = Array.isArray(mission.api) && mission.api.length > 0 && (!scaffold.visibleTools || visibleTools.includes('api'))
  const showMemory = visibleTools.includes('memory')
  const showMissionTabs = missionSet.kind !== 'prototype' || visibleTools.includes('mission-tabs')
  const showHud = missionSet.kind !== 'prototype' || visibleTools.includes('hud')
  const showSensor = missionSet.kind !== 'prototype' || visibleTools.includes('sensor')
  const showInspector = !scaffold.visibleTools || visibleTools.includes('inspector') || visibleTools.includes('trace') || showMemory
  const isViewOnly = scaffold.mode === 'view-only'
  const firstUnfinishedIndex = missions.findIndex((item) => !completedIds.has(item.id))
  const maxUnlockedMissionIndex = firstUnfinishedIndex < 0 ? missions.length - 1 : firstUnfinishedIndex

  const persistCompletion = useCallback(async (evaluation) => {
    if (!user?.uid || !unit?.id || !mission) return
    const wasSetComplete = progress.completed === true
    const isFirstMissionClear = !progress.completedMissionIds?.includes(mission.id)
    const assistanceInfo = {
      maxLevel: hintLevel,
      hintsViewed: (mission.hints || []).slice(0, hintLevel).map((h) => (typeof h === 'object' ? h.type : 'context')),
      rescueUsed: false,
    }
    const nextProgress = mergeMissionCompletion(progress, missionSet, mission.id, evaluation.stars, assistanceInfo)
    nextProgress.independentClearCount = Number(progress.independentClearCount || 0)
    nextProgress.hintedClearCount = Number(progress.hintedClearCount || 0)
    if (isFirstMissionClear) {
      if (hintLevel > 0) nextProgress.hintedClearCount += 1
      else nextProgress.independentClearCount += 1
    }
    setProgress(nextProgress)

    const progressRef = doc(db, 'users', user.uid, 'learning_progress', unit.id)
    await setDoc(progressRef, {
      unitId: unit.id,
      unitTitle: unit.title || '',
      clusterId: unit.clusterId || 'python',
      missionLab: {
        ...nextProgress,
        lastMissionId: mission.id,
        lastCompletedAt: serverTimestamp(),
        lastPlayedAt: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
    }, { merge: true })

    if (!wasSetComplete && nextProgress.completed) {
      const historyRef = doc(db, 'users', user.uid, 'history', `python_mission_${unit.id}_${missionSet.id}`)
      await setDoc(historyRef, {
        type: 'python_mission',
        unitId: unit.id,
        unitTitle: unit.title || '',
        clusterId: unit.clusterId || 'python',
        missionSetId: missionSet.id,
        title: `${unit.title || 'Python'} · MISSION LAB`,
        score: 100,
        crystals: 0,
        timestamp: serverTimestamp(),
      }, { merge: true })
    }
  }, [hintLevel, mission, missionSet, progress, unit, user?.uid])

  const persistAttempt = useCallback(async ({ evaluation, runtimeResult, durationMs }) => {
    if (!user?.uid || !unit?.id || !mission) return
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
        hintLevel,
        durationMs: Math.round(durationMs || 0),
      },
      lastPlayedAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...(evaluation.completed ? { representativeSuccessCode: persistedCode, lastCompletedAt: serverTimestamp() } : {}),
    }
    const missionProgressRef = doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id)
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
        hintLevel,
        durationMs: Math.round(durationMs || 0),
        timestamp: serverTimestamp(),
      }),
    ])
  }, [code, hintLevel, mission, missionSet.id, missionSet.version, unit, user?.uid])

  const runMission = useCallback(async () => {
    if (!mission || !runtimeRef.current || running) return
    clearInterval(autoplayRef.current)
    setPlaying(false)
    setRunning(true)
    setResult(null)
    setEvents([])
    setPlayhead(-1)
    setStdout('')

    const startedAt = performance.now()
    try {
      const primaryResult = await runtimeRef.current.run({ mission, code })
      const friendlyPrimary = primaryResult.error
        ? { ...primaryResult, error: { ...primaryResult.error, friendlyMessage: translatePythonError(primaryResult.error) } }
        : primaryResult

      const variants = (mission.transferVariants?.length ? mission.transferVariants : mission.hiddenVariants) || []
      let hiddenPassed = null
      const initialEvaluation = evaluateMissionRun(mission, friendlyPrimary, hiddenPassed)

      if (initialEvaluation.worldGoalPassed && initialEvaluation.conceptPassed && variants.length > 0) {
        hiddenPassed = true
        for (const variant of variants) {
          const variantMission = getMissionVariant(mission, variant)
          const variantResult = await runtimeRef.current.run({ mission: variantMission, code })
          const variantEvaluation = evaluateMissionRun(variantMission, variantResult, true)
          if (!variantEvaluation.worldGoalPassed) {
            hiddenPassed = false
            break
          }
        }
      }

      const evaluation = evaluateMissionRun(mission, friendlyPrimary, hiddenPassed)
      setEvents(friendlyPrimary.events || [])
      setStdout(friendlyPrimary.stdout || '')
      setResult(evaluation)
      startAutoplay(friendlyPrimary.events || [])
      try {
        await persistAttempt({ evaluation, runtimeResult: friendlyPrimary, durationMs: performance.now() - startedAt })
        if (evaluation.cleared || evaluation.completed) await persistCompletion(evaluation)
      } catch (persistError) {
        console.warn('Mission progress sync failed:', persistError)
      }
    } catch (error) {
      const evaluation = {
        completed: false,
        cleared: false,
        stars: 0,
        message: translatePythonError({ type: error.name, message: error.message }),
      }
      setResult(evaluation)
      persistAttempt({
        evaluation,
        runtimeResult: { error: { type: error.name, message: error.message } },
        durationMs: performance.now() - startedAt,
      }).catch((persistError) => console.warn('Mission attempt sync failed:', persistError))
    } finally {
      setRunning(false)
    }
  }, [code, mission, persistAttempt, persistCompletion, running, startAutoplay])

  const stopMission = () => {
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
        <button type="button" className="python-lab__back" onClick={onBack} aria-label="미션 허브로 돌아가기">←</button>
        <div>
          <span className="python-lab__kicker">LUMI PROTOCOL · MISSION LAB</span>
          <h1>{missionSet.title}</h1>
        </div>
        <div className={`python-lab__runtime python-lab__runtime--${runtimeStatus}`}>
          <span /> {runtimeStatus === 'ready' ? 'PYTHON READY' : runtimeStatus === 'error' ? 'RUNTIME ERROR' : 'PYTHON LOADING'}
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
          <p className="python-lab__objective">{mission.objective}</p>
          <p>{mission.briefing}</p>

          {scaffold.highlightToken && (
            <p className="python-lab__hint">
              💡 수정할 토큰: <span className="python-lab__token-pill">{scaffold.highlightToken}</span>
            </p>
          )}

          {mission.concepts?.length > 0 && (
            <div className="python-lab__concepts">
              {mission.concepts.map((concept) => <span key={concept}>{concept}</span>)}
            </div>
          )}

          {showApi && (
            <>
              <h3>사용 가능한 API</h3>
              {mission.api.map((item) => (
                <div className="python-lab__api" key={item.signature || item}>
                  <code>{item.signature || item}</code>
                  {item.description && <p>{item.description}</p>}
                </div>
              ))}
            </>
          )}

          {mission.hints?.length > 0 && (
            <>
              <button
                type="button"
                className="python-lab__hint-button"
                onClick={() => setHintLevel((level) => Math.min(level + 1, mission.hints.length))}
              >
                힌트 신호 받기 ({hintLevel}/{mission.hints.length})
              </button>
              {mission.hints.slice(0, hintLevel).map((hint, index) => {
                const hintText = typeof hint === 'object' ? hint.text : hint
                return <p className="python-lab__hint" key={`${index}-${hintText}`}>HINT {index + 1}. {hintText}</p>
              })}
            </>
          )}
        </aside>

        <section className="python-lab__world-panel">
          <PythonWorldCanvas mission={mission} events={events} playhead={playhead} showHud={showHud} showSensor={showSensor} />
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
                      : 'SIGNAL INCOMPLETE'}
              </strong>
              <p>{result.message}</p>
              {(result.nextUnlocked || result.cleared || result.completed) && missionIndex < missions.length - 1 && (
                <button type="button" onClick={() => setMissionIndex((index) => index + 1)}>다음 미션 →</button>
              )}
            </div>
          )}
        </section>

        <section className="python-lab__code-panel">
          <div className="python-lab__editor-toolbar">
            <span>main.py</span>
            <div>
              {showReset && (
                <button type="button" onClick={() => updateCode(mission.starterCode)} disabled={running}>RESET</button>
              )}
              {running
                ? <button type="button" className="is-stop" onClick={stopMission}>■ STOP</button>
                : <button type="button" className="is-run" onClick={runMission} disabled={runtimeStatus !== 'ready'}>▶ RUN</button>}
            </div>
          </div>
          <div className="python-lab__editor-wrap">
            <PythonEditor value={code} onChange={updateCode} activeLine={activeTrace?.line} readOnly={running || isViewOnly} />
          </div>
          {showInspector && (
            <>
              <div className="python-lab__inspector-tabs">
                <button type="button" className={inspectorTab === 'trace' ? 'is-active' : ''} onClick={() => setInspectorTab('trace')}>
                  {showMemory ? 'MEMORY CORE' : 'TRACE'}
                </button>
                <button type="button" className={inspectorTab === 'output' ? 'is-active' : ''} onClick={() => setInspectorTab('output')}>OUTPUT</button>
              </div>
              <div className="python-lab__inspector">
                {inspectorTab === 'trace' ? (
                  activeTrace ? (
                    <>
                      <p>LINE {activeTrace.line}</p>
                      {Object.keys(activeTrace.variables || {}).length > 0 ? (
                        <div className="python-lab__memory-list">
                          {Object.entries(activeTrace.variables).map(([name, val]) => (
                            <div className="python-lab__memory-item" key={name}>
                              <span className="python-lab__memory-name">{name}</span>
                              <span className="python-lab__memory-val">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p>변수 상태: [EMPTY]</p>
                      )}
                    </>
                  ) : <p>RUN을 누르면 변수와 실행 줄이 여기에 기록됩니다.</p>
                ) : <pre>{stdout || '출력 없음'}</pre>}
              </div>
            </>
          )}
        </section>
      </main>
    </div>
  )
}
