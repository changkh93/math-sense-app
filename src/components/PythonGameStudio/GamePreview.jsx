import { useEffect, useRef, useState } from 'react'
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

const runnerDocument = buildRunnerDocument(runnerHtml, turtlePython, turtleRenderer, tkPython, tkRenderer, pandasPython, plotPython, plotRenderer, plotFont)

// One isolated interpreter per editor session. Runs replace files/state over the port.
export default function GamePreview({ run, onEvent }) {
  const frameRef = useRef(null)
  const callbackRef = useRef(onEvent)
  const runRef = useRef(run)
  const sendRef = useRef(null)
  const [engineEpoch, setEngineEpoch] = useState(0)
  useEffect(() => { callbackRef.current = onEvent }, [onEvent])
  useEffect(() => {
    const frame = frameRef.current
    const channel = new MessageChannel()
    const sessionId = crypto.randomUUID()
    let connected = false, engineReady = false, bootFailed = false, disposed = false, count = 0, windowAt = Date.now(), watchdog
    let waitingId = null, waitingForStop = false
    let csvBaseline = new Map()
    const recover = () => {
      if (!disposed) setEngineEpoch(value => value + 1)
    }
    const bootTimeout = setTimeout(() => {
      bootFailed = true
      if (runRef.current) callbackRef.current({ type: 'ERROR', text: 'Python 실행 환경에 연결하지 못했습니다. 인터넷 연결을 확인하고 다시 실행해 주세요.' })
    }, 90000)
    const send = next => {
      if (next && bootFailed) { recover(); return }
      if (!connected) return
      clearTimeout(watchdog)
      waitingId = next?.id || crypto.randomUUID()
      waitingForStop = !next
      csvBaseline = new Map((next?.project.files || []).filter(file => file.kind === 'csv').map(file => [file.path, file.data]))
      channel.port1.postMessage({ type: next ? 'RUN' : 'STOP', protocolVersion: 2, sessionId, runId: waitingId, project: next?.payload })
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
      if (data.type === 'FILE_WRITE') {
        try {
          if (typeof data.text !== 'string' || data.text.length > 280000) throw new Error('CSV 저장 데이터가 너무 큽니다.')
          const file = JSON.parse(data.text)
          const accepted = callbackRef.current({ type: 'FILE_WRITE', file, projectId: runRef.current.project.id, expectedData: csvBaseline.get(file.path) })
          if (accepted) csvBaseline.set(file.path, file.data)
        } catch {
          callbackRef.current({ type: 'STDERR', text: 'CSV 저장 결과를 읽지 못했습니다. 파일 크기와 내용을 확인해 주세요.\n' })
        }
        return
      }
      if (!['READY','RUNNING','STDOUT','STDERR','ERROR','EXIT'].includes(data.type)) return
      callbackRef.current({ type: data.type, text: String(data.text || '').slice(0,8192) })
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
  }, [engineEpoch])
  useEffect(() => { runRef.current = run; sendRef.current?.(run) }, [run])
  return <div className="pgs-runtime">
    <iframe key={engineEpoch} ref={frameRef} title="Python 코드 실행 화면" srcDoc={runnerDocument} sandbox="allow-scripts" allow="autoplay" referrerPolicy="no-referrer" tabIndex={run ? 0 : -1} aria-hidden={!run} style={{ pointerEvents: run ? 'auto' : 'none' }} />
    {!run && <div className="pgs-empty"><span className="pgs-orbit">✦</span><strong>코드로 만들고, 실행하며 배워요</strong><p>실행을 누르면 코드가 바로 실행됩니다.</p><small>마우스·방향키를 사용할 때는 실행 화면을 클릭하세요.</small></div>}
  </div>
}
