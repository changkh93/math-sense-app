import { useCallback, useEffect, useRef, useState } from 'react'
import { readNotebook as notebookCells } from './notebookFile.mjs'
import { prepareRunnerProject } from './audioConversion'
import { validateProject } from './projectPolicy.mjs'

// Output is session-only and bounded even for repeated large graphs/logs.
function limitResults(results) {
  const kept = Object.fromEntries(Object.entries(results).slice(-5).map(([key, cells]) => [key, { ...cells }]))
  let bytes = 0
  for (const cells of Object.values(kept).reverse()) for (const [key, original] of Object.entries(cells).reverse()) {
    const cell = { ...original, logs: (original.logs || []).slice(-100) }
    let textBytes = 0
    cell.logs = cell.logs.filter(log => { textBytes += log.text.length; return textBytes <= 100000 })
    const images = (cell.images || []).filter(image => { bytes += image.data.length; return bytes <= 24 * 1024 * 1024 })
    if (images.length < (cell.images || []).length) { cell.truncated = true; cell.images = images }
    cells[key] = cell
  }
  return kept
}
export default function useNotebook({ projectRef, setRun, setStatus, setLogs, setInputRequest, setNotice }) {
  const [results, setResults] = useState({})
  const [running, setRunning] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const pending = useRef(null), generation = useRef(0), locked = useRef(false)
  const cancel = useCallback(() => {
    generation.current++; locked.current = false; pending.current?.resolve(false); pending.current = null; setRunning(false)
    setResults(previous => Object.fromEntries(Object.entries(previous).map(([key, cells]) => [key, Object.fromEntries(Object.entries(cells).map(([i, cell]) => [i, { ...cell, running: false }]))])))
  }, [])
  useEffect(() => () => { generation.current++; pending.current?.resolve(false); pending.current = null }, [])
  const reset = () => { cancel(); setRun(null); setInputRequest(null); setStatus('stopped'); setResults({}); setNotice('노트북 세션을 초기화했습니다. 첫 셀부터 다시 실행해 주세요.') }
  const event = useCallback(event => {
    const n = event.notebook
    if (!n) return
    if (event.type === 'KERNEL_LOST') { cancel(); setRun(null); setResults({}); setNotice('실행 환경이 다시 연결되었습니다. 첫 셀부터 다시 실행해 주세요.'); return }
    setResults(previous => {
      let cells = previous[n.kernel] || {}
      if (event.type === 'KERNEL_RESET') cells = Object.fromEntries(Object.entries(cells).map(([key, cell]) => [key, { ...cell, count: null }]))
      const old = cells[n.index] || { source: n.source, logs: [], displays: [] }
      const next = { ...old }
      if (event.type === 'SURFACE') next.surface = event.text
      if (event.type === 'CELL_START') next.count = Number(event.text)
      if (['STDOUT', 'STDERR', 'ERROR'].includes(event.type)) next.logs = [...old.logs, { type: event.type, text: event.text, coach: event.coach }].slice(-100)
      if (event.type === 'DISPLAY') next.displays = [...old.displays, event.value].slice(-20)
      if (event.type === 'CELL_RESULT') { next.images = event.value.images; next.truncated = event.value.truncated }
      if (event.type === 'ERROR') next.failed = true
      if (event.type === 'EXIT') { next.finished = true; next.running = false }
      return limitResults({ ...Object.fromEntries(Object.entries(previous).filter(([key]) => key !== n.kernel)), [n.kernel]: { ...cells, [n.index]: next } })
    })
    if (pending.current?.id === n.request) {
      if (event.type === 'ERROR') { pending.current.failed = true; pending.current.resolve(false) }
      if (event.type === 'EXIT') { pending.current.resolve(!pending.current.failed); pending.current = null }
    }
  }, [cancel, setNotice, setRun])
  const execute = async (project, path, index, all = false) => {
    if (locked.current) return
    locked.current = true; setRunning(true)
    const token = ++generation.current
    const file = project.files.find(file => file.path === path), cells = notebookCells(file.text)
    const indices = all ? cells.map((_, i) => i).filter(i => cells[i].type === 'code') : [index]
    try {
      const kernel = `${project.id}:${path}`
      for (const i of indices) {
        if (token !== generation.current || cells[i]?.type !== 'code') break
        if (projectRef.current?.id !== project.id) break
        const checked = validateProject({ ...projectRef.current, entrypoint: path }), payload = await prepareRunnerProject(checked)
        if (token !== generation.current) break
        const cell = cells[i], request = crypto.randomUUID()
        setActiveIndex(i); setStatus('loading'); setLogs([]); setInputRequest(null)
        setResults(previous => ({ ...previous, [kernel]: { ...previous[kernel], [i]: { request, source: cell.source, logs: [], displays: [], running: true } } }))
        const done = new Promise(resolve => { pending.current = { id: request, resolve, failed: false } })
        setRun({ id: request, project: checked, payload, notebook: { kernel, index: i, source: cell.source, line: cell.line, request } })
        if (!await done) break
      }
    } catch (error) { setNotice(error.message); setStatus('error') }
    finally { if (token === generation.current) { locked.current = false; setRunning(false) } }
  }
  const clearOutputs = kernel => setResults(previous => Object.fromEntries(Object.entries(previous).filter(([key]) => key !== kernel)))
  return { clearOutputs, results, running, activeIndex, setActiveIndex, execute, event, reset, cancel }
}
