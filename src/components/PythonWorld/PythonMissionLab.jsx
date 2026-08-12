import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { addDoc, collection, deleteDoc, doc, getDoc, getDocs, limit, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { useAuth } from '../../hooks/useAuth'
import { evaluateMissionRun, translatePythonError } from './missionEvaluator'
import { getMissionVariant } from './pythonMissionCatalog'
import { mergeMissionCompletion, normalizeMissionLabProgress } from '../../utils/pythonMissionProgressUtils'
import PythonRuntimeClient from './runtime/PythonRuntimeClient'
import PythonEditor from './PythonEditor'
import PythonWorldCanvas from './PythonWorldCanvas'
import './PythonMissionLab.css'

const DRAFT_PREFIX = 'metasense:python-mission:'

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

export default function PythonMissionLab({ unit, missionSet, initialProgress, onBack }) {
  const { user } = useAuth()
  const missions = missionSet?.missions || []
  const initial = normalizeMissionLabProgress(initialProgress)
  const firstIncomplete = Math.max(0, missions.findIndex((mission) => !initial.completedMissionIds.includes(mission.id)))
  const [missionIndex, setMissionIndex] = useState(firstIncomplete < 0 ? 0 : firstIncomplete)
  const mission = missions[missionIndex]
  const [progress, setProgress] = useState(initial)
  const [code, setCode] = useState(() => readDraft(unit?.id, missions[firstIncomplete < 0 ? 0 : firstIncomplete] || {}))
  const [runtimeStatus, setRuntimeStatus] = useState('loading')
  const [running, setRunning] = useState(false)
  const [events, setEvents] = useState([])
  const [playhead, setPlayhead] = useState(-1)
  const [stdout, setStdout] = useState('')
  const [result, setResult] = useState(null)
  const [inspectorTab, setInspectorTab] = useState('trace')
  const [hintLevel, setHintLevel] = useState(0)
  const runtimeRef = useRef(null)
  const autoplayRef = useRef(null)

  const activeTrace = useMemo(() => getLineEvent(events, playhead), [events, playhead])
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
    setCode(readDraft(unit?.id, mission))
    setEvents([])
    setPlayhead(-1)
    setStdout('')
    setResult(null)
    setHintLevel(0)
    if (user?.uid && !hasLocalDraft(unit?.id, mission.id)) {
      getDoc(doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id))
        .then((snapshot) => {
          const serverDraft = snapshot.data()?.draftCode
          if (snapshot.exists() && typeof serverDraft === 'string' && serverDraft.trim()) setCode(serverDraft)
        })
        .catch((error) => console.warn('Mission draft load failed:', error))
    }
  }, [mission, unit?.id, user?.uid])

  useEffect(() => {
    if (!mission) return
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(`${DRAFT_PREFIX}${unit?.id}:${mission.id}`, code)
      } catch {
        // Private browsing or storage quotas should not block the mission.
      }
      if (user?.uid && unit?.id) {
        setDoc(doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id), {
          unitId: unit.id,
          unitTitle: unit.title || '',
          missionSetId: missionSet.id,
          missionSetVersion: Number(missionSet.version || 1),
          missionId: mission.id,
          missionTitle: mission.title,
          draftCode: code,
          lastCode: code,
          updatedAt: serverTimestamp(),
        }, { merge: true }).catch((error) => console.warn('Mission draft sync failed:', error))
      }
    }, 900)
    return () => clearTimeout(timer)
  }, [code, mission, missionSet.id, missionSet.version, unit?.id, unit?.title, user?.uid])

  const startAutoplay = useCallback((nextEvents) => {
    clearInterval(autoplayRef.current)
    if (!nextEvents.length) return
    let cursor = -1
    setPlayhead(cursor)
    autoplayRef.current = setInterval(() => {
      cursor += 1
      setPlayhead(cursor)
      if (cursor >= nextEvents.length - 1) clearInterval(autoplayRef.current)
    }, 320)
  }, [])

  const persistCompletion = useCallback(async (evaluation) => {
    if (!user?.uid || !unit?.id || !mission) return
    const wasSetComplete = progress.completed === true
    const isFirstMissionClear = !progress.completedMissionIds?.includes(mission.id)
    const nextProgress = mergeMissionCompletion(progress, missionSet, mission.id, evaluation.stars)
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
    const payload = {
      unitId: unit.id,
      unitTitle: unit.title || '',
      missionSetId: missionSet.id,
      missionSetVersion: Number(missionSet.version || 1),
      missionId: mission.id,
      missionTitle: mission.title,
      lastCode: code,
      draftCode: code,
      lastResult: {
        completed: evaluation.completed === true,
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
      ...(evaluation.completed ? { representativeSuccessCode: code, lastCompletedAt: serverTimestamp() } : {}),
    }
    const missionProgressRef = doc(db, 'users', user.uid, 'pythonMissionProgress', mission.id)
    await setDoc(missionProgressRef, payload, { merge: true })
    const runsRef = collection(missionProgressRef, 'runs')
    await addDoc(runsRef, {
      code,
      completed: evaluation.completed === true,
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
    })
    try {
      const recentRuns = await getDocs(query(runsRef, orderBy('timestamp', 'desc'), limit(30)))
      const expiredRuns = recentRuns.docs.slice(20)
      if (expiredRuns.length > 0) await Promise.all(expiredRuns.map((run) => deleteDoc(run.ref)))
    } catch (error) {
      console.warn('Mission run retention cleanup failed:', error)
    }
  }, [code, hintLevel, mission, missionSet.id, missionSet.version, unit, user?.uid])

  const runMission = useCallback(async () => {
    if (!mission || !runtimeRef.current || running) return
    clearInterval(autoplayRef.current)
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

      let hiddenPassed = null
      const initialEvaluation = evaluateMissionRun(mission, friendlyPrimary, hiddenPassed)
      if (initialEvaluation.completed && mission.hiddenVariants?.length) {
        hiddenPassed = true
        for (const variant of mission.hiddenVariants) {
          const variantResult = await runtimeRef.current.run({ mission: getMissionVariant(mission, variant), code })
          const variantEvaluation = evaluateMissionRun(getMissionVariant(mission, variant), variantResult, true)
          if (!variantEvaluation.completed) {
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
        if (evaluation.completed) await persistCompletion(evaluation)
      } catch (persistError) {
        console.warn('Mission progress sync failed:', persistError)
      }
    } catch (error) {
      const evaluation = {
        completed: false,
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
    runtimeRef.current?.stop()
    setRunning(false)
    setRuntimeStatus('loading')
    runtimeRef.current?.load().catch(() => setRuntimeStatus('error'))
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
        <button type="button" className="python-lab__back" onClick={onBack} aria-label="미션 허브로 돌아가기">←</button>
        <div>
          <span className="python-lab__kicker">LUMI PROTOCOL · MISSION LAB</span>
          <h1>{missionSet.title}</h1>
        </div>
        <div className={`python-lab__runtime python-lab__runtime--${runtimeStatus}`}>
          <span /> {runtimeStatus === 'ready' ? 'PYTHON READY' : runtimeStatus === 'error' ? 'RUNTIME ERROR' : 'PYTHON LOADING'}
        </div>
      </header>

      <nav className="python-lab__mission-tabs" aria-label="미션 선택">
        {missions.map((item, index) => (
          <button
            type="button"
            key={item.id}
            className={index === missionIndex ? 'is-active' : ''}
            onClick={() => setMissionIndex(index)}
          >
            <span>{completedIds.has(item.id) ? '✓' : index + 1}</span>
            {item.title}
          </button>
        ))}
      </nav>

      <main className="python-lab__layout">
        <aside className="python-lab__briefing">
          <span className="python-lab__eyebrow">{mission.eyebrow}</span>
          <h2>{mission.title}</h2>
          <p className="python-lab__objective">{mission.objective}</p>
          <p>{mission.briefing}</p>

          <div className="python-lab__concepts">
            {mission.concepts.map((concept) => <span key={concept}>{concept}</span>)}
          </div>

          <h3>사용 가능한 API</h3>
          {mission.api.map((item) => (
            <div className="python-lab__api" key={item.signature}>
              <code>{item.signature}</code>
              <p>{item.description}</p>
            </div>
          ))}

          <button
            type="button"
            className="python-lab__hint-button"
            onClick={() => setHintLevel((level) => Math.min(level + 1, mission.hints.length))}
          >
            힌트 신호 받기 ({hintLevel}/{mission.hints.length})
          </button>
          {mission.hints.slice(0, hintLevel).map((hint, index) => (
            <p className="python-lab__hint" key={hint}>HINT {index + 1}. {hint}</p>
          ))}
        </aside>

        <section className="python-lab__world-panel">
          <PythonWorldCanvas mission={mission} events={events} playhead={playhead} />
          <div className="python-lab__timeline">
            <button type="button" onClick={() => setPlayhead((value) => Math.max(-1, value - 1))} disabled={!events.length}>‹</button>
            <input
              aria-label="코드 실행 단계"
              type="range"
              min="-1"
              max={Math.max(-1, events.length - 1)}
              value={Math.min(playhead, Math.max(-1, events.length - 1))}
              onChange={(event) => {
                clearInterval(autoplayRef.current)
                setPlayhead(Number(event.target.value))
              }}
              disabled={!events.length}
            />
            <button type="button" onClick={() => setPlayhead((value) => Math.min(events.length - 1, value + 1))} disabled={!events.length}>›</button>
            <span>STEP {events.length ? playhead + 1 : 0}/{events.length}</span>
          </div>

          {result && (
            <div className={`python-lab__result ${result.completed ? 'is-success' : 'is-failure'}`} role="status">
              <strong>{result.completed ? `MISSION CLEAR · ${'★'.repeat(result.stars)}${'☆'.repeat(3 - result.stars)}` : 'SIGNAL INCOMPLETE'}</strong>
              <p>{result.message}</p>
              {result.completed && missionIndex < missions.length - 1 && (
                <button type="button" onClick={() => setMissionIndex((index) => index + 1)}>다음 미션 →</button>
              )}
            </div>
          )}
        </section>

        <section className="python-lab__code-panel">
          <div className="python-lab__editor-toolbar">
            <span>main.py</span>
            <div>
              <button type="button" onClick={() => setCode(mission.starterCode)} disabled={running}>RESET</button>
              {running
                ? <button type="button" className="is-stop" onClick={stopMission}>■ STOP</button>
                : <button type="button" className="is-run" onClick={runMission} disabled={runtimeStatus !== 'ready'}>▶ RUN</button>}
            </div>
          </div>
          <div className="python-lab__editor-wrap">
            <PythonEditor value={code} onChange={setCode} activeLine={activeTrace?.line} readOnly={running} />
          </div>
          <div className="python-lab__inspector-tabs">
            <button type="button" className={inspectorTab === 'trace' ? 'is-active' : ''} onClick={() => setInspectorTab('trace')}>TRACE</button>
            <button type="button" className={inspectorTab === 'output' ? 'is-active' : ''} onClick={() => setInspectorTab('output')}>OUTPUT</button>
          </div>
          <div className="python-lab__inspector">
            {inspectorTab === 'trace' ? (
              activeTrace ? (
                <>
                  <p>LINE {activeTrace.line}</p>
                  <pre>{JSON.stringify(activeTrace.variables || {}, null, 2)}</pre>
                </>
              ) : <p>RUN을 누르면 변수와 실행 줄이 여기에 기록됩니다.</p>
            ) : <pre>{stdout || '출력 없음'}</pre>}
          </div>
        </section>
      </main>
    </div>
  )
}
