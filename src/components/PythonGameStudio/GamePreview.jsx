import { learningSession } from './coachLearningClient'
import { scopeForRun } from './coachLearningTracker.mjs'
import { useEffect, useRef, useState } from 'react'
import { parseError } from '../../../functions/studioErrorCoachPolicy.mjs'
import runnerHtml from '../../../runtime/python-game-runner/index.html?raw'
import turtlePython from '../../../runtime/python-game-runner/turtle.py?raw'
import turtleRenderer from '../../../runtime/python-game-runner/turtle-renderer.js?raw'
import { buildRunnerDocument } from '../../../runtime/python-game-runner/document.mjs'

import tkPython from '../../../runtime/python-game-runner/tkinter.py?raw'
import tkRenderer from '../../../runtime/python-game-runner/tkinter-renderer.js?raw'
import pandasPython from '../../../runtime/python-game-runner/studio_pandas.py?raw'

import plotPython from '../../../runtime/python-game-runner/studio_plot.py?raw'
import plotRenderer from '../../../runtime/python-game-runner/plot-renderer.js?raw'
import plotFont from '../../../public/mars-expedition/assets/fonts/DoHyeon-Regular.ttf?inline'
import studioFontsPython from '../../../runtime/python-game-runner/studio_fonts.py?raw'
import requestsPython from '../../../runtime/python-game-runner/studio_requests.py?raw'
import { trackPython } from '../../utils/pythonFunnel'
import { LockKeyhole } from 'lucide-react'

const runnerDocument = buildRunnerDocument(runnerHtml, turtlePython, turtleRenderer, tkPython, tkRenderer, pandasPython, plotPython, plotRenderer, plotFont, studioFontsPython, requestsPython)

// One isolated interpreter per editor session. Runs replace files/state over the port.
function PublicLearningPrompt() {
  const projects = [
    ['몬스터 잡기', '충돌 · 점수'],
    ['우주 방어대', '좌표 · 클래스'],
    ['화성 탐사대', '파일 · 사운드'],
  ]
  return <div className="pgs-empty pgs-learning-prompt">
    <span className="pgs-orbit" aria-hidden="true">✦</span>
    <div className="pgs-learning-copy">
      <span className="pgs-learning-kicker">METASENSE PYTHON</span>
      <strong>혼자 실행해 보고, 단계별로 직접 만들어 보세요.</strong>
      <p>처음이라면 작은 코드부터 게임 완성까지 순서대로 시작할 수 있어요.</p>
    </div>
    <div className="pgs-learning-projects" aria-label="수업에서 만드는 프로젝트 미리보기">
      {projects.map(([title, concepts]) => <a key={title} href="/python#courses" onClick={() => trackPython('python_cta', 'studio_project')}>
        <LockKeyhole size={14} aria-hidden="true" /><strong>{title}</strong><small>{concepts}</small><b>수업에서 만들기 →</b>
      </a>)}
    </div>
    <div className="pgs-learning-actions">
      <a className="primary" href="/python#courses" onClick={() => trackPython('python_cta', 'studio_preview')}>파이썬 배우기 →</a>
      <a href="/python#apply" onClick={() => trackPython('python_cta', 'studio_trial')}>7일 무료로 시작하기</a>
    </div>
    <small>프로젝트는 수업 미리보기이며 완성 코드와 에셋은 공개하지 않습니다.</small>
  </div>
}

