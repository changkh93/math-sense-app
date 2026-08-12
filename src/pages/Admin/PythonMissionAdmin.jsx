import { useCallback, useEffect, useMemo, useState } from 'react'
import { collection, doc, getDocs, orderBy, query, serverTimestamp, setDoc } from 'firebase/firestore'
import { db } from '../../firebase'
import { getBuiltinPythonMissionSets } from '../../components/PythonWorld/pythonMissionCatalog'
import { createPublishableMissionSet, validatePythonMissionSet } from '../../components/PythonWorld/pythonMissionSchema'
import './PythonMissionAdmin.css'

function stringifySet(value) {
  return JSON.stringify(value, null, 2)
}

export default function PythonMissionAdmin() {
  const builtins = useMemo(() => getBuiltinPythonMissionSets(), [])
  const [tab, setTab] = useState('editor')
  const [savedSets, setSavedSets] = useState([])
  const [jsonText, setJsonText] = useState(() => stringifySet({ ...builtins[0], status: 'draft' }))
  const [unitId, setUnitId] = useState('')
  const [status, setStatus] = useState('')
  const [busy, setBusy] = useState(false)
  const [studentUid, setStudentUid] = useState('')
  const [studentProgress, setStudentProgress] = useState([])

  const refreshSets = useCallback(async () => {
    try {
      const snapshot = await getDocs(query(collection(db, 'pythonMissionSets'), orderBy('updatedAt', 'desc')))
      setSavedSets(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
    } catch (error) {
      console.warn('Mission set list failed:', error)
      setSavedSets([])
    }
  }, [])

  useEffect(() => {
    refreshSets()
  }, [refreshSets])

  const applyTemplate = (missionSet) => {
    const clone = JSON.parse(JSON.stringify(missionSet))
    clone.id = `${clone.id.replace(/-v\d+$/, '')}-custom-v1`
    clone.version = 1
    clone.status = 'draft'
    setJsonText(stringifySet(clone))
    setStatus('내장 세트를 새 초안으로 복제했습니다.')
  }

  const save = async (publish) => {
    setBusy(true)
    setStatus('')
    try {
      const parsed = JSON.parse(jsonText)
      const normalized = createPublishableMissionSet(parsed, publish ? 'published' : 'draft')
      const errors = validatePythonMissionSet(normalized)
      if (errors.length) throw new Error(errors.join('\n'))

      await setDoc(doc(db, 'pythonMissionSets', normalized.id), {
        ...normalized,
        updatedAt: serverTimestamp(),
        ...(publish ? { publishedAt: serverTimestamp() } : {}),
      }, { merge: true })

      if (unitId.trim()) {
        await setDoc(doc(db, 'units', unitId.trim()), {
          pythonMissionSetId: normalized.id,
          contentFlags: { hasMissionLab: true },
          lastUpdated: serverTimestamp(),
        }, { merge: true })
      }

      setJsonText(stringifySet(normalized))
      setStatus(publish ? '발행 및 유닛 연결이 완료되었습니다.' : '초안을 저장했습니다.')
      await refreshSets()
    } catch (error) {
      setStatus(`오류: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  const loadStudentProgress = async () => {
    if (!studentUid.trim()) return
    setBusy(true)
    setStatus('')
    try {
      const snapshot = await getDocs(collection(db, 'users', studentUid.trim(), 'pythonMissionProgress'))
      setStudentProgress(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })))
      if (snapshot.empty) setStatus('이 학생의 Mission Lab 실행 기록이 없습니다.')
    } catch (error) {
      setStatus(`진도 조회 오류: ${error.message}`)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="python-mission-admin">
      <header>
        <div>
          <span>LUMI PROTOCOL · OPERATIONS</span>
          <h1>Python Mission Control</h1>
        </div>
        <nav>
          <button type="button" className={tab === 'editor' ? 'active' : ''} onClick={() => setTab('editor')}>MISSION EDITOR</button>
          <button type="button" className={tab === 'progress' ? 'active' : ''} onClick={() => setTab('progress')}>STUDENT TRACE</button>
        </nav>
      </header>

      {status && <pre className={`python-mission-admin__status ${status.startsWith('오류') || status.includes('조회 오류') ? 'error' : ''}`}>{status}</pre>}

      {tab === 'editor' ? (
        <div className="python-mission-admin__editor-grid">
          <aside>
            <h2>내장 템플릿</h2>
            {builtins.map((set) => (
              <button type="button" key={set.id} onClick={() => applyTemplate(set)}>
                <strong>{set.title}</strong><small>{set.missions.length} missions · v{set.version}</small>
              </button>
            ))}
            <h2>Firestore 세트</h2>
            {savedSets.map((set) => (
              <button type="button" key={set.id} onClick={() => setJsonText(stringifySet(set))}>
                <strong>{set.title || set.id}</strong><small>{set.status || 'draft'} · v{set.version || 1}</small>
              </button>
            ))}
          </aside>
          <section>
            <label>
              연결할 Unit ID <small>비워 두면 세트만 저장</small>
              <input value={unitId} onChange={(event) => setUnitId(event.target.value)} placeholder="unit_py_math_15" />
            </label>
            <label>
              Mission Set JSON
              <textarea value={jsonText} onChange={(event) => setJsonText(event.target.value)} spellCheck="false" />
            </label>
            <div className="python-mission-admin__actions">
              <button type="button" disabled={busy} onClick={() => save(false)}>초안 저장</button>
              <button type="button" className="publish" disabled={busy} onClick={() => save(true)}>검증 후 발행</button>
            </div>
          </section>
        </div>
      ) : (
        <section className="python-mission-admin__progress">
          <div className="python-mission-admin__search">
            <input value={studentUid} onChange={(event) => setStudentUid(event.target.value)} placeholder="학생 Firebase UID" />
            <button type="button" disabled={busy || !studentUid.trim()} onClick={loadStudentProgress}>진도 조회</button>
          </div>
          <div className="python-mission-admin__cards">
            {studentProgress.map((item) => (
              <article key={item.id}>
                <div><span>{item.missionSetId || 'MISSION'}</span><strong>{item.missionTitle || item.id}</strong></div>
                <dl>
                  <div><dt>상태</dt><dd>{item.lastResult?.completed ? '완료' : '진행 중'}</dd></div>
                  <div><dt>별</dt><dd>{item.lastResult?.stars || 0}/3</dd></div>
                  <div><dt>힌트</dt><dd>{item.lastResult?.hintLevel || 0}단계</dd></div>
                  <div><dt>오류</dt><dd>{item.lastResult?.errorType || '없음'}</dd></div>
                </dl>
                <details>
                  <summary>마지막 코드 보기</summary>
                  <pre>{item.lastCode || '저장된 코드 없음'}</pre>
                </details>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
