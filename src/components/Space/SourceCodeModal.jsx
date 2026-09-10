import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Copy, Download, X } from 'lucide-react'
import './SourceCodeModal.css'

export default function SourceCodeModal({ path, onClose }) {
  const dialogRef = useRef(null)
  const [result, setResult] = useState({ status: 'loading', code: '', downloadUrl: '' })
  const [notice, setNotice] = useState('')
  const [attempt, setAttempt] = useState(0)
  const filename = path.split('/').pop()

  useEffect(() => {
    const dialog = dialogRef.current
    const trigger = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.showModal()
    return () => {
      dialog.close()
      document.body.style.overflow = previousOverflow
      if (trigger?.isConnected) trigger.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    let downloadUrl = ''
    async function load() {
      try {
        const response = await fetch(path, { signal: controller.signal })
        if (!response.ok || response.headers.get('content-type')?.includes('text/html')) {
          throw new Error('코드를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.')
        }
        const code = new TextDecoder('utf-8', { fatal: true }).decode(await response.arrayBuffer())
        if (controller.signal.aborted) return
        downloadUrl = URL.createObjectURL(new Blob([code], { type: 'text/plain;charset=utf-8' }))
        setResult({ status: 'ready', code, downloadUrl })
      } catch (error) {
        if (!controller.signal.aborted) {
          setResult({ status: 'error', code: '', downloadUrl: '', error: error.message })
        }
      }
    }
    load()
    return () => {
      controller.abort()
      if (downloadUrl) URL.revokeObjectURL(downloadUrl)
    }
  }, [path, attempt])

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(result.code)
      setNotice('코드를 복사했습니다.')
    } catch {
      setNotice('자동 복사가 허용되지 않았습니다. 코드 영역에서 직접 선택해 복사해 주세요.')
    }
  }

  return createPortal(
    <dialog
      ref={dialogRef}
      className="source-code-modal"
      aria-label={`${filename} 코드 보기`}
      onCancel={event => { event.preventDefault(); onClose() }}
      onClick={event => {
        if (event.target !== event.currentTarget) return
        const rect = event.currentTarget.getBoundingClientRect()
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) onClose()
      }}
    >
      <header className="source-code-modal__header">
        <div>
          <p>단계별 코드 보기</p>
          <h2>{filename}</h2>
        </div>
        <button type="button" onClick={onClose} autoFocus aria-label="코드 보기 닫기"><X size={22} /></button>
      </header>
      <div className="source-code-modal__toolbar">
        <span>직접 작성한 코드와 비교해 보세요.</span>
        <div>
          <button type="button" disabled={result.status !== 'ready'} onClick={copyCode}><Copy size={16} /> 코드 복사</button>
          {result.status === 'ready' && <a href={result.downloadUrl} download={filename}><Download size={16} /> .py 다운로드</a>}
        </div>
      </div>
      {result.status === 'loading' && <div className="source-code-modal__message" role="status">코드를 불러오고 있습니다…</div>}
      {result.status === 'error' && <div className="source-code-modal__message" role="alert">
        <p>{result.error}</p>
        <button type="button" onClick={() => { setResult({ status: 'loading', code: '', downloadUrl: '' }); setAttempt(value => value + 1) }}>다시 불러오기</button>
      </div>}
      {result.status === 'ready' && <pre className="source-code-modal__code" tabIndex={0} aria-label={`${filename} 전체 코드`}><code>{result.code}</code></pre>}
      <footer className="source-code-modal__footer" role="status">{notice || '가로·세로로 스크롤할 수 있습니다. Esc 또는 닫기를 누르면 읽던 문서로 돌아갑니다.'}</footer>
    </dialog>,
    document.fullscreenElement || document.body,
  )
}