export default function GamePreview({ uid, run, onEvent, publicAccess = false }) {
  const frameRef = useRef(null)
  const callbackRef = useRef(onEvent)
  const runRef = useRef(run)
  const sendRef = useRef(null)
  const [engineEpoch, setEngineEpoch] = useState(0)
  useEffect(() => { callbackRef.current = onEvent }, [onEvent])
  useEffect(() => {
    const dispatch = event => {
      const snapshot = runRef.current
      const path = event.type === 'ERROR' ? parseError(event.text).path : ''
      const source = snapshot?.notebook && path === snapshot.project.entrypoint ? snapshot.notebook.source : snapshot?.project.files.find(file => file.path === path)?.text
      const parsed = event.type === 'ERROR' ? parseError(event.text) : null
      if (event.type === 'KERNEL_LOST') learningSession(uid).tracker.abandon()
      if (snapshot) learningSession(uid).tracker.event(snapshot.id, event.type, parsed ? `${parsed.type}:${parsed.message}` : '')
      return callbackRef.current({ ...event, notebook: snapshot?.notebook, coach: event.type === 'ERROR' && source !== undefined ? { source, path, projectId: snapshot.project.id, runId: snapshot.id, scope: scopeForRun(snapshot) } : null })
    }
    const frame = frameRef.current
    const channel = new MessageChannel()
    const sessionId = crypto.randomUUID()
    let connected = false, engineReady = false, bootFailed = false, disposed = false, count = 0, windowAt = Date.now(), watchdog
    let waitingId = null, waitingForStop = false
    let csvBaseline = new Map()
    const recover = () => {
      if (!disposed) dispatch({ type: 'INPUT_CANCEL' })
      if (!disposed && runRef.current?.notebook) { dispatch({ type: 'KERNEL_LOST' }); runRef.current = null }
      if (!disposed) setEngineEpoch(value => value + 1)
    }
    const bootTimeout = setTimeout(() => {
      bootFailed = true
      if (runRef.current) dispatch({ type: 'ERROR', text: 'Python 실행 환경에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 실행해 주세요.' })
    }, 90000)
    const send = next => {
      if (next && bootFailed) { recover(); return }
      if (!connected) return
      clearTimeout(watchdog)
      waitingId = next?.id || crypto.randomUUID()
      waitingForStop = !next
      csvBaseline = new Map((next?.project.files || []).filter(file => file.kind === 'csv').map(file => [file.path, file.data]))
      if (next) learningSession(uid).tracker.begin({ id: next.id, scope: scopeForRun(next), sourceFor: path => next.project.files.find(f => f.path === path)?.text, source: next.notebook?.source ?? next.project.files.find(f => f.path === next.project.entrypoint)?.text ?? '' })
      channel.port1.postMessage({ type: next ? 'RUN' : 'STOP', protocolVersion: 2, sessionId, runId: waitingId, project: next?.payload, notebook: next?.notebook })
      // A normal stop must acknowledge cleanup. Reset only an unresponsive engine.
      if (!next && engineReady && !document.hidden) watchdog = setTimeout(recover, 3500)
    }
    sendRef.current = send
    const connect = () => {
      if (connected) return
      connected = true
      frame.contentWindow.postMessage({ type: 'CONNECT', protocolVersion: 2, sessionId }, '*', [channel.port2])
    }
    channel.port1.onmessage = ({ data }) => {
      if (data?.protocolVersion !== 2 || data.sessionId !== sessionId) return
      if (Date.now() - windowAt > 1000) { count = 0; windowAt = Date.now() }
      if (++count > 150) return
      if (data.type === 'CONNECTED') { send(runRef.current); return }
      if (data.type === 'ENGINE_READY') { engineReady = true; bootFailed = false; clearTimeout(bootTimeout); return }
      if (data.type === 'RESET_REQUIRED') { recover(); return }
      if (data.runId === waitingId && ['READY','RUNNING','STOPPED','ERROR'].includes(data.type)) clearTimeout(watchdog)
      if (data.type === 'STOPPED' && data.runId === waitingId) waitingForStop = false
      if (data.type === 'STOPPED' || data.runId !== runRef.current?.id) return
      if (data.type === 'INPUT_REQUEST') {
        try {
          const request = JSON.parse(data.text)
          if (typeof request.requestId !== 'string' || typeof request.prompt !== 'string') return
          let submitted = false
          dispatch({ type: 'INPUT_REQUEST', requestId: request.requestId, prompt: request.prompt,
            submit: value => {
              if (submitted || disposed || data.runId !== runRef.current?.id || typeof value !== 'string' || value.length > 8192) return
              submitted = true
              channel.port1.postMessage({ type: 'INPUT_RESPONSE', protocolVersion: 2, sessionId, runId: data.runId, requestId: request.requestId, value })
            } })
        } catch { /* Ignore malformed messages from the isolated runtime. */ }
        return
      }
      if (data.type === 'DISPLAY' || data.type === 'CELL_RESULT') {
        try {
          if (!runRef.current?.notebook || typeof data.text !== 'string' || data.text.length > (data.type === 'DISPLAY' ? 100000 : 4000000)) return
          const value = JSON.parse(data.text)
          if (data.type === 'CELL_RESULT') {
            if (!Array.isArray(value.images) || value.images.length > 22 || !value.images.every(image => ['image/png', 'image/svg+xml'].includes(image.mime) && typeof image.data === 'string' && /^[A-Za-z0-9+/]*={0,2}$/.test(image.data))) return
          } else if (!(value.kind === 'text' && typeof value.text === 'string') && !(value.kind === 'table' && Array.isArray(value.columns) && value.columns.length <= 20 && value.columns.every(v => typeof v === 'string') && Array.isArray(value.rows) && value.rows.length <= 50 && value.rows.every(row => Array.isArray(row) && row.length <= 21 && row.every(v => typeof v === 'string')) && typeof value.summary === 'string')) return
          dispatch({ type: data.type, value })
        } catch { /* Never render unvalidated runtime payloads or HTML. */ }
        return
      }
      if (data.type === 'FILE_WRITE') {
        try {
          if (typeof data.text !== 'string' || data.text.length > 280000) throw new Error('CSV 저장 데이터가 너무 큽니다.')
          const file = JSON.parse(data.text)
          const accepted = dispatch({ type: 'FILE_WRITE', file, projectId: runRef.current.project.id, expectedData: csvBaseline.get(file.path) })
          if (accepted) csvBaseline.set(file.path, file.data)
        } catch {
          dispatch({ type: 'STDERR', text: 'CSV 저장 결과를 읽지 못했습니다. 파일 크기와 내용을 확인해 주세요.\n' })
        }
        return
      }
      if (!['READY','RUNNING','STDOUT','STDERR','ERROR','EXIT','INPUT_CANCEL','KERNEL_RESET','CELL_START','SURFACE'].includes(data.type)) return
      dispatch({ type: data.type, text: String(data.text || '').slice(0,8192) })
    }
    const hello = event => { if (event.source === frame.contentWindow && event.data?.type === 'RUNNER_HELLO' && event.data.protocolVersion === 2) connect() }
    const visibility = () => {
      clearTimeout(watchdog)
      // Hidden tabs pause animation-driven Python. Allow cleanup time on return.
      if (!document.hidden && waitingForStop && engineReady) watchdog = setTimeout(recover, 3500)
    }
    document.addEventListener('visibilitychange', visibility)
    window.addEventListener('message', hello)
    frame.addEventListener('load', connect)
    return () => {
      disposed = true; clearTimeout(bootTimeout); clearTimeout(watchdog)
      sendRef.current = null
      document.removeEventListener('visibilitychange', visibility)
      window.removeEventListener('message', hello); frame.removeEventListener('load', connect)
      channel.port1.close(); channel.port2.close()
    }
  }, [engineEpoch, uid])
  useEffect(() => { runRef.current = run; sendRef.current?.(run) }, [run])
  return <div className="pgs-runtime">
    <iframe key={engineEpoch} ref={frameRef} title="Python 코드 실행 화면" srcDoc={runnerDocument} sandbox="allow-scripts" allow="autoplay" referrerPolicy="no-referrer" tabIndex={run ? 0 : -1} aria-hidden={!run} style={{ pointerEvents: run ? 'auto' : 'none' }} />
    {!run && (publicAccess ? <PublicLearningPrompt /> : <div className="pgs-empty"><span className="pgs-orbit">✦</span><strong>코드로 만들고, 실행하며 배워요</strong><p>실행을 누르면 코드가 바로 실행됩니다.</p><small>마우스·방향키를 사용할 때는 실행 화면을 클릭하세요.</small></div>)}
  </div>
}
